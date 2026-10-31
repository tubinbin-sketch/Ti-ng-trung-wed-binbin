import { INITIAL_VOCAB_SLIDES, VocabSlide } from '../data/chineseData';
import { ClassStudentRecord, repairAndUpgradeSlide } from './chineseEngine';

export interface SystemBackupPayload {
  version: string;
  exportedAt: string;
  platform: string;
  slides: VocabSlide[];
  roster: ClassStudentRecord[];
  srsRecords: Record<string, unknown>;
  assignment?: unknown;
}

export const CURRENT_SCHEMA_VERSION = '3.2.0';

export const STORAGE_KEYS = {
  SCHEMA_VERSION: 'hanu_schema_version',
  FULL_SLIDES_DECK: 'hanu_full_slides_deck_v3',
  CUSTOM_SLIDES: 'hanu_custom_vocab_slides_v2',
  STUDENTS_ROSTER: 'hanu_classroom_students_roster_v2',
  CLASSROOM_MODE: 'hanu_classroom_data_mode_v1',
  SRS_RECORDS: 'hanu_student_srs_records_v2',
  ASSIGNMENT: 'hanu_active_assignment_package_v2',
  TEACHER_UNLOCKED: 'hanu_teacher_pin_unlocked_v1',
} as const;

export type ClassroomDataMode = 'demo' | 'new';
export type SyncStatus = 'synced' | 'syncing' | 'offline';

let currentSyncStatus: SyncStatus = 'synced';

export function getCurrentSyncStatus(): SyncStatus {
  return currentSyncStatus;
}

export function emitSyncStatus(status: SyncStatus): void {
  currentSyncStatus = status;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<SyncStatus>('hanu_sync_status_changed', { detail: status }));
  }
}

export const DEFAULT_TEACHER_PIN = '2026';

export function verifyTeacherPin(inputPin: string, expectedPin = DEFAULT_TEACHER_PIN): boolean {
  const clean = String(inputPin || '').trim();
  return Boolean(clean) && clean === expectedPin;
}

export async function verifyTeacherPinRemote(
  inputPin: string
): Promise<{ ok: boolean; error?: string }> {
  const clean = String(inputPin || '').trim();
  if (!clean) {
    return { ok: false, error: 'Vui lòng nhập mã PIN giảng viên.' };
  }
  if (typeof window === 'undefined' || typeof fetch !== 'function') {
    const ok = verifyTeacherPin(clean);
    return ok ? { ok: true } : { ok: false, error: 'Mã PIN giảng viên chưa đúng.' };
  }
  try {
    const res = await fetch('/api/auth/teacher-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: clean }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.ok) {
      return { ok: true };
    }
    return {
      ok: false,
      error: data?.error || 'Mã PIN giảng viên chưa đúng. Vui lòng kiểm tra lại.',
    };
  } catch {
    const ok = verifyTeacherPin(clean);
    return ok
      ? { ok: true }
      : { ok: false, error: 'Mã PIN giảng viên chưa đúng (Chế độ Offline).' };
  }
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

export function getClassroomDataMode(): ClassroomDataMode {
  if (typeof window === 'undefined') return 'demo';
  try {
    const val = localStorage.getItem(STORAGE_KEYS.CLASSROOM_MODE);
    return val === 'new' ? 'new' : 'demo';
  } catch {
    return 'demo';
  }
}

export function setClassroomDataMode(mode: ClassroomDataMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.CLASSROOM_MODE, mode);
    window.dispatchEvent(new CustomEvent('hanu_classroom_mode_changed', { detail: mode }));
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

/**
 * Single unified schema migration runner (checks SCHEMA_VERSION and upgrades legacy '既哦' / 'slide-25' slides).
 */
export function runStorageMigrations(
  initialSlides: VocabSlide[] = INITIAL_VOCAB_SLIDES
): VocabSlide[] {
  if (typeof window === 'undefined') return initialSlides;
  try {
    const storedVersion = localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION);
    const needsVersionUpgrade = storedVersion !== CURRENT_SCHEMA_VERSION;

    const fullDeckRaw = localStorage.getItem(STORAGE_KEYS.FULL_SLIDES_DECK);
    if (fullDeckRaw) {
      const parsedFull = JSON.parse(fullDeckRaw);
      if (Array.isArray(parsedFull) && parsedFull.length > 0) {
        let hasLegacySlide = needsVersionUpgrade;
        const upgraded = parsedFull
          .filter((s: VocabSlide) => s && s.hanzi)
          .map((s: VocabSlide) => {
            if (
              s.hanzi.trim() === '既哦' ||
              s.hanzi.trim() === '既 哦' ||
              ((s.id === 'slide-25' || s.index === 25) && s.hanzi.trim() !== '既然')
            ) {
              hasLegacySlide = true;
            }
            return repairAndUpgradeSlide(s);
          });
        if (hasLegacySlide) {
          localStorage.setItem(STORAGE_KEYS.FULL_SLIDES_DECK, JSON.stringify(upgraded));
        }
        localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, CURRENT_SCHEMA_VERSION);
        return upgraded;
      }
    }

    const savedCustom = localStorage.getItem(STORAGE_KEYS.CUSTOM_SLIDES);
    if (savedCustom) {
      const parsedCustom = JSON.parse(savedCustom);
      if (Array.isArray(parsedCustom) && parsedCustom.length > 0) {
        const baseIds = new Set(initialSlides.map((s) => s.hanzi));
        let hasLegacyCustom = needsVersionUpgrade;
        const extra = parsedCustom
          .filter((s: VocabSlide) => s && s.hanzi && !baseIds.has(s.hanzi))
          .map((s: VocabSlide) => {
            if (s.hanzi.trim() === '既哦' || s.hanzi.trim() === '既 哦') {
              hasLegacyCustom = true;
            }
            return repairAndUpgradeSlide(s);
          });
        if (hasLegacyCustom) {
          localStorage.setItem(STORAGE_KEYS.CUSTOM_SLIDES, JSON.stringify(extra));
        }
        localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, CURRENT_SCHEMA_VERSION);
        return [...initialSlides, ...extra];
      }
    }

    localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, CURRENT_SCHEMA_VERSION);
  } catch {
    // ignore storage errors
  }
  return initialSlides;
}

