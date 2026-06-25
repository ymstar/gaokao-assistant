/**
 * 招生计划数据加载器
 *
 * 支持分片存储格式：
 * - index.json: { universityCode, universityName, entryCount, totalPlans }[]
 * - schools/{code}.json: 单校 AdmissionPlanData
 *
 * 内存缓存 + LRU 淘汰，避免频繁读取磁盘。
 * 单次加载单校文件（~6KB），而不是全量 7MB。
 */
import { getCachedData, setCachedData } from '@/lib/data/cache';
import { promises as fs } from 'fs';
import path from 'path';

// ============================================================
// Types
// ============================================================

export interface PlanRow {
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

export interface AdmissionPlanData {
  year: number;
  batch: string;
  group: string;
  entries: PlanRow[];
  meta: {
    source: string;
    sourceUrl: string;
    publishedAt: string;
    quality: 'official' | 'verified' | 'unverified';
    updatedAt?: string;
    totalEntries?: number;
    totalPlans?: number;
    universityCount?: number;
  };
}

export interface UniversityPlanIndex {
  universityCode: string;
  universityName: string;
  entryCount: number;
  totalPlans: number;
}

// ============================================================
// 缓存
// ============================================================

/** LRU 缓存：最多缓存 50 个院校文件 */
const schoolCache = new Map<
  string,
  { data: AdmissionPlanData; ts: number }
>();
const MAX_CACHE_SIZE = 50;

function cacheGet(key: string): AdmissionPlanData | null {
  const entry = schoolCache.get(key);
  if (!entry) return null;
  // 刷新时间戳（LRU 近似）
  schoolCache.delete(key);
  schoolCache.set(key, entry);
  return entry.data;
}

function cacheSet(key: string, data: AdmissionPlanData): void {
  if (schoolCache.size >= MAX_CACHE_SIZE) {
    // 删除最旧的条目
    const oldest = schoolCache.keys().next().value;
    if (oldest) schoolCache.delete(oldest);
  }
  schoolCache.set(key, { data, ts: Date.now() });
}

// ============================================================
// API
// ============================================================

/**
 * 加载招生计划数据目录
 * @returns 包含 index 信息的数据清单
 */
export async function loadAdmissionPlanIndex(
  province: string,
  year: number,
  batch: string
): Promise<{
  year: number;
  batch: string;
  available: boolean;
  totalEntries: number;
  totalPlans: number;
  universityCount: number;
  universities: UniversityPlanIndex[];
}> {
  const dataDir = path.join(
    process.cwd(),
    'data',
    province,
    'admission-plans',
    String(year),
    batch
  );

  try {
    const indexPath = path.join(dataDir, 'index.json');
    const raw = await fs.readFile(indexPath, 'utf-8');
    const universities: UniversityPlanIndex[] = JSON.parse(raw);

    const totalEntries = universities.reduce(
      (s, u) => s + u.entryCount,
      0
    );
    const totalPlans = universities.reduce(
      (s, u) => s + u.totalPlans,
      0
    );

    return {
      year,
      batch,
      available: true,
      totalEntries,
      totalPlans,
      universityCount: universities.length,
      universities,
    };
  } catch {
    return {
      year,
      batch,
      available: false,
      totalEntries: 0,
      totalPlans: 0,
      universityCount: 0,
      universities: [],
    };
  }
}

/**
 * 加载单所院校的招生计划
 * @param universityCode 院校代号
 */
export async function loadSchoolPlan(
  province: string,
  year: number,
  batch: string,
  universityCode: string
): Promise<AdmissionPlanData | null> {
  const cacheKey = `plan:${province}:${year}:${batch}:${universityCode}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const dataPath = path.join(
    process.cwd(),
    'data',
    province,
    'admission-plans',
    String(year),
    batch,
    'schools',
    `${universityCode}.json`
  );

  try {
    const raw = await fs.readFile(dataPath, 'utf-8');
    const data: AdmissionPlanData = JSON.parse(raw);
    cacheSet(cacheKey, data);
    return data;
  } catch {
    return null;
  }
}

/**
 * 加载整个批次的全部招生计划（用于搜索/查询场景）
 *
 * 注意：数据量大时（20k+ 条）不要频繁调用；
 * 优先使用 loadSchoolPlan 或 loadAdmissionPlanIndex + 筛选。
 */
export async function loadBatchPlans(
  province: string,
  year: number,
  batch: string
): Promise<AdmissionPlanData | null> {
  const cacheKey = `plan:${province}:${year}:${batch}:all`;
  const cached = getCachedData<AdmissionPlanData>(cacheKey);
  if (cached) return cached;

  const index = await loadAdmissionPlanIndex(province, year, batch);
  if (!index.available) return null;

  const allEntries: PlanRow[] = [];
  let meta: AdmissionPlanData['meta'] | null = null;

  for (const uni of index.universities) {
    const school = await loadSchoolPlan(
      province,
      year,
      batch,
      uni.universityCode
    );
    if (school) {
      allEntries.push(...school.entries);
      if (!meta) meta = school.meta;
    }
  }

  if (!meta) return null;

  const result: AdmissionPlanData = {
    year,
    batch,
    group: (meta as Record<string, unknown>).group as string || '',
    entries: allEntries,
    meta,
  };

  setCachedData(cacheKey, result);
  return result;
}

/**
 * 按院校名称或代号搜索招生计划
 * @param keyword 搜索关键词
 * @param limit 返回院校数上限
 */
export async function searchPlans(
  province: string,
  year: number,
  batch: string,
  keyword: string,
  limit = 20
): Promise<
  {
    universityCode: string;
    universityName: string;
    entryCount: number;
    totalPlans: number;
    entries: PlanRow[];
  }[]
> {
  const index = await loadAdmissionPlanIndex(province, year, batch);
  if (!index.available) return [];

  const kw = keyword.toLowerCase();
  const matched = index.universities.filter(
    (u) =>
      u.universityName.toLowerCase().includes(kw) ||
      u.universityCode.includes(keyword)
  );

  const results: {
    universityCode: string;
    universityName: string;
    entryCount: number;
    totalPlans: number;
    entries: PlanRow[];
  }[] = [];

  for (const uni of matched.slice(0, limit)) {
    const school = await loadSchoolPlan(
      province,
      year,
      batch,
      uni.universityCode
    );
    results.push({
      universityCode: uni.universityCode,
      universityName: uni.universityName,
      entryCount: uni.entryCount,
      totalPlans: uni.totalPlans,
      entries: school?.entries || [],
    });
  }

  return results;
}

/**
 * 扫描所有可用的招生计划批次
 */
export async function scanAvailablePlans(
  province: string
): Promise<
  { year: number; batch: string; universityCount: number }[]
> {
  const dataDir = path.join(
    process.cwd(),
    'data',
    province,
    'admission-plans'
  );

  try {
    const years = await fs.readdir(dataDir);
    const results: {
      year: number;
      batch: string;
      universityCount: number;
    }[] = [];

    for (const yearStr of years) {
      const yearPath = path.join(dataDir, yearStr);
      const yearStat = await fs.stat(yearPath);
      if (!yearStat.isDirectory()) continue;

      const batches = await fs.readdir(yearPath);
      for (const batch of batches) {
        const batchPath = path.join(yearPath, batch);
        const batchStat = await fs.stat(batchPath);
        if (!batchStat.isDirectory()) continue;

        // 读 index.json 获取院校数
        try {
          const indexRaw = await fs.readFile(
            path.join(batchPath, 'index.json'),
            'utf-8'
          );
          const index: UniversityPlanIndex[] = JSON.parse(indexRaw);
          results.push({
            year: parseInt(yearStr),
            batch,
            universityCount: index.length,
          });
        } catch {
          results.push({
            year: parseInt(yearStr),
            batch,
            universityCount: 0,
          });
        }
      }
    }

    return results;
  } catch {
    return [];
  }
}
