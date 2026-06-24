import { NextRequest, NextResponse } from 'next/server';
import { loadAdmissionData, scanAvailableBatches, computeStats, groupByUniversity } from '@/lib/data/admission';
import { AdmissionRecord } from '@/types/admission-record';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const province = searchParams.get('province') || 'hebei';
  const year = parseInt(searchParams.get('year') || '2025');
  const batch = searchParams.get('batch') || '';
  const group = searchParams.get('group') || '物理类';
  const keyword = searchParams.get('keyword') || '';
  const type = searchParams.get('type') || '';
  const sort = searchParams.get('sort') || 'score';
  const view = searchParams.get('view') || 'university'; // 'university' | 'detail'
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  // 扫描可用批次
  const available = await scanAvailableBatches(province);

  // 如果没指定批次，用第一个可用的
  const targetBatch = batch || available[0]?.batch || '';
  if (!targetBatch) {
    return NextResponse.json({ records: [], total: 0, stats: null, available: [] });
  }

  const data = await loadAdmissionData(province, year, targetBatch, group);
  if (!data) {
    return NextResponse.json({ records: [], total: 0, stats: null, available });
  }

  let records = data.records;

  // 按计划类型筛选
  if (type) {
    records = records.filter(r => r.universityName.includes(type));
  }

  // 关键词搜索
  if (keyword) {
    const kw = keyword.toLowerCase();
    records = records.filter(r =>
      r.universityName.toLowerCase().includes(kw) ||
      r.majorName.toLowerCase().includes(kw) ||
      r.universityCode.includes(kw)
    );
  }

  // 统计（基于筛选后的数据）
  const stats = computeStats(records);

  // 排序
  if (sort === 'volunteer') {
    records.sort((a, b) => a.volunteerNum - b.volunteerNum);
  } else if (sort === 'volunteer_desc') {
    records.sort((a, b) => b.volunteerNum - a.volunteerNum);
  } else {
    records.sort((a, b) => b.minScore - a.minScore);
  }

  if (view === 'university') {
    // 院校视图：分组 + 分页
    const universities = groupByUniversity(records);
    const total = universities.length;
    const start = (page - 1) * pageSize;
    const paged = universities.slice(start, start + pageSize);
    return NextResponse.json({ universities: paged, total, stats, available });
  }

  // 明细视图：分页
  const total = records.length;
  const start = (page - 1) * pageSize;
  const paged = records.slice(start, start + pageSize);
  return NextResponse.json({ records: paged, total, stats, available });
}
