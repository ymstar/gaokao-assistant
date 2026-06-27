/** 首选科目 */
export type SubjectGroup = '物理类' | '历史类';

/** 再选科目 */
export type ResitSubject = '化学' | '生物' | '政治' | '地理';

/** 全局考生信息 */
export interface StudentInfo {
  /** 省份代码，如 'hebei' */
  province: string;
  /** 首选科目 */
  subjectGroup: SubjectGroup;
  /** 再选科目（四选二） */
  resitSubjects: [ResitSubject, ResitSubject];
  /** 高考分数 */
  score: number;
  /** 位次（根据一分一档自动计算） */
  rank: number;
  /** 位次所用年份 */
  year: number;
  /** 该年该科类总考生数 */
  totalCandidates: number;
}
