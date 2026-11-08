import { INITIAL_VOCAB_SLIDES, VocabSlide } from '../data/chineseData';
import { ClassStudentRecord, repairAndUpgradeSlide } from './chineseEngine';
import { appStore } from '../context/AppStoreContext';

export interface SystemBackupPayload {
  version: string;
  exportedAt: string;
  platform: string;
  slides: VocabSlide[];
  roster: ClassStudentRecord[];
  srsRecords: Record<string, unknown>;
  assignment?: unknown;
}

export interface ActiveClassroomSession {
  classId: string;
  className: string;
  joinCode: string;
  hskLevel?: string;
  role: 'teacher' | 'student';
  uid: string;
  displayName?: string;
  email?: string;
  studentCode?: string;
  studentName?: string;
  teacherName?: string;
  isDemo?: boolean;
}

export const CURRENT_SCHEMA_VERSION = '4.0.0-firebase';

export const STORAGE_KEYS = {
  SCHEMA_VERSION: 'hanu_schema_version',
  FULL_SLIDES_DECK: 'hanu_full_slides_deck_v3',
  CUSTOM_SLIDES: 'hanu_custom_vocab_slides_v2',
  STUDENTS_ROSTER: 'hanu_classroom_students_roster_v2',
  CLASSROOM_MODE: 'hanu_classroom_data_mode_v1',
  SRS_RECORDS: 'hanu_student_srs_records_v2',
  ASSIGNMENT: 'hanu_active_assignment_package_v2',
  LOCAL_UPDATED_AT: 'hanu_local_state_updated_at_v1',
  ACTIVE_STUDENT_ID: 'hanu_active_student_id_v1',
  STUDENT_LEARNED_PREFIX: 'hanu_student_learned_slides_v2_',
  LEARNED_SLIDES_GLOBAL: 'hanu_learned_slide_ids_v1',
  HSK3_STAGE_FILTER: 'hanu_hsk3_stage_filter_v1',
  HSK3_LEVEL_FILTER: 'hanu_hsk3_level_filter_v1',
  ACTIVE_CLASSROOM_SESSION: 'hanu_active_classroom_session_v1',
} as const;

export interface StoredHsk3FilterState {
  stage: 'all' | 'elementary' | 'intermediate' | 'advanced';
  level: 'all' | 'HSK 1' | 'HSK 2' | 'HSK 3' | 'HSK 4' | 'HSK 5' | 'HSK 6' | 'HSK 7-9';
}

const VALID_HSK_STAGES = new Set(['all', 'elementary', 'intermediate', 'advanced']);
const VALID_HSK_LEVELS = new Set([
  'all',
  'HSK 1',
  'HSK 2',
  'HSK 3',
  'HSK 4',
  'HSK 5',
  'HSK 6',
  'HSK 7-9',
]);

export function getStoredHsk3FilterState(): StoredHsk3FilterState {
  if (typeof window === 'undefined') {
    return { stage: 'all', level: 'all' };
  }
  try {
    const rawStage = localStorage.getItem(STORAGE_KEYS.HSK3_STAGE_FILTER) || 'all';
    const rawLevel = localStorage.getItem(STORAGE_KEYS.HSK3_LEVEL_FILTER) || 'all';
    return {
      stage: VALID_HSK_STAGES.has(rawStage)
        ? (rawStage as StoredHsk3FilterState['stage'])
        : 'all',
      level: VALID_HSK_LEVELS.has(rawLevel)
        ? (rawLevel as StoredHsk3FilterState['level'])
        : 'all',
    };
  } catch {
    return { stage: 'all', level: 'all' };
  }
}

export function saveStoredHsk3FilterState(
  stage: StoredHsk3FilterState['stage'],
  level: StoredHsk3FilterState['level']
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.HSK3_STAGE_FILTER, stage);
    localStorage.setItem(STORAGE_KEYS.HSK3_LEVEL_FILTER, level);
  } catch {
    // ignore storage errors
  }
}

export type ClassroomDataMode = 'demo' | 'new';
export type SyncStatus = 'synced' | 'syncing' | 'offline';

let currentSyncStatus: SyncStatus = 'synced';
let firebaseTeacherAuthenticated = false;

export function getCurrentSyncStatus(): SyncStatus {
  return currentSyncStatus;
}

export function emitSyncStatus(status: SyncStatus): void {
  currentSyncStatus = status;
  appStore.setSyncStatus(status);
}

export function isTeacherSessionUnlocked(): boolean {
  return firebaseTeacherAuthenticated;
}

export function setTeacherSessionUnlocked(unlocked: boolean): void {
  firebaseTeacherAuthenticated = unlocked;
}

export function loadActiveClassroomSession(): ActiveClassroomSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_CLASSROOM_SESSION);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveClassroomSession;
    if (!parsed || !parsed.classId || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveActiveClassroomSession(session: ActiveClassroomSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!session) {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_CLASSROOM_SESSION);
    } else {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CLASSROOM_SESSION, JSON.stringify(session));
    }
    appStore.setClassroomSession(session);
  } catch {
    // ignore storage errors
  }
}

// ============================================================================
// PER-STUDENT ISOLATED LEARNED SLIDES & SRS NAMESPACE HELPERS
// ============================================================================
export function normalizeStudentStorageKey(studentIdOrName?: string): string {
  const raw = String(studentIdOrName || '').trim();
  if (!raw) {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_STUDENT_ID);
        if (saved) return saved;
      } catch {
        // ignore
      }
    }
    return 'HV-001';
  }
  return raw.replace(/\s+/g, '_');
}

export function setActiveStudentStorageId(studentIdOrName: string): void {
  if (typeof window === 'undefined') return;
  try {
    const clean = normalizeStudentStorageKey(studentIdOrName);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_STUDENT_ID, clean);
  } catch {
    // ignore
  }
}

