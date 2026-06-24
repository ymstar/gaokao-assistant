import * as cheerio from 'cheerio';
import { ScoreRankData, ScoreRankEntry, SubjectGroup } from '../src/types/score-rank';

export async function scrapeHebeiScoreRank(
  year: number,
  group: SubjectGroup,
  url: string
): Promise<ScoreRankData> {
  console.log(`正在抓取 ${year}年 ${group} 一分一档数据...`);
  console.log(`URL: ${url}`);

  const response = await fetch(url);
  const html = await response.text();

  const $ = cheerio.load(html);
  const entries: ScoreRankEntry[] = [];

  $('table tbody tr').each((_, row) => {
    const cols = $(row).find('td');
    if (cols.length >= 2) {
      const score = parseInt($(cols[0]).text().trim());
      const count = parseInt($(cols[1]).text().trim());

      if (!isNaN(score) && !isNaN(count)) {
        entries.push({ score, count, cumulative: 0 });
      }
    }
  });

  entries.sort((a, b) => b.score - a.score);

  let cumulative = 0;
  for (const entry of entries) {
    cumulative += entry.count;
    entry.cumulative = cumulative;
  }

  const totalCandidates = entries.length > 0 ? entries[entries.length - 1].cumulative : 0;

  const data: ScoreRankData = {
    year,
    group,
    maxScore: entries.length > 0 ? entries[0].score : 0,
    minScore: entries.length > 0 ? entries[entries.length - 1].score : 0,
    totalCandidates,
    entries,
    meta: {
      source: '河北省教育考试院',
      sourceUrl: url,
      publishedAt: new Date().toISOString().split('T')[0],
      quality: 'official',
      importedAt: new Date().toISOString(),
    },
  };

  console.log(`抓取完成：共 ${entries.length} 条数据，总人数 ${totalCandidates}`);

  return data;
}

export async function scrapeHebeiAdmissionPlan(
  year: number,
  group: SubjectGroup,
  url: string
): Promise<Record<string, unknown>[]> {
  console.log(`正在抓取 ${year}年 ${group} 投档线数据...`);
  console.log(`URL: ${url}`);

  const response = await fetch(url);
  const html = await response.text();

  const $ = cheerio.load(html);
  const data: Record<string, unknown>[] = [];

  $('table tbody tr').each((_, row) => {
    const cols = $(row).find('td');
    if (cols.length >= 4) {
      data.push({
        universityCode: $(cols[0]).text().trim(),
        universityName: $(cols[1]).text().trim(),
        minScore: parseInt($(cols[2]).text().trim()) || 0,
        rank: parseInt($(cols[3]).text().trim()) || 0,
        group,
        year,
      });
    }
  });

  console.log(`抓取完成：共 ${data.length} 条院校数据`);

  return data;
}
