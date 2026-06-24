'use client';

import { useState } from 'react';

interface ScoreInputFormProps {
  onSubmit: (score: number) => void;
  placeholder?: string;
}

export function ScoreInputForm({ onSubmit, placeholder = '输入分数' }: ScoreInputFormProps) {
  const [score, setScore] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numScore = parseInt(score);
    if (!isNaN(numScore) && numScore >= 0 && numScore <= 750) {
      onSubmit(numScore);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="number"
        value={score}
        onChange={(e) => setScore(e.target.value)}
        placeholder={placeholder}
        min="0"
        max="750"
        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400"
      />
      <button
        type="submit"
        className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
      >
        查询
      </button>
    </form>
  );
}
