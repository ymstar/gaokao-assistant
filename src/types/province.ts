import { SubjectGroup } from './score-rank';

export interface ProvinceConfig {
  code: string;
  name: string;
  nameShort: string;
  currentYear: number;
  examYears: number[];
  subjectGroups: SubjectGroup[];
  source: string;
  sourceUrl: string;
  dataAvailable: {
    scoreRank: boolean;
    universities: boolean;
    admissionLines: boolean;
    admissionPlans: boolean;
    baselines: boolean;
  };
}
