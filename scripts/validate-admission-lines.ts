/**
 * 投档线数据验证脚本
 *
 * 支持新旧两种存储格式：
 *   - 新格式: index.json + schools/{code}.json（分片存储）
 *   - 旧格式: {batch}/{group}.json（单文件）
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

function validateEntries(entries: AdmissionLineEntry[], label: string): number {
  let errors = 0;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry.universityCode) {
      console.error(`❌ ${label} entry[${i}]: 缺少 universityCode`);
      errors++;
    }
    if (!entry.universityName) {
      console.error(`❌ ${label} entry[${i}]: 缺少 universityName`);
      errors++;
    }
    if (!entry.majorGroup) {
      console.error(`❌ ${label} entry[${i}]: 缺少 majorGroup`);
      errors++;
    }
    if (typeof entry.minScore !== 'number' || entry.minScore <= 0) {
      console.error(`❌ ${label} entry[${i}] (${entry.universityName}): minScore 无效: ${entry.minScore}`);
      errors++;
    }
    if (typeof entry.minRank !== 'number' || entry.minRank <= 0) {
      console.error(`❌ ${label} entry[${i}] (${entry.universityName}): minRank 无效: ${entry.minRank}`);
      errors++;
    }
  }
  return errors;
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
    process.exit(0);
  }

  const yearDirs = await fs.readdir(dataDir);
  let totalSchools = 0;
  let totalEntries = 0;
  let errors = 0;

  for (const yearStr of yearDirs) {
    const yearPath = path.join(dataDir, yearStr);
    const yearStat = await fs.stat(yearPath);
    if (!yearStat.isDirectory()) continue;

    const batchDirs = await fs.readdir(yearPath);
    for (const batchName of batchDirs) {
      const batchPath = path.join(yearPath, batchName);
      const batchStat = await fs.stat(batchPath);
      if (!batchStat.isDirectory()) continue;

      // ---- 新格式: index.json + schools/ ----
      const indexPath = path.join(batchPath, 'index.json');
      const schoolsDir = path.join(batchPath, 'schools');

      try {
        await fs.access(indexPath);
        await fs.access(schoolsDir);

        const indexRaw = await fs.readFile(indexPath, 'utf-8');
        const index: { universityCode: string; universityName: string; entryCount: number }[] = JSON.parse(indexRaw);
        totalSchools += index.length;

        const schoolFiles = await fs.readdir(schoolsDir);
        let batchEntries = 0;

        for (const file of schoolFiles) {
          if (!file.endsWith('.json')) continue;
          const filePath = path.join(schoolsDir, file);

          try {
            const raw = await fs.readFile(filePath, 'utf-8');
            const data: AdmissionLineData = JSON.parse(raw);

            if (!data.year || !data.batch || !data.group) {
              console.error(`❌ ${yearStr}/${batchName}/schools/${file}: 缺少 year/batch/group`);
              errors++;
              continue;
            }

            if (!data.meta?.source || !data.meta?.sourceUrl) {
              console.error(`❌ ${yearStr}/${batchName}/schools/${file}: meta 缺少字段`);
              errors++;
            }

            if (!Array.isArray(data.entries) || data.entries.length === 0) {
              console.error(`❌ ${yearStr}/${batchName}/schools/${file}: entries 为空`);
              errors++;
              continue;
            }

            batchEntries += data.entries.length;
            errors += validateEntries(data.entries, `${yearStr}/${batchName}/schools/${file}`);
          } catch (e) {
            console.error(`❌ ${yearStr}/${batchName}/schools/${file}: 解析失败 - ${e}`);
            errors++;
          }
        }

        console.log(`✅ ${yearStr}/${batchName}/ (新格式): ${index.length} 院校, ${batchEntries} 条记录`);
        totalEntries += batchEntries;
        continue;
      } catch {
        // 没有 index.json，尝试旧格式
      }

      // ---- 旧格式: {group}.json ----
      const files = await fs.readdir(batchPath);
      let hasOldFormat = false;

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        if (file === 'index.json') continue;

        const filePath = path.join(batchPath, file);
        hasOldFormat = true;

        try {
          const raw = await fs.readFile(filePath, 'utf-8');
          const data: AdmissionLineData = JSON.parse(raw);

          totalSchools++;

          if (!data.year || !data.batch || !data.group) {
            console.error(`❌ ${yearStr}/${batchName}/${file}: 缺少 year/batch/group`);
            errors++;
            continue;
          }

          if (!data.meta?.source || !data.meta?.sourceUrl) {
            console.error(`❌ ${yearStr}/${batchName}/${file}: meta 缺少字段`);
            errors++;
          }

          if (!Array.isArray(data.entries) || data.entries.length === 0) {
            console.error(`❌ ${yearStr}/${batchName}/${file}: entries 为空`);
            errors++;
            continue;
          }

          totalEntries += data.entries.length;
          errors += validateEntries(data.entries, `${yearStr}/${batchName}/${file}`);

          console.log(`✅ ${yearStr}/${batchName}/${file} (旧格式): ${data.entries.length} 条记录`);
        } catch (e) {
          console.error(`❌ ${yearStr}/${batchName}/${file}: 解析失败 - ${e}`);
          errors++;
        }
      }

      if (!hasOldFormat) {
        console.log(`⚠️  ${yearStr}/${batchName}/: 未找到数据文件`);
      }
    }
  }

  console.log('\n--- 验证结果 ---');
  console.log(`院校文件数: ${totalSchools}`);
  console.log(`记录数: ${totalEntries}`);
  console.log(`错误数: ${errors}`);

  if (totalEntries === 0) {
    console.log('\n⚠️  未找到任何投档线数据文件。');
    console.log(`   新格式: data/${PROVINCE}/admission-lines/{year}/{batch}/index.json + schools/*.json`);
    console.log(`   旧格式: data/${PROVINCE}/admission-lines/{year}/{batch}/{group}.json`);
  }

  process.exit(errors > 0 ? 1 : 0);
}

validate().catch(console.error);
