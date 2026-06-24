'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { University } from '@/types/university';

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

function SchoolCard({ u }: { u: University }) {
  const hasDetail = !!u.address || !!u.phone;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-200 hover:shadow-md transition-all flex gap-4">
      <img
        src={`https://t1.chei.com.cn/common/xh/${u.code}.jpg`}
        alt={u.name}
        className="w-14 h-14 rounded-xl object-cover bg-slate-100 shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <a
            href={u.chsiUrl || `https://gaokao.chsi.com.cn/sch/schoolInfo--schId-${u.schId}.dhtml`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-900 leading-tight hover:text-indigo-600 transition-colors"
          >
            {u.name}
          </a>
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
                <a
                  href={u.officialWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate hover:text-indigo-600 hover:underline transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {u.officialWebsite}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function UniversitiesClient() {
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [level, setLevel] = useState('all');
  const [tier, setTier] = useState('');
  const [page, setPage] = useState(1);
  const [universities, setUniversities] = useState<University[]>([]);
  const [total, setTotal] = useState(0);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const pageSize = 50;
  const keywordRef = useRef(keyword);

  const fetchUniversities = useCallback(async (opts: { keyword?: string; location?: string; level?: string; tier?: string; page?: number }) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (opts.keyword) params.append('keyword', opts.keyword);
    if (opts.location) params.append('location', opts.location);
    if (opts.level && opts.level !== 'all') params.append('level', opts.level);
    if (opts.tier) params.append('tier', opts.tier);
    params.append('page', String(opts.page || 1));
    params.append('pageSize', String(pageSize));
    try {
      const res = await fetch(`/api/universities/list?${params}`);
      const data = await res.json();
      setUniversities(data.universities || []);
      setTotal(data.total || 0);
      if (data.locations?.length) {
        setLocations(data.locations);
      }
    } catch (error) {
      console.error('Failed to fetch universities:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUniversities({ page: 1 });
  }, [fetchUniversities]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUniversities({ keyword, location, level, tier, page: 1 });
  };

  const handleFilterChange = (updates: { location?: string; level?: string; tier?: string }) => {
    const newLocation = updates.location !== undefined ? updates.location : location;
    const newLevel = updates.level !== undefined ? updates.level : level;
    const newTier = updates.tier !== undefined ? updates.tier : tier;
    if (updates.location !== undefined) setLocation(updates.location);
    if (updates.level !== undefined) setLevel(updates.level);
    if (updates.tier !== undefined) setTier(updates.tier);
    setPage(1);
    fetchUniversities({ keyword, location: newLocation, level: newLevel, tier: newTier, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchUniversities({ keyword, location, level, tier, page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-slate-900">院校库</h1>
        <span className="text-sm text-slate-400">共 {total.toLocaleString()} 所院校</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">地区</label>
            <select
              value={location}
              onChange={(e) => handleFilterChange({ location: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer"
            >
              <option value="">全部地区</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">办学层次</label>
            <Toggle
              value={level}
              onChange={(v) => handleFilterChange({ level: v })}
              options={[
                { label: '全部', value: 'all' },
                { label: '本科', value: '本科' },
                { label: '高职专科', value: '高职(专科)' },
              ]}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">院校层次</label>
            <Toggle
              value={tier}
              onChange={(v) => handleFilterChange({ tier: v })}
              options={[
                { label: '全部', value: '' },
                { label: '双一流', value: '双一流' },
              ]}
            />
          </div>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索院校名称、代码或地区"
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            搜索
          </button>
        </form>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">加载中...</div>
      ) : universities.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {universities.map(u => <SchoolCard key={u.code} u={u} />)}
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
