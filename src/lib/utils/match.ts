import { MatchResult, MatchType, YearDetail, AdmissionLineEntry } from '@/types/admission-line';
import { ScoreRankData, SubjectGroup } from '@/types/score-rank';
import { findRankByScore } from '@/lib/utils/score-rank';
import { UniversityPlanIndex } from '@/lib/data/admission-plans';

// ============================================================
// 分类阈值
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
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

function computeRiskFactor(yearCount: number, planChangeRatio: number): 'low' | 'medium' | 'high' {
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
    const riskFactor = computeRiskFactor(weights.length, planChangeRatio);

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
