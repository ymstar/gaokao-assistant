/**
 * 投档线数据验证脚本
 *
 * 验证 data/{province}/admission-lines/ 下所有 JSON 文件
 *
 * 用法: pnpm tsx scripts/validate-admission-lines.ts hebei
 */

import { promises as fs } from 'fs';
import path from 'path';

const PROVINCE = process.argv[2] || 'hebei';

interface AdmissionLineEntry {
  universityCode: string;
  universityName: string;
  majorGroup: string;
  planCount: number;
  minScore: number;
  minRank: number;
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
    quality: string;
  };
}

async function validate() {
  const dataDir = path.join(process.cwd(), 'data', PROVINCE, 'admission-lines');

  let exists = false;
  try {
    await fs.access(dataDir);
    exists = true;
  } catch {
    // not exists
  }

  if (!exists) {
    console.log(`⚠️  目录不存在: data/${PROVINCE}/admission-lines/`);
    console.log('   投档线数据尚未导入，请先获取数据。');
    process.exit(0);
  }

  const yearDirs = await fs.readdir(dataDir);
  let totalFiles = 0;
  let totalEntries = 0;
  let errors = 0;

  for (const yearStr of yearDirs) {
    const yearPath = path.join(dataDir, yearStr);
    const stat = await fs.stat(yearPath);
    if (!stat.isDirectory()) continue;

    const batchDirs = await fs.readdir(yearPath);
    for (const batchName of batchDirs) {
      const batchPath = path.join(yearPath, batchName);
      const batchStat = await fs.stat(batchPath);
      if (!batchStat.isDirectory()) continue;

      const files = await fs.readdir(batchPath);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(batchPath, file);
        totalFiles++;

        try {
          const raw = await fs.readFile(filePath, 'utf-8');
          const data: AdmissionLineData = JSON.parse(raw);

          // 1. 检查顶层字段
          if (!data.year || !data.batch || !data.group) {
            console.error(`❌ ${yearStr}/${batchName}/${file}: 缺少 year/batch/group`);
            errors++;
            continue;
          }

          // 2. 检查 meta
          if (!data.meta?.source || !data.meta?.sourceUrl) {
            console.error(`❌ ${yearStr}/${batchName}/${file}: meta 缺少 source 或 sourceUrl`);
            errors++;
          }

          // 3. 检查 entries
          if (!Array.isArray(data.entries) || data.entries.length === 0) {
            console.error(`❌ ${yearStr}/${batchName}/${file}: entries 为空或不是数组`);
            errors++;
            continue;
          }

          totalEntries += data.entries.length;

          for (let i = 0; i < data.entries.length; i++) {
            const entry = data.entries[i];

            if (!entry.universityCode) {
              console.error(`❌ ${yearStr}/${batchName}/${file} entry[${i}]: 缺少 universityCode`);
              errors++;
            }
            if (!entry.universityName) {
              console.error(`❌ ${yearStr}/${batchName}/${file} entry[${i}]: 缺少 universityName`);
              errors++;
            }
            if (!entry.majorGroup) {
              console.error(`❌ ${yearStr}/${batchName}/${file} entry[${i}]: 缺少 majorGroup`);
              errors++;
            }
            if (typeof entry.minScore !== 'number' || entry.minScore <= 0) {
              console.error(`❌ ${yearStr}/${batchName}/${file} entry[${i}] (${entry.universityName}): minScore 无效: ${entry.minScore}`);
              errors++;
            }
            if (typeof entry.minRank !== 'number' || entry.minRank <= 0) {
              console.error(`❌ ${yearStr}/${batchName}/${file} entry[${i}] (${entry.universityName}): minRank 无效: ${entry.minRank}`);
              errors++;
            }
            if (typeof entry.planCount !== 'number' || entry.planCount < 0) {
              console.error(`❌ ${yearStr}/${batchName}/${file} entry[${i}] (${entry.universityName}): planCount 无效: ${entry.planCount}`);
              errors++;
            }
          }

          console.log(`✅ ${yearStr}/${batchName}/${file}: ${data.entries.length} 条记录`);
        } catch (e) {
          console.error(`❌ ${yearStr}/${batchName}/${file}: JSON 解析失败 - ${e}`);
          errors++;
        }
      }
    }
  }

  console.log(`\n--- 验证结果 ---`);
  console.log(`文件数: ${totalFiles}`);
  console.log(`记录数: ${totalEntries}`);
  console.log(`错误数: ${errors}`);

  if (totalFiles === 0) {
    console.log(`\n⚠️  未找到任何投档线数据文件。`);
    console.log(`   请将数据放入 data/${PROVINCE}/admission-lines/{year}/{batch}/{group}.json`);
  }

  process.exit(errors > 0 ? 1 : 0);
}

validate().catch(console.error);
