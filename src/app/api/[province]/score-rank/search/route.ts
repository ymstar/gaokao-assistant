import { NextRequest, NextResponse } from 'next/server';
import { loadScoreRankDataFromDb } from '@/lib/db/score-rank-adapter';
import { findRankByScore } from '@/lib/utils/score-rank';
import { SubjectGroup } from '@/types/score-rank';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ province: string }> }
) {
  const { province } = await params;
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || '2025');
  const group = (searchParams.get('group') as SubjectGroup) || '物理类';
  const score = parseInt(searchParams.get('score') || '');

  if (isNaN(score)) {
    return NextResponse.json({ error: '请输入有效的分数' }, { status: 400 });
  }

  const yearData = loadScoreRankDataFromDb(province, year, group);
  if (!yearData) {
    return NextResponse.json({ error: '未找到该年份和科类的数据' }, { status: 404 });
  }

  const result = findRankByScore(yearData.entries, score);
  if (!result) {
    return NextResponse.json({ error: '未找到该分数的数据' }, { status: 404 });
  }

  return NextResponse.json({
    input: { year, group, score },
    result,
  });
}
