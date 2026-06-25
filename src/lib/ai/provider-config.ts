export interface ProviderConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

const STORAGE_KEY = 'gaokao-ai-provider-config';

export const DEFAULT_CONFIG: ProviderConfig = {
  apiKey: '',
  baseURL: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
};

export const PROVIDER_PRESETS: { name: string; baseURL: string; model: string }[] = [
  { name: 'DeepSeek', baseURL: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { name: 'Moonshot', baseURL: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { name: 'OpenAI', baseURL: 'https://api.openai.com/v1', model: 'gpt-4o' },
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
  return config.apiKey.length > 0;
}
