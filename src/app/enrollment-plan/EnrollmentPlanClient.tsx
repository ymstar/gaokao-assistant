'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#84cc16'];

// ============================================================
// Types
// ============================================================

interface PlanEntry {
  index: number;
  universityCode: string;
  universityName: string;
  majorCode: string;
  majorName: string;
  majorNote: string;
  subjectRequirement: string;
  planCount: number;
  duration: number;
  tuition: number;
}

interface AvailableBatch {
  year: number;
  batch: string;
  universityCount: number;
}

interface PlanStats {
  universityCount: number;
  entryCount: number;
  totalPlans: number;
  subjectDistribution: Record<string, number>;
  tuitionDistribution: Record<string, number>;
  durationDistribution: Record<string, number>;
  topSchools: { universityCode: string; name: string; planCount: number; entryCount: number }[];
}

// ============================================================
// 小组件
// ============================================================

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="text-xs font-medium text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function Toggle({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="inline-flex bg-slate-100 rounded-lg p-0.5">
      {options.map(opt => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            value === opt.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// 图表
// ============================================================

function SubjectChart({ dist }: { dist: Record<string, number> }) {
  const data = Object.entries(dist).map(([name, value]) => ({ name, value }));
  if (data.length === 0) return <div className="text-slate-400 text-sm text-center py-8">暂无数据</div>;
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={2} dataKey="value"
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function TuitionChart({ dist }: { dist: Record<string, number> }) {
  const order = ['≤5000', '5001-10000', '10001-20000', '20001-50000', '>50000'];
  const data = order.filter(k => dist[k]).map(k => ({ name: k, count: dist[k] }));
  if (data.length === 0) return <div className="text-slate-400 text-sm text-center py-8">暂无数据</div>;
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} formatter={(v) => [`${v} 条`, '专业数']} />
          <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopSchoolsChart({ schools }: { schools: PlanStats['topSchools'] }) {
  const data = schools.slice(0, 20).map(s => ({
    name: s.name.length > 10 ? s.name.slice(0, 10) + '...' : s.name,
    fullName: s.name,
    plans: s.planCount,
  }));
  if (data.length === 0) return <div className="text-slate-400 text-sm text-center py-8">暂无数据</div>;
  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} width={100} />
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
            formatter={(v, _, p) => [`${v} 人`, ((p?.payload as Record<string, unknown>)?.fullName as string) || '']} />
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
  const [batch, setBatch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [sort, setSort] = useState('plan_desc');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'overview' | 'detail'>('overview');

  const [stats, setStats] = useState<PlanStats | null>(null);
  const [entries, setEntries] = useState<PlanEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [available, setAvailable] = useState<AvailableBatch[]>([]);
  const [loading, setLoading] = useState(false);

  // 初始化
  useEffect(() => {
    fetch(`/api/enrollment-plan?province=hebei`)
      .then(r => r.json())
      .then(data => {
        if (data.available?.length) {
          setAvailable(data.available);
          setBatch(data.batch || data.available[0]?.batch || '');
          setStats(data.stats || null);
        }
      })
      .catch(console.error);
  }, []);

  const fetchData = useCallback(async (opts: Record<string, string | number>) => {
    setLoading(true);
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(opts)) {
      if (v !== '' && v !== 0) params.append(k, String(v));
    }
    try {
      const res = await fetch(`/api/enrollment-plan?${params}`);
      const data = await res.json();
      setEntries(data.entries || []);
      setTotal(data.total || 0);
      if (data.stats) setStats(data.stats);
    } catch (e) {
      console.error('Failed to fetch:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (batch) fetchData({ province: 'hebei', year: 2026, batch, page: 1 });
  }, [fetchData, batch]);

  const handleSearch = () => {
    setPage(1);
    fetchData({ province: 'hebei', year: 2026, batch, keyword, sort, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchData({ province: 'hebei', year: 2026, batch, keyword, sort, page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">招生计划总览</h1>

      {/* 筛选栏 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">批次</label>
            <Toggle value={batch} onChange={v => setBatch(v)}
              options={available.map(b => ({ label: b.batch, value: b.batch }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">年份</label>
            <span className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium">2026</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">排序</label>
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer">
              <option value="plan_desc">计划数降序</option>
              <option value="plan_asc">计划数升序</option>
              <option value="tuition_desc">学费降序</option>
              <option value="tuition_asc">学费升序</option>
            </select>
          </div>
        </div>
        <form onSubmit={e => { e.preventDefault(); handleSearch(); }} className="flex gap-2">
          <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)}
            placeholder="搜索院校名称、代码或专业名称"
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400" />
          <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors">搜索</button>
        </form>
      </div>

      {/* Tab */}
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
      ) : !stats ? (
        <div className="text-center text-slate-400 py-12">暂无数据</div>
      ) : view === 'overview' ? (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard label="院校数" value={stats.universityCount.toLocaleString()} />
            <StatCard label="专业条目" value={stats.entryCount.toLocaleString()} />
            <StatCard label="总计划数" value={stats.totalPlans.toLocaleString()} />
          </div>

          {/* 图表 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">选科要求分布</h3>
              <SubjectChart dist={stats.subjectDistribution} />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">学费区间分布</h3>
              <TuitionChart dist={stats.tuitionDistribution} />
            </div>
          </div>

          {/* Top 院校 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Top 20 计划数最多院校</h3>
            <TopSchoolsChart schools={stats.topSchools} />
          </div>
        </>
      ) : (
        <>
          <div className="text-sm text-slate-400">共 {total} 条记录</div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500">
                    <th className="text-left px-4 py-3 font-medium">院校</th>
                    <th className="text-left px-4 py-3 font-medium">专业</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">备注</th>
                    <th className="text-right px-4 py-3 font-medium">计划数</th>
                    <th className="text-center px-4 py-3 font-medium hidden md:table-cell">学制</th>
                    <th className="text-right px-4 py-3 font-medium hidden md:table-cell">学费</th>
                    <th className="text-left px-4 py-3 font-medium">选科</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={`${e.universityCode}-${e.index}`} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-700 max-w-[180px] truncate" title={e.universityName}>{e.universityName}</td>
                      <td className="px-4 py-2.5 text-slate-600 max-w-[180px] truncate" title={e.majorName}>{e.majorName}</td>
                      <td className="px-4 py-2.5 text-slate-400 max-w-[150px] truncate hidden md:table-cell" title={e.majorNote}>{e.majorNote || '-'}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-900">{e.planCount}</td>
                      <td className="px-4 py-2.5 text-center text-slate-500 hidden md:table-cell">{e.duration}年</td>
                      <td className="px-4 py-2.5 text-right text-slate-500 hidden md:table-cell">{e.tuition > 0 ? e.tuition.toLocaleString() : '-'}</td>
                      <td className="px-4 py-2.5 text-slate-500">{e.subjectRequirement}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40">上一页</button>
              <span className="text-sm text-slate-400">第 {page} / {totalPages} 页</span>
              <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40">下一页</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
