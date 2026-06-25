/**
 * 将已抓取的招生计划 all.json 重组为分片格式
 * 用法: pnpm tsx scripts/reorganize-plans.ts
 */
import { promises as fs } from "fs";
import path from "path";

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

interface UniversityIndexEntry {
  universityCode: string;
  universityName: string;
  entryCount: number;
  totalPlans: number;
}

async function main() {
  const RAW =
    "scripts/output/admission-plans-2026-benke/all.json";
  const DATA_DIR = "data/hebei/admission-plans/2026/本科批";

  const raw = await fs.readFile(path.resolve(RAW), "utf-8");
  const all: PlanRow[] = JSON.parse(raw);

  // 去重
  const seen = new Set<string>();
  const deduped: PlanRow[] = [];
  for (const row of all) {
    const key = `${row.universityCode}|${row.majorCode}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(row);
    }
  }

  // 按院校分组
  const uniMap = new Map<
    string,
    { name: string; entries: PlanRow[] }
  >();
  for (const row of deduped) {
    const e = uniMap.get(row.universityCode);
    if (e) e.entries.push(row);
    else
      uniMap.set(row.universityCode, {
        name: row.universityName,
        entries: [row],
      });
  }

  // 生成索引
  const index: UniversityIndexEntry[] = [];
  for (const [code, val] of uniMap) {
    index.push({
      universityCode: code,
      universityName: val.name,
      entryCount: val.entries.length,
      totalPlans: val.entries.reduce((s, r) => s + r.planCount, 0),
    });
  }
  index.sort((a, b) =>
    a.universityCode.localeCompare(b.universityCode)
  );

  // 创建目录
  const dataDir = path.resolve(DATA_DIR);
  await fs.mkdir(dataDir, { recursive: true });
  const schoolsDir = path.join(dataDir, "schools");
  // 清空重建
  try {
    await fs.rm(schoolsDir, { recursive: true });
  } catch {}
  await fs.mkdir(schoolsDir, { recursive: true });

  // 写索引
  const indexPath = path.join(dataDir, "index.json");
  await fs.writeFile(
    indexPath,
    JSON.stringify(index, null, 2),
    "utf-8"
  );
  console.log(`✅ index.json (${index.length} 所院校)`);

  // 写各院校文件
  const meta = {
    year: 2026,
    batch: "本科批",
    group: "物理类",
    source: "河北省教育考试院",
    sourceUrl:
      "https://gk.hebeea.edu.cn:88/xxcx/xxcxzx/zsjhIframe",
    publishedAt: new Date().toISOString().split("T")[0],
    quality: "official",
    updatedAt: new Date().toISOString(),
    totalEntries: deduped.length,
    totalPlans: deduped.reduce((s, r) => s + r.planCount, 0),
    universityCount: uniMap.size,
  };

  for (const [code, val] of uniMap) {
    const d = {
      year: meta.year,
      batch: meta.batch,
      group: meta.group,
      entries: val.entries,
      meta,
    };
    await fs.writeFile(
      path.join(schoolsDir, `${code}.json`),
      JSON.stringify(d, null, 2),
      "utf-8"
    );
  }
  console.log(`✅ schools/ (${uniMap.size} 个文件)`);

  // 输出统计
  const tuitions = deduped
    .map((r) => r.tuition)
    .filter((t) => t > 0);
  console.log(`总记录: ${deduped.length}`);
  console.log(`总计划: ${meta.totalPlans}`);
  console.log(
    `学费区间: ${Math.min(...tuitions)} ~ ${Math.max(...tuitions)} 元/年`
  );

  // 科目分布
  const subjects: Record<string, number> = {};
  for (const row of deduped) {
    const k = row.subjectRequirement || "不限";
    subjects[k] = (subjects[k] || 0) + 1;
  }
  console.log("科目分布:");
  for (const [k, c] of Object.entries(subjects).sort(
    (a, b) => b[1] - a[1]
  ))
    console.log(`  ${k}: ${c} 条`);
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
