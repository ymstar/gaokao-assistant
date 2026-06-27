'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

// ============================================================
// Types
// ============================================================

interface RankingEntry {
  rank_type: string;
  rank_value: string;
}

interface DualClassEntry {
  class_name: string;
}

interface SpecialEntry {
  special_name: string;
  level_name: string;
  nation_feature: string;
  province_feature: string;
  xueke_rank: string;
  ruanke_rank: string;
  ruanke_level: string;
}

interface XuekeRankEntry {
  grade: string;
  count: number;
}

interface AcademicPointEntry {
  category: string;
  name: string;
  count: string;
}

interface LabelEntry {
  name: string;
  key: string;
  value: string;
}

interface CampusEntry {
  campus_name: string;
  departments: string[];
}

interface AdmissionPlan {
  id: number;
  school_id: number;
  special_id: number;
  year: number;
  province_code: string;
  batch_code: string;
  batch_name: string;
  category_code: string;
  category_name: string;
  spcode: string;
  spname: string;
  sp_name: string;
  num: number;
  length: string;
  tuition: string;
  level1_name: string;
  level2_name: string;
  level3_name: string;
  first_km: string;
  first_km_name: string;
  sp_fxk: string;
  sp_fxk_name: string;
  sp_sxk: string;
  sp_sxk_name: string;
  sp_info: string;
  zslx_name: string;
  remark: string;
  info: string;
}

interface AdmissionPlansResult {
  plans: AdmissionPlan[];
  total: number;
  years: number[];
  batchNames: string[];
  categoryNames: string[];
  zslxNames: string[];
}

interface AdmissionScore {
  id: number;
  school_id: number;
  special_id: number;
  year: number;
  province_code: string;
  batch_code: string;
  batch_name: string;
  category_code: string;
  category_name: string;
  spname: string;
  sp_name: string;
  level1_name: string;
  level2_name: string;
  level3_name: string;
  min_score: number;
  max_score: number;
  avg_score: number;
  min_section: number;
  diff: number;
  lq_num: number | null;
  is_score_range: number;
  zslx_name: string;
  info: string;
  remark: string;
}

interface AdmissionScoresResult {
  scores: AdmissionScore[];
  total: number;
  years: number[];
  batchNames: string[];
  categoryNames: string[];
}

interface SchoolData {
  code: string;
  university: Record<string, unknown> & {
    code?: string;
    imageCode?: string;
    name?: string;
    location?: string;
    city?: string;
    level?: string;
    tier?: string;
    type?: string;
    authority?: string;
    address?: string;
    phone?: string;
    officialWebsite?: string;
    admissionWebsite?: string;
    motto?: string;
    createDate?: string;
    area?: number;
    shortNames?: string;
    content?: string;
    numSubject?: string;
    numMaster?: string;
    numDoctor?: string;
    numAcademician?: string;
    numLibrary?: string;
    numLab?: string;
    recommendMasterRate?: string;
    upgradingRate?: string;
    rankings?: RankingEntry[];
    dualClass?: DualClassEntry[];
    specials?: SpecialEntry[];
    xuekeRanks?: XuekeRankEntry[];
    academicPoints?: AcademicPointEntry[];
    labels?: LabelEntry[];
    campuses?: CampusEntry[];
  };
  plans: unknown[];
  lines: unknown[];
}

type TabKey = 'overview' | 'admission' | 'scores' | 'special' | 'rankings';

const TAB_LABELS: Record<TabKey, string> = {
  overview: '学校概况',
  admission: '招生计划',
  scores: '历年分数',
  special: '特色专业',
  rankings: '学科与排名',
};

const RANK_TYPE_LABELS: Record<string, string> = {
  ruanke_rank: '软科排名',
  xyh_rank: '校友会排名',
  qs_world: 'QS世界排名',
  us_rank: 'US News排名',
  tws_china: '泰晤士中国',
  wsl_rank: '武书连排名',
  eol_rank: '中国教育在线',
};

const GRADE_ORDER = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-'];

