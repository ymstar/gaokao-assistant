import { ScoreRankEntry, ScoreRankData, ScoreRankSearchResult } from '@/types/score-rank';

export function findRankByScore(entries: ScoreRankEntry[], score: number): ScoreRankSearchResult | null {
  if (entries.length === 0) return null;

  let left = 0;
  let right = entries.length - 1;

  while (left <= right) {
    const mid = (left + right) >>> 1;
    const midEntry = entries[mid];

    if (midEntry.score === score) {
      return {
        score: midEntry.score,
        count: midEntry.count,
        rank: midEntry.cumulative,
        totalCandidates: entries[entries.length - 1].cumulative,
        percentile: (midEntry.cumulative / entries[entries.length - 1].cumulative) * 100,
      };
    }

    if (midEntry.score < score) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  const closestEntry = entries[Math.min(left, entries.length - 1)];
  if (closestEntry) {
    return {
      score: closestEntry.score,
      count: closestEntry.count,
      rank: closestEntry.cumulative,
      totalCandidates: entries[entries.length - 1].cumulative,
      percentile: (closestEntry.cumulative / entries[entries.length - 1].cumulative) * 100,
    };
  }

  return null;
}

export function findScoreByRank(entries: ScoreRankEntry[], rank: number): number | null {
  if (entries.length === 0) return null;

  let left = 0;
  let right = entries.length - 1;

  while (left <= right) {
    const mid = (left + right) >>> 1;
    const midEntry = entries[mid];

    if (midEntry.cumulative === rank) {
      return midEntry.score;
    }

    if (midEntry.cumulative < rank) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  const entry = entries[Math.min(left, entries.length - 1)];
  return entry ? entry.score : null;
}

export function validateScoreRankData(data: ScoreRankData): boolean {
  const { entries, totalCandidates } = data;

  if (entries.length === 0) {
    console.error('No entries found');
    return false;
  }

  let cumulativeSum = 0;
  for (const entry of entries) {
    cumulativeSum += entry.count;
    if (entry.cumulative !== cumulativeSum) {
      console.error(`Cumulative mismatch at score ${entry.score}: expected ${cumulativeSum}, got ${entry.cumulative}`);
      return false;
    }
  }

  if (cumulativeSum !== totalCandidates) {
    console.error(`Total candidates mismatch: expected ${totalCandidates}, got ${cumulativeSum}`);
    return false;
  }

  for (let i = 0; i < entries.length - 1; i++) {
    if (entries[i].score !== entries[i + 1].score + 1) {
      console.error(`Score gap between ${entries[i].score} and ${entries[i + 1].score}`);
      return false;
    }
  }

  return true;
}
