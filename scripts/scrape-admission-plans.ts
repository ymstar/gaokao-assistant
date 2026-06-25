/**
 * 河北省教育考试院招生计划数据抓取工具
 *
 * 从 /xxcx/xxcxzx/zsjhIframe 接口分页获取招生计划数据并输出为 JSON。
 *
 * 用法:
 *   pnpm tsx scripts/scrape-admission-plans.ts \
 *     --cookie "JSESSIONID=xxx; BIGipServerpool_gkbm_88=xxx; passport_csrf_token=xxx" \
 *     --pcdm "3" \
 *     --kldm "B"
 *
 * pcdm 映射:
 *   1=本科提前批B段, 3=本科批, 8=专科提前批, 9=专科批, D=对口本科批, E=对口专科批
 *
 * kldm 映射:
 *   B=物理类, A=历史类
 *
 * 存储策略:
 *   - 20k+ 数据量时，按院校代号前缀分片，避免单文件过大
 *   - 标准路径: data/hebei/admission-plans/{year}/{batch}/{group}.json
 *   - 同时输出按院校分片的 JSON 到 {batch} 目录下
 *   - 生成汇总索引 index.json 列出所有院校及其记录数
 */

import * as cheerio from "cheerio";
import { promises as fs } from "fs";
import path from "path";

// ============================================================
// Types
// ============================================================

/** 招生计划一行原始数据 */
interface PlanRow {
  index: number;
  universityCode: string;
  universityName: string;
  majorCode: string;
  majorName: string;
  majorNote: string;
  subjectRequirement: string;
  planCount: number;
  duration: number;
  tuition: number;
}

/** 最终输出数据结构 */
interface AdmissionPlanData {
  year: number;
  batch: string;
  group: string;
  entries: PlanRow[];
  meta: {
    source: string;
    sourceUrl: string;
    publishedAt: string;
    quality: "official" | "verified" | "unverified";
    updatedAt: string;
    totalEntries: number;
    totalPlans: number;
    universityCount: number;
  };
}

/** 院校汇总信息（用于索引） */
interface UniversityIndexEntry {
  universityCode: string;
  universityName: string;
  entryCount: number;
  totalPlans: number;
}

// ============================================================
// pcdm / kldm 映射
// ============================================================

const PCDM_BATCH_MAP: Record<string, string> = {
  "1": "本科提前批B段",
  "3": "本科批",
  "8": "专科提前批",
  "9": "专科批",
  D: "对口本科批",
  E: "对口专科批",
};

const KLDM_GROUP_MAP: Record<string, string> = {
  B: "物理类",
  B0: "物理类",
  A: "历史类",
  A0: "历史类",
};

// ============================================================
// CLI 参数解析
// ============================================================

interface CliArgs {
  cookie: string;
  pcdm: string;
  kldm: string;
  jhxzdm: string;
  zyms: string;
  outputDir?: string;
  delayMs: number;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const map: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const val = args[i + 1];
      if (val && !val.startsWith("--")) {
        map[key] = val;
        i++;
      } else {
        map[key] = "true";
      }
    }
  }

  if (!map.cookie && !map.c) {
    console.error("❌ 缺少必填参数 --cookie（Cookie 字符串）");
    console.error(
      "   请在浏览器登录后，从 DevTools 中复制完整的 Cookie。"
    );
    process.exit(1);
  }

  return {
    cookie: map.cookie || map.c || "",
    pcdm: map.pcdm || "1",
    kldm: map.kldm || "B",
    jhxzdm: map.jhxzdm || "0",
    zyms: map.zyms || "ZYPX",
    outputDir: map["output-dir"],
    delayMs: map.delay ? parseInt(map.delay) : 1500,
  };
}

// ============================================================
// HTTP 请求
// ============================================================

const BASE_URL = "https://gk.hebeea.edu.cn:88";
const ENDPOINT = "/xxcx/xxcxzx/zsjhIframe";

