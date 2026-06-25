/**
 * 投档线录取数据加载器
 *
 * 存储格式:
 *   data/{province}/admission-lines/{year}/{batch}/
 *     index.json          — [{universityCode, universityName, entryCount}]
 *     schools/{code}.json — {year, batch, group, entries: AdmissionLineEntry[], meta}
 *
 * LRU 缓存避免频繁磁盘读取。
 */
import { AdmissionLineData, AdmissionLineEntry } from '@/types/admission-line';
import { SubjectGroup } from '@/types/score-rank';
import { getCachedData, setCachedData } from '@/lib/data/cache';
import { promises as fs } from 'fs';
import path from 'path';

// ============================================================
// LRU Cache
// ============================================================

const schoolCache = new Map<string, { data: AdmissionLineData; ts: number }>();
const MAX_CACHE = 50;

function cacheGet(key: string): AdmissionLineData | null {
  const e = schoolCache.get(key);
  if (!e) return null;
  schoolCache.delete(key);
  schoolCache.set(key, e);
  return e.data;
}

function cacheSet(key: string, data: AdmissionLineData): void {
  if (schoolCache.size >= MAX_CACHE) {
    const oldest = schoolCache.keys().next().value;
    if (oldest) schoolCache.delete(oldest);
  }
  schoolCache.set(key, { data, ts: Date.now() });
}

// ============================================================
// Index
// ============================================================

export interface UniversityLineIndex {
  universityCode: string;
  universityName: string;
  entryCount: number;
}

/**
 * 加载批次索引（轻量，几十 KB）
 */
export async function loadAdmissionLineIndex(
  province: string,
  year: number,
  batch: string
): Promise<UniversityLineIndex[]> {
  const cacheKey = `al-index:${province}:${year}:${batch}`;
  const cached = getCachedData<UniversityLineIndex[]>(cacheKey);
  if (cached) return cached;

  const indexPath = path.join(
    process.cwd(),
    'data', province, 'admission-lines',
    String(year), batch, 'index.json'
  );

  try {
    const raw = await fs.readFile(indexPath, 'utf-8');
    const index: UniversityLineIndex[] = JSON.parse(raw);
    setCachedData(cacheKey, index);
    return index;
  } catch {
    // 兼容旧格式: 读取单文件
    return [];
  }
}

/**
 * 加载单校投档线
 */
export async function loadSchoolAdmissionLine(
  province: string,
  year: number,
  batch: string,
  universityCode: string
): Promise<AdmissionLineData | null> {
  const cacheKey = `al:${province}:${year}:${batch}:${universityCode}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const dataPath = path.join(
    process.cwd(),
    'data', province, 'admission-lines',
    String(year), batch, 'schools', `${universityCode}.json`
  );

  try {
    const raw = await fs.readFile(dataPath, 'utf-8');
    const data: AdmissionLineData = JSON.parse(raw);
    cacheSet(cacheKey, data);
    return data;
  } catch {
    return null;
  }
}

/**
 * 加载整个批次的全部投档线（用于匹配算法）
 */
export async function loadBatchAdmissionLines(
  province: string,
  year: number,
  batch: string
): Promise<AdmissionLineData | null> {
  const cacheKey = `al-batch:${province}:${year}:${batch}`;
  const cached = getCachedData<AdmissionLineData>(cacheKey);
  if (cached) return cached;

  const index = await loadAdmissionLineIndex(province, year, batch);
  if (index.length === 0) {
    // 尝试旧格式
    return loadAdmissionLineDataLegacy(province, year, batch);
  }

  const allEntries: AdmissionLineEntry[] = [];
  let group = '';

  for (const uni of index) {
    const school = await loadSchoolAdmissionLine(
      province, year, batch, uni.universityCode
    );
    if (school) {
      allEntries.push(...school.entries);
      if (!group) group = school.group;
    }
  }

  const data: AdmissionLineData = {
    year,
    batch,
    group: (group || '物理类') as SubjectGroup,
    entries: allEntries,
    meta: {
      source: '河北省教育考试院',
      sourceUrl: 'https://gk.hebeea.edu.cn:88/xxcx/xxcxzx/lnwc',
      publishedAt: '',
      quality: 'official',
    },
  };

  // 注入 year 字段到每条 entry，方便 matchSchools 按 year 跨年分组
  for (const entry of allEntries) {
    (entry as unknown as Record<string, unknown>).year = year;
  }

  setCachedData(cacheKey, data);
  return data;
}

// ---- 旧格式兼容 ----

async function loadAdmissionLineDataLegacy(
  province: string,
  year: number,
  batch: string
): Promise<AdmissionLineData | null> {
  const dataDir = path.join(
    process.cwd(), 'data', province, 'admission-lines', String(year), batch
  );

  try {
    const files = await fs.readdir(dataDir);
    for (const file of files) {
      if (!file.endsWith('.json') || file === 'index.json') continue;
      const filePath = path.join(dataDir, file);
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {
    // not found
  }

  return null;
}

/**
 * 加载指定批次 — 兼容旧的单文件格式
 */
export async function loadAdmissionLineData(
  province: string,
  year: number,
  batch: string,
  group: SubjectGroup
): Promise<AdmissionLineData | null> {
  return loadBatchAdmissionLines(province, year, batch);
}

/**
 * 加载指定省份所有投档线数据
 */
export async function loadAllAdmissionLineData(
  province: string,
  years?: number[],
  group?: SubjectGroup
): Promise<AdmissionLineData[]> {
  const dataDir = path.join(process.cwd(), 'data', province, 'admission-lines');
  const allData: AdmissionLineData[] = [];

  try {
    const yearDirs = await fs.readdir(dataDir);
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

        const data = await loadBatchAdmissionLines(province, yearNum, batchName);
        if (data) {
          if (group && !data.group.includes(group)) continue;
          allData.push(data);
        }
      }
    }
  } catch {
    // no data
  }

  return allData;
}
