import { NextRequest, NextResponse } from 'next/server';
import {
  searchAllUniversities,
  getAllLocations,
  getAllCityTiers,
  getAllTiers,
} from '@/lib/data/universities';
import { CityTier } from '@/types/university';

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

  const [result, locations, cityTiers, tiers] = await Promise.all([
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
  ]);

  return NextResponse.json({
    ...result,
    locations,
    cityTiers,
    tiers,
  });
}
