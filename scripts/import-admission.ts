/**
 * 招生数据导入脚本（招生计划 + 专业分数线）
 *
 * 从 gaokao.cn 静态 API 获取所有院校在河北省近 3 年的招生计划和专业分数线，
 * 存入 SQLite (gaokao-admission.db)。
 *
 * 用法:
 *   pnpm import:admission              # 导入全部（计划 + 分数线）
 *   pnpm import:admission --plans      # 仅导入招生计划
 *   pnpm import:admission --scores     # 仅导入专业分数线
 *
 * 数据来源:
 *   https://static-data.gaokao.cn/www/2.0/schoolspecialplan/{school_id}/{year}/13.json
 *   https://static-data.gaokao.cn/www/2.0/schoolspecialscore/{school_id}/{year}/13.json
 */

import {
  initDb,
  importAdmissionPlans,
  importAdmissionScores,
  logImportFailure,
  isPlanImported,
  isScoreImported,
  getImportStats,
} from "../src/lib/db/gaokao-admission";
import { getDb as getSchoolsDb } from "../src/lib/db/gaokao-schools";

const PROVINCE_CODE = "13"; // 河北
const YEARS = [2023]; // 招生计划年份
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---- CLI 参数 ----
const args = process.argv.slice(2);
const MODE_PLANS = args.includes("--plans");
const MODE_SCORES = args.includes("--scores");
const MODE_ALL = !MODE_PLANS && !MODE_SCORES;
const DO_PLANS = MODE_ALL || MODE_PLANS;
const DO_SCORES = MODE_ALL || MODE_SCORES;

// ---- 加载院校列表 ----
function loadSchools(): { school_id: number; name: string }[] {
  const schoolsDb = getSchoolsDb();
  return schoolsDb
    .prepare("SELECT school_id, name FROM schools ORDER BY school_id")
    .all() as { school_id: number; name: string }[];
}

// ---- 通用导入逻辑 ----
async function runImport(
  label: string,
  apiUrlFn: (schoolId: number, year: number) => string,
  importFn: (schoolId: number, year: number, provinceCode: string, data: any) => number,
  isDoneFn: (schoolId: number, year: number, provinceCode: string) => boolean
) {
  const startTime = Date.now();
  const schools = loadSchools();
  const totalCombos = schools.length * YEARS.length;

  let alreadyDone = 0;
  for (const s of schools) {
    for (const y of YEARS) {
      if (isDoneFn(s.school_id, y, PROVINCE_CODE)) alreadyDone++;
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`=== ${label} ===`);
  console.log(`  院校总数: ${schools.length}`);
  console.log(`  目标年份: ${YEARS.join(", ")}`);
  console.log(`  已导入: ${alreadyDone} / ${totalCombos}`);
  console.log(`  待导入: ${totalCombos - alreadyDone}`);
  console.log(`${"=".repeat(60)}\n`);

  let doneCount = alreadyDone;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < schools.length; i++) {
    const { school_id: schoolId } = schools[i];

    for (const year of YEARS) {
      if (isDoneFn(schoolId, year, PROVINCE_CODE)) continue;

      try {
        const res = await fetch(apiUrlFn(schoolId, year), {
          headers: { "User-Agent": UA },
        });

        if (!res.ok) {
          logImportFailure(schoolId, year, PROVINCE_CODE, `HTTP ${res.status}`);
          failCount++;
          doneCount++;
          continue;
        }

        const json = await res.json();

        if (json.code === "0000" && json.data) {
          importFn(schoolId, year, PROVINCE_CODE, json);
          successCount++;
        }
        doneCount++;

        if (doneCount % 100 === 0 || doneCount === totalCombos) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
          const pct = ((doneCount / totalCombos) * 100).toFixed(1);
          process.stdout.write(
            `\r  [${doneCount}/${totalCombos}] ${pct}% — ${elapsed}s (${successCount} ok, ${failCount} fail)\n`
          );
        }

        await sleep(200);
      } catch (err) {
        logImportFailure(schoolId, year, PROVINCE_CODE, (err as Error).message);
        failCount++;
        doneCount++;

        if (doneCount % 100 === 0 || doneCount === totalCombos) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
          const pct = ((doneCount / totalCombos) * 100).toFixed(1);
          process.stdout.write(
            `\r  [${doneCount}/${totalCombos}] ${pct}% — ${elapsed}s (${successCount} ok, ${failCount} fail)\n`
          );
        }
      }
    }
  }

  console.log("\n");
}

async function main() {
  const startTime = Date.now();

  console.log("初始化数据库...");
  initDb();

  // ========== 招生计划 ==========
  if (DO_PLANS) {
    await runImport(
      "招生计划",
      (id, year) =>
        `https://static-data.gaokao.cn/www/2.0/schoolspecialplan/${id}/${year}/${PROVINCE_CODE}.json`,
      importAdmissionPlans,
      isPlanImported
    );
  }

  // ========== 专业分数线 ==========
  if (DO_SCORES) {
    await runImport(
      "专业分数线",
      (id, year) =>
        `https://static-data.gaokao.cn/www/2.0/schoolspecialscore/${id}/${year}/${PROVINCE_CODE}.json`,
      importAdmissionScores,
      isScoreImported
    );
  }

  // ========== Summary ==========
  const stats = getImportStats();
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log("=== 导入完成 ===");
  console.log(`  院校覆盖:      ${stats.totalSchools}`);
  console.log(`  招生计划:      ${stats.planEntries} 条`);
  console.log(`  专业分数线:    ${stats.scoreEntries} 条`);
  for (const y of stats.byYear) {
    console.log(`  ${y.year}年:        ${y.plans} 条计划 / ${y.scores} 条分数线 / ${y.schools} 所院校`);
  }
  console.log(`  耗时:          ${elapsed} 分钟`);
}

main().catch((err) => {
  console.error("导入脚本出错:", err);
  process.exit(1);
});
