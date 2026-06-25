'use client';

import { MessageCircle } from 'lucide-react';

const STARTER_QUESTIONS = [
  '我考了550分，能上什么学校？',
  '计算机和电子信息，选哪个好？',
  '文科生报什么专业就业好？',
  '华北电力大学录取情况怎么样？',
  '普通家庭孩子怎么选专业？',
];

interface StarterQuestionsProps {
  onSend: (text: string) => void;
}

export function StarterQuestions({ onSend }: StarterQuestionsProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-5">
        <MessageCircle className="w-7 h-7 text-indigo-500" />
      </div>
      <h2 className="text-xl font-semibold text-slate-900 mb-2">高考志愿 AI 咨询</h2>
      <p className="text-sm text-slate-500 mb-8 text-center max-w-md">
        张雪峰风格的智能问答，基于真实数据分析
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {STARTER_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onSend(q)}
            className="text-left px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 transition-all"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
