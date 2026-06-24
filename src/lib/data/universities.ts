import { University } from '@/types/university';
import { SubjectGroup } from '@/types/score-rank';
import { getCachedData, setCachedData } from '@/lib/data/cache';
import { promises as fs } from 'fs';
import path from 'path';

export async function loadBasicInfo(province: string): Promise<University[]> {
  const cacheKey = `universities-basic:${province}`;
  const cached = getCachedData<University[]>(cacheKey);
  if (cached) return cached;

  const dataPath = path.join(
    process.cwd(), 'data', province, 'universities', '_common', '院校基本信息.json'
  );
  try {
    const data = await fs.readFile(dataPath, 'utf-8');
    const parsed = JSON.parse(data);
    setCachedData(cacheKey, parsed);
    return parsed;
  } catch {
    return [];
  }
}

export async function loadUniversityData(
  province: string,
  year: number,
  group: SubjectGroup
): Promise<University[]> {
  const dataPath = path.join(
    process.cwd(), 'data', province, 'universities', year.toString(), `${group}.json`
  );
  try {
    const data = await fs.readFile(dataPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function searchUniversities(
  province: string,
  year: number,
  group: SubjectGroup,
  keyword?: string,
  location?: string,
  minScore?: number,
  maxScore?: number
): Promise<University[]> {
  // Load basic info as the base dataset
  const basics = await loadBasicInfo(province);

  // Try to merge with admission data if available
  const admissions = await loadUniversityData(province, year, group);
  const admissionMap = new Map(admissions.map(u => [u.code, u]));

  let filtered = basics.map(b => {
    const adm = admissionMap.get(b.code);
    if (adm) {
      return { ...b, admissionScores: adm.admissionScores };
    }
    return b;
  });

  if (keyword) {
    const kw = keyword.toLowerCase();
    filtered = filtered.filter(u =>
      u.name.toLowerCase().includes(kw) ||
      u.code.includes(keyword) ||
      (u.location && u.location.toLowerCase().includes(kw))
    );
  }

  if (location) {
    filtered = filtered.filter(u => u.location === location);
  }

  if (minScore !== undefined || maxScore !== undefined) {
    filtered = filtered.filter(u => {
      const adm = u.admissionScores?.find(a => a.year === year);
      if (!adm) return false;
      if (minScore !== undefined && adm.minScore < minScore) return false;
      if (maxScore !== undefined && adm.minScore > maxScore) return false;
      return true;
    });
  }

  return filtered;
}

export async function getUniversityByCode(
  province: string,
  code: string
): Promise<University | null> {
  const basics = await loadBasicInfo(province);
  const found = basics.find(u => u.code === code);
  if (found) return found;

  // Fallback: search year-based data
  const dataDir = path.join(process.cwd(), 'data', province, 'universities');
  try {
    const years = await fs.readdir(dataDir);
    for (const yearStr of years) {
      if (yearStr.startsWith('_')) continue;
      const yearPath = path.join(dataDir, yearStr);
      const stat = await fs.stat(yearPath);
      if (stat.isDirectory()) {
        const groups = await fs.readdir(yearPath);
        for (const groupFile of groups) {
          if (groupFile.endsWith('.json')) {
            const group = groupFile.replace('.json', '') as SubjectGroup;
            const universities = await loadUniversityData(province, parseInt(yearStr), group);
            const f = universities.find(u => u.code === code);
            if (f) return f;
          }
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}
