import { notFound } from 'next/navigation';
import { getProvince } from '@/lib/provinces';
import { loadAllScoreRankData } from '@/lib/data/score-rank';
import { loadProvinceBaselines } from '@/lib/data/baselines';
import { ProvinceBaselineEntry } from '@/types/baseline';
import ScoreRankClient from './ScoreRankClient';

export default async function ScoreRankPage({ params }: { params: Promise<{ province: string }> }) {
  const { province: provinceCode } = await params;
  const province = getProvince(provinceCode);
  if (!province) notFound();

  const [data, baselines] = await Promise.all([
    loadAllScoreRankData(provinceCode),
    loadProvinceBaselines(provinceCode),
  ]);

  return <ScoreRankClient initialData={data} baselines={baselines?.entries ?? null} />;
}
