'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  AdmissionRecord, AdmissionStats, UniversityAdmissionSummary
} from '@/types/admission-record';

const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

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

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="text-xs font-medium text-slate-400 mb-1">{label}</div>
      <div className="text-xl sm:text-2xl font-bold text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function VolunteerChart({ dist }: { dist: Record<string, number> }) {
  const data = Array.from({ length: 20 }, (_, i) => {
    const key = String(i + 1);
    return { name: `第${i + 1}志愿`, count: dist[key] || 0 };
  });
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} interval={0} angle={-45} textAnchor="end" height={50} />
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
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function UniversityCard({ uni, expanded, onToggle }: { uni: UniversityAdmissionSummary; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-indigo-200 transition-all">
      <button type="button" onClick={onToggle} className="w-full p-5 flex items-center gap-4 text-left">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-900 truncate">{uni.universityName}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">{uni.majorCount} 个专业</span>
            <span className="text-slate-400">投档分 {uni.minScore}~{uni.maxScore}</span>
            <span className={`px-2 py-0.5 rounded-full ${uni.avgVolunteerNum <= 5 ? 'bg-green-50 text-green-600' : uni.avgVolunteerNum <= 20 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
              平均志愿号 {uni.avgVolunteerNum}
            </span>
          </div>
        </div>
        <svg className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {expanded && (
        <div className="border-t border-slate-100 px-5 pb-5">
          <table className="w-full text-sm mt-3">
            <thead>
              <tr className="text-xs text-slate-400">
                <th className="text-left pb-2 font-medium">专业</th>
                <th className="text-right pb-2 font-medium">投档分</th>
                <th className="text-right pb-2 font-medium">志愿号</th>
              </tr>
            </thead>
            <tbody>
              {uni.records.sort((a, b) => b.minScore - a.minScore).map((r, i) => (
                <tr key={i} className="border-t border-slate-50">
                  <td className="py-2 text-slate-700">{r.majorName}</td>
                  <td className="py-2 text-right font-medium text-slate-900">{r.minScore}</td>
                  <td className="py-2 text-right">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${r.volunteerNum <= 3 ? 'bg-green-50 text-green-600' : r.volunteerNum <= 10 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                      {r.volunteerNum}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface AvailableBatch { year: number; batch: string; group: string }

export default function AdmissionAnalysisClient() {
  const [year, setYear] = useState(2025);
  const [batch, setBatch] = useState('');
  const [group, setGroup] = useState('物理类');
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState('');
  const [sort, setSort] = useState('score');
  const [tab, setTab] = useState<'overview' | 'university' | 'detail'>('overview');
  const [page, setPage] = useState(1);
  const [expandedUni, setExpandedUni] = useState<string | null>(null);

  const [stats, setStats] = useState<AdmissionStats | null>(null);
  const [universities, setUniversities] = useState<UniversityAdmissionSummary[]>([]);
  const [records, setRecords] = useState<AdmissionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [available, setAvailable] = useState<AvailableBatch[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (opts: Record<string, string | number>) => {
    setLoading(true);
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(opts)) {
      if (v !== '' && v !== 0) params.append(k, String(v));
    }
    try {
      const res = await fetch(`/api/admission?${params}`);
      const data = await res.json();
      setStats(data.stats || null);
      setUniversities(data.universities || []);
      setRecords(data.records || []);
      setTotal(data.total || 0);
      if (data.available?.length) {
        setAvailable(data.available);
      }
    } catch (e) {
      console.error('Failed to fetch admission data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 首次加载：获取可用批次并自动选中
  useEffect(() => {
    fetch(`/api/admission?province=hebei&year=${year}&group=${group}`)
      .then(r => r.json())
      .then(data => {
        if (data.available?.length) {
          setAvailable(data.available);
          const firstBatch = data.available.find((b: AvailableBatch) => b.year === year && b.group === group)?.batch;
          if (firstBatch) setBatch(firstBatch);
        }
      })
      .catch(console.error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 切换年份时，若当前批次在该年份不可用则自动切换
  useEffect(() => {
    const yearBatches = available.filter(b => b.year === year && b.group === group);
    if (yearBatches.length === 0) return;
    if (!yearBatches.some(b => b.batch === batch)) {
      setBatch(yearBatches[0].batch);
    }
  }, [year, available, group, batch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (batch) fetchData({ province: 'hebei', year, batch, group, view: 'university', page: 1 });
  }, [fetchData, year, batch, group]);

  const handleSearch = () => {
    setPage(1);
    const view = tab === 'detail' ? 'detail' : 'university';
    fetchData({ province: 'hebei', year, batch, group, keyword, type, sort, view, page: 1 });
  };

  const handleTabChange = (newTab: typeof tab) => {
    setTab(newTab);
    setPage(1);
    const view = newTab === 'detail' ? 'detail' : 'university';
    fetchData({ province: 'hebei', year, batch, group, keyword, type, sort, view, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    const view = tab === 'detail' ? 'detail' : 'university';
    fetchData({ province: 'hebei', year, batch, group, keyword, type, sort, view, page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const batches = [...new Set(available.filter(b => b.year === year).map(b => b.batch))];
  const groups = [...new Set(available.filter(b => b.year === year && (!batch || b.batch === batch)).map(b => b.group))];
  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">投档分析</h1>

      {/* 筛选栏 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">年份</label>
            <Toggle value={String(year)} onChange={(v) => { setYear(parseInt(v)); setBatch(''); }}
              options={[...new Set(available.map(b => b.year))].sort().map(y => ({ label: String(y), value: String(y) }))} />
          </div>
          {batches.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">批次</label>
              <Toggle value={batch || batches[0] || ''} onChange={(v) => setBatch(v)}
                options={batches.map(b => ({ label: b, value: b }))} />
            </div>
          )}
          {groups.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">科类</label>
              <Toggle value={group} onChange={setGroup}
                options={groups.map(g => ({ label: g, value: g }))} />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">计划类型</label>
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer">
              <option value="">全部</option>
              <option value="国家专项">国家专项</option>
              <option value="公费师范">公费师范</option>
              <option value="优师专项">优师专项</option>
              <option value="免费医学">免费医学定向</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">排序</label>
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer">
              <option value="score">分数降序</option>
              <option value="volunteer">志愿号升序</option>
              <option value="volunteer_desc">志愿号降序</option>
            </select>
          </div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex gap-2">
          <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索院校名称、专业名称或院校代码"
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400" />
          <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors">搜索</button>
        </form>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          { key: 'overview' as const, label: '总览' },
          { key: 'university' as const, label: '院校分析' },
          { key: 'detail' as const, label: '专业明细' },
        ].map((t) => (
          <button key={t.key} onClick={() => handleTabChange(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
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
                <StatCard label="院校数" value={stats.universities} />
                <StatCard label="专业数" value={stats.majors} />
                <StatCard label="分数区间" value={`${stats.scoreRange[0]} ~ ${stats.scoreRange[1]}`} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">志愿号分布（前20志愿）</h3>
                  <VolunteerChart dist={stats.volunteerDistribution} />
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">计划类型分布</h3>
                  <TypeChart dist={stats.typeDistribution} />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">志愿号关键指标</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  {[
                    { label: '第1志愿录取', range: [1, 1] },
                    { label: '前3志愿录取', range: [1, 3] },
                    { label: '前10志愿录取', range: [1, 10] },
                    { label: '前20志愿录取', range: [1, 20] },
                  ].map(({ label, range }) => {
                    const count = Object.entries(stats.volunteerDistribution)
                      .filter(([k]) => +k >= range[0] && +k <= range[1])
                      .reduce((s, [, v]) => s + v, 0);
                    const pct = (count / stats.totalRecords * 100).toFixed(1);
                    return (
                      <div key={label}>
                        <div className="text-2xl font-bold text-indigo-600">{pct}%</div>
                        <div className="text-xs text-slate-400 mt-1">{label}</div>
                        <div className="text-xs text-slate-500">{count} 条</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 院校分析 */}
          {tab === 'university' && (
            <div className="space-y-3">
              <div className="text-sm text-slate-400">共 {total} 所院校</div>
              {universities.map((uni) => (
                <UniversityCard key={uni.universityCode} uni={uni}
                  expanded={expandedUni === uni.universityCode}
                  onToggle={() => setExpandedUni(expandedUni === uni.universityCode ? null : uni.universityCode)} />
              ))}
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

          {/* 专业明细 */}
          {tab === 'detail' && (
            <div className="space-y-3">
              <div className="text-sm text-slate-400">共 {total} 条记录</div>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs text-slate-500">
                        <th className="text-left px-4 py-3 font-medium">院校</th>
                        <th className="text-left px-4 py-3 font-medium">专业</th>
                        <th className="text-right px-4 py-3 font-medium">投档分</th>
                        <th className="text-right px-4 py-3 font-medium">志愿号</th>
                        <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">语数之和</th>
                        <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">外语</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r, i) => (
                        <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2.5 text-slate-700 max-w-[200px] truncate">{r.universityName}</td>
                          <td className="px-4 py-2.5 text-slate-600">{r.majorName}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-900">{r.minScore}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${r.volunteerNum <= 3 ? 'bg-green-50 text-green-600' : r.volunteerNum <= 10 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                              {r.volunteerNum}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-slate-500 hidden lg:table-cell">{r.tiebreaker.langMathSum}</td>
                          <td className="px-4 py-2.5 text-right text-slate-500 hidden lg:table-cell">{r.tiebreaker.foreignLang}</td>
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
