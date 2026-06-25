'use client';

import { UIMessage } from 'ai';

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeContent = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="bg-slate-100 rounded-lg p-3 my-2 overflow-x-auto text-sm">
            <code>{codeContent.trim()}</code>
          </pre>
        );
        codeContent = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += line + '\n';
      continue;
    }

    if (line.trim() === '') {
      elements.push(<br key={`br-${i}`} />);
      continue;
    }

    // 列表项
    if (/^[-*]\s/.test(line)) {
      elements.push(
        <li key={`li-${i}`} className="ml-4 list-disc">
          {renderInline(line.replace(/^[-*]\s/, ''))}
        </li>
      );
      continue;
    }

    // 有序列表
    if (/^\d+\.\s/.test(line)) {
      elements.push(
        <li key={`oli-${i}`} className="ml-4 list-decimal">
          {renderInline(line.replace(/^\d+\.\s/, ''))}
        </li>
      );
      continue;
    }

    elements.push(
      <p key={`p-${i}`} className="mb-2 last:mb-0">
        {renderInline(line)}
      </p>
    );
  }

  return elements;
}

function renderInline(text: string): React.ReactNode {
  // 处理 **加粗**、`行内代码`
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // 加粗
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // 行内代码
    const codeMatch = remaining.match(/`(.+?)`/);

    let nextMatch: { index: number; length: number; type: 'bold' | 'code'; content: string } | null = null;

    if (boldMatch && boldMatch.index !== undefined) {
      nextMatch = { index: boldMatch.index, length: boldMatch[0].length, type: 'bold', content: boldMatch[1] };
    }
    if (codeMatch && codeMatch.index !== undefined) {
      if (!nextMatch || codeMatch.index < nextMatch.index) {
        nextMatch = { index: codeMatch.index, length: codeMatch[0].length, type: 'code', content: codeMatch[1] };
      }
    }

    if (!nextMatch) {
      parts.push(remaining);
      break;
    }

    if (nextMatch.index > 0) {
      parts.push(remaining.slice(0, nextMatch.index));
    }

    if (nextMatch.type === 'bold') {
      parts.push(<strong key={key++} className="font-semibold">{nextMatch.content}</strong>);
    } else {
      parts.push(
        <code key={key++} className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">
          {nextMatch.content}
        </code>
      );
    }

    remaining = remaining.slice(nextMatch.index + nextMatch.length);
  }

  return parts;
}

interface MessageBubbleProps {
  message: UIMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  // 提取文本内容
  const textContent = message.parts
    ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('') || '';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] px-4 py-3 ${
          isUser
            ? 'bg-indigo-600 text-white rounded-2xl rounded-br-md'
            : 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-md'
        }`}
      >
        <div className={isUser ? 'whitespace-pre-wrap' : 'chat-markdown'}>
          {isUser ? textContent : renderMarkdown(textContent)}
        </div>
      </div>
    </div>
  );
}
