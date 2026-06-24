import { notFound } from 'next/navigation';
import { getProvince } from '@/lib/provinces';
import UniversitiesClient from './UniversitiesClient';

export default async function UniversitiesPage({ params }: { params: Promise<{ province: string }> }) {
  const { province: provinceCode } = await params;
  const province = getProvince(provinceCode);
  if (!province) notFound();

  return <UniversitiesClient province={provinceCode} />;
}
