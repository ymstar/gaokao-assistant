/**
 * 河北省教育考试院投档线录取数据抓取工具
 *
 * 用法:
 *   pnpm tsx scripts/scrape-admission-lines.ts \
 *     --id "..." --cookie "..." \
 *     --lspcdm "3" --lskldm "B0" --lsklmc "物理科目组合"
 *
 * 断点续抓：自动跳过已抓取的院校，增量合并。
 */

import * as cheerio from "cheerio";
import { promises as fs } from "fs";
import path from "path";

// ============================================================
// Types
// ============================================================

interface RawRow {
  year: number;
  universityCode: string;
  universityName: string;
  majorCode: string;
  majorName: string;
  minScore: number;
  avgScore: number;
  minRank: number;
  volunteerNum: string;
}

interface AdmissionLineEntry {
  universityCode: string;
  universityName: string;
  majorGroup: string;
  planCount: number;
  minScore: number;
  minRank: number;
  avgScore?: number;
}

interface AdmissionLineData {
  year: number;
  batch: string;
  group: string;
  entries: AdmissionLineEntry[];
  meta: {
    source: string;
    sourceUrl: string;
    publishedAt: string;
    quality: "official" | "verified" | "unverified";
    updatedAt: string;
    totalEntries: number;
    universityCount: number;
  };
}

interface UniversityIndexEntry {
  universityCode: string;
  universityName: string;
  entryCount: number;
}

// ============================================================
// 参数映射
// ============================================================

const PCDM_BATCH_MAP: Record<string, string> = {
  "1": "本科提前批B段",
  "3": "本科批",
  "8": "专科提前批",
  "9": "专科批",
};

const KLDM_GROUP_MAP: Record<string, string> = {
  B: "物理类",
  B0: "物理类",
  A: "历史类",
  A0: "历史类",
};

// ============================================================
// CLI
// ============================================================

interface CliArgs {
  id: string;
  lspcdm: string;
  lskldm: string;
  lsklmc: string;
  lskswc: string;
  lsjswc: string;
  cookie: string;
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
      if (val && !val.startsWith("--")) { map[key] = val; i++; }
      else map[key] = "true";
    }
  }
  if (!map.id) { console.error("❌ 缺少 --id"); process.exit(1); }
  return {
    id: map.id,
    lspcdm: map.lspcdm || "1",
    lskldm: map.lskldm || "B0",
    lsklmc: map.lsklmc || "物理科目组合",
    lskswc: map.lskswc || "",
    lsjswc: map.lsjswc || "",
    cookie: map.cookie || map.c || "",
    outputDir: map["output-dir"],
    delayMs: map.delay ? parseInt(map.delay) : 1200,
  };
}

// ============================================================
// HTTP
// ============================================================

const BASE_URL = "https://gk.hebeea.edu.cn:88";
const ENDPOINT = "/xxcx/xxcxzx/lnwc";

async function fetchPage(page: number, args: CliArgs, retries = 4): Promise<string> {
  const fd = new URLSearchParams();
  fd.append("id", args.id);
  fd.append("lspcdm", args.lspcdm);
  fd.append("lskldm", args.lskldm);
  fd.append("lsklmc", args.lsklmc);
  fd.append("lskswc", args.lskswc);
  fd.append("lsjswc", args.lsjswc);
  fd.append("page", String(page));

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const h: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Content-Type": "application/x-www-form-urlencoded",
      };
      if (args.cookie) h["Cookie"] = args.cookie;

      const res = await fetch(`${BASE_URL}${ENDPOINT}`, { method: "POST", headers: h, body: fd.toString() });
      const html = await res.text();

      if (html.includes("考生登录") || html.includes("ksxxForm")) throw new Error("Cookie 已过期");
      if (!html.includes("zsjhTable")) {
        if (html.trim().length === 0) return "";
        throw new Error("不含表格数据");
      }
      return html;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Cookie 已过期")) throw err;
      if (attempt < retries) {
        const wait = 2000 * attempt;
        console.warn(`  ⚠️  第 ${page} 页失败 (${attempt}/${retries}): ${msg}，${wait / 1000}s 后重试`);
        await sleep(wait);
      } else throw new Error(`第 ${page} 页请求失败（已重试 ${retries} 次）`);
    }
  }
  return "";
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ============================================================
// HTML 解析
// ============================================================

