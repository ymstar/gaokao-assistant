'use client';

import { ScoreRankData } from '@/types/score-rank';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ScoreDistributionChartProps {
  data: ScoreRankData[];
}

const yearColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

export function ScoreDistributionChart({ data }: ScoreDistributionChartProps) {
  const allScores = new Set<number>();
  data.forEach((d) => d.entries.forEach((e) => allScores.add(e.score)));
  const sortedScores = Array.from(allScores).sort((a, b) => b - a);

  const countMaps = data.map((d) => {
    const m = new Map<number, number>();
    d.entries.forEach((e) => m.set(e.score, e.count));
    return { year: d.year, map: m };
  });

  const chartData = sortedScores.map((score) => {
    const point: Record<string, string | number> = { score: String(score) };
    countMaps.forEach((cm) => {
      point[cm.year.toString()] = cm.map.get(score) ?? 0;
    });
    return point;
  });

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="score"
            interval={4}
            angle={-45}
            textAnchor="end"
            height={70}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            label={{ value: '分数', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 12 }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            label={{ value: '同分人数', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
            formatter={(value: number, name: string) => [value.toLocaleString(), `${name}年`]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {data.map((yearData, idx) => (
            <Bar
              key={yearData.year}
              dataKey={yearData.year.toString()}
              fill={yearColors[idx % yearColors.length]}
              name={`${yearData.year}`}
              barSize={2}
              radius={[1, 1, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
