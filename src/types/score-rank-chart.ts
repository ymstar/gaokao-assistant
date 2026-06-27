import { EquivalentScoreRef } from './score-rank';

/** DB 原始行（不展开聚合段），用于图表等需要展示原始分数段的场景 */
export interface ScoreRankRow {
  score: number;
  scoreDisplay: string;
  count: number;
  cumulative: number;
  rankStart: number;
  rankEnd: number;
  controlScore: number;
  batchName: string;
  equivalentScores?: EquivalentScoreRef[];
}