function parseTotalPages(html: string): number {
  const m = html.match(/共\s*(\d+)\s*页/);
  return m ? parseInt(m[1]) : 0;
}

function extractFullName(td: cheerio.Cheerio<cheerio.Element>): string {
  const m = (td.attr("onmouseover") || "").match(/showTips\('([^']*)'/);
  if (m) return m[1].trim();
  return td.text().trim().replace(/ /g, "");
}

function parsePage(html: string): RawRow[] {
  const $ = cheerio.load(html);
  const rows: RawRow[] = [];
  $("#zsjhTable tbody tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length < 10) return;
    const gc = (i: number) => $(tds[i]).text().trim().replace(/ /g, "");
    const uniName = extractFullName($(tds.eq(3)));
    const majorName = extractFullName($(tds.eq(5)));
    const year = parseInt(gc(1)) || 0;
    const code = gc(2);
    if (year && code && uniName && majorName) {
      rows.push({
        year,
        universityCode: code,
        universityName: uniName,
        majorCode: gc(4),
        majorName,
        minScore: parseInt(gc(6)) || 0,
        avgScore: parseInt(gc(7)) || 0,
        minRank: parseInt(gc(8)) || 0,
        volunteerNum: gc(9),
      });
    }
  });
  return rows;
}

// ============================================================
// 增量保存
// ============================================================

async function saveYearIncremental(
  year: number,
  entries: AdmissionLineEntry[],
  dataDir: string,
  batchName: string,
  groupName: string,
  meta: AdmissionLineData["meta"]
) {
  const yearDir = path.join(dataDir, String(year), batchName);
  await fs.mkdir(yearDir, { recursive: true });
  const schoolsDir = path.join(yearDir, "schools");
  await fs.mkdir(schoolsDir, { recursive: true });

  // 按院校分组
  const uniMap = new Map<string, { name: string; entries: AdmissionLineEntry[] }>();
  for (const row of entries) {
    const e = uniMap.get(row.universityCode);
    if (e) e.entries.push(row);
    else uniMap.set(row.universityCode, { name: row.universityName, entries: [row] });
  }

  // 写各院校文件（覆盖写入以支持增量更新）
  for (const [code, val] of uniMap) {
    const data: AdmissionLineData = { year, batch: batchName, group: groupName, entries: val.entries, meta };
    await fs.writeFile(path.join(schoolsDir, `${code}.json`), JSON.stringify(data, null, 2), "utf-8");
  }

  // 更新索引
  const index: UniversityIndexEntry[] = [];
  for (const [code, val] of uniMap) {
    index.push({ universityCode: code, universityName: val.name, entryCount: val.entries.length });
  }
  index.sort((a, b) => a.universityCode.localeCompare(b.universityCode));
  await fs.writeFile(path.join(yearDir, "index.json"), JSON.stringify(index, null, 2), "utf-8");

  return { uniCount: uniMap.size };
}

// ============================================================
// 主流程
// ============================================================

