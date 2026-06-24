import { SubjectGroup } from './score-rank';

export type CityTier = '一线' | '新一线' | '二线' | '三线' | '四线' | '五线';

export interface AdmissionScoreEntry {
  year: number;
  batch: string;
  group: SubjectGroup;
  minScore: number;
  minRank: number;
  avgScore?: number;
  majorGroup?: string;
}

export interface University {
  code: string;
  schId?: string;             // 阳光高考平台学校ID
  name: string;
  nameShort?: string;
  location: string;           // 省份
  city?: string;              // 城市
  cityTier?: CityTier;        // 城市等级
  authority?: string;
  level?: string;             // 本科 / 高职(专科)
  tier?: string;              // 985 / 211 / 双一流 / ...
  type?: string;              // 综合 / 理工 / 师范 / ...
  tags?: string[];
  group?: SubjectGroup;
  admissionScores?: AdmissionScoreEntry[];
  planCount?: number;
  subjectRequirements?: string;
  address?: string;
  phone?: string;
  officialWebsite?: string;
  admissionWebsite?: string;
  chsiUrl?: string;
}

export interface UniversityListFilters {
  year?: number;
  group?: SubjectGroup;
  location?: string;
  city?: string;
  cityTier?: CityTier;
  tier?: string;
  type?: string;
  minScore?: number;
  maxScore?: number;
  keyword?: string;
  level?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}
