/**
 * 冲稳保匹配 SQLite 数据库查询封装
 *
 * 数据库文件:
 *   data/河北/admission/gaokao-admission.db  — 招生计划 + 录取分数
 *   data/schools/gaokao-schools.db           — 院校元数据
 *
 * 用于 match API route，直接查询专业粒度的历史和计划数据。
 */

import Database from "better-sqlite3";
import path from "path";
import type { MajorScoreRecord, MajorPlanRecord, SchoolMeta } from "@/types/match";

// ============================================================
// Singleton
// ============================================================

let admissionDb: ReturnType<typeof Database> | null = null;
let schoolsDb: ReturnType<typeof Database> | null = null;

function getAdmissionDb(): ReturnType<typeof Database> {
  if (!admissionDb) {
    admissionDb = new Database(
      path.join(process.cwd(), "data", "河北", "admission", "gaokao-admission.db"),
      { readonly: true }
    );
  }
  return admissionDb;
}

function getSchoolsDb(): ReturnType<typeof Database> {
  if (!schoolsDb) {
    schoolsDb = new Database(
      path.join(process.cwd(), "data", "schools", "gaokao-schools.db"),
      { readonly: true }
    );
  }
  return schoolsDb;
}

// ============================================================
// 省份/科类 code 映射
// ============================================================

const PROVINCE_CODE = "13"; // 河北

const GROUP_TO_CATEGORY: Record<string, string> = {
  "物理类": "2073",
  "历史类": "2074",
};

// ============================================================
// 查询：历史录取分数
// ============================================================

export function queryMatchScores(
  batchName: string,
  group: string
): MajorScoreRecord[] {
  const db = getAdmissionDb();
  const categoryCode = GROUP_TO_CATEGORY[group];
  if (!categoryCode) return [];

  const rows = db.prepare(`
    SELECT
      school_id, special_id, year,
      spname, sp_name,
      level1_name, level2_name,
      min_score, max_score, avg_score,
      min_section, lq_num, is_score_range,
      zslx_name
    FROM admission_scores
    WHERE province_code = ?
      AND batch_name = ?
      AND category_code = ?
      AND year IN (2023, 2024, 2025)
      AND min_score > 0
    ORDER BY school_id, special_id, year DESC
  `).all(PROVINCE_CODE, batchName, categoryCode) as MajorScoreRecord[];

  return rows;
}

// ============================================================
// 查询：2026 招生计划
// ============================================================

export function queryMatchPlans(
  batchName: string,
  group: string
): MajorPlanRecord[] {
  const db = getAdmissionDb();
  const categoryCode = GROUP_TO_CATEGORY[group];
  if (!categoryCode) return [];

  // 检查 admission_plans 表是否存在（招生计划数据可能尚未导入）
  const tableCheck = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='admission_plans'
  `).get() as { name: string } | undefined;
  if (!tableCheck) return [];

  const rows = db.prepare(`
    SELECT
      school_id, special_id, num,
      length, tuition, sp_info,
      zslx_name, level1_name, level2_name,
      first_km_name, sp_fxk_name, sp_sxk_name,
      spname, sp_name
    FROM admission_plans
    WHERE province_code = ?
      AND batch_name = ?
      AND category_code = ?
      AND year = 2026
      AND num > 0
    ORDER BY school_id, special_id
  `).all(PROVINCE_CODE, batchName, categoryCode) as MajorPlanRecord[];

  return rows;
}

// ============================================================
// 查询：院校元数据（批量）
// ============================================================

export function getSchoolMetaForMatch(ids: number[]): Map<number, SchoolMeta> {
  const map = new Map<number, SchoolMeta>();
  if (ids.length === 0) return map;

  const db = getSchoolsDb();
  const placeholders = ids.map(() => "?").join(",");

  const rows = db.prepare(`
    SELECT
      s.school_id,
      s.name,
      s.province,
      s.level,
      s.f985,
      s.f211,
      s.dual_class
    FROM schools s
    WHERE s.school_id IN (${placeholders})
  `).all(...ids) as SchoolMeta[];

  for (const r of rows) {
    map.set(r.school_id, {
      school_id: r.school_id,
      name: r.name,
      province: r.province || "",
      level: r.level || "",
      f985: r.f985 || "",
      f211: r.f211 || "",
      dual_class: r.dual_class || "",
    });
  }

  return map;
}

// ============================================================
// 查询：可用批次选项（本科批 + 本科提前批A/B/C段 + 专科批 + 专科提前批）
// ============================================================

/** 匹配页面需要的批次选项（按固定顺序） */
const MATCH_BATCH_OPTIONS = [
  '本科批',
  '本科提前批A段',
  '本科提前批B段',
  '本科提前批C段',
  '专科批',
  '专科提前批',
];

export function getMatchBatchOptions(): string[] {
  const db = getAdmissionDb();

  // 从 DB 中确认哪些批次有数据（分数+计划），然后与硬编码列表交集
  const allAvailable = new Set<string>();

  const scoreBatches = db.prepare(`
    SELECT DISTINCT batch_name FROM admission_scores
    WHERE province_code = ?
  `).all(PROVINCE_CODE) as { batch_name: string }[];
  for (const r of scoreBatches) allAvailable.add(r.batch_name);

  // admission_plans 表可能尚未导入，安全查询
  const tableCheck = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='admission_plans'
  `).get() as { name: string } | undefined;
  if (tableCheck) {
    const planBatches = db.prepare(`
      SELECT DISTINCT batch_name FROM admission_plans
      WHERE province_code = ? AND year = 2026
    `).all(PROVINCE_CODE) as { batch_name: string }[];
    for (const r of planBatches) allAvailable.add(r.batch_name);
  }

  // 只保留预设列表中有数据的批次
  return MATCH_BATCH_OPTIONS.filter(b => allAvailable.has(b));
}

// ============================================================
// 查询：扫描所有可用批次
// ============================================================

export function getAvailableBatches(): string[] {
  // 复用同样的逻辑：只返回预设的本科 + 专科批次
  return getMatchBatchOptions();
}
