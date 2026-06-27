'use client';

import { useState, useMemo, useEffect } from 'react';
import { SubjectGroup, ScoreRankData, ScoreRankSearchResult } from '@/types/score-rank';
import { EquivalentScoreResult } from '@/types/equivalent-score';
import { ScoreRankRow } from '@/types/score-rank-chart';
import { ScoreInputForm } from '@/components/score-rank/ScoreInputForm';
import { RankTable } from '@/components/score-rank/RankTable';
import { ScoreRankChart } from '@/components/charts/ScoreRankChart';
import { ScoreDistributionChart } from '@/components/charts/ScoreDistributionChart';
import { calculateEquivalentScore } from '@/lib/utils/equivalent-score';
import { useStudentContext } from '@/components/student/StudentInfoProvider';

// ============================================================
// Constants
// ============================================================

const SCORE_RANK_CUTOFF_YEAR = 2020;

// ============================================================
// Helpers
// ============================================================

function getGroupsForYear(year: number): { label: string; value: SubjectGroup }[] {
  if (year <= SCORE_RANK_CUTOFF_YEAR) {
    return [
      { label: '理科', value: '理科' },
      { label: '文科', value: '文科' },
    ];
  }
  return [
    { label: '物理类', value: '物理类' },
    { label: '历史类', value: '历史类' },
  ];
}

function defaultGroupForYear(year: number): SubjectGroup {
  return year <= SCORE_RANK_CUTOFF_YEAR ? '理科' : '物理类';
}

// ============================================================
// Toggle (inline shared component)
// ============================================================

