'use client';

import React, { useState, useRef, useEffect } from 'react';

interface FilterOptions {
  locations: string[];
  cities: Record<string, string[]>;
  tiers: string[];
  schoolTypes: string[];
  levels: string[];
  ownershipTypes: string[];
}

interface FilterValues {
  locations: string[];
  cities: string[];
  tiers: string[];
  schoolTypes: string[];
  levels: string[];
  ownershipTypes: string[];
}

interface MatchFilterPanelProps {
  options: FilterOptions;
  filters: FilterValues;
  onChange: (filters: FilterValues) => void;
}

const DEFAULT_SCHOOL_TYPES = ['综合', '理工', '农林', '医药', '语言', '财经', '政法', '体育', '艺术', '民族', '军事'];
const DEFAULT_OWNERSHIP_TYPES = ['公办', '民办', '中外合作'];
const DEFAULT_LEVELS = ['本科', '高职(专科)'];
const DEFAULT_TIERS = ['985', '211', '双一流'];
const ALL_PROVINCES = ['河北', '北京', '天津', '山西', '山东', '河南', '辽宁', '吉林', '黑龙江', '江苏', '浙江', '安徽', '福建', '江西', '湖北', '湖南', '广东', '海南', '四川', '重庆', '贵州', '云南', '陕西', '甘肃', '青海', '内蒙古', '广西', '西藏', '宁夏', '新疆'];

