import { NextRequest, NextResponse } from 'next/server';
import { searchAllUniversities, getAllLocations } from '@/lib/data/universities';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || undefined;
  const location = searchParams.get('location') || undefined;
  const level = searchParams.get('level') || undefined;
  const tier = searchParams.get('tier') || undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  const [result, locations] = await Promise.all([
    searchAllUniversities({
      keyword,
      location,
      level,
      tier,
      page: isNaN(page) ? 1 : page,
      pageSize: isNaN(pageSize) ? 50 : Math.min(pageSize, 200),
    }),
    getAllLocations(),
  ]);

  return NextResponse.json({ ...result, locations });
}
