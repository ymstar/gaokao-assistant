/**
 * 高考院校 SQLite 数据库操作封装
 *
 * 数据来源:
 *   https://static-data.gaokao.cn/www/2.0/school/list_v2.json  - 院校列表
 *   https://static-data.gaokao.cn/www/2.0/school/{id}/info.json - 院校详情
 *
 * 数据库文件: data/schools/gaokao-schools.db
 *
 * 用法:
 *   import { getDb, initDb } from '@/lib/db/gaokao-schools';
 *   const db = getDb();
 *   initDb();
 */

import Database, { type Database as DatabaseType } from "better-sqlite3";
import path from "path";

// ============================================================
// 校徽图片 code
// DB 的 raw_json 中有 zs_code 字段，是陽光高考平台的 5 位数字 code，
// 校徽图片 URL (t1.chei.com.cn) 依赖此 code。
// ============================================================

/** 根据院校名称获取校徽图片用的 5 位 code */
export function getImageCode(schoolIdOrName: number | string): string {
  const db = getDb();
  if (typeof schoolIdOrName === 'number') {
    const row = db.prepare(
      "SELECT json_extract(raw_json, '$.zs_code') as zs_code FROM school_details WHERE school_id = ?"
    ).get(schoolIdOrName) as { zs_code: string } | undefined;
    return row?.zs_code || "";
  }
  // 按名称查找
  const row = db.prepare(
    "SELECT json_extract(d.raw_json, '$.zs_code') as zs_code FROM schools s JOIN school_details d ON s.school_id = d.school_id WHERE s.name = ?"
  ).get(schoolIdOrName) as { zs_code: string } | undefined;
  return row?.zs_code || "";
}

// ============================================================
// Types
// ============================================================

/** list_v2.json 中的院校列表条目 */
export interface SchoolListEntry {
  school_id: number;
  name: string;
  f985: string;
  f211: string;
  province: string;
  city: string;
  qj: string;
  dual_class: string;
  nature: string;
  level: string;
  answer_url: string;
}

/** info.json 中的 detail 顶层结构（精简） */
export interface SchoolDetailRow {
  school_id: number;
  data_code: string;
  type: string;
  school_type: string;
  school_nature: string;
  belong: string;
  department: string;
  create_date: string;
  area: number;
  short_names: string;
  province_id: string;
  city_id: string;
  county_id: string;
  province_name: string;
  city_name: string;
  town_name: string;
  level_name: string;
  type_name: string;
  school_type_name: string;
  school_nature_name: string;
  dual_class_name: string;
  address: string;
  postcode: string;
  site: string;
  school_site: string;
  phone: string;
  email: string;
  school_email: string;
  motto: string;
  content: string;
  num_subject: string;
  num_master: string;
  num_doctor: string;
  num_academician: string;
  num_library: string;
  num_lab: string;
  recommend_master_rate: string;
  upgrading_rate: string;
  is_military: number;
  is_police_judicial: number;
  is_police_public: number;
  is_yikao: number;
  school_special_num: number;
  raw_json: string;
}

export interface SchoolRankingRow {
  school_id: number;
  rank_type: string;
  rank_value: string;
}

export interface SchoolLabelRow {
  school_id: number;
  name: string;
  key: string;
  value: string;
}

// ============================================================
// Singleton
// ============================================================

let _db: DatabaseType | null = null;

