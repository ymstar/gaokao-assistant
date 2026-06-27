/**
 * 院校数据导入脚本
 *
 * 从 gaokao.cn 静态 API 获取院校列表和详情，存入 SQLite。
 *
 * 用法:
 *   pnpm import:schools
 *
 * 数据来源:
 *   - 列表: https://static-data.gaokao.cn/www/2.0/school/list_v2.json
 *   - 详情: https://static-data.gaokao.cn/www/2.0/school/{id}/info.json?a=www.gaokao.cn
 */

import {
  getDb,
  initDb,
  closeDb,
  importSchoolList,
  importSchoolDetail,
  isDetailImported,
  getSchoolCount,
} from "../src/lib/db/gaokao-schools";

const LIST_URL = "https://static-data.gaokao.cn/www/2.0/school/list_v2.json";
const INFO_URL = (id: number | string) =>
  `https://static-data.gaokao.cn/www/2.0/school/${id}/info.json?a=www.gaokao.cn`;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const startTime = Date.now();

  // Init DB
  console.log("初始化数据库...");
  initDb();
  console.log(`  数据库路径: data/schools/gaokao-schools.db\n`);

  // ========== PHASE 1: Fetch list ==========
  console.log("=== Phase 1: 获取院校列表 ===");
  console.log(`  GET ${LIST_URL}`);

  const listRes = await fetch(LIST_URL, { headers: { "User-Agent": UA } });
  if (!listRes.ok) {
    throw new Error(`获取列表失败: HTTP ${listRes.status}`);
  }
  const listJson = await listRes.json();
  const schoolCount = Object.keys(listJson.data).length;
  console.log(`  获取到 ${schoolCount} 所院校\n`);

  // Import list
  console.log("写入院校基础信息到 SQLite...");
  const imported = importSchoolList(listJson);
  console.log(`  已写入 ${imported} 条\n`);

  // ========== PHASE 2: Fetch details ==========
  console.log("=== Phase 2: 获取院校详情 ===");

  const schoolIds = Object.keys(listJson.data).map(Number);
  let detailDone = 0;
  let detailSkipped = 0;
  let detailFailed = 0;

  for (const schoolId of schoolIds) {
    // 断点续传：如果详情已存在则跳过
    if (isDetailImported(schoolId)) {
      detailSkipped++;
      detailDone++;
      if (detailDone % 20 === 0 || detailDone === schoolCount) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        process.stdout.write(
          `\r  [${detailDone}/${schoolCount}] ${elapsed}s elapsed (${detailSkipped} skipped, ${detailFailed} failed)`
        );
      }
      continue;
    }

    try {
      const res = await fetch(INFO_URL(schoolId), {
        headers: { "User-Agent": UA },
      });
      if (!res.ok) {
        console.error(`\n  ❌ 院校 ${schoolId} 请求失败: HTTP ${res.status}`);
        detailFailed++;
        detailDone++;
        continue;
      }

      const infoJson = await res.json();
      if (infoJson.code !== "0000") {
        console.error(
          `\n  ❌ 院校 ${schoolId} API 返回错误: ${infoJson.message}`
        );
        detailFailed++;
        detailDone++;
        continue;
      }

      importSchoolDetail(infoJson);
      detailDone++;

      if (detailDone % 20 === 0 || detailDone === schoolCount) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        process.stdout.write(
          `\r  [${detailDone}/${schoolCount}] ${elapsed}s elapsed (${detailSkipped} skipped, ${detailFailed} failed)`
        );
      }

      // Rate limit
      await sleep(200);
    } catch (err) {
      console.error(
        `\n  ❌ 院校 ${schoolId} 异常: ${(err as Error).message}`
      );
      detailFailed++;
      detailDone++;
    }
  }

  console.log("\n");

  // ========== Summary ==========
  const totalSchools = getSchoolCount();
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log("=== 导入完成 ===");
  console.log(`  院校总数:      ${totalSchools}`);
  console.log(`  详情已导入:    ${detailDone - detailSkipped}`);
  console.log(`  跳过(已有):    ${detailSkipped}`);
  console.log(`  失败:          ${detailFailed}`);
  console.log(`  耗时:          ${elapsed} 分钟`);

  closeDb();
}

main().catch((err) => {
  console.error("导入脚本出错:", err);
  closeDb();
  process.exit(1);
});
