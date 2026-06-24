import { notFound } from 'next/navigation';
import { getProvince } from '@/lib/provinces';
import { loadAllScoreRankData } from '@/lib/data/score-rank';
import EquivalentScoreClient from './EquivalentScoreClient';

export default async function EquivalentScorePage({ params }: { params: Promise<{ province: string }> }) {
  const { province: provinceCode } = await params;
  const province = getProvince(provinceCode);
  if (!province) notFound();

  const data = await loadAllScoreRankData(provinceCode);
  return <EquivalentScoreClient initialData={data} />;
}
