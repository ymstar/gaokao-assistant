'use client';

import React, { useState } from 'react';
import type { VolunteerTable, VolunteerItem } from '@/types/volunteer';
import { DEFAULT_BATCHES } from '@/types/volunteer';

interface VolunteerSidebarProps {
  table: VolunteerTable;
  onRemoveItem: (id: string, batchName: string) => void;
  onClearBatch: (batchName: string) => void;
  onClearAll: () => void;
}

const matchTypeBadge = {
  '冲': 'bg-red-100 text-red-600',
  '稳': 'bg-blue-100 text-blue-600',
  '保': 'bg-green-100 text-green-600',
} as const;

export default function VolunteerSidebar({ table, onRemoveItem, onClearBatch, onClearAll }: VolunteerSidebarProps) {
  const [activeBatch, setActiveBatch] = useState<string | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const totalCount = Object.values(table.batches).reduce((sum, batch) => sum + batch.items.length, 0);

  const batchStats = DEFAULT_BATCHES.map(batchName => {
    const batch = table.batches[batchName];
    return {
      batchName,
      count: batch?.items.length || 0,
      maxCapacity: batch?.maxCapacity || 96,
    };
  }).filter(s => s.count > 0);

  const getCurrentItems = (): VolunteerItem[] => {
    if (!activeBatch) {
      return [];
    }
    return table.batches[activeBatch]?.items || [];
  };

  const handleClearAll = () => {
    if (showConfirmClear) {
      onClearAll();
      setShowConfirmClear(false);
    } else {
      setShowConfirmClear(true);
    }
  };

  if (totalCount === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📋</span>
          <h3 className="font-semibold text-slate-900">志愿表</h3>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500">
            0
          </span>
        </div>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🎯</div>
          <div className="text-sm text-slate-500">暂无志愿</div>
          <div className="text-xs text-slate-400 mt-1">点击专业卡片的「加入志愿表」按钮添加</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden h-fit sticky top-20">
      <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-indigo-500 to-purple-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <h3 className="font-semibold text-white">志愿表</h3>
            <span className="px-2 py-0.5 rounded-full text-xs bg-white/20 text-white font-medium">
              {totalCount}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs text-white/80 hover:text-white transition-colors"
          >
            {showConfirmClear ? '确认清空？' : '清空'}
          </button>
        </div>
      </div>

      <div className="p-3 border-b border-slate-100">
        <div className="flex flex-wrap gap-1.5">
          {batchStats.map(stat => (
            <button
              key={stat.batchName}
              type="button"
              onClick={() => setActiveBatch(activeBatch === stat.batchName ? null : stat.batchName)}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                activeBatch === stat.batchName
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {stat.batchName}
              <span className="ml-1 opacity-75">{stat.count}/{stat.maxCapacity}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        {activeBatch ? (
          <div className="p-3 space-y-2">
            {getCurrentItems().map((item, index) => (
              <div
                key={item.id}
                className="group bg-slate-50 rounded-xl p-3 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-semibold text-slate-400 w-5 text-right">
                        {index + 1}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${matchTypeBadge[item.matchType]}`}>
                        {item.matchType}
                      </span>
                      <span className="text-xs font-medium text-slate-700 truncate">
                        {item.schoolName}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 truncate">
                      {item.majorName}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-400">
                      {item.tuition && item.tuition !== '0' && item.tuition !== 'null' && (
                        <span>💰 {parseInt(item.tuition).toLocaleString()}元</span>
                      )}
                      {item.duration && item.duration !== 'null' && item.duration !== 'undefined' && (
                        <span>⏱️ {item.duration}</span>
                      )}
                      {item.minScore2025 && (
                        <span>📊 2025最低{item.minScore2025}分</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id, item.batch)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => onClearBatch(activeBatch)}
              className="w-full py-2 text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              清空{activeBatch}
            </button>
          </div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-xs text-red-600">冲</div>
                <div className="text-xl font-bold text-red-600">
                  {Object.values(table.batches).reduce((sum, batch) => {
                    return sum + batch.items.filter(i => i.matchType === '冲').length;
                  }, 0)}
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-xs text-blue-600">稳</div>
                <div className="text-xl font-bold text-blue-600">
                  {Object.values(table.batches).reduce((sum, batch) => {
                    return sum + batch.items.filter(i => i.matchType === '稳').length;
                  }, 0)}
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-xs text-green-600">保</div>
                <div className="text-xl font-bold text-green-600">
                  {Object.values(table.batches).reduce((sum, batch) => {
                    return sum + batch.items.filter(i => i.matchType === '保').length;
                  }, 0)}
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="text-xs text-slate-400 font-medium">各批次志愿数</div>
              {batchStats.map(stat => (
                <div key={stat.batchName} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">{stat.batchName}</span>
                  <span className={`font-medium ${stat.count >= stat.maxCapacity ? 'text-red-500' : 'text-slate-800'}`}>
                    {stat.count} / {stat.maxCapacity}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-amber-50 rounded-lg">
              <div className="text-[11px] text-amber-700">
                💡 提示：本科批最多可填96个志愿，提前批A/C段最多6个志愿。点击上方批次标签查看详情。
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}