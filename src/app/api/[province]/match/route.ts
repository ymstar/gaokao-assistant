import { NextRequest, NextResponse } from 'next/server';
import { loadAllScoreRankData } from '@/lib/data/score-rank';
import { loadAdmissionData, scanAvailableBatches } from '@/lib/data/admission';
import { matchSchools } from '@/lib/utils/match';
import { SubjectGroup } from '@/types/score-rank';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ province: string }> }
) {
  const { province } = await params;
  const { searchParams } = new URL(request.url);

  const score = parseInt(searchParams.get('score') || '');
  const year = parseInt(searchParams.get('year') || '2025');
  const group = (searchParams.get('group') as SubjectGroup) || '物理类';
  const batch = searchParams.get('batch') || '本科批';

  if (isNaN(score) || score < 0 || score > 750) {
    return NextResponse.json({ error: '请输入有效的分数（0-750）' }, { status: 400 });
  }

  // 加载一分一档数据
  const scoreRankData = await loadAllScoreRankData(province);
  if (scoreRankData.length === 0) {
    return NextResponse.json({ error: '未找到一分一档数据' }, { status: 404 });
  }

  // 加载所有可用批次的投档数据
  const available = await scanAvailableBatches(province);
  const batchesToLoad = available.filter(b => b.group === group);
  const admissionData = [];
  for (const b of batchesToLoad) {
    const data = await loadAdmissionData(province, b.year, b.batch, b.group);
    if (data) admissionData.push(data);
  }

  if (admissionData.length === 0) {
    return NextResponse.json({
      error: '暂无投档数据，无法进行匹配',
      results: [],
      available,
    }, { status: 200 });
  }

  // 执行匹配
  const results = matchSchools(score, year, group, batch, scoreRankData, admissionData);

  // 统计
  const summary = {
    total: results.length,
    chong: results.filter((r) => r.matchType === '冲').length,
    wen: results.filter((r) => r.matchType === '稳').length,
    bao: results.filter((r) => r.matchType === '保').length,
  };

  // 查询用户排名信息（fallback 到最近一年）
  const sortedRankYears = scoreRankData
    .filter((d) => d.group === group)
    .map((d) => d.year)
    .sort((a, b) => b - a);
  const rankYear = sortedRankYears.find((y) => y <= year) || sortedRankYears[0];
  const yearData = rankYear !== undefined
    ? scoreRankData.find((d) => d.year === rankYear && d.group === group)
    : undefined;
  const entry = yearData?.entries.find((e) => e.score === score);

  // 可用批次列表
  const batches = [...new Set(available.filter(b => b.group === group).map(b => b.batch))];

  return NextResponse.json({
    input: { score, year, group, batch },
    userRank: entry?.cumulative ?? null,
    rankYear,  // 实际使用的位次年份
    totalCandidates: yearData?.totalCandidates ?? null,
    summary,
    results,
    batches,
  });
}
