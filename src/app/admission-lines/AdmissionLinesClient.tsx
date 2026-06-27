'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { AdmissionLineEntry } from '@/types/admission-line';

const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

// ============================================================
// 辅助
// ============================================================

interface AvailableBatch { year: number; batch: string; group: string }

interface LineStats {
  totalRecords: number;
  universityCount: number;
  scoreRange: [number, number];
  rankRange: [number, number];
  typeDistribution: Record<string, number>;
  scoreDistribution: Record<string, number>;
}

interface UniSummary {
  universityCode: string;
  universityName: string;
  groupCount: number;
  minScore: number;
  maxScore: number;
  minRank: number;
  maxRank: number;
  entries: AdmissionLineEntry[];
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

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="text-xs font-medium text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

// ============================================================
// 图表
// ============================================================

function ScoreDistChart({ dist }: { dist: Record<string, number> }) {
  const data = Object.entries(dist)
    .map(([k, v]) => ({ name: `${k}~${+k + 9}`, count: v }))
    .sort((a, b) => +a.name.split('~')[0] - +b.name.split('~')[0]);
  if (data.length === 0) return <div className="text-slate-400 text-sm text-center py-8">暂无数据</div>;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} angle={-45} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} formatter={(v) => [`${v} 条`, '记录数']} />
          <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TypeChart({ dist }: { dist: Record<string, number> }) {
  const data = Object.entries(dist).map(([name, value]) => ({ name, value }));
  if (data.length === 0) return <div className="text-slate-400 text-sm text-center py-8">暂无数据</div>;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value"
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================
// 院校卡片
// ============================================================

function UniversityCard({ uni, expanded, onToggle }: {
  uni: UniSummary; expanded: boolean; onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-indigo-200 transition-all">
      <button type="button" onClick={onToggle} className="w-full p-5 flex items-center gap-4 text-left">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-900 truncate">{uni.universityName}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">{uni.groupCount} 个专业组</span>
            <span className="text-slate-400">投档分 {uni.minScore}{uni.maxScore !== uni.minScore ? `~${uni.maxScore}` : ''}</span>
            <span className="text-slate-400">位次 {uni.minRank.toLocaleString()}{uni.maxRank !== uni.minRank ? `~${uni.maxRank.toLocaleString()}` : ''}</span>
          </div>
        </div>
        <svg className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {expanded && (
        <div className="border-t border-slate-100 px-5 pb-5">
          <table className="w-full text-sm mt-3">
            <thead>
              <tr className="text-xs text-slate-400">
                <th className="text-left pb-2 font-medium">专业组</th>
                <th className="text-right pb-2 font-medium">计划数</th>
                <th className="text-right pb-2 font-medium">最低分</th>
                <th className="text-right pb-2 font-medium">最低位次</th>
                <th className="text-right pb-2 font-medium">平均分</th>
              </tr>
            </thead>
            <tbody>
              {uni.entries.sort((a, b) => b.minScore - a.minScore).map((e, i) => (
                <tr key={i} className="border-t border-slate-50">
                  <td className="py-2 text-slate-700 max-w-[300px] truncate" title={e.majorGroup}>{e.majorGroup}</td>
                  <td className="py-2 text-right text-slate-600">{e.planCount}</td>
                  <td className="py-2 text-right font-medium text-slate-900">{e.minScore}</td>
                  <td className="py-2 text-right text-slate-600">{e.minRank.toLocaleString()}</td>
                  <td className="py-2 text-right text-slate-500">{e.avgScore || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 主组件
// ============================================================

export default function AdmissionLinesClient() {
  const [year, setYear] = useState(2025);
  const [batch, setBatch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState('');
  const [sort, setSort] = useState('score_desc');
  const [tab, setTab] = useState<'overview' | 'university' | 'detail'>('overview');
  const [page, setPage] = useState(1);
  const [expandedUni, setExpandedUni] = useState<string | null>(null);

  const [stats, setStats] = useState<LineStats | null>(null);
  const [universities, setUniversities] = useState<UniSummary[]>([]);
  const [records, setRecords] = useState<AdmissionLineEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [available, setAvailable] = useState<AvailableBatch[]>([]);
  const [loading, setLoading] = useState(false);

  // 初始化：获取可用批次
  useEffect(() => {
    fetch(`/api/admission-lines?province=hebei`)
      .then(r => r.json())
      .then(data => {
        if (data.available?.length) {
          setAvailable(data.available);
          const latestYear = Math.max(...data.available.map((b: AvailableBatch) => b.year));
          setYear(latestYear);
          const yearBatches = data.available.filter((b: AvailableBatch) => b.year === latestYear);
          if (yearBatches.length > 0) setBatch(yearBatches[0].batch);
        }
      })
      .catch(console.error);
  }, []);

  // 切换年份时自动调整批次
  useEffect(() => {
    const yearBatches = available.filter(b => b.year === year);
    if (yearBatches.length === 0) return;
    if (!yearBatches.some(b => b.batch === batch)) {
      setBatch(yearBatches[0].batch);
    }
  }, [year, available, batch]);

  const fetchData = useCallback(async (opts: Record<string, string | number>) => {
    setLoading(true);
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(opts)) {
      if (v !== '' && v !== 0) params.append(k, String(v));
    }
    try {
      const res = await fetch(`/api/admission-lines?${params}`);
      const data = await res.json();
      setStats(data.stats || null);
      setUniversities(data.universities || []);
      setRecords(data.records || []);
      setTotal(data.total || 0);
      if (data.available?.length) setAvailable(data.available);
    } catch (e) {
      console.error('Failed to fetch:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (batch) fetchData({ province: 'hebei', year, batch, page: 1 });
  }, [fetchData, year, batch]);

  const handleSearch = () => {
    setPage(1);
    fetchData({ province: 'hebei', year, batch, keyword, type, sort, page: 1 });
  };

  const handleTabChange = (newTab: typeof tab) => {
    setTab(newTab);
    setPage(1);
    fetchData({ province: 'hebei', year, batch, keyword, type, sort, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchData({ province: 'hebei', year, batch, keyword, type, sort, page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const batches = [...new Set(available.filter(b => b.year === year).map(b => b.batch))];
  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  const TYPE_OPTIONS = ['国家专项', '公费师范', '优师专项', '免费医学定向', '高校专项', '普通'];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">投档线查询</h1>

      {/* 筛选栏 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">年份</label>
            <Toggle value={String(year)} onChange={v => { setYear(parseInt(v)); setBatch(''); }}
              options={[...new Set(available.map(b => b.year))].sort().map(y => ({ label: String(y), value: String(y) }))} />
          </div>
          {batches.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">批次</label>
              <Toggle value={batch || batches[0] || ''} onChange={v => setBatch(v)}
                options={batches.map(b => ({ label: b, value: b }))} />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">计划类型</label>
            <select value={type} onChange={e => setType(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer">
              <option value="">全部</option>
              {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">排序</label>
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer">
              <option value="score_desc">分数降序</option>
              <option value="score_asc">分数升序</option>
              <option value="rank_asc">位次升序</option>
            </select>
          </div>
        </div>
        <form onSubmit={e => { e.preventDefault(); handleSearch(); }} className="flex gap-2">
          <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)}
            placeholder="搜索院校名称、代码或专业组名称"
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400" />
          <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors">搜索</button>
        </form>
      </div>

      {/* Tab */}
      <div className="overflow-x-auto sm:overflow-visible">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit min-w-0">
          {([
            { key: 'overview' as const, label: '总览' },
            { key: 'university' as const, label: '院校汇总' },
            { key: 'detail' as const, label: '专业组明细' },
          ]).map(t => (
            <button key={t.key} onClick={() => handleTabChange(t.key)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">加载中...</div>
      ) : !stats ? (
        <div className="text-center text-slate-400 py-12">暂无数据</div>
      ) : (
        <>
          {/* 总览 */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="投档记录" value={stats.totalRecords.toLocaleString()} />
                <StatCard label="院校数" value={stats.universityCount} />
                <StatCard label="分数区间" value={`${stats.scoreRange[0]} ~ ${stats.scoreRange[1]}`} />
                <StatCard label="位次区间" value={`${stats.rankRange[0].toLocaleString()} ~ ${stats.rankRange[1].toLocaleString()}`} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">分数分布（10分一档）</h3>
                  <ScoreDistChart dist={stats.scoreDistribution} />
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">计划类型分布</h3>
                  <TypeChart dist={stats.typeDistribution} />
                </div>
              </div>
            </div>
          )}

          {/* 院校汇总 */}
          {tab === 'university' && (
            <div className="space-y-3">
              <div className="text-sm text-slate-400">共 {universities.length} 所院校</div>
              {universities.map(uni => (
                <UniversityCard key={uni.universityCode} uni={uni}
                  expanded={expandedUni === uni.universityCode}
                  onToggle={() => setExpandedUni(expandedUni === uni.universityCode ? null : uni.universityCode)} />
              ))}
            </div>
          )}

          {/* 专业组明细 */}
          {tab === 'detail' && (
            <div className="space-y-3">
              <div className="text-sm text-slate-400">共 {total} 条记录</div>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs text-slate-500">
                        <th className="text-left px-4 py-3 font-medium">院校</th>
                        <th className="text-left px-4 py-3 font-medium">专业组</th>
                        <th className="text-right px-4 py-3 font-medium">计划数</th>
                        <th className="text-right px-4 py-3 font-medium">最低分</th>
                        <th className="text-right px-4 py-3 font-medium">最低位次</th>
                        <th className="text-right px-4 py-3 font-medium hidden md:table-cell">平均分</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r, i) => (
                        <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2.5 text-slate-700 max-w-[200px] truncate" title={r.universityName}>{r.universityName}</td>
                          <td className="px-4 py-2.5 text-slate-600 max-w-[250px] truncate" title={r.majorGroup}>{r.majorGroup}</td>
                          <td className="px-4 py-2.5 text-right text-slate-600">{r.planCount}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-900">{r.minScore}</td>
                          <td className="px-4 py-2.5 text-right text-slate-600">{r.minRank.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right text-slate-500 hidden md:table-cell">{r.avgScore || '-'}</td>
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
