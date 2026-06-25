import { SubjectGroup } from './score-rank';

/** 特殊类型招生录取控制分数线（强基线），适用于强基计划、高校专项计划等 */
export interface ProvinceBaselineEntry {
  year: number;
  group: SubjectGroup;
  /** 强基线分数 */
  score: number;
  /** 说明 */
  note?: string;
}

export interface ProvinceBaselineData {
  province: string;
  description: string;
  entries: ProvinceBaselineEntry[];
}
