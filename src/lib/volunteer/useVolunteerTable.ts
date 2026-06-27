'use client';

import { useState, useEffect, useCallback } from 'react';
import type { VolunteerTable, VolunteerItem } from '@/types/volunteer';
import {
  loadVolunteerTable,
  addVolunteerItem,
  removeVolunteerItem,
  reorderVolunteerItems,
  isItemInTable,
  clearVolunteerTable,
  clearBatch,
  getTotalCount,
} from './storage';

export function useVolunteerTable() {
  const [table, setTable] = useState<VolunteerTable>(() => loadVolunteerTable());

  useEffect(() => {
    const handleStorageChange = () => {
      setTable(loadVolunteerTable());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const addItem = useCallback((item: Omit<VolunteerItem, 'id' | 'sortOrder'>) => {
    setTable(prev => addVolunteerItem(prev, item));
  }, []);

  const removeItem = useCallback((id: string, batchName: string) => {
    setTable(prev => removeVolunteerItem(prev, id, batchName));
  }, []);

  const reorderItems = useCallback((batchName: string, fromIndex: number, toIndex: number) => {
    setTable(prev => reorderVolunteerItems(prev, batchName, fromIndex, toIndex));
  }, []);

  const checkItem = useCallback((schoolId: number, specialId: number, batch: string) => {
    return isItemInTable(table, schoolId, specialId, batch);
  }, [table]);

  const clearAll = useCallback(() => {
    clearVolunteerTable();
    setTable(loadVolunteerTable());
  }, []);

  const clearBatchItems = useCallback((batchName: string) => {
    setTable(prev => clearBatch(prev, batchName));
  }, []);

  const totalCount = getTotalCount(table);

  return {
    table,
    totalCount,
    addItem,
    removeItem,
    reorderItems,
    checkItem,
    clearAll,
    clearBatchItems,
  };
}