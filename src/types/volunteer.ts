export interface VolunteerItem {
  id: string;
  schoolId: number;
  schoolName: string;
  schoolCode: string;
  specialId: number;
  majorName: string;
  majorCode: string;
  batch: string;
  category: string;
  tuition: string;
  duration: string;
  matchType: '冲' | '稳' | '保';
  subjectRequirements: string;
  zslxName: string;
  planCount: number;
  minScore2025?: number;
  minRank2025?: number;
  avgScore2025?: number;
  sortOrder: number;
}

export interface VolunteerBatch {
  batchName: string;
  items: VolunteerItem[];
  maxCapacity: number;
}

export interface VolunteerTable {
  batches: Record<string, VolunteerBatch>;
  lastUpdated: number;
}

export const BATCH_CAPACITY: Record<string, number> = {
  '本科批': 96,
  '本科提前批A段': 6,
  '本科提前批B段': 96,
  '本科提前批C段': 6,
  '专科批': 96,
  '专科提前批': 6,
};

export const DEFAULT_BATCHES = [
  '本科提前批A段',
  '本科提前批B段',
  '本科提前批C段',
  '本科批',
  '专科提前批',
  '专科批',
];