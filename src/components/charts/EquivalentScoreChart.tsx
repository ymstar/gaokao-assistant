'use client';

import { EquivalentScoreResult } from '@/types/equivalent-score';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

interface EquivalentScoreChartProps {
  result: EquivalentScoreResult;
}

export function EquivalentScoreChart({ result }: EquivalentScoreChartProps) {
  const chartData = result.equivalents.map((eq) => ({
    year: `${eq.year}`,
    scoreRange: [eq.minScore, eq.maxScore] as [number, number],
  }));

  const avgMid = (result.averageScoreRange.min + result.averageScoreRange.max) / 2;

  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#94a3b8' }} />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12, fill: '#94a3b8' }} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
            formatter={(value) => {
              const [min, max] = value as [number, number];
              return [`${min} ~ ${max} 分`, '等效分区间'];
            }}
          />
          <Bar dataKey="scoreRange" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40}>
            {chartData.map((_, index) => (
              <Cell key={index} fillOpacity={0.6 + (index * 0.1)} />
            ))}
          </Bar>
          <ReferenceLine
            y={avgMid}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{ value: `均值 ${result.averageScoreRange.min}~${result.averageScoreRange.max}`, position: 'right', fontSize: 11, fill: '#f59e0b' }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
