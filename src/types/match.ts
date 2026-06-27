/**
 * 冲稳保匹配 V2 类型定义
 *
 * 数据来源：
 *   - gaokao-admission.db (admission_scores + admission_plans)
 *   - gaokao-score-rank.db (score_rank — 一分一档)
 *   - gaokao-schools.db (schools — 院校元数据)
 */

import { MatchType } from './admission-line';

// ============================================================
// DB 原始行
// ============================================================

/** admission_scores 表原始行 */
export interface MajorScoreRecord {
  school_id: number;
  special_id: number;
  year: number;
  spname: string;            // 专业全名（含备注）
  sp_name: string;           // 专业简称
  level1_name: string;       // 办学层次：本科(普通) / 本科(职业) / 专科(高职)
  level2_name: string;       // 学科门类：工学 / 理学 / 文学 / 医学 / 管理学 / ...
  min_score: number;         // 最低投档分
  max_score: number;         // 最高投档分
  avg_score: number;         // 平均投档分
  min_section: number;       // 最低位次 (min_section = minRank)
  lq_num: number | null;     // 录取人数
  zslx_name: string;         // 招生类型：普通类 / 中外合作办学 / 国家专项计划 / ...
  is_score_range: number;    // 是否为分数段（0/1）
}

/** admission_plans 表原始行 */
export interface MajorPlanRecord {
  school_id: number;
  special_id: number;
  num: number;               // 2026 计划人数
  length: string;            // 学制：四年 / 五年 / ...
  tuition: string;           // 学费
  sp_info: string;           // 选科要求描述
  zslx_name: string;         // 招生类型
  level1_name: string;
  level2_name: string;
  first_km_name: string;     // 首选科目：物理 / 历史
  sp_fxk_name: string;       // 科目复选限制
  sp_sxk_name: string;       // 再选科目要求
  spname: string;            // 专业全名
  sp_name: string;           // 专业简称
}

/** 院校元数据（从 schools.db 查询） */
export interface SchoolMeta {
  school_id: number;
  name: string;
  province: string;
  level: string;             // 普通本科 / 专科（高职）
  f985: string;              // '1' = 是
  f211: string;
  dual_class: string;
}

// ============================================================
// 匹配中间类型
// ============================================================

/** 单年历史数据点 */
export interface MajorYearDetail {
  year: number;
  minScore: number;
  maxScore: number;
  avgScore: number;
  minRank: number;           // = min_section
  admitCount: number | null; // = lq_num
  zslxName: string;
  gapRatio: number;          // 该专业该年 vs 用户位次
}

/** 各年数据完整性 */
export type DataCompleteness = 'full' | 'partial' | 'none';

/** 单个专业的匹配结果 */
export interface MajorMatchDetail {
  specialId: number;
  majorName: string;         // sp_name (简称)
  majorFullName: string;     // spname (全名)
  matchType: MatchType;
  weightedAvgRank: number;   // 加权平均位次
  rankGap: number;           // userRank - weightedAvgRank
  gapRatio: number;

  // 历史数据
  history: MajorYearDetail[];       // 各年明细
  historicalYears: number;          // 有数据年数
  completeness: DataCompleteness;   // 数据完整性
  isNewMajor: boolean;              // 2026 新专业（无历史数据）

  // 趋势
  trend: 'up' | 'down' | 'stable' | 'new';

  // 2026 计划
  planCount: number;
  tuition: string;
  duration: string;          // 学制
  subjectRequirements: string;  // 选科要求
  zslxName: string;
  level1Name: string;
  level2Name: string;
}

// ============================================================
// 学校级聚合结果
// ============================================================

/** planChangeRatio 的 band */
export type PlanTrend = 'up' | 'flat' | 'down';

/** 单个学校的匹配结果（API 返回单位） */
export interface SchoolMatchResult {
  schoolId: number;
  schoolName: string;

  // 学校元数据（用于客户端筛选）
  province: string;
  level: string;             // 本科 / 高职(专科)
  tier: string;              // 985 / 211 / 双一流
  is985: boolean;
  is211: boolean;
  isDualClass: boolean;

  // 匹配结果
  matchType: MatchType;
  bestMajor: string;         // 匹配最好的专业名
  majorCount: number;        // 匹配专业总数
  majoresByType: { chong: number; wen: number; bao: number };

  // 聚合位次
  schoolTargetRank: number;   // 院校参考位次（各专业加权位次中位数，0=新专业无参考）
  userRank: number;           // 你的位次
  userScore: number;           // 你的分数
  scoreGap: number;            // 你的分数 - 院校近年最低分
  rankGap: number;             // 你的位次 - 院校参考位次（负=你更优）

  // 计划
  totalPlanCount2026: number;
  planChangeRatio: number | null;  // 同比变化率
  planTrend: PlanTrend | null;

  // 专业组成
  level2Distribution: Record<string, number>;   // 学科门类分布
  subjectRequirementSummary: string[];           // 主要选科要求（top 3）
  zslxDistribution: Record<string, number>;     // 招生类型分布

  // 置信度 & 风险
  confidence: 'high' | 'medium' | 'low';
  riskFactor: 'low' | 'medium' | 'high';

  // 专业明细
  majors: MajorMatchDetail[];

  matchMode: string;
  batch: string;
}

// ============================================================
// API 响应
// ============================================================

export interface MatchResponseV2 {
  input: {
    score: number;
    year: number;
    group: string;
    batch: string;
    matchMode: string;
  };
  userRank: number;
  rankYear: number;
  totalCandidates: number;
  summary: {
    total: number;
    chong: number;
    wen: number;
    bao: number;
  };
  results: SchoolMatchResult[];
  batches: string[];
  dataSource: 'gaokao-admission.db';
}
