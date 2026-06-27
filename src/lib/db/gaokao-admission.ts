/**
 * 高考招生计划 & 录取分数 SQLite 数据库操作封装
 *
 * 数据库文件: data/河北/admission/gaokao-admission.db
 *
 * 表:
 *   admission_plans  - 招生计划
 *   admission_scores - 录取分数
 *   import_log       - 导入日志
 */

import Database from "better-sqlite3";
import path from "path";

let db: ReturnType<typeof Database> | null = null;
let dbRw: ReturnType<typeof Database> | null = null;

function getDb(): ReturnType<typeof Database> {
  if (!db) {
    db = new Database(
      path.join(process.cwd(), "data", "河北", "admission", "gaokao-admission.db"),
      { readonly: true }
    );
  }
  return db;
}

/** Write-mode — used by import scripts */
export function getDbRW(): ReturnType<typeof Database> {
  if (!dbRw) {
    dbRw = new Database(
      path.join(process.cwd(), "data", "河北", "admission", "gaokao-admission.db"),
    );
    dbRw.pragma("journal_mode = WAL");
  }
  return dbRw;
}

// ============================================================
// Types
// ============================================================

export interface AdmissionPlan {
  id: number;
  school_id: number;
  special_id: number;
  year: number;
  province_code: string;
  batch_code: string;
  batch_name: string;
  category_code: string;
  category_name: string;
  spcode: string;
  spname: string;
  sp_name: string;
  num: number;
  length: string;
  tuition: string;
  level1_name: string;
  level2_name: string;
  level3_name: string;
  first_km: string;
  first_km_name: string;
  sp_fxk: string;
  sp_fxk_name: string;
  sp_sxk: string;
  sp_sxk_name: string;
  sp_info: string;
  zslx_name: string;
  remark: string;
  info: string;
}

export interface AdmissionScore {
  id: number;
  school_id: number;
  special_id: number;
  year: number;
  province_code: string;
  batch_code: string;
  batch_name: string;
  category_code: string;
  category_name: string;
  spname: string;
  sp_name: string;
  level1_name: string;
  level2_name: string;
  level3_name: string;
  min_score: number;
  max_score: number;
  avg_score: number;
  min_section: number;
  diff: number;
  lq_num: number | null;
  is_score_range: number;
  zslx_name: string;
  info: string;
  remark: string;
}

export interface AdmissionPlansQuery {
  school_id: number;
  year?: number;
  batch_name?: string;
  category_name?: string;
  keyword?: string;       // 专业名称搜索
  zslx_name?: string;     // 招生类型
  page?: number;
  pageSize?: number;
}

export interface AdmissionPlansResult {
  plans: AdmissionPlan[];
  total: number;
  years: number[];
  batchNames: string[];
  categoryNames: string[];
  zslxNames: string[];
}

