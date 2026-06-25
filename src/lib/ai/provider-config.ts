export interface ProviderConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

const STORAGE_KEY = 'gaokao-ai-provider-config';

export const DEFAULT_CONFIG: ProviderConfig = {
  apiKey: '',
  baseURL: '',
  model: 'auto',
};

export const PROVIDER_PRESETS: { name: string; baseURL: string; model: string }[] = [
  { name: '免费体验', baseURL: '', model: 'auto' },
  { name: 'DeepSeek', baseURL: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
];

export function loadProviderConfig(): ProviderConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveProviderConfig(config: ProviderConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function isConfigured(config: ProviderConfig): boolean {
  // 免费体验通道（model 为 auto）不需要用户配置 apiKey
  if (config.model === 'auto') return true;
  return config.apiKey.length > 0;
}
