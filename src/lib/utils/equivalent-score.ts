import { SubjectGroup, ScoreRankData } from '@/types/score-rank';
import { EquivalentScoreResult } from '@/types/equivalent-score';
import { findScoreByRank } from '@/lib/utils/score-rank';

export function calculateEquivalentScore(
  year: number,
  group: SubjectGroup,
  score: number,
  rank: number,
  historicalData: ScoreRankData[]
): EquivalentScoreResult {
  const historicalScores = historicalData
    .filter((d) => d.year < year && d.group === group)
    .sort((a, b) => b.year - a.year)
    .slice(0, 3);

  const equivalents = historicalScores.map((data) => {
    const equivalentScore = findScoreByRank(data.entries, rank);
    return {
      year: data.year,
      score: equivalentScore ?? 0,
      rank: rank,
    };
  });

  const validEquivalents = equivalents.filter((e) => e.score > 0);
  const averageScore = validEquivalents.length > 0
    ? Math.round(validEquivalents.reduce((sum, e) => sum + e.score, 0) / validEquivalents.length)
    : 0;

  let trend: 'rising' | 'falling' | 'stable' = 'stable';
  if (validEquivalents.length >= 2) {
    const firstScore = validEquivalents[0].score;
    const lastScore = validEquivalents[validEquivalents.length - 1].score;
    const diff = lastScore - firstScore;

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
    inputRank: rank,
    inputYear: year,
    inputGroup: group,
    equivalents,
    averageScore,
    trend,
  };
}
