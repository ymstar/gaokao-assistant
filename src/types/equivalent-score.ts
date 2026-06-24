import { SubjectGroup } from './score-rank';

export interface EquivalentScoreResult {
  inputScore: number;
  inputRankStart: number;
  inputRankEnd: number;
  inputYear: number;
  inputGroup: SubjectGroup;
  equivalents: {
    year: number;
    minScore: number;
    maxScore: number;
    rankStart: number;
    rankEnd: number;
  }[];
  averageScoreRange: { min: number; max: number };
  trend: 'rising' | 'falling' | 'stable';
}
