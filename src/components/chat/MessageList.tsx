'use client';

import { UIMessage } from 'ai';
import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { StarterQuestions } from './StarterQuestions';

interface MessageListProps {
  messages: UIMessage[];
  status: string;
  onSendStarter: (text: string) => void;
}

export function MessageList({ messages, status, onSendStarter }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  if (messages.length === 0) {
    return <StarterQuestions onSend={onSendStarter} />;
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {status === 'streaming' && (
        <div className="flex justify-start mb-4">
          <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" />
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
