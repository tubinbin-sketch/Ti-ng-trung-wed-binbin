import React, { createContext, useContext, useRef, useSyncExternalStore } from 'react';
import type { BinBinSlidePayload } from '../utils/chineseEngine';
import type { UploadedAssignmentPackage } from '../utils/assignmentParser';
import type { ActiveClassroomSession, ClassroomDataMode, SyncStatus } from '../utils/storageService';

export interface BinBinAskQuestionPayload {
  questionPrompt: string;
  userAnswer?: string;
  correctAnswer?: string;
  explanation?: string;
}

export interface AppBusState {
  studentsCount: number;
  studentsRosterVersion: number;
  srsVersion: number;
  readingHistoryVersion: number;
  handwritingHistoryVersion: number;
  projectorFullscreenTick: number;
  syncStatus: SyncStatus;
  classroomMode: ClassroomDataMode;
  classroomSession: ActiveClassroomSession | null;
  latestAssignment: UploadedAssignmentPackage | null;
  binbinOpenTick: number;
  binbinIsOpen: boolean;
  binbinDisplayMode: 'floating' | 'docked';
  binbinAskPayload: BinBinAskQuestionPayload | null;
  binbinApplySlidePayload: BinBinSlidePayload | null;
}

type Listener = () => void;

let currentState: AppBusState = {
  studentsCount: 0,
  studentsRosterVersion: 0,
  srsVersion: 0,
  readingHistoryVersion: 0,
  handwritingHistoryVersion: 0,
  projectorFullscreenTick: 0,
  syncStatus: 'synced',
  classroomMode: 'new',
  classroomSession: null,
  latestAssignment: null,
  binbinOpenTick: 0,
  binbinIsOpen: false,
  binbinDisplayMode: 'floating',
  binbinAskPayload: null,
  binbinApplySlidePayload: null,
};

const listeners = new Set<Listener>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

export const appStore = {
  getState(): AppBusState {
    return currentState;
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  notifyStudentsUpdated(count?: number) {
    currentState = {
      ...currentState,
      studentsCount: typeof count === 'number' ? count : currentState.studentsCount,
      studentsRosterVersion: currentState.studentsRosterVersion + 1,
    };
    emitChange();
  },
  notifySrsUpdated() {
    currentState = {
      ...currentState,
      srsVersion: currentState.srsVersion + 1,
    };
    emitChange();
  },
  notifyReadingHistoryUpdated() {
    currentState = {
      ...currentState,
      readingHistoryVersion: currentState.readingHistoryVersion + 1,
    };
    emitChange();
  },
  notifyHandwritingHistoryUpdated() {
    currentState = {
      ...currentState,
      handwritingHistoryVersion: currentState.handwritingHistoryVersion + 1,
    };
    emitChange();
  },
  triggerProjectorFullscreen() {
    currentState = {
      ...currentState,
      projectorFullscreenTick: currentState.projectorFullscreenTick + 1,
    };
    emitChange();
  },
  setSyncStatus(syncStatus: SyncStatus) {
    if (currentState.syncStatus === syncStatus) return;
    currentState = { ...currentState, syncStatus };
    emitChange();
  },
  setClassroomMode(classroomMode: ClassroomDataMode) {
    currentState = { ...currentState, classroomMode };
    emitChange();
  },
  setClassroomSession(classroomSession: ActiveClassroomSession | null) {
    currentState = { ...currentState, classroomSession };
    emitChange();
  },
  notifyAssignmentUpdated(latestAssignment: UploadedAssignmentPackage) {
    currentState = { ...currentState, latestAssignment };
    emitChange();
  },
  openBinBinAssistant() {
    currentState = {
      ...currentState,
      binbinIsOpen: true,
      binbinOpenTick: currentState.binbinOpenTick + 1,
    };
    emitChange();
  },
  setBinBinDockState(isOpen: boolean, displayMode: 'floating' | 'docked') {
    if (
      currentState.binbinIsOpen === isOpen &&
      currentState.binbinDisplayMode === displayMode
    ) {
      return;
    }
    currentState = {
      ...currentState,
      binbinIsOpen: isOpen,
      binbinDisplayMode: displayMode,
    };
    emitChange();
  },
  askBinBinQuestion(payload: BinBinAskQuestionPayload) {
    currentState = {
      ...currentState,
      binbinIsOpen: true,
      binbinAskPayload: payload,
      binbinOpenTick: currentState.binbinOpenTick + 1,
    };
    emitChange();
  },
  clearBinBinQuestion() {
    if (!currentState.binbinAskPayload) return;
    currentState = {
      ...currentState,
      binbinAskPayload: null,
    };
    emitChange();
  },
  applyBinBinSlide(payload: BinBinSlidePayload) {
    currentState = {
      ...currentState,
      binbinApplySlidePayload: payload,
    };
    emitChange();
  },
  clearBinBinSlidePayload() {
    if (!currentState.binbinApplySlidePayload) return;
    currentState = {
      ...currentState,
      binbinApplySlidePayload: null,
    };
    emitChange();
  },
};

const AppStoreContext = createContext(appStore);

export const AppStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AppStoreContext.Provider value={appStore}>{children}</AppStoreContext.Provider>;
};

function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  return ka.every((k) =>
    Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
  );
}

/**
 * Subscribe to a slice of the app bus. Selectors may return a fresh object
 * literal; the result is cached and only replaced when a field changes,
 * which useSyncExternalStore requires (otherwise React 19 loops forever).
 */
export function useAppStoreSelector<T>(selector: (state: AppBusState) => T): T {
  const store = useContext(AppStoreContext);
  const cacheRef = useRef<{ value: T } | null>(null);
  const getSnapshot = () => {
    const next = selector(store.getState());
    if (cacheRef.current && shallowEqual(cacheRef.current.value, next)) {
      return cacheRef.current.value;
    }
    cacheRef.current = { value: next };
    return next;
  };
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

export function useAppStoreActions() {
  return useContext(AppStoreContext);
}
