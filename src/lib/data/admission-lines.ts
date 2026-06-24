import { AdmissionLineData } from '@/types/admission-line';
import { SubjectGroup } from '@/types/score-rank';
import { getCachedData, setCachedData } from '@/lib/data/cache';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * 加载单个投档线数据文件
 * 文件路径: data/{province}/admission-lines/{year}/{batch}/{group}.json
 */
export async function loadAdmissionLineData(
  province: string,
  year: number,
  batch: string,
  group: SubjectGroup
): Promise<AdmissionLineData | null> {
  const cacheKey = `admission-line:${province}:${year}:${batch}:${group}`;
  const cached = getCachedData<AdmissionLineData>(cacheKey);
  if (cached) return cached;

  const dataPath = path.join(
    process.cwd(),
    'data',
    province,
    'admission-lines',
    year.toString(),
    batch,
    `${group}.json`
  );

  try {
    const data = await fs.readFile(dataPath, 'utf-8');
    const parsed = JSON.parse(data);
    setCachedData(cacheKey, parsed);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * 加载指定省份所有投档线数据
 * 支持按年份和科类筛选
 */
export async function loadAllAdmissionLineData(
  province: string,
  years?: number[],
  group?: SubjectGroup
): Promise<AdmissionLineData[]> {
  const dataDir = path.join(process.cwd(), 'data', province, 'admission-lines');

  try {
    const yearDirs = await fs.readdir(dataDir);
    const allData: AdmissionLineData[] = [];

    for (const yearStr of yearDirs) {
      const yearNum = parseInt(yearStr);
      if (isNaN(yearNum)) continue;
      if (years && !years.includes(yearNum)) continue;

      const yearPath = path.join(dataDir, yearStr);
      const yearStat = await fs.stat(yearPath);
      if (!yearStat.isDirectory()) continue;

      const batchDirs = await fs.readdir(yearPath);
      for (const batchName of batchDirs) {
        const batchPath = path.join(yearPath, batchName);
        const batchStat = await fs.stat(batchPath);
        if (!batchStat.isDirectory()) continue;

        const files = await fs.readdir(batchPath);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          const fileGroup = file.replace('.json', '') as SubjectGroup;
          if (group && fileGroup !== group) continue;

          const data = await loadAdmissionLineData(province, yearNum, batchName, fileGroup);
          if (data) allData.push(data);
        }
      }
    }

    return allData;
  } catch {
    return [];
  }
}