// ============================================================
// 小组件
// ============================================================

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="text-xs font-medium text-slate-400 mb-1">{label}</div>
      <div className="text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function Tag({ children, color = 'slate' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200',
    indigo: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    red: 'bg-red-50 text-red-600 border border-red-200',
    blue: 'bg-blue-50 text-blue-700 border border-blue-200',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${colors[color] || colors.slate}`}>
      {children}
    </span>
  );
}

function TabBar({ active, onChange, tabs }: { active: TabKey; onChange: (t: TabKey) => void; tabs: TabKey[] }) {
  return (
    <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
      {tabs.map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            active === tab
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// 招生计划 Tab
// ============================================================

function AdmissionPlanTab({ schoolCode }: { schoolCode: string }) {
  const [data, setData] = useState<AdmissionPlansResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    year: '',
    batch_name: '',
    category_name: '',
    zslx_name: '',
    keyword: '',
  });
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const fetchPlans = useCallback(async (currentFilters: typeof filters, currentPage: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (currentFilters.year) params.append('year', currentFilters.year);
    if (currentFilters.batch_name) params.append('batch_name', currentFilters.batch_name);
    if (currentFilters.category_name) params.append('category_name', currentFilters.category_name);
    if (currentFilters.zslx_name) params.append('zslx_name', currentFilters.zslx_name);
    if (currentFilters.keyword) params.append('keyword', currentFilters.keyword);
    params.append('page', String(currentPage));
    params.append('pageSize', String(pageSize));
    try {
      const res = await fetch(`/api/school/${schoolCode}/admission-plans?${params}`);
      const d = await res.json();
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [schoolCode]);

  useEffect(() => {
    fetchPlans(filters, page);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    fetchPlans(newFilters, 1);
  };

  const handleSearch = () => {
    setPage(1);
    fetchPlans(filters, 1);
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-end gap-3">
          {data?.years && data.years.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">年份</label>
              <select
                value={filters.year}
                onChange={e => handleFilterChange('year', e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-indigo-300"
              >
                <option value="">全部</option>
                {data.years.map(y => <option key={y} value={y}>{y}年</option>)}
              </select>
            </div>
          )}
          {data?.batchNames && data.batchNames.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">批次</label>
              <select
                value={filters.batch_name}
                onChange={e => handleFilterChange('batch_name', e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-indigo-300"
              >
                <option value="">全部</option>
                {data.batchNames.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          )}
          {data?.categoryNames && data.categoryNames.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">科类</label>
              <select
                value={filters.category_name}
                onChange={e => handleFilterChange('category_name', e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-indigo-300"
              >
                <option value="">全部</option>
                {data.categoryNames.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          {data?.zslxNames && data.zslxNames.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">招生类型</label>
              <select
                value={filters.zslx_name}
                onChange={e => handleFilterChange('zslx_name', e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-indigo-300"
              >
                <option value="">全部</option>
                {data.zslxNames.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">专业搜索</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="搜索专业名称..."
                value={filters.keyword}
                onChange={e => setFilters({ ...filters, keyword: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-indigo-300 w-40"
              />
              <button
                onClick={handleSearch}
                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                搜索
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 结果统计 */}
      {data && (
        <div className="text-sm text-slate-500">
          共 <span className="font-medium text-slate-700">{data.total}</span> 条招生计划
        </div>
      )}

      {/* 计划表格 */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : data && data.plans.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500">
                  <th className="text-left px-4 py-3 font-medium whitespace-nowrap">年份</th>
                  <th className="text-left px-4 py-3 font-medium whitespace-nowrap">批次</th>
                  <th className="text-left px-4 py-3 font-medium whitespace-nowrap">科类</th>
                  <th className="text-left px-4 py-3 font-medium whitespace-nowrap">专业名称</th>
                  <th className="text-center px-4 py-3 font-medium whitespace-nowrap">计划数</th>
                  <th className="text-center px-4 py-3 font-medium whitespace-nowrap">学制</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">学费(元/年)</th>
                  <th className="text-left px-4 py-3 font-medium whitespace-nowrap">选科要求</th>
                  <th className="text-left px-4 py-3 font-medium whitespace-nowrap">学科门类</th>
                  <th className="text-center px-4 py-3 font-medium whitespace-nowrap">类型</th>
                </tr>
              </thead>
              <tbody>
                {data.plans.map((p, i) => (
                  <tr key={p.id} className={`border-t border-slate-100 hover:bg-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="px-4 py-2.5 text-slate-600">{p.year}</td>
                    <td className="px-4 py-2.5 text-slate-600">{p.batch_name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{p.category_name}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-800">{p.sp_name}</div>
                      {p.info && (
                        <div className="text-xs text-slate-400 mt-0.5 line-clamp-1" title={p.info}>{p.info}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center font-medium text-slate-700">{p.num}</td>
                    <td className="px-4 py-2.5 text-center text-slate-500">{p.length}</td>
                    <td className="px-4 py-2.5 text-right text-slate-500">{p.tuition}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-slate-500" title={p.sp_info}>{p.sp_info || '-'}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">
                      {p.level2_name} {p.level3_name ? `· ${p.level3_name}` : ''}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Tag>{p.zslx_name}</Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">第 {page}/{totalPages} 页</span>
              <div className="flex gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => { const p = page - 1; setPage(p); fetchPlans(filters, p); }}
                  className="px-3 py-1 text-xs rounded bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  上一页
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => { const p = page + 1; setPage(p); fetchPlans(filters, p); }}
                  className="px-3 py-1 text-xs rounded bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      ) : data ? (
        <div className="text-center py-12 text-slate-400">暂无招生计划数据</div>
      ) : null}
    </div>
  );
}

