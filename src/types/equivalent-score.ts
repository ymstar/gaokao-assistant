import { SubjectGroup } from './score-rank';

export interface EquivalentScoreResult {
  inputScore: number;
  inputRank: number;
  inputYear: number;
  inputGroup: SubjectGroup;
  equivalents: {
    year: number;
    score: number;
    rank: number;
  }[];
  averageScore: number;
  trend: 'rising' | 'falling' | 'stable';
}
