'use client';

import { useStudentContext } from '@/components/student/StudentInfoProvider';
import { badgeText } from '@/components/student/StudentInfoModal';

export function StudentInfoBadge() {
  const { studentInfo, openModal } = useStudentContext();

  if (!studentInfo) {
    return (
      <button
        onClick={openModal}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
        填写考生信息
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
        {badgeText(studentInfo)}
      </span>
      <button
        onClick={openModal}
        className="p-1 text-slate-400 hover:text-slate-600 transition-colors rounded hover:bg-slate-100"
        title="修改考生信息"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
        </svg>
      </button>
    </div>
  );
}
