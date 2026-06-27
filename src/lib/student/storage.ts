import { StudentInfo } from '@/types/student';

const STORAGE_KEY = 'gaokao-student-info';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function loadStudentInfo(): StudentInfo | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return validateStudentInfo(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveStudentInfo(info: StudentInfo): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(info));
}

export function clearStudentInfo(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(STORAGE_KEY);
}

/** 基本数据合法性检查 */
function validateStudentInfo(data: unknown): data is StudentInfo {
  if (!data || typeof data !== 'object') return false;

  const d = data as Record<string, unknown>;
  const validGroups = ['物理类', '历史类'];
  const validResit = ['化学', '生物', '政治', '地理'];

  if (typeof d.province !== 'string') return false;
  if (!validGroups.includes(d.subjectGroup as string)) return false;
  if (!Array.isArray(d.resitSubjects) || d.resitSubjects.length !== 2) return false;
  if (!d.resitSubjects.every((s: unknown) => validResit.includes(s as string))) return false;
  if (typeof d.score !== 'number' || d.score < 0 || d.score > 750) return false;
  if (typeof d.rank !== 'number') return false;
  if (typeof d.year !== 'number') return false;
  if (typeof d.totalCandidates !== 'number') return false;

  return true;
}