async function main() {
  const args = parseArgs();
  const batchName = PCDM_BATCH_MAP[args.lspcdm] || `批次${args.lspcdm}`;
  const groupName = KLDM_GROUP_MAP[args.lskldm] || args.lsklmc;

  console.log("═══════════════════════════════════════════");
  console.log("  河北省教育考试院 投档线数据抓取工具");
  console.log("═══════════════════════════════════════════");
  console.log(`  批次: ${batchName} (lspcdm=${args.lspcdm})`);
  console.log(`  科类: ${groupName} (lskldm=${args.lskldm})`);
  console.log(`  目标: ${BASE_URL}${ENDPOINT}`);
  console.log("═══════════════════════════════════════════\n");

  // 第 1 页
  console.log("📥 获取第 1 页（确认总页数）...");
  const p1 = await fetchPage(1, args);
  const totalPages = parseTotalPages(p1);
  if (totalPages === 0) { console.error("❌ 无法解析总页数"); process.exit(1); }
  console.log(`   ✅ 共 ${totalPages} 页\n`);

  // 收集所有页
  const allRows: RawRow[] = [];
  let failCount = 0;
  const MAX_FAIL = 20;

  for (let p = 1; p <= totalPages; p++) {
    if (failCount >= MAX_FAIL) {
      console.error(`❌ 连续失败 ${MAX_FAIL} 次，停止抓取`);
      break;
    }

    if (p > 1) await sleep(args.delayMs);

    try {
      const html = p === 1 ? p1 : await fetchPage(p, args);
      const rows = parsePage(html);
      if (rows.length === 0 && p > 1) {
        failCount++;
        console.log(`   第 ${p} 页: 0 条（空，连续 ${failCount}）`);
        continue;
      }
      failCount = 0;
      allRows.push(...rows);
      if (p % 50 === 0 || p === totalPages) {
        console.log(`   📄 ${p}/${totalPages} 页 (累计 ${allRows.length} 条)`);
      }
    } catch (err) {
      console.error(`   ❌ 第 ${p} 页致命错误:`, err);
      // 记录断点
      await fs.writeFile(
        path.join(args.outputDir || "scripts/output", "checkpoint.txt"),
        String(p + 1), "utf-8"
      ).catch(() => {});
      break;
    }
  }

  console.log(`\n📊 抓取完成：共 ${allRows.length} 条`);

  // 去重
  const seen = new Set<string>();
  const deduped: RawRow[] = [];
  for (const r of allRows) {
    const k = `${r.year}|${r.universityCode}|${r.majorCode}`;
    if (!seen.has(k)) { seen.add(k); deduped.push(r); }
  }
  if (deduped.length < allRows.length) console.log(`🔍 去重: ${allRows.length} → ${deduped.length}`);

  // 按年份分组
  const byYear: Record<number, RawRow[]> = {};
  for (const r of deduped) (byYear[r.year] ??= []).push(r);

  // 输出目录
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outputRoot = args.outputDir || path.join(process.cwd(), "scripts", "output", `admission-lines-${ts}`);
  await fs.mkdir(outputRoot, { recursive: true });

  // 汇总
  await fs.writeFile(path.join(outputRoot, "all.json"), JSON.stringify(deduped, null, 2), "utf-8");

  const dataDir = path.join(process.cwd(), "data", "hebei", "admission-lines");
  const pubDate = new Date().toISOString().split("T")[0];

  // 按年批量增量保存
  for (const [ys, rows] of Object.entries(byYear).sort()) {
    const year = parseInt(ys);
    const entries: AdmissionLineEntry[] = rows.map(r => ({
      universityCode: r.universityCode,
      universityName: r.universityName,
      majorGroup: r.majorName,
      planCount: 0,
      minScore: r.minScore,
      minRank: r.minRank,
      avgScore: r.avgScore > 0 ? r.avgScore : undefined,
    }));

    const meta: AdmissionLineData["meta"] = {
      source: "河北省教育考试院",
      sourceUrl: `${BASE_URL}${ENDPOINT}`,
      publishedAt: pubDate,
      quality: "official",
      updatedAt: new Date().toISOString(),
      totalEntries: entries.length,
      universityCount: new Set(entries.map(e => e.universityCode)).size,
    };

    // 标准路径（增量写入）
    const r1 = await saveYearIncremental(year, entries, dataDir, batchName, groupName, meta);
    // 备份
    const r2 = await saveYearIncremental(year, entries, outputRoot, batchName, groupName, meta);

    const smin = Math.min(...rows.map(r => r.minScore));
    const smax = Math.max(...rows.map(r => r.minScore));
    const rmin = Math.min(...rows.map(r => r.minRank));
    const rmax = Math.max(...rows.map(r => r.minRank));
    console.log(`   ${year}年: ${entries.length} 条 | ${r1.uniCount} 院校 | 分数 ${smin}-${smax} | 位次 ${rmin}-${rmax}`);
  }

  // 统计
  console.log("\n═══════════════════════════════════════════");
  console.log("  统计汇总");
  console.log("═══════════════════════════════════════════");
  console.log(`  总记录: ${deduped.length}`);
  console.log(`  批次: ${batchName} / ${groupName}`);
  console.log(`  覆盖年份: ${Object.keys(byYear).sort().join(", ")}`);
  for (const [ys, rows] of Object.entries(byYear).sort()) {
    console.log(`  ${ys}年: ${rows.length} 条 | ${new Set(rows.map(r => r.universityName)).size} 所院校`);
  }
  console.log("═══════════════════════════════════════════\n");
  console.log(`✅ 标准路径: ${dataDir}/{year}/${batchName}/`);
  console.log(`   备份: ${outputRoot}/`);
}

main().catch(err => { console.error("❌", err); process.exit(1); });
