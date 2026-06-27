import { NextRequest, NextResponse } from 'next/server';
import { loadScoreRankDataFromDb, loadAllScoreRankDataFromDb } from '@/lib/db/score-rank-adapter';
import { findRankByScore } from '@/lib/utils/score-rank';
import { SubjectGroup } from '@/types/score-rank';
import { getProvince } from '@/lib/provinces';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ province: string }> }
) {
  const { province } = await params;
  const { searchParams } = new URL(request.url);
  const group = (searchParams.get('group') as SubjectGroup) || '物理类';
  const scoreStr = searchParams.get('score');
  const score = parseInt(scoreStr || '');

  if (isNaN(score) || score < 0 || score > 750) {
    return NextResponse.json({ error: '请输入 0-750 之间的有效分数' }, { status: 400 });
  }

  // Validate province
  const provinceConfig = getProvince(province);
  if (!provinceConfig) {
    return NextResponse.json({ error: '不支持的省份' }, { status: 400 });
  }

  // Find the latest year that has data for this group
  const allData = loadAllScoreRankDataFromDb(province);
  const groupData = allData.filter(d => d.group === group);

  if (groupData.length === 0) {
    return NextResponse.json({ error: `未找到${group}的一分一档数据` }, { status: 404 });
  }

  // Use the most recent year
  const latestYear = Math.max(...groupData.map(d => d.year));
  const yearData = loadScoreRankDataFromDb(province, latestYear, group);

  if (!yearData) {
    return NextResponse.json({ error: '未找到该年份和科类的数据' }, { status: 404 });
  }

  const result = findRankByScore(yearData.entries, score);
  if (!result) {
    return NextResponse.json({ error: '未找到该分数的位次数据' }, { status: 404 });
  }

  return NextResponse.json({
    rank: result.rank,
    year: latestYear,
    totalCandidates: result.totalCandidates,
    score: result.score,
    count: result.count,
    percentile: result.percentile,
  });
}
