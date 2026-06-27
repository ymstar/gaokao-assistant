#!/usr/bin/env tsx
/**
 * 阳光高考平台 (gaokao.cn) 一分一档数据爬取工具
 *
 * 数据源: https://static-data.gaokao.cn/www/2.0/section2021
 *
 * 用法:
 *   # 导入 2026 河北物理类本科批
 *   pnpm tsx scripts/scrape-gaokao-section.ts --year 2026 --province 13 --category 2073 --batch 3
 *
 *   # 导入 2026 河北物理类所有批次 (本科+专科+综合)
 *   pnpm tsx scripts/scrape-gaokao-section.ts --year 2026 --province 13 --category 2073 --all-batches
 *
 *   # 导入河北全部年份 × 全部类别 × 全部批次 (慎用, 约 48 次请求)
 *   pnpm tsx scripts/scrape-gaokao-section.ts --province 13 --all
 *
 *   # 预览 (不写库)
 *   pnpm tsx scripts/scrape-gaokao-section.ts --year 2026 --province 13 --category 2073 --batch 3 --dry-run
 *
 *   # 从 SQLite 导出 JSON
 *   pnpm tsx scripts/scrape-gaokao-section.ts --export-json --year 2026 --province 13 --category 2073 --batch 3
 *
 *   # 查看已导入记录
 *   pnpm tsx scripts/scrape-gaokao-section.ts --list
 */

import { promises as fs } from "fs";
import path from "path";
import {
  getDb,
  initDb,
  closeDb,
  importScoreRank,
  isAlreadyImported,
  listImportLogs,
  exportToJson,
} from "../src/lib/db/gaokao-score-rank";

// ============================================================
// Config
// ============================================================

const BASE_URL = "https://static-data.gaokao.cn/www/2.0/section2021";

/** Province code → name */
const PROVINCES: Record<string, string> = {
  "13": "河北",
};

/** Category code → name */
const CATEGORIES: Record<string, string> = {
  "2073": "物理类",
  "2074": "历史类",
  "1": "理科",
  "2": "文科",
};

/** Batch type codes — only batch=3 (综合) reliably returns data for all years */
const BATCH_TYPES: { code: number; name: string }[] = [
  { code: 3, name: "综合" },
];

/** Default years to scrape when --all */
const ALL_YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

/**
 * Category codes to try per year.
 * 2020+: 2073/2074 (物理/历史类), 1/2 (理科/文科) also exist as fallback
 * 2016-2019: 1/2 (理科/文科) only
 */
function getCategoriesForYear(year: number): string[] {
  if (year >= 2021) return ["2073", "2074"];
  return ["1", "2"];
}

const DELAY_MS = 500; // polite delay between requests

// ============================================================
// CLI arg parsing
// ============================================================

function parseArgs(): Record<string, string | boolean> {
  const args = process.argv.slice(2);
  const result: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        result[key] = next;
        i++;
      } else {
        result[key] = true;
      }
    }
  }
  return result;
}

function printUsage(): void {
  console.log(`
Usage: pnpm tsx scripts/scrape-gaokao-section.ts [options]

Options:
  --year <YYYY>        年份 (2023-2026)
  --province <code>    省份代号 (default: 13)
  --category <code>    考生类别 (2073=物理类, 2074=历史类)
  --batch <code>       批次 (1=本科, 2=专科, 3=综合)
  --all-batches        单年份+单类别下尝试所有批次 (1,2,3)
  --all                抓取指定省份的全部组合 (所有年份 × 物理/历史 × 所有批次)
  --db <path>          数据库路径 (default: data/河北/score-rank/gaokao-score-rank.db)
  --dry-run            仅打印抓取结果，不写入数据库
  --skip-existing      跳过已导入的组合 (配合 --all 使用)
  --export-json        导出 SQLite 数据为 JSON 文件到 data/<province>/score-rank/
  --list               列出已导入的记录
  --help               显示帮助

Examples:
  pnpm tsx scripts/scrape-gaokao-section.ts --year 2026 --province 13 --category 2073 --batch 3
  pnpm tsx scripts/scrape-gaokao-section.ts --province 13 --all --skip-existing
  pnpm tsx scripts/scrape-gaokao-section.ts --export-json --year 2026 --province 13 --category 2073 --batch 3
`);
}

// ============================================================
// Core: fetch and parse
// ============================================================

interface FetchResult {
  url: string;
  provinceCode: string;
  categoryCode: string;
  year: number;
  batchType: number;
  batchName: string;
  controlScore: number;
  totalEntries: number;
  data: Record<string, unknown>;
}

