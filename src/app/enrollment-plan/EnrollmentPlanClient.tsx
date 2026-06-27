'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#d946ef', '#22d3ee'];

// ============================================================
// Types
// ============================================================

interface PlanEntry {
  id: number;
  school_id: number;
  special_id: number;
  year: number;
  batch_name: string;
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
  sp_info: string;
  zslx_name: string;
  info: string;
  universityName: string;
}

interface PlanStats {
  universityCount: number;
  entryCount: number;
  totalPlans: number;
  categoryDistribution: Record<string, number>;
  level2Distribution: Record<string, number>;
  zslxDistribution: Record<string, number>;
  tuitionDistribution: Record<string, number>;
  topSchools: { school_id: number; name: string; plans: number; entries: number }[];
}

interface PlanData {
  entries: PlanEntry[];
  total: number;
  years: number[];
  batchNames: string[];
  categoryNames: string[];
  zslxNames: string[];
  level2Names: string[];
  stats: PlanStats;
}

// ============================================================
// 小组件
// ============================================================

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="text-xs font-medium text-slate-400 mb-1">{label}</div>
      <div className="text-xl sm:text-2xl font-bold text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function SelectFilter({ label, value, onChange, options, placeholder = '全部' }: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-400">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 appearance-none cursor-pointer">
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ============================================================
// 图表
// ============================================================

