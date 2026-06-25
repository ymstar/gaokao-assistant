'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { University } from '@/types/university';

// ============================================================
// Types
// ============================================================

interface PlanData {
  year: number; batch: string; entryCount: number; totalPlans: number;
  entries: Record<string, unknown>[];
}

interface LineData {
  year: number; batch: string; entryCount: number;
  entries: Record<string, unknown>[];
}

interface SchoolData {
  code: string;
  university: Partial<University> & Record<string, unknown>;
  plans: PlanData[];
  lines: LineData[];
}

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

function Toggle({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  if (options.length <= 1) return null;
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
// 主组件
// ============================================================

export default function SchoolDetailPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code;

  const [data, setData] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [planBatch, setPlanBatch] = useState('');
  const [lineYear, setLineYear] = useState('');

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    fetch(`/api/school/${code}?province=hebei`)
      .then(r => r.json())
      .then((d: SchoolData) => {
        setData(d);
        // 默认选中第一个有数据的批次
        if (d.plans.length > 0) setPlanBatch(d.plans[0].batch);
        if (d.lines.length > 0) setLineYear(String(d.lines[0].year));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center text-slate-400">加载中...</div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center text-slate-400">
        未找到该院校信息
        <br />
        <button onClick={() => router.back()} className="mt-4 text-indigo-600 hover:underline text-sm">← 返回</button>
      </div>
    );
  }

  const { university: uni, plans, lines } = data;

  // 当前选中的计划数据
  const activePlan = plans.find(p => p.batch === planBatch) || plans[0];
  // 当前选中的录取数据（按年份找）
  const activeLines = lines.filter(l => String(l.year) === lineYear);
  const lineBatches = [...new Set(lines.map(l => String(l.year)))];

  const planBatches = [...new Set(plans.map(p => p.batch))];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* 返回 */}
      <button onClick={() => router.back()}
        className="text-sm text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        返回
      </button>

      {/* 院校头部 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-start gap-4">
          <img
            src={`https://t1.chei.com.cn/common/xh/${uni.code || code}.jpg`}
            alt={String(uni.name || code)}
            className="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{String(uni.name || code)}</h1>
              {uni.tier && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">{String(uni.tier)}</span>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              {uni.location && <span>📍 {String(uni.location)}{uni.city ? ` · ${String(uni.city)}` : ''}</span>}
              {uni.authority && <span>🏛 {String(uni.authority)}</span>}
              {uni.level && <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 text-xs">{String(uni.level)}</span>}
              {uni.type && <span className="text-xs text-slate-400">{String(uni.type)}</span>}
            </div>
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
              {uni.chsiUrl && (
                <a href={String(uni.chsiUrl)} target="_blank" rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                  </svg>
                  阳光高考
                </a>
              )}
              {uni.phone && <span className="text-slate-400">📞 {String(uni.phone)}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* 招生计划 */}
      {plans.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">📊 2026 招生计划</h2>
          {planBatches.length > 1 && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">批次</label>
              <Toggle value={planBatch} onChange={setPlanBatch}
                options={planBatches.map(b => ({ label: b, value: b }))} />
            </div>
          )}
          {activePlan && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <StatCard label="专业条目" value={activePlan.entryCount} />
                <StatCard label="总计划数" value={activePlan.totalPlans} />
                <StatCard label="批次" value={activePlan.batch} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-500">
                      <th className="text-left px-4 py-3 font-medium">专业</th>
                      <th className="text-left px-4 py-3 font-medium hidden md:table-cell">备注</th>
                      <th className="text-right px-4 py-3 font-medium">计划数</th>
                      <th className="text-center px-4 py-3 font-medium hidden md:table-cell">学制</th>
                      <th className="text-right px-4 py-3 font-medium hidden md:table-cell">学费</th>
                      <th className="text-left px-4 py-3 font-medium">选科</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activePlan.entries as Record<string, unknown>[]).sort((a, b) => (b.planCount as number) - (a.planCount as number)).map((e, i) => (
                      <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-slate-700 max-w-[200px] truncate" title={String(e.majorName)}>
                          {String(e.majorName)}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 max-w-[150px] truncate hidden md:table-cell" title={String(e.majorNote || '')}>
                          {e.majorNote ? String(e.majorNote) : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-slate-900">{String(e.planCount)}</td>
                        <td className="px-4 py-2.5 text-center text-slate-500 hidden md:table-cell">{String(e.duration)}年</td>
                        <td className="px-4 py-2.5 text-right text-slate-500 hidden md:table-cell">
                          {Number(e.tuition) > 0 ? Number(e.tuition).toLocaleString() : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">{String(e.subjectRequirement || '-')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {/* 历年录取数据 */}
      {lines.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">📈 历年录取数据</h2>
          {lineBatches.length > 1 && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">年份</label>
              <Toggle value={lineYear} onChange={setLineYear}
                options={lineBatches.sort().map(y => ({ label: `${y}年`, value: y }))} />
            </div>
          )}
          {activeLines.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500">
                    <th className="text-left px-4 py-3 font-medium">专业组</th>
                    <th className="text-right px-4 py-3 font-medium">计划数</th>
                    <th className="text-right px-4 py-3 font-medium">最低分</th>
                    <th className="text-right px-4 py-3 font-medium">最低位次</th>
                    <th className="text-right px-4 py-3 font-medium hidden md:table-cell">平均分</th>
                  </tr>
                </thead>
                <tbody>
                  {activeLines.flatMap(l => (l.entries as Record<string, unknown>[]).sort((a, b) => (b.minScore as number) - (a.minScore as number)).map((e, i) => (
                    <tr key={`${l.year}-${i}`} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-700 max-w-[300px] truncate" title={String(e.majorGroup)}>
                        {String(e.majorGroup)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{String(e.planCount || 0)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-900">{String(e.minScore)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{Number(e.minRank).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500 hidden md:table-cell">{e.avgScore ? String(e.avgScore) : '-'}</td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* 无数据提示 */}
      {plans.length === 0 && lines.length === 0 && (
        <div className="text-center text-slate-400 py-12">
          该院校暂无招生计划或录取数据
        </div>
      )}
    </div>
  );
}
