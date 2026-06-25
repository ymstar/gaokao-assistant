import { NextRequest, NextResponse } from 'next/server';
import {
  searchAllUniversities,
  getAllLocations,
  getAllCityTiers,
  getAllTiers,
} from '@/lib/data/universities';
import { CityTier } from '@/types/university';
import { loadAdmissionPlanIndex } from '@/lib/data/admission-plans';
import { loadAdmissionLineIndex } from '@/lib/data/admission-lines';
import { getCachedData, setCachedData } from '@/lib/data/cache';

/** 批量加载招生计划摘要 map: code → { entryCount, totalPlans } */
async function loadPlanSummaryMap(): Promise<Record<string, { entryCount: number; totalPlans: number }>> {
  const cacheKey = 'plan-summary:hebei:2026';
  const cached = getCachedData<Record<string, { entryCount: number; totalPlans: number }>>(cacheKey);
  if (cached) return cached;

  const map: Record<string, { entryCount: number; totalPlans: number }> = {};
  try {
    const batches = ['本科批', '本科提前批B段'];
    for (const batch of batches) {
      const index = await loadAdmissionPlanIndex('hebei', 2026, batch);
      for (const u of index.universities) {
        if (map[u.universityCode]) {
          map[u.universityCode].entryCount += u.entryCount;
          map[u.universityCode].totalPlans += u.totalPlans;
        } else {
          map[u.universityCode] = { entryCount: u.entryCount, totalPlans: u.totalPlans };
        }
      }
    }
  } catch { /* no data */ }
  setCachedData(cacheKey, map);
  return map;
}

/** 批量加载历年录取摘要 map: code → { years, minScore, minRank } */
async function loadLineSummaryMap(): Promise<Record<string, { years: number[]; minScore: number; minRank: number }>> {
  const cacheKey = 'line-summary:hebei';
  const cached = getCachedData<Record<string, { years: number[]; minScore: number; minRank: number }>>(cacheKey);
  if (cached) return cached;

  const map: Record<string, { years: number[]; minScore: number; minRank: number }> = {};
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const dataDir = path.join(process.cwd(), 'data', 'hebei', 'admission-lines');
    const years = await fs.readdir(dataDir);
    for (const yearStr of years) {
      const yearNum = parseInt(yearStr);
      if (isNaN(yearNum)) continue;
      const yearPath = path.join(dataDir, yearStr);
      const yearStat = await fs.stat(yearPath);
      if (!yearStat.isDirectory()) continue;
      const batches = await fs.readdir(yearPath);
      for (const batch of batches) {
        const batchPath = path.join(yearPath, batch);
        const batchStat = await fs.stat(batchPath);
        if (!batchStat.isDirectory()) continue;
        const index = await loadAdmissionLineIndex('hebei', yearNum, batch);
        for (const u of index) {
          if (map[u.universityCode]) {
            if (!map[u.universityCode].years.includes(yearNum)) {
              map[u.universityCode].years.push(yearNum);
            }
          } else {
            map[u.universityCode] = { years: [yearNum], minScore: 0, minRank: 0 };
          }
        }
      }
    }
  } catch { /* no data */ }
  setCachedData(cacheKey, map);
  return map;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || undefined;
  const location = searchParams.get('location') || undefined;
  const level = searchParams.get('level') || undefined;
  const tier = searchParams.get('tier') || undefined;
  const cityTier = searchParams.get('cityTier') as CityTier | undefined || undefined;
  const sort = searchParams.get('sort') || undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  const [result, locations, cityTiers, tiers, planSummaryMap, lineSummaryMap] = await Promise.all([
    searchAllUniversities({
      keyword,
      location,
      level,
      tier,
      cityTier,
      sort,
      page: isNaN(page) ? 1 : page,
      pageSize: isNaN(pageSize) ? 50 : Math.min(pageSize, 3000),
    }),
    getAllLocations(),
    getAllCityTiers(),
    getAllTiers(),
    loadPlanSummaryMap(),
    loadLineSummaryMap(),
  ]);

  return NextResponse.json({
    ...result,
    locations,
    cityTiers,
    tiers,
    planSummaryMap,
    lineSummaryMap,
  });
}
