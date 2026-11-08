import React, { createContext, useCallback, useContext, useRef, useSyncExternalStore } from 'react';
import type { BinBinSlidePayload } from '../utils/chineseEngine';
import type { UploadedAssignmentPackage } from '../utils/assignmentParser';
import type { ActiveClassroomSession, SyncStatus } from '../utils/storageService';

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

function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  if (
    typeof a !== 'object' ||
    a === null ||
    typeof b !== 'object' ||
    b === null
  ) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }
  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  if (keysA.length !== keysB.length) {
    return false;
  }
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (
      !Object.prototype.hasOwnProperty.call(b, key) ||
      !Object.is(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    ) {
      return false;
    }
  }
  return true;
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
  setClassroomSession(classroomSession: ActiveClassroomSession | null) {
    if (shallowEqual(currentState.classroomSession, classroomSession)) return;
    currentState = { ...currentState, classroomSession };
    emitChange();
  },
  notifyAssignmentUpdated(latestAssignment: UploadedAssignmentPackage) {
    if (currentState.latestAssignment === latestAssignment) return;
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

export function useAppStoreSelector<T>(selector: (state: AppBusState) => T): T {
  const store = useContext(AppStoreContext);
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const cacheRef = useRef<{
    hasValue: boolean;
    state: AppBusState | null;
    selection: T | undefined;
  }>({
    hasValue: false,
    state: null,
    selection: undefined,
  });

  const getSnapshot = useCallback((): T => {
    const nextState = store.getState();
    const cache = cacheRef.current;

    if (cache.hasValue && cache.state === nextState) {
      return cache.selection as T;
    }

    const nextSelection = selectorRef.current(nextState);
    if (cache.hasValue && shallowEqual(cache.selection as T, nextSelection)) {
      cache.state = nextState;
      return cache.selection as T;
    }

    cacheRef.current = {
      hasValue: true,
      state: nextState,
      selection: nextSelection,
    };
    return nextSelection;
  }, [store]);

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

export function useAppStoreActions() {
  return useContext(AppStoreContext);
}
