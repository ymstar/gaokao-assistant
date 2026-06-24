import { NextRequest, NextResponse } from 'next/server';
import { loadAllScoreRankData } from '@/lib/data/score-rank';
import { loadAllAdmissionLineData } from '@/lib/data/admission-lines';
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

  // 加载投档线数据
  const admissionLines = await loadAllAdmissionLineData(province, undefined, group);
  if (admissionLines.length === 0) {
    return NextResponse.json({
      error: '暂无投档线数据，无法进行匹配',
      results: [],
    }, { status: 200 });
  }

  // 执行匹配
  const results = matchSchools(score, year, group, batch, scoreRankData, admissionLines);

  // 统计
  const summary = {
    total: results.length,
    chong: results.filter((r) => r.matchType === '冲').length,
    wen: results.filter((r) => r.matchType === '稳').length,
    bao: results.filter((r) => r.matchType === '保').length,
  };

  // 查询用户排名信息
  const yearData = scoreRankData.find((d) => d.year === year && d.group === group);
  const entry = yearData?.entries.find((e) => e.score === score);

  return NextResponse.json({
    input: { score, year, group, batch },
    userRank: entry?.cumulative ?? null,
    totalCandidates: yearData?.totalCandidates ?? null,
    summary,
    results,
  });
}
