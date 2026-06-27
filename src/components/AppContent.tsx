'use client';

import { NavigationBar } from '@/components/NavigationBar';
import { StudentInfoProvider } from '@/components/student/StudentInfoProvider';
import { StudentInfoModal } from '@/components/student/StudentInfoModal';

export function AppContent({ children }: { children: React.ReactNode }) {
  return (
    <StudentInfoProvider>
      <NavigationBar />
      <StudentInfoModal />
      <main className="flex-1">{children}</main>
    </StudentInfoProvider>
  );
}
