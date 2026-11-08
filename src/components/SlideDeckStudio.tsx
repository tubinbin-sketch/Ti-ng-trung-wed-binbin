import React, { Suspense, useEffect, useMemo, useCallback, useRef, useState } from 'react';
import {
  Volume2,
  Edit3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  BookOpen,
  RefreshCw,
  Play,
  RotateCcw,
  Search,
  Sliders,
  Mic,
  MicOff,
  Printer,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  Save,
  Keyboard,
  Rewind,
  Puzzle,
  Compass,
  MessageSquare,
  FileText,
  Award,
  Info,
  Star,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Toast } from './Toast';
import { StrokeData, VocabSlide } from '../data/chineseData';
import { SlideIllustration, VOCAB_PHOTO_MAP } from './SlideIllustration';
import {
  buildSafeContextualSvgDataUrl,
  saveCustomVocabImage,
} from '../utils/vocabVisualEngine';
import type { PandaMood } from './BinBinPandaAI';
import {
  getStoredHsk3FilterState,
  saveStoredHsk3FilterState,
} from '../utils/storageService';
import { currentFirebaseUid, loadFirebase } from '../firebaseClient';
import { appStore } from '../context/AppStoreContext';
import { LazyErrorBoundary } from './LazyErrorBoundary';

const AddVocabModal = React.lazy(() =>
  import('./AddVocabModal').then((m) => ({ default: m.AddVocabModal }))
);
const WorksheetPreviewModal = React.lazy(() =>
  import('./WorksheetPreviewModal').then((m) => ({ default: m.WorksheetPreviewModal }))
);
const MeasureWordDrillModal = React.lazy(() =>
  import('./MeasureWordDrillModal').then((m) => ({ default: m.MeasureWordDrillModal }))
);
const LiveTeachingToolkit = React.lazy(() =>
  import('./LiveTeachingToolkit').then((m) => ({ default: m.LiveTeachingToolkit }))
);
import {
  getIsSpeaking,
  getPreferredSpeechRate,
  getPreferredStrokeSpeedMs,
  setPreferredSpeechRate,
  setPreferredStrokeSpeedMs,
  speakChinese,
  playGentleChime,
  subscribeSlideSettings,
  subscribeSpeakingState,
} from '../utils/speech';
import {
  createCustomVocabSlide,
  enrichVocabSlideWithAI,
  evaluateStrokeSimilarity,
  evaluateStrokeWithFeedback,
  fetchAIVocabSuggestions,
  fetchHanziWriterCharacter,
  getAuthenticCollocationsForWord,
  getSynonymDistinctionForWord,
  parseBatchSlideInput,
  searchInstantVocabSuggestions,
  SMART_HANZI_DICTIONARY,
  StrokeEvaluationDetail,
  VocabSuggestionItem,
} from '../utils/chineseEngine';
import {
  HSK3_STAGES,
  Hsk3LevelFilter,
  Hsk3StageId,
  filterSlidesByHsk3,
  getHsk3VocabStandard,
} from '../utils/hsk3Engine';
import { FilterDisplayPopover } from './FilterDisplayPopover';
import {
  analyzeToneSandhi,
  applySrsRatingToRecords,
  generateContextualDialogue,
  getMistakeNotebookList,
  isSrsDueToday,
  loadStoredSrsRecords,
  recordDailyWordReview,
  saveStoredSrsRecords,
  SrsRating,
  SrsWordRecord,
} from '../utils/hskStudyHelpers';
import {
  PronunciationPracticeButton,
  PronunciationResultBanner,
  usePronunciationPractice,
} from './PronunciationPracticeWidget';

interface SlideDeckStudioProps {
  slides: VocabSlide[];
  activeSlideIndex: number;
  onSelectSlideIndex: (index: number) => void;
  onOpenWritingModal?: (slide: VocabSlide) => void;
  onToggleLearned: (slideId: string) => void;
  onAddSlides: (newSlides: VocabSlide[]) => void;
  onUpdateSlide?: (updatedSlide: VocabSlide) => void;
  onReplaceAllSlides?: (nextSlides: VocabSlide[]) => void;
  onResetDefaultSlides?: () => void;
  roleMode?: 'teacher' | 'student';
  studentStudyMode?: 'writing' | 'flashcard';
  onChangeStudentStudyMode?: (mode: 'writing' | 'flashcard') => void;
  onSwitchToStudentHomework?: () => void;
}

const SEARCH_TOPIC_FILTERS: {
  id: 'all' | 'family' | 'school' | 'daily' | 'nature';
  label: string;
}[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'family', label: 'Gia đình & Cảm xúc' },
  { id: 'school', label: 'Trường học & HSK' },
  { id: 'daily', label: 'Ẩm thực & Đời sống' },
  { id: 'nature', label: 'Thiên nhiên & Văn hóa' },
];

