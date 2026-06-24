import { MatchResult, MatchType, AdmissionLineData } from '@/types/admission-line';
import { ScoreRankData, SubjectGroup } from '@/types/score-rank';

/**
 * 根据位次差比例判断匹配类型
 *
 * 以投档最低位次为基准：
 * - 保：用户位次比投档位次高 20% 以上（位次数字更小 = 更好）
 * - 稳：用户位次比投档位次高 5%-20%
 * - 冲：用户位次比投档位次高 0%-5%，或低于投档位次
 *
 * 注：排名数字越小越好，rankGap = userRank - targetMinRank
 * 负数 = 用户排名更靠前（好事），正数 = 用户排名更靠后
 */
function classifyMatch(
  userRank: number,
  targetMinRank: number
): { matchType: MatchType; confidence: 'high' | 'medium' | 'low' } {
  if (targetMinRank <= 0) {
    return { matchType: '冲', confidence: 'low' };
  }

  // rankGap 为负数表示用户排名更靠前
  const rankGap = userRank - targetMinRank;
  const gapRatio = rankGap / targetMinRank;

  let matchType: MatchType;
  if (gapRatio <= -0.20) {
    matchType = '保';
  } else if (gapRatio <= -0.05) {
    matchType = '稳';
  } else {
    matchType = '冲';
  }

  return { matchType, confidence: 'medium' };
}

/**
 * 匹配冲稳保学校
 *
 * @param userScore - 用户当年分数
 * @param year - 用户成绩所在年份
 * @param group - 科类（物理类/历史类）
 * @param batch - 批次（默认"本科批"）
 * @param scoreRankData - 所有一分一档数据（需要多年数据以提高置信度）
 * @param admissionLines - 所有投档线数据（需要多年数据以提高置信度）
 * @param targetYears - 分析的目标年份（默认使用投档线数据中的所有年份）
 */
export function matchSchools(
  userScore: number,
  year: number,
  group: SubjectGroup,
  batch: string,
  scoreRankData: ScoreRankData[],
  admissionLines: AdmissionLineData[],
  targetYears?: number[]
): MatchResult[] {
  // 1. 用一分一档算出用户当年的位次
  const yearData = scoreRankData.find((d) => d.year === year && d.group === group);
  if (!yearData) return [];

  const entry = yearData.entries.find((e) => e.score === userScore);
  if (!entry) return [];

  const userRank = entry.cumulative;

  // 2. 筛选目标年份和批次的投档线
  const years = targetYears || [...new Set(admissionLines.map((d) => d.year))];
  const relevantLines = admissionLines.filter(
    (d) => years.includes(d.year) && d.batch === batch && d.group === group
  );

  if (relevantLines.length === 0) return [];

  // 3. 按 (universityCode, majorGroup) 聚合多年投档线数据
  //    取加权平均（近期权重更高）
  type SchoolGroupKey = string;
  const aggregated = new Map<
    SchoolGroupKey,
    {
      universityCode: string;
      universityName: string;
      majorGroup: string;
      subjectRequirements?: string;
      minRanks: { year: number; minRank: number; minScore: number }[];
    }
  >();

  // 按年份降序排列，近期权重更高
  const sortedYears = [...years].sort((a, b) => b - a);

  for (const lineData of relevantLines) {
    for (const entry of lineData.entries) {
      const key = `${entry.universityCode}::${entry.majorGroup}`;
      if (!aggregated.has(key)) {
        aggregated.set(key, {
          universityCode: entry.universityCode,
          universityName: entry.universityName,
          majorGroup: entry.majorGroup,
          subjectRequirements: entry.subjectRequirements,
          minRanks: [],
        });
      }
      aggregated.get(key)!.minRanks.push({
        year: lineData.year,
        minRank: entry.minRank,
        minScore: entry.minScore,
      });
    }
  }

  // 4. 对每个学校专业组计算匹配结果
  const results: MatchResult[] = [];

  for (const [, schoolData] of aggregated) {
    const { minRanks } = schoolData;
    if (minRanks.length === 0) continue;

    // 计算加权平均位次（近期权重更高：最新年=3，次年=2，最旧=1）
    const weights = sortedYears.map((y, i) => {
      const yearRank = minRanks.find((r) => r.year === y);
      return yearRank ? { weight: sortedYears.length - i, data: yearRank } : null;
    }).filter(Boolean) as { weight: number; data: { year: number; minRank: number; minScore: number } }[];

    if (weights.length === 0) continue;

    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    const weightedAvgRank = Math.round(
      weights.reduce((sum, w) => sum + w.data.minRank * w.weight, 0) / totalWeight
    );
    // 取最近一年的投档线分数作为展示
    const latestData = weights[0].data;

    const { matchType, confidence } = classifyMatch(userRank, weightedAvgRank);

    // 置信度调整：数据年份越多越可信
    let finalConfidence: 'high' | 'medium' | 'low' = confidence;
    if (weights.length >= 3) finalConfidence = 'high';
    else if (weights.length === 1) finalConfidence = 'low';

    results.push({
      universityCode: schoolData.universityCode,
      universityName: schoolData.universityName,
      majorGroup: schoolData.majorGroup,
      batch,
      matchType,
      targetMinScore: latestData.minScore,
      targetMinRank: weightedAvgRank,
      userScore,
      userRank,
      scoreGap: userScore - latestData.minScore,
      rankGap: userRank - weightedAvgRank,
      confidence: finalConfidence,
      subjectRequirements: schoolData.subjectRequirements,
    });
  }

  // 5. 按匹配类型分组排序：冲 → 稳 → 保，每组内按位次差从小到大（越接近越有价值）
  const typeOrder: Record<MatchType, number> = { '冲': 0, '稳': 1, '保': 2 };
  results.sort((a, b) => {
    const typeDiff = typeOrder[a.matchType] - typeOrder[b.matchType];
    if (typeDiff !== 0) return typeDiff;
    // 同类型内，位次差越小（越接近投档线）排越前
    return Math.abs(a.rankGap) - Math.abs(b.rankGap);
  });

  return results;
}
