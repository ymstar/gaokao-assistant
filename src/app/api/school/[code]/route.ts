import { NextRequest, NextResponse } from 'next/server';
import { loadSchoolPlan, scanAvailablePlans } from '@/lib/data/admission-plans';
import { loadSchoolAdmissionLine } from '@/lib/data/admission-lines';
import { getCachedData, setCachedData } from '@/lib/data/cache';
import { promises as fs } from 'fs';
import path from 'path';

// 院校基本信息缓存
let uniCache: Record<string, Record<string, unknown>> | null = null;

async function loadUniversities(): Promise<Record<string, Record<string, unknown>>> {
  if (uniCache) return uniCache;
  const cacheKey = 'universities:common';
  const cached = getCachedData<Record<string, Record<string, unknown>>>(cacheKey);
  if (cached) {
    uniCache = cached;
    return cached;
  }
  const uniPath = path.join(process.cwd(), 'data', 'hebei', 'universities', '_common', '院校基本信息.json');
  try {
    const raw = await fs.readFile(uniPath, 'utf-8');
    const list: Record<string, unknown>[] = JSON.parse(raw);
    const map: Record<string, Record<string, unknown>> = {};
    for (const u of list) {
      map[String(u.code)] = u;
    }
    setCachedData(cacheKey, map);
    uniCache = map;
    return map;
  } catch {
    return {};
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { searchParams } = new URL(request.url);
  const province = searchParams.get('province') || 'hebei';

  // 1. 扫描可用批次
  const planBatches = await scanAvailablePlans(province);

  // 2. 查找该校在哪些批次中有招生计划
  const planResults: {
    year: number; batch: string; entryCount: number; totalPlans: number;
    entries: Record<string, unknown>[];
  }[] = [];

  for (const pb of planBatches) {
    const schoolPlan = await loadSchoolPlan(province, pb.year, pb.batch, code);
    if (schoolPlan && schoolPlan.entries.length > 0) {
      planResults.push({
        year: pb.year,
        batch: pb.batch,
        entryCount: schoolPlan.entries.length,
        totalPlans: schoolPlan.entries.reduce((s, e) => s + e.planCount, 0),
        entries: schoolPlan.entries as unknown as Record<string, unknown>[],
      });
    }
  }

  // 3. 查找该校在哪些年份/批次中有录取数据
  const lineResults: {
    year: number; batch: string; entryCount: number; entries: Record<string, unknown>[];
  }[] = [];

  const dataDir = path.join(process.cwd(), 'data', province, 'admission-lines');
  try {
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

        const schoolLine = await loadSchoolAdmissionLine(province, yearNum, batch, code);
        if (schoolLine && schoolLine.entries.length > 0) {
          lineResults.push({
            year: yearNum,
            batch,
            entryCount: schoolLine.entries.length,
            entries: schoolLine.entries as unknown as Record<string, unknown>[],
          });
        }
      }
    }
  } catch { /* no data */ }

  // 4. 查找院校基本信息
  const uniMap = await loadUniversities();
  const universityInfo = uniMap[code] || { name: code };

  return NextResponse.json({
    code,
    university: universityInfo,
    plans: planResults,
    lines: lineResults,
  });
}
