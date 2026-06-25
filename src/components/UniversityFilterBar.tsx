'use client';

import { useState, useCallback } from 'react';

export interface FilterOptions {
  locations: string[];
  cityTiers: string[];
  tiers: string[];
}

export interface FilterValues {
  keyword?: string;
  location?: string;
  level?: string;
  tier?: string;
  cityTier?: string;
  sort?: string;
}

interface UniversityFilterBarProps {
  filters: FilterValues;
  onChange: (filters: FilterValues) => void;
  options: FilterOptions;
  resultCount?: number;
  onReset?: () => void;
  showKeyword?: boolean;
  showSort?: boolean;
  showLocation?: boolean;
}

function Toggle({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <div className="inline-flex bg-slate-100 rounded-lg p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
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

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-100">
      {label}
      <button
        onClick={onRemove}
        className="w-3.5 h-3.5 inline-flex items-center justify-center rounded-full hover:bg-indigo-200 transition-colors"
      >
        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

const LEVEL_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '本科', value: '本科' },
  { label: '高职专科', value: '高职(专科)' },
];

const SORT_OPTIONS = [
  { label: '默认排序', value: '' },
  { label: '层次优先', value: 'tier_desc' },
  { label: '名称 A-Z', value: 'name_asc' },
];

export default function UniversityFilterBar({
  filters,
  onChange,
  options,
  resultCount,
  onReset,
  showKeyword = true,
  showSort = true,
  showLocation = true,
}: UniversityFilterBarProps) {
  const [keywordInput, setKeywordInput] = useState(filters.keyword || '');

  const update = useCallback(
    (patch: Partial<FilterValues>) => {
      onChange({ ...filters, ...patch });
    },
    [filters, onChange]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    update({ keyword: keywordInput || undefined });
  };

  const handleClearKeyword = () => {
    setKeywordInput('');
    update({ keyword: undefined });
  };

  // Build active chips
  const chips: { label: string; key: string; onClear: () => void }[] = [];
  if (filters.keyword) {
    chips.push({
      label: `"${filters.keyword}"`,
      key: 'keyword',
      onClear: () => { setKeywordInput(''); update({ keyword: undefined }); },
    });
  }
  if (filters.location) {
    chips.push({
      label: filters.location,
      key: 'location',
      onClear: () => update({ location: undefined }),
    });
  }
  if (filters.level && filters.level !== 'all') {
    chips.push({
      label: filters.level,
      key: 'level',
      onClear: () => update({ level: 'all' }),
    });
  }
  if (filters.tier) {
    chips.push({
      label: filters.tier,
      key: 'tier',
      onClear: () => update({ tier: undefined }),
    });
  }
  if (filters.cityTier) {
    chips.push({
      label: filters.cityTier + '城市',
      key: 'cityTier',
      onClear: () => update({ cityTier: undefined }),
    });
  }
  if (filters.sort) {
    const sortLabel = SORT_OPTIONS.find(o => o.value === filters.sort)?.label;
    if (sortLabel) {
      chips.push({
        label: sortLabel,
        key: 'sort',
        onClear: () => update({ sort: undefined }),
      });
    }
  }

  const hasActiveFilters = chips.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-3">
      {/* 关键词搜索 */}
      {showKeyword && (
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="搜索院校名称、代码或地区"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400"
            />
            {keywordInput && (
              <button
                type="button"
                onClick={handleClearKeyword}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-300 text-white flex items-center justify-center hover:bg-slate-400 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            搜索
          </button>
        </form>
      )}

      {/* 筛选器 */}
      <div className="flex flex-wrap items-end gap-3">
        {showLocation && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">地区</label>
            <select
              value={filters.location || ''}
              onChange={(e) => update({ location: e.target.value || undefined })}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer"
            >
              <option value="">全部地区</option>
              {options.locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">办学层次</label>
          <Toggle
            value={filters.level || 'all'}
            onChange={(v) => update({ level: v })}
            options={LEVEL_OPTIONS}
          />
        </div>

        {options.tiers.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">院校层次</label>
            <select
              value={filters.tier || ''}
              onChange={(e) => update({ tier: e.target.value || undefined })}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer"
            >
              <option value="">全部层次</option>
              {options.tiers.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

        {options.cityTiers.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">城市等级</label>
            <select
              value={filters.cityTier || ''}
              onChange={(e) => update({ cityTier: e.target.value || undefined })}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer"
            >
              <option value="">全部城市</option>
              {options.cityTiers.map((t) => (
                <option key={t} value={t}>{t}城市</option>
              ))}
            </select>
          </div>
        )}

        {showSort && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">排序</label>
            <select
              value={filters.sort || ''}
              onChange={(e) => update({ sort: e.target.value || undefined })}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 激活的筛选 chips + 结果计数 + 清除 */}
      {(hasActiveFilters || resultCount !== undefined) && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {chips.map((chip) => (
            <FilterChip key={chip.key} label={chip.label} onRemove={chip.onClear} />
          ))}
          {hasActiveFilters && onReset && (
            <button
              onClick={onReset}
              className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors"
            >
              清除全部
            </button>
          )}
          {resultCount !== undefined && (
            <span className="text-xs text-slate-400 ml-auto">
              共 {resultCount.toLocaleString()} 所院校
            </span>
          )}
        </div>
      )}
    </div>
  );
}