export function getStudentLearnedSlideIds(studentIdOrName?: string): Set<string> {
  const key = `${STORAGE_KEYS.STUDENT_LEARNED_PREFIX}${normalizeStudentStorageKey(studentIdOrName)}`;
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.map(String));
      }
    }
    const globalRaw = localStorage.getItem(STORAGE_KEYS.LEARNED_SLIDES_GLOBAL);
    if (globalRaw) {
      const parsedGlobal = JSON.parse(globalRaw);
      if (Array.isArray(parsedGlobal)) {
        return new Set(parsedGlobal.map(String));
      }
    }
  } catch {
    // ignore
  }
  return new Set(INITIAL_VOCAB_SLIDES.filter((s) => s.learned).map((s) => s.id));
}

export function saveStudentLearnedSlideIds(
  learnedIds: Iterable<string>,
  studentIdOrName?: string
): void {
  if (typeof window === 'undefined') return;
  const key = `${STORAGE_KEYS.STUDENT_LEARNED_PREFIX}${normalizeStudentStorageKey(studentIdOrName)}`;
  const arr = Array.from(learnedIds);
  try {
    localStorage.setItem(key, JSON.stringify(arr));
    localStorage.setItem(STORAGE_KEYS.LEARNED_SLIDES_GLOBAL, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

export function applyStudentLearnedToSlides(
  slides: VocabSlide[],
  studentIdOrName?: string
): VocabSlide[] {
  const learnedSet = getStudentLearnedSlideIds(studentIdOrName);
  return slides.map((s) => ({
    ...s,
    learned: learnedSet.has(s.id),
  }));
}

export function markLocalStateUpdated(isoTimestamp = new Date().toISOString()): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.LOCAL_UPDATED_AT, isoTimestamp);
  } catch {
    // ignore
  }
}

export function getLocalStateUpdatedAt(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.LOCAL_UPDATED_AT);
  } catch {
    return null;
  }
}

export function getClassroomDataMode(): ClassroomDataMode {
  if (typeof window === 'undefined') return 'new';
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
    markLocalStateUpdated();
    appStore.setClassroomMode(mode);
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
 * Also merges any custom slides from CUSTOM_SLIDES and applies persisted learned flags.
 */
export function runStorageMigrations(
  initialSlides: VocabSlide[] = INITIAL_VOCAB_SLIDES
): VocabSlide[] {
  if (typeof window === 'undefined') return initialSlides;
  try {
    const storedVersion = localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION);
    const needsVersionUpgrade = storedVersion !== CURRENT_SCHEMA_VERSION;

    let resultDeck: VocabSlide[] | null = null;

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
        resultDeck = upgraded;
      }
    }

    const savedCustom = localStorage.getItem(STORAGE_KEYS.CUSTOM_SLIDES);
    if (savedCustom) {
      const parsedCustom = JSON.parse(savedCustom);
      if (Array.isArray(parsedCustom) && parsedCustom.length > 0) {
        const baseDeck = resultDeck || initialSlides;
        const existingHanzis = new Set(baseDeck.map((s) => s.hanzi));
        let hasLegacyCustom = needsVersionUpgrade;
        const extra = parsedCustom
          .filter((s: VocabSlide) => s && s.hanzi && !existingHanzis.has(s.hanzi))
          .map((s: VocabSlide) => {
            if (s.hanzi.trim() === '既哦' || s.hanzi.trim() === '既 哦') {
              hasLegacyCustom = true;
            }
            return repairAndUpgradeSlide(s);
          });
        if (hasLegacyCustom) {
          localStorage.setItem(STORAGE_KEYS.CUSTOM_SLIDES, JSON.stringify(extra));
        }
        resultDeck = [...baseDeck, ...extra];
      }
    }

    localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, CURRENT_SCHEMA_VERSION);
    const finalDeck = resultDeck || initialSlides;
    return applyStudentLearnedToSlides(finalDeck);
  } catch {
    // ignore storage errors
  }
  return initialSlides;
}

export function shouldApplyRemoteState(
  remoteUpdatedAt?: string | null,
  localUpdatedAt?: string | null
): boolean {
  if (!remoteUpdatedAt) return false;
  const remoteMs = Date.parse(remoteUpdatedAt);
  if (!Number.isFinite(remoteMs) || remoteMs <= 0) return false;
  if (!localUpdatedAt) return true;
  const localMs = Date.parse(localUpdatedAt);
  if (!Number.isFinite(localMs)) return true;
  return remoteMs >= localMs;
}

export function buildFullSystemBackup(
  slides: VocabSlide[],
  roster: ClassStudentRecord[]
): SystemBackupPayload {
  const srsRecords = safeGetLocalJSON<Record<string, unknown>>(STORAGE_KEYS.SRS_RECORDS, {});
  const assignment = safeGetLocalJSON<unknown>(STORAGE_KEYS.ASSIGNMENT, null);
  return {
    version: '4.0.0',
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
    } else if (Array.isArray(parsed.students) && parsed.students.length > 0) {
      result.roster = parsed.students;
    }
    if (parsed.srsRecords && typeof parsed.srsRecords === 'object') {
      result.srsRecords = parsed.srsRecords;
    }
    if (parsed.assignment && typeof parsed.assignment === 'object') {
      result.assignment = parsed.assignment;
    } else if (parsed.customAssignment && typeof parsed.customAssignment === 'object') {
      result.assignment = parsed.customAssignment;
    }

    if (!result.slides && !result.roster && !result.srsRecords && !result.assignment) {
      return null;
    }
    return result;
  } catch {
    return null;
  }
}