export interface AdmissionScoresQuery {
  school_id: number;
  year?: number;
  batch_name?: string;
  category_name?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface AdmissionScoresResult {
  scores: AdmissionScore[];
  total: number;
  years: number[];
  batchNames: string[];
  categoryNames: string[];
}

// ============================================================
// 查询
// ============================================================

/** 查询招生计划，带筛选、分页 */
export function queryAdmissionPlans(params: AdmissionPlansQuery): AdmissionPlansResult {
  const db = getDb();
  const { school_id, year, batch_name, category_name, keyword, zslx_name, page = 1, pageSize = 50 } = params;

  const conditions: string[] = ["school_id = ?"];
  const args: (number | string)[] = [school_id];

  if (year) {
    conditions.push("year = ?");
    args.push(year);
  }
  if (batch_name) {
    conditions.push("batch_name = ?");
    args.push(batch_name);
  }
  if (category_name) {
    conditions.push("category_name = ?");
    args.push(category_name);
  }
  if (zslx_name) {
    conditions.push("zslx_name = ?");
    args.push(zslx_name);
  }
  if (keyword) {
    conditions.push("(spname LIKE ? OR sp_name LIKE ?)");
    const kw = `%${keyword}%`;
    args.push(kw, kw);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const offset = (page - 1) * pageSize;

  // 获取总数
  const totalRow = db.prepare(
    `SELECT COUNT(*) as cnt FROM admission_plans ${where}`
  ).get(...args) as { cnt: number };

  // 获取计划列表
  const plans = db.prepare(`
    SELECT * FROM admission_plans ${where}
    ORDER BY year DESC, sp_name
    LIMIT ? OFFSET ?
  `).all(...args, pageSize, offset) as AdmissionPlan[];

  // 获取筛选选项
  const filterOptions = db.prepare(`
    SELECT DISTINCT year, batch_name, category_name, zslx_name
    FROM admission_plans WHERE school_id = ?
    ORDER BY year DESC, batch_name, category_name, zslx_name
  `).all(school_id) as { year: number; batch_name: string; category_name: string; zslx_name: string }[];

  const years = [...new Set(filterOptions.map(r => r.year))].sort((a, b) => b - a);
  const batchNames = [...new Set(filterOptions.map(r => r.batch_name))];
  const categoryNames = [...new Set(filterOptions.map(r => r.category_name))];
  const zslxNames = [...new Set(filterOptions.map(r => r.zslx_name))];

  return { plans, total: totalRow.cnt, years, batchNames, categoryNames, zslxNames };
}

/** 查询录取分数，带筛选、分页 */
export function queryAdmissionScores(params: AdmissionScoresQuery): AdmissionScoresResult {
  const db = getDb();
  const { school_id, year, batch_name, category_name, keyword, page = 1, pageSize = 50 } = params;

  const conditions: string[] = ["school_id = ?"];
  const args: (number | string)[] = [school_id];

  if (year) { conditions.push("year = ?"); args.push(year); }
  if (batch_name) { conditions.push("batch_name = ?"); args.push(batch_name); }
  if (category_name) { conditions.push("category_name = ?"); args.push(category_name); }
  if (keyword) {
    conditions.push("(spname LIKE ? OR sp_name LIKE ?)");
    const kw = `%${keyword}%`;
    args.push(kw, kw);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const offset = (page - 1) * pageSize;

  // 获取总数
  const totalRow = db.prepare(`SELECT COUNT(*) as cnt FROM admission_scores ${where}`).get(...args) as { cnt: number };

  // 获取分数列表
  const scores = db.prepare(`
    SELECT * FROM admission_scores ${where}
    ORDER BY year DESC, min_score DESC
    LIMIT ? OFFSET ?
  `).all(...args, pageSize, offset) as AdmissionScore[];

  // 获取筛选选项
  const filterOptions = db.prepare(`
    SELECT DISTINCT year, batch_name, category_name
    FROM admission_scores WHERE school_id = ?
    ORDER BY year DESC, batch_name, category_name
  `).all(school_id) as { year: number; batch_name: string; category_name: string }[];

  const years = [...new Set(filterOptions.map(r => r.year))].sort((a, b) => b - a);
  const batchNames = [...new Set(filterOptions.map(r => r.batch_name))];
  const categoryNames = [...new Set(filterOptions.map(r => r.category_name))];

  return { scores, total: totalRow.cnt, years, batchNames, categoryNames };
}

// ============================================================
// 全局查询（不限学校）
// ============================================================

export interface GlobalPlansQuery {
  year?: number;
  batch_name?: string;
  category_name?: string;
  zslx_name?: string;
  level2_name?: string;
  keyword?: string;
  sort?: 'plan_desc' | 'plan_asc' | 'tuition_desc' | 'tuition_asc';
  page?: number;
  pageSize?: number;
}

export interface GlobalPlansResult {
  entries: AdmissionPlan[];
  total: number;
  years: number[];
  batchNames: string[];
  categoryNames: string[];
  zslxNames: string[];
  level2Names: string[];
  stats: {
    universityCount: number;
    entryCount: number;
    totalPlans: number;
    categoryDistribution: Record<string, number>;
    level2Distribution: Record<string, number>;
    zslxDistribution: Record<string, number>;
    tuitionDistribution: Record<string, number>;
    topSchools: { school_id: number; plans: number; entries: number }[];
  };
}

export function queryGlobalAdmissionPlans(params: GlobalPlansQuery): GlobalPlansResult {
  // 每次新建连接（单例 db 重复 ATTACH 同一 schema 会报 "already in use"）
  const dbPath = path.join(process.cwd(), "data", "河北", "admission", "gaokao-admission.db");
  const schoolsDbPath = path.join(process.cwd(), "data", "schools", "gaokao-schools.db");
  const adb = new Database(dbPath, { readonly: true });
  adb.exec(`ATTACH DATABASE '${schoolsDbPath}' AS sch`);
  const { year, batch_name, category_name, zslx_name, level2_name, keyword,
    sort = 'plan_desc', page = 1, pageSize = 50 } = params;

  const conditions: string[] = [];
  const args: (number | string)[] = [];

  if (year) { conditions.push("ap.year = ?"); args.push(year); }
  if (batch_name) { conditions.push("ap.batch_name = ?"); args.push(batch_name); }
  if (category_name) { conditions.push("ap.category_name = ?"); args.push(category_name); }
  if (zslx_name) { conditions.push("ap.zslx_name = ?"); args.push(zslx_name); }
  if (level2_name) { conditions.push("ap.level2_name = ?"); args.push(level2_name); }
  if (keyword) {
    conditions.push("(ap.spname LIKE ? OR ap.sp_name LIKE ? OR ap.spcode LIKE ? OR s.name LIKE ?)");
    const kw = `%${keyword}%`;
    args.push(kw, kw, kw, kw);
  }

  const fromClause = "admission_plans ap JOIN sch.schools s ON ap.school_id = s.school_id";
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (page - 1) * pageSize;

  // 排序
  let orderBy = "ap.year DESC, ap.sp_name";
  if (sort === 'plan_asc') orderBy = "ap.num ASC";
  else if (sort === 'plan_desc') orderBy = "ap.num DESC";
  else if (sort === 'tuition_asc') orderBy = "CAST(ap.tuition AS INTEGER) ASC";
  else if (sort === 'tuition_desc') orderBy = "CAST(ap.tuition AS INTEGER) DESC";

  // 总数
  const totalRow = adb.prepare(
    `SELECT COUNT(*) as cnt FROM ${fromClause} ${where}`
  ).get(...args) as { cnt: number };

  // 列表
  const entries = adb.prepare(`
    SELECT ap.* FROM ${fromClause} ${where}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...args, pageSize, offset) as AdmissionPlan[];

  // 统计（基于筛选条件）
  const statsRows = adb.prepare(`
    SELECT ap.school_id, ap.num, ap.category_name, ap.level2_name, ap.zslx_name, ap.tuition
    FROM ${fromClause} ${where}
  `).all(...args) as { school_id: number; num: number; category_name: string; level2_name: string; zslx_name: string; tuition: string }[];

  const uniSet = new Set<number>();
  let totalPlans = 0;
  const categoryDist: Record<string, number> = {};
  const level2Dist: Record<string, number> = {};
  const zslxDist: Record<string, number> = {};
  const tuitionDist: Record<string, number> = {};
  const schoolPlans = new Map<number, { plans: number; entries: number }>();

  statsRows.forEach(r => {
    uniSet.add(r.school_id);
    totalPlans += r.num;
    categoryDist[r.category_name] = (categoryDist[r.category_name] || 0) + 1;
    level2Dist[r.level2_name] = (level2Dist[r.level2_name] || 0) + 1;
    zslxDist[r.zslx_name] = (zslxDist[r.zslx_name] || 0) + 1;

    const t = parseInt(r.tuition) || 0;
    if (t > 0) {
      const bucket = t <= 5000 ? '≤5000' : t <= 10000 ? '5001-10000' :
        t <= 20000 ? '10001-20000' : t <= 50000 ? '20001-50000' : '>50000';
      tuitionDist[bucket] = (tuitionDist[bucket] || 0) + 1;
    }

    if (!schoolPlans.has(r.school_id)) {
      schoolPlans.set(r.school_id, { plans: 0, entries: 0 });
    }
    const sp = schoolPlans.get(r.school_id)!;
    sp.plans += r.num;
    sp.entries += 1;
  });

  const topSchools = [...schoolPlans.entries()]
    .map(([school_id, v]) => ({ school_id, ...v }))
    .sort((a, b) => b.plans - a.plans)
    .slice(0, 30);

  // 获取筛选选项（全局）
  const filterOptions = adb.prepare(`
    SELECT DISTINCT year, batch_name, category_name, zslx_name, level2_name
    FROM admission_plans ORDER BY year DESC, batch_name, category_name, zslx_name, level2_name
  `).all() as { year: number; batch_name: string; category_name: string; zslx_name: string; level2_name: string }[];

  const years = [...new Set(filterOptions.map(r => r.year))].sort((a, b) => b - a);
  const batchNames = [...new Set(filterOptions.map(r => r.batch_name))];
  const categoryNames = [...new Set(filterOptions.map(r => r.category_name))];
  const zslxNames = [...new Set(filterOptions.map(r => r.zslx_name))];
  const level2Names = [...new Set(filterOptions.map(r => r.level2_name))].filter(Boolean).sort();

  return {
    entries, total: totalRow.cnt,
    years, batchNames, categoryNames, zslxNames, level2Names,
    stats: {
      universityCount: uniSet.size,
      entryCount: statsRows.length,
      totalPlans,
      categoryDistribution: categoryDist,
      level2Distribution: level2Dist,
      zslxDistribution: zslxDist,
      tuitionDistribution: tuitionDist,
      topSchools,
    },
  };
}

// ============================================================
// 数据库初始化 & 导入函数
// ============================================================

interface ApiGroup {
  item?: Array<Record<string, unknown>>;
}

const BATCH_NAMES: Record<string, string> = {
  "14": "本科批", "36": "本科提前批A段", "37": "本科提前批B段",
  "86": "本科提前批C段", "10": "专科批", "11": "专科提前批",
};
const CAT_NAMES: Record<string, string> = {
  "2073": "物理类", "2074": "历史类",
};

function batchName(code: string, fallback?: string): string {
  return BATCH_NAMES[code] || fallback || code;
}
function catName(code: string): string {
  return CAT_NAMES[code] || code;
}

export function initDb(): void {
  const db = getDbRW();
  db.exec(`
    CREATE TABLE IF NOT EXISTS admission_plans (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id       INTEGER NOT NULL,
      special_id      INTEGER NOT NULL,
      year            INTEGER NOT NULL,
      province_code   TEXT NOT NULL DEFAULT '13',
      batch_code      TEXT NOT NULL,
      batch_name      TEXT NOT NULL,
      category_code   TEXT NOT NULL,
      category_name   TEXT NOT NULL,
      spcode          TEXT NOT NULL DEFAULT '',
      spname          TEXT NOT NULL DEFAULT '',
      sp_name         TEXT NOT NULL DEFAULT '',
      num             INTEGER NOT NULL DEFAULT 0,
      length          TEXT NOT NULL DEFAULT '',
      tuition         TEXT NOT NULL DEFAULT '',
      level1_name     TEXT NOT NULL DEFAULT '',
      level2_name     TEXT NOT NULL DEFAULT '',
      level3_name     TEXT NOT NULL DEFAULT '',
      first_km        TEXT NOT NULL DEFAULT '',
      first_km_name   TEXT NOT NULL DEFAULT '',
      sp_fxk          TEXT NOT NULL DEFAULT '',
      sp_fxk_name     TEXT NOT NULL DEFAULT '',
      sp_sxk          TEXT NOT NULL DEFAULT '',
      sp_sxk_name     TEXT NOT NULL DEFAULT '',
      sp_info         TEXT NOT NULL DEFAULT '',
      zslx_name       TEXT NOT NULL DEFAULT '',
      remark          TEXT NOT NULL DEFAULT '',
      info            TEXT NOT NULL DEFAULT '',
      data_fetched_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admission_scores (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id       INTEGER NOT NULL,
      special_id      INTEGER NOT NULL,
      year            INTEGER NOT NULL,
      province_code   TEXT NOT NULL DEFAULT '13',
      batch_code      TEXT NOT NULL,
      batch_name      TEXT NOT NULL,
      category_code   TEXT NOT NULL,
      category_name   TEXT NOT NULL,
      spname          TEXT NOT NULL DEFAULT '',
      sp_name         TEXT NOT NULL DEFAULT '',
      level1_name     TEXT NOT NULL DEFAULT '',
      level2_name     TEXT NOT NULL DEFAULT '',
      level3_name     TEXT NOT NULL DEFAULT '',
      min_score       INTEGER NOT NULL DEFAULT 0,
      max_score       INTEGER NOT NULL DEFAULT 0,
      avg_score       INTEGER NOT NULL DEFAULT 0,
      min_section     INTEGER NOT NULL DEFAULT 0,
      diff            INTEGER NOT NULL DEFAULT 0,
      lq_num          INTEGER,
      is_score_range  INTEGER NOT NULL DEFAULT 0,
      zslx_name       TEXT NOT NULL DEFAULT '',
      info            TEXT NOT NULL DEFAULT '',
      remark          TEXT NOT NULL DEFAULT '',
      data_fetched_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS import_log (
      school_id       INTEGER NOT NULL,
      year            INTEGER NOT NULL,
      province_code   TEXT NOT NULL DEFAULT '13',
      import_type     TEXT NOT NULL,
      success         INTEGER NOT NULL DEFAULT 0,
      error_msg       TEXT,
      imported_at     TEXT DEFAULT (datetime('now'))
    );

    -- 唯一约束：防止同一院校同年同批次同科类重复导入同一专业
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ap_unique ON admission_plans(school_id, special_id, year, province_code, batch_code, category_code);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_as_unique ON admission_scores(school_id, special_id, year, province_code, batch_code, category_code);

    CREATE INDEX IF NOT EXISTS idx_ap_school_year ON admission_plans(school_id, year);
    CREATE INDEX IF NOT EXISTS idx_ap_special_id ON admission_plans(special_id);
    CREATE INDEX IF NOT EXISTS idx_as_school_year ON admission_scores(school_id, year);
    CREATE INDEX IF NOT EXISTS idx_as_min_section ON admission_scores(min_section);
    CREATE INDEX IF NOT EXISTS idx_as_special_id ON admission_scores(special_id);
    CREATE INDEX IF NOT EXISTS idx_il_lookup ON import_log(school_id, year, province_code, import_type);
  `);
}

export function importAdmissionPlans(
  schoolId: number,
  year: number,
  provinceCode: string,
  data: { code?: string; data?: Record<string, ApiGroup> }
): number {
  const db = getDbRW();
  const raw = data.data;
  if (!raw) return 0;

  let count = 0;
  const insert = db.prepare(`
    INSERT OR IGNORE INTO admission_plans (
      school_id, special_id, year, province_code,
      batch_code, batch_name, category_code, category_name,
      spcode, spname, sp_name, num, length, tuition,
      level1_name, level2_name, level3_name,
      first_km, first_km_name, sp_fxk, sp_fxk_name, sp_sxk, sp_sxk_name,
      sp_info, zslx_name, remark, info
    ) VALUES (
      ?,?,?,?,?,?,?,?,?,?,?,?,?,?,
      ?,?,?,?,?,?,?,?,?,?,?,?,?
    )
  `);

  const transaction = db.transaction(() => {
    for (const [groupKey, group] of Object.entries(raw)) {
      if (!group.item?.length) continue;
      const parts = groupKey.split("_");
      const catCode = parts[0] || "";
      const batCode = parts[1] || "";

      for (const item of group.item) {
        insert.run(
          schoolId,
          parseInt(String(item.special_id ?? 0), 10),
          year,
          provinceCode,
          batCode,
          batchName(batCode, String(item.local_batch_name ?? "")),
          catCode,
          catName(catCode),
          String(item.spcode ?? ""),
          String(item.spname ?? ""),
          String(item.sp_name ?? ""),
          parseInt(String(item.num ?? item.plan_num ?? 0), 10),
          String(item.length ?? item.xuezhi ?? ""),
          String(item.tuition ?? ""),
          String(item.level1_name ?? ""),
          String(item.level2_name ?? ""),
          String(item.level3_name ?? ""),
          String(item.first_km ?? ""),
          String(item.first_km_name ?? ""),
          String(item.sp_fxk ?? ""),
          String(item.sp_fxk_name ?? ""),
          String(item.sp_sxk ?? ""),
          String(item.sp_sxk_name ?? ""),
          String(item.sp_info ?? ""),
          String(item.zslx_name ?? ""),
          String(item.remark ?? ""),
          String(item.info ?? "")
        );
        count++;
      }
    }

    logImport(schoolId, year, provinceCode, "plan", true, null);
  });

  transaction();
  return count;
}

export function importAdmissionScores(
  schoolId: number,
  year: number,
  provinceCode: string,
  data: { code?: string; data?: Record<string, ApiGroup> }
): number {
  const db = getDbRW();
  const raw = data.data;
  if (!raw) return 0;

  let count = 0;
  const insert = db.prepare(`
    INSERT OR IGNORE INTO admission_scores (
      school_id, special_id, year, province_code,
      batch_code, batch_name, category_code, category_name,
      spname, sp_name, level1_name, level2_name, level3_name,
      min_score, max_score, avg_score, min_section, diff, lq_num,
      is_score_range, zslx_name, info, remark
    ) VALUES (
      ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,
      ?,?,?,?
    )
  `);

  const transaction = db.transaction(() => {
    for (const [groupKey, group] of Object.entries(raw)) {
      if (!group.item?.length) continue;
      const parts = groupKey.split("_");
      const catCode = parts[0] || "";
      const batCode = parts[1] || "";

      for (const item of group.item) {
        const lqNum = item.lq_num && item.lq_num !== "-" ? parseInt(String(item.lq_num), 10) : null;
        const diffVal = typeof item.diff === "number" ? item.diff : -1;

        insert.run(
          parseInt(String(item.school_id ?? 0), 10) || schoolId,
          parseInt(String(item.special_id ?? 0), 10),
          year,
          provinceCode,
          batCode,
          batchName(batCode, String(item.local_batch_name ?? "")),
          catCode,
          catName(catCode),
          String(item.spname ?? ""),
          String(item.sp_name ?? ""),
          String(item.level1_name ?? ""),
          String(item.level2_name ?? ""),
          String(item.level3_name ?? ""),
          parseInt(String(item.min ?? 0), 10),
          parseInt(String(item.max ?? 0), 10),
          parseInt(String(item.average ?? 0), 10),
          parseInt(String(item.min_section ?? 0), 10),
          diffVal,
          lqNum,
          String(item.is_score_range ?? "") === "1" ? 1 : 0,
          String(item.zslx_name ?? ""),
          String(item.info ?? ""),
          String(item.remark ?? "")
        );
        count++;
      }
    }

    logImport(schoolId, year, provinceCode, "score", true, null);
  });

  transaction();
  return count;
}

function logImport(
  schoolId: number,
  year: number,
  provinceCode: string,
  importType: string,
  success: boolean,
  errorMsg: string | null,
): void {
  const db = getDbRW();
  db.prepare(`
    INSERT INTO import_log (school_id, year, province_code, import_type, success, error_msg, imported_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(schoolId, year, provinceCode, importType, success ? 1 : 0, errorMsg);
}

export function logImportFailure(
  schoolId: number,
  year: number,
  provinceCode: string,
  errorMsg: string,
): void {
  logImport(schoolId, year, provinceCode, "plan_score", false, errorMsg);
}

export function isPlanImported(schoolId: number, year: number, provinceCode: string): boolean {
  const db = getDbRW();
  const row = db.prepare(`
    SELECT 1 FROM import_log WHERE school_id=? AND year=? AND province_code=? AND import_type='plan' AND success=1
  `).get(schoolId, year, provinceCode);
  return !!row;
}

export function isScoreImported(schoolId: number, year: number, provinceCode: string): boolean {
  const db = getDbRW();
  const row = db.prepare(`
    SELECT 1 FROM import_log WHERE school_id=? AND year=? AND province_code=? AND import_type='score' AND success=1
  `).get(schoolId, year, provinceCode);
  return !!row;
}

export function getImportStats() {
  const db = getDbRW();
  const totalSchools = (db.prepare("SELECT COUNT(DISTINCT school_id) as cnt FROM admission_scores").get() as { cnt: number }).cnt;
  const planEntries = (db.prepare("SELECT COUNT(*) as cnt FROM admission_plans").get() as { cnt: number }).cnt;
  const scoreEntries = (db.prepare("SELECT COUNT(*) as cnt FROM admission_scores").get() as { cnt: number }).cnt;
  const byYear = db.prepare(`
    SELECT year,
      (SELECT COUNT(*) FROM admission_plans  a WHERE a.year = s.year) as plans,
      (SELECT COUNT(*) FROM admission_scores a WHERE a.year = s.year) as scores,
      (SELECT COUNT(DISTINCT a.school_id) FROM admission_scores a WHERE a.year = s.year) as schools
    FROM (SELECT DISTINCT year FROM admission_scores) s ORDER BY year DESC
  `).all() as { year: number; plans: number; scores: number; schools: number }[];

  return { totalSchools, planEntries, scoreEntries, byYear };
}

// ============================================================
// 院校名称批量查询
// ============================================================

let schoolsDb: ReturnType<typeof Database> | null = null;

function getSchoolsDb(): ReturnType<typeof Database> {
  if (!schoolsDb) {
    schoolsDb = new Database(
      path.join(process.cwd(), "data", "schools", "gaokao-schools.db"),
      { readonly: true }
    );
  }
  return schoolsDb;
}

/** 通过 school_id 批量获取学校名称 */
export function getSchoolNames(ids: number[]): Map<number, string> {
  if (ids.length === 0) return new Map();
  const sdb = getSchoolsDb();
  const placeholders = ids.map(() => '?').join(',');
  const rows = sdb.prepare(`
    SELECT s.school_id, json_extract(sd.raw_json, '$.name') as name
    FROM schools s
    JOIN school_details sd ON s.school_id = sd.school_id
    WHERE s.school_id IN (${placeholders})
  `).all(...ids) as { school_id: number; name: string }[];
  return new Map(rows.map(r => [r.school_id, r.name]));
}