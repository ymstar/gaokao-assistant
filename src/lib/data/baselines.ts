import { ProvinceBaselineData, ProvinceBaselineEntry } from '@/types/baseline';
import { SubjectGroup } from '@/types/score-rank';
import { getCachedData, setCachedData } from '@/lib/data/cache';
import { promises as fs } from 'fs';
import path from 'path';

const CACHE_KEY = 'province-baselines';

/** 加载指定省份的强基线数据 */
export async function loadProvinceBaselines(
  province: string
): Promise<ProvinceBaselineData | null> {
  const cacheKey = `${CACHE_KEY}:${province}`;
  const cached = getCachedData<ProvinceBaselineData>(cacheKey);
  if (cached) return cached;

  const dataPath = path.join(
    process.cwd(),
    'data',
    province,
    'baselines',
    'baselines.json'
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

/** 按年份和科类筛选强基线数据 */
export async function getBaselinesForYear(
  province: string,
  year: number,
  group: SubjectGroup
): Promise<ProvinceBaselineEntry | null> {
  const data = await loadProvinceBaselines(province);
  if (!data) return null;
  return data.entries.find((e) => e.year === year && e.group === group) ?? null;
}
