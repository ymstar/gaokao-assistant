'use client';

import Link from 'next/link';
import { provinces } from '@/lib/provinces';
import { BookOpen, Calculator, GraduationCap, Target, BarChart3 } from 'lucide-react';

const featureCards = [
  { name: '一分一档查询', desc: '查看历年分数排名数据和趋势', icon: BookOpen, path: 'score-rank', color: 'bg-indigo-50 text-indigo-600', provinceScoped: true },
  { name: '等效分计算', desc: '根据当年分数计算历年等效分', icon: Calculator, path: 'equivalent-score', color: 'bg-emerald-50 text-emerald-600', provinceScoped: true },
  { name: '冲稳保匹配', desc: '输入分数自动匹配冲、稳、保三档院校', icon: Target, path: 'match', color: 'bg-rose-50 text-rose-600', provinceScoped: true },
  { name: '投档分析', desc: '分析投档数据，洞察志愿号分布与竞争热度', icon: BarChart3, path: 'admission-analysis', color: 'bg-violet-50 text-violet-600', provinceScoped: false },
  { name: '院校库', desc: '查看全国所有院校基本信息', icon: GraduationCap, path: 'universities', color: 'bg-amber-50 text-amber-600', provinceScoped: false },
];

export default function HomePage() {
  const defaultProvince = provinces[0]?.code || 'hebei';

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-14">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-3">
          高考志愿助手
        </h1>
        <p className="text-lg text-slate-500">
          高考一分一档查询 · 等效分计算 · 冲稳保匹配 · 大学招生信息
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {featureCards.map((f) => (
          <Link
            key={f.name}
            href={f.provinceScoped ? `/${defaultProvince}/${f.path}` : `/${f.path}`}
            className="group bg-white rounded-2xl border border-slate-200 p-6 hover:border-indigo-200 hover:shadow-md transition-all"
          >
            <div className={`w-11 h-11 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
              <f.icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
              {f.name}
            </h3>
            <p className="text-sm text-slate-500">{f.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
