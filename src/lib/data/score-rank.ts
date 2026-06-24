import { ScoreRankData, SubjectGroup } from '@/types/score-rank';
import { getCachedData, setCachedData } from '@/lib/data/cache';
import { promises as fs } from 'fs';
import path from 'path';

export async function loadScoreRankData(
  province: string,
  year: number,
  group: SubjectGroup
): Promise<ScoreRankData | null> {
  const cacheKey = `score-rank:${province}:${year}:${group}`;
  const cached = getCachedData<ScoreRankData>(cacheKey);
  if (cached) return cached;

  const dataPath = path.join(
    process.cwd(),
    'data',
    province,
    'score-rank',
    year.toString(),
    `${group}.json`
  );

  try {
    const data = await fs.readFile(dataPath, 'utf-8');
    const parsed = JSON.parse(data);
    setCachedData(cacheKey, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export async function loadAllScoreRankData(
  province: string
): Promise<ScoreRankData[]> {
  const cacheKey = `score-rank-all:${province}`;
  const cached = getCachedData<ScoreRankData[]>(cacheKey);
  if (cached) return cached;

  const dataDir = path.join(process.cwd(), 'data', province, 'score-rank');

  try {
    const years = await fs.readdir(dataDir);
    const allData: ScoreRankData[] = [];

    for (const yearStr of years) {
      const yearPath = path.join(dataDir, yearStr);
      const stat = await fs.stat(yearPath);

      if (stat.isDirectory()) {
        const groups = await fs.readdir(yearPath);
        for (const groupFile of groups) {
          if (groupFile.endsWith('.json')) {
            const group = groupFile.replace('.json', '') as SubjectGroup;
            const data = await loadScoreRankData(province, parseInt(yearStr), group);
            if (data) {
              allData.push(data);
            }
          }
        }
      }
    }

    setCachedData(cacheKey, allData);
    return allData;
  } catch {
    return [];
  }
}

export async function saveScoreRankData(
  province: string,
  year: number,
  group: SubjectGroup,
  data: ScoreRankData
): Promise<void> {
  const dataPath = path.join(
    process.cwd(),
    'data',
    province,
    'score-rank',
    year.toString(),
    `${group}.json`
  );

  await fs.mkdir(path.dirname(dataPath), { recursive: true });
  await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
}
