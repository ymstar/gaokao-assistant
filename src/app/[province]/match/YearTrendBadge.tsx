import React from 'react';

/**
 * 年份间趋势方向指示标记
 *
 * 'up'   → ↑ 位次数值变小，排名上升，更难进
 * 'down' → ↓ 位次数值变大，排名下降，更容易进
 * 'stable' → → 排名稳定
 * 'new' → 新专业，无历史趋势
 */

const trendConfig = {
  up: { label: '↑', color: 'text-red-500', title: '排名上升，更难进' },
  down: { label: '↓', color: 'text-green-500', title: '排名下降，更容易进' },
  stable: { label: '→', color: 'text-slate-400', title: '基本稳定' },
  new: { label: '新', color: 'text-amber-500', title: '新专业' },
} as const;

export default function YearTrendBadge({ trend }: { trend: string }) {
  const config = trendConfig[trend as keyof typeof trendConfig] || trendConfig.stable;
  return (
    <span className={`text-sm font-bold ${config.color}`} title={config.title}>
      {config.label}
    </span>
  );
}
