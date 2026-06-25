'use client';

import { Settings, Eye, EyeOff, X } from 'lucide-react';
import { useState } from 'react';
import {
  ProviderConfig,
  PROVIDER_PRESETS,
  saveProviderConfig,
  isConfigured,
} from '@/lib/ai/provider-config';

interface ProviderSettingsProps {
  config: ProviderConfig;
  onConfigChange: (config: ProviderConfig) => void;
  hydrated: boolean;
}

export function ProviderSettings({ config, onConfigChange, hydrated }: ProviderSettingsProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ProviderConfig>(config);
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    saveProviderConfig(draft);
    onConfigChange(draft);
    setOpen(false);
  };

  const handlePreset = (preset: typeof PROVIDER_PRESETS[0]) => {
    setDraft((prev) => ({
      ...prev,
      baseURL: preset.baseURL,
      model: preset.model,
      apiKey: preset.model === 'auto' ? '' : prev.apiKey,
    }));
  };

  const isFreeTier = draft.model === 'auto';

  return (
    <>
      <button
        onClick={() => { setDraft(config); setOpen(true); }}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <Settings className="w-4 h-4" />
        {hydrated ?
          (isConfigured(config) ? (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              已配置
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              未配置
            </span>
          ))
        : null}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">AI 模型设置</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 快捷预设 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">快捷配置</label>
              <div className="flex gap-2">
                {PROVIDER_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handlePreset(preset)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      draft.model === preset.model
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* API Key — 免费体验模式下隐藏 */}
            {!isFreeTier && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={draft.apiKey}
                  onChange={(e) => setDraft((prev) => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="sk-..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            )}

            {/* Base URL — 免费体验模式下隐藏 */}
            {!isFreeTier && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">API 地址</label>
              <input
                type="text"
                value={draft.baseURL}
                onChange={(e) => setDraft((prev) => ({ ...prev, baseURL: e.target.value }))}
                placeholder="https://api.deepseek.com/v1"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            )}

            {/* 模型名称 — 免费体验模式下只读 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">模型名称</label>
              <input
                type="text"
                value={draft.model}
                onChange={(e) => setDraft((prev) => ({ ...prev, model: e.target.value }))}
                placeholder="deepseek-chat"
                disabled={isFreeTier}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>

            <p className="text-xs text-slate-400">
              {isFreeTier
                ? '当前使用免费体验模型，无需额外配置，开箱即用。'
                : '你的 API 密钥仅存储在浏览器本地，不会发送到我们的服务器。'}
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
