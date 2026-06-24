import { NextRequest, NextResponse } from 'next/server';
import { searchUniversities } from '@/lib/data/universities';
import { SubjectGroup } from '@/types/score-rank';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ province: string }> }
) {
  const { province } = await params;
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || undefined;
  const level = searchParams.get('level') || undefined;
  const year = parseInt(searchParams.get('year') || '0');
  const group = (searchParams.get('group') as SubjectGroup) || undefined;

  const universities = await searchUniversities(
    province,
    isNaN(year) ? 0 : year,
    group || '物理类',
    keyword
  );

  // Filter by level if specified
  let filtered = universities;
  if (level) {
    filtered = filtered.filter(u => u.level === level);
  }

  return NextResponse.json({ universities: filtered });
}
