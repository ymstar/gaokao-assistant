import { NextRequest, NextResponse } from 'next/server';
import { queryAdmissionScores } from '@/lib/db/gaokao-admission';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const schoolId = parseInt(code, 10);

  if (isNaN(schoolId)) {
    return NextResponse.json({ error: 'Invalid school code' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;
  const batch_name = searchParams.get('batch_name') || undefined;
  const category_name = searchParams.get('category_name') || undefined;
  const keyword = searchParams.get('keyword') || undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  const result = queryAdmissionScores({
    school_id: schoolId,
    year,
    batch_name,
    category_name,
    keyword,
    page: isNaN(page) ? 1 : page,
    pageSize: isNaN(pageSize) ? 50 : Math.min(pageSize, 200),
  });

  return NextResponse.json(result);
}
