import { UIMessage } from 'ai';

const CHAT_STORAGE_PREFIX = 'gaokao-chat-messages';

function storageKey(province: string): string {
  return `${CHAT_STORAGE_PREFIX}-${province}`;
}

export function loadMessages(province: string): UIMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(province));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveMessages(province: string, messages: UIMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    // 只持久化 id 开头不是 "temp-" 的消息（过滤掉临时/中间状态的消息）
    const toPersist = messages.filter((m) => !m.id.startsWith('temp-'));
    if (toPersist.length === 0) {
      localStorage.removeItem(storageKey(province));
      return;
    }
    localStorage.setItem(storageKey(province), JSON.stringify(toPersist));
  } catch {
    // localStorage 满了或不可用，静默失败
  }
}

export function clearMessages(province: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(storageKey(province));
  } catch {
    // 静默失败
  }
}
