'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, AlertTriangle, Trash2 } from 'lucide-react';
import {
  ProviderConfig,
  DEFAULT_CONFIG,
  loadProviderConfig,
  isConfigured,
} from '@/lib/ai/provider-config';
import { loadMessages, saveMessages } from '@/lib/chat/storage';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { ProviderSettings } from '@/components/chat/ProviderSettings';

interface ChatClientProps {
  province: string;
}

export default function ChatClient({ province }: ChatClientProps) {
  const [providerConfig, setProviderConfig] = useState<ProviderConfig>(DEFAULT_CONFIG);
  const [hydrated, setHydrated] = useState(false);
  const configRef = useRef<ProviderConfig>(DEFAULT_CONFIG);

  // 持久化：加载历史消息
  const [initialMessages] = useState(() => loadMessages(province));

  useEffect(() => {
    const saved = loadProviderConfig();
    setProviderConfig(saved);
    configRef.current = saved;
    setHydrated(true);
  }, []);

  // 保持 ref 与 state 同步
  useEffect(() => {
    configRef.current = providerConfig;
  }, [providerConfig]);

  const configured = isConfigured(providerConfig);
  const showNotConfigured = hydrated && !configured;

  const { messages, sendMessage, stop, status, error, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/${province}/chat`,
      // body 函数通过 ref 读取最新配置，避免闭包陈旧问题
      body: () => ({ providerConfig: configRef.current }),
    }),
    messages: initialMessages,
  });

  // 持久化：每次 messages 变化时保存到 localStorage
  useEffect(() => {
    saveMessages(province, messages);
  }, [province, messages]);

  // 清空对话
  const handleClear = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  const handleSend = (text: string) => {
    if (!configured) return;
    sendMessage({ text });
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-500" />
          <h1 className="font-semibold text-slate-900">AI 志愿咨询</h1>
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="ml-2 flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
              title="清空对话"
            >
              <Trash2 className="w-3.5 h-3.5" />
              清空
            </button>
          )}
        </div>
        <ProviderSettings config={providerConfig} onConfigChange={setProviderConfig} hydrated={hydrated} />
      </div>

      {/* 未配置提示 */}
      {showNotConfigured && (
        <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm text-amber-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          请先点击右上角设置按钮配置 AI 模型
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border-b border-red-200 px-4 py-2.5 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error.message || '请求出错，请重试'}
        </div>
      )}

      {/* 消息列表 */}
      <MessageList
        messages={messages}
        status={status}
        onSendStarter={handleSend}
      />

      {/* 输入框 */}
      <ChatInput
        onSend={handleSend}
        onStop={stop}
        status={status}
      />
    </div>
  );
}
