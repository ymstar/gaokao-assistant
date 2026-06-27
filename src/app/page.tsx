'use client';

import Link from 'next/link';
import { provinces } from '@/lib/provinces';
import { BookOpen, GraduationCap, Target, BarChart3, MessageSquare, TrendingUp, FileText } from 'lucide-react';

const featureCards = [
  { name: '一分一档查询', desc: '查看历年分数排名数据和趋势', icon: BookOpen, path: 'score-rank', color: 'bg-indigo-50 text-indigo-600', provinceScoped: true },
  { name: '冲稳保匹配', desc: '输入分数自动匹配冲、稳、保三档院校', icon: Target, path: 'match', color: 'bg-rose-50 text-rose-600', provinceScoped: true },
  { name: '冲稳保匹配', desc: '输入分数自动匹配冲、稳、保三档院校', icon: Target, path: 'match', color: 'bg-rose-50 text-rose-600', provinceScoped: true },
  { name: '院校库', desc: '查看全国所有院校基本信息', icon: GraduationCap, path: 'universities', color: 'bg-amber-50 text-amber-600', provinceScoped: false },
  { name: '投档线查询', desc: '查询历年投档线和位次数据，多维度分析', icon: TrendingUp, path: 'admission-lines', color: 'bg-violet-50 text-violet-600', provinceScoped: false },
  { name: '招生计划总览', desc: '2026年本科招生计划全景统计和查询', icon: FileText, path: 'enrollment-plan', color: 'bg-pink-50 text-pink-600', provinceScoped: false },
  { name: 'AI志愿咨询', desc: '张雪峰风格的智能问答，基于真实数据', icon: MessageSquare, path: 'chat', color: 'bg-cyan-50 text-cyan-600', provinceScoped: true },
];

export default function HomePage() {
  const defaultProvince = provinces[0]?.code || 'hebei';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-10 sm:mb-14">
        <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">
          高考志愿助手
        </h1>
        <p className="text-sm sm:text-lg text-slate-500">
          高考一分一档查询 · 等效分计算 · 冲稳保匹配 · 大学招生信息
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
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
