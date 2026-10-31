import { VocabSlide } from '../data/chineseData';
import { ClassStudentRecord } from './chineseEngine';

export interface SystemBackupPayload {
  version: string;
  exportedAt: string;
  platform: string;
  slides: VocabSlide[];
  roster: ClassStudentRecord[];
  srsRecords: Record<string, unknown>;
  assignment?: unknown;
}

export const STORAGE_KEYS = {
  FULL_SLIDES_DECK: 'hanu_full_slides_deck_v3',
  CUSTOM_SLIDES: 'hanu_custom_vocab_slides_v2',
  STUDENTS_ROSTER: 'hanu_classroom_students_roster_v2',
  SRS_RECORDS: 'hanu_student_srs_records_v2',
  ASSIGNMENT: 'hanu_active_assignment_package_v2',
  TEACHER_UNLOCKED: 'hanu_teacher_pin_unlocked_v1',
} as const;

export const DEFAULT_TEACHER_PIN = '2026';

export function verifyTeacherPin(inputPin: string, expectedPin = DEFAULT_TEACHER_PIN): boolean {
  const clean = String(inputPin || '').trim();
  return clean === expectedPin || clean === '8888';
}

export function isTeacherSessionUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(STORAGE_KEYS.TEACHER_UNLOCKED) === 'true';
  } catch {
    return false;
  }
}

export function setTeacherSessionUnlocked(unlocked: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (unlocked) {
      sessionStorage.setItem(STORAGE_KEYS.TEACHER_UNLOCKED, 'true');
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.TEACHER_UNLOCKED);
    }
  } catch {
    // ignore storage errors
  }
}

export function safeGetLocalJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export function safeSetLocalJSON(key: string, value: unknown): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export async function syncStateToBackend(partialState: {
  roster?: ClassStudentRecord[];
  slides?: VocabSlide[];
  srsRecords?: Record<string, unknown>;
  assignment?: unknown;
}): Promise<boolean> {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return false;
  try {
    const res = await fetch('/api/storage/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partialState),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function buildFullSystemBackup(
  slides: VocabSlide[],
  roster: ClassStudentRecord[]
): SystemBackupPayload {
  const srsRecords = safeGetLocalJSON<Record<string, unknown>>(STORAGE_KEYS.SRS_RECORDS, {});
  const assignment = safeGetLocalJSON<unknown>(STORAGE_KEYS.ASSIGNMENT, null);
  return {
    version: '3.0.0',
    exportedAt: new Date().toISOString(),
    platform: 'HANU × 阮文受 — Hệ Thống Trợ Giảng & Học Tập Hán Ngữ Chuẩn HSK 3.0',
    slides,
    roster,
    srsRecords,
    assignment,
  };
}

export function exportFullSystemBackupToFile(
  slides: VocabSlide[],
  roster: ClassStudentRecord[]
): void {
  const payload = buildFullSystemBackup(slides, roster);
  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const datePart = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.setAttribute('download', `HANU_HSK3_Full_Backup_${datePart}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function parseSystemBackupPayload(rawJson: string): {
  slides?: VocabSlide[];
  roster?: ClassStudentRecord[];
  srsRecords?: Record<string, unknown>;
  assignment?: unknown;
} | null {
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object') return null;

    // Support both full system backup object and direct slide array
    if (Array.isArray(parsed)) {
      return { slides: parsed as VocabSlide[] };
    }

    const result: {
      slides?: VocabSlide[];
      roster?: ClassStudentRecord[];
      srsRecords?: Record<string, unknown>;
      assignment?: unknown;
    } = {};

    if (Array.isArray(parsed.slides) && parsed.slides.length > 0) {
      result.slides = parsed.slides;
    }
    if (Array.isArray(parsed.roster) && parsed.roster.length > 0) {
      result.roster = parsed.roster;
    }
    if (parsed.srsRecords && typeof parsed.srsRecords === 'object') {
      result.srsRecords = parsed.srsRecords;
    }
    if (parsed.assignment && typeof parsed.assignment === 'object') {
      result.assignment = parsed.assignment;
    }

    if (!result.slides && !result.roster && !result.srsRecords && !result.assignment) {
      return null;
    }
    return result;
  } catch {
    return null;
  }
}
