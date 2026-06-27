'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { University } from '@/types/university';
import UniversityFilterBar, { FilterOptions, FilterValues } from '@/components/UniversityFilterBar';

function SchoolCard({ u, planSummary, lineSummary }: {
  u: University;
  planSummary?: { entryCount: number; totalPlans: number };
  lineSummary?: { years: number[]; minScore: number; minRank: number };
}) {
  const hasDetail = !!u.address || !!u.phone;
  return (
    <a
      href={`/school/${u.code}`}
      className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-200 hover:shadow-md transition-all flex gap-4 group cursor-pointer"
    >
      <img
        src={u.imageCode
          ? `https://t1.chei.com.cn/common/xh/${u.imageCode}.jpg`
          : `https://t1.chei.com.cn/common/xh/${u.code}.jpg`}
        alt={u.name}
        className="w-14 h-14 rounded-xl object-cover bg-slate-100 shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span
            className="font-semibold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors"
          >
            {u.name}
          </span>
          {u.tier && (
            <span className="shrink-0 px-2 py-0.5 bg-amber-50 text-amber-700 text-[11px] font-medium rounded-full border border-amber-200">
              {u.tier.replace(/[""]/g, '"').replace(/[""]/g, '"')}
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            {u.location}{u.city ? ` · ${u.city}` : ''}
          </span>
          {u.authority && <span>{u.authority}</span>}
          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">{u.level}</span>
        </div>

        {/* 招生数据摘要 */}
        {(planSummary || lineSummary) && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {planSummary && (
              <span className="text-emerald-600">
                📊 2026计划: {planSummary.entryCount}个专业 / {planSummary.totalPlans.toLocaleString()}人
              </span>
            )}
            {lineSummary && lineSummary.years.length > 0 && (
              <span className="text-indigo-600">
                📈 {lineSummary.years.sort().join('/')} 录取数据
              </span>
            )}
          </div>
        )}

        {hasDetail && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1 text-xs text-slate-500">
            {u.address && (
              <div className="flex items-start gap-1.5">
                <svg className="w-3 h-3 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                <span className="line-clamp-2">{u.address}</span>
              </div>
            )}
            {u.phone && (
              <div className="flex items-center gap-1.5">
                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                </svg>
                <span>{u.phone}</span>
              </div>
            )}
            {u.officialWebsite && (
              <div className="flex items-center gap-1.5">
                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
                <span
                  className="truncate hover:text-indigo-600 hover:underline transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {u.officialWebsite}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </a>
  );
}

export default function UniversitiesClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initialize from URL params
  const [filters, setFilters] = useState<FilterValues>(() => ({
    keyword: searchParams.get('keyword') || undefined,
    location: searchParams.get('location') || undefined,
    level: searchParams.get('level') || 'all',
    tier: searchParams.get('tier') || undefined,
    cityTier: searchParams.get('cityTier') || undefined,
    sort: searchParams.get('sort') || undefined,
  }));
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [universities, setUniversities] = useState<University[]>([]);
  const [total, setTotal] = useState(0);
  const [options, setOptions] = useState<FilterOptions>({ locations: [], cityTiers: [], tiers: [] });
  const [planSummaryMap, setPlanSummaryMap] = useState<Record<string, { entryCount: number; totalPlans: number }>>({});
  const [lineSummaryMap, setLineSummaryMap] = useState<Record<string, { years: number[]; minScore: number; minRank: number }>>({});
  const [loading, setLoading] = useState(false);
  const pageSize = 50;
  const isInitialized = useRef(false);

  // Sync URL params on filter/page change
  const syncUrl = useCallback((newFilters: FilterValues, newPage: number) => {
    const params = new URLSearchParams();
    if (newFilters.keyword) params.set('keyword', newFilters.keyword);
    if (newFilters.location) params.set('location', newFilters.location);
    if (newFilters.level && newFilters.level !== 'all') params.set('level', newFilters.level);
    if (newFilters.tier) params.set('tier', newFilters.tier);
    if (newFilters.cityTier) params.set('cityTier', newFilters.cityTier);
    if (newFilters.sort) params.set('sort', newFilters.sort);
    if (newPage > 1) params.set('page', String(newPage));
    const query = params.toString();
    router.replace(query ? `?${query}` : window.location.pathname, { scroll: false });
  }, [router]);

  const fetchUniversities = useCallback(async (currentFilters: FilterValues, currentPage: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (currentFilters.keyword) params.append('keyword', currentFilters.keyword);
    if (currentFilters.location) params.append('location', currentFilters.location);
    if (currentFilters.level && currentFilters.level !== 'all') params.append('level', currentFilters.level);
    if (currentFilters.tier) params.append('tier', currentFilters.tier);
    if (currentFilters.cityTier) params.append('cityTier', currentFilters.cityTier);
    if (currentFilters.sort) params.append('sort', currentFilters.sort);
    params.append('page', String(currentPage));
    params.append('pageSize', String(pageSize));
    try {
      const res = await fetch(`/api/universities/list?${params}`);
      const data = await res.json();
      setUniversities(data.universities || []);
      setTotal(data.total || 0);
      setPlanSummaryMap(data.planSummaryMap || {});
      setLineSummaryMap(data.lineSummaryMap || {});
      setOptions({
        locations: data.locations || [],
        cityTiers: data.cityTiers || [],
        tiers: data.tiers || [],
      });
    } catch (error) {
      console.error('Failed to fetch universities:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      fetchUniversities(filters, page);
    }
  }, []);

  const handleFilterChange = useCallback((newFilters: FilterValues) => {
    setFilters(newFilters);
    setPage(1);
    syncUrl(newFilters, 1);
    fetchUniversities(newFilters, 1);
  }, [syncUrl, fetchUniversities]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    syncUrl(filters, newPage);
    fetchUniversities(filters, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    const empty: FilterValues = { level: 'all' };
    setFilters(empty);
    setPage(1);
    syncUrl(empty, 1);
    fetchUniversities(empty, 1);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">院校库</h1>
      </div>

      <UniversityFilterBar
        filters={filters}
        onChange={handleFilterChange}
        options={options}
        resultCount={total}
        onReset={handleReset}
      />

      {loading ? (
        <div className="text-center text-slate-400 py-12">加载中...</div>
      ) : universities.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {universities.map(u => <SchoolCard key={u.code} u={u}
              planSummary={planSummaryMap[u.code]}
              lineSummary={lineSummaryMap[u.code]} />)}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                上一页
              </button>
              <span className="text-sm text-slate-400">
                第 {page} / {totalPages} 页
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                下一页
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center text-slate-400 py-12">未找到匹配的院校</div>
      )}
    </div>
  );
}