// ============================================================
// 历年分数 Tab
// ============================================================

function AdmissionScoreTab({ schoolCode }: { schoolCode: string }) {
  const [data, setData] = useState<AdmissionScoresResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    year: '',
    batch_name: '',
    category_name: '',
    keyword: '',
  });
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const fetchScores = useCallback(async (currentFilters: typeof filters, currentPage: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (currentFilters.year) params.append('year', currentFilters.year);
    if (currentFilters.batch_name) params.append('batch_name', currentFilters.batch_name);
    if (currentFilters.category_name) params.append('category_name', currentFilters.category_name);
    if (currentFilters.keyword) params.append('keyword', currentFilters.keyword);
    params.append('page', String(currentPage));
    params.append('pageSize', String(pageSize));
    try {
      const res = await fetch(`/api/school/${schoolCode}/admission-scores?${params}`);
      const d = await res.json();
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [schoolCode]);

  useEffect(() => {
    fetchScores(filters, page);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    fetchScores(newFilters, 1);
  };

  const handleSearch = () => {
    setPage(1);
    fetchScores(filters, 1);
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-end gap-3">
          {data?.years && data.years.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">年份</label>
              <select
                value={filters.year}
                onChange={e => handleFilterChange('year', e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-indigo-300"
              >
                <option value="">全部</option>
                {data.years.map(y => <option key={y} value={y}>{y}年</option>)}
              </select>
            </div>
          )}
          {data?.batchNames && data.batchNames.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">批次</label>
              <select
                value={filters.batch_name}
                onChange={e => handleFilterChange('batch_name', e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-indigo-300"
              >
                <option value="">全部</option>
                {data.batchNames.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          )}
          {data?.categoryNames && data.categoryNames.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">科类</label>
              <select
                value={filters.category_name}
                onChange={e => handleFilterChange('category_name', e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-indigo-300"
              >
                <option value="">全部</option>
                {data.categoryNames.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">专业搜索</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="搜索专业名称..."
                value={filters.keyword}
                onChange={e => setFilters({ ...filters, keyword: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-indigo-300 w-40"
              />
              <button
                onClick={handleSearch}
                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                搜索
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 结果统计 */}
      {data && (
        <div className="text-sm text-slate-500">
          共 <span className="font-medium text-slate-700">{data.total}</span> 条录取记录
        </div>
      )}

      {/* 分数表格 */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : data && data.scores.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500">
                  <th className="text-left px-4 py-3 font-medium whitespace-nowrap">年份</th>
                  <th className="text-left px-4 py-3 font-medium whitespace-nowrap">批次</th>
                  <th className="text-left px-4 py-3 font-medium whitespace-nowrap">科类</th>
                  <th className="text-left px-4 py-3 font-medium whitespace-nowrap">专业名称</th>
                  <th className="text-center px-4 py-3 font-medium whitespace-nowrap">最低分</th>
                  <th className="text-center px-4 py-3 font-medium whitespace-nowrap">最低位次</th>
                  <th className="text-center px-4 py-3 font-medium whitespace-nowrap">平均分</th>
                  <th className="text-center px-4 py-3 font-medium whitespace-nowrap">最高分</th>
                  <th className="text-center px-4 py-3 font-medium whitespace-nowrap">录取人数</th>
                  <th className="text-center px-4 py-3 font-medium whitespace-nowrap">类型</th>
                </tr>
              </thead>
              <tbody>
                {data.scores.map((s, i) => (
                  <tr key={s.id} className={`border-t border-slate-100 hover:bg-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="px-4 py-2.5 text-slate-600">{s.year}</td>
                    <td className="px-4 py-2.5 text-slate-600">{s.batch_name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{s.category_name}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-800">{s.sp_name}</div>
                      {s.info && (
                        <div className="text-xs text-slate-400 mt-0.5 line-clamp-1" title={s.info}>{s.info}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="font-bold text-indigo-700">{s.min_score}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center font-medium text-slate-700">
                      {s.min_section > 0 ? s.min_section.toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-center text-slate-600">
                      {s.avg_score > 0 ? s.avg_score : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-center text-slate-600">
                      {s.max_score > 0 ? s.max_score : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-center text-slate-600">
                      {s.lq_num != null ? s.lq_num : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Tag>{s.zslx_name || '-'}</Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">第 {page}/{totalPages} 页</span>
              <div className="flex gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => { const p = page - 1; setPage(p); fetchScores(filters, p); }}
                  className="px-3 py-1 text-xs rounded bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  上一页
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => { const p = page + 1; setPage(p); fetchScores(filters, p); }}
                  className="px-3 py-1 text-xs rounded bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      ) : data ? (
        <div className="text-center py-12 text-slate-400">暂无录取分数数据</div>
      ) : null}
    </div>
  );
}

// ============================================================
// 主组件
// ============================================================

export default function SchoolDetailPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code;

  const [data, setData] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    fetch(`/api/school/${code}`)
      .then(r => r.json())
      .then((d: SchoolData) => {
        setData(d);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center text-slate-400">加载中...</div>
    );
  }

  if (!data || !data.university) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center text-slate-400">
        未找到该院校信息
        <br />
        <button onClick={() => router.back()} className="mt-4 text-indigo-600 hover:underline text-sm">← 返回</button>
      </div>
    );
  }

  const { university: uni } = data;
  const rankings = (uni.rankings || []) as RankingEntry[];
  const dualClass = (uni.dualClass || []) as DualClassEntry[];
  const specials = (uni.specials || []) as SpecialEntry[];
  const xuekeRanks = (uni.xuekeRanks || []) as XuekeRankEntry[];
  const academicPoints = (uni.academicPoints || []) as AcademicPointEntry[];
  const labels = (uni.labels || []) as LabelEntry[];
  const campuses = (uni.campuses || []) as CampusEntry[];

  const honorLabels = labels.filter(l => l.key === 'college_honor' || ['985', '211', '双一流', '强基', '101计划', 'C9', '五院四系', '医药双雄'].includes(l.name));
  const masterPoints = academicPoints.filter(p => p.category === 'master');
  const doctorPoints = academicPoints.filter(p => p.category === 'doctor');
  const subjectPoints = academicPoints.filter(p => p.category === 'subject');

  const tabs: TabKey[] = ['overview', 'admission', 'scores', 'special', 'rankings'];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* 返回 */}
      <button onClick={() => router.back()}
        className="text-sm text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        返回院校库
      </button>

      {/* 院校头部 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
        <div className="flex items-start gap-4">
          <img
            src={uni.imageCode
              ? `https://t1.chei.com.cn/common/xh/${String(uni.imageCode)}.jpg`
              : `https://t1.chei.com.cn/common/xh/${String(uni.code || code)}.jpg`}
            alt={String(uni.name || code)}
            className="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{String(uni.name || code)}</h1>
              {uni.tier && <Tag color="amber">{String(uni.tier)}</Tag>}
            </div>
            {uni.shortNames && (
              <p className="mt-1 text-sm text-slate-400">简称: {String(uni.shortNames)}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              {uni.location && <span>{String(uni.location)}{uni.city ? ` · ${String(uni.city)}` : ''}</span>}
              {uni.authority && <span>{String(uni.authority)}</span>}
              {uni.level && <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 text-xs">{String(uni.level)}</span>}
              {uni.type && <span className="text-xs text-slate-400">{String(uni.type)}</span>}
              {uni.createDate && <span className="text-xs text-slate-400">建校 {String(uni.createDate)}</span>}
            </div>
            {honorLabels.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {honorLabels.map((l, i) => (
                  <Tag key={i} color="indigo">{l.name}</Tag>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              {uni.officialWebsite && (
                <a href={String(uni.officialWebsite)} target="_blank" rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                  </svg>
                  官网
                </a>
              )}
              {uni.admissionWebsite && (
                <a href={String(uni.admissionWebsite)} target="_blank" rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                  </svg>
                  招生网
                </a>
              )}
              {uni.phone && <span className="text-slate-400">{String(uni.phone)}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* 标签页切换 */}
      <TabBar active={activeTab} onChange={setActiveTab} tabs={tabs} />

      {/* ========== 学校概况 ========== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 基本统计 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {uni.area && <StatCard label="占地面积(亩)" value={Number(uni.area).toLocaleString()} />}
            {uni.numSubject && <StatCard label="本科专业" value={String(uni.numSubject)} />}
            {uni.numMaster && <StatCard label="硕士点" value={String(uni.numMaster)} />}
            {uni.numDoctor && <StatCard label="博士点" value={String(uni.numDoctor)} />}
            {uni.numAcademician && <StatCard label="院士" value={String(uni.numAcademician)} />}
            {uni.numLibrary && <StatCard label="图书馆藏(万册)" value={String(uni.numLibrary)} />}
            {uni.numLab && <StatCard label="实验室" value={String(uni.numLab)} />}
            {uni.recommendMasterRate && <StatCard label="保研率" value={String(uni.recommendMasterRate)} />}
            {uni.upgradingRate && <StatCard label="升学率" value={String(uni.upgradingRate)} />}
          </div>

          {/* 院校简介 */}
          {uni.content && (
            <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">院校简介</h2>
              <div
                className="prose prose-sm max-w-none text-slate-600 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: String(uni.content) }}
              />
            </section>
          )}

          {/* 基本信息 */}
          {(uni.address || uni.motto) && (
            <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">基本信息</h2>
              <div className="space-y-3 text-sm">
                {uni.motto && (
                  <div className="flex gap-3">
                    <span className="text-slate-400 shrink-0 w-16">校训</span>
                    <span className="text-slate-700 font-medium">{String(uni.motto)}</span>
                  </div>
                )}
                {uni.address && (
                  <div className="flex gap-3">
                    <span className="text-slate-400 shrink-0 w-16">地址</span>
                    <span className="text-slate-700">{String(uni.address)}</span>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ========== 招生计划 ========== */}
      {activeTab === 'admission' && (
        <AdmissionPlanTab schoolCode={code} />
      )}

      {/* ========== 历年分数 ========== */}
      {activeTab === 'scores' && (
        <AdmissionScoreTab schoolCode={code} />
      )}

      {/* ========== 特色专业 ========== */}
      {activeTab === 'special' && (
        <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            特色专业
            {specials.length > 0 && <span className="text-sm font-normal text-slate-400 ml-2">共 {specials.length} 个</span>}
          </h2>
          {specials.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500">
                    <th className="text-left px-4 py-3 font-medium">专业名称</th>
                    <th className="text-left px-4 py-3 font-medium">层次</th>
                    <th className="text-center px-4 py-3 font-medium">国家级特色</th>
                    <th className="text-center px-4 py-3 font-medium">省级特色</th>
                    <th className="text-center px-4 py-3 font-medium">学科评估</th>
                    <th className="text-center px-4 py-3 font-medium">软科排名</th>
                    <th className="text-center px-4 py-3 font-medium">软科等级</th>
                  </tr>
                </thead>
                <tbody>
                  {specials.map((sp, i) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-700 font-medium">{sp.special_name}</td>
                      <td className="px-4 py-2.5 text-slate-500">{sp.level_name || '-'}</td>
                      <td className="px-4 py-2.5 text-center">
                        {sp.nation_feature === '1' ? <Tag color="red">国家级</Tag> : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {sp.province_feature === '1' ? <Tag color="blue">省级</Tag> : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {sp.xueke_rank && sp.xueke_rank !== '0' ? (
                          <span className={`text-xs font-bold ${
                            String(sp.xueke_rank).startsWith('A') ? 'text-red-600' :
                            String(sp.xueke_rank).startsWith('B') ? 'text-amber-600' :
                            'text-blue-600'
                          }`}>{sp.xueke_rank}</span>
                        ) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center text-slate-600">{sp.ruanke_rank && sp.ruanke_rank !== '0' ? sp.ruanke_rank : '-'}</td>
                      <td className="px-4 py-2.5 text-center text-slate-500">{sp.ruanke_level || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-slate-400 py-8">暂无特色专业数据</div>
          )}
        </section>
      )}

      {/* ========== 学科与排名 ========== */}
      {activeTab === 'rankings' && (
        <div className="space-y-6">
          {/* 学科评估 */}
          {xuekeRanks.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">学科评估</h2>
              <div className="flex flex-wrap gap-3">
                {GRADE_ORDER.filter(g => xuekeRanks.some(x => x.grade === g)).map(grade => {
                  const item = xuekeRanks.find(x => x.grade === grade);
                  if (!item) return null;
                  return (
                    <div key={grade} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                      <span className={`text-sm font-bold ${
                        grade.startsWith('A') ? 'text-red-600' :
                        grade.startsWith('B') ? 'text-amber-600' :
                        'text-blue-600'
                      }`}>{grade}</span>
                      <span className="text-sm text-slate-500">{item.count}个</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 双一流学科 */}
          {dualClass.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">双一流建设学科</h2>
              <div className="flex flex-wrap gap-2">
                {dualClass.map((dc, i) => (
                  <Tag key={i} color="emerald">{dc.class_name}</Tag>
                ))}
              </div>
            </section>
          )}

          {/* 硕博点 */}
          {(masterPoints.length > 0 || doctorPoints.length > 0) && (
            <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">硕博点</h2>
              {doctorPoints.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-slate-500 mb-2">博士点</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {doctorPoints.map((p, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 text-xs rounded-md">
                        {p.name} <span className="font-medium">{p.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {masterPoints.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">硕士点</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {masterPoints.map((p, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">
                        {p.name} <span className="font-medium">{p.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 各类排名 */}
          {rankings.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">各类排名</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {rankings.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">{RANK_TYPE_LABELS[r.rank_type] || r.rank_type}</span>
                    <span className="text-lg font-bold text-slate-900">第{r.rank_value}名</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 学科门类 */}
          {subjectPoints.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">学科门类</h2>
              <div className="flex flex-wrap gap-1.5">
                {subjectPoints.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md">
                    {p.name} <span className="font-medium">{p.count}</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* 校区信息 */}
          {campuses.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">校区分布</h2>
              <div className="space-y-4">
                {campuses.map((c, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-lg">
                    <h3 className="font-medium text-slate-800 mb-2">{c.campus_name}</h3>
                    {c.departments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {c.departments.map((d, j) => (
                          <span key={j} className="px-2 py-0.5 bg-white text-slate-600 text-xs rounded border border-slate-200">
                            {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {rankings.length === 0 && subjectPoints.length === 0 && xuekeRanks.length === 0 && dualClass.length === 0 && masterPoints.length === 0 && doctorPoints.length === 0 && campuses.length === 0 && (
            <div className="text-center text-slate-400 py-12">暂无排名数据</div>
          )}
        </div>
      )}
    </div>
  );
}