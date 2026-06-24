import { notFound } from 'next/navigation';
import { getProvince } from '@/lib/provinces';
import { loadAllScoreRankData } from '@/lib/data/score-rank';
import ScoreRankClient from './ScoreRankClient';

export default async function ScoreRankPage({ params }: { params: Promise<{ province: string }> }) {
  const { province: provinceCode } = await params;
  const province = getProvince(provinceCode);
  if (!province) notFound();

  const data = await loadAllScoreRankData(provinceCode);
  return <ScoreRankClient initialData={data} />;
}
