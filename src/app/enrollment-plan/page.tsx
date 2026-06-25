'use client';

import { Suspense } from 'react';
import EnrollmentPlanClient from './EnrollmentPlanClient';

export default function EnrollmentPlanPage() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto px-4 py-12 text-center text-slate-400">加载中...</div>
    }>
      <EnrollmentPlanClient />
    </Suspense>
  );
}