function DropdownButton({ label, count, isOpen, onClick }: { label: string; count?: number; isOpen: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm transition-all flex items-center gap-1.5 ${
        isOpen ? 'ring-2 ring-indigo-500 border-transparent' : ''
      } ${count ? 'text-indigo-600 font-medium' : 'text-slate-600'}`}
    >
      {label}
      {count && count > 0 && (
        <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-medium">
          {count}
        </span>
      )}
      <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
      </svg>
    </button>
  );
}

function MultiSelectDropdown({ title, options, selected, onSelect, isOpen, onClose }: {
  title: string;
  options: string[];
  selected: string[];
  onSelect: (item: string) => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={ref} className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl border border-slate-200 shadow-lg p-3 min-w-[200px]">
      <div className="text-xs font-medium text-slate-500 mb-2">{title}</div>
      <div className="flex flex-wrap gap-1.5 max-h-[240px] overflow-y-auto">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={`px-2.5 py-1.5 rounded-lg text-xs transition-all ${
              selected.includes(opt)
                ? 'bg-indigo-100 text-indigo-700 font-medium ring-1 ring-indigo-300'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-slate-100">
        {selected.length > 0 && (
          <button
            onClick={() => selected.forEach(s => onSelect(s))}
            className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700"
          >
            清空
          </button>
        )}
        <button
          onClick={onClose}
          className="px-3 py-1 text-xs text-indigo-600 font-medium hover:text-indigo-700"
        >
          确定
        </button>
      </div>
    </div>
  );
}

export default function MatchFilterPanel({ options, filters, onChange }: MatchFilterPanelProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const updateFilters = (patch: Partial<FilterValues>) => {
    onChange({ ...filters, ...patch });
  };

  const toggleItem = (key: keyof FilterValues, item: string) => {
    const current = filters[key];
    const newValues = current.includes(item)
      ? current.filter(v => v !== item)
      : [...current, item];
    updateFilters({ [key]: newValues });
  };

  const clearKey = (key: keyof FilterValues) => {
    updateFilters({ [key]: [] });
  };

  const handleDropdownClick = (key: string) => {
    setOpenDropdown(openDropdown === key ? null : key);
  };

  const closeDropdown = () => setOpenDropdown(null);

  const totalSelected = [
    ...filters.locations,
    ...filters.cities,
    ...filters.tiers,
    ...filters.schoolTypes,
    ...filters.levels,
    ...filters.ownershipTypes,
  ].length;

  const provinceCount = filters.locations.length + filters.cities.length;
  const tierCount = filters.tiers.length;
  const typeCount = filters.schoolTypes.length;
  const levelCount = filters.levels.length;
  const ownershipCount = filters.ownershipTypes.length;

  const availableProvinces = options.locations.length > 0 ? options.locations : ALL_PROVINCES;
  const availableTiers = options.tiers.length > 0 ? options.tiers : DEFAULT_TIERS;
  const availableTypes = options.schoolTypes.length > 0 ? options.schoolTypes : DEFAULT_SCHOOL_TYPES;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <DropdownButton
          label="院校位置"
          count={provinceCount}
          isOpen={openDropdown === 'location'}
          onClick={() => handleDropdownClick('location')}
        />
        {openDropdown === 'location' && (
          <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl border border-slate-200 shadow-lg p-4 w-[480px]">
            <div className="flex gap-4">
              <div className="w-32">
                <div className="text-xs font-medium text-slate-500 mb-2">省份</div>
                <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto pr-1">
                  {availableProvinces.map(prov => (
                    <button
                      key={prov}
                      onClick={() => {
                        toggleItem('locations', prov);
                        if (!filters.locations.includes(prov)) {
                          clearKey('cities');
                        }
                      }}
                      className={`text-left px-2 py-1.5 rounded-lg text-xs transition-all ${
                        filters.locations.includes(prov)
                          ? 'bg-indigo-100 text-indigo-700 font-medium'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {prov}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium text-slate-500 mb-2">城市</div>
                {filters.locations.length === 1 && options.cities[filters.locations[0]]?.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto">
                    {options.cities[filters.locations[0]].map(city => (
                      <button
                        key={city}
                        onClick={() => toggleItem('cities', city)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                          filters.cities.includes(city)
                            ? 'bg-indigo-100 text-indigo-700 font-medium'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 py-4 text-center">
                    {filters.locations.length === 0 ? '请先选择省份' : '选择单个省份后可筛选城市'}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-slate-100">
              {provinceCount > 0 && (
                <button
                  onClick={() => {
                    clearKey('locations');
                    clearKey('cities');
                  }}
                  className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700"
                >
                  清空
                </button>
              )}
              <button
                onClick={closeDropdown}
                className="px-3 py-1 text-xs text-indigo-600 font-medium hover:text-indigo-700"
              >
                确定
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <DropdownButton
          label="院校特色"
          count={tierCount}
          isOpen={openDropdown === 'tier'}
          onClick={() => handleDropdownClick('tier')}
        />
        <MultiSelectDropdown
          title="院校特色"
          options={availableTiers}
          selected={filters.tiers}
          onSelect={(item) => toggleItem('tiers', item)}
          isOpen={openDropdown === 'tier'}
          onClose={closeDropdown}
        />
      </div>

      <div className="relative">
        <DropdownButton
          label="办学性质"
          count={ownershipCount}
          isOpen={openDropdown === 'ownership'}
          onClick={() => handleDropdownClick('ownership')}
        />
        <MultiSelectDropdown
          title="办学性质"
          options={DEFAULT_OWNERSHIP_TYPES}
          selected={filters.ownershipTypes}
          onSelect={(item) => toggleItem('ownershipTypes', item)}
          isOpen={openDropdown === 'ownership'}
          onClose={closeDropdown}
        />
      </div>

      <div className="relative">
        <DropdownButton
          label="院校层次"
          count={levelCount}
          isOpen={openDropdown === 'level'}
          onClick={() => handleDropdownClick('level')}
        />
        <MultiSelectDropdown
          title="院校层次"
          options={options.levels.length > 0 ? options.levels : DEFAULT_LEVELS}
          selected={filters.levels}
          onSelect={(item) => toggleItem('levels', item)}
          isOpen={openDropdown === 'level'}
          onClose={closeDropdown}
        />
      </div>

      <div className="relative">
        <DropdownButton
          label="大学类型"
          count={typeCount}
          isOpen={openDropdown === 'type'}
          onClick={() => handleDropdownClick('type')}
        />
        <MultiSelectDropdown
          title="大学类型"
          options={availableTypes}
          selected={filters.schoolTypes}
          onSelect={(item) => toggleItem('schoolTypes', item)}
          isOpen={openDropdown === 'type'}
          onClose={closeDropdown}
        />
      </div>

      {totalSelected > 0 && (
        <button
          onClick={() => onChange({
            locations: [],
            cities: [],
            tiers: [],
            schoolTypes: [],
            levels: [],
            ownershipTypes: [],
          })}
          className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          清空筛选
        </button>
      )}
    </div>
  );
}

export type { FilterOptions, FilterValues };