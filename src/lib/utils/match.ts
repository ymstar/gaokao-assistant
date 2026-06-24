import { MatchResult, MatchType, YearDetail } from '@/types/admission-line';
import { ScoreRankData, SubjectGroup, ScoreRankEntry } from '@/types/score-rank';
import { AdmissionBatchData, AdmissionRecord } from '@/types/admission-record';
import { findRankByScore } from '@/lib/utils/score-rank';

function classifyMatch(userRank: number, targetMinRank: number): MatchType {
  if (targetMinRank <= 0) return '冲';
  const gapRatio = (userRank - targetMinRank) / targetMinRank;
  if (gapRatio <= -0.20) return '保';
  if (gapRatio <= -0.05) return '稳';
  return '冲';
}

function scoreToRank(entries: ScoreRankEntry[], score: number): number | null {
  const result = findRankByScore(entries, score);
  return result ? result.rank : null;
}

export function matchSchools(
  userScore: number,
  year: number,
  group: SubjectGroup,
  batch: string,
  scoreRankData: ScoreRankData[],
  admissionData: AdmissionBatchData[]
): MatchResult[] {
  // 1. 查用户位次
  const sortedRankYears = scoreRankData
    .filter(d => d.group === group).map(d => d.year).sort((a, b) => b - a);
  const rankYear = sortedRankYears.find(y => y <= year) || sortedRankYears[0];
  const yearScoreData = rankYear !== undefined
    ? scoreRankData.find(d => d.year === rankYear && d.group === group) : undefined;
  if (!yearScoreData) return [];
  const userRank = scoreToRank(yearScoreData.entries, userScore);
  if (!userRank) return [];

  // 2. 筛选批次数据
  const relevantData = admissionData.filter(d => d.batch === batch && d.group === group);
  if (relevantData.length === 0) return [];

  // 3. 按院校聚合，保留各年各专业明细
  type UniYearRaw = { year: number; records: AdmissionRecord[] };
  const uniMap = new Map<string, { code: string; name: string; yearData: UniYearRaw[] }>();

  for (const batchData of relevantData) {
    const entries = scoreRankData.find(d => d.year === batchData.year && d.group === group)?.entries;
    if (!entries) continue;

    const byUni = new Map<string, AdmissionRecord[]>();
    for (const r of batchData.records) {
      if (r.minScore <= 0) continue;
      const key = r.universityName;
      if (!byUni.has(key)) byUni.set(key, []);
      byUni.get(key)!.push(r);
    }

    for (const [name, records] of byUni) {
      if (!uniMap.has(name)) {
        uniMap.set(name, { code: records[0].universityCode, name, yearData: [] });
      }
      uniMap.get(name)!.yearData.push({ year: batchData.year, records });
    }
  }

  // 4. 计算匹配结果
  const sortedYears = relevantData.map(d => d.year).sort((a, b) => b - a);
  const results: MatchResult[] = [];

  for (const [, uni] of uniMap) {
    // 构建各年详情（含专业位次）
    const yearDetails: YearDetail[] = uni.yearData
      .sort((a, b) => b.year - a.year)
      .map(yd => {
        const entries = scoreRankData.find(d => d.year === yd.year && d.group === group)?.entries;
        const sorted = [...yd.records].sort((a, b) => b.minScore - a.minScore);
        return {
          year: yd.year,
          minScore: Math.min(...sorted.map(r => r.minScore)),
          avgVolunteerNum: Math.round(sorted.reduce((s, r) => s + r.volunteerNum, 0) / sorted.length * 10) / 10,
          majors: sorted.map(r => {
            const rank = entries ? (scoreToRank(entries, r.minScore) || 0) : 0;
            return {
              majorName: r.majorName,
              minScore: r.minScore,
              minRank: rank,
              volunteerNum: r.volunteerNum,
              matchType: rank > 0 ? classifyMatch(userRank, rank) : '冲',
            };
          }),
        };
      });

    // 各年最低分 → 位次
    const yearRanks: { year: number; minScore: number; minRank: number }[] = [];
    for (const yd of uni.yearData) {
      const entries = scoreRankData.find(d => d.year === yd.year && d.group === group)?.entries;
      if (!entries) continue;
      const minScore = Math.min(...yd.records.map(r => r.minScore));
      const minRank = scoreToRank(entries, minScore);
      if (!minRank) continue;
      yearRanks.push({ year: yd.year, minScore, minRank });
    }

    if (yearRanks.length === 0) continue;

    // 加权平均位次
    const weights = sortedYears.map((y, i) => {
      const yr = yearRanks.find(r => r.year === y);
      return yr ? { weight: sortedYears.length - i, data: yr } : null;
    }).filter(Boolean) as { weight: number; data: { year: number; minScore: number; minRank: number } }[];

    if (weights.length === 0) continue;

    const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
    const weightedAvgRank = Math.round(
      weights.reduce((s, w) => s + w.data.minRank * w.weight, 0) / totalWeight
    );

    const latest = weights[0].data;
    const matchType = classifyMatch(userRank, weightedAvgRank);

    let confidence: 'high' | 'medium' | 'low' = 'medium';
    if (weights.length >= 3) confidence = 'high';
    else if (weights.length === 1) confidence = 'low';

    results.push({
      universityCode: uni.code,
      universityName: uni.name,
      majorGroup: `${yearDetails[0]?.majors.length || 0}个专业`,
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
    });
  }

  // 5. 排序
  const typeOrder: Record<MatchType, number> = { '冲': 0, '稳': 1, '保': 2 };
  results.sort((a, b) => {
    const t = typeOrder[a.matchType] - typeOrder[b.matchType];
    if (t !== 0) return t;
    return Math.abs(a.rankGap) - Math.abs(b.rankGap);
  });

  return results;
}
