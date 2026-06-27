import { NextRequest, NextResponse } from 'next/server';
import { queryGlobalAdmissionPlans, getSchoolNames } from '@/lib/db/gaokao-admission';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;
  const batch_name = searchParams.get('batch_name') || undefined;
  const category_name = searchParams.get('category_name') || undefined;
  const zslx_name = searchParams.get('zslx_name') || undefined;
  const level2_name = searchParams.get('level2_name') || undefined;
  const keyword = searchParams.get('keyword') || undefined;
  const sort = (searchParams.get('sort') || 'plan_desc') as 'plan_desc' | 'plan_asc' | 'tuition_desc' | 'tuition_asc';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  const result = queryGlobalAdmissionPlans({
    year: isNaN(year as number) ? undefined : year,
    batch_name,
    category_name,
    zslx_name,
    level2_name,
    keyword,
    sort,
    page: isNaN(page) ? 1 : page,
    pageSize: isNaN(pageSize) ? 50 : Math.min(pageSize, 200),
  });

  // 批量获取学校名称
  const schoolIds = [...new Set(result.entries.map(e => e.school_id))];
  const nameMap = getSchoolNames(schoolIds);

  // 将名称映射到结果中
  const entries = result.entries.map(e => ({
    ...e,
    universityName: nameMap.get(e.school_id) || `学校${e.school_id}`,
  }));

  // 为 topSchools 补名称
  const topSchoolIds = result.stats.topSchools.map(s => s.school_id);
  const topNameMap = getSchoolNames(topSchoolIds);
  const topSchools = result.stats.topSchools.map(s => ({
    ...s,
    name: topNameMap.get(s.school_id) || `学校${s.school_id}`,
  }));

  return NextResponse.json({
    entries,
    total: result.total,
    years: result.years,
    batchNames: result.batchNames,
    categoryNames: result.categoryNames,
    zslxNames: result.zslxNames,
    level2Names: result.level2Names,
    stats: { ...result.stats, topSchools },
  });
}