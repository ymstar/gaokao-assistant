'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { SubjectGroup } from '@/types/score-rank';
import { loadStudentInfo } from '@/lib/student/storage';
import type { SchoolMatchResult, MatchResponseV2 } from '@/types/match';
import type { University } from '@/types/university';
import VolunteerCard from './VolunteerCard';
import VolunteerSidebar from './VolunteerSidebar';
import MatchFilterPanel, { FilterOptions as MatchFilterOptions, FilterValues as MatchFilterValues } from './MatchFilterPanel';
import { useVolunteerTable } from '@/lib/volunteer/useVolunteerTable';

interface MatchClientProps {
  province: string;
}

function Toggle<T extends string>({ value, onChange, options }: {
  value: T;
  onChange: (v: T) => void;
  options: { label: string; value: T }[];
}) {
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

interface EnrichedSchoolResult extends SchoolMatchResult {
  city?: string;
  cityTier?: string;
}

export default function MatchClient({ province }: MatchClientProps) {
  const [group, setGroup] = useState<SubjectGroup>('物理类');
  const [batch, setBatch] = useState('本科批');
  const [score, setScore] = useState('');
  const [matchTab, setMatchTab] = useState<'冲' | '稳' | '保'>('冲');

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<MatchResponseV2 | null>(null);
  const [error, setError] = useState('');
  const [batches, setBatches] = useState<string[]>(['本科批']);

  const [universityMap, setUniversityMap] = useState<Map<string, University>>(new Map());
  const [keyword, setKeyword] = useState('');
  
  const [matchFilters, setMatchFilters] = useState<MatchFilterValues>({
    locations: [],
    cities: [],
    tiers: [],
    schoolTypes: [],
    levels: [],
    ownershipTypes: [],
  });

  const { table, addItem, removeItem, checkItem, clearAll, clearBatchItems, totalCount } = useVolunteerTable();

  const YEAR = 2026;

  useEffect(() => {
    const info = loadStudentInfo();
    if (info) {
      setGroup(info.subjectGroup);
      setScore(String(info.score));
      const numScore = info.score;
      setLoading(true);
      const params = new URLSearchParams({
        score: String(numScore),
        year: String(YEAR),
        group: info.subjectGroup,
        batch,
      });
      fetch(`/api/${province}/match?${params}`)
        .then(res => res.json())
        .then((data: MatchResponseV2 & { error?: string }) => {
          if (!data.error) {
            setResponse(data);
            if (data.batches?.length) setBatches(data.batches);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [province]);

  useEffect(() => {
    fetch(`/api/${province}/match?score=500&year=${YEAR}&group=${group}&batch=${batch}`)
      .then(r => r.json())
      .then(data => {
        if (data.batches?.length) setBatches(data.batches);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [province]);

  useEffect(() => {
    if (response && response.results.length > 0) {
      const schoolIds = [...new Set(response.results.map(r => String(r.schoolId)))];
      const missing = schoolIds.filter(id => !universityMap.has(id));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

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
        year: String(YEAR),
        group,
        batch,
      });
      const res = await fetch(`/api/${province}/match?${params}`);
      const data: MatchResponseV2 & { error?: string } = await res.json();

      if (!res.ok) {
        setError(data.error || '查询失败');
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

  const enrichedResults: EnrichedSchoolResult[] = useMemo(() => {
    if (!response?.results) return [];
    return response.results.map(r => {
      const uni = universityMap.get(String(r.schoolId));
      return {
        ...r,
        city: uni?.city,
        cityTier: uni?.cityTier as string | undefined,
      } as EnrichedSchoolResult;
    });
  }, [response, universityMap]);

  const filteredResults = useMemo(() => {
    let filtered = enrichedResults;
    
    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(r =>
        r.schoolName.toLowerCase().includes(kw) ||
        String(r.schoolId).includes(keyword) ||
        (r.province && r.province.toLowerCase().includes(kw))
      );
    }
    
    if (matchFilters.locations.length > 0) {
      filtered = filtered.filter(r => matchFilters.locations.includes(r.province));
    }
    
    if (matchFilters.cities.length > 0) {
      filtered = filtered.filter(r => matchFilters.cities.includes(r.city || ''));
    }
    
    if (matchFilters.tiers.length > 0) {
      filtered = filtered.filter(r => matchFilters.tiers.some(t => r.tier?.includes(t)));
    }
    
    if (matchFilters.levels.length > 0) {
      filtered = filtered.filter(r => matchFilters.levels.includes(r.level));
    }
    
    if (matchFilters.schoolTypes.length > 0) {
      const typeMap = new Map<string, boolean>();
      for (const u of universityMap.values()) {
        if (u.type) typeMap.set(u.code, matchFilters.schoolTypes.includes(u.type));
      }
      filtered = filtered.filter(r => typeMap.get(String(r.schoolId)) ?? false);
    }
    
    if (matchFilters.ownershipTypes.length > 0) {
      const ownerMap = new Map<string, boolean>();
      for (const u of universityMap.values()) {
        let type = '';
        if (u.authority?.includes('民办')) type = '民办';
        else if (u.authority?.includes('合作')) type = '中外合作';
        else if (u.authority?.includes('公办') || !u.authority) type = '公办';
        ownerMap.set(u.code, matchFilters.ownershipTypes.includes(type));
      }
      filtered = filtered.filter(r => ownerMap.get(String(r.schoolId)) ?? matchFilters.ownershipTypes.includes('公办'));
    }
    
    return filtered;
  }, [enrichedResults, keyword, matchFilters, universityMap]);

  const chongResults = filteredResults.filter(r => r.matchType === '冲');
  const wenResults = filteredResults.filter(r => r.matchType === '稳');
  const baoResults = filteredResults.filter(r => r.matchType === '保');

  const matchFilterOptions: MatchFilterOptions = useMemo(() => {
    const locs = [...new Set(enrichedResults.map(r => r.province))]
      .filter(v => v !== undefined && v !== '')
      .sort() as string[];
    
    const cityMap: Record<string, string[]> = {};
    for (const r of enrichedResults) {
      if (r.province && r.city) {
        if (!cityMap[r.province]) cityMap[r.province] = [];
        if (!cityMap[r.province].includes(r.city)) {
          cityMap[r.province].push(r.city);
        }
      }
    }
    
    const tiers = [...new Set(enrichedResults.flatMap(r => r.tier?.split(' ') || []))]
      .filter(v => v !== undefined && v !== '')
      .sort() as string[];
    
    const schoolTypes = [...new Set(universityMap.values().map(u => u.type))]
      .filter(v => v !== undefined && v !== '')
      .sort() as string[];
    
    const levels = [...new Set(enrichedResults.map(r => r.level))]
      .filter(v => v !== undefined && v !== '')
      .sort() as string[];

    return { locations: locs, cities: cityMap, tiers, schoolTypes, levels, ownershipTypes: ['公办', '民办', '中外合作'] };
  }, [enrichedResults, universityMap]);

  const filteredCounts = useMemo(() => ({
    chong: chongResults.length,
    wen: wenResults.length,
    bao: baoResults.length,
    total: filteredResults.length,
  }), [chongResults.length, wenResults.length, baoResults.length, filteredResults.length]);

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

  const handleAddToTable = (item: Parameters<typeof addItem>[0]) => {
    addItem(item);
  };

  const handleRemoveFromTable = (id: string, batchName: string) => {
    removeItem(id, batchName);
  };

  const hasActiveFilters = [
    ...matchFilters.locations,
    ...matchFilters.cities,
    ...matchFilters.tiers,
    ...matchFilters.schoolTypes,
    ...matchFilters.levels,
    ...matchFilters.ownershipTypes,
  ].length > 0 || keyword;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">志愿填报🔥</h1>
            <p className="text-sm text-slate-400 mt-1">
              基于专业级历史投档数据，智能推荐「冲稳保」院校，一键加入志愿表
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <form onSubmit={handleSearch}>
              <div className="flex flex-wrap items-end gap-6 mb-5">
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
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">批次</label>
                  <select
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                  >
                    {batches.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[180px]">
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
                <div className="min-w-[120px]">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">&nbsp;</label>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition-colors"
                  >
                    {loading ? '匹配中...' : '智能匹配'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
              {error}
            </div>
          )}

          {response && response.userRank > 0 && (
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
                  <div className="text-xs text-slate-400">全省位次</div>
                  <div className="text-2xl font-bold text-indigo-600">
                    {response.userRank.toLocaleString()}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="text-xs text-slate-400">超越考生</div>
                  <div className="text-2xl font-bold text-indigo-600">
                    {response.totalCandidates
                      ? `${(((response.totalCandidates - response.userRank) / response.totalCandidates) * 100).toFixed(1)}%`
                      : '-'}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="text-xs text-slate-400">匹配院校</div>
                  <div className="text-2xl font-bold text-indigo-600">
                    {filteredCounts.total}
                    {filteredCounts.total !== response.summary.total && (
                      <span className="text-sm font-normal text-slate-400 ml-1">
                        / {response.summary.total}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {response && response.summary.total > 0 && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <input
                      type="text"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="搜索院校名称、代码或地区"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400"
                    />
                  </div>
                  
                  <MatchFilterPanel
                    options={matchFilterOptions}
                    filters={matchFilters}
                    onChange={setMatchFilters}
                  />
                  
                  <span className="text-xs text-slate-400">
                    共 {filteredCounts.total.toLocaleString()} 所院校
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="flex border-b border-slate-200">
                  {([
                    {
                      key: '冲' as const,
                      label: '冲一冲',
                      icon: '🚀',
                      count: response.summary.chong,
                      active: 'border-red-500 text-red-600 bg-red-50/50',
                      badge: 'bg-red-100 text-red-600',
                    },
                    {
                      key: '稳' as const,
                      label: '稳一稳',
                      icon: '🎯',
                      count: response.summary.wen,
                      active: 'border-blue-500 text-blue-600 bg-blue-50/50',
                      badge: 'bg-blue-100 text-blue-600',
                    },
                    {
                      key: '保' as const,
                      label: '保一保',
                      icon: '🛡️',
                      count: response.summary.bao,
                      active: 'border-green-500 text-green-600 bg-green-50/50',
                      badge: 'bg-green-100 text-green-600',
                    },
                  ]).map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setMatchTab(tab.key)}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                        matchTab === tab.key
                          ? tab.active
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <span className="mr-1">{tab.icon}</span>
                      {tab.label}
                      <span
                        className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                          matchTab === tab.key ? tab.badge : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {filteredCounts[tab.key === '冲' ? 'chong' : tab.key === '稳' ? 'wen' : 'bao']}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="p-4 space-y-3">
                  {(() => {
                    const res =
                      matchTab === '冲'
                        ? chongResults
                        : matchTab === '稳'
                          ? wenResults
                          : baoResults;
                    return res.length === 0 ? (
                      <div className="text-center text-slate-400 py-8">该类别暂无匹配院校</div>
                    ) : (
                      res.map((r) => (
                        <VolunteerCard
                          key={`${r.schoolId}-${r.matchType}`}
                          schoolResult={r}
                          majors={r.majors}
                          batch={batch}
                          category={group}
                          onAddToTable={handleAddToTable}
                          isInTable={checkItem}
                        />
                      ))
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {response && response.results.length === 0 && !error && (
            <div className="text-center text-slate-400 py-12">
              暂无匹配结果，请调整分数或批次条件
            </div>
          )}
        </div>

        <div className="lg:w-80">
          <VolunteerSidebar
            table={table}
            onRemoveItem={handleRemoveFromTable}
            onClearBatch={clearBatchItems}
            onClearAll={clearAll}
          />
        </div>
      </div>
    </div>
  );
}