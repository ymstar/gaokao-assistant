'use client';

import React, { useState } from 'react';
import type { SchoolMatchResult } from '@/types/match';
import MajorDetailTable from './MajorDetailTable';
import YearTrendBadge from './YearTrendBadge';

const matchTypeColors = {
  '冲': { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', badge: 'bg-red-100 text-red-700' },
  '稳': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  '保': { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
} as const;

const confidenceLabels = {
  'high': { label: '数据充分', color: 'text-green-600' },
  'medium': { label: '较充分', color: 'text-amber-600' },
  'low': { label: '数据有限', color: 'text-slate-400' },
} as const;

const riskLabels = {
  'low': { bg: 'bg-green-50', text: 'text-green-600', label: '低风险' },
  'medium': { bg: 'bg-amber-50', text: 'text-amber-600', label: '中风险' },
  'high': { bg: 'bg-red-50', text: 'text-red-600', label: '高风险' },
} as const;

export default function MatchCard({ result }: { result: SchoolMatchResult }) {
  const colors = matchTypeColors[result.matchType];
  const conf = confidenceLabels[result.confidence];
  const riskInfo = result.riskFactor ? riskLabels[result.riskFactor] : null;
  const [expanded, setExpanded] = useState(false);

  const hasPlanTrend = result.planTrend && result.planTrend !== 'flat';
  const trendSign = result.planTrend === 'up' ? '+' : result.planTrend === 'down' ? '' : '';
  const trendColor = result.planTrend === 'up' ? 'text-green-600' : result.planTrend === 'down' ? 'text-red-600' : '';

  // 主要选科要求 badges
  const topSubjectReqs = result.subjectRequirementSummary.slice(0, 2);

  return (
    <div className={`bg-white rounded-xl border ${colors.border} overflow-hidden hover:shadow-md transition-all`}>
      {/* Zone 1: Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors.badge}`}>
                {result.matchType}
              </span>
              <h3 className="font-semibold text-slate-900 truncate">{result.schoolName}</h3>
              <span className="text-xs text-slate-400 shrink-0">{result.province}</span>
            </div>
            <div className="text-sm text-slate-500">
              {result.majorCount}个匹配专业 · 最优：{result.bestMajor}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] ${conf.color}`}>{conf.label}</span>
              {riskInfo && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded ${riskInfo.bg} ${riskInfo.text}`}>
                  {riskInfo.label}
                </span>
              )}
            </div>
            {result.tier && (
              <span className="text-[11px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                {result.tier}
              </span>
            )}
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>

        {/* Zone 2: Key Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
          <div className="bg-slate-50 rounded-lg p-2.5">
            <div className="text-[11px] text-slate-400">院校参考位次</div>
            <div className="font-semibold text-slate-800 text-sm">
              {result.schoolTargetRank > 0 ? result.schoolTargetRank.toLocaleString() : '新专业'}
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5">
            <div className="text-[11px] text-slate-400">你的位次</div>
            <div className="font-semibold text-slate-800 text-sm">
              {result.userRank.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5">
            <div className="text-[11px] text-slate-400">位次差</div>
            <div className={`font-semibold text-sm ${result.rankGap <= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {result.rankGap === 0 ? '-' : `${result.rankGap <= 0 ? '' : '+'}${result.rankGap.toLocaleString()}`}
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5">
            <div className="text-[11px] text-slate-400">2026总计划</div>
            <div className="font-semibold text-slate-800 text-sm">
              {result.totalPlanCount2026.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5">
            <div className="text-[11px] text-slate-400">分差</div>
            <div className={`font-semibold text-sm ${result.scoreGap >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {result.scoreGap >= 0 ? '+' : ''}{result.scoreGap}
            </div>
          </div>
        </div>
      </button>

      {/* Zone 3: Plan Summary Bar */}
      <div className="px-4 pb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 border-b border-slate-100">
        {result.planChangeRatio !== null && (
          <span>
            📊 计划变化：
            <span className={`font-medium ${trendColor}`}>
              {result.planChangeRatio >= 0 ? '+' : ''}{(result.planChangeRatio * 100).toFixed(0)}%
            </span>
          </span>
        )}
        {Object.keys(result.level2Distribution).length > 0 && (
          <span>
            📚 {' '}
            {Object.entries(result.level2Distribution)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 4)
              .map(([k, v]) => `${k}(${v})`)
              .join(' ')}
          </span>
        )}
        {topSubjectReqs.length > 0 && (
          <span className="flex items-center gap-1">
            🎯 {topSubjectReqs.map((req, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[11px] font-medium">
                {req.replace('首选', '').replace(/，再选/g, '/').trim()}
              </span>
            ))}
          </span>
        )}
        {Object.keys(result.zslxDistribution).length > 1 && (
          <span className="text-slate-400">
            {Object.entries(result.zslxDistribution)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([k, v]) => `${k}(${v})`)
              .join(' ')}
          </span>
        )}
      </div>

      {/* Zone 4: Expandable Major Detail Table */}
      {expanded && result.majors.length > 0 && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          <MajorDetailTable majors={result.majors} />
        </div>
      )}
    </div>
  );
}
