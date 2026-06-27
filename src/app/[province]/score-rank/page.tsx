import { notFound } from 'next/navigation';
import { getProvince } from '@/lib/provinces';
import { loadAllScoreRankDataWithEquivalents, loadAllChartRows } from '@/lib/db/score-rank-adapter';
import ScoreRankClient from './ScoreRankClient';

export default async function ScoreRankPage({ params }: { params: Promise<{ province: string }> }) {
  const { province: provinceCode } = await params;
  const province = getProvince(provinceCode);
  if (!province) notFound();

  const data = loadAllScoreRankDataWithEquivalents(provinceCode);

  // 为图表预加载评分段 raw rows（所有科类）
  const allGroups = ['物理类', '历史类', '理科', '文科'] as const;
  const chartRowsMap: Record<string, { year: number; rows: import('@/types/score-rank-chart').ScoreRankRow[] }[]> = {};
  for (const group of allGroups) {
    chartRowsMap[group] = loadAllChartRows(provinceCode, group);
  }

  return (
    <ScoreRankClient
      initialData={data}
      chartRowsMap={chartRowsMap}
    />
  );
}
