'use client';

import { useState, useEffect, useCallback } from 'react';
import { University } from '@/types/university';

const PROVINCES = [
  '全部','北京','天津','河北','山西','内蒙古','辽宁','吉林','黑龙江',
  '上海','江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南',
  '广东','广西','海南','重庆','四川','贵州','云南','西藏','陕西','甘肃',
  '青海','宁夏','新疆',
];

const LEVELS = ['全部', '本科', '高职(专科)'];

const AUTHORITY_MAP: Record<string, string> = {
  '全部': '',
  '教育部': '教育部',
  '地方': '地方',
};

function FilterRow({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-start gap-4 py-2">
      <span className="text-sm font-medium text-slate-500 w-20 shrink-0 pt-0.5">{label}</span>
      <div className="flex flex-wrap gap-x-1 gap-y-1">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-2.5 py-1 rounded-md text-sm transition-colors ${
              value === opt
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function SchoolCard({ u }: { u: any }) {
  const chsiUrl = u.chsiUrl || '';
  const officialUrl = u.officialWebsite || '';
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
            href={chsiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-900 leading-tight hover:text-indigo-600 transition-colors"
          >
            {u.name}
          </a>
          {u.tier && (
            <span className="shrink-0 px-2 py-0.5 bg-amber-50 text-amber-700 text-[11px] font-medium rounded-full border border-amber-200">
              {u.tier.replace(/[""]/g, '"')}
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          <span>{u.location || '未知'}</span>
          {u.authority && <span>{u.authority}</span>}
          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">{u.level || '未知'}</span>
        </div>
        {(u.address || u.phone || officialUrl) && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1 text-xs text-slate-500">
            {u.address && (
              <div className="flex items-start gap-1.5">
                <svg className="w-3 h-3 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                <span className="line-clamp-1">{u.address}</span>
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
            {officialUrl && (
              <div className="flex items-center gap-1.5">
                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
                <a href={officialUrl} target="_blank" rel="noopener noreferrer"
                  className="truncate hover:text-indigo-600 hover:underline transition-colors"
                  onClick={(e) => e.stopPropagation()}>
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

export default function AllUniversitiesPage() {
  const [keyword, setKeyword] = useState('');
  const [province, setProvince] = useState('全部');
  const [level, setLevel] = useState('全部');
  const [authority, setAuthority] = useState('全部');
  const [universities, setUniversities] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchSchools = useCallback(async (kw: string, prov: string, lv: string, auth: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (kw) params.set('keyword', kw);
    if (prov !== '全部') params.set('province', prov);
    if (lv !== '全部') params.set('level', lv);
    if (auth !== '全部') params.set('authority', auth);
    try {
      const res = await fetch(`/api/universities/list?${params}`);
      const data = await res.json();
      setUniversities(data.universities || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSchools('', '全部', '全部', '全部'); }, [fetchSchools]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSchools(keyword, province, level, authority);
  };

  const handleFilter = (setter: (v: string) => void, value: string) => {
    setter(value);
    const newProv = setter === setProvince ? value : province;
    const newLevel = setter === setLevel ? value : level;
    const newAuth = setter === setAuthority ? value : authority;
    fetchSchools(keyword, newProv, newLevel, newAuth);
  };

  const undergrad = universities.filter(u => u.level === '本科');
  const vocational = universities.filter(u => u.level !== '本科');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">全国院校库</h1>
        <span className="text-sm text-slate-400">共 {total.toLocaleString()} 所院校（不含港澳台）</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-1">
        <form onSubmit={handleSearch} className="flex gap-2 mb-3">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="请输入院校名称"
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400"
          />
          <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors">
            搜索
          </button>
          <span className="self-center text-xs text-slate-400 ml-2">（注：本名单未包含港澳台地区高等学校）</span>
        </form>

        <FilterRow label="院校所在地" options={PROVINCES} value={province} onChange={(v) => handleFilter(setProvince, v)} />
        <FilterRow label="主管部门类别" options={['全部', '教育部', '其他部委', '地方']} value={authority} onChange={(v) => handleFilter(setAuthority, v)} />
        <FilterRow label="办学层次" options={LEVELS} value={level} onChange={(v) => handleFilter(setLevel, v)} />
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">加载中...</div>
      ) : universities.length === 0 ? (
        <div className="text-center text-slate-400 py-12">未找到匹配的院校</div>
      ) : (
        <>
          {undergrad.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 mb-3">本科院校 ({undergrad.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {undergrad.map(u => <SchoolCard key={u.code} u={u} />)}
              </div>
            </section>
          )}
          {vocational.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 mb-3">高职（专科）院校 ({vocational.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vocational.map(u => <SchoolCard key={u.code} u={u} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
