'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { StudentInfo } from '@/types/student';
import { loadStudentInfo, saveStudentInfo } from '@/lib/student/storage';

export interface StudentContextValue {
  studentInfo: StudentInfo | null;
  /** 主动打开弹窗（编辑或新增） */
  openModal: () => void;
  /** 弹窗是否打开 */
  isModalOpen: boolean;
  /** 提供给 Modal 关闭弹窗 */
  closeModal: () => void;
  /** 保存考生信息并关闭弹窗 */
  saveAndClose: (info: StudentInfo) => void;
}

export const StudentContext = createContext<StudentContextValue | null>(null);

export function useStudentContext(): StudentContextValue {
  const ctx = useContext(StudentContext);
  if (!ctx) {
    throw new Error('useStudentContext must be used within StudentInfoProvider');
  }
  return ctx;
}

export function StudentInfoProvider({ children }: { children: ReactNode }) {
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 初始化：从 localStorage 加载
  useEffect(() => {
    const stored = loadStudentInfo();
    if (stored) {
      setStudentInfo(stored);
    } else {
      setIsModalOpen(true);
    }
    setMounted(true);
  }, []);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const saveAndClose = useCallback((info: StudentInfo) => {
    saveStudentInfo(info);
    setStudentInfo(info);
    setIsModalOpen(false);
  }, []);

  return (
    <StudentContext.Provider value={mounted ? { studentInfo, openModal, isModalOpen, closeModal, saveAndClose } : { studentInfo: null, openModal: () => {}, isModalOpen: false, closeModal: () => {}, saveAndClose: () => {} }}>
      {children}
    </StudentContext.Provider>
  );
}
