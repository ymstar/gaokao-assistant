import { NextRequest, NextResponse } from 'next/server';
import { loadScoreRankData } from '@/lib/db/gaokao-score-rank';
import { queryMatchScores, queryMatchPlans, getSchoolMetaForMatch, getAvailableBatches } from '@/lib/db/gaokao-match';
import { matchSchoolsV2 } from '@/lib/utils/match';
import { findRankByScore } from '@/lib/utils/score-rank';
import type { SubjectGroup } from '@/types/score-rank';

/**
 * 冲稳保匹配 API — V2
 *
 * 数据源：
 *   - gaokao-admission.db (admission_scores + admission_plans) — 专业级历史分数 & 2026计划
 *   - gaokao-score-rank.db (score_rank) — 一分一档 → 用户位次
 *   - gaokao-schools.db (schools) — 院校名称 & 元数据
 *
 * 查询参数：
 *   score     — 高考分数 (0-750)
 *   year      — 目标年份，默认 2026
 *   group     — 科类：物理类/历史类，默认 物理类
 *   batch     — 批次名称，默认 本科批
 *   matchMode — 匹配模式：balanced/conservative/aggressive，默认 balanced
 *   limit     — 每个档位最多返回学校数，默认 300
 */

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
  const matchMode = (
    searchParams.get('matchMode') as 'balanced' | 'conservative' | 'aggressive'
  ) || 'balanced';
  const maxPerType = parseInt(searchParams.get('limit') || '50');

  if (isNaN(score) || score < 0 || score > 750) {
    return NextResponse.json(
      { error: '请输入有效的分数（0-750）' },
      { status: 400 }
    );
  }

  // ---- 1. 加载一分一档 → 查询用户位次 ----
  const rankYearData = loadScoreRankData(year, group);
  if (!rankYearData) {
    return NextResponse.json(
      { error: `未找到 ${year} 年 ${group} 的一分一档数据` },
      { status: 404 }
    );
  }

  const rankResult = findRankByScore(rankYearData.entries, score);
  if (!rankResult) {
    return NextResponse.json(
      { error: `未找到分数 ${score} 对应的位次数据` },
      { status: 404 }
    );
  }

  const userRank = rankResult.rank;

  // ---- 2. 加载历史录取分数（2023-2025，专业粒度）----
  const scoreRows = queryMatchScores(batch, group);

  // ---- 3. 加载 2026 招生计划（专业粒度）----
  const planRows = queryMatchPlans(batch, group);

  // ---- 4. 加载院校元数据 ----
  const allSchoolIds = new Set<number>();
  for (const r of scoreRows) allSchoolIds.add(r.school_id);
  for (const p of planRows) allSchoolIds.add(p.school_id);
  const schoolMetaMap = getSchoolMetaForMatch([...allSchoolIds]);

  // ---- 5. 执行 V2 匹配算法（固定激进模式：取最好进的专业组位次）----
  const allResults = matchSchoolsV2(
    score,
    userRank,
    scoreRows,
    planRows,
    schoolMetaMap,
    'aggressive',
    batch,
  );

  // 每个档位限制数量，避免响应过大
  const limitPerType = maxPerType;
  const chongResults = allResults.filter(r => r.matchType === '冲').slice(0, limitPerType);
  const wenResults = allResults.filter(r => r.matchType === '稳').slice(0, limitPerType);
  const baoResults = allResults.filter(r => r.matchType === '保').slice(0, limitPerType);
  const results = [...chongResults, ...wenResults, ...baoResults];

  // ---- 6. 统计汇总 ----
  const summary = {
    total: results.length,
    chong: results.filter(r => r.matchType === '冲').length,
    wen: results.filter(r => r.matchType === '稳').length,
    bao: results.filter(r => r.matchType === '保').length,
  };

  // ---- 7. 可用批次列表 ----
  const batches = getAvailableBatches();

  return NextResponse.json({
    input: { score, year, group, batch, matchMode },
    userRank,
    rankYear: year,
    totalCandidates: rankYearData.totalCandidates,
    summary,
    results,
    batches,
    dataSource: 'gaokao-admission.db',
  });
}