export function getDb(dbPath?: string): DatabaseType {
  if (!_db) {
    const resolved =
      dbPath || path.join(process.cwd(), "data", "schools", "gaokao-schools.db");
    _db = new Database(resolved);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
  }
  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

// ============================================================
// Schema init
// ============================================================

export function initDb(dbPath?: string): DatabaseType {
  const db = getDb(dbPath);

  db.exec(`
    -- 院校核心信息（来自 list_v2.json）
    CREATE TABLE IF NOT EXISTS schools (
        school_id       INTEGER PRIMARY KEY,
        name            TEXT NOT NULL,
        f985            TEXT,
        f211            TEXT,
        province        TEXT,
        city            TEXT,
        qj              TEXT,
        dual_class      TEXT,
        nature          TEXT,
        level           TEXT,
        answer_url      TEXT,
        data_fetched_at TEXT DEFAULT (datetime('now'))
    );

    -- 院校扩展详情（来自 info.json，提取关键字段）
    CREATE TABLE IF NOT EXISTS school_details (
        school_id            INTEGER PRIMARY KEY REFERENCES schools(school_id),
        data_code            TEXT,
        type                 TEXT,
        school_type          TEXT,
        school_nature        TEXT,
        belong               TEXT,
        department           TEXT,
        create_date          TEXT,
        area                 INTEGER,
        short_names          TEXT,
        province_id          TEXT,
        city_id              TEXT,
        county_id            TEXT,
        province_name        TEXT,
        city_name            TEXT,
        town_name            TEXT,
        level_name           TEXT,
        type_name            TEXT,
        school_type_name     TEXT,
        school_nature_name   TEXT,
        dual_class_name      TEXT,
        address              TEXT,
        postcode             TEXT,
        site                 TEXT,
        school_site          TEXT,
        phone                TEXT,
        email                TEXT,
        school_email         TEXT,
        motto                TEXT,
        content              TEXT,
        num_subject          TEXT,
        num_master           TEXT,
        num_doctor           TEXT,
        num_academician      TEXT,
        num_library          TEXT,
        num_lab              TEXT,
        recommend_master_rate TEXT,
        upgrading_rate       TEXT,
        is_military          INTEGER,
        is_police_judicial   INTEGER,
        is_police_public     INTEGER,
        is_yikao             INTEGER,
        school_special_num   INTEGER,
        raw_json             TEXT,
        data_fetched_at      TEXT DEFAULT (datetime('now'))
    );

    -- 排名信息
    CREATE TABLE IF NOT EXISTS school_rankings (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id   INTEGER REFERENCES schools(school_id),
        rank_type   TEXT NOT NULL,
        rank_value  TEXT NOT NULL,
        UNIQUE(school_id, rank_type)
    );

    -- 双一流建设学科
    CREATE TABLE IF NOT EXISTS school_dual_class (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id   INTEGER REFERENCES schools(school_id),
        class_name  TEXT NOT NULL
    );

    -- 特色专业
    CREATE TABLE IF NOT EXISTS school_special (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id         INTEGER REFERENCES schools(school_id),
        special_id        TEXT,
        special_name      TEXT NOT NULL,
        level_name        TEXT,
        nation_feature    TEXT,
        province_feature  TEXT,
        xueke_rank        TEXT,
        ruanke_rank       TEXT,
        ruanke_level      TEXT
    );

    -- 学科评估等级统计
    CREATE TABLE IF NOT EXISTS school_xueke_rank (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id   INTEGER REFERENCES schools(school_id),
        grade       TEXT NOT NULL,
        count       INTEGER NOT NULL
    );

    -- 硕博点 / 学科门类
    CREATE TABLE IF NOT EXISTS school_academic_points (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id   INTEGER REFERENCES schools(school_id),
        category    TEXT NOT NULL,
        name        TEXT NOT NULL,
        count       TEXT NOT NULL
    );

    -- 标签
    CREATE TABLE IF NOT EXISTS school_labels (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id   INTEGER REFERENCES schools(school_id),
        name        TEXT NOT NULL,
        key         TEXT NOT NULL,
        value       TEXT NOT NULL
    );

    -- 校区
    CREATE TABLE IF NOT EXISTS school_campuses (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id   INTEGER REFERENCES schools(school_id),
        campus_name TEXT NOT NULL
    );

    -- 校区 → 院系
    CREATE TABLE IF NOT EXISTS school_campus_departments (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        campus_id   INTEGER REFERENCES school_campuses(id),
        dept_name   TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_schools_province ON schools(province);
    CREATE INDEX IF NOT EXISTS idx_schools_nature   ON schools(nature);
    CREATE INDEX IF NOT EXISTS idx_schools_level    ON schools(level);
    CREATE INDEX IF NOT EXISTS idx_schools_f985     ON schools(f985);
    CREATE INDEX IF NOT EXISTS idx_schools_f211     ON schools(f211);
    CREATE INDEX IF NOT EXISTS idx_schools_dual     ON schools(dual_class);

    CREATE INDEX IF NOT EXISTS idx_sr_school_id   ON school_rankings(school_id);
    CREATE INDEX IF NOT EXISTS idx_sdc_school_id  ON school_dual_class(school_id);
    CREATE INDEX IF NOT EXISTS idx_ss_school_id   ON school_special(school_id);
    CREATE INDEX IF NOT EXISTS idx_sxr_school_id  ON school_xueke_rank(school_id);
    CREATE INDEX IF NOT EXISTS idx_sap_school_id  ON school_academic_points(school_id);
    CREATE INDEX IF NOT EXISTS idx_sl_school_id   ON school_labels(school_id);
  `);

  return db;
}

// ============================================================
// Import — list
// ============================================================

/** 将 list_v2.json 的 data 对象批量 upsert 到 schools 表 */
export function importSchoolList(listJson: {
  data: Record<string, {
    name: string;
    f985: string;
    f211: string;
    p: string;
    c: string;
    qj: string;
    dual_class: string;
    nature: string;
    level: string;
    answerurl: string;
  }>;
}): number {
  const db = getDb();
  initDb();

  const upsert = db.prepare(`
    INSERT INTO schools (school_id, name, f985, f211, province, city, qj, dual_class, nature, level, answer_url, data_fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(school_id) DO UPDATE SET
      name = excluded.name,
      f985 = excluded.f985,
      f211 = excluded.f211,
      province = excluded.province,
      city = excluded.city,
      qj = excluded.qj,
      dual_class = excluded.dual_class,
      nature = excluded.nature,
      level = excluded.level,
      answer_url = excluded.answer_url,
      data_fetched_at = datetime('now')
  `);

  let count = 0;
  const transaction = db.transaction(() => {
    for (const [schoolIdStr, item] of Object.entries(listJson.data)) {
      const schoolId = parseInt(schoolIdStr, 10);
      upsert.run(
        schoolId,
        item.name,
        item.f985,
        item.f211,
        item.p,
        item.c,
        item.qj,
        item.dual_class,
        item.nature,
        item.level,
        item.answerurl || ""
      );
      count++;
    }
  });

  transaction();
  return count;
}

// ============================================================
// Import — detail
// ============================================================

/** info.json 的完整顶层结构 */
export interface SchoolInfoJson {
  data: {
    school_id: string;
    data_code: string;
    name: string;
    type: string;
    school_type: string;
    school_nature: string;
    level: string;
    code_enroll: string;
    zs_code: string;
    belong: string;
    f985: string;
    f211: string;
    department: string;
    admissions: string;
    central: string;
    dual_class: string;
    is_seal: string;
    applied_grade: string;
    vocational: string;
    num_subject: string;
    num_master: string;
    num_doctor: string;
    num_academician: string;
    num_library: string;
    num_lab: string;
    province_id: string;
    city_id: string;
    county_id: string;
    is_ads: string;
    is_recruitment: string;
    create_date: string;
    area: number;
    old_name: string;
    is_fenxiao: string;
    status: string;
    ad_level: string;
    short: string;
    e_pc: string;
    e_app: string;
    ruanke_rank: string;
    single: string;
    doublehigh: string;
    wsl_rank: string;
    qs_rank: string;
    xyh_rank: string;
    is_sell: string;
    eol_rank: string;
    school_batch: string;
    us_rank: string;
    is_logo: string;
    num_master2: string;
    num_doctor2: string;
    ai_status: string;
    is_ads2: string;
    coop_money: string;
    bdold_name: string;
    college_employment: string;
    xyq_id: string;
    senior_status: string;
    senior_show: string;
    is_upgrade: string;
    view_total_show: string;
    gb_show: string;
    is_military_academy: number;
    is_police_judicial_academy: number;
    is_police_public_academy: number;
    is_medical_school: string;
    is_zw_coop: string;
    gbh_num: string;
    motto: string;
    upgrading_rate: string;
    upgrading_level: string;
    recommend_master_rate: string;
    recommend_master_level: number;
    is_show_xcxcode: number;
    level_name: string;
    type_name: string;
    school_type_name: string;
    school_nature_name: string;
    dual_class_name: string;
    qs_world: string;
    province_score_year: string;
    province_name: string;
    city_name: string;
    town_name: string;
    weiwangzhan: string;
    yjszs: string;
    xiaoyuan: string;
    email: string;
    school_email: string;
    address: string;
    postcode: string;
    site: string;
    school_site: string;
    phone: string;
    school_phone: string;
    miniprogram: string;
    content: string;
    is_video: number;
    school_special_num: number;
    gbh_url: string;
    is_yikao: number;
    is_international_undergraduate: number;
    is_evaluation: number;
    is_special_project: number;
    intro_img_url: string;
    nature_name: string;
    label_list: { name: string; key: string; value: string }[];
    attr_list: string[];
    master_arr: { name: string; num: string }[];
    doctor_arr: { name: string; num: string }[];
    subject_arr: { name: string; num: string }[];
    xueke_rank: Record<string, string>;
    dualclass: { id: string; school_id: string; class: string }[];
    special: {
      id: string;
      school_id: string;
      special_id: string;
      nation_feature: string;
      province_feature: string;
      is_important: string;
      limit_year: string;
      year: string;
      level3_weight: string;
      nation_first_class: string;
      xueke_rank: string;
      xueke_rank_score: string;
      ruanke_rank: string;
      ruanke_level: string;
      is_video: number;
      special_name: string;
      level_name: string;
    }[];
    fenxiao: {
      fx_name: string;
      yuanxi: { id: string; name: string }[];
    }[];
    rank: Record<string, string>;
    [key: string]: unknown;
  };
}

/** 将 info.json 的 detail 数据插入所有相关表 */
export function importSchoolDetail(info: SchoolInfoJson): void {
  const db = getDb();
  initDb();
  const d = info.data;
  const schoolId = parseInt(d.school_id, 10);

  // -- Detail row --
  const upsertDetail = db.prepare(`
    INSERT INTO school_details (
      school_id, data_code, type, school_type, school_nature, belong,
      department, create_date, area, short_names, province_id, city_id,
      county_id, province_name, city_name, town_name, level_name,
      type_name, school_type_name, school_nature_name, dual_class_name,
      address, postcode, site, school_site, phone, email, school_email,
      motto, content, num_subject, num_master, num_doctor,
      num_academician, num_library, num_lab, recommend_master_rate,
      upgrading_rate, is_military, is_police_judicial, is_police_public,
      is_yikao, school_special_num, raw_json, data_fetched_at
    ) VALUES (
      ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now')
    )
    ON CONFLICT(school_id) DO UPDATE SET
      data_code=excluded.data_code, type=excluded.type, school_type=excluded.school_type,
      school_nature=excluded.school_nature, belong=excluded.belong,
      department=excluded.department, create_date=excluded.create_date,
      area=excluded.area, short_names=excluded.short_names,
      province_id=excluded.province_id, city_id=excluded.city_id,
      county_id=excluded.county_id, province_name=excluded.province_name,
      city_name=excluded.city_name, town_name=excluded.town_name,
      level_name=excluded.level_name, type_name=excluded.type_name,
      school_type_name=excluded.school_type_name,
      school_nature_name=excluded.school_nature_name,
      dual_class_name=excluded.dual_class_name, address=excluded.address,
      postcode=excluded.postcode, site=excluded.site, school_site=excluded.school_site,
      phone=excluded.phone, email=excluded.email, school_email=excluded.school_email,
      motto=excluded.motto, content=excluded.content,
      num_subject=excluded.num_subject, num_master=excluded.num_master,
      num_doctor=excluded.num_doctor, num_academician=excluded.num_academician,
      num_library=excluded.num_library, num_lab=excluded.num_lab,
      recommend_master_rate=excluded.recommend_master_rate,
      upgrading_rate=excluded.upgrading_rate,
      is_military=excluded.is_military, is_police_judicial=excluded.is_police_judicial,
      is_police_public=excluded.is_police_public, is_yikao=excluded.is_yikao,
      school_special_num=excluded.school_special_num, raw_json=excluded.raw_json,
      data_fetched_at=datetime('now')
  `);

  // -- Rankings --
  const delRankings = db.prepare("DELETE FROM school_rankings WHERE school_id = ?");
  const insRanking = db.prepare(
    "INSERT OR REPLACE INTO school_rankings (school_id, rank_type, rank_value) VALUES (?, ?, ?)"
  );

  // -- Dual class --
  const delDualClass = db.prepare("DELETE FROM school_dual_class WHERE school_id = ?");
  const insDualClass = db.prepare(
    "INSERT INTO school_dual_class (school_id, class_name) VALUES (?, ?)"
  );

  // -- Special --
  const delSpecial = db.prepare("DELETE FROM school_special WHERE school_id = ?");
  const insSpecial = db.prepare(`
    INSERT INTO school_special (school_id, special_id, special_name, level_name, nation_feature, province_feature, xueke_rank, ruanke_rank, ruanke_level)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // -- Xueke rank --
  const delXuekeRank = db.prepare("DELETE FROM school_xueke_rank WHERE school_id = ?");
  const insXuekeRank = db.prepare(
    "INSERT INTO school_xueke_rank (school_id, grade, count) VALUES (?, ?, ?)"
  );

  // -- Academic points --
  const delAcademicPoints = db.prepare("DELETE FROM school_academic_points WHERE school_id = ?");
  const insAcademicPoint = db.prepare(
    "INSERT INTO school_academic_points (school_id, category, name, count) VALUES (?, ?, ?, ?)"
  );

  // -- Labels --
  const delLabels = db.prepare("DELETE FROM school_labels WHERE school_id = ?");
  const insLabel = db.prepare(
    "INSERT INTO school_labels (school_id, name, key, value) VALUES (?, ?, ?, ?)"
  );

  // -- Campuses --
  const delCampuses = db.prepare("DELETE FROM school_campuses WHERE school_id = ?");
  const insCampus = db.prepare(
    "INSERT INTO school_campuses (school_id, campus_name) VALUES (?, ?)"
  );
  const insDept = db.prepare(
    "INSERT INTO school_campus_departments (campus_id, dept_name) VALUES (?, ?)"
  );

  const transaction = db.transaction(() => {
    // 1. Detail
    const rawJson = JSON.stringify(d);
    upsertDetail.run(
      schoolId,
      d.data_code || "",
      d.type || "",
      d.school_type || "",
      d.school_nature || "",
      d.belong || "",
      d.department || "",
      d.create_date || "",
      d.area ?? 0,
      d.short || "",
      d.province_id || "",
      d.city_id || "",
      d.county_id || "",
      d.province_name || "",
      d.city_name || "",
      d.town_name || "",
      d.level_name || "",
      d.type_name || "",
      d.school_type_name || "",
      d.school_nature_name || "",
      d.dual_class_name || "",
      d.address || "",
      d.postcode || "",
      d.site || "",
      d.school_site || "",
      d.phone || "",
      d.email || "",
      d.school_email || "",
      d.motto || "",
      d.content || "",
      d.num_subject || "",
      d.num_master || "",
      d.num_doctor || "",
      d.num_academician || "",
      d.num_library || "",
      d.num_lab || "",
      d.recommend_master_rate || "",
      d.upgrading_rate || "",
      d.is_military_academy ?? 0,
      d.is_police_judicial_academy ?? 0,
      d.is_police_public_academy ?? 0,
      d.is_yikao ?? 0,
      d.school_special_num ?? 0,
      rawJson
    );

    // 2. Rankings — extract only non-zero values from rank object
    delRankings.run(schoolId);
    if (d.rank) {
      for (const [key, val] of Object.entries(d.rank)) {
        if (val && val !== "0" && val !== "0.00") {
          insRanking.run(schoolId, key, val);
        }
      }
    }

    // 3. Dual class
    delDualClass.run(schoolId);
    if (d.dualclass) {
      for (const dc of d.dualclass) {
        insDualClass.run(schoolId, dc.class);
      }
    }

    // 4. Special
    delSpecial.run(schoolId);
    if (d.special) {
      for (const sp of d.special) {
        insSpecial.run(
          schoolId,
          sp.special_id || "",
          sp.special_name || "",
          sp.level_name || "",
          sp.nation_feature || "",
          sp.province_feature || "",
          sp.xueke_rank || "",
          sp.ruanke_rank || "",
          sp.ruanke_level || ""
        );
      }
    }

    // 5. Xueke rank
    delXuekeRank.run(schoolId);
    if (d.xueke_rank) {
      for (const [grade, count] of Object.entries(d.xueke_rank)) {
        const cnt = parseInt(count, 10);
        if (cnt > 0) {
          insXuekeRank.run(schoolId, grade, cnt);
        }
      }
    }

    // 6. Academic points (master + doctor + subject)
    delAcademicPoints.run(schoolId);
    const academicEntries: { category: string; items: { name: string; num: string }[] }[] = [
      { category: "master", items: d.master_arr || [] },
      { category: "doctor", items: d.doctor_arr || [] },
      { category: "subject", items: d.subject_arr || [] },
    ];
    for (const { category, items } of academicEntries) {
      for (const item of items) {
        insAcademicPoint.run(schoolId, category, item.name, item.num);
      }
    }

    // 7. Labels
    delLabels.run(schoolId);
    if (d.label_list) {
      for (const lbl of d.label_list) {
        insLabel.run(schoolId, lbl.name || "", lbl.key || "", lbl.value || "");
      }
    }

    // 8. Campuses & departments
    delCampuses.run(schoolId);
    if (d.fenxiao) {
      for (const fx of d.fenxiao) {
        const result = insCampus.run(schoolId, fx.fx_name || "");
        const campusId = Number(result.lastInsertRowid);
        if (fx.yuanxi) {
          for (const dept of fx.yuanxi) {
            insDept.run(campusId, dept.name || "");
          }
        }
      }
    }
  });

  transaction();
}

// ============================================================
// Query
// ============================================================

/** 查询所有院校（分页） */
export function listSchools(params?: {
  province?: string;
  level?: string;
  nature?: string;
  is985?: boolean;
  is211?: boolean;
  isDualClass?: boolean;
  keyword?: string;
  limit?: number;
  offset?: number;
}): { schools: SchoolListEntry[]; total: number } {
  const db = getDb();
  initDb();

  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (params?.province) { conditions.push("province = ?"); args.push(params.province); }
  if (params?.level) { conditions.push("level = ?"); args.push(params.level); }
  if (params?.nature) { conditions.push("nature = ?"); args.push(params.nature); }
  if (params?.is985) { conditions.push("f985 = '1'"); }
  if (params?.is211) { conditions.push("f211 = '1'"); }
  if (params?.isDualClass) { conditions.push("dual_class = '1'"); }
  if (params?.keyword) {
    conditions.push("name LIKE ?");
    args.push(`%${params.keyword}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;

  const totalRow = db.prepare(`SELECT COUNT(*) as cnt FROM schools ${where}`).get(...args) as { cnt: number };
  const schools = db
    .prepare(`SELECT * FROM schools ${where} ORDER BY school_id LIMIT ? OFFSET ?`)
    .all(...args, limit, offset) as SchoolListEntry[];

  return { schools, total: totalRow.cnt };
}

/** 查询单个院校完整信息 */
export function getSchoolById(schoolId: number): {
  school: SchoolListEntry | null;
  detail: SchoolDetailRow | null;
  rankings: SchoolRankingRow[];
  dualClass: { class_name: string }[];
  specials: {
    special_name: string;
    level_name: string;
    nation_feature: string;
    province_feature: string;
    xueke_rank: string;
    ruanke_rank: string;
    ruanke_level: string;
  }[];
  xuekeRanks: { grade: string; count: number }[];
  academicPoints: { category: string; name: string; count: string }[];
  labels: SchoolLabelRow[];
  campuses: { campus_name: string; departments: string[] }[];
} {
  const db = getDb();
  initDb();

  const school = db.prepare("SELECT * FROM schools WHERE school_id = ?").get(schoolId) as SchoolListEntry | undefined;
  const detail = db.prepare("SELECT * FROM school_details WHERE school_id = ?").get(schoolId) as SchoolDetailRow | undefined;
  const rankings = db.prepare("SELECT * FROM school_rankings WHERE school_id = ?").all(schoolId) as SchoolRankingRow[];
  const dualClass = db.prepare("SELECT class_name FROM school_dual_class WHERE school_id = ?").all(schoolId) as { class_name: string }[];
  const specials = db.prepare(
    "SELECT special_name, level_name, nation_feature, province_feature, xueke_rank, ruanke_rank, ruanke_level FROM school_special WHERE school_id = ?"
  ).all(schoolId) as {
    special_name: string;
    level_name: string;
    nation_feature: string;
    province_feature: string;
    xueke_rank: string;
    ruanke_rank: string;
    ruanke_level: string;
  }[];
  const xuekeRanks = db.prepare("SELECT grade, count FROM school_xueke_rank WHERE school_id = ? ORDER BY grade").all(schoolId) as { grade: string; count: number }[];
  const academicPoints = db.prepare("SELECT category, name, count FROM school_academic_points WHERE school_id = ?").all(schoolId) as { category: string; name: string; count: string }[];
  const labels = db.prepare("SELECT * FROM school_labels WHERE school_id = ?").all(schoolId) as SchoolLabelRow[];

  const campusRows = db.prepare("SELECT id, campus_name FROM school_campuses WHERE school_id = ?").all(schoolId) as { id: number; campus_name: string }[];
  const campuses = campusRows.map((c) => {
    const depts = db.prepare("SELECT dept_name FROM school_campus_departments WHERE campus_id = ?").all(c.id) as { dept_name: string }[];
    return { campus_name: c.campus_name, departments: depts.map((d) => d.dept_name) };
  });

  return {
    school: school || null,
    detail: detail || null,
    rankings,
    dualClass,
    specials,
    xuekeRanks,
    academicPoints,
    labels,
    campuses,
  };
}

/** 检查某院校详情是否已导入 */
export function isDetailImported(schoolId: number): boolean {
  const db = getDb();
  const row = db.prepare("SELECT 1 FROM school_details WHERE school_id = ?").get(schoolId);
  return !!row;
}

/** 获取院校总数 */
export function getSchoolCount(): number {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as cnt FROM schools").get() as { cnt: number };
  return row.cnt;
}

// ============================================================
// 院校库查询（带筛选、排序、分页）
// ============================================================

/** 用于前端院校列表的搜索结果类型 */
export interface SchoolSearchResult {
  code: string;           // school_id 转字符串，用于路由
  name: string;
  location: string;       // province
  city: string;
  level: string;          // 映射后：本科 / 高职(专科)
  tier: string;           // 从 labels 聚合
  type: string;           // type_name
  authority: string;      // belong
  address: string;
  phone: string;
  officialWebsite: string; // school_site
  admissionWebsite: string; // site
  imageCode: string;       // 校徽图片用的 5 位 code（陽光高考平台）
  f985: string;
  f211: string;
  dualClass: string;
}

export interface SearchSchoolsParams {
  keyword?: string;
  province?: string;
  level?: string;          // "本科" / "高职(专科)" / "all"
  tier?: string;           // "985" / "211" / "双一流"
  sort?: string;           // tier_desc / name_asc
  page?: number;
  pageSize?: number;
}

export interface SearchSchoolsResult {
  schools: SchoolSearchResult[];
  total: number;
  provinces: string[];
  tiers: string[];
}

/** 层级映射：DB → 前端 */
function mapLevel(dbLevel: string): string {
  if (dbLevel === "普通本科") return "本科";
  if (dbLevel === "专科（高职）") return "高职(专科)";
  return dbLevel;
}

/** 反向层级映射：前端 → DB */
function reverseLevel(frontendLevel: string): string {
  if (frontendLevel === "本科") return "普通本科";
  if (frontendLevel === "高职(专科)") return "专科（高职）";
  return frontendLevel;
}

/** 搜索院校（支持筛选、排序、分页） */
export function searchSchools(params: SearchSchoolsParams = {}): SearchSchoolsResult {
  const db = getDb();
  initDb();

  const {
    keyword,
    province,
    level,
    tier,
    sort,
    page = 1,
    pageSize = 50,
  } = params;

  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (keyword) {
    conditions.push("(s.name LIKE ? OR s.province LIKE ? OR s.city LIKE ?)");
    const kw = `%${keyword}%`;
    args.push(kw, kw, kw);
  }

  if (province) {
    conditions.push("s.province = ?");
    args.push(province);
  }

  if (level && level !== "all") {
    const dbLevel = reverseLevel(level);
    conditions.push("s.level = ?");
    args.push(dbLevel);
  }

  if (tier) {
    if (tier === "985") {
      conditions.push("s.f985 = '1'");
    } else if (tier === "211") {
      conditions.push("s.f211 = '1'");
    } else if (tier === "双一流") {
      conditions.push("s.dual_class = '1'");
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // 排序
  let orderClause = "ORDER BY s.school_id";
  if (sort === "tier_desc") {
    // 按层次权重降序: 985 > 211 > 双一流 > 其他
    orderClause = `ORDER BY
      CASE WHEN s.f985='1' THEN 3 WHEN s.f211='1' THEN 2 WHEN s.dual_class='1' THEN 1 ELSE 0 END DESC,
      s.school_id`;
  } else if (sort === "name_asc") {
    orderClause = "ORDER BY s.name ASC";
  }

  const offset = (page - 1) * pageSize;
  const limit = pageSize;

  // 获取总数
  const totalRow = db.prepare(
    `SELECT COUNT(*) as cnt FROM schools s ${where}`
  ).get(...args) as { cnt: number };

  // 获取学校列表（join with school_details to get type, belong, etc.）
  const rows = db.prepare(`
    SELECT
      s.school_id, s.name, s.province, s.city, s.level,
      s.f985, s.f211, s.dual_class,
      d.type_name, d.belong, d.address, d.phone, d.school_site, d.site,
      json_extract(d.raw_json, '$.zs_code') as zs_code
    FROM schools s
    LEFT JOIN school_details d ON s.school_id = d.school_id
    ${where}
    ${orderClause}
    LIMIT ? OFFSET ?
  `).all(...args, limit, offset) as {
    school_id: number; name: string; province: string; city: string; level: string;
    f985: string; f211: string; dual_class: string;
    type_name: string | null; belong: string | null;
    address: string | null; phone: string | null;
    school_site: string | null; site: string | null;
    zs_code: string | null;
  }[];

  // 获取所有院校的 labels（用于构建 tier 字符串）
  const schoolIds = rows.map(r => r.school_id);
  let labelsMap: Record<number, string[]> = {};

  if (schoolIds.length > 0) {
    const placeholders = schoolIds.map(() => "?").join(",");
    const labelRows = db.prepare(
      `SELECT school_id, name FROM school_labels WHERE school_id IN (${placeholders}) AND key IN ('f985','f211','is_dual_class')`
    ).all(...schoolIds) as { school_id: number; name: string }[];
    for (const lr of labelRows) {
      if (!labelsMap[lr.school_id]) labelsMap[lr.school_id] = [];
      labelsMap[lr.school_id].push(lr.name);
    }
  }

  const schools: SchoolSearchResult[] = rows.map(r => {
    let tierStr = labelsMap[r.school_id]?.join(" ") || "";
    // 如果没有 label 但有 flag，手动补充
    if (!tierStr) {
      const parts: string[] = [];
      if (r.f985 === "1") parts.push("985");
      if (r.f211 === "1") parts.push("211");
      if (r.dual_class === "1") parts.push("双一流");
      tierStr = parts.join(" ");
    }
    return {
      code: String(r.school_id),
      name: r.name,
      location: r.province,
      city: r.city,
      level: mapLevel(r.level),
      tier: tierStr,
      type: r.type_name || "",
      authority: r.belong || "",
      address: r.address || "",
      phone: r.phone || "",
      officialWebsite: r.school_site || "",
      admissionWebsite: r.site || "",
      imageCode: r.zs_code || "",
      f985: r.f985,
      f211: r.f211,
      dualClass: r.dual_class,
    };
  });

  return { schools, total: totalRow.cnt, provinces: [], tiers: [] };
}

/** 获取所有省份列表 */
export function getAllProvinces(): string[] {
  const db = getDb();
  const rows = db.prepare("SELECT DISTINCT province FROM schools WHERE province != '' ORDER BY province").all() as { province: string }[];
  return rows.map(r => r.province);
}

/** 获取所有可选层级标签 */
export function getAllTiersList(): string[] {
  return ["985", "211", "双一流"];
}
