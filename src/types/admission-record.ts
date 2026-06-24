/** 投档记录 */
export interface AdmissionRecord {
  universityCode: string;
  universityName: string;
  majorCode: string;
  majorName: string;
  minScore: number;
  volunteerNum: number;
  tiebreaker: {
    langMathSum: number;
    langMathMax: number;
    foreignLang: number;
    firstSubject: number;
    secondMax: number;
    secondSecond: number;
  };
  remark?: string;
}

/** 批次投档数据文件 */
export interface AdmissionBatchData {
  year: number;
  province: string;
  batch: string;
  group: string;
  records: AdmissionRecord[];
}

/** 院校投档汇总 */
export interface UniversityAdmissionSummary {
  universityCode: string;
  universityName: string;
  majorCount: number;
  minScore: number;
  maxScore: number;
  avgVolunteerNum: number;
  records: AdmissionRecord[];
}

/** 投档统计 */
export interface AdmissionStats {
  totalRecords: number;
  universities: number;
  majors: number;
  scoreRange: [number, number];
  volunteerDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
}
