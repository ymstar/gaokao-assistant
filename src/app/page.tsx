'use client';

import Link from 'next/link';
import { provinces } from '@/lib/provinces';
import { BookOpen, Calculator, GraduationCap } from 'lucide-react';

const featureCards = [
  { name: '一分一档查询', desc: '查看历年分数排名数据和趋势', icon: BookOpen, path: '/score-rank', color: 'bg-indigo-50 text-indigo-600' },
  { name: '等效分计算', desc: '根据当年分数计算历年等效分', icon: Calculator, path: '/equivalent-score', color: 'bg-emerald-50 text-emerald-600' },
  { name: '院校库', desc: '查看全国所有院校基本信息', icon: GraduationCap, path: '/universities', color: 'bg-amber-50 text-amber-600' },
];

export default function HomePage() {
  // 默认使用第一个省份（当前只有河北）
  const defaultProvince = provinces[0]?.code || 'hebei';

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-14">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-3">
          高考志愿助手
        </h1>
        <p className="text-lg text-slate-500">
          河北省高考一分一档查询 · 等效分计算 · 大学招生信息
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
        {featureCards.map((f) => (
          <Link
            key={f.name}
            href={`/${defaultProvince}${f.path}`}
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

      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-5">选择省份</h2>
        <div className="flex flex-wrap gap-3">
          {provinces.map((province) => (
            <Link
              key={province.code}
              href={`/${province.code}`}
              className="px-5 py-3 rounded-xl border border-slate-200 text-center hover:border-indigo-300 hover:bg-indigo-50 transition-all"
            >
              <div className="font-semibold text-slate-800">{province.nameShort}</div>
              <div className="text-xs text-slate-400 mt-0.5">{province.name}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
