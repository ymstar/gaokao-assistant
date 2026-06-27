import React from 'react';
import type { MajorMatchDetail } from '@/types/match';
import YearTrendBadge from './YearTrendBadge';

interface MajorDetailTableProps {
  majors: MajorMatchDetail[];
}

const matchTypeBadge = {
  '冲': 'bg-red-100 text-red-600',
  '稳': 'bg-blue-100 text-blue-600',
  '保': 'bg-green-100 text-green-600',
} as const;

export default function MajorDetailTable({ majors }: MajorDetailTableProps) {
  // 收集有数据的年份
  const allYears = new Set<number>();
  for (const m of majors) {
    for (const h of m.history) {
      if (h.year >= 2023 && h.year <= 2025) allYears.add(h.year);
    }
  }
  const yearCols = [...allYears].sort((a, b) => b - a);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-400 border-b border-slate-100">
            <th className="text-left py-2 pr-3 font-medium sticky left-0 bg-white">专业名称</th>
            <th className="text-center py-2 px-2 font-medium">匹配</th>
            <th className="text-right py-2 px-2 font-medium">2026计划</th>
            <th className="text-right py-2 px-2 font-medium">学费/学制</th>
            <th className="text-left py-2 px-2 font-medium">选科要求</th>
            <th className="text-left py-2 px-2 font-medium">招生类型</th>
            {yearCols.map(y => (
              <th key={y} className="text-center py-2 px-2 font-medium" colSpan={3}>{y}</th>
            ))}
            <th className="text-center py-2 px-2 font-medium">趋势</th>
          </tr>
          <tr className="text-slate-400 border-b border-slate-100">
            <th className="sticky left-0 bg-white" />
            <th />
            <th />
            <th />
            <th />
            <th />
            {yearCols.map(y => (
              <React.Fragment key={y}>
                <th className="text-right py-1.5 px-1 font-normal text-[11px]">分数</th>
                <th className="text-right py-1.5 px-1 font-normal text-[11px]">位次</th>
                <th className="text-right py-1.5 px-1 font-normal text-[11px]">录取</th>
              </React.Fragment>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {majors.map((m, i) => (
            <tr key={m.specialId} className={i % 2 === 0 ? '' : 'bg-slate-50/50'}>
              {/* 专业名 */}
              <td className="py-1.5 pr-3 text-slate-700 sticky left-0 bg-inherit max-w-[200px] truncate"
                title={m.majorFullName}>
                {m.majorName}
              </td>

              {/* 匹配类型 */}
              <td className="py-1.5 px-2 text-center">
                <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${matchTypeBadge[m.matchType]}`}>
                  {m.matchType}
                </span>
              </td>

              {/* 2026 计划 */}
              <td className="py-1.5 px-2 text-right font-medium text-slate-700">
                {m.planCount}
              </td>

              {/* 学费/学制 */}
              <td className="py-1.5 px-2 text-right text-slate-500">
                {m.tuition && m.tuition !== '0' ? `${parseInt(m.tuition).toLocaleString()}元` : '-'}
                <span className="text-slate-400 ml-0.5">{m.duration && m.duration !== 'null' ? `/${m.duration}` : ''}</span>
              </td>

              {/* 选科要求 */}
              <td className="py-1.5 px-2">
                {m.subjectRequirements ? (
                  <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[11px] font-medium">
                    {m.subjectRequirements.replace(/首选|再选/g, '').trim()}
                  </span>
                ) : <span className="text-slate-300">-</span>}
              </td>

              {/* 招生类型 */}
              <td className="py-1.5 px-2 text-slate-500">
                {m.zslxName || '-'}
              </td>

              {/* 各年数据 */}
              {yearCols.map(y => {
                const h = m.history.find(d => d.year === y);
                return h ? (
                  <React.Fragment key={y}>
                    <td className="py-1.5 px-1 text-right font-medium text-slate-800">
                      {h.minScore}
                    </td>
                    <td className="py-1.5 px-1 text-right text-slate-500">
                      {h.minRank > 0 ? h.minRank.toLocaleString() : '-'}
                    </td>
                    <td className="py-1.5 px-1 text-right text-slate-400">
                      {h.admitCount ? h.admitCount.toLocaleString() : '-'}
                    </td>
                  </React.Fragment>
                ) : (
                  <React.Fragment key={y}>
                    <td className="py-1.5 px-1 text-right text-slate-300">-</td>
                    <td className="py-1.5 px-1 text-right text-slate-300">-</td>
                    <td className="py-1.5 px-1 text-right text-slate-300">-</td>
                  </React.Fragment>
                );
              })}

              {/* 趋势 */}
              <td className="py-1.5 px-2 text-center">
                <YearTrendBadge trend={m.trend} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
