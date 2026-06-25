'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SubjectGroup, ScoreRankData } from '@/types/score-rank';
import { MatchResult } from '@/types/admission-line';
import { University } from '@/types/university';
import UniversityFilterBar, { FilterOptions, FilterValues } from '@/components/UniversityFilterBar';

interface MatchClientProps {
  province: string;
  scoreRankData: ScoreRankData[];
}

interface MatchResponse {
  input: { score: number; year: number; group: string; batch: string };
  userRank: number | null;
  rankYear?: number;
  totalCandidates: number | null;
  summary: { total: number; chong: number; wen: number; bao: number };
  results: MatchResult[];
  batches?: string[];
}

/** MatchResult 扩展大学元数据，用于客户端筛选 */
interface EnrichedResult extends MatchResult {
  location?: string;
  city?: string;
  cityTier?: string;
  level?: string;
  tier?: string;
}

function Toggle({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <div className="inline-flex bg-slate-100 rounded-lg p-0.5">
      {options.map((opt) => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${value === opt.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
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
  const [expanded, setExpanded] = useState(false);
  const hasDetails = result.yearDetails && result.yearDetails.length > 0;

  return (
    <div className={`bg-white rounded-xl border ${colors.border} overflow-hidden hover:shadow-md transition-all`}>
      <button type="button" onClick={() => hasDetails && setExpanded(!expanded)}
        className="w-full p-4 text-left flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors.badge}`}>
              {result.matchType}
            </span>
            <h3 className="font-semibold text-slate-900 truncate">{result.universityName}</h3>
          </div>
          <div className="text-sm text-slate-500 mb-2">{result.majorGroup}</div>
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
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-[11px] ${conf.color}`}>{conf.label}</span>
          {hasDetails && (
            <svg className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          )}
        </div>
      </button>

      {expanded && hasDetails && (
        <div className="border-t border-slate-100 px-4 pb-4 mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-200">
                <th className="text-left py-2 pr-3 font-medium sticky left-0 bg-white" rowSpan={2}>专业</th>
                {result.yearDetails!.map(yd => (
                  <th key={yd.year} className="text-center px-2 py-2 font-medium" colSpan={3}>{yd.year} 年</th>
                ))}
              </tr>
              <tr className="text-slate-400">
                {result.yearDetails!.map(yd => (
                  <React.Fragment key={yd.year}>
                    <th className="text-right py-1.5 px-1 font-medium">投档分</th>
                    <th className="text-right py-1.5 px-1 font-medium">位次</th>
                    <th className="text-right py-1.5 px-1 font-medium">志愿号</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                // 收集所有专业（按最新年份分数降序）
                const allMajors = new Set<string>();
                const majorLookup = new Map<string, Map<number, { score: number; rank: number; vol: number; matchType: string }>>();
                for (const yd of result.yearDetails!) {
                  for (const m of yd.majors) {
                    allMajors.add(m.majorName);
                    if (!majorLookup.has(m.majorName)) majorLookup.set(m.majorName, new Map());
                    majorLookup.get(m.majorName)!.set(yd.year, { score: m.minScore, rank: m.minRank, vol: m.volunteerNum, matchType: m.matchType });
                  }
                }
                // 按最新年份分数排序
                const latestYear = result.yearDetails![0]?.year;
                const sorted = [...allMajors].sort((a, b) => {
                  const sa = majorLookup.get(a)?.get(latestYear)?.score ?? 0;
                  const sb = majorLookup.get(b)?.get(latestYear)?.score ?? 0;
                  return sb - sa;
                });
                return sorted.map((name, i) => {
                  const latestData = majorLookup.get(name)?.get(latestYear);
                  const mt = latestData?.matchType || '冲';
                  const mtStyle = mt === '保' ? 'bg-green-100 text-green-600' : mt === '稳' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600';
                  return (
                  <tr key={name} className={i % 2 === 0 ? '' : 'bg-slate-50/50'}>
                    <td className="py-1.5 pr-3 text-slate-600 sticky left-0 bg-inherit whitespace-nowrap">
                      <span className={`mr-1.5 px-1 py-0.5 rounded text-[11px] font-semibold ${mtStyle}`}>{mt}</span>
                      {name}
                    </td>
                    {result.yearDetails!.map(yd => {
                      const d = majorLookup.get(name)?.get(yd.year);
                      return d ? (
                        <React.Fragment key={yd.year}>
                          <td className="py-1.5 px-1 text-right font-medium text-slate-800">{d.score}</td>
                          <td className="py-1.5 px-1 text-right text-slate-500">{d.rank > 0 ? d.rank.toLocaleString() : '-'}</td>
                          <td className="py-1.5 px-1 text-right">
                            <span className={`px-1 py-0.5 rounded text-[11px] font-medium ${
                              d.vol <= 3 ? 'bg-green-50 text-green-600' :
                              d.vol <= 10 ? 'bg-amber-50 text-amber-600' :
                              'bg-slate-100 text-slate-500'
                            }`}>{d.vol}</span>
                          </td>
                        </React.Fragment>
                      ) : (
                        <React.Fragment key={yd.year}>
                          <td className="py-1.5 px-1 text-right text-slate-300">-</td>
                          <td className="py-1.5 px-1 text-right text-slate-300">-</td>
                          <td className="py-1.5 px-1 text-right text-slate-300">-</td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                  );
                })
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function MatchClient({ province, scoreRankData }: MatchClientProps) {
  const [year, setYear] = useState(2026);
  const [group, setGroup] = useState<SubjectGroup>('物理类');
  const [batch, setBatch] = useState('提前批B段');
  const [score, setScore] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<MatchResponse | null>(null);
  const [error, setError] = useState('');
  const [batches, setBatches] = useState<string[]>(['本科批', '提前批B段']);
  const [matchTab, setMatchTab] = useState<'冲' | '稳' | '保'>('冲');

  const availableYears = [...new Set(scoreRankData.map((d) => d.year))].sort((a, b) => b - a);
  const [universityMap, setUniversityMap] = useState<Map<string, University>>(new Map());
  const [matchFilters, setMatchFilters] = useState<FilterValues>({ level: 'all' });

  // 匹配结果返回后加载大学元数据
  useEffect(() => {
    if (response && response.results.length > 0) {
      const codes = [...new Set(response.results.map(r => r.universityCode))];
      const missing = codes.filter(c => !universityMap.has(c));
      if (missing.length === 0) return;

      fetch('/api/universities/list?pageSize=3000')
        .then(r => r.json())
        .then(data => {
          const allSchools: University[] = data.universities || [];
          const map = new Map<string, University>();
          for (const u of allSchools) {
            map.set(u.code, u);
          }
          setUniversityMap(map);
        })
        .catch(() => {});
    }
  }, [response]); // eslint-disable-line react-hooks/exhaustive-deps

  // 首次加载获取可用批次
  useEffect(() => {
    fetch(`/api/${province}/match?score=500&year=${year}&group=${group}&batch=本科批`)
      .then(r => r.json())
      .then(data => {
        if (data.batches?.length) setBatches(data.batches);
      })
      .catch(() => {});
  }, [province]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const numScore = parseInt(score);
    if (isNaN(numScore)) return;

    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const params = new URLSearchParams({
        score: String(numScore), year: String(year), group, batch,
      });
      const res = await fetch(`/api/${province}/match?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '查询失败');
      } else if (data.error && data.results?.length === 0) {
        setError(data.error);
      } else {
        setResponse(data);
        if (data.batches?.length) setBatches(data.batches);
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // Enrich match results with university metadata
  const enrichedResults: EnrichedResult[] = useMemo(() => {
    if (!response?.results) return [];
    return response.results.map(r => {
      const uni = universityMap.get(r.universityCode);
      return {
        ...r,
        location: uni?.location,
        city: uni?.city,
        cityTier: uni?.cityTier,
        level: uni?.level,
        tier: uni?.tier,
      };
    });
  }, [response, universityMap]);

  // Client-side filtering
  const filteredResults = useMemo(() => {
    const { keyword, location, level, tier, cityTier } = matchFilters;
    let filtered = enrichedResults;
    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(r =>
        r.universityName.toLowerCase().includes(kw) ||
        r.universityCode.includes(keyword) ||
        (r.location && r.location.toLowerCase().includes(kw)) ||
        (r.city && r.city.toLowerCase().includes(kw))
      );
    }
    if (location) {
      filtered = filtered.filter(r => r.location === location);
    }
    if (level && level !== 'all') {
      filtered = filtered.filter(r => r.level === level);
    }
    if (tier) {
      filtered = filtered.filter(r => r.tier?.includes(tier));
    }
    if (cityTier) {
      filtered = filtered.filter(r => r.cityTier === cityTier);
    }
    return filtered;
  }, [enrichedResults, matchFilters]);

  const chongResults = filteredResults.filter((r) => r.matchType === '冲');
  const wenResults = filteredResults.filter((r) => r.matchType === '稳');
  const baoResults = filteredResults.filter((r) => r.matchType === '保');

  // Build filter options from match results (only show what's in the results)
  const matchFilterOptions: FilterOptions = useMemo(() => {
    const locs = [...new Set(enrichedResults.map(r => r.location))].filter((v): v is string => v !== undefined).sort();
    const tiers = [...new Set(enrichedResults.map(r => r.tier))].filter((v): v is string => v !== undefined).sort();
    const cityTierSet = [...new Set(enrichedResults.map(r => r.cityTier))].filter((v): v is string => v !== undefined);
    const order = ['一线', '新一线', '二线', '三线', '四线', '五线'];
    const cts = cityTierSet.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return { locations: locs, cityTiers: cts, tiers };
  }, [enrichedResults]);

  const filteredCounts = useMemo(() => ({
    chong: chongResults.length,
    wen: wenResults.length,
    bao: baoResults.length,
    total: filteredResults.length,
  }), [chongResults, wenResults, baoResults, filteredResults]);

  // 如果筛选后当前 tab 为空，自动切换到第一个有结果的 tab
  useEffect(() => {
    if (filteredResults.length === 0) return;
    if (matchTab === '冲' && chongResults.length === 0) {
      if (wenResults.length > 0) setMatchTab('稳');
      else if (baoResults.length > 0) setMatchTab('保');
    } else if (matchTab === '稳' && wenResults.length === 0) {
      if (chongResults.length > 0) setMatchTab('冲');
      else if (baoResults.length > 0) setMatchTab('保');
    } else if (matchTab === '保' && baoResults.length === 0) {
      if (wenResults.length > 0) setMatchTab('稳');
      else if (chongResults.length > 0) setMatchTab('冲');
    }
  }, [matchTab, chongResults.length, wenResults.length, baoResults.length, filteredResults.length]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">冲稳保匹配</h1>
        <p className="text-sm text-slate-400 mt-1">输入 2026 年高考成绩，基于 2023-2025 年历史投档数据智能推荐</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <form onSubmit={handleSearch}>
          <div className="flex flex-wrap items-end gap-6 mb-5">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">年份</label>
              <Toggle value={String(year)} onChange={(v) => setYear(parseInt(v))}
                options={availableYears.map((y) => ({ label: String(y), value: String(y) }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">科类</label>
              <Toggle value={group} onChange={(v) => setGroup(v as SubjectGroup)}
                options={[{ label: '物理类', value: '物理类' }, { label: '历史类', value: '历史类' }]} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">批次</label>
              <Toggle value={batch} onChange={setBatch}
                options={batches.map(b => ({ label: b, value: b }))} />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">高考分数</label>
              <input type="number" value={score} onChange={(e) => setScore(e.target.value)}
                placeholder="输入高考分数" min="0" max="750"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400" />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition-colors">
            {loading ? '匹配中...' : '查询匹配'}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">{error}</div>
      )}

      {response && response.userRank && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-baseline gap-2 mb-3">
            <h2 className="text-xs font-medium text-slate-400">你的位置</h2>
            {response.rankYear && response.rankYear !== response.input.year && (
              <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                位次基于 {response.rankYear} 年一分一档数据
              </span>
            )}
          </div>
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
                {response.totalCandidates ? `${(((response.totalCandidates - response.userRank) / response.totalCandidates) * 100).toFixed(1)}%` : '-'}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-xs text-slate-400">匹配院校</div>
              <div className="text-2xl font-bold text-indigo-600">
                {filteredCounts.total}
                {filteredCounts.total !== response.summary.total && (
                  <span className="text-sm font-normal text-slate-400 ml-1">/ {response.summary.total}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {response && response.summary.total > 0 && (
        <div className="space-y-4">
          {/* 院校筛选器 */}
          <UniversityFilterBar
            filters={matchFilters}
            onChange={setMatchFilters}
            options={matchFilterOptions}
            resultCount={filteredCounts.total}
            onReset={() => setMatchFilters({ level: 'all' })}
            showSort={false}
          />

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200">
            {([
              { key: '冲' as const, label: '冲一冲', icon: '🚀', count: response.summary.chong, active: 'border-red-500 text-red-600 bg-red-50/50', badge: 'bg-red-100 text-red-600' },
              { key: '稳' as const, label: '稳一稳', icon: '🎯', count: response.summary.wen, active: 'border-blue-500 text-blue-600 bg-blue-50/50', badge: 'bg-blue-100 text-blue-600' },
              { key: '保' as const, label: '保一保', icon: '🛡️', count: response.summary.bao, active: 'border-green-500 text-green-600 bg-green-50/50', badge: 'bg-green-100 text-green-600' },
            ]).map(tab => (
              <button key={tab.key} onClick={() => setMatchTab(tab.key)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                  matchTab === tab.key ? tab.active : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}>
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  matchTab === tab.key ? tab.badge : 'bg-slate-100 text-slate-400'
                }`}>{filteredCounts[tab.key === '冲' ? 'chong' : tab.key === '稳' ? 'wen' : 'bao']}</span>
              </button>
            ))}
          </div>
          <div className="p-4 space-y-3">
            {(() => {
              const results = matchTab === '冲' ? chongResults : matchTab === '稳' ? wenResults : baoResults;
              return results.length === 0
                ? <div className="text-center text-slate-400 py-8">该类别暂无匹配院校</div>
                : results.map((r, i) => <MatchCard key={`${r.universityCode}-${i}`} result={r} />);
            })()}
          </div>
        </div>
        </div>
      )}

      {response && response.results.length === 0 && !error && (
        <div className="text-center text-slate-400 py-12">暂无匹配结果</div>
      )}
    </div>
  );
}
