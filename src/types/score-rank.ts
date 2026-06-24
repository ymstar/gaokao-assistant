export type SubjectGroup = '物理类' | '历史类';

export interface ScoreRankEntry {
  score: number;
  count: number;
  cumulative: number;
}

export interface ScoreRankData {
  year: number;
  group: SubjectGroup;
  maxScore: number;
  minScore: number;
  totalCandidates: number;
  entries: ScoreRankEntry[];
  meta: {
    source: string;
    sourceUrl: string;
    publishedAt: string;
    quality: 'official' | 'verified' | 'unverified';
    importedAt?: string;
    notes?: string;
  };
}

export interface ScoreRankSearchResult {
  score: number;
  count: number;
  rank: number;
  totalCandidates: number;
  percentile: number;
}
