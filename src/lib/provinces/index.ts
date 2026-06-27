import { ProvinceConfig } from '@/types/province';

export const provinces: ProvinceConfig[] = [
  {
    code: 'hebei',
    name: '河北省',
    nameShort: '河北',
    currentYear: 2026,
    examYears: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    subjectGroups: ['物理类', '历史类', '理科', '文科'],
    source: '河北省教育考试院',
    sourceUrl: 'https://gk.hebeea.edu.cn/',
    dataAvailable: {
      scoreRank: true,
      universities: true,
      admissionLines: true,
      admissionPlans: false,
      baselines: true,
    },
  },
];

export function getProvince(code: string): ProvinceConfig | undefined {
  return provinces.find((p) => p.code === code);
}

export function getAllProvinces(): ProvinceConfig[] {
  return provinces;
}
