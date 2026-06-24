'use client';

import { ScoreRankData } from '@/types/score-rank';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ScoreRankChartProps {
  data: ScoreRankData[];
  highlightedScore?: number;
}

const yearColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

export function ScoreRankChart({ data, highlightedScore }: ScoreRankChartProps) {
  const scoreMaps = data.map((yearData) => {
    const map = new Map<number, number>();
    yearData.entries.forEach((e) => map.set(e.score, e.cumulative));
    return { year: yearData.year, map };
  });

  const allScores = new Set<number>();
  scoreMaps.forEach((sm) => sm.map.forEach((_, score) => allScores.add(score)));
  const sortedScores = Array.from(allScores).sort((a, b) => b - a);

  const chartData = sortedScores.map((score) => {
    const point: { score: number; [key: string]: number } = { score };
    scoreMaps.forEach((sm) => {
      const cum = sm.map.get(score);
      if (cum !== undefined) point[sm.year.toString()] = cum;
    });
    return point;
  });

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="score"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            label={{ value: '分数', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 12 }}
          />
          <YAxis
            domain={[1, 'auto']}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            label={{ value: '排名', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
            formatter={(value: number, name: string) => [value.toLocaleString(), `${name}年`]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {data.map((yearData, idx) => (
            <Line
              key={yearData.year}
              type="monotone"
              dataKey={yearData.year.toString()}
              stroke={yearColors[idx % yearColors.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              name={`${yearData.year}`}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
