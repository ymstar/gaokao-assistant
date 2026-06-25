'use client';

import { useState } from 'react';
import { SubjectGroup, ScoreRankData } from '@/types/score-rank';
import { ProvinceBaselineEntry } from '@/types/baseline';
import { ScoreInputForm } from '@/components/score-rank/ScoreInputForm';
import { RankTable } from '@/components/score-rank/RankTable';
import { ScoreRankChart } from '@/components/charts/ScoreRankChart';
import { ScoreDistributionChart } from '@/components/charts/ScoreDistributionChart';
import { ScoreRankSearchResult } from '@/types/score-rank';

interface ScoreRankClientProps {
  initialData?: ScoreRankData[];
  baselines?: ProvinceBaselineEntry[] | null;
}

function Toggle({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <div className="inline-flex bg-slate-100 rounded-lg p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
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

export default function ScoreRankClient({ initialData = [], baselines = null }: ScoreRankClientProps) {
  const [year, setYear] = useState(2026);
  const [group, setGroup] = useState<SubjectGroup>('物理类');
  const [result, setResult] = useState<ScoreRankSearchResult | null>(null);
  const [allData] = useState<ScoreRankData[]>(initialData);
  const [searchedScore, setSearchedScore] = useState<number | null>(null);
  const [distYears, setDistYears] = useState<Set<number>>(new Set([2026]));

  const handleSearch = async (score: number) => {
    setSearchedScore(score);
    const yearData = allData.find((d) => d.year === year && d.group === group);
    if (yearData) {
      const entry = yearData.entries.find((e) => e.score === score);
      if (entry) {
        setResult({
          score: entry.score,
          count: entry.count,
          rank: entry.cumulative,
          totalCandidates: yearData.totalCandidates,
          percentile: (entry.cumulative / yearData.totalCandidates) * 100,
        });
      } else {
        setResult(null);
      }
    }
  };

  const yearData = allData.filter((d) => d.group === group);
  const availableYears = [...new Set(allData.map(d => d.year))].sort((a, b) => b - a);
  const groupBaselines = baselines?.filter(b => b.group === group) ?? [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">一分一档表查询</h1>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex flex-wrap items-end gap-6 mb-5">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">年份</label>
            <Toggle
              value={String(year)}
              onChange={(v) => setYear(parseInt(v))}
              options={availableYears.map(y => ({ label: String(y), value: String(y) }))}
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
        </div>
        <ScoreInputForm onSubmit={handleSearch} placeholder="输入分数查询排名" />
      </div>

      {result && <RankTable result={result} />}

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">历年排名对比</h2>
        {yearData.length > 0 ? (
          <ScoreRankChart data={yearData} highlightedScore={searchedScore ?? undefined} baselines={groupBaselines} />
        ) : (
          <p className="text-sm text-slate-400 text-center py-12">暂无数据</p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">同分人数分布</h2>
          <div className="flex gap-1.5">
            {yearData.map((d) => (
              <button
                key={d.year}
                onClick={() => {
                  setDistYears((prev) => {
                    const next = new Set(prev);
                    if (next.has(d.year)) {
                      if (next.size > 1) next.delete(d.year);
                    } else {
                      next.add(d.year);
                    }
                    return next;
                  });
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  distYears.has(d.year)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {d.year}
              </button>
            ))}
          </div>
        </div>
        {yearData.length > 0 ? (
          <ScoreDistributionChart data={yearData.filter((d) => distYears.has(d.year))} baselines={groupBaselines} />
        ) : (
          <p className="text-sm text-slate-400 text-center py-12">暂无数据</p>
        )}
      </div>
    </div>
  );
}
