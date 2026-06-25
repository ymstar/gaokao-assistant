import { NextRequest, NextResponse } from 'next/server';
import { loadBatchAdmissionLines, loadAdmissionLineIndex } from '@/lib/data/admission-lines';
import { AdmissionLineEntry } from '@/types/admission-line';
import { promises as fs } from 'fs';
import path from 'path';

// ============================================================
// 辅助
// ============================================================

/** 从院校名称/专业组名提取计划类型 */
function extractType(name: string, majorGroup: string): string {
  const combined = name + majorGroup;
  if (combined.includes('国家专项')) return '国家专项';
  if (combined.includes('公费师范')) return '公费师范';
  if (combined.includes('优师专项')) return '优师专项';
  if (combined.includes('免费医学') || combined.includes('免费定向')) return '免费医学定向';
  if (combined.includes('高校专项')) return '高校专项';
  if (combined.includes('地方专项')) return '地方专项';
  return '普通';
}

/** 扫描可用批次 */
async function scanAvailableBatches(province: string) {
  const dataDir = path.join(process.cwd(), 'data', province, 'admission-lines');
  const result: { year: number; batch: string; group: string }[] = [];
  try {
    const years = await fs.readdir(dataDir);
    for (const yearStr of years) {
      const yearPath = path.join(dataDir, yearStr);
      const yearStat = await fs.stat(yearPath);
      if (!yearStat.isDirectory()) continue;
      const batches = await fs.readdir(yearPath);
      for (const batch of batches) {
        const batchPath = path.join(yearPath, batch);
        const batchStat = await fs.stat(batchPath);
        if (!batchStat.isDirectory()) continue;
        // 检查是否有数据
        const index = await loadAdmissionLineIndex(province, parseInt(yearStr), batch);
        if (index.length > 0) {
          // 读第一个学校获取 group
          const firstSchool = await import('@/lib/data/admission-lines').then(m =>
            m.loadSchoolAdmissionLine(province, parseInt(yearStr), batch, index[0].universityCode)
          );
          result.push({ year: parseInt(yearStr), batch, group: firstSchool?.group || '物理类' });
        }
      }
    }
  } catch { /* no data */ }
  return result;
}

// ============================================================
// GET
// ============================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const province = searchParams.get('province') || 'hebei';
  const year = parseInt(searchParams.get('year') || '2025');
  const batch = searchParams.get('batch') || '';
  const keyword = searchParams.get('keyword') || '';
  const type = searchParams.get('type') || '';
  const sort = searchParams.get('sort') || 'score_desc';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  // 扫描可用批次
  const available = await scanAvailableBatches(province);

  // 如果没指定批次，用最新可用的
  const targetBatch = batch || available[available.length - 1]?.batch || '';
  if (!targetBatch) {
    return NextResponse.json({ records: [], total: 0, available: [] });
  }

  // 加载数据
  const data = await loadBatchAdmissionLines(province, year, targetBatch);
  if (!data) {
    return NextResponse.json({ records: [], total: 0, available });
  }

  let records: AdmissionLineEntry[] = data.entries;

  // 关键词搜索
  if (keyword) {
    const kw = keyword.toLowerCase();
    records = records.filter(r =>
      r.universityName.toLowerCase().includes(kw) ||
      r.universityCode.includes(keyword) ||
      r.majorGroup.toLowerCase().includes(kw)
    );
  }

  // 类型筛选
  if (type) {
    records = records.filter(r => extractType(r.universityName, r.majorGroup) === type);
  }

  // 统计（筛选后）
  const universities = new Set(records.map(r => r.universityCode));
  const scores = records.map(r => r.minScore).filter(s => s > 0);
  const ranks = records.map(r => r.minRank).filter(r => r > 0);
  const typeDist: Record<string, number> = {};
  records.forEach(r => {
    const t = extractType(r.universityName, r.majorGroup);
    typeDist[t] = (typeDist[t] || 0) + 1;
  });

  // 分数分布（10分一档）
  const scoreDist: Record<string, number> = {};
  records.forEach(r => {
    if (r.minScore > 0) {
      const bucket = Math.floor(r.minScore / 10) * 10;
      scoreDist[String(bucket)] = (scoreDist[String(bucket)] || 0) + 1;
    }
  });

  const stats = {
    totalRecords: records.length,
    universityCount: universities.size,
    scoreRange: scores.length > 0 ? [Math.min(...scores), Math.max(...scores)] as [number, number] : [0, 0] as [number, number],
    rankRange: ranks.length > 0 ? [Math.min(...ranks), Math.max(...ranks)] as [number, number] : [0, 0] as [number, number],
    typeDistribution: typeDist,
    scoreDistribution: scoreDist,
  };

  // 排序
  if (sort === 'rank_asc') {
    records.sort((a, b) => (a.minRank || 999999) - (b.minRank || 999999));
  } else if (sort === 'score_asc') {
    records.sort((a, b) => a.minScore - b.minScore);
  } else {
    // score_desc
    records.sort((a, b) => b.minScore - a.minScore);
  }

  // 院校汇总
  const uniMap = new Map<string, { code: string; name: string; entries: AdmissionLineEntry[] }>();
  for (const r of records) {
    const key = r.universityCode;
    if (!uniMap.has(key)) uniMap.set(key, { code: key, name: r.universityName, entries: [] });
    uniMap.get(key)!.entries.push(r);
  }
  const uniSummaries = Array.from(uniMap.values()).map(u => {
    const scores = u.entries.map(e => e.minScore).filter(s => s > 0);
    const ranks = u.entries.map(e => e.minRank).filter(r => r > 0);
    return {
      universityCode: u.code,
      universityName: u.name,
      groupCount: u.entries.length,
      minScore: scores.length > 0 ? Math.min(...scores) : 0,
      maxScore: scores.length > 0 ? Math.max(...scores) : 0,
      minRank: ranks.length > 0 ? Math.min(...ranks) : 0,
      maxRank: ranks.length > 0 ? Math.max(...ranks) : 0,
      entries: u.entries,
    };
  }).sort((a, b) => b.minScore - a.minScore);

  // 分页
  const total = records.length;
  const start = (page - 1) * pageSize;
  const pagedRecords = records.slice(start, start + pageSize);

  return NextResponse.json({
    records: pagedRecords,
    universities: uniSummaries,
    total,
    stats,
    available,
    batchInfo: { year, batch, group: data.group },
  });
}
