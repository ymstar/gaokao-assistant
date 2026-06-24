'use client';

import { useState } from 'react';
import { SubjectGroup, ScoreRankData } from '@/types/score-rank';
import { MatchResult } from '@/types/admission-line';

interface MatchClientProps {
  province: string;
  scoreRankData: ScoreRankData[];
}

interface MatchResponse {
  input: { score: number; year: number; group: string; batch: string };
  userRank: number | null;
  totalCandidates: number | null;
  summary: { total: number; chong: number; wen: number; bao: number };
  results: MatchResult[];
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

const matchTypeColors = {
  '冲': { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', badge: 'bg-red-100 text-red-700' },
  '稳': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  '保': { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
};

const confidenceLabels = {
  'high': { label: '高置信', color: 'text-green-600' },
  'medium': { label: '中置信', color: 'text-amber-600' },
  'low': { label: '低置信', color: 'text-slate-400' },
};

function MatchCard({ result }: { result: MatchResult }) {
  const colors = matchTypeColors[result.matchType];
  const conf = confidenceLabels[result.confidence];

  return (
    <div className={`bg-white rounded-xl border ${colors.border} p-4 hover:shadow-md transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors.badge}`}>
              {result.matchType}
            </span>
            <h3 className="font-semibold text-slate-900 truncate">{result.universityName}</h3>
          </div>
          <div className="text-sm text-slate-500 mb-2">
            {result.majorGroup}
            {result.subjectRequirements && (
              <span className="ml-2 text-xs text-slate-400">选科: {result.subjectRequirements}</span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400">投档线</span>
              <div className="font-semibold text-slate-800">{result.targetMinScore} 分</div>
            </div>
            <div>
              <span className="text-slate-400">投档位次</span>
              <div className="font-semibold text-slate-800">{result.targetMinRank.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-slate-400">分差</span>
              <div className={`font-semibold ${result.scoreGap >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {result.scoreGap >= 0 ? '+' : ''}{result.scoreGap}
              </div>
            </div>
            <div>
              <span className="text-slate-400">位次差</span>
              <div className={`font-semibold ${result.rankGap <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {result.rankGap <= 0 ? '' : '+'}{result.rankGap.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
        <span className={`text-[11px] ${conf.color} shrink-0`}>{conf.label}</span>
      </div>
    </div>
  );
}

function MatchSection({ title, icon, results, type }: {
  title: string;
  icon: string;
  results: MatchResult[];
  type: '冲' | '稳' | '保';
}) {
  const colors = matchTypeColors[type];

  if (results.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <h2 className={`text-base font-semibold ${colors.text}`}>
          {title}
          <span className="ml-2 text-sm font-normal text-slate-400">({results.length} 所)</span>
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {results.map((r, i) => (
          <MatchCard key={`${r.universityCode}-${r.majorGroup}-${i}`} result={r} />
        ))}
      </div>
    </section>
  );
}

export default function MatchClient({ province, scoreRankData }: MatchClientProps) {
  const [year, setYear] = useState(2025);
  const [group, setGroup] = useState<SubjectGroup>('物理类');
  const [score, setScore] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<MatchResponse | null>(null);
  const [error, setError] = useState('');

  const availableYears = [...new Set(scoreRankData.map((d) => d.year))].sort((a, b) => b - a);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const numScore = parseInt(score);
    if (isNaN(numScore)) return;

    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const params = new URLSearchParams({
        score: String(numScore),
        year: String(year),
        group,
        batch: '本科批',
      });
      const res = await fetch(`/api/${province}/match?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '查询失败');
      } else if (data.error && data.results?.length === 0) {
        setError(data.error);
      } else {
        setResponse(data);
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const chongResults = response?.results.filter((r) => r.matchType === '冲') || [];
  const wenResults = response?.results.filter((r) => r.matchType === '稳') || [];
  const baoResults = response?.results.filter((r) => r.matchType === '保') || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">冲稳保匹配</h1>
        <p className="text-sm text-slate-400 mt-1">输入分数，自动匹配适合你的院校</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <form onSubmit={handleSearch}>
          <div className="flex flex-wrap items-end gap-6 mb-5">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">年份</label>
              <Toggle
                value={String(year)}
                onChange={(v) => setYear(parseInt(v))}
                options={availableYears.map((y) => ({ label: String(y), value: String(y) }))}
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
              <label className="block text-xs font-medium text-slate-400 mb-1.5">高考分数</label>
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
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition-colors"
          >
            {loading ? '匹配中...' : '查询匹配'}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          {error}
        </div>
      )}

      {response && response.userRank && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-xs font-medium text-slate-400 mb-3">你的位置</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-xs text-slate-400">分数</div>
              <div className="text-2xl font-bold text-indigo-600">{response.input.score}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-xs text-slate-400">排名</div>
              <div className="text-2xl font-bold text-indigo-600">{response.userRank.toLocaleString()}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-xs text-slate-400">超过考生</div>
              <div className="text-2xl font-bold text-indigo-600">
                {response.totalCandidates
                  ? `${(((response.totalCandidates - response.userRank) / response.totalCandidates) * 100).toFixed(1)}%`
                  : '-'}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-xs text-slate-400">匹配院校</div>
              <div className="text-2xl font-bold text-indigo-600">{response.summary.total}</div>
            </div>
          </div>
        </div>
      )}

      {response && response.summary.total > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-xs font-medium text-slate-400 mb-3">匹配概览</h2>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400"></span>
              <span className="text-slate-600">冲一冲</span>
              <span className="font-semibold text-red-600">{response.summary.chong}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-400"></span>
              <span className="text-slate-600">稳一稳</span>
              <span className="font-semibold text-blue-600">{response.summary.wen}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-400"></span>
              <span className="text-slate-600">保一保</span>
              <span className="font-semibold text-green-600">{response.summary.bao}</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        <MatchSection title="冲一冲" icon="🚀" results={chongResults} type="冲" />
        <MatchSection title="稳一稳" icon="🎯" results={wenResults} type="稳" />
        <MatchSection title="保一保" icon="🛡️" results={baoResults} type="保" />
      </div>

      {response && response.results.length === 0 && !error && (
        <div className="text-center text-slate-400 py-12">
          暂无匹配结果，可能是投档线数据尚未导入
        </div>
      )}
    </div>
  );
}
