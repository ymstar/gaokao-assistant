import { NextRequest, NextResponse } from 'next/server';
import { loadBatchPlans, loadAdmissionPlanIndex, scanAvailablePlans, PlanRow } from '@/lib/data/admission-plans';
import { getCachedData, setCachedData } from '@/lib/data/cache';

// ============================================================
// 统计辅助
// ============================================================

function computeStats(entries: PlanRow[]) {
  // 院校数
  const uniSet = new Set(entries.map(e => e.universityCode));

  // 选科要求分布
  const subjectDist: Record<string, number> = {};
  entries.forEach(e => {
    const s = e.subjectRequirement || '不限';
    subjectDist[s] = (subjectDist[s] || 0) + 1;
  });

  // 学费分布（分段）
  const tuitionBuckets: Record<string, number> = {};
  entries.forEach(e => {
    if (e.tuition > 0) {
      const bucket = e.tuition <= 5000 ? '≤5000' :
        e.tuition <= 10000 ? '5001-10000' :
        e.tuition <= 20000 ? '10001-20000' :
        e.tuition <= 50000 ? '20001-50000' : '>50000';
      tuitionBuckets[bucket] = (tuitionBuckets[bucket] || 0) + 1;
    }
  });

  // 学制分布
  const durationDist: Record<string, number> = {};
  entries.forEach(e => {
    const d = `${e.duration}年`;
    durationDist[d] = (durationDist[d] || 0) + 1;
  });

  // Top 院校（按总计划数）
  const uniPlans = new Map<string, { name: string; planCount: number; entryCount: number }>();
  entries.forEach(e => {
    const key = e.universityCode;
    if (!uniPlans.has(key)) uniPlans.set(key, { name: e.universityName, planCount: 0, entryCount: 0 });
    const u = uniPlans.get(key)!;
    u.planCount += e.planCount;
    u.entryCount += 1;
  });
  const topSchools = Array.from(uniPlans.entries())
    .map(([code, v]) => ({ universityCode: code, ...v }))
    .sort((a, b) => b.planCount - a.planCount)
    .slice(0, 30);

  return {
    universityCount: uniSet.size,
    entryCount: entries.length,
    totalPlans: entries.reduce((s, e) => s + e.planCount, 0),
    subjectDistribution: subjectDist,
    tuitionDistribution: tuitionBuckets,
    durationDistribution: durationDist,
    topSchools,
  };
}

// ============================================================
// GET
// ============================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const province = searchParams.get('province') || 'hebei';
  const year = parseInt(searchParams.get('year') || '2026');
  const batch = searchParams.get('batch') || '';
  const keyword = searchParams.get('keyword') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');
  const sort = searchParams.get('sort') || 'plan_desc';

  // 扫描可用批次
  const available = await scanAvailablePlans(province);
  const targetBatch = batch || available[0]?.batch || '';
  if (!targetBatch) {
    return NextResponse.json({ entries: [], total: 0, available: [] });
  }

  // 加载全量数据
  const cacheKey = `enrollment-stats:${province}:${year}:${targetBatch}`;
  let allEntries: PlanRow[] | null = null;

  const cached = getCachedData<{ entries: PlanRow[]; stats: ReturnType<typeof computeStats> }>(cacheKey);
  if (cached) {
    allEntries = cached.entries;
  }

  if (!allEntries) {
    const data = await loadBatchPlans(province, year, targetBatch);
    if (!data) {
      return NextResponse.json({ entries: [], total: 0, available });
    }
    allEntries = data.entries;
    const stats = computeStats(allEntries);
    setCachedData(cacheKey, { entries: allEntries, stats });
  }

  // 重新计算统计（缓存命中时直接用缓存的 stats）
  const cachedStats = getCachedData<{ entries: PlanRow[]; stats: ReturnType<typeof computeStats> }>(cacheKey);
  const stats = cachedStats?.stats || computeStats(allEntries);

  // 关键字搜索
  let entries = allEntries;
  if (keyword) {
    const kw = keyword.toLowerCase();
    entries = entries.filter(e =>
      e.universityName.toLowerCase().includes(kw) ||
      e.majorName.toLowerCase().includes(kw) ||
      e.universityCode.includes(keyword)
    );
  }

  // 排序
  if (sort === 'plan_asc') {
    entries.sort((a, b) => a.planCount - b.planCount);
  } else if (sort === 'tuition_asc') {
    entries.sort((a, b) => a.tuition - b.tuition);
  } else if (sort === 'tuition_desc') {
    entries.sort((a, b) => b.tuition - a.tuition);
  } else {
    // plan_desc default
    entries.sort((a, b) => b.planCount - a.planCount);
  }

  // 分页
  const total = entries.length;
  const start = (page - 1) * pageSize;
  const paged = entries.slice(start, start + pageSize);

  return NextResponse.json({
    entries: paged,
    total,
    stats,
    available,
    batch: targetBatch,
    year,
  });
}
