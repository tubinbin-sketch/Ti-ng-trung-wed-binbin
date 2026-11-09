import { ClassStudentRecord } from '../../utils/chineseEngine';

export type ClassStudent = ClassStudentRecord;

export const STORAGE_KEY_STUDENTS = 'hanu_classroom_students_roster_v2';

export function getStoredStudentRoster(): ClassStudent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STUDENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const normalized: ClassStudent[] = parsed.map((item, idx) => {
          return {
            ...item,
            name: item.name,
            studentCode: item.studentCode || `HV-${String(idx + 1).padStart(3, '0')}`,
            hskLevel: item.hskLevel || 'HSK 1',
            totalPoints: typeof item.totalPoints === 'number' ? item.totalPoints : 0,
            timeSeconds: typeof item.timeSeconds === 'number' ? item.timeSeconds : 0,
            streak: typeof item.streak === 'number' ? item.streak : 0,
            status: item.status || 'Chưa nộp',
          };
        });
        return normalized;
      }
    }
  } catch {
    // Fallback if storage is inaccessible
  }
  return [];
}
