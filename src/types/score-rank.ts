export type SubjectGroup = '物理类' | '历史类' | '理科' | '文科';

/** 等效分参照记录（来自 equivalent_score 表） */
export interface EquivalentScoreRef {
  refYear: number;
  refScore: number;
  refRankStart: number;
  refRankEnd: number;
}

export interface ScoreRankEntry {
  score: number;
  count: number;
  cumulative: number;
  /** DB 原始分数显示，如 "701-750" 或 "700" */
  scoreDisplay?: string;
  /** 批次录取控制分数线 */
  controlScore?: number;
  /** 批次名称 */
  batchName?: string;
  /** 该分数段起始位次 */
  rankStart?: number;
  /** 该分数段结束位次 */
  rankEnd?: number;
  /** 历史年份等效分参照（来自 equivalent_score 表，聚合段仅最高分有） */
  equivalentScores?: EquivalentScoreRef[];
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
