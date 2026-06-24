import { AdmissionBatchData, AdmissionRecord, AdmissionStats, UniversityAdmissionSummary } from '@/types/admission-record';
import { getCachedData, setCachedData } from '@/lib/data/cache';
import { promises as fs } from 'fs';
import path from 'path';

/** 加载指定批次投档数据 */
export async function loadAdmissionData(
  province: string, year: number, batch: string, group: string
): Promise<AdmissionBatchData | null> {
  const cacheKey = `admission:${province}:${year}:${batch}:${group}`;
  const cached = getCachedData<AdmissionBatchData>(cacheKey);
  if (cached) return cached;

  const dataPath = path.join(
    process.cwd(), 'data', province, 'admission', year.toString(), `${batch}-${group}.json`
  );
  try {
    const data = await fs.readFile(dataPath, 'utf-8');
    const parsed: AdmissionBatchData = JSON.parse(data);
    setCachedData(cacheKey, parsed);
    return parsed;
  } catch {
    return null;
  }
}

/** 扫描所有可用的批次数据 */
export async function scanAvailableBatches(province: string): Promise<{ year: number; batch: string; group: string }[]> {
  const cacheKey = `admission-batches:${province}`;
  const cached = getCachedData<{ year: number; batch: string; group: string }[]>(cacheKey);
  if (cached) return cached;

  const dataDir = path.join(process.cwd(), 'data', province, 'admission');
  const result: { year: number; batch: string; group: string }[] = [];
  try {
    const years = await fs.readdir(dataDir);
    for (const yearStr of years) {
      const yearPath = path.join(dataDir, yearStr);
      const stat = await fs.stat(yearPath);
      if (!stat.isDirectory()) continue;
      const files = await fs.readdir(yearPath);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const name = file.replace('.json', '');
        const lastDash = name.lastIndexOf('-');
        if (lastDash === -1) continue;
        const batch = name.slice(0, lastDash);
        const group = name.slice(lastDash + 1);
        result.push({ year: parseInt(yearStr), batch, group });
      }
    }
  } catch { /* no data */ }

  setCachedData(cacheKey, result);
  return result;
}

/** 计算投档统计 */
export function computeStats(records: AdmissionRecord[]): AdmissionStats {
  const universities = new Set<string>();
  const majors = new Set<string>();
  let minScore = Infinity, maxScore = -Infinity;
  const volDist: Record<string, number> = {};
  const typeDist: Record<string, number> = {};

  for (const r of records) {
    universities.add(r.universityCode);
    majors.add(`${r.universityCode}-${r.majorCode}`);
    if (r.minScore < minScore) minScore = r.minScore;
    if (r.minScore > maxScore) maxScore = r.minScore;

    const volKey = String(r.volunteerNum);
    volDist[volKey] = (volDist[volKey] || 0) + 1;

    // 从院校名称提取计划类型
    const name = r.universityName;
    let type = '普通';
    if (name.includes('国家专项')) type = '国家专项';
    else if (name.includes('公费师范')) type = '公费师范';
    else if (name.includes('优师专项')) type = '优师专项';
    else if (name.includes('免费医学') || name.includes('免费定向')) type = '免费医学定向';
    else if (name.includes('地方专项')) type = '地方专项';
    typeDist[type] = (typeDist[type] || 0) + 1;
  }

  return {
    totalRecords: records.length,
    universities: universities.size,
    majors: majors.size,
    scoreRange: [minScore === Infinity ? 0 : minScore, maxScore === -Infinity ? 0 : maxScore],
    volunteerDistribution: volDist,
    typeDistribution: typeDist,
  };
}

/** 按院校汇总 */
export function groupByUniversity(records: AdmissionRecord[]): UniversityAdmissionSummary[] {
  const map = new Map<string, AdmissionRecord[]>();
  for (const r of records) {
    const key = r.universityCode;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }

  return Array.from(map.entries()).map(([code, recs]) => ({
    universityCode: code,
    universityName: recs[0].universityName,
    majorCount: recs.length,
    minScore: Math.min(...recs.map(r => r.minScore)),
    maxScore: Math.max(...recs.map(r => r.minScore)),
    avgVolunteerNum: Math.round(recs.reduce((s, r) => s + r.volunteerNum, 0) / recs.length * 10) / 10,
    records: recs,
  })).sort((a, b) => b.minScore - a.minScore);
}
