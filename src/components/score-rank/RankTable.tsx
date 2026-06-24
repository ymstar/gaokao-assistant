'use client';

import { ScoreRankSearchResult } from '@/types/score-rank';

interface RankTableProps {
  result: ScoreRankSearchResult | null;
}

export function RankTable({ result }: RankTableProps) {
  if (!result) return null;

  const stats = [
    { label: '分数', value: result.score, unit: '分', color: 'text-indigo-600' },
    { label: '排名', value: result.rank.toLocaleString(), unit: '名', color: 'text-emerald-600' },
    { label: '同分人数', value: result.count.toLocaleString(), unit: '人', color: 'text-amber-600' },
    { label: '超越', value: `${(100 - result.percentile).toFixed(1)}%`, unit: '', color: 'text-rose-600' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-sm font-medium text-slate-400 mb-4">查询结果</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-slate-50 rounded-xl p-4">
            <div className={`text-2xl font-bold ${s.color}`}>
              {s.value}{s.unit && <span className="text-sm font-normal ml-0.5">{s.unit}</span>}
            </div>
            <div className="text-xs text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-slate-400">
        总人数 {result.totalCandidates.toLocaleString()}
      </div>
    </div>
  );
}
