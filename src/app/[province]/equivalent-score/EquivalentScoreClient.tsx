'use client';

import { useState } from 'react';
import { SubjectGroup, ScoreRankData } from '@/types/score-rank';
import { EquivalentScoreResult } from '@/types/equivalent-score';
import { EquivalentScoreChart } from '@/components/charts/EquivalentScoreChart';
import { calculateEquivalentScore } from '@/lib/utils/equivalent-score';

interface EquivalentScoreClientProps {
  initialData?: ScoreRankData[];
}

function Toggle({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <div className="inline-flex bg-slate-100 rounded-lg p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            value === opt.value
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function EquivalentScoreClient({ initialData = [] }: EquivalentScoreClientProps) {
  const [year, setYear] = useState(2025);
  const [group, setGroup] = useState<SubjectGroup>('物理类');
  const [score, setScore] = useState('');
  const [result, setResult] = useState<EquivalentScoreResult | null>(null);
  const [allData] = useState<ScoreRankData[]>(initialData);

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const numScore = parseInt(score);
    if (isNaN(numScore)) return;

    const yearData = allData.find((d) => d.year === year && d.group === group);
    if (!yearData) { alert('未找到当年数据，请先导入数据'); return; }

    const entry = yearData.entries.find((e) => e.score === numScore);
    if (!entry) { alert(`未找到分数 ${numScore} 对应的排名数据`); return; }

    const equivResult = calculateEquivalentScore(year, group, numScore, entry.cumulative, allData);
    setResult(equivResult);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">等效分计算器</h1>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <form onSubmit={handleCalculate}>
          <div className="flex flex-wrap items-end gap-6 mb-5">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">当年年份</label>
              <Toggle
                value={String(year)}
                onChange={(v) => setYear(parseInt(v))}
                options={[
                  { label: '2025', value: '2025' },
                  { label: '2024', value: '2024' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">科类</label>
              <Toggle
                value={group}
                onChange={(v) => setGroup(v as SubjectGroup)}
                options={[
                  { label: '物理类', value: '物理类' },
                  { label: '历史类', value: '历史类' },
                ]}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">当年分数</label>
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="输入高考分数"
                min="0"
                max="750"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
          >
            计算等效分
          </button>
        </form>
      </div>

      {result && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs font-medium text-slate-400 mb-3">输入信息</h3>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
                {[
                  ['分数', `${result.inputScore} 分`],
                  ['排名', `第 ${result.inputRank.toLocaleString()} 名`],
                  ['年份', `${result.inputYear} 年`],
                  ['科类', result.inputGroup],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-medium text-slate-800">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-medium text-slate-400 mb-3">三年平均等效分</h3>
              <div className="bg-indigo-50 rounded-xl p-6 text-center">
                <div className="text-5xl font-bold text-indigo-600 mb-1">{result.averageScore}</div>
                <div className="text-sm text-slate-500">
                  {result.trend === 'rising' && '近年分数整体上涨'}
                  {result.trend === 'falling' && '近年分数整体下降'}
                  {result.trend === 'stable' && '近年分数相对稳定'}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-medium text-slate-400 mb-3">各年等效分明细</h3>
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-500">
                    <th className="px-4 py-2.5 font-medium">年份</th>
                    <th className="px-4 py-2.5 font-medium">等效分</th>
                    <th className="px-4 py-2.5 font-medium">排名</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.equivalents.map((eq) => (
                    <tr key={eq.year}>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{eq.year} 年</td>
                      <td className="px-4 py-2.5 text-indigo-600 font-semibold">{eq.score} 分</td>
                      <td className="px-4 py-2.5 text-slate-600">第 {eq.rank.toLocaleString()} 名</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {result.equivalents.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-slate-400 mb-3">等效分趋势</h3>
              <EquivalentScoreChart result={result} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
