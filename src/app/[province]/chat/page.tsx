import { notFound } from 'next/navigation';
import { getProvince } from '@/lib/provinces';
import ChatClient from './ChatClient';

export default async function ChatPage({
  params,
}: {
  params: Promise<{ province: string }>;
}) {
  const { province: provinceCode } = await params;
  const province = getProvince(provinceCode);
  if (!province) notFound();

  return <ChatClient province={provinceCode} />;
}