async function fetchSection(
  provinceCode: string,
  categoryCode: string,
  year: number,
  batchType: number
): Promise<FetchResult> {
  const url = `${BASE_URL}/${year}/${provinceCode}/${categoryCode}/${batchType}/lists.json?a=www.gaokao.cn`;
  console.log(`  Fetching: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const json = await response.json();
  if (json.code !== "0000") {
    throw new Error(`API error: code=${json.code}, message=${json.message}`);
  }

  const search = json.data?.search;
  if (!search || typeof search !== "object") {
    throw new Error(`Unexpected response structure: no 'data.search' object`);
  }

  const entries = Object.entries(search);
  if (entries.length === 0) {
    throw new Error("Empty data.search object");
  }

  // Extract batch info from first entry
  const firstEntry = search[entries[0][0]] as Record<string, unknown>;
  const batchName = (firstEntry.batch_name as string) || "";
  const controlScore = parseInt((firstEntry.controlscore as string) || "0", 10);

  return {
    url,
    provinceCode,
    categoryCode,
    year,
    batchType,
    batchName,
    controlScore,
    totalEntries: entries.length,
    data: search,
  };
}

// ============================================================
// Main worker
// ============================================================

async function scrapeOne(
  provinceCode: string,
  categoryCode: string,
  year: number,
  batchType: number,
  dbPath: string,
  dryRun: boolean
): Promise<FetchResult> {
  const result = await fetchSection(provinceCode, categoryCode, year, batchType);

  const catName = CATEGORIES[categoryCode] || categoryCode;
  const provName = PROVINCES[provinceCode] || provinceCode;

  if (result.totalEntries === 1 && Object.keys(result.data).length === 1) {
    console.log(
      `  ⚠️  Only 1 entry returned for ${year} ${provName} ${catName} batch=${batchType} — may be empty/unsupported`
    );
  }

  console.log(
    `  ✅ Got ${result.totalEntries} entries | batch="${result.batchName}" | control_score=${result.controlScore}`
  );

  if (dryRun) {
    // Print top-5 and bottom-3 for preview
    const keys = Object.keys(result.data)
      .map(Number)
      .sort((a, b) => b - a);
    const top5 = keys.slice(0, 5);
    const bottom3 = keys.slice(-3);
    console.log(`  Preview (top 5):`);
    for (const k of top5) {
      const e = result.data[String(k)] as Record<string, unknown>;
      console.log(
        `    score=${e.score}  num=${e.num}  cum=${e.total}  rank=${e.rank_range}`
      );
    }
    console.log(`  Preview (bottom 3):`);
    for (const k of bottom3) {
      const e = result.data[String(k)] as Record<string, unknown>;
      console.log(
        `    score=${e.score}  num=${e.num}  cum=${e.total}  rank=${e.rank_range}`
      );
    }
    return result;
  }

  // Write to DB
  const total = importScoreRank({
    provinceCode,
    categoryCode,
    year,
    batchType,
    data: result.data as Record<string, { score: string; num: string; total: string; rank_range: string; batch_name: string; controlscore: string; rank: string; appositive_fraction?: { year: number; score: string; rank_range: string }[] }>,
    sourceUrl: result.url,
  });

  console.log(`  💾 Inserted/Upserted ${total} rows into SQLite`);
  return result;
}

async function exportJson(
  provinceCode: string,
  categoryCode: string,
  year: number,
  batchType: number
): Promise<void> {
  const db = getDb();
  initDb();

  const data = exportToJson({ provinceCode, categoryCode, year, batchType });
  if (!data) {
    console.log(
      `❌ No data found in DB for province=${provinceCode} category=${categoryCode} year=${year} batch=${batchType}`
    );
    return;
  }

  // Determine output path matching existing structure
  const provName = PROVINCES[provinceCode] || provinceCode;
  const outputDir = path.join(process.cwd(), "data", provName, "score-rank");
  await fs.mkdir(path.join(outputDir, year.toString()), { recursive: true });

  const outputPath = path.join(outputDir, year.toString(), `${data.group}.json`);
  await fs.writeFile(outputPath, JSON.stringify(data, null, 2), "utf-8");

  console.log(`📄 Exported ${data.entries.length} entries → ${outputPath}`);
}

// ============================================================
// Entry
// ============================================================

async function main(): Promise<void> {
  const args = parseArgs();

  if (args["help"]) {
    printUsage();
    process.exit(0);
  }

  const dbPath = (args["db"] as string) || path.join(process.cwd(), "data", "河北", "score-rank", "gaokao-score-rank.db");
  const provinceCode = (args["province"] as string) || "13";
  const dryRun = !!args["dry-run"];
  const skipExisting = !!args["skip-existing"];

  // --list
  if (args["list"]) {
    const logs = listImportLogs(provinceCode);
    if (logs.length === 0) {
      console.log("No import logs found.");
    } else {
      console.log(`\nImport logs (${logs.length} records):\n`);
      console.log(
        `${"ID".padEnd(3)} | ${"Prov".padEnd(4)} | ${"Cat".padEnd(6)} | ${"Year".padEnd(4)} | ${"Batch".padEnd(5)} | ${"Entries".padEnd(7)} | ${"Status".padEnd(7)} | ${"Imported At"}`
      );
      console.log("-".repeat(90));
      for (const log of logs) {
        console.log(
          `${String(log.id).padEnd(3)} | ${log.province_code.padEnd(4)} | ${log.category_code.padEnd(6)} | ${String(log.year).padEnd(4)} | ${String(log.batch_type).padEnd(5)} | ${String(log.total_entries).padEnd(7)} | ${(log.status || "").padEnd(7)} | ${log.imported_at || "?"}`
        );
      }
    }
    closeDb();
    process.exit(0);
  }

  // --export-json
  if (args["export-json"]) {
    const year = parseInt(args["year"] as string, 10);
    const categoryCode = args["category"] as string;
    const batchType = parseInt(args["batch"] as string, 10);
    if (!year || !categoryCode || isNaN(batchType)) {
      console.error("❌ --export-json requires --year, --category, and --batch");
      process.exit(1);
    }
    // Adjust dbPath for export too
    await exportJson(provinceCode, categoryCode, year, batchType);
    closeDb();
    process.exit(0);
  }

  // Build task list
  interface Task {
    provinceCode: string;
    categoryCode: string;
    year: number;
    batchType: number;
  }

  const tasks: Task[] = [];

  if (args["all"]) {
    for (const year of ALL_YEARS) {
      for (const catCode of getCategoriesForYear(year)) {
        for (const bt of BATCH_TYPES) {
          tasks.push({
            provinceCode,
            categoryCode: catCode,
            year,
            batchType: bt.code,
          });
        }
      }
    }
    console.log(
      `\n🚀 Full import: ${PROVINCES[provinceCode] || provinceCode} — ${ALL_YEARS.length} years (${ALL_YEARS[0]}-${ALL_YEARS[ALL_YEARS.length - 1]}) × 2 categories × ${BATCH_TYPES.length} batch = ${tasks.length} combinations\n`
    );
  } else if (args["all-batches"]) {
    const year = parseInt(args["year"] as string, 10);
    const catCode = args["category"] as string;
    if (!year || !catCode) {
      console.error("❌ --all-batches requires --year and --category");
      process.exit(1);
    }
    for (const bt of BATCH_TYPES) {
      tasks.push({ provinceCode, categoryCode: catCode, year, batchType: bt.code });
    }
  } else {
    const year = parseInt(args["year"] as string, 10);
    const catCode = args["category"] as string;
    const batchType = parseInt(args["batch"] as string, 10);
    if (!year || !catCode || isNaN(batchType)) {
      console.error("❌ Requires --year, --category, and --batch (or use --all)");
      printUsage();
      process.exit(1);
    }
    tasks.push({ provinceCode, categoryCode: catCode, year, batchType });
  }

  // Ensure DB is initialized for writes
  if (!dryRun) {
    initDb(dbPath);
  }

  // Execute
  let successes = 0;
  let skipped = 0;
  let failures = 0;

  for (const task of tasks) {
    const catName = CATEGORIES[task.categoryCode] || task.categoryCode;
    const btName = BATCH_TYPES.find((b) => b.code === task.batchType)?.name || String(task.batchType);
    const label = `${task.year} ${catName} ${btName}`;

    if (skipExisting && !dryRun && isAlreadyImported(task.provinceCode, task.categoryCode, task.year, task.batchType)) {
      console.log(`⏭️  ${label} — already imported, skipping`);
      skipped++;
      continue;
    }

    console.log(`\n📡 ${label}`);
    try {
      await scrapeOne(
        task.provinceCode,
        task.categoryCode,
        task.year,
        task.batchType,
        dbPath,
        dryRun
      );
      successes++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ Failed: ${msg}`);
      failures++;
    }

    // Polite delay
    if (!dryRun && tasks.indexOf(task) < tasks.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  // Summary
  console.log(`\n${"─".repeat(50)}`);
  console.log(
    `Done. Success: ${successes}, Skipped: ${skipped}, Failed: ${failures}`
  );
  if (dryRun) {
    console.log("(Dry run — no data written)");
  }

  closeDb();
}

main().catch((err) => {
  console.error("Fatal:", err instanceof Error ? err.message : err);
  closeDb();
  process.exit(1);
});
