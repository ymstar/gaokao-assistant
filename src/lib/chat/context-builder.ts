import { loadScoreRankData, loadAllScoreRankData } from '@/lib/data/score-rank';
import { searchUniversities } from '@/lib/data/universities';
import { scanAvailableBatches, loadAdmissionData } from '@/lib/data/admission';
import { findRankByScore } from '@/lib/utils/score-rank';

export async function buildUserContext(
  userMessage: string,
  province: string,
): Promise<string | null> {
  const parts: string[] = [];

  // 检测分数查询
  const scoreMatch = userMessage.match(/(\d{3})\s*分/);
  if (scoreMatch) {
    const score = parseInt(scoreMatch[1]);
    if (score >= 100 && score <= 750) {
      const context = await buildScoreContext(score, province);
      if (context) parts.push(context);
    }
  }

  // 检测大学名称查询
  const universityContext = await buildUniversityContext(userMessage, province);
  if (universityContext) parts.push(universityContext);

  // 检测冲稳保/匹配相关
  if (/冲稳保|匹配|能上什么|冲一冲|稳一稳|保一保/.test(userMessage)) {
    parts.push('提示：系统提供冲稳保匹配功能，可根据分数自动匹配冲、稳、保三档院校。用户可以访问冲稳保匹配页面获取详细结果。');
  }

  // 检测排名/位次查询
  if (/排名|位次|排第几|百分比|超越/.test(userMessage) && !scoreMatch) {
    const rankContext = await buildRankSummaryContext(province);
    if (rankContext) parts.push(rankContext);
  }

  return parts.length > 0 ? parts.join('\n\n') : null;
}

async function buildScoreContext(score: number, province: string): Promise<string | null> {
  try {
    const allData = await loadAllScoreRankData(province);
    // 用最近一年的数据
    const sortedYears = [...new Set(allData.map(d => d.year))].sort((a, b) => b - a);
    const latestYear = sortedYears[0];
    if (!latestYear) return null;

    // 获取物理类和历史类的结果
    const results: string[] = [];
    for (const group of ['物理类', '历史类']) {
      const data = allData.find(d => d.year === latestYear && d.group === group);
      if (!data) continue;
      const result = findRankByScore(data.entries, score);
      if (result) {
        results.push(
          `${latestYear}年${group}：${score}分对应位次第${result.rank}名，` +
          `同分${result.count}人，共${result.totalCandidates}人，超越${(result.percentile * 100).toFixed(1)}%的考生`
        );
      }
    }

    if (results.length > 0) {
      return `【${score}分位次数据】\n${results.join('\n')}`;
    }
  } catch {
    // 数据加载失败，静默忽略
  }
  return null;
}

async function buildUniversityContext(
  userMessage: string,
  province: string,
): Promise<string | null> {
  try {
    // 提取可能的大学名称关键词（2-4个字的连续中文）
    const nameMatches = userMessage.match(/[一-龥]{2,8}(?:大学|学院|学校)/g);
    if (!nameMatches || nameMatches.length === 0) return null;

    const results: string[] = [];
    const seen = new Set<string>();

    for (const name of nameMatches) {
      if (seen.has(name)) continue;
      seen.add(name);

      // 搜索院校基本信息
      const universities = await searchUniversities(province, 2025, '物理类', name);
      if (universities.length > 0) {
        const uni = universities[0];
        const info = [
          `${uni.name}`,
          uni.level ? `层次：${uni.level}` : '',
          uni.type ? `类型：${uni.type}` : '',
          uni.location ? `地区：${uni.location}` : '',
          uni.address ? `地址：${uni.address}` : '',
          uni.officialWebsite ? `官网：${uni.officialWebsite}` : '',
        ].filter(Boolean).join('，');
        results.push(info);
      }
    }

    if (results.length > 0) {
      return `【院校信息】\n${results.join('\n\n')}`;
    }
  } catch {
    // 搜索失败，静默忽略
  }
  return null;
}

async function buildRankSummaryContext(province: string): Promise<string | null> {
  try {
    const allData = await loadAllScoreRankData(province);
    const sortedYears = [...new Set(allData.map(d => d.year))].sort((a, b) => b - a);
    const latestYear = sortedYears[0];
    if (!latestYear) return null;

    const summaries: string[] = [];
    for (const group of ['物理类', '历史类']) {
      const data = allData.find(d => d.year === latestYear && d.group === group);
      if (!data) continue;
      summaries.push(
        `${latestYear}年${group}：共${data.totalCandidates}人，` +
        `最高分${data.maxScore}，最低分${data.minScore}`
      );
    }

    if (summaries.length > 0) {
      return `【一分一档概览】\n${summaries.join('\n')}`;
    }
  } catch {
    // 数据加载失败
  }
  return null;
}
