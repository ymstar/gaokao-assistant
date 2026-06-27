import type { VolunteerItem, VolunteerTable, VolunteerBatch } from '@/types/volunteer';
import { BATCH_CAPACITY, DEFAULT_BATCHES } from '@/types/volunteer';

const STORAGE_KEY = 'gaokao-volunteer-table';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function createEmptyBatch(batchName: string): VolunteerBatch {
  return {
    batchName,
    items: [],
    maxCapacity: BATCH_CAPACITY[batchName] || 96,
  };
}

function createEmptyTable(): VolunteerTable {
  const batches: Record<string, VolunteerBatch> = {};
  for (const batch of DEFAULT_BATCHES) {
    batches[batch] = createEmptyBatch(batch);
  }
  return { batches, lastUpdated: Date.now() };
}

export function loadVolunteerTable(): VolunteerTable {
  const storage = getStorage();
  if (!storage) return createEmptyTable();

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyTable();
    const parsed = JSON.parse(raw);
    const table = validateVolunteerTable(parsed);
    for (const batch of DEFAULT_BATCHES) {
      if (!table.batches[batch]) {
        table.batches[batch] = createEmptyBatch(batch);
      }
    }
    return table;
  } catch {
    return createEmptyTable();
  }
}

export function saveVolunteerTable(table: VolunteerTable): void {
  const storage = getStorage();
  if (!storage) return;
  table.lastUpdated = Date.now();
  storage.setItem(STORAGE_KEY, JSON.stringify(table));
}

export function addVolunteerItem(table: VolunteerTable, item: Omit<VolunteerItem, 'id' | 'sortOrder'>): VolunteerTable {
  const id = `${item.schoolId}-${item.specialId}-${item.batch}`;
  
  const batch = table.batches[item.batch];
  if (!batch) {
    table.batches[item.batch] = createEmptyBatch(item.batch);
  }

  const existingIndex = table.batches[item.batch].items.findIndex(i => i.id === id);
  if (existingIndex >= 0) {
    return table;
  }

  const newItem: VolunteerItem = {
    ...item,
    id,
    sortOrder: table.batches[item.batch].items.length + 1,
  };

  table.batches[item.batch].items.push(newItem);
  saveVolunteerTable(table);
  return table;
}

export function removeVolunteerItem(table: VolunteerTable, id: string, batchName: string): VolunteerTable {
  const batch = table.batches[batchName];
  if (!batch) return table;

  const index = batch.items.findIndex(i => i.id === id);
  if (index >= 0) {
    batch.items.splice(index, 1);
    batch.items.forEach((item, i) => {
      item.sortOrder = i + 1;
    });
    saveVolunteerTable(table);
  }

  return table;
}

export function reorderVolunteerItems(
  table: VolunteerTable,
  batchName: string,
  fromIndex: number,
  toIndex: number
): VolunteerTable {
  const batch = table.batches[batchName];
  if (!batch) return table;

  const items = batch.items;
  const [removed] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, removed);
  
  items.forEach((item, i) => {
    item.sortOrder = i + 1;
  });

  saveVolunteerTable(table);
  return table;
}

export function isItemInTable(table: VolunteerTable, schoolId: number, specialId: number, batch: string): boolean {
  const batchItems = table.batches[batch]?.items || [];
  return batchItems.some(i => i.schoolId === schoolId && i.specialId === specialId);
}

export function getTotalCount(table: VolunteerTable): number {
  return Object.values(table.batches).reduce((sum, batch) => sum + batch.items.length, 0);
}

export function clearVolunteerTable(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(STORAGE_KEY);
}

export function clearBatch(table: VolunteerTable, batchName: string): VolunteerTable {
  if (table.batches[batchName]) {
    table.batches[batchName] = createEmptyBatch(batchName);
    saveVolunteerTable(table);
  }
  return table;
}

function validateVolunteerTable(data: unknown): VolunteerTable {
  if (!data || typeof data !== 'object') return createEmptyTable();
  const d = data as Record<string, unknown>;
  
  const table: VolunteerTable = {
    batches: {},
    lastUpdated: typeof d.lastUpdated === 'number' ? d.lastUpdated : Date.now(),
  };

  if (typeof d.batches === 'object' && d.batches !== null) {
    for (const [batchName, batchData] of Object.entries(d.batches as Record<string, unknown>)) {
      if (typeof batchData === 'object' && batchData !== null) {
        const bd = batchData as Record<string, unknown>;
        const items: VolunteerItem[] = [];
        
        if (Array.isArray(bd.items)) {
          for (const item of bd.items) {
            if (typeof item === 'object' && item !== null) {
              const id = (item as Record<string, unknown>).id as string;
              const schoolId = (item as Record<string, unknown>).schoolId as number;
              const specialId = (item as Record<string, unknown>).specialId as number;
              
              if (typeof id === 'string' && typeof schoolId === 'number' && typeof specialId === 'number') {
                items.push(item as VolunteerItem);
              }
            }
          }
        }

        table.batches[batchName] = {
          batchName,
          items: items.sort((a, b) => a.sortOrder - b.sortOrder),
          maxCapacity: typeof bd.maxCapacity === 'number' ? bd.maxCapacity : (BATCH_CAPACITY[batchName] || 96),
        };
      }
    }
  }

  return table;
}