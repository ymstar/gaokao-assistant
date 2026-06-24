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
} from 'recharts';

interface EquivalentScoreChartProps {
  result: EquivalentScoreResult;
}

export function EquivalentScoreChart({ result }: EquivalentScoreChartProps) {
  const chartData = result.equivalents.map((eq) => ({
    year: `${eq.year}`,
    score: eq.score,
  }));

  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#94a3b8' }} />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12, fill: '#94a3b8' }} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
            formatter={(value) => [`${value} 分`, '等效分']}
          />
          <Bar dataKey="score" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
          <ReferenceLine
            y={result.averageScore}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{ value: `均值 ${result.averageScore}`, position: 'right', fontSize: 12, fill: '#f59e0b' }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
