'use client';

import React, { useState } from 'react';
import type { MajorMatchDetail } from '@/types/match';
import type { SchoolMatchResult } from '@/types/match';
import YearTrendBadge from './YearTrendBadge';

interface VolunteerCardProps {
  schoolResult: SchoolMatchResult;
  majors: MajorMatchDetail[];
  batch: string;
  category: string;
  onAddToTable: (item: {
    schoolId: number;
    schoolName: string;
    schoolCode: string;
    specialId: number;
    majorName: string;
    majorCode: string;
    batch: string;
    category: string;
    tuition: string;
    duration: string;
    matchType: '冲' | '稳' | '保';
    subjectRequirements: string;
    zslxName: string;
    planCount: number;
    minScore2025?: number;
    minRank2025?: number;
    avgScore2025?: number;
  }) => void;
  isInTable: (schoolId: number, specialId: number, batch: string) => boolean;
}

const matchTypeStyles = {
  '冲': { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', badge: 'bg-red-100 text-red-700', glow: 'shadow-red-100' },
  '稳': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', glow: 'shadow-blue-100' },
  '保': { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', badge: 'bg-green-100 text-green-700', glow: 'shadow-green-100' },
} as const;

const confidenceLabels = {
  'high': { label: '数据充分', color: 'text-green-600' },
  'medium': { label: '较充分', color: 'text-amber-600' },
  'low': { label: '数据有限', color: 'text-slate-400' },
} as const;

export default function VolunteerCard({ schoolResult, majors, batch, category, onAddToTable, isInTable }: VolunteerCardProps) {
  const colors = matchTypeStyles[schoolResult.matchType];
  const conf = confidenceLabels[schoolResult.confidence];
  const [expanded, setExpanded] = useState(false);

  const hasPlanTrend = schoolResult.planTrend && schoolResult.planTrend !== 'flat';
  const trendSign = schoolResult.planTrend === 'up' ? '+' : schoolResult.planTrend === 'down' ? '' : '';
  const trendColor = schoolResult.planTrend === 'up' ? 'text-green-600' : schoolResult.planTrend === 'down' ? 'text-red-600' : '';

  const topSubjectReqs = schoolResult.subjectRequirementSummary.slice(0, 2);

  const handleAddMajor = (major: MajorMatchDetail) => {
    const history2025 = major.history.find(h => h.year === 2025);
    onAddToTable({
      schoolId: schoolResult.schoolId,
      schoolName: schoolResult.schoolName,
      schoolCode: String(schoolResult.schoolId),
      specialId: major.specialId,
      majorName: major.majorName,
      majorCode: '',
      batch,
      category,
      tuition: major.tuition,
      duration: major.duration,
      matchType: major.matchType,
      subjectRequirements: major.subjectRequirements,
      zslxName: major.zslxName,
      planCount: major.planCount,
      minScore2025: history2025?.minScore,
      minRank2025: history2025?.minRank,
      avgScore2025: history2025?.avgScore,
    });
  };

  const groupedMajors = majors.reduce((acc, m) => {
    if (!acc[m.matchType]) acc[m.matchType] = [];
    acc[m.matchType].push(m);
    return acc;
  }, { '冲': [] as MajorMatchDetail[], '稳': [] as MajorMatchDetail[], '保': [] as MajorMatchDetail[] });

  return (
    <div className={`bg-white rounded-xl border ${colors.border} overflow-hidden hover:shadow-md transition-all`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors.badge}`}>
                {schoolResult.matchType}
              </span>
              <h3 className="font-semibold text-slate-900 truncate">{schoolResult.schoolName}</h3>
              <span className="text-xs text-slate-400 shrink-0">{schoolResult.province}</span>
              {schoolResult.tier && (
                <span className="text-[11px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                  {schoolResult.tier}
                </span>
              )}
            </div>
            <div className="text-sm text-slate-500">
              院校代码 {schoolResult.schoolId} · {schoolResult.majorCount}个匹配专业
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={`text-[11px] ${conf.color}`}>{conf.label}</span>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
          <div className="bg-slate-50 rounded-lg p-2.5">
            <div className="text-[11px] text-slate-400">参考位次</div>
            <div className="font-semibold text-slate-800 text-sm">
              {schoolResult.schoolTargetRank > 0 ? schoolResult.schoolTargetRank.toLocaleString() : '-'}
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5">
            <div className="text-[11px] text-slate-400">你的位次</div>
            <div className="font-semibold text-slate-800 text-sm">
              {schoolResult.userRank.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5">
            <div className="text-[11px] text-slate-400">位次差</div>
            <div className={`font-semibold text-sm ${schoolResult.rankGap <= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {schoolResult.rankGap === 0 ? '-' : `${schoolResult.rankGap <= 0 ? '' : '+'}${schoolResult.rankGap.toLocaleString()}`}
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5">
            <div className="text-[11px] text-slate-400">2026计划</div>
            <div className="font-semibold text-slate-800 text-sm">
              {schoolResult.totalPlanCount2026.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5">
            <div className="text-[11px] text-slate-400">分差</div>
            <div className={`font-semibold text-sm ${schoolResult.scoreGap >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {schoolResult.scoreGap >= 0 ? '+' : ''}{schoolResult.scoreGap}
            </div>
          </div>
        </div>
      </button>

      <div className="px-4 pb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 border-b border-slate-100">
        {schoolResult.planChangeRatio !== null && (
          <span>
            📊 计划变化：
            <span className={`font-medium ${trendColor}`}>
              {schoolResult.planChangeRatio >= 0 ? '+' : ''}{(schoolResult.planChangeRatio * 100).toFixed(0)}%
            </span>
          </span>
        )}
        {Object.keys(schoolResult.level2Distribution).length > 0 && (
          <span>
            📚 {' '}
            {Object.entries(schoolResult.level2Distribution)
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
      </div>

      {expanded && majors.length > 0 && (
        <div className="border-t border-slate-100">
          {(['冲', '稳', '保'] as const).map(type => {
            const typeMajors = groupedMajors[type];
            if (typeMajors.length === 0) return null;
            const typeColors = matchTypeStyles[type];
            
            return (
              <div key={type} className={`border-b border-slate-50 last:border-b-0`}>
                <div className="px-4 py-2 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${typeColors.badge}`}>
                      {type}
                    </span>
                    <span className="text-xs text-slate-500">{typeMajors.length}个专业</span>
                  </div>
                </div>
                <div className="divide-y divide-slate-50">
                  {typeMajors.map((major) => {
                    const history2025 = major.history.find(h => h.year === 2025);
                    const history2024 = major.history.find(h => h.year === 2024);
                    const history2023 = major.history.find(h => h.year === 2023);
                    const isAdded = isInTable(schoolResult.schoolId, major.specialId, batch);
                    
                    return (
                      <div key={major.specialId} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-slate-900 truncate">{major.majorName}</span>
                            {major.zslxName && major.zslxName !== '普通类' && (
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">
                                {major.zslxName}
                              </span>
                            )}
                            {major.isNewMajor && major.weightedAvgRank > 0 && (
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">
                                💡预测
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span>计划 {major.planCount}人</span>
                            <span>学费 {major.tuition && major.tuition !== '0' && major.tuition !== 'null' ? `${parseInt(major.tuition).toLocaleString()}元` : '-'}
                              {major.duration && major.duration !== 'null' && major.duration !== 'undefined' ? `/${major.duration}` : ''}
                            </span>
                            {major.subjectRequirements && (
                              <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">
                                {major.subjectRequirements.replace(/首选|再选/g, '').trim()}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-1 hidden sm:block">
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            {history2025 && (
                              <div className="text-center bg-slate-50 rounded p-1.5">
                                <div className="text-slate-400">2025最低分</div>
                                <div className="font-semibold text-slate-800">{history2025.minScore}</div>
                                <div className="text-slate-400 text-[10px]">{history2025.minRank > 0 ? history2025.minRank.toLocaleString() : '-'}</div>
                              </div>
                            )}
                            {history2024 && (
                              <div className="text-center bg-slate-50 rounded p-1.5">
                                <div className="text-slate-400">2024最低分</div>
                                <div className="font-semibold text-slate-800">{history2024.minScore}</div>
                                <div className="text-slate-400 text-[10px]">{history2024.minRank > 0 ? history2024.minRank.toLocaleString() : '-'}</div>
                              </div>
                            )}
                            {history2023 && (
                              <div className="text-center bg-slate-50 rounded p-1.5">
                                <div className="text-slate-400">2023最低分</div>
                                <div className="font-semibold text-slate-800">{history2023.minScore}</div>
                                <div className="text-slate-400 text-[10px]">{history2023.minRank > 0 ? history2023.minRank.toLocaleString() : '-'}</div>
                              </div>
                            )}
                            {!history2025 && !history2024 && !history2023 && (
                              <div className="text-center bg-purple-50 rounded p-1.5 col-span-3">
                                <div className="text-purple-600">💡参考该校其他专业预测</div>
                                {major.weightedAvgRank > 0 && (
                                  <div className="text-xs text-purple-500 mt-1">预测位次: {major.weightedAvgRank.toLocaleString()}</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1">
                          <YearTrendBadge trend={major.trend} />
                          <button
                            type="button"
                            onClick={() => handleAddMajor(major)}
                            disabled={isAdded}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              isAdded
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800'
                            }`}
                          >
                            {isAdded ? '已加入' : '加入志愿表'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}