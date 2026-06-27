/**
 * 录取分数数据导入脚本
 *
 * 从 gaokao.cn 静态 API 获取所有院校在河北省的录取分数，存入 SQLite。
 * 使用 INSERT OR IGNORE 处理 API 层面的重复数据。
 *
 * 用法:
 *   pnpm tsx scripts/import-scores.ts
 *
 * 数据来源:
 *   https://static-data.gaokao.cn/www/2.0/schoolspecialscore/{school_id}/{year}/13.json
 */

import Database from "better-sqlite3";
import path from "path";

const PROVINCE_CODE = "13"; // 河北
const YEARS = [2025, 2024, 2023];
const API_URL = (schoolId: number, year: number) =>
  `https://static-data.gaokao.cn/www/2.0/schoolspecialscore/${schoolId}/${year}/${PROVINCE_CODE}.json`;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

const BATCH_NAMES: Record<string, string> = {
  "14": "本科批", "36": "本科提前批A段", "37": "本科提前批B段",
  "86": "本科提前批C段", "10": "专科批", "11": "专科提前批",
};
const CAT_NAMES: Record<string, string> = {
  "2073": "物理类", "2074": "历史类",
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function batchName(code: string, fallback: string): string {
  return BATCH_NAMES[code] || fallback || code;
}
function catName(code: string): string {
  return CAT_NAMES[code] || code;
}

async function main() {
  const startTime = Date.now();

  const dbPath = path.join(process.cwd(), "data", "河北", "admission", "gaokao-admission.db");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  // 确保表存在（无 UNIQUE 约束）
  db.exec(`
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

    CREATE INDEX IF NOT EXISTS idx_as_school_year ON admission_scores(school_id, year);
    CREATE INDEX IF NOT EXISTS idx_as_min_section ON admission_scores(min_section);
    CREATE INDEX IF NOT EXISTS idx_as_special_id ON admission_scores(special_id);
  `);

  // 编译 insert
  const delExisting = db.prepare(
    "DELETE FROM admission_scores WHERE school_id = ? AND year = ? AND province_code = ?"
  );
  const insertScore = db.prepare(`
    INSERT INTO admission_scores (
      school_id, special_id, year, province_code,
      batch_code, batch_name, category_code, category_name,
      spname, sp_name, level1_name, level2_name, level3_name,
      min_score, max_score, avg_score, min_section, diff, lq_num,
      is_score_range, zslx_name, info, remark, data_fetched_at
    ) VALUES (
      ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,
      ?,?,?,?,datetime('now')
    )
  `);

  // 加载院校列表
  const srcdb = new Database(path.join(process.cwd(), "data", "schools", "gaokao-schools.db"), { readonly: true });
  const schools = srcdb
    .prepare("SELECT school_id, name FROM schools ORDER BY school_id")
    .all() as { school_id: number; name: string }[];
  srcdb.close();

  // 统计已导入
  let alreadyDone = 0;
  for (const s of schools) {
    for (const y of YEARS) {
      const row = db
        .prepare("SELECT 1 FROM admission_scores WHERE school_id = ? AND year = ? LIMIT 1")
        .get(s.school_id, y);
      if (row) alreadyDone++;
    }
  }
  const totalCombos = schools.length * YEARS.length;

  console.log(`院校总数: ${schools.length}`);
  console.log(`目标年份: ${YEARS.join(", ")}`);
  console.log(`已导入: ${alreadyDone} / ${totalCombos}`);
  console.log(`待导入: ${totalCombos - alreadyDone}\n`);

  let doneCount = alreadyDone;
  let successCount = 0;
  let failCount = 0;

  for (const { school_id: schoolId } of schools) {
    for (const year of YEARS) {
      const already = db
        .prepare("SELECT 1 FROM admission_scores WHERE school_id = ? AND year = ? LIMIT 1")
        .get(schoolId, year);
      if (already) continue;

      try {
        const res = await fetch(API_URL(schoolId, year), {
          headers: { "User-Agent": UA },
        });

        if (!res.ok) { failCount++; doneCount++; continue; }

        const json = await res.json();
        if (json.code !== "0000" || !json.data) { failCount++; doneCount++; continue; }

        const transaction = db.transaction(() => {
          delExisting.run(schoolId, year, PROVINCE_CODE);
          // 用于 API 内部去重
          const seen = new Set<string>();

          for (const [groupKey, group] of Object.entries(json.data) as [string, any][]) {
            if (!group.item?.length) continue;

            const parts = groupKey.split("_");
            const catCode = parts[0] || "";
            const batCode = parts[1] || "";

            for (const item of group.item) {
              // API 去重：按 (special_id, batch, type, zslx_name) 去重
              // 同一个 special_id 可能对应多个不同招生类型（如普通类 vs 中外合作），
              // 只有 key 完全相同的才是真重复（API 的 bug）
              const dedupKey = `${item.special_id}_${batCode}_${catCode}_${item.zslx_name || ''}_${item.info || ''}`;
              if (seen.has(dedupKey)) continue;
              seen.add(dedupKey);

              const lqNum =
                item.lq_num && item.lq_num !== "-" ? parseInt(item.lq_num, 10) : null;
              const diffVal = typeof item.diff === "number" ? item.diff : -1;

              insertScore.run(
                parseInt(item.school_id, 10) || schoolId,
                parseInt(item.special_id, 10) || 0,
                year,
                PROVINCE_CODE,
                batCode,
                batchName(batCode, item.local_batch_name),
                catCode,
                catName(catCode),
                item.spname || "",
                item.sp_name || "",
                item.level1_name || "",
                item.level2_name || "",
                item.level3_name || "",
                item.min ?? 0,
                item.max ?? 0,
                item.average ?? 0,
                parseInt(item.min_section, 10) || 0,
                diffVal,
                lqNum,
                item.is_score_range === "1" ? 1 : 0,
                item.zslx_name || "",
                item.info || "",
                item.remark || ""
              );
            }
          }
        });

        transaction();
        successCount++;
        doneCount++;

        if (doneCount % 100 === 0 || doneCount === totalCombos) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
          const pct = ((doneCount / totalCombos) * 100).toFixed(1);
          process.stdout.write(
            `\r  [${doneCount}/${totalCombos}] ${pct}% — ${elapsed}s (${successCount} ok, ${failCount} fail)`
          );
        }

        await sleep(200);
      } catch (err) {
        failCount++;
        doneCount++;
      }
    }
  }

  console.log("\n\n=== 导入完成 ===");
  const byYear = db
    .prepare("SELECT year, COUNT(*) as cnt, COUNT(DISTINCT school_id) as schools FROM admission_scores GROUP BY year ORDER BY year DESC")
    .all() as { year: number; cnt: number; schools: number }[];
  for (const y of byYear) {
    console.log(`  ${y.year}年: ${y.cnt} 条 / ${y.schools} 所院校`);
  }
  const total = db.prepare("SELECT COUNT(*) as cnt FROM admission_scores").get() as { cnt: number };
  console.log(`  总计: ${total.cnt} 条`);
  console.log(`  耗时: ${((Date.now() - startTime) / 1000 / 60).toFixed(1)} 分钟`);

  db.close();
}

main().catch((err) => {
  console.error("导入脚本出错:", err);
  process.exit(1);
});