async function fetchPage(
  page: number,
  args: CliArgs,
  retries = 3
): Promise<string> {
  const formData = new URLSearchParams();
  formData.append("pcdm", args.pcdm);
  formData.append("jhxzdm", args.jhxzdm);
  formData.append("kldm", args.kldm);
  formData.append("zyms", args.zyms);
  formData.append("page", String(page));

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}${ENDPOINT}`, {
        method: "POST",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: args.cookie,
        },
        body: formData.toString(),
      });

      const html = await res.text();

      if (
        html.includes("考生登录") ||
        html.includes("ksxxForm")
      ) {
        throw new Error("Cookie 已过期，请重新登录后获取新的 Cookie");
      }

      if (!html.includes("zsjhTable")) {
        if (html.trim().length === 0) {
          console.warn(`  ⚠️  第 ${page} 页返回空内容，停止分页`);
          return "";
        }
        throw new Error(`第 ${page} 页返回内容不含表格数据`);
      }

      return html;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Cookie 已过期")) throw err;

      if (attempt < retries) {
        console.warn(
          `  ⚠️  第 ${page} 页请求失败 (第 ${attempt}/${retries} 次): ${msg}，${2 * attempt}s 后重试...`
        );
        await sleep(2000 * attempt);
      } else {
        throw new Error(
          `第 ${page} 页请求失败（已重试 ${retries} 次）: ${msg}`
        );
      }
    }
  }

  return "";
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================================
// HTML 解析
// ============================================================

function parseTotalPages(html: string): number {
  const m = html.match(/共\s*(\d+)\s*页/);
  return m ? parseInt(m[1]) : 0;
}

function parseTotalCount(html: string): number {
  const m = html.match(/共&nbsp;(\d+)&nbsp;条/);
  return m ? parseInt(m[1]) : 0;
}

function extractFullName(td: cheerio.Element): string {
  const $ = cheerio.load("");
  const el = $(td);
  const onmouseenter = el.attr("onmouseenter") || "";
  const m = onmouseenter.match(/showTips\('([^']*)'/);
  if (m && m[1]) return m[1].trim();
  return el.text().trim().replace(/ /g, "");
}

function parsePage(html: string): PlanRow[] {
  const $ = cheerio.load(html);
  const rows: PlanRow[] = [];

  $("#zsjhTable tbody tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length < 11) return;

    const getCell = (i: number) =>
      $(tds[i]).text().trim().replace(/ /g, "");

    const index = parseInt(getCell(0)) || 0;
    const universityCode = getCell(1);
    const universityName = extractFullName(tds[2]);
    const majorCode = getCell(3);
    const majorName = extractFullName(tds[4]);
    const majorNote = extractFullName(tds[5]);
    const subjectRequirement = getCell(6);
    const planCount = parseInt(getCell(7)) || 0;
    const duration = parseInt(getCell(8)) || 0;
    const tuition = parseInt(getCell(9)) || 0;

    if (universityCode && universityName && majorName) {
      rows.push({
        index,
        universityCode,
        universityName,
        majorCode,
        majorName,
        majorNote,
        subjectRequirement,
        planCount,
        duration,
        tuition,
      });
    }
  });

  return rows;
}

// ============================================================
// 大文件存储策略
// ============================================================

/**
 * 超过此阈值时启用分片存储，避免单文件过大导致页面加载/解析性能问题。
 * 默认 5000 条（约 1.5MB prettified JSON）。
 */
const SHARD_THRESHOLD = 5000;

/** 按院校代号前缀分组（第 1 字符），≈ 36 组 */
function getShardKey(universityCode: string): string {
  const firstChar = universityCode.charAt(0).toUpperCase();
  if (/^[0-9]$/.test(firstChar)) return "0-9";
  return firstChar;
}

async function saveSharded(
  entries: PlanRow[],
  outputDir: string,
  year: number,
  batch: string,
  group: string,
  meta: AdmissionPlanData["meta"]
) {
  // ---- 生成院校索引 ----
  const uniMap = new Map<
    string,
    { name: string; entries: PlanRow[] }
  >();
  for (const row of entries) {
    const existing = uniMap.get(row.universityCode);
    if (existing) {
      existing.entries.push(row);
    } else {
      uniMap.set(row.universityCode, {
        name: row.universityName,
        entries: [row],
      });
    }
  }

  const index: UniversityIndexEntry[] = [];
  for (const [code, val] of uniMap) {
    index.push({
      universityCode: code,
      universityName: val.name,
      entryCount: val.entries.length,
      totalPlans: val.entries.reduce((s, r) => s + r.planCount, 0),
    });
  }
  index.sort((a, b) => a.universityCode.localeCompare(b.universityCode));

  // ---- 保存索引 ----
  const indexPath = path.join(outputDir, "index.json");
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2), "utf-8");
  console.log(`💾 ${indexPath} (${index.length} 所院校)`);

  // ---- 按院校独立文件 ----
  const schoolsDir = path.join(outputDir, "schools");
  await fs.mkdir(schoolsDir, { recursive: true });

  for (const [code, val] of uniMap) {
    const schoolData: AdmissionPlanData = {
      year,
      batch,
      group,
      entries: val.entries,
      meta: { ...meta },
    };
    const schoolPath = path.join(schoolsDir, `${code}.json`);
    await fs.writeFile(
      schoolPath,
      JSON.stringify(schoolData, null, 2),
      "utf-8"
    );
  }
  console.log(
    `💾 ${schoolsDir}/ (${uniMap.size} 个院校文件)`
  );
}

// ============================================================
// 主流程
// ============================================================

async function main() {
  const args = parseArgs();

  const batchName =
    PCDM_BATCH_MAP[args.pcdm] || `批次${args.pcdm}`;
  const groupName =
    KLDM_GROUP_MAP[args.kldm] || `科类${args.kldm}`;

  console.log("═══════════════════════════════════════════");
  console.log("  河北省教育考试院 招生计划数据抓取工具");
  console.log("═══════════════════════════════════════════");
  console.log(`  批次: ${batchName} (pcdm=${args.pcdm})`);
  console.log(`  科类: ${groupName} (kldm=${args.kldm})`);
  console.log(`  计划性质: ${args.jhxzdm} (0=非定向)`);
  console.log(`  目标: ${BASE_URL}${ENDPOINT}`);
  console.log("═══════════════════════════════════════════\n");

  // ---- 第 1 页 ----
  console.log("📥 获取第 1 页...");
  const page1Html = await fetchPage(1, args);
  const totalPages = parseTotalPages(page1Html);
  const totalCount = parseTotalCount(page1Html);

  if (totalPages === 0) {
    console.error("❌ 无法解析总页数，请检查 Cookie 是否有效");
    process.exit(1);
  }

  console.log(
    `   ✅ 共 ${totalPages} 页，约 ${totalCount} 条记录\n`
  );

  const allRows: PlanRow[] = parsePage(page1Html);
  console.log(`   第 1 页: ${allRows.length} 条`);

  // ---- 分页循环 ----
  let consecutiveEmpty = 0;

  for (let p = 2; p <= totalPages; p++) {
    if (consecutiveEmpty >= 3) {
      console.log(`   ⚠️  连续 ${consecutiveEmpty} 页空结果，停止分页`);
      break;
    }

    await sleep(args.delayMs);

    try {
      const html = await fetchPage(p, args);
      const pageRows = parsePage(html);

      if (pageRows.length === 0) {
        consecutiveEmpty++;
        console.log(`   第 ${p} 页: 0 条（空）`);
        continue;
      }

      consecutiveEmpty = 0;
      allRows.push(...pageRows);
      console.log(
        `   第 ${p} 页: ${pageRows.length} 条（累计 ${allRows.length}）`
      );
    } catch (err) {
      console.error(`   ❌ 第 ${p} 页出错:`, err);
      continue;
    }
  }

  console.log(`\n📊 抓取完成：共 ${allRows.length} 条记录\n`);

  if (allRows.length === 0) {
    console.error("❌ 未获取到任何数据");
    process.exit(1);
  }

  // ---- 去重 ----
  const seen = new Set<string>();
  const deduped: PlanRow[] = [];
  for (const row of allRows) {
    const key = `${row.universityCode}|${row.majorCode}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(row);
    }
  }

  if (deduped.length < allRows.length) {
    console.log(
      `🔍 去重：${allRows.length} → ${deduped.length} (移除 ${allRows.length - deduped.length} 条重复)\n`
    );
  }

  // ---- 输出目录 ----
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  const outputRoot =
    args.outputDir ||
    path.join(
      process.cwd(),
      "scripts",
      "output",
      `admission-plans-${timestamp}`
    );
  await fs.mkdir(outputRoot, { recursive: true });

  // ---- 标准数据路径 ----
  const YEAR = 2026;
  const dataDir = path.join(
    process.cwd(),
    "data",
    "hebei",
    "admission-plans",
    String(YEAR),
    batchName
  );
  await fs.mkdir(dataDir, { recursive: true });

  const publishedAt = new Date().toISOString().split("T")[0];
  const meta: AdmissionPlanData["meta"] = {
    source: "河北省教育考试院",
    sourceUrl: `${BASE_URL}${ENDPOINT}`,
    publishedAt,
    quality: "official",
    updatedAt: new Date().toISOString(),
    totalEntries: deduped.length,
    totalPlans: deduped.reduce((s, r) => s + r.planCount, 0),
    universityCount: new Set(deduped.map((r) => r.universityCode))
      .size,
  };

  // ---- 保存到标准数据路径 ----
  console.log("正在保存到标准数据路径...");
  await saveSharded(
    deduped,
    dataDir,
    YEAR,
    batchName,
    groupName,
    meta
  );

  // ---- 同时保存到 outputRoot ----
  await saveSharded(
    deduped,
    outputRoot,
    YEAR,
    batchName,
    groupName,
    meta
  );

  // ---- 打印统计 ----
  const uniMap = new Map<string, string>();
  for (const row of deduped)
    uniMap.set(row.universityCode, row.universityName);

  console.log("\n═══════════════════════════════════════════");
  console.log("  统计汇总");
  console.log("═══════════════════════════════════════════");
  console.log(`  年份: ${YEAR}`);
  console.log(`  批次: ${batchName}`);
  console.log(`  科类: ${groupName}`);
  console.log(`  总记录数: ${deduped.length}`);
  console.log(`  总计划数: ${meta.totalPlans}`);
  console.log(`  院校数: ${meta.universityCount}`);

  const tuitions = deduped.map((r) => r.tuition).filter((t) => t > 0);
  if (tuitions.length > 0) {
    console.log(
      `  学费区间: ${Math.min(...tuitions)} ~ ${Math.max(...tuitions)} 元/年`
    );
  }

  const subjects: Record<string, number> = {};
  for (const row of deduped) {
    const key = row.subjectRequirement || "不限";
    subjects[key] = (subjects[key] || 0) + 1;
  }
  console.log("  再选科目要求分布:");
  for (const [key, count] of Object.entries(subjects).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`    ${key}: ${count} 条`);
  }

  console.log("═══════════════════════════════════════════\n");
  console.log(`✅ 标准数据路径: ${dataDir}/`);
  console.log(`   抓取结果备份: ${outputRoot}/`);
  console.log(
    `   读取方式: schools/{院校代号}.json 单校查询\n`
  );
}

main().catch((err) => {
  console.error("❌ 执行失败:", err);
  process.exit(1);
});
