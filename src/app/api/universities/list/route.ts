import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const province = searchParams.get('province') || '';
  const level = searchParams.get('level') || '';
  const authority = searchParams.get('authority') || '';

  const dataPath = path.join(process.cwd(), 'data', '_all-schools.json');
  let schools: any[];
  try {
    schools = JSON.parse(await fs.readFile(dataPath, 'utf-8'));
  } catch {
    return NextResponse.json({ universities: [], total: 0 });
  }

  let filtered = schools;

  if (keyword) {
    const kw = keyword.toLowerCase();
    filtered = filtered.filter((s: any) =>
      s.name.toLowerCase().includes(kw) || s.code.includes(keyword)
    );
  }

  if (province) {
    filtered = filtered.filter((s: any) => s.location === province);
  }

  if (level) {
    filtered = filtered.filter((s: any) => s.level === level);
  }

  if (authority) {
    if (authority === '教育部') {
      filtered = filtered.filter((s: any) => s.authority?.includes('教育部'));
    } else if (authority === '地方') {
      filtered = filtered.filter((s: any) => !s.authority?.includes('教育部') && !s.authority?.includes('部') && !s.authority?.includes('委'));
    } else if (authority === '其他部委') {
      filtered = filtered.filter((s: any) => s.authority?.includes('部') || s.authority?.includes('委'));
    }
  }

  const BASE = 'https://gaokao.chsi.com.cn';

  return NextResponse.json({
    universities: filtered.map((s: any) => ({
      ...s,
      chsiUrl: s.schId ? `${BASE}/sch/schoolInfo--schId-${s.schId}.dhtml` : '',
    })),
    total: filtered.length,
  });
}
