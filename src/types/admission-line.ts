import { SubjectGroup } from './score-rank';

/** 投档线单条记录 */
export interface AdmissionLineEntry {
  universityCode: string;      // 院校代码
  universityName: string;      // 院校名称
  majorGroup: string;          // 专业组名称
  subjectRequirements?: string; // 选科要求
  planCount: number;           // 招生计划数
  minScore: number;            // 最低投档分
  minRank: number;             // 最低位次
  avgScore?: number;           // 平均投档分
  maxScore?: number;           // 最高投档分
}

/** 投档线数据文件结构 */
export interface AdmissionLineData {
  year: number;
  batch: string;               // '本科批' | '专科批' | '本科提前批' | '专科提前批'
  group: SubjectGroup;
  entries: AdmissionLineEntry[];
  meta: {
    source: string;
    sourceUrl: string;
    publishedAt: string;
    quality: 'official' | 'verified' | 'unverified';
  };
}

/** 匹配类型 */
export type MatchType = '冲' | '稳' | '保';

/** 单年某专业的投档详情 */
export interface MajorDetail {
  majorName: string;
  minScore: number;
  minRank: number;
  volunteerNum: number;
  matchType: MatchType;
}

/** 单年投档汇总 */
export interface YearDetail {
  year: number;
  minScore: number;
  avgVolunteerNum: number;
  majors: MajorDetail[];
}

/** 匹配结果单条 */
export interface MatchResult {
  universityCode: string;
  universityName: string;
  majorGroup: string;
  batch: string;
  matchType: MatchType;
  targetMinScore: number;      // 目标年份投档线
  targetMinRank: number;       // 目标年份最低位次
  userScore: number;           // 用户输入分数
  userRank: number;            // 用户对应位次
  scoreGap: number;            // 分数差 = userScore - targetMinScore
  rankGap: number;             // 位次差 = userRank - targetMinRank（负数=用户位次更高）
  confidence: 'high' | 'medium' | 'low';
  subjectRequirements?: string;
  yearDetails?: YearDetail[];  // 各年投档详情（含专业明细）
}
