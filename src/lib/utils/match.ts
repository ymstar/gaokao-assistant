import {
  MatchResult, MatchType, YearDetail, AdmissionLineEntry,
} from '@/types/admission-line';
import { ScoreRankData, SubjectGroup } from '@/types/score-rank';
import { findRankByScore } from '@/lib/utils/score-rank';
import { UniversityPlanIndex } from '@/lib/data/admission-plans';
import type {
  MajorScoreRecord, MajorPlanRecord, SchoolMeta,
  MajorMatchDetail, SchoolMatchResult, MajorYearDetail,
  PlanTrend, DataCompleteness,
} from '@/types/match';

// ============================================================
// Shared helpers
// ============================================================

const CHONG_THRESHOLD = -0.05;  // gapRatio > -5% → 冲
const BAO_THRESHOLD = -0.20;    // gapRatio ≤ -20% → 保

function classifyMatch(userRank: number, targetMinRank: number): MatchType {
  if (targetMinRank <= 0) return '冲';
  const gapRatio = (userRank - targetMinRank) / targetMinRank;
  if (gapRatio <= BAO_THRESHOLD) return '保';
  if (gapRatio <= CHONG_THRESHOLD) return '稳';
  return '冲';
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function computeRiskFactor(
  yearCount: number,
  planChangeRatio: number,
  completenessRatio: number,
): 'low' | 'medium' | 'high' {
  // 新专业占比过高 → 高风险
  if (completenessRatio < 0.5) return 'high';
  if (yearCount === 1 || planChangeRatio < -0.30) return 'high';
  if (yearCount >= 3 && planChangeRatio >= 0) return 'low';
  if (yearCount >= 3 && planChangeRatio >= -0.15) return 'low';
  return 'medium';
}

// ============================================================
// 分组内部类型
// ============================================================

interface YearEntryGroup {
  year: number;
  entries: AdmissionLineEntry[];
}

interface UniGroup {
  code: string;
  name: string;
  yearGroups: YearEntryGroup[];
}

// ============================================================
// 主匹配函数
//
// @param allLineData — 多年的 AdmissionLineData，每年包含一批 entries
// @param planUniversities — 2026 plan index (来自 loadAdmissionPlanIndex)
// @param matchMode — 位次策略: balanced (中位数) | conservative (最低位次/最难进) | aggressive (最高位次/最好进)
// ============================================================

export function matchSchools(
  userScore: number,
  year: number,
  group: SubjectGroup,
  batch: string,
  scoreRankData: ScoreRankData[],
  allLineData: { year: number; entries: AdmissionLineEntry[] }[],
  planUniversities: UniversityPlanIndex[],
  matchMode: 'balanced' | 'conservative' | 'aggressive' = 'balanced'
): MatchResult[] {
  // ---- 1. 查用户位次 ----
  const sortedRankYears = scoreRankData
    .filter(d => d.group === group).map(d => d.year).sort((a, b) => b - a);
  const rankYear = sortedRankYears.find(y => y <= year) || sortedRankYears[0];
  const yearScoreData = rankYear !== undefined
    ? scoreRankData.find(d => d.year === rankYear && d.group === group) : undefined;
  if (!yearScoreData) return [];
  const userRankResult = findRankByScore(yearScoreData.entries, userScore);
  if (!userRankResult) return [];
  const userRank = userRankResult.rank;

  // ---- 2. 构建 plan 索引 ----
  const planMap = new Map<string, UniversityPlanIndex>();
  for (const p of planUniversities) {
    planMap.set(p.universityCode, p);
  }

  // ---- 3. 按 (universityCode, year) 分组 ----
  const grouped = new Map<string, UniGroup>();

  for (const ld of allLineData) {
    for (const e of ld.entries) {
      if (e.minScore <= 0) continue;
      const code = e.universityCode;
      if (!grouped.has(code)) {
        grouped.set(code, { code, name: e.universityName, yearGroups: [] });
      }
      const g = grouped.get(code)!;
      let yg = g.yearGroups.find(y => y.year === ld.year);
      if (!yg) {
        yg = { year: ld.year, entries: [] };
        g.yearGroups.push(yg);
      }
      yg.entries.push(e);
    }
  }

  // ---- 4. 匹配每个院校 ----
  const sortedYears = [...new Set(allLineData.map(d => d.year))].sort((a, b) => b - a);
  const results: MatchResult[] = [];

  for (const [, g] of grouped) {
    // 4a. 过滤：必须在 2026 plan 中
    const planInfo = planMap.get(g.code);
    if (!planInfo) continue;

    g.yearGroups.sort((a, b) => b.year - a.year);

    // 4b. 各年位次（按 matchMode）
    const yearRanks: { year: number; minScore: number; rank: number }[] = [];
    for (const yg of g.yearGroups) {
      const ranks = yg.entries.map(e => e.minRank).filter(r => r > 0);
      const scores = yg.entries.map(e => e.minScore).filter(s => s > 0);
      if (ranks.length === 0) continue;

      let rank: number;
      switch (matchMode) {
        case 'conservative':
          rank = Math.min(...ranks); // 最低位次数值 → 最高录取难度
          break;
        case 'aggressive':
          rank = Math.max(...ranks); // 最高位次数值 → 最好进
          break;
        case 'balanced':
        default:
          rank = median(ranks);
          break;
      }

      yearRanks.push({ year: yg.year, minScore: Math.min(...scores), rank });
    }

    if (yearRanks.length === 0) continue;

    // 4c. 加权平均位次
    const weights = sortedYears.map((y, i) => {
      const yr = yearRanks.find(r => r.year === y);
      return yr ? { weight: sortedYears.length - i, data: yr } : null;
    }).filter(Boolean) as { weight: number; data: { year: number; minScore: number; rank: number } }[];

    if (weights.length === 0) continue;

    const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
    const weightedAvgRank = Math.round(
      weights.reduce((s, w) => s + w.data.rank * w.weight, 0) / totalWeight
    );

    const latest = weights[0].data;

    // 4d. 分类
    const matchType = classifyMatch(userRank, weightedAvgRank);

    // 4e. 置信度
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    if (weights.length >= 3) confidence = 'high';
    else if (weights.length === 1) confidence = 'low';

    // 4f. planChangeRatio + riskFactor
    const historicalPlanCounts = g.yearGroups.map(yg =>
      yg.entries.reduce((s, e) => s + (e.planCount || 0), 0)
    ).filter(p => p > 0);
    const avgPlanCount = historicalPlanCounts.length > 0
      ? Math.round(historicalPlanCounts.reduce((s, p) => s + p, 0) / historicalPlanCounts.length)
      : planInfo.totalPlans;
    const planChangeRatio = avgPlanCount > 0
      ? (planInfo.totalPlans - avgPlanCount) / avgPlanCount
      : 0;
    const riskFactor = computeRiskFactor(weights.length, planChangeRatio, 1.0);

    // 4g. 构建 YearDetail
    const yearDetails: YearDetail[] = g.yearGroups
      .sort((a, b) => b.year - a.year)
      .map(yg => ({
        year: yg.year,
        minScore: Math.min(...yg.entries.map(e => e.minScore)),
        avgVolunteerNum: 0,
        majors: yg.entries
          .sort((a, b) => b.minScore - a.minScore)
          .map(e => ({
            majorName: e.majorGroup,
            minScore: e.minScore,
            minRank: e.minRank,
            volunteerNum: 0,
            matchType: e.minRank > 0 ? classifyMatch(userRank, e.minRank) : '冲' as MatchType,
          })),
      }));

    results.push({
      universityCode: g.code,
      universityName: g.name,
      majorGroup: `${g.yearGroups[0]?.entries.length || 0}个专业组`,
      batch,
      matchType,
      targetMinScore: latest.minScore,
      targetMinRank: weightedAvgRank,
      userScore,
      userRank,
      scoreGap: userScore - latest.minScore,
      rankGap: userRank - weightedAvgRank,
      confidence,
      yearDetails,
      riskFactor,
      planSummary: {
        planCount2026: planInfo.totalPlans,
        avgPlanCount,
        planChangeRatio: Math.round(planChangeRatio * 100) / 100,
      },
      matchMode,
    });
  }

  // ---- 5. 排序 ----
  const typeOrder: Record<MatchType, number> = { '冲': 0, '稳': 1, '保': 2 };
  results.sort((a, b) => {
    const t = typeOrder[a.matchType] - typeOrder[b.matchType];
    if (t !== 0) return t;
    return Math.abs(a.rankGap) - Math.abs(b.rankGap);
  });

  return results;
}

// ============================================================
// V2: 专业级匹配 + 学校聚合
// ============================================================

interface MajorGroup {
  schoolId: number;
  specialId: number;
  scoreRows: MajorScoreRecord[];  // 按年份降序
  plan: MajorPlanRecord | null;   // 2026 计划（可能无）
}

/** 计算位次变化趋势（正百分比 = 排名下降/更容易进，负百分比 = 排名上升/更难进） */
function computeTrend(
  history: MajorYearDetail[],
): 'up' | 'down' | 'stable' | 'new' {
  const valid = history.filter(h => h.minRank > 0).slice(0, 2); // 取最近两年
  if (valid.length < 2) return history.length === 0 ? 'new' : 'stable';
  const change = (valid[0].minRank - valid[1].minRank) / valid[1].minRank;
  if (change > 0.05) return 'down';     // 位次数值变大 → 排名下降 → 更容易进
  if (change < -0.05) return 'up';      // 位次数值变小 → 排名上升 → 更难进
  return 'stable';
}

function computePlanTrend(
  thisYear: number,
  avgHistorical: number,
): PlanTrend | null {
  if (avgHistorical <= 0) return null;
  const ratio = (thisYear - avgHistorical) / avgHistorical;
  if (ratio > 0.10) return 'up';
  if (ratio < -0.10) return 'down';
  return 'flat';
}

const WEIGHTS = { 2025: 3, 2024: 2, 2023: 1 };
const HISTORICAL_YEARS = [2023, 2024, 2025];

/** Trim long field names for response size optimization */
function trimMajorName(name: string): string {
  // 去除括号内的长备注
  const paren = name.indexOf('（');
  if (paren > 0) {
    return name.slice(0, paren).trim();
  }
  return name.length > 60 ? name.slice(0, 60) + '...' : name;
}

export function matchSchoolsV2(
  userScore: number,
  userRank: number,
  allScoreRows: MajorScoreRecord[],
  allPlanRows: MajorPlanRecord[],
  schoolMetaMap: Map<number, SchoolMeta>,
  matchMode: 'balanced' | 'conservative' | 'aggressive' = 'balanced',
  batch: string = '本科批',
): SchoolMatchResult[] {
  // ---- 0. 输入校验 ----
  if (userRank <= 0) return [];

  // ---- 1. 索引: plan rows by (school_id, sp_name) ----
  // NOTE: admission_plans 和 admission_scores 的 special_id 可能不同（同一专业不同年份），
  // 用专业名称（sp_name）作为连接键更可靠。
  const planByName = new Map<string, MajorPlanRecord>();
  for (const p of allPlanRows) {
    const key = `${p.school_id}|${p.sp_name}`;
    // 有重复时保留第一条
    if (!planByName.has(key)) planByName.set(key, p);
  }

  // ---- 2. 索引: plan rows by (school_id, special_id) → plan (用于已建立 score 关联后回填) ----
  const planBySpecial = new Map<string, MajorPlanRecord>();
  for (const p of allPlanRows) {
    const sk = `${p.school_id}|${p.special_id}`;
    if (!planBySpecial.has(sk)) planBySpecial.set(sk, p);
  }

  // ---- 3. 索引: score rows by (school_id, special_id) → MajorGroup, 然后用 sp_name 回填 plan ----
  const groupMap = new Map<string, MajorGroup>();

  for (const row of allScoreRows) {
    const key = `${row.school_id}|${row.special_id}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        schoolId: row.school_id,
        specialId: row.special_id,
        scoreRows: [],
        plan: null,
      });
    }
    groupMap.get(key)!.scoreRows.push(row);

    // 先用 special_id 精确匹配 plan
    const exactPlan = planBySpecial.get(key);
    if (exactPlan) {
      groupMap.get(key)!.plan = exactPlan;
    }
  }

  // 对于还没配上 plan 的 score group，用 sp_name 匹配
  for (const [, mg] of groupMap) {
    if (mg.plan) continue; // 已匹配
    if (mg.scoreRows.length === 0) continue;
    const spName = mg.scoreRows[0].sp_name;
    const nameKey = `${mg.schoolId}|${spName}`;
    const plan = planByName.get(nameKey);
    if (plan) mg.plan = plan;
  }

  // 加入仅有 plan 没有 score 的专业（2026 新专业）
  const coveredSpIds = new Set<number>();
  for (const [, mg] of groupMap) {
    if (mg.plan) coveredSpIds.add(mg.plan.special_id);
  }
  for (const p of allPlanRows) {
    if (coveredSpIds.has(p.special_id)) continue;
    const key = `${p.school_id}|${p.special_id}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        schoolId: p.school_id,
        specialId: p.special_id,
        scoreRows: [],
        plan: p,
      });
    }
  }

  // ---- 3. 预计算每个学校的参考位次（用于新专业预测）----
  // 对于有历史数据的专业，计算其加权平均位次，然后取中位数作为该校参考位次
  const schoolReferenceRank = new Map<number, number>();
  const schoolMajorRanks = new Map<number, number[]>();

  for (const [, mg] of groupMap) {
    const { schoolId, scoreRows } = mg;
    if (!schoolMajorRanks.has(schoolId)) {
      schoolMajorRanks.set(schoolId, []);
    }

    const byYear = new Map<number, MajorScoreRecord>();
    for (const s of scoreRows) {
      if (!byYear.has(s.year)) byYear.set(s.year, s);
    }

    let totalWeight = 0;
    let weightedRankSum = 0;

    for (const y of HISTORICAL_YEARS) {
      const sr = byYear.get(y);
      if (!sr || sr.min_section <= 0) continue;
      const w = WEIGHTS[y as keyof typeof WEIGHTS] || 1;
      totalWeight += w;
      weightedRankSum += sr.min_section * w;
    }

    if (totalWeight > 0) {
      const weightedAvg = Math.round(weightedRankSum / totalWeight);
      schoolMajorRanks.get(schoolId)!.push(weightedAvg);
    }
  }

  for (const [schoolId, ranks] of schoolMajorRanks) {
    if (ranks.length > 0) {
      schoolReferenceRank.set(schoolId, median(ranks));
    }
  }

  // ---- 4. 为每个 MajorGroup 做匹配 ----
  const majorResults: MajorMatchDetail[] = [];

  for (const [, mg] of groupMap) {
    const { schoolId, specialId, scoreRows, plan } = mg;

    // 检查学校元数据是否存在
    const schoolMeta = schoolMetaMap.get(schoolId);
    if (!schoolMeta) continue;

    // 当有招生计划数据时，没有 plan 的专业不参与推荐（2026年不招生）
    // 当招生计划表不存在或为空时，忽略此约束，使用历史分数直接匹配
    if (allPlanRows.length > 0 && !plan) continue;

    // 按年份分组
    const byYear = new Map<number, MajorScoreRecord>();
    for (const s of scoreRows) {
      if (!byYear.has(s.year)) byYear.set(s.year, s);
    }

    // 计算每年数据
    const history: MajorYearDetail[] = [];
    let totalWeight = 0;
    let weightedRankSum = 0;
    let yearCount = 0;

    for (const y of HISTORICAL_YEARS) {
      const sr = byYear.get(y);
      if (!sr || sr.min_section <= 0) continue;

      yearCount++;
      const w = WEIGHTS[y as keyof typeof WEIGHTS] || 1;
      const gapRatio = (userRank - sr.min_section) / sr.min_section;
      totalWeight += w;
      weightedRankSum += sr.min_section * w;

      history.push({
        year: y,
        minScore: sr.min_score,
        maxScore: sr.max_score,
        avgScore: sr.avg_score,
        minRank: sr.min_section,
        admitCount: sr.lq_num,
        zslxName: sr.zslx_name,
        gapRatio: Math.round(gapRatio * 10000) / 10000,
      });
    }

    // 新专业：无历史数据 → 使用该校参考位次进行预测
    let weightedAvgRank: number;
    if (history.length === 0) {
      // 使用该校其他专业的参考位次作为预测
      const schoolRefRank = schoolReferenceRank.get(schoolId);
      if (schoolRefRank && schoolRefRank > 0) {
        weightedAvgRank = schoolRefRank;
      } else {
        weightedAvgRank = 0;
      }
      yearCount = 0;
    } else {
      weightedAvgRank = Math.round(weightedRankSum / totalWeight);
    }

    const gapRatio = weightedAvgRank > 0
      ? (userRank - weightedAvgRank) / weightedAvgRank
      : 0;
    const matchType = weightedAvgRank > 0
      ? classifyMatch(userRank, weightedAvgRank)
      : '冲'; // 无任何参考数据时默认冲

    // 趋势
    const trend = computeTrend(history.filter(h => h.year !== 2026));

    // 完整性
    let completeness: DataCompleteness;
    if (yearCount >= 3) completeness = 'full';
    else if (yearCount >= 1) completeness = 'partial';
    else completeness = 'none';

    // 从 plan 或 score rows 取专业名称
    const majorName = plan
      ? trimMajorName(plan.sp_name || plan.spname)
      : (scoreRows.length > 0 ? trimMajorName(scoreRows[0].sp_name || scoreRows[0].spname) : `专业${specialId}`);
    const majorFullName = plan
      ? trimMajorName(plan.spname || plan.sp_name)
      : majorName;

    majorResults.push({
      specialId,
      majorName,
      majorFullName,
      matchType,
      weightedAvgRank,
      rankGap: userRank - weightedAvgRank,
      gapRatio: Math.round(gapRatio * 10000) / 10000,
      history,
      historicalYears: yearCount,
      completeness,
      isNewMajor: yearCount === 0,
      trend,
      planCount: plan?.num ?? 0,
      tuition: plan?.tuition ?? '',
      duration: plan?.length ?? '',
      subjectRequirements: plan?.sp_info ?? '',
      zslxName: plan?.zslx_name ?? (scoreRows.length > 0 ? scoreRows[0].zslx_name : ''),
      level1Name: plan?.level1_name ?? (scoreRows.length > 0 ? scoreRows[0].level1_name : ''),
      level2Name: plan?.level2_name ?? (scoreRows.length > 0 ? scoreRows[0].level2_name : ''),
    });
  }

  if (majorResults.length === 0) return [];

  // ---- 4. 按学校聚合 ----
  // 构建 specialId → schoolId 映射
  const specialToSchool = new Map<number, number>();
  for (const [, mg] of groupMap) {
    specialToSchool.set(mg.specialId, mg.schoolId);
  }

  const schoolMajorMap = new Map<number, MajorMatchDetail[]>();
  for (const mr of majorResults) {
    const sid = specialToSchool.get(mr.specialId);
    if (sid === undefined) continue;
    if (!schoolMajorMap.has(sid)) schoolMajorMap.set(sid, []);
    schoolMajorMap.get(sid)!.push(mr);
  }

  const results: SchoolMatchResult[] = [];

  for (const [schoolId, majors] of schoolMajorMap) {
    const meta = schoolMetaMap.get(schoolId);
    if (!meta) continue;
    if (majors.length === 0) continue;

    // 4a. 学校级匹配类型：取最优
    const typeOrder: Record<MatchType, number> = { '保': 2, '稳': 1, '冲': 0 };
    const bestMajor = majors.reduce((best, m) =>
      typeOrder[m.matchType] > typeOrder[best.matchType] ? m : best
    , majors[0]);

    // 4b. 学校加权位次 = 各专业（有历史数据的）加权位次中位数
    const allRanks = majors.map(m => m.weightedAvgRank).filter(r => r > 0);
    const schoolWeightedRank = allRanks.length > 0 ? median(allRanks) : 0;
    // 学校位次差：userRank - schoolWeightedRank（负=用户优于学校历史水平）
    const schoolRankGap = schoolWeightedRank > 0 ? userRank - schoolWeightedRank : 0;

    // 4c. 分差：用户分数 vs 历史分数最低分（取 year=2025 的各专业 minScore 的最小值）
    const latestScores = majors
      .flatMap(m => m.history.filter(h => h.year === 2025).map(h => h.minScore))
      .filter(s => s > 0);
    const schoolMinScore = latestScores.length > 0 ? Math.min(...latestScores) : userScore;

    // 4d. 统计
    const chong = majors.filter(m => m.matchType === '冲').length;
    const wen = majors.filter(m => m.matchType === '稳').length;
    const bao = majors.filter(m => m.matchType === '保').length;

    // 4e. 学科门类分布
    const level2Dist: Record<string, number> = {};
    for (const m of majors) {
      if (m.level2Name) {
        level2Dist[m.level2Name] = (level2Dist[m.level2Name] || 0) + 1;
      }
    }

    // 4f. 选科要求摘要
    const subjectCounts = new Map<string, number>();
    for (const m of majors) {
      const s = m.subjectRequirements || '';
      if (s) subjectCounts.set(s, (subjectCounts.get(s) || 0) + 1);
    }
    const subjectRequirementSummary = [...subjectCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(e => e[0]);

    // 4g. 招生类型分布
    const zslxDist: Record<string, number> = {};
    for (const m of majors) {
      if (m.zslxName) {
        zslxDist[m.zslxName] = (zslxDist[m.zslxName] || 0) + 1;
      }
    }

    // 4h. 计划变化
    const totalPlans2026 = majors.reduce((s, m) => s + m.planCount, 0);
    const historicalPlans = majors.reduce((s, m) => {
      const avg = m.history.length > 0
        ? m.history.filter(h => h.year !== 2026).reduce((a, b) => a + (b.admitCount ?? 0), 0) / m.history.filter(h => h.year !== 2026).length
        : 0;
      return s + (isNaN(avg) ? 0 : avg);
    }, 0);
    const avgHistorical = majors.length > 0 ? historicalPlans / majors.length * majors.length : totalPlans2026;
    // 更好的方式：直接用往年相同专业的计划数对比
    const planChangeRatio = avgHistorical > 0 ? (totalPlans2026 - avgHistorical) / avgHistorical : null;
    const planTrend = planChangeRatio !== null ? computePlanTrend(totalPlans2026, avgHistorical) : null;

    // 4i. 置信度
    const withFull = majors.filter(m => m.completeness === 'full').length;
    const withPartial = majors.filter(m => m.completeness === 'partial').length;
    const completenessRatio = (withFull + withPartial) / majors.length;
    let confidence: 'high' | 'medium' | 'low';
    if (completenessRatio >= 0.8 && withFull / majors.length >= 0.5) confidence = 'high';
    else if (completenessRatio >= 0.5) confidence = 'medium';
    else confidence = 'low';

    // 4j. 风险
    const riskFactor = computeRiskFactor(
      withFull > 0 ? Math.max(1, Math.round(majors.reduce((s, m) => s + m.historicalYears, 0) / majors.length)) : 1,
      planChangeRatio ?? 0,
      completenessRatio,
    );

    // 4k. tier
    const tiers: string[] = [];
    if (meta.f985 === '1') tiers.push('985');
    if (meta.f211 === '1') tiers.push('211');
    if (meta.dual_class === '1') tiers.push('双一流');
    const tier = tiers.join(' ');

    const levelDisplay = meta.level === '普通本科' ? '本科'
      : meta.level === '专科（高职）' ? '高职(专科)' : meta.level;

    // 4l. 学校级 gapRatio
    const schoolGapRatio = schoolWeightedRank > 0
      ? (userRank - schoolWeightedRank) / schoolWeightedRank
      : 0;

    results.push({
      schoolId,
      schoolName: meta.name,
      province: meta.province,
      level: levelDisplay,
      tier,
      is985: meta.f985 === '1',
      is211: meta.f211 === '1',
      isDualClass: meta.dual_class === '1',
      matchType: bestMajor.matchType,
      bestMajor: bestMajor.majorName,
      majorCount: majors.length,
      majoresByType: { chong, wen, bao },
      /** 院校参考位次（各专业加权平均位次的中位数 — 反映该校历年录取水平的典型位次） */
      schoolTargetRank: schoolWeightedRank,
      userRank,
      userScore,
      scoreGap: userScore - schoolMinScore,
      /** 位次差：你的位次 - 院校参考位次（负数 = 你比该校多数专业录取位次更好） */
      rankGap: schoolRankGap,
      totalPlanCount2026: totalPlans2026,
      planChangeRatio: planChangeRatio !== null ? Math.round(planChangeRatio * 100) / 100 : null,
      planTrend,
      level2Distribution: level2Dist,
      subjectRequirementSummary,
      zslxDistribution: zslxDist,
      confidence,
      riskFactor,
      majors: majors.sort((a, b) => {
        // 保 → 稳 → 冲，同类型加权位次升序
        const ta = typeOrder[a.matchType];
        const tb = typeOrder[b.matchType];
        if (ta !== tb) return tb - ta;
        return a.weightedAvgRank - b.weightedAvgRank;
      }),
      matchMode,
      batch,
    });
  }

  // ---- 5. 排序 ----
  const resultTypeOrder: Record<MatchType, number> = { '冲': 0, '稳': 1, '保': 2 };
  results.sort((a, b) => {
    const t = resultTypeOrder[a.matchType] - resultTypeOrder[b.matchType];
    if (t !== 0) return t;
    return Math.abs(a.rankGap) - Math.abs(b.rankGap);
  });

  return results;
}