function PieDistChart({ dist, title }: { dist: Record<string, number>; title: string }) {
  const data = Object.entries(dist)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  if (data.length === 0) return <div className="text-slate-400 text-sm text-center py-12">暂无数据</div>;
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={100} paddingAngle={2} dataKey="value"
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
            formatter={(v) => [`${(v as number)?.toLocaleString()} 条`, title]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function TuitionBarChart({ dist }: { dist: Record<string, number> }) {
  const order = ['≤5000', '5001-10000', '10001-20000', '20001-50000', '>50000'];
  const data = order.filter(k => dist[k]).map(k => ({ name: k, count: dist[k] }));
  if (data.length === 0) return <div className="text-slate-400 text-sm text-center py-12">暂无数据</div>;
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
            formatter={(v) => [`${(v as number)?.toLocaleString()} 条`, '专业数']} />
          <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopSchoolsChart({ schools }: { schools: PlanStats['topSchools'] }) {
  const data = schools.slice(0, 20).map(s => ({
    name: s.name.length > 12 ? s.name.slice(0, 12) + '...' : s.name,
    fullName: s.name,
    plans: s.plans,
  }));
  if (data.length === 0) return <div className="text-slate-400 text-sm text-center py-12">暂无数据</div>;
  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} width={110} />
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
            formatter={(v, _n, p) => [`${(v as number)?.toLocaleString()} 人`, (p as { payload?: { fullName?: string } })?.payload?.fullName || '']} />
          <Bar dataKey="plans" fill="#6366f1" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================
// 主组件
// ============================================================

export default function EnrollmentPlanClient() {
  const [view, setView] = useState<'overview' | 'detail'>('overview');

  // 筛选器
  const [year, setYear] = useState('');
  const [batchName, setBatchName] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [zslxName, setZslxName] = useState('');
  const [level2Name, setLevel2Name] = useState('');
  const [keyword, setKeyword] = useState('');
  const [sort, setSort] = useState('plan_desc');
  const [page, setPage] = useState(1);

  // 数据
  const [data, setData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (opts: Record<string, string | number>) => {
    setLoading(true);
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(opts)) {
      if (v !== '' && v !== undefined && v !== null) params.append(k, String(v));
    }
    try {
      const res = await fetch(`/api/enrollment-plan?${params}`);
      const d = await res.json();
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    fetchData({ page: 1 });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 筛选变化时重新查询
  const applyFilters = (overrides?: Record<string, string | number>) => {
    const base = { year, batch_name: batchName, category_name: categoryName, zslx_name: zslxName, level2_name: level2Name, keyword, sort };
    const merged = { ...base, ...overrides, page: 1 };
    fetchData(merged);
    setPage(1);
  };

  const handleSearch = () => applyFilters();
  const handleFilterChange = (key: string, value: string) => {
    switch (key) {
      case 'year': setYear(value); break;
      case 'batch_name': setBatchName(value); break;
      case 'category_name': setCategoryName(value); break;
      case 'zslx_name': setZslxName(value); break;
      case 'level2_name': setLevel2Name(value); break;
    }
    applyFilters({ [key]: value });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchData({ year, batch_name: batchName, category_name: categoryName, zslx_name: zslxName, level2_name: level2Name, keyword, sort, page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pageSize = 50;
  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">招生计划总览</h1>

      {/* 筛选栏 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <SelectFilter label="年份" value={year} onChange={v => handleFilterChange('year', v)}
            options={data?.years?.map(String) || []} />
          <SelectFilter label="批次" value={batchName} onChange={v => handleFilterChange('batch_name', v)}
            options={data?.batchNames || []} />
          <SelectFilter label="科类" value={categoryName} onChange={v => handleFilterChange('category_name', v)}
            options={data?.categoryNames || []} />
          <SelectFilter label="招生类型" value={zslxName} onChange={v => handleFilterChange('zslx_name', v)}
            options={data?.zslxNames || []} />
          <SelectFilter label="学科门类" value={level2Name} onChange={v => handleFilterChange('level2_name', v)}
            options={data?.level2Names || []} />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">排序</label>
            <select value={sort} onChange={e => { setSort(e.target.value); applyFilters({ sort: e.target.value }); }}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-indigo-300 appearance-none cursor-pointer">
              <option value="plan_desc">计划数降序</option>
              <option value="plan_asc">计划数升序</option>
              <option value="tuition_desc">学费降序</option>
              <option value="tuition_asc">学费升序</option>
            </select>
          </div>
        </div>
        <form onSubmit={e => { e.preventDefault(); handleSearch(); }} className="flex gap-2">
          <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)}
            placeholder="搜索院校名称、专业名称或专业代码"
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400" />
          <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors">搜索</button>
        </form>
      </div>

      {/* 视图切换 */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {([
          { key: 'overview' as const, label: '总览统计' },
          { key: 'detail' as const, label: '专业明细' },
        ]).map(t => (
          <button key={t.key} onClick={() => setView(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">加载中...</div>
      ) : !data?.stats ? (
        <div className="text-center text-slate-400 py-12">暂无数据</div>
      ) : view === 'overview' ? (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="院校数" value={data.stats.universityCount.toLocaleString()} />
            <StatCard label="专业条目" value={data.stats.entryCount.toLocaleString()} />
            <StatCard label="总计划数" value={data.stats.totalPlans.toLocaleString()} />
            <StatCard label="学科门类" value={Object.keys(data.stats.level2Distribution).length} />
          </div>

          {/* 图表区域 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">科类分布</h3>
              <PieDistChart dist={data.stats.categoryDistribution} title="科类" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">招生类型分布</h3>
              <PieDistChart dist={data.stats.zslxDistribution} title="招生类型" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">学费区间分布</h3>
              <TuitionBarChart dist={data.stats.tuitionDistribution} />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">学科门类分布</h3>
              <PieDistChart dist={data.stats.level2Distribution} title="学科门类" />
            </div>
          </div>

          {/* Top 院校 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Top 20 计划数最多院校</h3>
            <TopSchoolsChart schools={data.stats.topSchools} />
          </div>
        </>
      ) : (
        <>
          <div className="text-sm text-slate-400">
            共 <span className="font-medium text-slate-700">{data.total.toLocaleString()}</span> 条记录
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500">
                    <th className="text-left px-4 py-3 font-medium whitespace-nowrap">年份</th>
                    <th className="text-left px-4 py-3 font-medium whitespace-nowrap">批次</th>
                    <th className="text-left px-4 py-3 font-medium whitespace-nowrap">院校</th>
                    <th className="text-left px-4 py-3 font-medium whitespace-nowrap">专业名称</th>
                    <th className="text-center px-4 py-3 font-medium whitespace-nowrap">计划数</th>
                    <th className="text-center px-4 py-3 font-medium whitespace-nowrap">学制</th>
                    <th className="text-right px-4 py-3 font-medium whitespace-nowrap">学费(元/年)</th>
                    <th className="text-left px-4 py-3 font-medium whitespace-nowrap">选科要求</th>
                    <th className="text-left px-4 py-3 font-medium whitespace-nowrap hidden md:table-cell">学科门类</th>
                    <th className="text-center px-4 py-3 font-medium whitespace-nowrap hidden md:table-cell">类型</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((e, i) => (
                    <tr key={e.id} className={`border-t border-slate-100 hover:bg-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <td className="px-4 py-2.5 text-slate-500">{e.year}</td>
                      <td className="px-4 py-2.5 text-slate-500">{e.batch_name}</td>
                      <td className="px-4 py-2.5 text-slate-700 max-w-[160px] truncate font-medium" title={e.universityName}>{e.universityName}</td>
                      <td className="px-4 py-2.5 max-w-[200px]">
                        <div className="text-slate-800 truncate font-medium" title={e.sp_name}>{e.sp_name}</div>
                        {e.info && <div className="text-xs text-slate-400 truncate mt-0.5" title={e.info}>{e.info}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-center font-semibold text-slate-900">{e.num}</td>
                      <td className="px-4 py-2.5 text-center text-slate-500">{e.length}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{e.tuition}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-slate-500" title={e.sp_info}>{e.sp_info || '-'}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400 hidden md:table-cell">
                        {e.level2_name}{e.level3_name ? ` · ${e.level3_name}` : ''}
                      </td>
                      <td className="px-4 py-2.5 text-center hidden md:table-cell">
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">{e.zslx_name}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">上一页</button>
              <span className="text-sm text-slate-400">第 {page} / {totalPages} 页</span>
              <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">下一页</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}