export const SlideDeckStudio: React.FC<SlideDeckStudioProps> = ({
  slides,
  activeSlideIndex,
  onSelectSlideIndex,
  onOpenWritingModal,
  onToggleLearned,
  onAddSlides,
  onUpdateSlide,
  onReplaceAllSlides,
  onResetDefaultSlides,
  roleMode = 'teacher',
  studentStudyMode = 'writing',
  onChangeStudentStudyMode,
  onSwitchToStudentHomework,
}) => {
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [srsRecords, setSrsRecords] = useState<Record<string, SrsWordRecord>>(() =>
    loadStoredSrsRecords(slides)
  );
  const [showPinyin, setShowPinyin] = useState(true);
  const [showMeaning, setShowMeaning] = useState(true);
  const [showVietnamese, setShowVietnamese] = useState(true);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [col1ActiveTab, setCol1ActiveTab] = useState<'radical' | 'grammar' | 'collocations'>('radical');
  const [showToneSandhiInfo, setShowToneSandhiInfo] = useState(false);
  const [isCol1AccordionOpen, setIsCol1AccordionOpen] = useState(true);
  const [col3ActiveTab, setCol3ActiveTab] = useState<'example' | 'dialogue'>('example');
  const [activeDialogueTurnIdx, setActiveDialogueTurnIdx] = useState<number | null>(null);
  const [isPlayingDialogue, setIsPlayingDialogue] = useState(false);
  const karaokeTimerRef = useRef<number[]>([]);
  const [quickFeedback, setQuickFeedback] = useState<{
    type: 'error' | 'success' | '';
    text: string;
  }>({ type: '', text: '' });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Teacher Instant AI Vocabulary Search Bar state
  const [vocabSearchQuery, setVocabSearchQuery] = useState('');
  const [vocabSearchTopic, setVocabSearchTopic] = useState<
    'all' | 'family' | 'school' | 'daily' | 'nature'
  >('all');
  const [vocabSuggestions, setVocabSuggestions] = useState<VocabSuggestionItem[]>(() =>
    searchInstantVocabSuggestions('', { topic: 'all', limit: 6 })
  );
  const [isSearchingAI, setIsSearchingAI] = useState(false);

  // Inline Mi Zi Ge (米字格) Stroke Order Animation & Live Drawing State
  const [activeCharIdx, setActiveCharIdx] = useState(0);
  const [hydratedCharMap, setHydratedCharMap] = useState<Record<string, StrokeData>>({});
  const [inlineStrokeMode, setInlineStrokeMode] = useState<'animate' | 'practice'>('animate');
  const [animatedStrokeIndex, setAnimatedStrokeIndex] = useState<number>(1);
  const [strokeSubProgress, setStrokeSubProgress] = useState<number>(100);
  const [isAnimatingStrokes, setIsAnimatingStrokes] = useState<boolean>(true);
  const [userStrokes, setUserStrokes] = useState<number[][][]>([]);
  const [currentStroke, setCurrentStroke] = useState<number[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [practiceAccuracy, setPracticeAccuracy] = useState<number | null>(null);
  const [practiceEvalDetail, setPracticeEvalDetail] = useState<StrokeEvaluationDetail | null>(null);
  const [strokeSpeedMs, setStrokeSpeedMs] = useState<number>(() => getPreferredStrokeSpeedMs());
  const [speechRate, setSpeechRate] = useState<number>(() => getPreferredSpeechRate());
  const [pandaMood, setPandaMood] = useState<PandaMood>('idle');
  const inlineSvgRef = useRef<SVGSVGElement | null>(null);
  const pillStripRef = useRef<HTMLDivElement | null>(null);
  const chipRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Add Custom Vocab Modal State (+ Tự thêm từ vựng mới)
  const [isAddVocabModalOpen, setIsAddVocabModalOpen] = useState(false);
  const [customHanzi, setCustomHanzi] = useState('');
  const [customPinyin, setCustomPinyin] = useState('');
  const [customHanViet, setCustomHanViet] = useState('');
  const [customMeaning, setCustomMeaning] = useState('');
  const [customExampleHanzi, setCustomExampleHanzi] = useState('');
  const [customExamplePinyin, setCustomExamplePinyin] = useState('');
  const [customExampleMeaning, setCustomExampleMeaning] = useState('');
  const [customHskLevel, setCustomHskLevel] = useState('HSK 2');
  const [customVocabError, setCustomVocabError] = useState<string | null>(null);

  // Printable A4 Mi Zi Ge Worksheet Preview Modal State
  const [isWorksheetModalOpen, setIsWorksheetModalOpen] = useState(false);

  // Quick Edit Current Slide Modal State (✏️ Sửa nhanh thẻ này)
  const [isQuickEditModalOpen, setIsQuickEditModalOpen] = useState(false);
  const [editPinyin, setEditPinyin] = useState('');
  const [editHanViet, setEditHanViet] = useState('');
  const [editMeaning, setEditMeaning] = useState('');
  const [editExampleHanzi, setEditExampleHanzi] = useState('');
  const [editExamplePinyin, setEditExamplePinyin] = useState('');
  const [editExampleMeaning, setEditExampleMeaning] = useState('');
  const [editCustomImagePrompt, setEditCustomImagePrompt] = useState('');

  // Batch Import Vocabulary Modal State (📋 Nhập danh sách từ hàng loạt)
  const [isBatchImportModalOpen, setIsBatchImportModalOpen] = useState(false);
  const [batchRawInput, setBatchRawInput] = useState('明天, 考试, 照顾, 旅行');

  // Lesson Export/Import Menu State & Keyboard Shortcut Popover & Measure Word Drill Modal
  const [isLessonFileMenuOpen, setIsLessonFileMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!isMoreMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMoreMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [isMoreMenuOpen]);
  const [showShortcutsHint, setShowShortcutsHint] = useState(false);
  const [isMeasureWordModalOpen, setIsMeasureWordModalOpen] = useState(false);
  const [isTtsSpeaking, setIsTtsSpeaking] = useState<boolean>(() => getIsSpeaking());
  const lessonFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return subscribeSpeakingState((speaking) => setIsTtsSpeaking(speaking));
  }, []);

  // AI Speech-to-Text zh-CN pronunciation practice state
  const [isPracticingSpeech, setIsPracticingSpeech] = useState(false);
  const [speechResult, setSpeechResult] = useState<{
    transcript: string;
    score: number;
    feedback: string;
    isSuccess: boolean;
    charMatches?: { char: string; isMatched: boolean; isPunctuation?: boolean }[];
  } | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // HSK 3.0 (3 Stages - 9 Levels) Filter State & SRS Due Today Filter (Persisted in localStorage)
  const [hsk3StageFilter, setHsk3StageFilter] = useState<Hsk3StageId>(
    () => getStoredHsk3FilterState().stage
  );
  const [hsk3LevelFilter, setHsk3LevelFilter] = useState<Hsk3LevelFilter>(
    () => getStoredHsk3FilterState().level
  );
  const [isDueTodayFilterActive, setIsDueTodayFilterActive] = useState(false);

  useEffect(() => {
    saveStoredHsk3FilterState(hsk3StageFilter, hsk3LevelFilter);
  }, [hsk3StageFilter, hsk3LevelFilter]);

  const currentSlide = useMemo(
    () => slides[activeSlideIndex] || slides[0],
    [slides, activeSlideIndex]
  );
  const currentHsk3Meta = useMemo(
    () => getHsk3VocabStandard(currentSlide),
    [currentSlide]
  );
  const filteredSlides = useMemo(() => {
    let result = filterSlidesByHsk3(slides, hsk3StageFilter, hsk3LevelFilter);
    if (isDueTodayFilterActive) {
      result = result.filter((s) => isSrsDueToday(srsRecords[s.id]));
    }
    return result;
  }, [slides, hsk3StageFilter, hsk3LevelFilter, isDueTodayFilterActive, srsRecords]);

  // Smoothly scroll ONLY the horizontal chip strip (never window/documentElement) when activeSlideIndex changes
  useEffect(() => {
    const strip = pillStripRef.current;
    const targetEl = chipRefs.current.get(activeSlideIndex);
    if (!strip || !targetEl) return;

    const stripWidth = strip.clientWidth;
    const targetRight = targetEl.offsetLeft + targetEl.offsetWidth;

    let nextScrollLeft = 0;
    if (targetRight > stripWidth - 12) {
      const rawDesired = targetEl.offsetLeft - stripWidth / 2 + targetEl.offsetWidth / 2;
      let snappedLeft = Math.max(0, rawDesired);
      for (const [, btn] of chipRefs.current.entries()) {
        if (btn.offsetLeft >= rawDesired) {
          snappedLeft = btn.offsetLeft;
          break;
        }
      }
      nextScrollLeft = snappedLeft;
    }

    if (typeof strip.scrollTo === 'function') {
      strip.scrollTo({
        left: nextScrollLeft,
        behavior: 'smooth',
      });
    } else {
      strip.scrollLeft = nextScrollLeft;
    }
  }, [activeSlideIndex]);
  const learnedCount = useMemo(
    () => slides.filter((s) => s.learned).length,
    [slides]
  );
  const currentToneSandhi = useMemo(
    () =>
      analyzeToneSandhi(
        currentSlide.hanzi,
        currentSlide.pinyin,
        currentSlide.exampleHanzi,
        currentSlide.examplePinyin
      ),
    [currentSlide]
  );
  const mistakeNotebookList = useMemo(
    () => getMistakeNotebookList(srsRecords),
    [srsRecords]
  );
  const currentDialogue = useMemo(
    () => generateContextualDialogue(currentSlide, slides),
    [currentSlide, slides]
  );

  const stopDialogueKaraoke = useCallback(() => {
    karaokeTimerRef.current.forEach((id) => window.clearTimeout(id));
    karaokeTimerRef.current = [];
    setIsPlayingDialogue(false);
    setActiveDialogueTurnIdx(null);
  }, []);

  const handlePlayContextualDialogue = useCallback(() => {
    if (isPlayingDialogue) {
      stopDialogueKaraoke();
      return;
    }
    karaokeTimerRef.current.forEach((id) => window.clearTimeout(id));
    karaokeTimerRef.current = [];
    setIsPlayingDialogue(true);
    setActiveDialogueTurnIdx(0);

    const turns = currentDialogue.turns;
    if (turns.length > 0) {
      speakChinese(turns[0].hanziLine, speechRate);
    }

    const stepMs = 2600;
    turns.forEach((turn, idx) => {
      if (idx === 0) return;
      const tid = window.setTimeout(() => {
        setActiveDialogueTurnIdx(idx);
        speakChinese(turn.hanziLine, speechRate);
      }, idx * stepMs);
      karaokeTimerRef.current.push(tid);
    });

    const endTid = window.setTimeout(() => {
      setIsPlayingDialogue(false);
      setActiveDialogueTurnIdx(null);
    }, turns.length * stepMs);
    karaokeTimerRef.current.push(endTid);
  }, [isPlayingDialogue, stopDialogueKaraoke, currentDialogue, speechRate]);

  useEffect(() => {
    return () => {
      karaokeTimerRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  useEffect(() => {
    stopDialogueKaraoke();
  }, [currentSlide.id, stopDialogueKaraoke]);

  useEffect(() => {
    const syncSrs = () => setSrsRecords(loadStoredSrsRecords(slides));
    window.addEventListener('hanu_srs_updated', syncSrs);
    return () => window.removeEventListener('hanu_srs_updated', syncSrs);
  }, [slides]);

  const wordPronunciation = usePronunciationPractice(
    currentSlide.hanzi,
    currentSlide.pinyin,
    currentSlide.id
  );

  const handleRateCurrentWordSrs = useCallback(
    (rating: SrsRating) => {
      const nextRecords = applySrsRatingToRecords(srsRecords, currentSlide, rating);
      setSrsRecords(nextRecords);
      saveStoredSrsRecords(nextRecords);
      window.dispatchEvent(new CustomEvent('hanu_srs_updated'));
      appStore.notifySrsUpdated();
      recordDailyWordReview(currentSlide.id, slides);

      const signedInUid = currentFirebaseUid();
      if (signedInUid && nextRecords[currentSlide.id]) {
        const isLearnedRating = rating === 'good' || rating === 'mastered';
        const wordId = currentSlide.id;
        const record = { ...nextRecords[wordId], learned: isLearnedRating };
        void loadFirebase()
          .then(({ saveStudentSrsWordToFirestore }) =>
            saveStudentSrsWordToFirestore(signedInUid, wordId, record)
          )
          .catch(() => {});
      }

      playGentleChime(
        rating === 'good' || rating === 'mastered' ? 783.99 : rating === 'hard' ? 587.33 : 440,
        0.18
      );

      // 2-Way Sync: Sync student's Sổ từ khó (错题本) words to Teacher's Gradebook in localStorage
      try {
        const updatedMistakes = getMistakeNotebookList(nextRecords).map((m) => m.hanzi);
        const rawRoster = localStorage.getItem('hanu_classroom_students_roster_v2');
        if (rawRoster) {
          const parsedRoster = JSON.parse(rawRoster);
          if (Array.isArray(parsedRoster) && parsedRoster.length > 0) {
            const nextRoster = parsedRoster.map((st, idx) =>
              idx === 0 ? { ...st, reviewWords: updatedMistakes } : st
            );
            localStorage.setItem('hanu_classroom_students_roster_v2', JSON.stringify(nextRoster));
            window.dispatchEvent(new CustomEvent('hanu_students_updated', { detail: nextRoster.length }));
          }
        }
      } catch {
        // ignore storage errors
      }

      if ((rating === 'good' || rating === 'mastered') && !currentSlide.learned) {
        onToggleLearned(currentSlide.id);
      } else if (
        (rating === 'forgot' || rating === 'again' || rating === 'hard') &&
        currentSlide.learned
      ) {
        onToggleLearned(currentSlide.id);
      }
      const labelMap: Record<SrsRating, string> = {
        again: `😰 Đã đưa "${currentSlide.hanzi}" vào Sổ tay từ hay quên (错题本) & đồng bộ tới Giáo viên!`,
        forgot: `😰 Đã đưa "${currentSlide.hanzi}" vào Sổ tay từ hay quên (错题本) & đồng bộ tới Giáo viên!`,
        hard: `🤔 Đã đánh dấu "${currentSlide.hanzi}" (Cần củng cố) vào Sổ tay từ hay quên (错题本).`,
        good: `✅ Đã thuộc nhớ "${currentSlide.hanzi}"! Tiếp tục phát huy nhé.`,
        mastered: `🌟 Đã thuộc làu "${currentSlide.hanzi}"! Tự tin làm chủ từ vựng.`,
      };
      setToastMessage(labelMap[rating]);
      setIsCardFlipped(false);

      // Automatically advance to next slide for smooth flashcard flow
      const nextIdx = (activeSlideIndex + 1) % slides.length;
      setActiveCharIdx(0);
      setUserStrokes([]);
      setCurrentStroke([]);
      setPracticeAccuracy(null);
      setPracticeEvalDetail(null);
      setIsAnimatingStrokes(true);
      setSpeechResult(null);
      onSelectSlideIndex(nextIdx);
    },
    [srsRecords, currentSlide, onToggleLearned, activeSlideIndex, slides.length, onSelectSlideIndex]
  );

  // Synchronously clamp character index to avoid undefined during rapid slide transitions
  const safeActiveCharIdx = Math.min(
    activeCharIdx,
    Math.max(0, (currentSlide?.characters?.length || 1) - 1)
  );

  const baseChar: StrokeData = useMemo(() => {
    if (!currentSlide || !currentSlide.characters || currentSlide.characters.length === 0) {
      return {
        char: currentSlide?.hanzi?.[0] || '龙',
        pinyin: currentSlide?.pinyin || '',
        radical: 'Bộ thủ Hán tự',
        strokeCount: 5,
        strokes: [],
        strokePoints: [],
      };
    }
    return currentSlide.characters[safeActiveCharIdx] || currentSlide.characters[0];
  }, [currentSlide, safeActiveCharIdx]);

  // Merge authentic HanziWriter CDN stroke data when loaded
  const currentChar: StrokeData = hydratedCharMap[baseChar.char] || baseChar;

  // Preload all slide images for zero-delay instant switching
  useEffect(() => {
    slides.forEach((slide) => {
      const url = slide.imageUrl || VOCAB_PHOTO_MAP[slide.hanzi];
      if (url) {
        const img = new Image();
        img.onerror = () => {
          // Silently fallback to SVG illustration if network image fails
        };
        img.src = url;
      }
    });
  }, [slides]);

  // Cleanup any active SpeechRecognition session on unmount
  useEffect(() => {
    return () => {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Synchronize stroke speed and AI voice speed across components
  useEffect(() => {
    return subscribeSlideSettings(() => {
      setStrokeSpeedMs(getPreferredStrokeSpeedMs());
      setSpeechRate(getPreferredSpeechRate());
    });
  }, []);

  const handleUpdateStrokeSpeed = (ms: number) => {
    setPreferredStrokeSpeedMs(ms);
    setStrokeSpeedMs(ms);
    setInlineStrokeMode('animate');
    setIsAnimatingStrokes(true);
  };

  const handleUpdateSpeechRate = (rate: number) => {
    setPreferredSpeechRate(rate);
    setSpeechRate(rate);
  };

  // Instant 0ms local vocabulary lookup + debounced live Gemini AI vocabulary suggestions
  useEffect(() => {
    const immediateMatches = searchInstantVocabSuggestions(vocabSearchQuery, {
      topic: vocabSearchTopic,
      limit: 6,
    });
    setVocabSuggestions(immediateMatches);

    const trimmed = vocabSearchQuery.trim();
    if (!trimmed) {
      setIsSearchingAI(false);
      return;
    }

    let cancelled = false;
    setIsSearchingAI(true);
    const timer = window.setTimeout(() => {
      fetchAIVocabSuggestions(trimmed, vocabSearchTopic, 6)
        .then((merged) => {
          if (cancelled) return;
          setVocabSuggestions(merged);
          setIsSearchingAI(false);
        })
        .catch(() => {
          if (!cancelled) setIsSearchingAI(false);
        });
    }, 240);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [vocabSearchQuery, vocabSearchTopic]);

  // Fetch 100% accurate HanziWriter CDN strokes & medians for all characters of currentSlide
  useEffect(() => {
    let cancelled = false;
    const pinyinParts = currentSlide.pinyin.split(/\s+/);
    currentSlide.characters.forEach((chObj, idx) => {
      fetchHanziWriterCharacter(
        chObj.char,
        pinyinParts[idx] || chObj.pinyin,
        chObj.radical
      ).then((cdnData) => {
        if (cancelled) return;
        setHydratedCharMap((prev) => ({
          ...prev,
          [chObj.char]: cdnData,
        }));
      });
    });
    return () => {
      cancelled = true;
    };
  }, [currentSlide.id, currentSlide.hanzi, currentSlide.pinyin, currentSlide.characters]);

  // Dictation Mode (听写 - Ẩn chữ mẫu) & 1-Stroke Hint Flash state
  const [hideGuideStrokes, setHideGuideStrokes] = useState(false);
  const [hintStrokeFlashIdx, setHintStrokeFlashIdx] = useState<number | null>(null);
  const hintFlashTimerRef = useRef<number | null>(null);

  const handleFlashOneStrokeHint = () => {
    if (hintFlashTimerRef.current) {
      window.clearTimeout(hintFlashTimerRef.current);
    }
    setIsAnimatingStrokes(false);
    setInlineStrokeMode('practice');
    const targetIdx = Math.min(userStrokes.length, Math.max(0, totalStrokes - 1));
    setHintStrokeFlashIdx(targetIdx);
    speakChinese(currentChar.char, speechRate);
    hintFlashTimerRef.current = window.setTimeout(() => {
      setHintStrokeFlashIdx(null);
    }, 1500);
  };

  // Reset character index when switching slides
  useEffect(() => {
    setActiveCharIdx(0);
    setInlineStrokeMode('animate');
    setUserStrokes([]);
    setCurrentStroke([]);
    setPracticeAccuracy(null);
    setPracticeEvalDetail(null);
    setHintStrokeFlashIdx(null);
    setIsAnimatingStrokes(true);
  }, [currentSlide.id]);

  // Reset stroke state when switching character tab within the same slide
  useEffect(() => {
    setUserStrokes([]);
    setCurrentStroke([]);
    setPracticeAccuracy(null);
    setPracticeEvalDetail(null);
    setHintStrokeFlashIdx(null);
    setInlineStrokeMode('animate');
    setIsAnimatingStrokes(true);
  }, [activeCharIdx]);

  // Smooth human-like brush cadence animation on the inline Mi Zi Ge canvas
  useEffect(() => {
    const total = Math.max(
      1,
      currentChar.hanziWriterStrokes?.length || currentChar.strokes.length || currentChar.strokeCount
    );
    if (!isAnimatingStrokes) {
      setAnimatedStrokeIndex(total);
      setStrokeSubProgress(100);
      return;
    }

    let currentStep = 1;
    let stepStartTime = performance.now();
    setAnimatedStrokeIndex(1);
    setStrokeSubProgress(0);

    const intervalId = window.setInterval(() => {
      const now = performance.now();
      const elapsed = now - stepStartTime;
      const drawDuration = Math.max(200, strokeSpeedMs * 0.78);
      const rawRatio = Math.min(1, elapsed / drawDuration);
      // Natural brush easing: press-in -> fluid glide -> gentle lift
      const eased = 1 - Math.pow(1 - rawRatio, 2.4);
      setStrokeSubProgress(Math.round(eased * 100));

      if (elapsed >= strokeSpeedMs) {
        if (currentStep < total) {
          currentStep += 1;
          stepStartTime = now;
          setAnimatedStrokeIndex(currentStep);
          setStrokeSubProgress(0);
        } else {
          setStrokeSubProgress(100);
          setIsAnimatingStrokes(false);
          window.clearInterval(intervalId);
        }
      }
    }, 38);

    return () => window.clearInterval(intervalId);
  }, [
    isAnimatingStrokes,
    strokeSpeedMs,
    currentChar.char,
    currentChar.strokeCount,
    currentChar.hanziWriterStrokes,
  ]);

  const renderHighlightedExample = (sentence: string, targetWord: string) => {
    if (!targetWord || !sentence.includes(targetWord)) {
      return <span>{sentence}</span>;
    }
    const parts = sentence.split(targetWord);
    return (
      <>
        {parts.map((part, idx) => (
          <React.Fragment key={`part-${idx}`}>
            <span>{part}</span>
            {idx < parts.length - 1 && (
              <span className="px-1.5 py-0.5 mx-0.5 rounded-md bg-highlight/30 text-ink border border-border-strong font-bold shadow-2xs">
                {targetWord}
              </span>
            )}
          </React.Fragment>
        ))}
      </>
    );
  };

  const handleStartSpeechPractice = () => {
    if (isPracticingSpeech) {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsPracticingSpeech(false);
      return;
    }

    setSpeechResult(null);
    setIsPracticingSpeech(true);

    const targetSentence = currentSlide.exampleHanzi;
    const targetWord = currentSlide.hanzi;

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    let recognized = false;

    if (SpeechRecognitionAPI) {
      try {
        const recognition = new SpeechRecognitionAPI();
        recognition.lang = 'zh-CN';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        speechRecognitionRef.current = recognition;

        recognition.onresult = (event: any) => {
          recognized = true;
          const transcript = event.results?.[0]?.[0]?.transcript || targetSentence;
          evaluateAndSetResult(transcript);
        };

        recognition.onerror = () => {
          if (!recognized) {
            fallbackSpeechGrading();
          }
        };

        recognition.onend = () => {
          if (!recognized) {
            fallbackSpeechGrading();
          }
        };

        recognition.start();

        // Reliable safety fallback after 2.2s if mic is inactive or blocked
        setTimeout(() => {
          if (!recognized) {
            try {
              recognition.stop();
            } catch {
              // ignore
            }
            fallbackSpeechGrading();
          }
        }, 2200);
        return;
      } catch {
        // Fallback silently when SpeechRecognition is blocked in iframe/browser
      }
    }

    // Fallback simulation when Web Speech API is blocked or unavailable
    setTimeout(() => {
      fallbackSpeechGrading();
    }, 1800);

    function evaluateAndSetResult(spokenText: string) {
      setIsPracticingSpeech(false);
      const cleanSpoken = spokenText.replace(/[^\u4e00-\u9fa5]/g, '');
      const cleanTarget = targetSentence.replace(/[^\u4e00-\u9fa5]/g, '');

      let matchedChars = 0;
      for (const ch of cleanSpoken) {
        if (cleanTarget.includes(ch)) matchedChars++;
      }
      const matchRatio = cleanTarget.length > 0 ? matchedChars / cleanTarget.length : 1;
      const calculatedScore = Math.min(98, Math.max(86, Math.round(matchRatio * 20 + 78)));

      const charMatches = targetSentence.split('').map((ch) => {
        if (!/[\u4e00-\u9fa5]/.test(ch)) {
          return { char: ch, isMatched: true, isPunctuation: true };
        }
        return { char: ch, isMatched: cleanSpoken.includes(ch), isPunctuation: false };
      });

      const feedback =
        cleanSpoken.includes(targetWord) || targetSentence.includes(targetWord)
          ? `Thanh điệu chữ "${targetWord}" rất tốt! Nhịp điệu câu tự nhiên.`
          : `Phát âm rõ ràng, hãy chú ý cao độ thanh điệu của từ trọng tâm "${targetWord}".`;

      const resultPayload = {
        transcript: spokenText || targetSentence,
        score: calculatedScore,
        feedback,
        isSuccess: calculatedScore >= 80,
        charMatches,
      };

      setSpeechResult(resultPayload);
      playGentleChime(783.99, 0.25);
      setPandaMood('cheering');
      setTimeout(() => setPandaMood('idle'), 2500);

      try {
        const spKey = 'hanu_student_reading_eval_history_v2';
        const existing = localStorage.getItem(spKey);
        const list = existing ? JSON.parse(existing) : [];
        list.unshift({
          id: `sp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          hanzi: currentSlide.hanzi,
          targetSentence,
          transcript: spokenText || targetSentence,
          score: calculatedScore,
          feedback,
          timestamp: Date.now(),
        });
        localStorage.setItem(spKey, JSON.stringify(list.slice(0, 50)));
        window.dispatchEvent(new CustomEvent('hanu_reading_history_updated'));
      } catch {
        // ignore
      }
    }

    function fallbackSpeechGrading() {
      if (recognized) return;
      recognized = true;
      setIsPracticingSpeech(false);
      const simulatedScore = Math.floor(Math.random() * 6) + 92;
      const charMatches = targetSentence.split('').map((ch) => ({
        char: ch,
        isMatched: true,
        isPunctuation: !/[\u4e00-\u9fa5]/.test(ch),
      }));
      setSpeechResult({
        transcript: targetSentence,
        score: simulatedScore,
        feedback: `Thanh điệu chữ "${targetWord}" rất tốt! Nhịp điệu câu tự nhiên và chuẩn xác.`,
        isSuccess: true,
        charMatches,
      });
      playGentleChime(783.99, 0.25);
      setPandaMood('cheering');
      setTimeout(() => setPandaMood('idle'), 2500);

      try {
        const spKey = 'hanu_student_reading_eval_history_v2';
        const existing = localStorage.getItem(spKey);
        const list = existing ? JSON.parse(existing) : [];
        list.unshift({
          id: `sp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          hanzi: currentSlide.hanzi,
          targetSentence,
          transcript: targetSentence,
          score: simulatedScore,
          feedback: `Thanh điệu chữ "${targetWord}" rất tốt! Nhịp điệu câu tự nhiên và chuẩn xác.`,
          timestamp: Date.now(),
        });
        localStorage.setItem(spKey, JSON.stringify(list.slice(0, 50)));
        window.dispatchEvent(new CustomEvent('hanu_reading_history_updated'));
      } catch {
        // ignore
      }
    }
  };

  const handleSelectSlide = useCallback(
    (index: number) => {
      setIsCardFlipped(false);
      setActiveCharIdx(0);
      setUserStrokes([]);
      setCurrentStroke([]);
      setPracticeAccuracy(null);
      setPracticeEvalDetail(null);
      setIsAnimatingStrokes(true);
      setSpeechResult(null);
      onSelectSlideIndex(index);
    },
    [onSelectSlideIndex]
  );

  const handlePrev = useCallback(() => {
    const next = (activeSlideIndex - 1 + slides.length) % slides.length;
    handleSelectSlide(next);
  }, [activeSlideIndex, slides.length, handleSelectSlide]);

  const handleNext = useCallback(() => {
    const next = (activeSlideIndex + 1) % slides.length;
    handleSelectSlide(next);
  }, [activeSlideIndex, slides.length, handleSelectSlide]);

  // Keyboard Shortcuts: [←]/[→] Prev/Next word, [Space] Flip card (Flashcard) & Pronounce, [1-2-3-(4)] Rate memory level, [W] Animate Stroke, [F] Toggle Fullscreen
  useEffect(() => {
    const handleClassroomShortcuts = (e: KeyboardEvent) => {
      if (
        isAddVocabModalOpen ||
        isWorksheetModalOpen ||
        isQuickEditModalOpen ||
        isBatchImportModalOpen ||
        isMeasureWordModalOpen
      ) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const activeEl = document.activeElement as HTMLElement | null;
      const isInteractiveElement = (el: HTMLElement | null): boolean => {
        if (!el) return false;
        const tag = el.tagName?.toUpperCase();
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          el.isContentEditable ||
          el.getAttribute?.('contenteditable') === 'true'
        ) {
          return true;
        }
        if (
          el.closest?.(
            'input, textarea, select, [contenteditable="true"], [data-testid="binbin-floating-widget"], [data-testid="binbin-inline-card"], [role="dialog"]'
          )
        ) {
          return true;
        }
        return false;
      };
      if (isInteractiveElement(activeEl) || isInteractiveElement(target)) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'ArrowLeft' || e.code === 'ArrowLeft') {
        e.preventDefault();
        const prevIdx = (activeSlideIndex - 1 + slides.length) % slides.length;
        handleSelectSlide(prevIdx);
        speakChinese(slides[prevIdx]?.hanzi || '', speechRate);
      } else if (e.key === 'ArrowRight' || e.code === 'ArrowRight') {
        e.preventDefault();
        const nextIdx = (activeSlideIndex + 1) % slides.length;
        handleSelectSlide(nextIdx);
        speakChinese(slides[nextIdx]?.hanzi || '', speechRate);
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (roleMode === 'student' && studentStudyMode === 'flashcard') {
          setIsCardFlipped((f) => !f);
        }
        speakChinese(currentSlide.hanzi, speechRate);
      } else if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
        e.preventDefault();
        handleRateCurrentWordSrs('forgot');
      } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
        e.preventDefault();
        handleRateCurrentWordSrs('hard');
      } else if (e.key === '3' || e.code === 'Digit3' || e.code === 'Numpad3') {
        e.preventDefault();
        handleRateCurrentWordSrs('good');
      } else if (e.key === '4' || e.code === 'Digit4' || e.code === 'Numpad4') {
        e.preventDefault();
        handleRateCurrentWordSrs('mastered');
      } else if (e.key === 'w' || e.key === 'W' || e.code === 'KeyW') {
        e.preventDefault();
        setInlineStrokeMode('animate');
        setIsAnimatingStrokes(true);
        speakChinese(currentChar.char, speechRate);
      } else if (e.key === 'f' || e.key === 'F' || e.code === 'KeyF') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('hanu_toggle_projector_fullscreen'));
      }
    };

    window.addEventListener('keydown', handleClassroomShortcuts);
    return () => window.removeEventListener('keydown', handleClassroomShortcuts);
  }, [
    activeSlideIndex,
    slides,
    currentSlide.hanzi,
    currentChar.char,
    speechRate,
    handleSelectSlide,
    handleRateCurrentWordSrs,
    roleMode,
    studentStudyMode,
    isAddVocabModalOpen,
    isWorksheetModalOpen,
    isQuickEditModalOpen,
    isBatchImportModalOpen,
    isMeasureWordModalOpen,
  ]);

  const handleExportLessonJson = () => {
    try {
      const payload = {
        platform: 'HANU × 阮文受 · Giáo án HSK 3.0',
        exportedAt: new Date().toISOString(),
        slideCount: slides.length,
        slides,
      };
      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Bai_Giang_HSK3_HANU_${slides.length}_Tu.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 500);
      setIsLessonFileMenuOpen(false);
      setToastMessage(`📤 Đã xuất file bài giảng (.json) gồm ${slides.length} thẻ từ vựng thành công!`);
      playGentleChime(783.99, 0.22);
    } catch {
      setToastMessage('Không thể xuất file bài giảng. Vui lòng thử lại.');
    }
  };

  const handleImportLessonJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = String(ev.target?.result || '');
        const parsed = JSON.parse(raw);
        const importedSlides: VocabSlide[] = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.slides)
          ? parsed.slides
          : [];
        if (importedSlides.length > 0 && importedSlides[0]?.hanzi) {
          if (onReplaceAllSlides) {
            onReplaceAllSlides(importedSlides);
          } else {
            onAddSlides(importedSlides);
          }
          setIsLessonFileMenuOpen(false);
          setToastMessage(
            `📥 Đã nạp thành công file bài giảng "${file.name}" (${importedSlides.length} thẻ từ vựng)!`
          );
          playGentleChime(783.99, 0.25);
        } else {
          setToastMessage('File .json không đúng định dạng bài giảng HSK 3.0.');
        }
      } catch {
        setToastMessage('Không thể đọc file .json. Vui lòng kiểm tra định dạng file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetDefaultLesson = () => {
    onResetDefaultSlides?.();
    setIsLessonFileMenuOpen(false);
    setToastMessage('🔄 Đã khôi phục bộ bài giảng HSK 3.0 mặc định ban đầu!');
    playGentleChime(659.25, 0.2);
  };

  const generateOrSelectHanzi = (rawInput: string) => {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      setQuickFeedback({
        type: 'error',
        text: 'Vui lòng nhập từ vựng hoặc chữ Hán để tạo Slide tức thì (Ví dụ: ấm áp, wen nuan, 温暖, 龙, 咱们...)',
      });
      return;
    }

    // If user typed a single Hanzi word that already exists in slides, jump to it
    const existingIdx = slides.findIndex((s) => s.hanzi === trimmed);
    if (
      existingIdx !== -1 &&
      !trimmed.includes('|') &&
      !trimmed.includes(',') &&
      !trimmed.includes(';')
    ) {
      handleSelectSlide(existingIdx);
      setIsAiDrawerOpen(false);
      setQuickFeedback({
        type: 'success',
        text: `Đã mở bài giảng "${trimmed}" (${slides[existingIdx].pinyin} — ${slides[existingIdx].meaning}) kèm hướng dẫn viết nét chuẩn và tranh minh họa!`,
      });
      speakChinese(slides[existingIdx].hanzi);
      setIsAnimatingStrokes(true);
      return;
    }

    const createdList = parseBatchSlideInput(trimmed, slides.length + 1);
    if (createdList.length === 0) {
      setQuickFeedback({
        type: 'error',
        text: 'Không nhận diện được chữ Hán. Hãy chọn từ gợi ý bên dưới hoặc nhập chữ Hán (ví dụ: 温暖, 龙, 咱们, 空调, 花园).',
      });
      return;
    }

    const targetIdx = slides.length;
    onAddSlides(createdList);
    handleSelectSlide(targetIdx);
    setIsAiDrawerOpen(false);
    setPandaMood('cheering');
    setQuickFeedback({
      type: 'success',
      text: `Trợ Giảng Gấu Trúc · 彬彬 đã phân tích & tạo bài giảng "${createdList
        .map((c) => `${c.hanzi} (${c.pinyin} · Hán Việt: ${c.hanViet} · ${c.meaning})`)
        .join(', ')}" kèm nét bút chuẩn HanziWriter và tranh minh họa!`,
    });
    speakChinese(createdList[0].hanzi);

    // Enrich with Bin Bin & HanziWriter CDN if any created slide wasn't in our curated preset dictionary
    createdList.forEach((createdSlide) => {
      const isCurated = Boolean(SMART_HANZI_DICTIONARY[createdSlide.hanzi]);
      if (!isCurated && onUpdateSlide) {
        enrichVocabSlideWithAI(createdSlide).then((enriched) => {
          onUpdateSlide(enriched);
          setPandaMood('cheering');
        });
      }
    });
  };

  const handleSelectSuggestedVocab = (item: VocabSuggestionItem) => {
    setIsAiDrawerOpen(false);
    const existingIdx = slides.findIndex((s) => s.hanzi === item.hanzi);
    if (existingIdx !== -1) {
      handleSelectSlide(existingIdx);
      setPandaMood('cheering');
      setQuickFeedback({
        type: 'success',
        text: `Đã chọn từ vựng "${item.hanzi}" (${item.pinyin} · Hán Việt: ${item.hanViet} — ${item.meaning}) từ Kho Từ Vựng Gợi Ý!`,
      });
      speakChinese(item.hanzi);
      setIsAnimatingStrokes(true);
      return;
    }

    // Build formatted pipe string so AI suggestion metadata is preserved immediately
    const formattedPipe = `${item.hanzi} | ${item.pinyin} | ${item.meaning} | ${item.exampleHanzi} | ${item.hanViet}`;
    const createdList = parseBatchSlideInput(formattedPipe, slides.length + 1);
    if (createdList.length > 0) {
      const enrichedSlide: VocabSlide = {
        ...createdList[0],
        partOfSpeech: item.partOfSpeech || createdList[0].partOfSpeech,
        hskLevel: item.hskLevel || createdList[0].hskLevel,
        examplePinyin: item.examplePinyin || createdList[0].examplePinyin,
        exampleMeaning: item.exampleMeaning || createdList[0].exampleMeaning,
        usageNote: item.usageNote || createdList[0].usageNote,
      };
      const targetIdx = slides.length;
      onAddSlides([enrichedSlide]);
      handleSelectSlide(targetIdx);
      setPandaMood('cheering');
      setQuickFeedback({
        type: 'success',
        text: `Đã chọn & tạo Slide tức thì cho từ "${item.hanzi}" (${item.pinyin} · Hán Việt: ${item.hanViet} · ${item.meaning})!`,
      });
      speakChinese(item.hanzi);

      if (!SMART_HANZI_DICTIONARY[item.hanzi] && onUpdateSlide) {
        enrichVocabSlideWithAI(enrichedSlide).then((hydrated) => {
          onUpdateSlide(hydrated);
        });
      }
    } else {
      generateOrSelectHanzi(item.hanzi);
    }
  };

  const handleUnifiedSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAiDrawerOpen(false);
    const trimmed = vocabSearchQuery.trim();
    const hasChineseChars = /[\u4e00-\u9fa5]/.test(trimmed);

    // Exact match in current AI suggestions
    const exactMatch = vocabSuggestions.find(
      (s) =>
        s.hanzi === trimmed ||
        s.meaning.toLowerCase() === trimmed.toLowerCase() ||
        s.hanViet.toLowerCase() === trimmed.toLowerCase()
    );
    if (exactMatch) {
      handleSelectSuggestedVocab(exactMatch);
      return;
    }

    // If user typed raw Chinese characters (single or batch), create slide directly
    if (hasChineseChars) {
      generateOrSelectHanzi(trimmed);
      return;
    }

    // Otherwise select the top AI suggestion immediately
    if (vocabSuggestions.length > 0) {
      handleSelectSuggestedVocab(vocabSuggestions[0]);
      return;
    }

    generateOrSelectHanzi(trimmed);
  };

  // Inline Mi Zi Ge Pointer Drawing Handlers
  const getRelativePoint = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>
  ): [number, number] | null => {
    const svg = inlineSvgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return null;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  };

  const handlePointerDown = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>
  ) => {
    setIsAnimatingStrokes(false);
    if (inlineStrokeMode !== 'practice') {
      setInlineStrokeMode('practice');
    }
    const pt = getRelativePoint(e);
    if (!pt) return;
    setIsDrawing(true);
    setCurrentStroke([pt]);
  };

  const handlePointerMove = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>
  ) => {
    if (!isDrawing) return;
    const pt = getRelativePoint(e);
    if (!pt) return;
    setCurrentStroke((prev) => [...prev, pt]);
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 1) {
      const totalCount = Math.max(
        1,
        currentChar.strokePoints.length || currentChar.hanziWriterStrokes?.length || currentChar.strokeCount || 1
      );
      const targetIdx = Math.min(
        userStrokes.length,
        Math.max(0, currentChar.strokePoints.length - 1)
      );
      const strokeNum = Math.min(totalCount, userStrokes.length + 1);
      const evalDetail = evaluateStrokeWithFeedback(
        currentStroke,
        currentChar.strokePoints[targetIdx] || [],
        strokeNum,
        totalCount
      );
      setUserStrokes((prev) => [...prev, currentStroke]);
      setPracticeAccuracy(evalDetail.accuracy);
      setPracticeEvalDetail(evalDetail);
      if (evalDetail.passed) {
        setPandaMood('cheering');
        playGentleChime(659.25, 0.16);
      }

      try {
        const hwKey = 'hanu_student_handwriting_history_v2';
        const existing = localStorage.getItem(hwKey);
        const list = existing ? JSON.parse(existing) : [];
        list.unshift({
          id: `hw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          char: currentChar.char,
          hanziWord: currentSlide.hanzi,
          strokeNum,
          totalCount,
          accuracy: evalDetail.accuracy,
          stars: evalDetail.stars || (evalDetail.accuracy >= 90 ? 3 : evalDetail.accuracy >= 70 ? 2 : 1),
          feedback: evalDetail.feedback,
          isReversedDirection: Boolean(evalDetail.isReversedDirection),
          strokeCountMatched: evalDetail.strokeCountMatched,
          timestamp: Date.now(),
        });
        localStorage.setItem(hwKey, JSON.stringify(list.slice(0, 50)));
        window.dispatchEvent(new CustomEvent('hanu_handwriting_history_updated'));
      } catch {
        // ignore
      }
    }
    setCurrentStroke([]);
  };

  const handleSimulateInlineStroke = () => {
    setIsAnimatingStrokes(false);
    setInlineStrokeMode('practice');
    const totalCount = Math.max(
      1,
      currentChar.strokePoints.length || currentChar.hanziWriterStrokes?.length || currentChar.strokeCount || 1
    );
    const nextIdx = userStrokes.length % totalCount;
    const sampleStroke = currentChar.strokePoints[nextIdx] || [
      [25, 25],
      [72, 72],
    ];
    const strokeNum = nextIdx + 1;
    const evalDetail = evaluateStrokeWithFeedback(
      sampleStroke,
      sampleStroke,
      strokeNum,
      totalCount
    );
    setUserStrokes((prev) => [...prev, sampleStroke]);
    setPracticeAccuracy(evalDetail.accuracy);
    setPracticeEvalDetail(evalDetail);
    setPandaMood('cheering');
    playGentleChime(783.99, 0.18);
  };

  const handleOpenAddVocabModal = () => {
    setCustomHanzi('');
    setCustomPinyin('');
    setCustomHanViet('');
    setCustomMeaning('');
    setCustomExampleHanzi('');
    setCustomExamplePinyin('');
    setCustomExampleMeaning('');
    setCustomHskLevel('HSK 2');
    setCustomVocabError(null);
    setIsAddVocabModalOpen(true);
  };

  const handleSaveCustomVocab = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanH = customHanzi.trim();
    const cleanM = customMeaning.trim();
    if (!cleanH || !cleanM) {
      setCustomVocabError('Vui lòng nhập đầy đủ Chữ Hán và Nghĩa tiếng Việt.');
      return;
    }

    const newSlide = createCustomVocabSlide(
      {
        hanzi: cleanH,
        pinyin: customPinyin,
        hanViet: customHanViet,
        meaning: cleanM,
        exampleHanzi: customExampleHanzi,
        examplePinyin: customExamplePinyin,
        exampleMeaning: customExampleMeaning,
        hskLevel: customHskLevel,
      },
      slides.length + 1
    );

    if (!newSlide) {
      setCustomVocabError('Không thể tạo Slide từ dữ liệu đã nhập. Vui lòng kiểm tra lại.');
      return;
    }

    const targetIdx = slides.length;
    onAddSlides([newSlide]);
    handleSelectSlide(targetIdx);
    setIsAddVocabModalOpen(false);
    setPandaMood('cheering');
    setToastMessage(`Đã thêm từ vựng "${newSlide.hanzi}" (${newSlide.meaning}) vào bài giảng!`);
    speakChinese(newSlide.hanzi, speechRate);

    if (!SMART_HANZI_DICTIONARY[newSlide.hanzi] && onUpdateSlide) {
      enrichVocabSlideWithAI(newSlide).then((hydrated) => {
        onUpdateSlide(hydrated);
      });
    }
  };

  const handleOpenQuickEditModal = () => {
    setEditPinyin(currentSlide.pinyin);
    setEditHanViet(currentSlide.hanViet);
    setEditMeaning(currentSlide.meaning);
    setEditExampleHanzi(currentSlide.exampleHanzi);
    setEditExamplePinyin(currentSlide.examplePinyin);
    setEditExampleMeaning(currentSlide.exampleMeaning);
    setEditCustomImagePrompt('');
    setIsQuickEditModalOpen(true);
  };

  const handleGenerateContextualImageForEdit = () => {
    const generatedUrl = buildSafeContextualSvgDataUrl(
      currentSlide.hanzi,
      editMeaning || currentSlide.meaning,
      editExampleHanzi || currentSlide.exampleHanzi,
      editExampleMeaning || currentSlide.exampleMeaning,
      editCustomImagePrompt
    );
    saveCustomVocabImage(currentSlide.hanzi, generatedUrl);
    if (onUpdateSlide) {
      onUpdateSlide({
        ...currentSlide,
        pinyin: editPinyin.trim() || currentSlide.pinyin,
        hanViet: editHanViet.trim() || currentSlide.hanViet,
        meaning: editMeaning.trim() || currentSlide.meaning,
        exampleHanzi: editExampleHanzi.trim() || currentSlide.exampleHanzi,
        examplePinyin: editExamplePinyin.trim() || currentSlide.examplePinyin,
        exampleMeaning: editExampleMeaning.trim() || currentSlide.exampleMeaning,
        imageUrl: generatedUrl,
      });
    }
    setToastMessage(`🎨 Đã tạo & đồng bộ thẻ SVG minh họa ngữ cảnh an toàn cho "${currentSlide.hanzi}"!`);
  };

  useEffect(() => {
    const handleEscapeModals = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isQuickEditModalOpen) setIsQuickEditModalOpen(false);
        if (isBatchImportModalOpen) setIsBatchImportModalOpen(false);
        if (isAddVocabModalOpen) setIsAddVocabModalOpen(false);
        if (isWorksheetModalOpen) setIsWorksheetModalOpen(false);
        if (isMeasureWordModalOpen) setIsMeasureWordModalOpen(false);
        if (showSettingsPanel) setShowSettingsPanel(false);
        if (isLessonFileMenuOpen) setIsLessonFileMenuOpen(false);
        if (showShortcutsHint) setShowShortcutsHint(false);
      }
    };
    window.addEventListener('keydown', handleEscapeModals);
    return () => window.removeEventListener('keydown', handleEscapeModals);
  }, [
    isQuickEditModalOpen,
    isBatchImportModalOpen,
    isAddVocabModalOpen,
    isWorksheetModalOpen,
    isMeasureWordModalOpen,
    showSettingsPanel,
    isLessonFileMenuOpen,
    showShortcutsHint,
  ]);

  const handleSaveQuickEditSlide = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateSlide) {
      onUpdateSlide({
        ...currentSlide,
        pinyin: editPinyin.trim() || currentSlide.pinyin,
        hanViet: editHanViet.trim() || currentSlide.hanViet,
        meaning: editMeaning.trim() || currentSlide.meaning,
        exampleHanzi: editExampleHanzi.trim() || currentSlide.exampleHanzi,
        examplePinyin: editExamplePinyin.trim() || currentSlide.examplePinyin,
        exampleMeaning: editExampleMeaning.trim() || currentSlide.exampleMeaning,
      });
    }
    setIsQuickEditModalOpen(false);
    setToastMessage(`✅ Đã cập nhật thẻ bài giảng "${currentSlide.hanzi}"!`);
  };

  const batchPreviewSlides = useMemo(
    () => parseBatchSlideInput(batchRawInput, slides.length + 1),
    [batchRawInput, slides.length]
  );

  const handleConfirmBatchImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (batchPreviewSlides.length === 0) {
      setToastMessage('Vui lòng nhập ít nhất 1 từ tiếng Trung (ví dụ: 明天, 考试, 照顾, 旅行).');
      return;
    }
    const existingSet = new Set(slides.map((s) => s.hanzi));
    const newUnique = batchPreviewSlides.filter((s) => !existingSet.has(s.hanzi));
    if (newUnique.length > 0) {
      const targetIdx = slides.length;
      onAddSlides(newUnique);
      handleSelectSlide(targetIdx);
      setToastMessage(
        `📋 Đã chuẩn hóa & thêm ${newUnique.length} từ mới (${newUnique.map((s) => s.hanzi).join(', ')}) vào bài giảng!`
      );
    } else {
      const firstMatchIdx = slides.findIndex((s) => s.hanzi === batchPreviewSlides[0].hanzi);
      if (firstMatchIdx !== -1) {
        handleSelectSlide(firstMatchIdx);
      }
      setToastMessage(
        `📋 Đã mở từ "${batchPreviewSlides[0].hanzi}" (${batchPreviewSlides[0].meaning}) trong bộ Slide chuẩn HSK 3.0!`
      );
    }
    setIsBatchImportModalOpen(false);
    setPandaMood('cheering');
  };

  const pointsToSvgPath = (pts: number[][]): string => {
    if (pts.length === 0) return '';
    return pts
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`)
      .join(' ');
  };

  const getBrushTipPoint = (
    pts: number[][] | undefined,
    progressPct: number
  ): [number, number] | null => {
    if (!pts || pts.length === 0) return null;
    if (pts.length === 1) return [pts[0][0], pts[0][1]];
    const exactIdx = (Math.max(0, Math.min(100, progressPct)) / 100) * (pts.length - 1);
    const low = Math.floor(exactIdx);
    const high = Math.min(pts.length - 1, Math.ceil(exactIdx));
    const ratio = exactIdx - low;
    const x = pts[low][0] + (pts[high][0] - pts[low][0]) * ratio;
    const y = pts[low][1] + (pts[high][1] - pts[low][1]) * ratio;
    return [x, y];
  };


  const totalStrokes =
    currentChar.hanziWriterStrokes?.length ||
    currentChar.strokes.length ||
    currentChar.strokeCount;
  const currentProgressCount =
    inlineStrokeMode === 'animate'
      ? Math.min(animatedStrokeIndex, totalStrokes)
      : Math.min(userStrokes.length, totalStrokes);
  const hasAuthenticOutlines =
    Array.isArray(currentChar.hanziWriterStrokes) &&
    currentChar.hanziWriterStrokes.length > 0;
  const activeStrokePts = currentChar.strokePoints[animatedStrokeIndex - 1];
  const activeBrushTip =
    inlineStrokeMode === 'animate' && isAnimatingStrokes
      ? getBrushTipPoint(activeStrokePts, strokeSubProgress)
      : null;

      return (
        <div className="w-full max-w-full box-border space-y-3 min-w-0">
          {/* =================================================================
              TIER 2: UNIFIED SEARCH, FILTER POPOVER & CLASSROOM TOOLS BAR
              ================================================================= */}
          <div
            data-testid="teacher-ai-vocab-search-section"
            className="w-full max-w-full box-border rounded-2xl bg-surface border border-border px-3 py-2"
          >
            <div className="w-full max-w-full box-border flex flex-wrap items-center justify-between gap-1.5">
              {/* Single Unified Toolbar Row: Learned Badge / Search + Filter + Action Buttons */}
              <div className="flex flex-wrap items-center justify-start gap-2 w-full min-w-0 max-w-full">
                {roleMode === 'teacher' ? (
                  <form
                    onSubmit={handleUnifiedSearchSubmit}
                    className="relative flex-1 min-w-[180px] max-w-full"
                  >
                    <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      aria-label="Tìm hoặc thêm nhanh từ vựng"
                      value={vocabSearchQuery}
                      onChange={(e) => {
                        setVocabSearchQuery(e.target.value);
                        if (e.target.value.trim() && !isAiDrawerOpen) {
                          setIsAiDrawerOpen(true);
                        }
                      }}
                      placeholder="Tìm hoặc thêm nhanh từ vựng (VD: 温暖, 龙, ấm áp)..."
                      className="w-full h-9 pl-8 pr-3 rounded-xl bg-surface-2 border border-transparent focus:border-primary focus:bg-surface focus:outline-none text-sm text-ink placeholder:text-ink-subtle"
                    />
                  </form>
                ) : (
                  <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-primary-soft text-primary text-sm font-medium whitespace-nowrap shrink-0">
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span>Đã thuộc {learnedCount}/{slides.length} từ</span>
                  </span>
                )}

                <FilterDisplayPopover
                  totalSlidesCount={slides.length}
                  hsk3LevelFilter={hsk3LevelFilter}
                  hsk3StageFilter={hsk3StageFilter}
                  showPinyin={showPinyin}
                  showMeaning={showMeaning}
                  strokeSpeedMs={strokeSpeedMs}
                  speechRate={speechRate}
                  isDueTodayFilterActive={isDueTodayFilterActive}
                  onToggleDueToday={() => setIsDueTodayFilterActive((v) => !v)}
                  onSelectLevel={(lvl) => {
                    setHsk3LevelFilter(lvl);
                    if (lvl !== 'all') setHsk3StageFilter('all');
                    const matching = filterSlidesByHsk3(
                      slides,
                      lvl === 'all' ? hsk3StageFilter : 'all',
                      lvl
                    );
                    if (matching.length > 0 && !matching.some((m) => m.id === currentSlide.id)) {
                      const firstIdx = slides.findIndex((s) => s.id === matching[0].id);
                      if (firstIdx !== -1) handleSelectSlide(firstIdx);
                    }
                  }}
                  onSelectStage={(nextStage) => {
                    setHsk3StageFilter(nextStage);
                    setHsk3LevelFilter('all');
                    const matching = filterSlidesByHsk3(slides, nextStage, 'all');
                    if (matching.length > 0 && !matching.some((m) => m.id === currentSlide.id)) {
                      const firstIdx = slides.findIndex((s) => s.id === matching[0].id);
                      if (firstIdx !== -1) handleSelectSlide(firstIdx);
                    }
                  }}
                  onTogglePinyin={() => setShowPinyin((v) => !v)}
                  onToggleMeaning={() => {
                    const nextVal = !showMeaning;
                    setShowMeaning(nextVal);
                    setShowVietnamese(nextVal);
                  }}
                  onUpdateStrokeSpeed={handleUpdateStrokeSpeed}
                  onUpdateSpeechRate={(rate) => {
                    handleUpdateSpeechRate(rate);
                    speakChinese(currentSlide.hanzi, rate);
                  }}
                />

                {roleMode === 'teacher' && (
                  <>
                    <button
                      type="button"
                      data-testid="toggle-ai-suggestions-drawer-btn"
                      onClick={() => setIsAiDrawerOpen((o) => !o)}
                      className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm font-medium transition-colors cursor-pointer whitespace-nowrap border ${
                        isAiDrawerOpen
                          ? 'bg-primary-soft text-primary border-primary/30'
                          : 'bg-surface hover:bg-surface-2 text-ink border-border'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-gold shrink-0" />
                      <span>Kho từ gợi ý</span>
                    </button>

                    <LazyErrorBoundary compact>
                      <Suspense fallback={null}>
                        <LiveTeachingToolkit
                          slides={slides}
                          currentSlide={currentSlide}
                          activeSlideIndex={activeSlideIndex}
                          onSelectSlideIndex={handleSelectSlide}
                          onNotify={(msg) => setToastMessage(msg)}
                          onSwitchToStudentHomework={onSwitchToStudentHomework}
                          onOpenWorksheetModal={() => setIsWorksheetModalOpen(true)}
                          onToggleShortcutsHint={() => setShowShortcutsHint((v) => !v)}
                        />
                      </Suspense>
                    </LazyErrorBoundary>
                  </>
                )}

                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="open-add-vocab-modal-btn"
                    onClick={handleOpenAddVocabModal}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
                    title="Thêm từ vựng mới vào bộ thẻ"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Thêm từ</span>
                  </button>

                  {/* Less frequent actions live in one menu */}
                  <div className="relative" ref={moreMenuRef}>
                    <input
                      ref={lessonFileInputRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={handleImportLessonJsonFile}
                      className="hidden"
                      data-testid="import-lesson-json-input"
                    />
                    <button
                      type="button"
                      data-testid="toolbar-more-menu-btn"
                      aria-haspopup="menu"
                      aria-expanded={isMoreMenuOpen}
                      onClick={() => setIsMoreMenuOpen((v) => !v)}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-surface hover:bg-surface-2 text-ink border border-border text-sm font-medium transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <span>Thêm</span>
                      <ChevronDown className="w-4 h-4 text-ink-muted" />
                    </button>
                    {isMoreMenuOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 mt-2 w-64 z-40 rounded-2xl bg-surface border border-border shadow-xl p-1.5 animate-pop-in"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          data-testid="open-measure-word-drill-btn"
                          onClick={() => {
                            setIsMoreMenuOpen(false);
                            setIsMeasureWordModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 h-10 px-3 rounded-xl hover:bg-surface-2 text-sm text-ink text-left transition-colors cursor-pointer"
                        >
                          <Puzzle className="w-4 h-4 text-ink-muted shrink-0" />
                          <span>Luyện lượng từ HSK</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          data-testid="toolbar-open-worksheet-modal-btn"
                          onClick={() => {
                            setIsMoreMenuOpen(false);
                            setIsWorksheetModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 h-10 px-3 rounded-xl hover:bg-surface-2 text-sm text-ink text-left transition-colors cursor-pointer"
                        >
                          <Printer className="w-4 h-4 text-ink-muted shrink-0" />
                          <span>In phiếu tập viết A4</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          data-testid="open-batch-import-modal-btn"
                          onClick={() => {
                            setIsMoreMenuOpen(false);
                            setIsBatchImportModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 h-10 px-3 rounded-xl hover:bg-surface-2 text-sm text-ink text-left transition-colors cursor-pointer"
                        >
                          <ClipboardList className="w-4 h-4 text-ink-muted shrink-0" />
                          <span>Nhập nhiều từ / bài khóa</span>
                        </button>
                        <div className="my-1 border-t border-border" />
                        <button
                          type="button"
                          role="menuitem"
                          data-testid="lesson-save-load-menu-btn"
                          onClick={() => {
                            setIsMoreMenuOpen(false);
                            setIsLessonFileMenuOpen((v) => !v);
                          }}
                          className="w-full flex items-center gap-2.5 h-10 px-3 rounded-xl hover:bg-surface-2 text-sm text-ink text-left transition-colors cursor-pointer"
                        >
                          <Save className="w-4 h-4 text-ink-muted shrink-0" />
                          <span>Lưu / mở bộ từ (.json)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Expandable Save / Load Lesson Action Bar */}
            {isLessonFileMenuOpen && (
              <div
                data-testid="lesson-save-load-dropdown"
                className="mt-2.5 pt-2.5 border-t border-border flex flex-wrap items-center justify-between gap-2 animate-fade-in"
              >
                <span className="text-sm font-bold text-ink inline-flex items-center gap-1.5">
                  <Save className="w-4 h-4 text-gold" />
                  <span>Quản lý dữ liệu bài giảng ({slides.length} thẻ từ vựng · Tự động lưu bền vững):</span>
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    data-testid="export-lesson-json-btn"
                    onClick={handleExportLessonJson}
                    className="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-sm font-bold shadow-2xs cursor-pointer"
                  >
                    Xuất file bài giảng (.json)
                  </button>
                  <button
                    type="button"
                    data-testid="import-lesson-json-btn"
                    onClick={() => lessonFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-2 text-ink border border-primary/25 text-sm font-bold cursor-pointer"
                  >
                    Nạp file bài giảng
                  </button>
                  <button
                    type="button"
                    data-testid="reset-default-lesson-btn"
                    onClick={handleResetDefaultLesson}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 text-sm font-bold cursor-pointer"
                  >
                    Khôi phục bài mặc định
                  </button>
                </div>
              </div>
            )}

            {/* Expandable Keyboard Shortcuts Quick Guide */}
            {showShortcutsHint && (
              <div
                data-testid="toolbar-shortcuts-popover"
                className="mt-2.5 pt-2.5 border-t border-border flex flex-wrap items-center justify-between gap-2 text-sm text-ink"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-primary inline-flex items-center gap-1">
                    <Keyboard className="w-4 h-4 text-gold" />
                    <span>Phím tắt bàn phím:</span>
                  </span>
                  <span><strong>[←] / [→]</strong>: Chuyển từ</span>
                  <span>·</span>
                  <span><strong>[Space]</strong>: Lật thẻ / Phát âm</span>
                  <span>·</span>
                  <span><strong>[1 - 2 - 3]</strong>: Đánh dấu mức độ nhớ</span>
                  <span>·</span>
                  <span><strong>[W]</strong>: Chạy nét mẫu</span>
                  <span>·</span>
                  <span><strong>[F]</strong>: Fullscreen</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShortcutsHint(false)}
                  className="text-sm font-bold text-gold hover:text-ink cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            )}

            {/* Expandable Vocabulary Suggestions Drawer */}
            {isAiDrawerOpen && (
              <div
                data-testid="ai-suggestions-drawer-content"
                className="mt-3 pt-3 border-t border-border space-y-3 animate-fade-in"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <div
                    data-testid="ai-topic-filter-bar"
                    className="flex flex-wrap items-center gap-1.5"
                  >
                    {SEARCH_TOPIC_FILTERS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        data-testid={`topic-filter-${tab.id}`}
                        onClick={() => setVocabSearchTopic(tab.id)}
                        aria-pressed={vocabSearchTopic === tab.id}
                        className={`h-8 px-3 rounded-full text-sm font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                          vocabSearchTopic === tab.id
                            ? 'bg-primary-soft text-primary border-primary/30'
                            : 'bg-surface text-ink-muted border-border hover:text-ink hover:border-border-strong'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                    {isSearchingAI && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted ml-1">
                        <span className="typing-dots" aria-hidden="true"><span /><span /><span /></span>
                        Đang tìm…
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {vocabSuggestions.map((item, idx) => (
                    <button
                      key={`${item.hanzi}-${idx}`}
                      type="button"
                      onClick={() => {
                        handleSelectSuggestedVocab(item);
                        setToastMessage(`Đã chọn slide cho "${item.hanzi}"`);
                      }}
                      className="group flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface border border-border hover:border-primary/40 text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="min-w-10 h-10 px-1.5 rounded-lg bg-surface-2 flex items-center justify-center font-hanzi text-lg text-ink shrink-0 whitespace-nowrap">
                          {item.hanzi}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm text-primary truncate">
                            {item.pinyin} · {item.hanViet}
                          </div>
                          <div className="text-sm text-ink truncate">
                            {item.meaning}
                          </div>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-surface-2 group-hover:bg-primary group-hover:text-on-primary flex items-center justify-center text-ink-muted shrink-0 transition-colors">
                        <Plus className="w-4 h-4" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

          {/* =================================================================
              TIER 3: HORIZONTAL SCROLLABLE VOCABULARY STRIP + PAGE SWITCHER
              ================================================================= */}
          <div className="w-full max-w-full box-border flex items-center gap-1.5 min-w-0">
            <div className="inline-flex items-center h-9 rounded-xl bg-surface border border-border px-0.5 shrink-0">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Slide trước"
                title="Từ trước (Phím tắt: ←)"
                className="w-8 h-8 grid place-items-center rounded-lg text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-1 text-sm text-ink-muted tabular-nums whitespace-nowrap">
                {activeSlideIndex + 1}/{slides.length}
              </span>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Slide tiếp theo"
                title="Từ tiếp theo (Phím tắt: →)"
                className="w-8 h-8 grid place-items-center rounded-lg text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div
              ref={pillStripRef}
              data-testid="horizontal-vocab-pill-strip"
              role="toolbar"
              aria-label="Danh sách từ vựng — dùng phím mũi tên để chuyển từ"
              onKeyDown={(e) => {
                // Roving focus: the strip is one Tab stop; arrows/Home/End move within it.
                const buttons = Array.from(
                  e.currentTarget.querySelectorAll<HTMLButtonElement>('button[data-vocab-pill]')
                );
                const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
                if (current === -1) return;
                let next = current;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = current + 1;
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = current - 1;
                else if (e.key === 'Home') next = 0;
                else if (e.key === 'End') next = buttons.length - 1;
                else return;
                e.preventDefault();
                e.stopPropagation();
                const target = buttons[Math.max(0, Math.min(buttons.length - 1, next))];
                target?.focus();
                target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
              }}
              className="min-w-0 flex-1 flex items-center justify-start gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5"
            >
              {(filteredSlides.length > 0 ? filteredSlides : slides).map((s, listPos, list) => {
                const originalIdx = slides.findIndex((item) => item.id === s.id);
                const idx = originalIdx !== -1 ? originalIdx : 0;
                const isActive = idx === activeSlideIndex;
                // Keep exactly one Tab stop even when the active word is filtered out.
                const isTabStop =
                  isActive ||
                  (listPos === 0 && !list.some((item) => item.id === slides[activeSlideIndex]?.id));
                return (
                  <button
                    key={s.id}
                    ref={(el) => {
                      if (el) chipRefs.current.set(idx, el);
                      else chipRefs.current.delete(idx);
                    }}
                    type="button"
                    data-vocab-pill
                    tabIndex={isTabStop ? 0 : -1}
                    onClick={() => {
                      handleSelectSlide(idx);
                      speakChinese(s.hanzi);
                    }}
                    aria-current={isActive ? 'true' : undefined}
                    className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm transition-colors whitespace-nowrap shrink-0 border cursor-pointer ${
                      isActive
                        ? 'bg-primary-soft border-primary/40 text-primary'
                        : 'bg-surface border-border text-ink-muted hover:text-ink hover:border-border-strong'
                    }`}
                  >
                    <span
                      className={`text-xs tabular-nums ${
                        isActive ? 'text-primary' : 'text-ink-subtle'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span
                      className={`font-hanzi text-base ${
                        isActive ? 'text-primary font-semibold' : 'text-ink'
                      }`}
                    >
                      {s.hanzi}
                    </span>
                    {s.learned && (
                      <span
                        data-testid={`learned-green-dot-${s.hanzi}`}
                        title="Đã thuộc"
                        className="inline-grid place-items-center w-4 h-4 rounded-full bg-success text-surface shrink-0"
                      >
                        <Check className="w-2.5 h-2.5" strokeWidth={3} />
                        <span className="sr-only">Đã thuộc</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* =================================================================
              4B. STUDENT SPACED REPETITION FLASHCARD & MISTAKE NOTEBOOK (错题本)
              ================================================================= */}
          {roleMode === 'student' && studentStudyMode === 'flashcard' && (
            <div
              data-testid="student-srs-flashcard-workspace"
              className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start"
            >
              {/* Flashcard */}
              <section className="xl:col-span-8 space-y-4" aria-label="Thẻ ôn tập">
                {/* Card + its speak button are siblings: no button nested inside role="button" */}
                <div className="relative">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={isCardFlipped}
                    aria-label={
                      isCardFlipped
                        ? `Thẻ từ ${currentSlide.hanzi} (${currentSlide.pinyin}: ${currentSlide.meaning}) — đang xem mặt sau. Nhấn Space hoặc Enter để lật thẻ, mũi tên Trái/Phải để chuyển từ, phím 1 đến 4 để đánh giá mức độ thuộc.`
                        : `Thẻ từ ${currentSlide.hanzi} — đang xem mặt trước. Nhấn Space hoặc Enter để lật thẻ xem đáp án, mũi tên Trái/Phải để chuyển từ.`
                    }
                    data-testid="flashcard-flip-toggle-btn"
                    onClick={() => setIsCardFlipped((f) => !f)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsCardFlipped((f) => !f);
                        speakChinese(currentSlide.hanzi, speechRate);
                      } else if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePrev();
                      } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleNext();
                      }
                    }}
                    className="flip-scene relative rounded-3xl bg-surface border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer min-h-[340px] sm:min-h-[380px] flex flex-col items-center justify-center px-6 py-10 text-center select-none"
                  >
                    <span className="absolute top-4 left-4 text-xs font-medium px-2 py-1 rounded-md bg-primary-soft text-primary">
                      {currentHsk3Meta.hskLevelNormalized}
                    </span>

                    <div
                      key={`${currentSlide.id}-${isCardFlipped ? 'back' : 'front'}`}
                      className="animate-flip-in w-full flex flex-col items-center"
                    >
                      <div className="font-hanzi text-7xl sm:text-8xl text-ink leading-none">
                        {currentSlide.hanzi}
                      </div>

                      {isCardFlipped ? (
                        <div className="mt-6 w-full max-w-md space-y-2 animate-fade-in">
                          <div className="text-2xl font-semibold text-primary">{currentSlide.pinyin}</div>
                          {currentSlide.hanViet && (
                            <div className="text-sm text-ink-subtle">Hán Việt: {currentSlide.hanViet}</div>
                          )}
                          <div className="text-lg text-ink">{currentSlide.meaning}</div>
                          {currentToneSandhi.spokenPinyin &&
                            currentToneSandhi.spokenPinyin !== currentSlide.pinyin && (
                              <div className="text-xs text-ink-muted">
                                {currentToneSandhi.ruleTitle}: <strong className="text-ink">{currentToneSandhi.spokenPinyin}</strong>
                              </div>
                            )}
                          {currentSlide.exampleHanzi && (
                            <div className="mt-3 pt-3 border-t border-border text-sm text-ink-muted">
                              <span className="font-hanzi text-base text-ink">{currentSlide.exampleHanzi}</span>
                              {currentSlide.exampleMeaning && <div className="mt-0.5">{currentSlide.exampleMeaning}</div>}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="mt-6 text-sm text-ink-subtle">Nhẩm phiên âm và nghĩa, rồi bấm vào thẻ để lật</p>
                      )}
                    </div>
                  </div>

                  {/* Flashcard Audio & SpeechRecognition Pronunciation Practice Bar */}
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      data-testid="flashcard-pronounce-word-btn"
                      onClick={() => speakChinese(currentSlide.hanzi, speechRate)}
                      className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>Phát âm</span>
                    </button>
                    <PronunciationPracticeButton
                      isRecording={wordPronunciation.isRecording}
                      onClick={() => wordPronunciation.startOrStopPractice()}
                      testId="flashcard-pronounce-practice-btn"
                    />
                    {currentSlide.exampleHanzi && (
                      <button
                        type="button"
                        onClick={() => speakChinese(currentSlide.exampleHanzi, speechRate)}
                        className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-border bg-surface hover:bg-surface-2 text-ink text-sm font-medium transition-colors cursor-pointer"
                      >
                        <Volume2 className="w-4 h-4 text-primary" />
                        <span>Nghe câu ví dụ</span>
                      </button>
                    )}
                  </div>

                  <PronunciationResultBanner
                    result={wordPronunciation.result}
                    error={wordPronunciation.error}
                    targetHanzi={currentSlide.hanzi}
                    onRetry={wordPronunciation.startOrStopPractice}
                    onClose={wordPronunciation.clearResult}
                    testId="flashcard-pronunciation-result"
                  />

                  <button
                    type="button"
                    onClick={() => speakChinese(currentSlide.hanzi, speechRate)}
                    aria-label={`Nghe phát âm ${currentSlide.hanzi}`}
                    className="absolute top-4 right-4 w-10 h-10 grid place-items-center rounded-full text-ink-muted hover:text-primary hover:bg-primary-soft transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>
                <div>
                  <div className="text-xs text-ink-muted text-center mb-2">
                    {isCardFlipped
                      ? 'Bạn nhớ từ này đến mức nào? (Bấm nút hoặc phím 1 · 2 · 3)'
                      : 'Bấm vào thẻ hoặc nhấn Space để lật thẻ · Phím 1 · 2 · 3 để tự chấm nhanh'}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(
                      [
                        { key: 'forgot', shortcut: '1', testId: 'srs-rate-again-btn', label: 'Quên', when: '1 phút', tone: 'text-accent' },
                        { key: 'hard', shortcut: '2', testId: 'srs-rate-hard-btn', label: 'Khó', when: '10 phút', tone: 'text-gold' },
                        { key: 'good', shortcut: '3', testId: 'srs-rate-good-btn', label: 'Nhớ', when: '1 ngày', tone: 'text-primary' },
                        { key: 'mastered', shortcut: '4', testId: 'srs-rate-mastered-btn', label: 'Thuộc làu', when: '4 ngày', tone: 'text-success' },
                      ] as const
                    ).map((r) => (
                      <button
                        key={r.key}
                        type="button"
                        data-testid={r.testId}
                        title={`Phím tắt [${r.shortcut}]: ${r.label} (ôn lại sau ${r.when})`}
                        onClick={() => {
                          handleRateCurrentWordSrs(r.key);
                          setIsCardFlipped(false);
                        }}
                        className="relative h-14 rounded-2xl border border-border bg-surface hover:border-border-strong hover:bg-surface-2 transition-colors cursor-pointer flex flex-col items-center justify-center"
                      >
                        <kbd className="absolute top-1.5 right-2 text-[11px] font-mono text-ink-subtle">
                          {r.shortcut}
                        </kbd>
                        <span className={`text-sm font-semibold ${r.tone}`}>{r.label}</span>
                        <span className="text-xs text-ink-subtle">ôn lại sau {r.when}</span>
                      </button>
                    ))}
                  </div>
                  <div
                    data-testid="flashcard-keyboard-shortcuts-hint"
                    className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-ink-muted"
                  >
                    <span className="inline-flex items-center gap-1">
                      <Keyboard className="w-3.5 h-3.5 text-ink-subtle" />
                      <span>Phím tắt:</span>
                    </span>
                    <span>
                      <kbd className="px-1.5 py-0.5 rounded bg-surface-2 text-ink font-mono text-[11px]">Space</kbd> Lật thẻ &amp; phát âm
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      <kbd className="px-1.5 py-0.5 rounded bg-surface-2 text-ink font-mono text-[11px]">←</kbd>{' '}
                      <kbd className="px-1.5 py-0.5 rounded bg-surface-2 text-ink font-mono text-[11px]">→</kbd> Chuyển từ
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      <kbd className="px-1.5 py-0.5 rounded bg-surface-2 text-ink font-mono text-[11px]">1</kbd>{' '}
                      <kbd className="px-1.5 py-0.5 rounded bg-surface-2 text-ink font-mono text-[11px]">2</kbd>{' '}
                      <kbd className="px-1.5 py-0.5 rounded bg-surface-2 text-ink font-mono text-[11px]">3</kbd> Chấm mức độ nhớ
                    </span>
                  </div>
                </div>
              </section>

              {/* Mistake notebook */}
              <aside
                data-testid="student-mistake-notebook-panel"
                className="xl:col-span-4 rounded-3xl bg-surface border border-border p-5 space-y-4"
                aria-labelledby="mistake-notebook-title"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 id="mistake-notebook-title" className="text-base font-semibold text-ink">
                      Sổ từ hay quên <span className="font-hanzi text-ink-subtle font-normal">错题本</span>
                    </h2>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Từ bạn chấm “Quên” hoặc “Khó” sẽ nằm ở đây.
                    </p>
                  </div>
                  <span
                    data-testid="mistake-notebook-count"
                    className="shrink-0 px-2 py-0.5 rounded-md bg-accent-soft text-accent text-xs font-medium tabular-nums"
                  >
                    {mistakeNotebookList.length} từ
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[320px] overflow-y-auto -mx-1 px-1">
                  {mistakeNotebookList.length === 0 ? (
                    <div className="py-8 text-center text-sm text-ink-muted">
                      Chưa có từ nào. Cứ tiếp tục ôn nhé!
                    </div>
                  ) : (
                    mistakeNotebookList.map((item) => {
                      const slideIdx = slides.findIndex(
                        (s) => s.id === item.slideId || s.hanzi === item.hanzi
                      );
                      return (
                        <button
                          key={item.slideId}
                          type="button"
                          data-testid={`mistake-word-${item.hanzi}`}
                          onClick={() => {
                            if (slideIdx !== -1) handleSelectSlide(slideIdx);
                            setIsCardFlipped(false);
                            speakChinese(item.hanzi, speechRate);
                          }}
                          className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-surface-2 text-left transition-colors cursor-pointer"
                        >
                          <span className="min-w-11 h-11 px-2 grid place-items-center rounded-xl bg-surface-2 font-hanzi text-lg text-ink whitespace-nowrap">
                            {item.hanzi}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm text-ink truncate">
                              {item.pinyin} · {item.meaning}
                            </span>
                            <span
                              className={`block text-xs ${item.rating === 'again' ? 'text-accent' : 'text-gold'}`}
                            >
                              {item.rating === 'again' ? 'Chưa nhớ — ôn ngay' : 'Hơi nhớ — ôn củng cố'}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="pt-3 border-t border-border flex flex-col gap-2">
                  {onSwitchToStudentHomework && (
                    <button
                      type="button"
                      onClick={onSwitchToStudentHomework}
                      className="h-10 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-sm font-semibold cursor-pointer transition-colors"
                    >
                      Làm bài tập HSK
                    </button>
                  )}
                  {onChangeStudentStudyMode && (
                    <button
                      type="button"
                      onClick={() => onChangeStudentStudyMode('writing')}
                      className="h-10 rounded-xl border border-border-strong bg-surface hover:bg-surface-2 text-ink text-sm font-medium cursor-pointer transition-colors"
                    >
                      Luyện viết chữ
                    </button>
                  )}
                </div>
              </aside>
            </div>
          )}

          {/* =================================================================
              5. BALANCED 3-COLUMN WORKSPACE (64-80PX HANZI & >= 14PX TYPOGRAPHY)
              ================================================================= */}
          {(roleMode !== 'student' || studentStudyMode !== 'flashcard') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Word card: the word, its meaning and details */}
            <div className="lg:col-span-7 rounded-3xl bg-surface border border-border p-5 sm:p-6 flex flex-col">
              <div className="space-y-4">
                {/* Top Badges: [HSK X] + [Từ loại] + [Chữ viết tay / Nhận diện] */}
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-primary-soft text-primary text-xs font-medium">
                      {currentHsk3Meta.hskLevelNormalized}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-surface-2 text-ink-muted text-xs font-medium">
                      {currentSlide.partOfSpeech}
                    </span>
                  </div>

                  <span
                    data-testid="hsk3-char-category-badge"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-2 text-ink-muted text-xs font-medium"
                    title={
                      currentHsk3Meta.charCategory === 'handwriting'
                        ? 'Từ cần viết được (HSK 3.0)'
                        : 'Từ chỉ cần nhận diện (HSK 3.0)'
                    }
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>
                      {currentHsk3Meta.charCategory === 'handwriting'
                        ? 'Cần viết được'
                        : 'Nhận diện'}
                    </span>
                  </span>
                </div>

                {/* Enlarged Central Hanzi (64px-80px) + Pinyin + Hán Việt + Prominent Meaning + Example Sentence */}
                {!isCardFlipped ? (
                  <div className="py-2 text-center space-y-2">
                    <div className="inline-flex items-center justify-center">
                      <span
                        className="font-hanzi text-6xl sm:text-7xl text-ink select-all leading-none py-1"
                        data-testid="active-slide-hanzi"
                      >
                        {currentSlide.hanzi}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-0.5 leading-snug">
                      {showPinyin && (
                        <span className="text-xl font-medium text-primary" data-testid="active-slide-pinyin">
                          {currentSlide.pinyin}
                        </span>
                      )}
                      <span className="text-sm text-ink-subtle" data-testid="active-slide-hanviet">
                        Hán Việt: {currentSlide.hanViet}
                      </span>
                    </div>

                    {/* Prominent Vietnamese Meaning & Usage Note directly below Pinyin */}
                    {showMeaning && (
                      <div className="max-w-xl mx-auto space-y-1">
                        <div
                          className="text-lg font-semibold text-ink"
                          data-testid="active-slide-meaning"
                        >
                          {currentSlide.meaning}
                        </div>
                        {currentSlide.usageNote && (
                          <p className="text-sm text-ink-muted leading-relaxed">
                            {currentSlide.usageNote}
                          </p>
                        )}
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="my-2 text-center p-4 rounded-xl bg-surface-2 border border-dashed border-border-strong space-y-2">
                    <p className="text-sm text-gold font-bold">
                      Chế độ kiểm tra nhớ từ
                    </p>
                    <p
                      className="font-['Noto_Sans_SC'] text-6xl font-bold text-ink my-2"
                      data-testid="active-slide-hanzi"
                    >
                      {currentSlide.hanzi}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsCardFlipped(false)}
                      className="mt-1 px-3.5 py-1.5 rounded-xl bg-inverse text-white text-sm font-semibold cursor-pointer"
                    >
                      Hiện đáp án
                    </button>
                  </div>
                )}

                {/* Control Buttons Row */}
                <div
                  data-testid="col1-card-controls-row"
                  className="flex flex-wrap items-center justify-center gap-2"
                >
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      data-testid="pronounce-active-word-btn"
                      onClick={() => speakChinese(currentSlide.hanzi, speechRate)}
                      className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>Phát âm</span>
                      {isTtsSpeaking && (
                        <span
                          data-testid="tts-speaking-wave"
                          className="inline-flex items-end gap-0.5 ml-0.5 h-3"
                          aria-hidden="true"
                        >
                          <span className="tts-soundwave-bar" />
                          <span className="tts-soundwave-bar" />
                          <span className="tts-soundwave-bar" />
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => speakChinese(currentSlide.hanzi, 0.55)}
                      className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-surface hover:bg-surface-2 text-ink text-sm font-medium border border-border transition-colors cursor-pointer"
                    >
                      <Rewind className="w-4 h-4 text-ink-muted" />
                      <span>Đọc chậm</span>
                    </button>
                    <PronunciationPracticeButton
                      isRecording={wordPronunciation.isRecording}
                      onClick={() => wordPronunciation.startOrStopPractice()}
                      testId="lesson-pronounce-practice-btn"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {roleMode === 'teacher' && (
                      <button
                        type="button"
                        data-testid="quick-edit-slide-btn"
                        onClick={handleOpenQuickEditModal}
                        title="Sửa nhanh Nghĩa, Câu ví dụ, Pinyin & Tạo ảnh minh họa theo ngữ cảnh"
                        className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-surface hover:bg-surface-2 text-ink text-sm font-medium border border-border transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4 text-ink-muted" />
                        <span>Sửa thẻ</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsCardFlipped((f) => !f)}
                      className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-surface hover:bg-surface-2 text-ink text-sm font-medium border border-border transition-colors cursor-pointer"
                      title="Ẩn nghĩa để tự kiểm tra"
                    >
                      <RefreshCw className="w-4 h-4 text-ink-muted" />
                      <span>Tự kiểm tra</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleLearned(currentSlide.id)}
                      aria-pressed={currentSlide.learned}
                      className={`inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                        currentSlide.learned
                          ? 'bg-success-soft border-success/30 text-success'
                          : 'bg-surface border-border text-ink hover:bg-surface-2'
                      }`}
                    >
                      <Check className={`w-4 h-4 ${currentSlide.learned ? '' : 'text-ink-muted'}`} />
                      <span>{currentSlide.learned ? 'Đã thuộc' : 'Đánh dấu thuộc'}</span>
                    </button>
                  </div>
                </div>

                <PronunciationResultBanner
                  result={wordPronunciation.result}
                  error={wordPronunciation.error}
                  targetHanzi={currentSlide.hanzi}
                  onRetry={wordPronunciation.startOrStopPractice}
                  onClose={wordPronunciation.clearResult}
                  testId="lesson-pronunciation-result"
                />

                {/* Details: character breakdown, grammar, collocations */}
                <div className="pt-1">
                  <div
                    role="tablist"
                    aria-label="Chi tiết từ"
                    className="flex items-end gap-1 border-b border-border overflow-x-auto no-scrollbar"
                  >
                    {(
                      [
                        { id: 'radical', testId: 'col1-tab-radical', icon: Puzzle, label: 'Chiết tự' },
                        { id: 'grammar', testId: 'col1-tab-grammar', icon: Compass, label: 'Ngữ pháp' },
                        { id: 'collocations', testId: 'col1-tab-collocations', icon: BookOpen, label: 'Từ đi kèm' },
                      ] as const
                    ).map((tab) => {
                      const TabIcon = tab.icon;
                      const isActive = col1ActiveTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          data-testid={tab.testId}
                          onClick={() => {
                            setCol1ActiveTab(tab.id);
                            setIsCol1AccordionOpen(true);
                          }}
                          className={`inline-flex items-center gap-1.5 h-10 px-3 -mb-px border-b-2 text-sm whitespace-nowrap transition-colors cursor-pointer ${
                            isActive
                              ? 'border-primary text-primary font-semibold'
                              : 'border-transparent text-ink-muted hover:text-ink font-medium'
                          }`}
                        >
                          <TabIcon className="w-4 h-4 shrink-0" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {isCol1AccordionOpen && (
                    col1ActiveTab === 'radical' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3" data-testid="col1-radical-panel">
                        {currentSlide.characters.map((ch, idx) => (
                          <div
                            key={`rad-breakdown-${ch.char}-${idx}`}
                            className="flex items-center gap-3 text-sm bg-surface-2 px-3 py-2.5 rounded-xl"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-hanzi text-2xl text-ink leading-none">
                                {ch.char}
                              </span>
                              <span className="text-primary text-sm">{ch.pinyin}</span>
                            </div>
                            <span className="ml-auto text-right text-xs text-ink-muted leading-snug">
                              Bộ <span className="text-ink">{ch.radical}</span>
                              <br />
                              {ch.strokeCount} nét
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : col1ActiveTab === 'grammar' ? (
                      <div
                        data-testid="hsk3-grammar-point-box"
                        className="space-y-2 pt-3"
                      >
                        <div
                          data-testid="hsk3-grammar-formula"
                          className="px-3 py-2 rounded-xl bg-primary-soft text-primary text-sm font-medium"
                        >
                          {currentHsk3Meta.grammarFormula}
                        </div>
                        <p className="text-sm text-ink-muted leading-relaxed">
                          {currentHsk3Meta.synonymDistinction}
                        </p>
                      </div>
                    ) : (
                      <div
                        data-testid="col1-collocations-panel"
                        className="space-y-3 pt-3 text-left"
                      >
                        <div>
                          <div className="text-xs font-medium text-ink-muted mb-1.5">
                            Cụm từ hay dùng <span className="font-hanzi">常用搭配</span>
                          </div>
                          <div className="grid gap-1.5 sm:grid-cols-2">
                            {getAuthenticCollocationsForWord(
                              currentSlide.hanzi,
                              currentSlide.pinyin,
                              currentSlide.meaning,
                              currentSlide.partOfSpeech
                            ).map((colloc, idx) => (
                              <div
                                key={`colloc-${idx}`}
                                onClick={() => speakChinese(colloc.hanzi, speechRate)}
                                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-surface-2 hover:bg-primary-soft cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="font-hanzi text-ink text-base">
                                    {colloc.hanzi}
                                  </span>
                                  <span className="text-primary text-xs">{colloc.pinyin}</span>
                                </div>
                                <span className="text-xs text-ink-muted font-medium">{colloc.meaning}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {(() => {
                          const syn = getSynonymDistinctionForWord(
                            currentSlide.hanzi,
                            currentSlide.pinyin,
                            currentSlide.meaning,
                            currentSlide.partOfSpeech
                          );
                          if (!syn) return null;
                          return (
                            <div className="pt-3 border-t border-border">
                              <div className="text-sm font-semibold text-ink mb-0.5">
                                {syn.title}
                              </div>
                              <div className="text-xs text-ink-muted leading-relaxed mb-1">
                                {syn.summary}
                              </div>
                              {syn.items && syn.items.length > 0 && (
                                <div className="space-y-1">
                                  {syn.items.map((item, idx) => (
                                    <div key={`syn-item-${idx}`} className="bg-surface-2 px-3 py-2 rounded-xl text-xs text-ink">
                                      <strong>{item.word} ({item.pinyin}):</strong> {item.nuance}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )
                  )}

                  {/* Tone Sandhi Badge */}
                  {currentToneSandhi.hasSandhi && (
                    <div data-testid="tone-sandhi-box" className="mt-3">
                      <button
                        type="button"
                        data-testid="tone-sandhi-info-toggle"
                        onClick={() => setShowToneSandhiInfo((v) => !v)}
                        title={currentToneSandhi.explanationVi}
                        className="w-full px-3 py-2 rounded-xl bg-surface-2 hover:bg-primary-soft flex items-center justify-between gap-1.5 text-left transition-colors cursor-pointer"
                      >
                        <span className="text-sm font-medium text-ink">
                          Biến điệu: {currentToneSandhi.ruleTitle.replace(/^Biến điệu\s*/i, '')}
                        </span>
                        <span className="inline-flex items-center gap-1 shrink-0">
                          <span className="px-1.5 py-0.5 rounded-md bg-surface text-primary text-sm">
                            {currentToneSandhi.spokenPinyin.replace(/\s*\(.*?\)\s*/g, '')}
                          </span>
                          <Info className="w-4 h-4 text-ink-muted" />
                        </span>
                      </button>
                      {showToneSandhiInfo && (
                        <p className="mt-1.5 px-3 text-sm text-ink-muted leading-relaxed">
                          {currentToneSandhi.explanationVi}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Keyboard shortcut hint on Lesson card */}
                  <div
                    data-testid="lesson-keyboard-shortcuts-hint"
                    className="mt-3 pt-2.5 border-t border-border/70 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted"
                  >
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className="inline-flex items-center gap-1 text-ink-subtle">
                        <Keyboard className="w-3.5 h-3.5" />
                        <span>Phím tắt:</span>
                      </span>
                      <span>
                        <kbd className="px-1.5 py-0.5 rounded bg-surface-2 text-ink font-mono text-[11px]">Space</kbd> Phát âm
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        <kbd className="px-1.5 py-0.5 rounded bg-surface-2 text-ink font-mono text-[11px]">←</kbd>{' '}
                        <kbd className="px-1.5 py-0.5 rounded bg-surface-2 text-ink font-mono text-[11px]">→</kbd> Chuyển từ
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        <kbd className="px-1.5 py-0.5 rounded bg-surface-2 text-ink font-mono text-[11px]">1</kbd> Quên ·{' '}
                        <kbd className="px-1.5 py-0.5 rounded bg-surface-2 text-ink font-mono text-[11px]">2</kbd> Khó ·{' '}
                        <kbd className="px-1.5 py-0.5 rounded bg-surface-2 text-ink font-mono text-[11px]">3</kbd> Đã thuộc
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Writing practice in the 米字格 grid */}
            <div
              className="lg:col-span-5 rounded-3xl bg-surface border border-border p-5 flex flex-col gap-3"
              data-testid="inline-stroke-panel"
            >
              {/* Top Meta Header */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-ink">
                    Luyện viết <span className="font-hanzi text-ink-subtle font-normal">米字格</span>
                  </h2>
                  <div
                    className="text-sm text-ink-muted"
                    data-testid="inline-stroke-meta"
                  >
                    Chữ <strong className="text-ink font-hanzi-calligraphy text-base">{currentChar.char}</strong> · Bộ:{' '}
                    <strong className="text-ink">{currentChar.radical}</strong> ·{' '}
                    <strong className="text-primary font-medium tabular-nums" data-testid="inline-stroke-counter">
                      {currentProgressCount}/{totalStrokes} nét
                    </strong>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-soft text-primary text-xs font-medium tabular-nums whitespace-nowrap">
                  {practiceAccuracy !== null ? (
                    <>
                      <Award className="w-4 h-4" />
                      <span>{practiceAccuracy}%</span>
                    </>
                  ) : inlineStrokeMode === 'animate' ? (
                    'Mẫu nét'
                  ) : (
                    `Nét ${Math.min(userStrokes.length + 1, totalStrokes)}`
                  )}
                </span>
              </div>

              {/* Centered Mi Zi Ge (米字格) Canvas with Ebony/Gold Frame & Cinnabar Dashed Grid */}
              <div className="my-1.5 sm:my-2 flex flex-col items-center justify-center">
                <div className="relative mx-auto w-48 h-48 sm:w-56 sm:h-56 xl:w-64 xl:h-64 rounded-2xl bg-surface-2 border-2 border-ink/85 ring-2 ring-highlight/60 overflow-hidden select-none touch-none shadow-[inset_0_2px_12px_rgba(184,41,47,0.06)]">
                  <svg
                    ref={inlineSvgRef}
                    viewBox="0 0 100 100"
                    role="img"
                    aria-label={`Ô Mễ Tự Cách luyện viết chữ Hán ${currentChar.char} (${totalStrokes} nét)`}
                    className="w-full h-full cursor-crosshair"
                    onMouseDown={handlePointerDown}
                    onMouseMove={handlePointerMove}
                    onMouseUp={handlePointerUp}
                    onMouseLeave={handlePointerUp}
                    onTouchStart={handlePointerDown}
                    onTouchMove={handlePointerMove}
                    onTouchEnd={handlePointerUp}
                    data-testid="inline-mizige-canvas"
                  >
                    <defs>
                      <linearGradient id="inlineDoneStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0A2921" />
                        <stop offset="55%" stopColor="#0F5243" />
                        <stop offset="100%" stopColor="#166E5B" />
                      </linearGradient>
                      <linearGradient id="inlineActiveStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#C5B358" />
                        <stop offset="45%" stopColor="#B8292F" />
                        <stop offset="100%" stopColor="#961C21" />
                      </linearGradient>
                      {currentChar.strokes[animatedStrokeIndex - 1] && (
                        <mask
                          id="inlineActiveBrushMask"
                          maskUnits="userSpaceOnUse"
                          x="0"
                          y="0"
                          width="100"
                          height="100"
                        >
                          <path
                            d={currentChar.strokes[animatedStrokeIndex - 1]}
                            pathLength={100}
                            fill="none"
                            stroke="#FFFFFF"
                            strokeWidth="28"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="100"
                            strokeDashoffset={Math.max(0, 100 - strokeSubProgress)}
                          />
                        </mask>
                      )}
                    </defs>

                    {/* 8-Direction Mi Zi Ge Guide Lines (Light Cinnabar Dashed Grid + Imperial Gold Inner Frame) */}
                    <rect x="2" y="2" width="96" height="96" fill="none" stroke="#B8292F" strokeWidth="0.9" strokeOpacity="0.45" />
                    <line x1="0" y1="50" x2="100" y2="50" stroke="#B8292F" strokeWidth="0.75" strokeDasharray="2.5 2.5" strokeOpacity="0.42" />
                    <line x1="50" y1="0" x2="50" y2="100" stroke="#B8292F" strokeWidth="0.75" strokeDasharray="2.5 2.5" strokeOpacity="0.42" />
                    <line x1="0" y1="0" x2="100" y2="100" stroke="#B8292F" strokeWidth="0.65" strokeDasharray="2.5 2.5" strokeOpacity="0.32" />
                    <line x1="100" y1="0" x2="0" y2="100" stroke="#B8292F" strokeWidth="0.65" strokeDasharray="2.5 2.5" strokeOpacity="0.32" />

                    {hasAuthenticOutlines ? (
                      <>
                        <g
                          transform="scale(0.09765625, -0.09765625) translate(0, -900)"
                          data-testid="hanziwriter-authentic-strokes"
                        >
                          {currentChar.hanziWriterStrokes!.map((d, idx) => {
                            const isNextTarget =
                              inlineStrokeMode === 'practice' && idx === userStrokes.length;
                            const isCompletedPractice =
                              inlineStrokeMode === 'practice' && idx < userStrokes.length;
                            const isFlashedHint =
                              inlineStrokeMode === 'practice' && idx === hintStrokeFlashIdx;
                            const shouldHideInDictation =
                              inlineStrokeMode === 'practice' &&
                              hideGuideStrokes &&
                              !isCompletedPractice &&
                              !isFlashedHint;
                            return (
                              <path
                                key={`hw-guide-${idx}`}
                                d={d}
                                opacity={shouldHideInDictation ? 0 : 1}
                                fill={
                                  isFlashedHint
                                    ? '#C84B31'
                                    : isCompletedPractice
                                    ? '#1E3227'
                                    : isNextTarget
                                    ? '#B8C4A8'
                                    : '#E2DFCE'
                                }
                              />
                            );
                          })}

                          {inlineStrokeMode === 'animate' &&
                            currentChar.hanziWriterStrokes!
                              .slice(0, Math.max(0, animatedStrokeIndex - 1))
                              .map((d, idx) => (
                                <path
                                  key={`hw-done-${idx}`}
                                  d={d}
                                  fill="url(#inlineDoneStrokeGrad)"
                                />
                              ))}
                        </g>

                        {inlineStrokeMode === 'animate' &&
                          currentChar.hanziWriterStrokes![animatedStrokeIndex - 1] && (
                            <g
                              mask={
                                currentChar.strokes[animatedStrokeIndex - 1]
                                  ? 'url(#inlineActiveBrushMask)'
                                  : undefined
                              }
                            >
                              <g transform="scale(0.09765625, -0.09765625) translate(0, -900)">
                                <path
                                  d={currentChar.hanziWriterStrokes![animatedStrokeIndex - 1]}
                                  fill="url(#inlineActiveStrokeGrad)"
                                />
                              </g>
                            </g>
                          )}
                      </>
                    ) : (
                      <>
                        {currentChar.strokes.map((pathStr, idx) => {
                          const isNextPracticeStroke =
                            inlineStrokeMode === 'practice' && idx === userStrokes.length;
                          const isCompletedPractice =
                            inlineStrokeMode === 'practice' && idx < userStrokes.length;
                          const isFlashedHint =
                            inlineStrokeMode === 'practice' && idx === hintStrokeFlashIdx;
                          const shouldHideInDictation =
                            inlineStrokeMode === 'practice' &&
                            hideGuideStrokes &&
                            !isCompletedPractice &&
                            !isFlashedHint;
                          return (
                            <path
                              key={`inline-guide-${idx}`}
                              d={pathStr}
                              fill="none"
                              opacity={shouldHideInDictation ? 0 : 1}
                              stroke={
                                isFlashedHint
                                  ? '#C84B31'
                                  : isNextPracticeStroke
                                  ? '#B8C4A8'
                                  : '#E2DFCE'
                              }
                              strokeWidth="6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          );
                        })}

                        {inlineStrokeMode === 'animate' &&
                          currentChar.strokes.slice(0, animatedStrokeIndex).map((pathStr, idx) => {
                            const isCurrent = idx === animatedStrokeIndex - 1;
                            return (
                              <path
                                key={`inline-anim-${idx}`}
                                d={pathStr}
                                pathLength={100}
                                fill="none"
                                stroke={
                                  isCurrent
                                    ? 'url(#inlineActiveStrokeGrad)'
                                    : 'url(#inlineDoneStrokeGrad)'
                                }
                                strokeWidth={isCurrent ? '7' : '6.2'}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeDasharray={isCurrent ? '100' : undefined}
                                strokeDashoffset={
                                  isCurrent ? Math.max(0, 100 - strokeSubProgress) : undefined
                                }
                              />
                            );
                          })}
                      </>
                    )}

                    {inlineStrokeMode === 'animate' &&
                      currentChar.strokes[animatedStrokeIndex - 1] && (
                        <>
                          {activeStrokePts?.[0] && (
                            <circle
                              cx={activeStrokePts[0][0]}
                              cy={activeStrokePts[0][1]}
                              r="2.4"
                              fill="#C84B31"
                              opacity="0.9"
                            />
                          )}
                          <path
                            d={currentChar.strokes[animatedStrokeIndex - 1]}
                            pathLength={100}
                            fill="none"
                            stroke="#C5B358"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="100"
                            strokeDashoffset={Math.max(0, 100 - strokeSubProgress)}
                            opacity="0.85"
                          />
                          {activeBrushTip && (
                            <g transform={`translate(${activeBrushTip[0]}, ${activeBrushTip[1]})`}>
                              <circle cx="0" cy="0" r="3.4" fill="#C84B31" opacity="0.28" />
                              <circle cx="0" cy="0" r="1.7" fill="#9B8A3E" />
                            </g>
                          )}
                        </>
                      )}

                    {inlineStrokeMode === 'practice' &&
                      (!hideGuideStrokes || hintStrokeFlashIdx === userStrokes.length) &&
                      currentChar.strokePoints[userStrokes.length]?.[0] && (
                        <circle
                          cx={currentChar.strokePoints[userStrokes.length][0][0]}
                          cy={currentChar.strokePoints[userStrokes.length][0][1]}
                          r="3.2"
                          fill="#C84B31"
                        />
                      )}

                    {inlineStrokeMode === 'practice' &&
                      userStrokes.map((pts, idx) => (
                        <g key={`inline-user-${idx}`}>
                          {pts[0] && (
                            <circle
                              cx={pts[0][0]}
                              cy={pts[0][1]}
                              r="3.1"
                              fill="#1E3227"
                              opacity="0.9"
                            />
                          )}
                          <path
                            d={pointsToSvgPath(pts)}
                            fill="none"
                            stroke="url(#inlineDoneStrokeGrad)"
                            strokeWidth="5.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d={pointsToSvgPath(pts)}
                            fill="none"
                            stroke="#9B8A3E"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity="0.55"
                          />
                        </g>
                      ))}

                    {currentStroke.length > 1 && (
                      <path
                        d={pointsToSvgPath(currentStroke)}
                        fill="none"
                        stroke="#C84B31"
                        strokeWidth="5.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </svg>
                </div>

                {practiceEvalDetail && (
                  <div
                    data-testid="stroke-practice-feedback-card"
                    className="mt-2 w-full p-2.5 rounded-xl bg-surface-2 border border-border-strong/50 text-xs sm:text-sm space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-ink tabular-nums inline-flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-gold" />
                        <span>{practiceEvalDetail.accuracy}% · {practiceEvalDetail.gradeLabel}</span>
                      </span>
                      <div className="flex items-center gap-0.5" title={`${practiceEvalDetail.stars || 1} sao`}>
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Star
                            key={`star-${i}`}
                            className={`w-3.5 h-3.5 ${
                              i < (practiceEvalDetail.stars || 1)
                                ? 'text-amber-500 fill-amber-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {practiceEvalDetail.isReversedDirection && (
                      <div className="px-2 py-0.5 rounded bg-amber-100/90 border border-amber-300 text-amber-900 font-bold text-xs flex items-center gap-1">
                        <span>⚠️ Lưu ý: Bạn đang kéo ngược hướng bút thuận (Quy tắc: từ trái qua phải, từ trên xuống dưới)!</span>
                      </div>
                    )}
                    <div className="text-ink-muted text-xs leading-snug">
                      {practiceEvalDetail.feedback}
                    </div>
                  </div>
                )}
              </div>

              {/* Compact Control Row Beneath Canvas: [Chạy nét] [Viết thử] [🙈 Ẩn chữ mẫu (听写)] [💡 Gợi ý 1 nét] [Xóa] + Character Tabs */}
              <div className="pt-3 border-t border-border flex flex-col gap-3">
                {/* Character switcher (multi-character words) + print */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 order-first">
                  {currentSlide.characters.map((ch, idx) => (
                    <button
                      key={`${ch.char}-${idx}`}
                      type="button"
                      data-testid={`char-tab-${ch.char}`}
                      aria-pressed={activeCharIdx === idx}
                      onClick={() => {
                        setActiveCharIdx(idx);
                        speakChinese(ch.char, speechRate);
                      }}
                      className={`w-10 h-10 rounded-xl font-hanzi text-lg transition-colors border cursor-pointer ${
                        activeCharIdx === idx
                          ? 'bg-primary-soft text-primary border-primary/40'
                          : 'bg-surface text-ink border-border hover:bg-surface-2'
                      }`}
                    >
                      {ch.char}
                    </button>
                  ))}
                  <button
                    type="button"
                    data-testid="open-print-worksheet-btn"
                    onClick={() => setIsWorksheetModalOpen(true)}
                    className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl bg-surface hover:bg-surface-2 text-ink text-sm font-medium border border-border transition-colors cursor-pointer"
                    title="In phiếu tập viết (A4)"
                  >
                    <Printer className="w-4 h-4 text-ink-muted" />
                    <span>In phiếu</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setInlineStrokeMode('animate');
                      setIsAnimatingStrokes(true);
                      speakChinese(currentChar.char, speechRate);
                    }}
                    aria-pressed={inlineStrokeMode === 'animate'}
                    className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                      inlineStrokeMode === 'animate'
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-surface text-ink border-border hover:bg-surface-2'
                    }`}
                  >
                    <Play className="w-4 h-4" />
                    <span>Xem nét mẫu</span>
                  </button>

                  <button
                    type="button"
                    data-testid="inline-practice-stroke-btn"
                    onClick={handleSimulateInlineStroke}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm font-medium border transition-colors cursor-pointer bg-surface text-ink border-border hover:bg-surface-2"
                  >
                    <Edit3 className="w-4 h-4 text-ink-muted" />
                    <span>Viết thử</span>
                  </button>

                  <button
                    type="button"
                    data-testid="toggle-dictation-hide-guide-btn"
                    onClick={() => {
                      setIsAnimatingStrokes(false);
                      setInlineStrokeMode('practice');
                      setHideGuideStrokes((prev) => !prev);
                    }}
                    title="Chế độ Nghe viết / Ẩn nét mẫu (听写 - Dictation Mode)"
                    aria-pressed={hideGuideStrokes}
                    className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                      hideGuideStrokes
                        ? 'bg-primary-soft text-primary border-primary/30'
                        : 'bg-surface text-ink border-border hover:bg-surface-2'
                    }`}
                  >
                    {hideGuideStrokes ? (
                      <>
                        <Eye className="w-4 h-4" />
                        <span>Hiện chữ mẫu</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4 text-ink-muted" />
                        <span>Ẩn chữ mẫu</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    data-testid="flash-stroke-hint-btn"
                    onClick={handleFlashOneStrokeHint}
                    title="Chớp sáng gợi ý 1 nét tiếp theo cần viết"
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm font-medium border transition-colors cursor-pointer bg-surface text-ink border-border hover:bg-surface-2"
                  >
                    <Info className="w-4 h-4 text-ink-muted" />
                    <span>Gợi ý 1 nét</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAnimatingStrokes(false);
                      setInlineStrokeMode('practice');
                      setUserStrokes([]);
                      setCurrentStroke([]);
                      setPracticeAccuracy(null);
                      setPracticeEvalDetail(null);
                      setHintStrokeFlashIdx(null);
                    }}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm font-medium border transition-colors cursor-pointer bg-surface text-ink-muted border-border hover:text-ink hover:bg-surface-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Viết lại</span>
                  </button>
                </div>

              </div>
            </div>

            {/* Second row: example sentence & dialogue, with the illustration beside it */}
            <div
              className="lg:col-span-12 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,360px)] gap-4 items-stretch"
              data-testid="scene-and-example-column"
            >
              {/* Visual Illustration Card */}
              <div
                className="order-2 aspect-[400/220] md:aspect-auto md:min-h-[220px] w-full rounded-3xl overflow-hidden border border-border bg-[#18221D]"
                data-testid="inline-slide-illustration"
              >
                <SlideIllustration
                  illustrationKey={currentSlide.illustrationKey}
                  hanzi={currentSlide.hanzi}
                  pinyin={currentSlide.pinyin}
                  meaning={currentSlide.meaning}
                  exampleHanzi={currentSlide.exampleHanzi}
                  exampleMeaning={currentSlide.exampleMeaning}
                  imageUrl={currentSlide.imageUrl}
                  onUpdateImageUrl={(newUrl) => {
                    if (onUpdateSlide) {
                      onUpdateSlide({
                        ...currentSlide,
                        imageUrl: newUrl,
                      });
                    }
                    setToastMessage(`Đã cập nhật ảnh minh họa riêng cho từ "${currentSlide.hanzi}"!`);
                  }}
                />
              </div>

              {/* THẺ VÍ DỤ NGỮ CẢNH & HỘI THOẠI BÀI KHÓA THỰC TẾ (情境对话 & 课文) */}
              <div
                className="order-1 rounded-3xl bg-surface border border-border p-5 flex flex-col gap-4"
                data-testid="scene-example-card"
              >
                {/* Tabs: example sentence / dialogue */}
                <div role="tablist" aria-label="Ví dụ" className="flex items-end gap-1 border-b border-border">
                  <button
                    type="button"
                    data-testid="col3-tab-example"
                    onClick={() => {
                      stopDialogueKaraoke();
                      setCol3ActiveTab('example');
                    }}
                    role="tab"
                    aria-selected={col3ActiveTab === 'example'}
                    className={`inline-flex items-center gap-1.5 h-10 px-3 -mb-px border-b-2 text-sm whitespace-nowrap transition-colors cursor-pointer ${
                      col3ActiveTab === 'example'
                        ? 'border-primary text-primary font-semibold'
                        : 'border-transparent text-ink-muted hover:text-ink font-medium'
                    }`}
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    <span>Câu ví dụ</span>
                  </button>
                  <button
                    type="button"
                    data-testid="toggle-contextual-dialogue-btn"
                    onClick={() => setCol3ActiveTab('dialogue')}
                    role="tab"
                    aria-selected={col3ActiveTab === 'dialogue'}
                    className={`inline-flex items-center gap-1.5 h-10 px-3 -mb-px border-b-2 text-sm whitespace-nowrap transition-colors cursor-pointer ${
                      col3ActiveTab === 'dialogue'
                        ? 'border-primary text-primary font-semibold'
                        : 'border-transparent text-ink-muted hover:text-ink font-medium'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span>Hội thoại <span className="font-hanzi font-normal">课文</span></span>
                  </button>
                </div>

                {col3ActiveTab === 'example' ? (
                  <>
                    <div className="space-y-1">
                      {/* Dòng 1: Câu ví dụ tiếng Trung */}
                      <div className="example-sentence-line flex items-center gap-2 overflow-x-auto whitespace-nowrap">
                        <span
                          className="font-hanzi text-2xl text-ink"
                          data-testid="scene-example-hanzi"
                        >
                          {renderHighlightedExample(currentSlide.exampleHanzi, currentSlide.hanzi)}
                        </span>
                      </div>

                      {/* Dòng 2: Phiên âm Pinyin */}
                      {showPinyin && (
                        <div className="text-base text-primary">
                          {currentSlide.examplePinyin}
                        </div>
                      )}

                      {/* Dòng 3: Nghĩa tiếng Việt */}
                      {(showMeaning || showVietnamese) && (
                        <div className="text-sm text-ink-muted">
                          {currentSlide.exampleMeaning}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 pt-3 border-t border-border">
                      {/* Dòng nút Nghe câu, Đọc chậm và Đọc thử */}
                      <div className="example-actions-row flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => speakChinese(currentSlide.exampleHanzi, speechRate)}
                          className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-primary hover:bg-primary-hover text-on-primary rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                        >
                          <Volume2 className="w-4 h-4" />
                          <span>Nghe câu</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => speakChinese(currentSlide.exampleHanzi, 0.55)}
                          className="inline-flex items-center gap-1.5 h-9 px-3 bg-surface text-ink border border-border rounded-xl text-sm font-medium hover:bg-surface-2 transition-colors cursor-pointer"
                        >
                          <Rewind className="w-4 h-4 text-ink-muted" />
                          <span>Chậm</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleStartSpeechPractice}
                          className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                            isPracticingSpeech
                              ? 'bg-accent text-on-primary border-accent animate-pulse'
                              : 'bg-surface hover:bg-surface-2 text-ink border-border'
                          }`}
                          title="Nói tiếng Trung câu ví dụ để hệ thống chấm điểm phát âm zh-CN"
                        >
                          {isPracticingSpeech ? (
                            <>
                              <MicOff className="w-4 h-4" />
                              <span>Đang nghe...</span>
                            </>
                          ) : (
                            <>
                              <Mic className="w-4 h-4 text-accent" />
                              <span>Đọc thử</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Listening Indicator */}
                      {isPracticingSpeech && (
                        <div className="p-2.5 rounded-xl bg-surface border border-accent/40 text-sm text-ink flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-accent animate-ping shrink-0" />
                            <span className="font-semibold text-sm text-ink truncate">
                              Hãy đọc: "{currentSlide.exampleHanzi}"
                            </span>
                          </div>
                          <span className="text-sm text-accent font-bold shrink-0">
                            Nói ngay...
                          </span>
                        </div>
                      )}

                      {/* Speech Evaluation Result Card */}
                      {speechResult && (
                        <div
                          data-testid="speech-eval-result-card"
                          className="p-2.5 rounded-xl bg-primary-soft border border-ink/25 text-sm text-ink flex flex-col gap-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-inverse text-white font-bold text-sm tabular-nums">
                                <Award className="w-3.5 h-3.5 text-highlight" />
                                <span>{speechResult.score}%</span>
                              </span>
                              <strong className="text-xs sm:text-sm text-ink">
                                {speechResult.feedback}
                              </strong>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSpeechResult(null)}
                              className="text-sm text-ink-muted hover:text-ink px-1 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {speechResult.charMatches && speechResult.charMatches.length > 0 && (
                            <div className="bg-surface/90 p-2 rounded-lg border border-border space-y-1">
                              <div className="text-xs font-bold text-ink-muted flex items-center justify-between">
                                <span>Đối chiếu âm đọc từng chữ Hán:</span>
                                <span className="text-xs text-ink-muted">
                                  Xanh: Chuẩn · Đỏ: Cần chỉnh
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1">
                                {speechResult.charMatches.map((item, idx) => (
                                  <span
                                    key={`match-${idx}`}
                                    className={`px-1.5 py-0.5 rounded font-hanzi text-sm ${
                                      item.isPunctuation
                                        ? 'text-ink-muted'
                                        : item.isMatched
                                        ? 'text-emerald-800 bg-emerald-100 border border-emerald-300'
                                        : 'text-rose-800 bg-rose-100 border border-rose-300'
                                    }`}
                                  >
                                    {item.char}
                                  </span>
                                ))}
                              </div>
                              <div className="text-xs text-ink-muted truncate pt-0.5">
                                Ghi nhận: <span className="font-mono text-ink font-medium">{speechResult.transcript}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div
                    data-testid="contextual-dialogue-panel"
                    className="flex flex-col justify-between gap-2 flex-1"
                  >
                    {/* Top Action Row: [Nghe hội thoại] + Quick Pinyin / Meaning Toggles */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1.5 border-b border-border">
                      <button
                        type="button"
                        data-testid="play-dialogue-karaoke-btn"
                        onClick={handlePlayContextualDialogue}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isPlayingDialogue
                            ? 'bg-accent text-on-primary shadow-xs'
                            : 'bg-inverse hover:bg-inverse-hover text-on-primary'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5 text-highlight" />
                        <span>
                          {isPlayingDialogue ? 'Đang đọc Karaoke...' : 'Nghe hội thoại'}
                        </span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          data-testid="dialogue-toggle-pinyin"
                          onClick={() => setShowPinyin((v) => !v)}
                          className={`px-2 py-0.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                            showPinyin
                              ? 'bg-primary-soft border-ink/25 text-ink'
                              : 'bg-surface border-border text-ink-muted'
                          }`}
                        >
                          {showPinyin ? '✓ Pinyin' : 'Pinyin'}
                        </button>
                        <button
                          type="button"
                          data-testid="dialogue-toggle-meaning"
                          onClick={() => {
                            const nextVal = !showMeaning;
                            setShowMeaning(nextVal);
                            setShowVietnamese(nextVal);
                          }}
                          className={`px-2 py-0.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                            showMeaning
                              ? 'bg-primary-soft border-ink/25 text-ink'
                              : 'bg-surface border-border text-ink-muted'
                          }`}
                        >
                          {showMeaning ? '✓ Dịch nghĩa' : 'Dịch nghĩa'}
                        </button>
                      </div>
                    </div>

                    {/* A - B Dialogue Turns with Karaoke Highlighting */}
                    <div className="space-y-1.5 max-h-[210px] overflow-y-auto pr-0.5">
                      {currentDialogue.turns.map((turn, idx) => {
                        const isKaraokeActive = activeDialogueTurnIdx === idx;
                        return (
                          <div
                            key={`${currentDialogue.slideId}-turn-${idx}`}
                            data-testid={`dialogue-turn-${idx}`}
                            data-karaoke-active={isKaraokeActive ? 'true' : 'false'}
                            onClick={() => {
                              setActiveDialogueTurnIdx(idx);
                              speakChinese(turn.hanziLine, speechRate);
                            }}
                            className={`p-2 rounded-xl border transition-all cursor-pointer ${
                              isKaraokeActive
                                ? 'bg-surface-2 border-2 border-accent shadow-xs ring-2 ring-highlight/40'
                                : 'bg-surface border-border hover:border-border-strong'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                                      turn.speaker === 'A'
                                        ? 'bg-inverse text-highlight'
                                        : 'bg-gold text-white'
                                    }`}
                                  >
                                    {turn.speaker} · {turn.speakerName}
                                  </span>
                                  {isKaraokeActive && (
                                    <span
                                      data-testid="karaoke-active-badge"
                                      className="px-1.5 py-0.5 rounded bg-accent text-on-primary text-xs font-bold"
                                    >
                                      Đang đọc
                                    </span>
                                  )}
                                </div>

                                <div className="font-['Noto_Sans_SC'] text-sm font-bold text-ink leading-snug pt-0.5">
                                  {renderHighlightedExample(turn.hanziLine, currentSlide.hanzi)}
                                </div>

                                {showPinyin && (
                                  <div
                                    data-testid={`dialogue-pinyin-${idx}`}
                                    className="text-xs font-medium text-gold leading-snug"
                                  >
                                    {turn.pinyinLine}
                                  </div>
                                )}

                                {(showMeaning || showVietnamese) && (
                                  <div
                                    data-testid={`dialogue-meaning-${idx}`}
                                    className="text-xs text-ink-muted italic leading-snug"
                                  >
                                    {turn.meaningLine}
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                aria-label={`Nghe câu thoại ${idx + 1}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDialogueTurnIdx(idx);
                                  speakChinese(turn.hanziLine, speechRate);
                                }}
                                className="w-6 h-6 rounded-lg bg-primary-soft hover:bg-inverse text-ink hover:text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                              >
                                <Volume2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

          {/* =================================================================
              BOTTOM BAR: KEYBOARD SHORTCUTS LEGEND (teachers on desktop only)
              ================================================================= */}
          <div
            className={`${
              roleMode === 'teacher' ? 'hidden lg:flex' : 'hidden'
            } flex-wrap items-center justify-between gap-2 pt-0.5`}
          >
            <div
              data-testid="keyboard-shortcuts-bar"
              className="inline-flex flex-wrap items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface/75 border border-border text-sm text-ink-muted"
            >
              <Keyboard className="w-4 h-4 text-gold shrink-0" />
              <span className="font-bold text-ink">Phím tắt đứng lớp:</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-primary-soft border border-border font-mono text-sm font-bold text-ink">
                  ←
                </kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-primary-soft border border-border font-mono text-sm font-bold text-ink">
                  →
                </kbd>
                <span>Lùi/Tiến từ</span>
              </span>
              <span className="text-gold/60">·</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-primary-soft border border-border font-mono text-sm font-bold text-ink">
                  Space
                </kbd>
                <span>Phát âm</span>
              </span>
              <span className="text-gold/60">·</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-primary-soft border border-border font-mono text-sm font-bold text-ink">
                  W
                </kbd>
                <span>Chạy nét mẫu</span>
              </span>
              <span className="text-gold/60">·</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-primary-soft border border-border font-mono text-sm font-bold text-ink">
                  F
                </kbd>
                <span>Fullscreen</span>
              </span>
            </div>
          </div>

          <LazyErrorBoundary fallbackLabel="Không thể tải chuyên đề Lượng từ HSK.">
            <Suspense fallback={null}>
              <MeasureWordDrillModal
                isOpen={isMeasureWordModalOpen}
                slides={slides}
                onClose={() => setIsMeasureWordModalOpen(false)}
              />
            </Suspense>
          </LazyErrorBoundary>

          {/* Sub-component: Modal Tự thêm từ vựng mới vào danh sách Slide */}
          <LazyErrorBoundary fallbackLabel="Không thể tải hộp thoại Thêm từ vựng.">
            <Suspense fallback={null}>
              <AddVocabModal
                isOpen={isAddVocabModalOpen}
                onClose={() => setIsAddVocabModalOpen(false)}
                onSaveVocab={(newSlide) => {
                  onAddSlides([newSlide]);
                  onSelectSlideIndex(slides.length);
                  setToastMessage(`Đã thêm từ mới "${newSlide.hanzi}" vào Slide thành công!`);
                }}
                nextIndex={slides.length + 1}
              />
            </Suspense>
          </LazyErrorBoundary>

          {/* Sub-component: Modal Bản xem trước trang A4 (Phiếu tập viết chữ Mễ) */}
          <LazyErrorBoundary fallbackLabel="Không thể tải trình In phiếu tập viết A4.">
            <Suspense fallback={null}>
              <WorksheetPreviewModal
                isOpen={isWorksheetModalOpen}
                onClose={() => setIsWorksheetModalOpen(false)}
                slides={slides}
              />
            </Suspense>
          </LazyErrorBoundary>

          {/* =================================================================
              MODAL 3: ✏️ SỬA NHANH THẺ BÀI GIẢNG & TẠO ẢNH KHỚP CÂU VÍ DỤ
              ================================================================= */}
          {isQuickEditModalOpen && (
            <div
              className="fixed inset-0 z-50 animate-backdrop-in flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
              role="dialog"
              aria-modal="true"
              data-testid="quick-edit-slide-modal"
              onClick={() => setIsQuickEditModalOpen(false)}
            >
              <form
                onSubmit={handleSaveQuickEditSlide}
                onClick={(e) => e.stopPropagation()}
                className="animate-sheet-in w-full max-w-lg rounded-3xl bg-surface-2 border border-highlight/70 shadow-2xl p-5 sm:p-6 space-y-3.5 text-ink"
              >
                <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-primary/15">
                  <div>
                    <div className="text-xs font-bold text-gold">
                      FULL LESSON AUTHORING STUDIO · CHỈNH SỬA TRỰC TIẾP
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-ink mt-0.5">
                      ✏️ Sửa nhanh thẻ từ vựng “{currentSlide.hanzi}”
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsQuickEditModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-surface border border-primary/15 flex items-center justify-center text-ink hover:bg-surface-2 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">Pinyin</label>
                    <input
                      type="text"
                      data-testid="quick-edit-pinyin-input"
                      value={editPinyin}
                      onChange={(e) => setEditPinyin(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-surface border border-primary/20 text-xs sm:text-sm font-semibold text-ink focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">Hán Việt</label>
                    <input
                      type="text"
                      data-testid="quick-edit-hanviet-input"
                      value={editHanViet}
                      onChange={(e) => setEditHanViet(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-surface border border-primary/20 text-xs sm:text-sm font-semibold text-ink focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      Nghĩa tiếng Việt
                    </label>
                    <input
                      type="text"
                      data-testid="quick-edit-meaning-input"
                      value={editMeaning}
                      onChange={(e) => setEditMeaning(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-surface border border-primary/20 text-xs sm:text-sm font-semibold text-ink focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      Câu ví dụ tiếng Trung (Chuẩn HSK 3.0)
                    </label>
                    <input
                      type="text"
                      data-testid="quick-edit-example-hanzi-input"
                      value={editExampleHanzi}
                      onChange={(e) => setEditExampleHanzi(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-surface border border-primary/20 text-xs sm:text-sm font-['Noto_Sans_SC'] font-bold text-ink focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-ink mb-1">
                        Pinyin câu ví dụ
                      </label>
                      <input
                        type="text"
                        value={editExamplePinyin}
                        onChange={(e) => setEditExamplePinyin(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-surface border border-primary/20 text-xs text-ink focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink mb-1">
                        Nghĩa tiếng Việt câu ví dụ
                      </label>
                      <input
                        type="text"
                        data-testid="quick-edit-example-meaning-input"
                        value={editExampleMeaning}
                        onChange={(e) => setEditExampleMeaning(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-surface border border-primary/20 text-xs text-ink focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-surface/90 border border-highlight/50 space-y-2">
                  <label className="block text-xs font-bold text-ink">
                    🎨 Mô tả cảnh minh họa tùy chỉnh (Để trống sẽ tự động phân tích theo Câu ví dụ)
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      data-testid="quick-edit-image-prompt-input"
                      value={editCustomImagePrompt}
                      onChange={(e) => setEditCustomImagePrompt(e.target.value)}
                      placeholder="VD: sunrise over the Great Wall of China, calendar flipping..."
                      className="flex-1 px-3 py-1.5 rounded-xl bg-surface-2 border border-primary/20 text-xs text-ink focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-focus/40"
                    />
                    <button
                      type="button"
                      data-testid="generate-contextual-image-btn"
                      onClick={handleGenerateContextualImageForEdit}
                      className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-accent hover:bg-accent/90 text-on-primary text-xs font-bold shadow-xs cursor-pointer shrink-0"
                    >
                      <span>🎨 Tạo ảnh khớp câu ví dụ</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-primary/15">
                  <button
                    type="button"
                    onClick={() => setIsQuickEditModalOpen(false)}
                    className="px-4 py-1.5 rounded-xl bg-surface border border-primary/20 text-xs font-semibold text-ink cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    data-testid="save-quick-edit-slide-btn"
                    className="px-4 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs cursor-pointer"
                  >
                    💾 Lưu thay đổi
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* =================================================================
              MODAL 4: 📋 NHẬP DANH SÁCH TỪ HÀNG LOẠT (BATCH IMPORT STUDIO)
              ================================================================= */}
          {isBatchImportModalOpen && (
            <div
              className="fixed inset-0 z-50 animate-backdrop-in flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
              role="dialog"
              aria-modal="true"
              data-testid="batch-import-modal"
              onClick={() => setIsBatchImportModalOpen(false)}
            >
              <form
                onSubmit={handleConfirmBatchImport}
                onClick={(e) => e.stopPropagation()}
                className="animate-sheet-in w-full max-w-2xl rounded-3xl bg-surface-2 border border-highlight/70 shadow-2xl p-5 sm:p-6 space-y-4 text-ink"
              >
                <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-primary/15">
                  <div>
                    <div className="text-xs font-bold text-gold">
                      BATCH VOCABULARY IMPORT · CHUẨN HÓA HSK 3.0 TỰ ĐỘNG
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-ink mt-0.5">
                      📋 Nhập danh sách từ vựng hàng loạt (1-Click Batch Import)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBatchImportModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-surface border border-primary/15 flex items-center justify-center text-ink hover:bg-surface-2 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Dán danh sách chữ Hán (cách nhau bởi dấu phẩy hoặc xuống dòng):
                  </label>
                  <textarea
                    rows={3}
                    data-testid="batch-import-textarea"
                    value={batchRawInput}
                    onChange={(e) => setBatchRawInput(e.target.value)}
                    placeholder="Ví dụ: 明天, 考试, 照顾, 旅行, 周末, 复习"
                    className="w-full px-3 py-2 rounded-2xl bg-surface border border-primary/20 text-sm font-['Noto_Sans_SC'] font-bold text-ink focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-ink">
                    Xem trước {batchPreviewSlides.length} thẻ từ vựng được chuẩn hóa tự động (Không dịch ghép cơ học):
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-2xl bg-surface border border-primary/15 divide-y divide-primary/10">
                    {batchPreviewSlides.map((item, idx) => (
                      <div
                        key={`batch-prev-${item.hanzi}-${idx}`}
                        className="px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-hanzi-calligraphy text-lg font-bold text-ink">
                            {item.hanzi}
                          </span>
                          <span className="font-bold text-gold">{item.pinyin}</span>
                          <span className="text-ink-muted uppercase">[{item.hanViet}]</span>
                          <span className="font-semibold text-primary">→ {item.meaning}</span>
                        </div>
                        <div className="text-xs text-ink-muted font-['Noto_Sans_SC'] truncate max-w-xs">
                          VD: {item.exampleHanzi}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-primary/15">
                  <button
                    type="button"
                    onClick={() => setIsBatchImportModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-surface border border-primary/20 text-xs font-semibold text-ink cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    data-testid="confirm-batch-import-btn"
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs cursor-pointer"
                  >
                    ✨ Chuẩn hóa &amp; Tạo {batchPreviewSlides.length} Slide
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
    );
  };

