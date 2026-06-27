'use client';

import { useMemo } from 'react';
import { ScoreRankRow } from '@/types/score-rank-chart';
import { EquivalentScoreRef } from '@/types/score-rank';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

// ============================================================
// Props — 改用 ScoreRankRow（不展开聚合段）
// ============================================================

interface ScoreRankChartProps {
  /** 每个年份一条数据（rows 是 DB 原始行，不展开聚合段） */
  chartRows: { year: number; rows: ScoreRankRow[] }[];
  /** 考生分数标注（优先跟随用户查询，其次从 LocalStorage 读取） */
  studentMark?: { score: number } | null;
}

const yearColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

// ============================================================
// Helpers
// ============================================================

type ChartPayloadItem = {
  dataKey: string;
  value: number;
  name: string;
  color: string;
};

function rangeContains(range: string, score: number): boolean {
  if (!range.includes('-')) return parseInt(range) === score;
  const [lo, hi] = range.split('-').map(Number);
  return score >= lo && score <= hi;
}

// ============================================================
// Custom Tooltip
// ============================================================

function ScoreRankTooltipContent({
  active,
  label,
  payload,
  chartRows,
}: {
  active?: boolean;
  label?: string;
  payload?: ChartPayloadItem[];
  chartRows: { year: number; rows: ScoreRankRow[] }[];
}) {
  if (!active || !payload || !label) return null;

  const score = parseInt(label);

  const matches: { year: number; row: ScoreRankRow | undefined; color: string }[] = [];
  for (const cr of chartRows) {
    const row = cr.rows.find((r) => rangeContains(r.scoreDisplay, score));
    const idx = chartRows.indexOf(cr);
    matches.push({ year: cr.year, row, color: yearColors[idx % yearColors.length] });
  }

  const primaryMatch = matches.find((m) => m.row);
  const primaryRow = primaryMatch?.row;

  const display = primaryRow?.scoreDisplay;
  const isRange = display ? display.includes('-') : false;

  const controlScore = primaryRow?.controlScore;
  const batchName = primaryRow?.batchName;

  // 累积排名
  const rankItems = matches.filter((m) => m.row);

  // 等效分
  const primaryEquivalents = primaryRow?.equivalentScores;

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 shadow-xl p-4 min-w-[260px] max-w-[340px]">
      {/* 分数 */}
      <div className="mb-3">
        <div className="text-2xl font-bold text-slate-900">{score} 分</div>
        {isRange && (
          <div className="text-xs text-slate-400 mt-0.5">分数段：{display}</div>
        )}
      </div>

      {/* 批次线 */}
      {controlScore !== undefined && batchName && (
        <div className="mb-3 pb-3 border-b border-slate-100">
          <div className="text-xs text-slate-400 mb-1">批次线</div>
          <div className="text-sm font-medium text-amber-600">
            {batchName} {controlScore} 分
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {score >= controlScore ? '已上线' : `差 ${controlScore - score} 分上线`}
          </div>
        </div>
      )}

      {/* 累积排名 */}
      {rankItems.length > 0 && (
        <div className="mb-3 pb-3 border-b border-slate-100">
          <div className="text-xs text-slate-400 mb-1">累积排名</div>
          {rankItems.map((m) => (
            <div key={m.year} className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{m.year}年</span>
              <span className="font-medium" style={{ color: m.color }}>
                第 {m.row!.cumulative.toLocaleString()} 名
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 历史同位次等效分 */}
      {primaryEquivalents && primaryEquivalents.length > 0 && (
        <div>
          <div className="text-xs text-slate-400 mb-1">
            位次{' '}
            {primaryRow?.rankStart && primaryRow?.rankEnd
              ? primaryRow.rankStart === primaryRow.rankEnd
                ? `第 ${primaryRow.rankStart.toLocaleString()} 名`
                : `第 ${primaryRow.rankStart.toLocaleString()} ~ ${primaryRow.rankEnd.toLocaleString()} 名`
              : `第 ${primaryRow?.cumulative?.toLocaleString()} 名`}
            的历史等效分
          </div>
          {primaryEquivalents.map((eq: EquivalentScoreRef) => {
            const eqYearIdx = chartRows.findIndex((cr) => cr.year === eq.refYear);
            const color = yearColors[eqYearIdx >= 0 ? eqYearIdx % yearColors.length : 0];
            return (
              <div key={eq.refYear} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{eq.refYear}年</span>
                <span className="font-medium" style={{ color }}>
                  {eq.refScore} 分
                  <span className="text-xs text-slate-400 ml-1">
                    （位次{' '}
                    {eq.refRankStart === eq.refRankEnd
                      ? `第 ${eq.refRankStart.toLocaleString()}`
                      : `${eq.refRankStart.toLocaleString()} ~ ${eq.refRankEnd.toLocaleString()}`}{' '}
                    名）
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Chart
// ============================================================

export function ScoreRankChart({ chartRows, studentMark }: ScoreRankChartProps) {
  // 合并所有年份的 scoreDisplay → cumulative 映射
  const allLabels = new Set<string>();
  const rankMaps: { year: number; map: Map<string, number> }[] = [];

  for (const cr of chartRows) {
    const m = new Map<string, number>();
    for (const row of cr.rows) {
      m.set(row.scoreDisplay, row.cumulative);
      allLabels.add(row.scoreDisplay);
    }
    rankMaps.push({ year: cr.year, map: m });
  }

  const sortedLabels = Array.from(allLabels).sort((a, b) => {
    const scoreA = a.includes('-') ? parseInt(a.split('-')[1], 10) : parseInt(a, 10);
    const scoreB = b.includes('-') ? parseInt(b.split('-')[1], 10) : parseInt(b, 10);
    return scoreB - scoreA;
  });

  const chartData = useMemo(
    () =>
      sortedLabels.map((display) => {
        const point: Record<string, string | number> = { scoreDisplay: display };
        rankMaps.forEach((rm) => {
          point[rm.year.toString()] = rm.map.get(display) ?? 0;
        });
        return point;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chartRows]
  );

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 25, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="scoreDisplay"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            interval={4}
            angle={-45}
            textAnchor="end"
            height={70}
            label={{ value: '分数', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 12 }}
          />
          <YAxis
            domain={[1, 'auto']}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            label={{ value: '排名', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }}
          />
          <Tooltip
            content={<ScoreRankTooltipContent chartRows={chartRows} />}
            labelFormatter={(label) => {
              if (typeof label === 'string' && label.includes('-')) {
                return String(parseInt(label.split('-')[1], 10));
              }
              return String(label);
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {chartRows.map((cr, idx) => (
            <Line
              key={cr.year}
              type="monotone"
              dataKey={cr.year.toString()}
              stroke={yearColors[idx % yearColors.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              name={`${cr.year}`}
            />
          ))}
          {/* 考生分数标注 */}
          {studentMark && (() => {
            // 在所有年份的 rows 中查找包含该分数的段
            for (const cr of chartRows) {
              const display = cr.rows.find((r) => rangeContains(r.scoreDisplay, studentMark.score))?.scoreDisplay;
              if (display) {
                return (
                  <ReferenceLine
                    key="student-mark"
                    x={display}
                    stroke="#94a3b8"
                    strokeDasharray="5 5"
                    strokeWidth={1.5}
                    label={{
                      value: `我的分数 ${studentMark.score}`,
                      position: 'top',
                      fill: '#64748b',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                );
              }
            }
            return null;
          })()}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
