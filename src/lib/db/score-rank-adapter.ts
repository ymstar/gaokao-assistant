/**
 * SQLite → ScoreRankData 适配器
 *
 * 将 gaokao-score-rank.db 中的数据转换为现有 ScoreRankData 格式，
 * 使现有 UI 组件和算法无需修改即可使用 SQLite 数据源。
 */

import { ScoreRankData, SubjectGroup, ScoreRankEntry, EquivalentScoreRef } from '@/types/score-rank';
import { ScoreRankRow } from '@/types/score-rank-chart';
import {
  loadScoreRankData,
  loadAllScoreRankData,
  loadScoreRankRows,
  getAvailableYears,
  loadEquivalentScores,
} from './gaokao-score-rank';

// 重新导出，方便外部统一引用
export { loadScoreRankData, loadAllScoreRankData, getAvailableYears };

// ============================================================
// Adapter functions
// ============================================================

/**
 * 加载单个年份 / 科类的数据，返回与 JSON 文件完全兼容的 ScoreRankData
 */
export function loadScoreRankDataFromDb(
  _provinceSlug: string,
  year: number,
  group: SubjectGroup,
  _batchType: number = 3
): ScoreRankData | null {
  return loadScoreRankData(year, group);
}

/**
 * 加载某省份全部可用年份 / 科类的一分一档数据（含等效分参照）
 */
export function loadAllScoreRankDataWithEquivalents(
  _provinceSlug: string,
  _batchType: number = 3
): ScoreRankData[] {
  return loadAllScoreRankData();
}

/**
 * 加载某省份全部可用年份 / 科类的一分一档数据（不含等效分参照）
 */
export function loadAllScoreRankDataFromDb(
  _provinceSlug: string,
  _batchType: number = 3
): ScoreRankData[] {
  return loadAllScoreRankData();
}

// ============================================================
// 图表数据适配器
// ============================================================

/**
 * 加载图表所需的原始行数据（聚合段不展开）
 */
export function loadChartRows(
  _provinceSlug: string,
  year: number,
  group: SubjectGroup,
  _batchType: number = 3
): ScoreRankRow[] {
  const rows = loadScoreRankRows(year, group);
  if (rows.length === 0) return [];

  const ids = rows.map(r => r.id);
  const eqMap = loadEquivalentScores(ids);

  return rows.map(r => ({
    score: r.score,
    scoreDisplay: r.score_display,
    count: r.num,
    cumulative: r.cum_total,
    rankStart: r.rank_start,
    rankEnd: r.rank_end,
    controlScore: r.control_score ?? 0,
    batchName: r.batch_name,
    equivalentScores: eqMap.get(r.id),
  }));
}

/**
 * 加载多个年份/科类的图表原始行
 */
export function loadAllChartRows(
  _provinceSlug: string,
  group: SubjectGroup,
  _batchType: number = 3
): { year: number; rows: ScoreRankRow[] }[] {
  const years = getAvailableYears();
  const results: { year: number; rows: ScoreRankRow[] }[] = [];

  for (const year of years) {
    const rows = loadScoreRankRows(year, group);
    if (rows.length === 0) continue;

    const ids = rows.map(r => r.id);
    const eqMap = loadEquivalentScores(ids);

    results.push({
      year,
      rows: rows.map(r => ({
        score: r.score,
        scoreDisplay: r.score_display,
        count: r.num,
        cumulative: r.cum_total,
        rankStart: r.rank_start,
        rankEnd: r.rank_end,
        controlScore: r.control_score ?? 0,
        batchName: r.batch_name,
        equivalentScores: eqMap.get(r.id),
      })),
    });
  }

  return results;
}