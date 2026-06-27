import { NextRequest, NextResponse } from 'next/server';
import {
  searchSchools,
  getAllProvinces,
  getAllTiersList,
} from '@/lib/db/gaokao-schools';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || undefined;
  const location = searchParams.get('location') || undefined;
  const level = searchParams.get('level') || undefined;
  const tier = searchParams.get('tier') || undefined;
  const sort = searchParams.get('sort') || undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  const result = searchSchools({
    keyword,
    province: location,
    level,
    tier,
    sort,
    page: isNaN(page) ? 1 : page,
    pageSize: isNaN(pageSize) ? 50 : Math.min(pageSize, 3000),
  });

  const provinces = getAllProvinces();
  const tiers = getAllTiersList();

  return NextResponse.json({
    universities: result.schools,
    total: result.total,
    locations: provinces,
    cityTiers: [],
    tiers,
    planSummaryMap: {},
    lineSummaryMap: {},
  });
}