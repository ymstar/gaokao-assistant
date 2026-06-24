import { SubjectGroup, ScoreRankData } from '@/types/score-rank';
import { EquivalentScoreResult } from '@/types/equivalent-score';
import { findScoreRangeByRankRange } from '@/lib/utils/score-rank';

export function calculateEquivalentScore(
  year: number,
  group: SubjectGroup,
  score: number,
  rankStart: number,
  rankEnd: number,
  historicalData: ScoreRankData[]
): EquivalentScoreResult {
  const historicalScores = historicalData
    .filter((d) => d.year < year && d.group === group)
    .sort((a, b) => b.year - a.year)
    .slice(0, 3);

  const equivalents = historicalScores.map((data) => {
    const range = findScoreRangeByRankRange(data.entries, rankStart, rankEnd);
    return {
      year: data.year,
      minScore: range?.minScore ?? 0,
      maxScore: range?.maxScore ?? 0,
      rankStart,
      rankEnd,
    };
  });

  const validEquivalents = equivalents.filter((e) => e.maxScore > 0);

  const averageScoreRange = validEquivalents.length > 0
    ? {
        min: Math.round(validEquivalents.reduce((sum, e) => sum + e.minScore, 0) / validEquivalents.length),
        max: Math.round(validEquivalents.reduce((sum, e) => sum + e.maxScore, 0) / validEquivalents.length),
      }
    : { min: 0, max: 0 };

  let trend: 'rising' | 'falling' | 'stable' = 'stable';
  if (validEquivalents.length >= 2) {
    const firstMid = (validEquivalents[0].minScore + validEquivalents[0].maxScore) / 2;
    const lastMid = (validEquivalents[validEquivalents.length - 1].minScore + validEquivalents[validEquivalents.length - 1].maxScore) / 2;
    const diff = lastMid - firstMid;

    if (Math.abs(diff) <= 3) {
      trend = 'stable';
    } else if (diff > 0) {
      trend = 'rising';
    } else {
      trend = 'falling';
    }
  }

  return {
    inputScore: score,
    inputRankStart: rankStart,
    inputRankEnd: rankEnd,
    inputYear: year,
    inputGroup: group,
    equivalents,
    averageScoreRange,
    trend,
  };
}
