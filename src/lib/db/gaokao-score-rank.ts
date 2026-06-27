/**
 * 高考一分一档表 SQLite 数据库操作封装
 *
 * 数据库文件: data/河北/score-rank/gaokao-score-rank.db
 *
 * 表:
 *   score_rank       - 一分一档数据
 *   equivalent_score - 等效分参照
 *   import_log       - 导入日志
 */

import Database from "better-sqlite3";
import path from "path";
import { ScoreRankData, ScoreRankEntry, SubjectGroup, EquivalentScoreRef } from "@/types/score-rank";

// category_code → SubjectGroup 映射
const CATEGORY_TO_GROUP: Record<string, SubjectGroup> = {
  "2073": "物理类",
  "2074": "历史类",
};

const GROUP_TO_CATEGORY: Record<string, string> = {
  "物理类": "2073",
  "历史类": "2074",
};

let db: ReturnType<typeof Database> | null = null;

function getDb(): ReturnType<typeof Database> {
  if (!db) {
    db = new Database(
      path.join(process.cwd(), "data", "河北", "score-rank", "gaokao-score-rank.db"),
      { readonly: true }
    );
  }
  return db;
}

// ============================================================
// 加载指定年份 + 科类的一分一档数据
// ============================================================

export function loadScoreRankData(
  year: number,
  group: SubjectGroup,
  batchName?: string
): ScoreRankData | null {
  const sdb = getDb();
  const categoryCode = GROUP_TO_CATEGORY[group];
  if (!categoryCode) return null;

  let query = `
    SELECT id, score, score_display, num, cum_total, rank_start, rank_end,
           control_score, batch_name
    FROM score_rank
    WHERE category_code = ? AND year = ?
  `;
  const args: (string | number)[] = [categoryCode, year];

  if (batchName) {
    query += " AND batch_name = ?";
    args.push(batchName);
  }

  query += " ORDER BY score DESC";

  const rows = sdb.prepare(query).all(...args) as DBRow[];

  if (rows.length === 0) return null;

  // 批量加载等效分
  const ids = rows.map(r => r.id);
  const eqMap = loadEquivalentScores(ids);

  const entries: ScoreRankEntry[] = rows.map(r => ({
    score: r.score,
    count: r.num,
    cumulative: r.cum_total,
    scoreDisplay: r.score_display,
    controlScore: r.control_score ?? undefined,
    batchName: r.batch_name,
    rankStart: r.rank_start,
    rankEnd: r.rank_end,
    equivalentScores: eqMap.get(r.id),
  }));

  const totalCandidates = entries.length > 0 ? entries[entries.length - 1].cumulative : 0;

  return {
    year,
    group,
    maxScore: entries[0]?.score ?? 0,
    minScore: entries[entries.length - 1]?.score ?? 0,
    totalCandidates,
    entries,
    meta: {
      source: "gaokao.cn",
      sourceUrl: "",
      publishedAt: "",
      quality: "official",
    },
  };
}

// ============================================================
// 加载所有年份 + 科类的一分一档数据
// ============================================================

export function loadAllScoreRankData(): ScoreRankData[] {
  const sdb = getDb();

  const groups = sdb.prepare(`
    SELECT DISTINCT category_code, year
    FROM score_rank
    ORDER BY year DESC, category_code
  `).all() as { category_code: string; year: number }[];

  const results: ScoreRankData[] = [];

  for (const g of groups) {
    const group = CATEGORY_TO_GROUP[g.category_code];
    if (!group) continue;
    const data = loadScoreRankData(g.year, group);
    if (data) results.push(data);
  }

  return results;
}

// ============================================================
// 获取可用年份
// ============================================================

export function getAvailableYears(): number[] {
  const sdb = getDb();
  const rows = sdb.prepare(`
    SELECT DISTINCT year FROM score_rank ORDER BY year DESC
  `).all() as { year: number }[];
  return rows.map(r => r.year);
}

// ============================================================
// 加载原始 DB 行（不展开聚合段，用于图表展示）
// ============================================================

export function loadScoreRankRows(
  year: number,
  group: SubjectGroup,
  batchName?: string
): DBRow[] {
  const sdb = getDb();
  const categoryCode = GROUP_TO_CATEGORY[group];
  if (!categoryCode) return [];

  let query = `
    SELECT id, score, score_display, num, cum_total, rank_start, rank_end,
           control_score, batch_name
    FROM score_rank
    WHERE category_code = ? AND year = ?
  `;
  const args: (string | number)[] = [categoryCode, year];

  if (batchName) {
    query += " AND batch_name = ?";
    args.push(batchName);
  }

  query += " ORDER BY score DESC";

  return sdb.prepare(query).all(...args) as DBRow[];
}

// ============================================================
// 辅助
// ============================================================

interface DBRow {
  id: number;
  score: number;
  score_display: string;
  num: number;
  cum_total: number;
  rank_start: number;
  rank_end: number;
  control_score: number | null;
  batch_name: string;
}

export function loadEquivalentScores(
  ids: number[]
): Map<number, EquivalentScoreRef[]> {
  if (ids.length === 0) return new Map();
  const sdb = getDb();
  const map = new Map<number, EquivalentScoreRef[]>();

  const placeholders = ids.map(() => "?").join(",");
  const rows = sdb.prepare(`
    SELECT score_rank_id, ref_year, ref_score, ref_rank_start, ref_rank_end
    FROM equivalent_score
    WHERE score_rank_id IN (${placeholders})
    ORDER BY score_rank_id, ref_year DESC
  `).all(...ids) as { score_rank_id: number; ref_year: number; ref_score: number; ref_rank_start: number; ref_rank_end: number }[];

  for (const r of rows) {
    if (!map.has(r.score_rank_id)) map.set(r.score_rank_id, []);
    map.get(r.score_rank_id)!.push({
      refYear: r.ref_year,
      refScore: r.ref_score,
      refRankStart: r.ref_rank_start,
      refRankEnd: r.ref_rank_end,
    });
  }

  return map;
}