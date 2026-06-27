'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { useStudentContext } from '@/components/student/StudentInfoProvider';
import { StudentInfo, SubjectGroup, ResitSubject } from '@/types/student';
import { provinces } from '@/lib/provinces';

const RESIT_OPTIONS: ResitSubject[] = ['化学', '生物', '政治', '地理'];
const SUBJECT_GROUPS: SubjectGroup[] = ['物理类', '历史类'];

interface RankResult {
  rank: number;
  year: number;
  totalCandidates: number;
  score: number;
  count: number;
  percentile: number;
}

/** 科目简称映射 */
function shortName(s: string): string {
  return s.replace('类', '');
}

/** 生成 badge 文本 */
function badgeText(info: StudentInfo): string {
  const g = shortName(info.subjectGroup);
  const r1 = info.resitSubjects[0];
  const r2 = info.resitSubjects[1];
  return `${g}${r1}${r2} | ${info.score}分`;
}

export { badgeText };

export function getProvinceCode(): string {
  if (typeof window === 'undefined') return 'hebei';
  const segment = window.location.pathname.split('/')[1] || '';
  const provinceCodes = new Set(provinces.map(p => p.code));
  return provinceCodes.has(segment) ? segment : (provinces[0]?.code || 'hebei');
}

export function StudentInfoModal() {
  const { studentInfo, isModalOpen, closeModal, saveAndClose } = useStudentContext();
  const pathname = usePathname();

  // 省份
  const province = getProvinceCode();

  // 表单 state
  const [subjectGroup, setSubjectGroup] = useState<SubjectGroup>('物理类');
  const [resitSubjects, setResitSubjects] = useState<ResitSubject[]>([]);
  const [score, setScore] = useState('');
  const [rankResult, setRankResult] = useState<RankResult | null>(null);
  const [rankLoading, setRankLoading] = useState(false);
  const [rankError, setRankError] = useState('');

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 弹窗打开时预填充
  useEffect(() => {
    if (isModalOpen) {
      if (studentInfo) {
        setSubjectGroup(studentInfo.subjectGroup);
        setResitSubjects([...studentInfo.resitSubjects]);
        setScore(String(studentInfo.score));
        setRankResult({
          rank: studentInfo.rank,
          year: studentInfo.year,
          totalCandidates: studentInfo.totalCandidates,
          score: studentInfo.score,
          count: 0,
          percentile: 0,
        });
        setRankError('');
      } else {
        // 重置表单
        setSubjectGroup('物理类');
        setResitSubjects([]);
        setScore('');
        setRankResult(null);
        setRankError('');
      }
    }
  }, [isModalOpen, studentInfo]);

  // 位次查询
  const fetchRank = useCallback(
    async (scoreVal: number, group: SubjectGroup) => {
      if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > 750) {
        setRankResult(null);
        setRankError('');
        return;
      }

      setRankLoading(true);
      setRankError('');

      try {
        const res = await fetch(
          `/api/${province}/student-info/rank?group=${encodeURIComponent(group)}&score=${scoreVal}`
        );
        const data = await res.json();

        if (!res.ok) {
          setRankError(data.error || '查询失败');
          setRankResult(null);
        } else {
          setRankResult(data);
          setRankError('');
        }
      } catch {
        setRankError('网络请求失败，请稍后重试');
        setRankResult(null);
      } finally {
        setRankLoading(false);
      }
    },
    [province]
  );

  // 分数变化 debounce
  useEffect(() => {
    const scoreVal = parseInt(score);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (isNaN(scoreVal)) {
      setRankResult(null);
      setRankError('');
      return;
    }

    debounceTimer.current = setTimeout(() => {
      fetchRank(scoreVal, subjectGroup);
    }, 500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [score, subjectGroup, fetchRank]);

  // 再选科目切换
  const toggleResit = (s: ResitSubject) => {
    setResitSubjects(prev => {
      if (prev.includes(s)) {
        return prev.filter(x => x !== s);
      }
      if (prev.length >= 2) return prev;
      return [...prev, s];
    });
  };

  const canSubmit =
    subjectGroup &&
    resitSubjects.length === 2 &&
    score !== '' &&
    !isNaN(parseInt(score)) &&
    parseInt(score) >= 0 &&
    parseInt(score) <= 750 &&
    rankResult !== null &&
    !rankLoading;

  const handleSubmit = () => {
    if (!canSubmit || !rankResult) return;
    const info: StudentInfo = {
      province,
      subjectGroup,
      resitSubjects: [resitSubjects[0], resitSubjects[1]],
      score: parseInt(score),
      rank: rankResult.rank,
      year: rankResult.year,
      totalCandidates: rankResult.totalCandidates,
    };
    saveAndClose(info);
  };

  return (
    <Modal
      isOpen={isModalOpen}
      onClose={studentInfo ? closeModal : () => {}} // 首次填写不可关闭
      title={studentInfo ? '修改考生信息' : '填写考生信息'}
      dismissable={!!studentInfo}
    >
      <div className="space-y-5 pt-2">
        {/* 首选科目 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">首选科目</label>
          <div className="grid grid-cols-2 gap-3">
            {SUBJECT_GROUPS.map(g => (
              <button
                key={g}
                type="button"
                onClick={() => setSubjectGroup(g)}
                className={`py-3 px-4 rounded-xl text-base font-medium border-2 transition-all ${
                  subjectGroup === g
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* 再选科目（四选二） */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            再选科目
            <span className="text-slate-400 font-normal ml-1">
              （{resitSubjects.length}/2）
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {RESIT_OPTIONS.map(s => {
              const isSelected = resitSubjects.includes(s);
              const isDisabled = !isSelected && resitSubjects.length >= 2;

              return (
                <button
                  key={s}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => toggleResit(s)}
                  className={`py-2.5 px-4 rounded-xl text-base font-medium border-2 transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                      : isDisabled
                        ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* 高考分数 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">高考分数</label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={750}
            value={score}
            onChange={e => setScore(e.target.value)}
            placeholder="请输入 0-750 之间的分数"
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-base focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>

        {/* 位次显示 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            我的位次
            <span className="text-slate-400 font-normal ml-1">（自动计算）</span>
          </label>

          {rankLoading && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-500">正在查询位次…</span>
            </div>
          )}

          {!rankLoading && rankError && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              {rankError}
            </div>
          )}

          {!rankLoading && !rankError && rankResult && (
            <div className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-slate-900">
                  第 {rankResult.rank.toLocaleString()} 名
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {rankResult.year}年 {subjectGroup} · 共 {rankResult.totalCandidates.toLocaleString()} 人
                </div>
              </div>
              <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
          )}

          {!rankLoading && !rankError && !rankResult && (
            <div className="px-4 py-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-sm text-slate-400 text-center">
              输入分数后自动显示
            </div>
          )}
        </div>

        {/* 确认按钮 */}
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className={`w-full py-3 rounded-xl text-base font-semibold transition-all ${
            canSubmit
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm active:scale-[0.98]'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {studentInfo ? '保存修改' : '确认'}
        </button>
      </div>
    </Modal>
  );
}
