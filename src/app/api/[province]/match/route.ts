import { NextRequest, NextResponse } from 'next/server';
import { loadAllScoreRankData } from '@/lib/data/score-rank';
import { loadBatchAdmissionLines } from '@/lib/data/admission-lines';
import { loadAdmissionPlanIndex, scanAvailablePlans } from '@/lib/data/admission-plans';
import { matchSchools } from '@/lib/utils/match';
import { SubjectGroup } from '@/types/score-rank';

// 本科批的 admission-lines 数据还在录入中，暂时可能为空
// 但代码已完全切换到 admission-lines 数据源，数据就绪后自动可用

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ province: string }> }
) {
  const { province } = await params;
  const { searchParams } = new URL(request.url);

  const score = parseInt(searchParams.get('score') || '');
  const year = parseInt(searchParams.get('year') || '2026');
  const group = (searchParams.get('group') as SubjectGroup) || '物理类';
  const batch = searchParams.get('batch') || '本科批';
  const matchMode = (searchParams.get('matchMode') as 'balanced' | 'conservative' | 'aggressive') || 'balanced';

  if (isNaN(score) || score < 0 || score > 750) {
    return NextResponse.json({ error: '请输入有效的分数（0-750）' }, { status: 400 });
  }

  // 1. 加载一分一档数据
  const scoreRankData = await loadAllScoreRankData(province);
  if (scoreRankData.length === 0) {
    return NextResponse.json({ error: '未找到一分一档数据' }, { status: 404 });
  }

  // 2. 加载 admission-lines 数据（多年份）
  const lineYears = [2023, 2024, 2025]; // 固定取最近3年
  const allLineData: { year: number; entries: { universityCode: string; universityName: string; majorGroup: string; planCount: number; minScore: number; minRank: number; avgScore?: number }[] }[] = [];

  for (const lineYear of lineYears) {
    const lineData = await loadBatchAdmissionLines(province, lineYear, batch);
    if (lineData && lineData.entries.length > 0) {
      allLineData.push({ year: lineYear, entries: lineData.entries });
    }
  }

  // 3. 加载 2026 招生计划 index
  const planIndex = await loadAdmissionPlanIndex(province, 2026, batch);
  const planUniversities = planIndex.available ? planIndex.universities : [];

  // 4. 执行匹配
  const results = matchSchools(
    score, year, group, batch,
    scoreRankData,
    allLineData,
    planUniversities,
    matchMode,
  );

  // 5. 统计
  const summary = {
    total: results.length,
    chong: results.filter((r) => r.matchType === '冲').length,
    wen: results.filter((r) => r.matchType === '稳').length,
    bao: results.filter((r) => r.matchType === '保').length,
  };

  // 6. 查询用户排名信息
  const sortedRankYears = scoreRankData
    .filter((d) => d.group === group)
    .map((d) => d.year)
    .sort((a, b) => b - a);
  const rankYear = sortedRankYears.find((y) => y <= year) || sortedRankYears[0];
  const yearData = rankYear !== undefined
    ? scoreRankData.find((d) => d.year === rankYear && d.group === group)
    : undefined;
  const entry = yearData?.entries.find((e) => e.score === score);

  // 7. 可用批次列表
  const availablePlans = await scanAvailablePlans(province);
  const batches = availablePlans.map(p => p.batch).filter(b => b !== undefined);

  return NextResponse.json({
    input: { score, year, group, batch, matchMode },
    userRank: entry?.cumulative ?? null,
    rankYear,
    totalCandidates: yearData?.totalCandidates ?? null,
    summary,
    results,
    batches,
    dataSource: 'admission-lines',
    planYear: 2026,
    availablePlanBatches: batches,
  });
}
