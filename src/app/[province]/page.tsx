import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen, Calculator, GraduationCap, Search } from 'lucide-react';
import { getProvince } from '@/lib/provinces';

const features = [
  { name: '一分一档查询', desc: '查看历年分数排名数据和趋势', icon: BookOpen, path: '/score-rank', color: 'bg-indigo-50 text-indigo-600' },
  { name: '等效分计算', desc: '根据当年分数计算前三年的等效分', icon: Calculator, path: '/equivalent-score', color: 'bg-emerald-50 text-emerald-600' },
  { name: '院校库', desc: '查看全国所有院校基本信息', icon: GraduationCap, path: '/universities', color: 'bg-amber-50 text-amber-600' },
];

export default async function ProvincePage({ params }: { params: Promise<{ province: string }> }) {
  const { province: provinceCode } = await params;
  const province = getProvince(provinceCode);
  if (!province) notFound();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{province.name}</h1>
        <p className="text-sm text-slate-400 mt-1">数据来源：{province.source} ({province.sourceUrl})</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((f) => (
          <Link
            key={f.path}
            href={`/${provinceCode}${f.path}`}
            className="group bg-white rounded-2xl border border-slate-200 p-6 hover:border-indigo-200 hover:shadow-md transition-all"
          >
            <div className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center mb-3`}>
              <f.icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{f.name}</h3>
            <p className="text-sm text-slate-500 mt-1">{f.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
