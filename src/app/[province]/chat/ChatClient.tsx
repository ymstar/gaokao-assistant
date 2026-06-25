'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect, useRef } from 'react';
import { MessageSquare, AlertTriangle } from 'lucide-react';
import {
  ProviderConfig,
  DEFAULT_CONFIG,
  loadProviderConfig,
  isConfigured,
} from '@/lib/ai/provider-config';
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

  const { messages, sendMessage, stop, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/${province}/chat`,
      // body 函数通过 ref 读取最新配置，避免闭包陈旧问题
      body: () => ({ providerConfig: configRef.current }),
    }),
  });

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
