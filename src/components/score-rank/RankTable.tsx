'use client';

import { ScoreRankSearchResult } from '@/types/score-rank';
import { EquivalentScoreResult } from '@/types/equivalent-score';

interface RankTableProps {
  result: ScoreRankSearchResult | null;
  equivalentResult?: EquivalentScoreResult | null;
}

export function RankTable({ result, equivalentResult }: RankTableProps) {
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

      {/* 历史等效分 */}
      {equivalentResult && equivalentResult.equivalents.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-100">
          <h4 className="text-sm font-medium text-slate-400 mb-3">历史等效分</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {equivalentResult.equivalents.map((eq) => (
              <div key={eq.year} className="bg-indigo-50 rounded-xl p-3 text-center">
                <div className="text-xs text-slate-400 mb-1">{eq.year} 年</div>
                <div className="text-lg font-bold text-indigo-600">
                  {eq.minScore === eq.maxScore
                    ? `${eq.maxScore} 分`
                    : `${eq.minScore} ~ ${eq.maxScore} 分`}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  位次 {eq.rankStart.toLocaleString()} ~ {eq.rankEnd.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          {/* 趋势提示 */}
          <div className="mt-2 text-xs text-slate-400 text-center">
            {equivalentResult.trend === 'rising' && '近年分数整体上涨 ↗'}
            {equivalentResult.trend === 'falling' && '近年分数整体下降 ↘'}
            {equivalentResult.trend === 'stable' && '近年分数相对稳定 →'}
          </div>
        </div>
      )}
    </div>
  );
}
