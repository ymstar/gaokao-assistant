import { notFound } from 'next/navigation';
import { getProvince } from '@/lib/provinces';
import MatchClient from './MatchClient';

export default async function MatchPage({ params }: { params: Promise<{ province: string }> }) {
  const { province: provinceCode } = await params;
  const province = getProvince(provinceCode);
  if (!province) notFound();

  return <MatchClient province={provinceCode} />;
}