export async function syncStateToBackend(partialState: {
  roster?: ClassStudentRecord[];
  slides?: VocabSlide[];
  srsRecords?: Record<string, unknown>;
  assignment?: unknown;
  classroomMode?: ClassroomDataMode;
}): Promise<boolean> {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return false;
  emitSyncStatus('syncing');
  try {
    const res = await fetch('/api/storage/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partialState),
    });
    if (res.ok) {
      emitSyncStatus('synced');
      return true;
    }
    emitSyncStatus('offline');
    return false;
  } catch {
    emitSyncStatus('offline');
    return false;
  }
}

export interface RemoteClassroomState {
  roster?: ClassStudentRecord[];
  slides?: VocabSlide[];
  srsRecords?: Record<string, unknown>;
  assignment?: unknown;
  classroomMode?: ClassroomDataMode;
  updatedAt?: string;
}

export async function fetchRemoteState(): Promise<RemoteClassroomState | null> {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return null;
  emitSyncStatus('syncing');
  try {
    const res = await fetch('/api/storage/state', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      emitSyncStatus('offline');
      return null;
    }
    const data = (await res.json()) as RemoteClassroomState;
    emitSyncStatus('synced');
    if (!data || typeof data !== 'object') return null;

    if (data.classroomMode === 'demo' || data.classroomMode === 'new') {
      localStorage.setItem(STORAGE_KEYS.CLASSROOM_MODE, data.classroomMode);
    }

    if (Array.isArray(data.roster)) {
      localStorage.setItem(STORAGE_KEYS.STUDENTS_ROSTER, JSON.stringify(data.roster));
      window.dispatchEvent(
        new CustomEvent('hanu_students_updated', { detail: data.roster.length })
      );
    }

    if (Array.isArray(data.slides) && data.slides.length > 0) {
      const upgradedSlides = data.slides
        .filter((s) => s && s.hanzi)
        .map((s) => repairAndUpgradeSlide(s));
      if (upgradedSlides.length > 0) {
        localStorage.setItem(STORAGE_KEYS.FULL_SLIDES_DECK, JSON.stringify(upgradedSlides));
      }
    }

    if (
      data.srsRecords &&
      typeof data.srsRecords === 'object' &&
      Object.keys(data.srsRecords).length > 0
    ) {
      localStorage.setItem(STORAGE_KEYS.SRS_RECORDS, JSON.stringify(data.srsRecords));
      window.dispatchEvent(new CustomEvent('hanu_srs_updated'));
    }

    if (data.assignment && typeof data.assignment === 'object') {
      localStorage.setItem(STORAGE_KEYS.ASSIGNMENT, JSON.stringify(data.assignment));
      window.dispatchEvent(
        new CustomEvent('hanu_assignment_updated', { detail: data.assignment })
      );
    }

    window.dispatchEvent(new CustomEvent('hanu_remote_state_synced', { detail: data }));
    return data;
  } catch {
    emitSyncStatus('offline');
    return null;
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