function Toggle({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
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

// ============================================================
// Distribtution table with pagination
// ============================================================

const PAGE_SIZE = 50;

function ScoreDistributionTable({ rows }: { rows: ScoreRankRow[] }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const paginated = useMemo(
    () => rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [rows, page]
  );

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-500">
              <th className="px-4 py-2.5 font-medium">分数段</th>
              <th className="px-4 py-2.5 font-medium">本段人数</th>
              <th className="px-4 py-2.5 font-medium">累计人数</th>
              <th className="px-4 py-2.5 font-medium">位次区间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.map((r) => (
              <tr key={r.scoreDisplay} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2 font-medium text-slate-800">{r.scoreDisplay}</td>
                <td className="px-4 py-2 text-slate-600">{r.count.toLocaleString()}</td>
                <td className="px-4 py-2 text-slate-600">{r.cumulative.toLocaleString()}</td>
                <td className="px-4 py-2 text-slate-500 text-xs">
                  {r.rankStart === r.rankEnd
                    ? r.rankStart.toLocaleString()
                    : `${r.rankStart.toLocaleString()} ~ ${r.rankEnd.toLocaleString()}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            ← 上一页
          </button>
          <span className="text-sm text-slate-400">
            第 {page + 1} / {totalPages} 页
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="px-3 py-1.5 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            下一页 →
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Props
// ============================================================

interface ScoreRankClientProps {
  initialData?: ScoreRankData[];
  /** 图表用 DB 原始行（不展开聚合段），按科类分组 */
  chartRowsMap?: Record<string, { year: number; rows: ScoreRankRow[] }[]>;
}

// ============================================================
// Main component
// ============================================================

export default function ScoreRankClient({ initialData = [], chartRowsMap = {} }: ScoreRankClientProps) {
  // ---------- 分数查排名 state ----------
  const [year, setYear] = useState(2026);
  const [group, setGroup] = useState<SubjectGroup>(defaultGroupForYear(2026));
  const [result, setResult] = useState<ScoreRankSearchResult | null>(null);
  const [searchedScore, setSearchedScore] = useState<number | null>(null);
  const [distYears, setDistYears] = useState<Set<number>>(new Set([2026]));
  const [rankEqResult, setRankEqResult] = useState<EquivalentScoreResult | null>(null);

  // ---------- Derived data ----------
  const availableYears = useMemo<number[]>(() => {
    const years = [...new Set(initialData.map((d) => d.year))].sort((a, b) => b - a);
    return years.length > 0 ? years : [2026];
  }, [initialData]);

  // Switch year while keeping group compatible
  const handleYearChange = (newYear: number) => {
    setYear(newYear);
    const valid = getGroupsForYear(newYear).map((g) => g.value);
    if (!valid.includes(group)) setGroup(defaultGroupForYear(newYear));
    // 同分人数分布默认选中当前年份
    setDistYears(new Set([newYear]));
  };

  // ---------- 查排名 ----------
  const searchScoreByYearGroup = (score: number, targetYear: number, targetGroup: SubjectGroup) => {
    setSearchedScore(score);
    setRankEqResult(null);
    const yearData = initialData.find((d) => d.year === targetYear && d.group === targetGroup);
    if (!yearData) {
      setResult(null);
      return;
    }
    const entry = yearData.entries.find((e) => e.score === score);
    if (!entry) {
      setResult(null);
      return;
    }

    const rankEnd = entry.cumulative;
    const rankStart = entry.cumulative - entry.count + 1;

    setResult({
      score: entry.score,
      count: entry.count,
      rank: entry.cumulative,
      totalCandidates: yearData.totalCandidates,
      percentile: (entry.cumulative / yearData.totalCandidates) * 100,
    });

    // 计算等效分
    const equiv = calculateEquivalentScore(targetYear, targetGroup, score, rankStart, rankEnd, initialData);
    if (equiv.equivalents.length > 0) {
      setRankEqResult(equiv);
    }
  };

  const handleSearch = (score: number) => {
    searchScoreByYearGroup(score, year, group);
  };

  // ---------- Chart data ----------
  const yearData = useMemo(
    () => initialData.filter((d) => d.group === group),
    [initialData, group]
  );
  const { studentInfo } = useStudentContext();
  const studentMark = useMemo(() => {
    // 优先用用户查询的分数，其次用 LocalStorage 中存储的分数
    const score = searchedScore ?? studentInfo?.score;
    if (score == null) return null;
    return { score };
  }, [searchedScore, studentInfo]);

  // ---------- 根据 LocalStorage 考生信息自动初始化 ----------
  const [studentInitDone, setStudentInitDone] = useState(false);
  useEffect(() => {
    if (!studentInfo || studentInitDone) return;
    setStudentInitDone(true);
    // 用学生信息中的年份和科类初始化
    setYear(studentInfo.year);
    const valid = getGroupsForYear(studentInfo.year).map((g) => g.value);
    const targetGroup = valid.includes(studentInfo.subjectGroup)
      ? studentInfo.subjectGroup
      : defaultGroupForYear(studentInfo.year);
    setGroup(targetGroup);
    // 自动查询（直接用计算出的值，绕过 setState 异步问题）
    searchScoreByYearGroup(studentInfo.score, studentInfo.year, targetGroup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentInfo]);

  // ---------- Render ----------
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">一分一档</h1>

      {/* Query card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-4 sm:gap-6 mb-4 sm:mb-5">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">年份</label>
            <Toggle
              value={String(year)}
              onChange={(v) => handleYearChange(parseInt(v))}
              options={availableYears.map((y) => ({ label: String(y), value: String(y) }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">科类</label>
            <Toggle
              value={group}
              onChange={(v) => setGroup(v as SubjectGroup)}
              options={getGroupsForYear(year)}
            />
          </div>
        </div>
        <ScoreInputForm onSubmit={handleSearch} placeholder="输入分数查询排名" />
      </div>

      {/* Result card */}
      {result && <RankTable result={result} equivalentResult={rankEqResult} />}

      {/* Score count distribution chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">同分人数分布</h2>
          <div className="flex gap-1.5 flex-wrap">
            {yearData.map((d) => (
              <button
                key={d.year}
                type="button"
                onClick={() => {
                  setDistYears((prev) => {
                    const next = new Set(prev);
                    if (next.has(d.year)) {
                      if (next.size > 1) next.delete(d.year);
                    } else {
                      next.add(d.year);
                    }
                    return next;
                  });
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  distYears.has(d.year)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {d.year}
              </button>
            ))}
          </div>
        </div>
        {yearData.length > 0 ? (
          <ScoreDistributionChart
            chartRows={
              chartRowsMap[group]?.filter((cr) => distYears.has(cr.year)) ?? []
            }
            studentMark={studentMark}
          />
        ) : (
          <p className="text-sm text-slate-400 text-center py-12">暂无数据</p>
        )}
      </div>

      {/* Historical rank comparison chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">历年排名对比</h2>
        {yearData.length > 0 ? (
          <ScoreRankChart
            chartRows={chartRowsMap[group] ?? []}
            studentMark={studentMark}
          />
        ) : (
          <p className="text-sm text-slate-400 text-center py-12">暂无数据</p>
        )}
      </div>

      {/* Score rank data table */}
      {chartRowsMap[group] && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            {year} 年{group}一分一档表
          </h2>
          <ScoreDistributionTable
            rows={chartRowsMap[group].find((cr) => cr.year === year)?.rows ?? []}
          />
        </div>
      )}
    </div>
  );
}
