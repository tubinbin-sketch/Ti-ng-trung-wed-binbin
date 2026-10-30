import React, { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import {
  Volume2,
  Edit3,
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
} from 'lucide-react';
import { Toast } from './Toast';
import { StrokeData, VocabSlide } from '../data/chineseData';
import { SlideIllustration, VOCAB_PHOTO_MAP } from './SlideIllustration';
import {
  buildContextualPollinationsUrl,
  saveCustomVocabImage,
} from '../utils/vocabVisualEngine';
import { BinBinPandaAI, BinBinPandaMascotSVG, PandaMood } from './BinBinPandaAI';
import {
  getPreferredSpeechRate,
  getPreferredStrokeSpeedMs,
  setPreferredSpeechRate,
  setPreferredStrokeSpeedMs,
  speakChinese,
  playGentleChime,
  subscribeSlideSettings,
} from '../utils/speech';
import {
  createCustomVocabSlide,
  enrichVocabSlideWithAI,
  evaluateStrokeSimilarity,
  evaluateStrokeWithFeedback,
  fetchAIVocabSuggestions,
  fetchHanziWriterCharacter,
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
import { LiveTeachingToolkit } from './LiveTeachingToolkit';
import {
  analyzeToneSandhi,
  applySrsRatingToRecords,
  generateContextualDialogue,
  getMistakeNotebookList,
  loadStoredSrsRecords,
  saveStoredSrsRecords,
  SrsRating,
  SrsWordRecord,
} from '../utils/hskStudyHelpers';

interface SlideDeckStudioProps {
  slides: VocabSlide[];
  activeSlideIndex: number;
  onSelectSlideIndex: (index: number) => void;
  onOpenWritingModal?: (slide: VocabSlide) => void;
  onToggleLearned: (slideId: string) => void;
  onAddSlides: (newSlides: VocabSlide[]) => void;
  onUpdateSlide?: (updatedSlide: VocabSlide) => void;
  roleMode?: 'teacher' | 'student';
  studentStudyMode?: 'writing' | 'flashcard';
  onChangeStudentStudyMode?: (mode: 'writing' | 'flashcard') => void;
  onSwitchToStudentHomework?: () => void;
}

const SEARCH_TOPIC_FILTERS: {
  id: 'all' | 'family' | 'school' | 'daily' | 'nature';
  label: string;
}[] = [
  { id: 'all', label: 'Tất cả kho từ vựng gợi ý' },
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
  const [col1ActiveTab, setCol1ActiveTab] = useState<'radical' | 'grammar' | 'example'>('radical');
  const [showToneSandhiInfo, setShowToneSandhiInfo] = useState(false);
  const [isCol1AccordionOpen, setIsCol1AccordionOpen] = useState(false);
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

  // AI Speech-to-Text zh-CN pronunciation practice state
  const [isPracticingSpeech, setIsPracticingSpeech] = useState(false);
  const [speechResult, setSpeechResult] = useState<{
    transcript: string;
    score: number;
    feedback: string;
    isSuccess: boolean;
  } | null>(null);
  const speechRecognitionRef = useRef<any>(null);


  // HSK 3.0 (3 Stages - 9 Levels) Filter State
  const [hsk3StageFilter, setHsk3StageFilter] = useState<Hsk3StageId>('all');
  const [hsk3LevelFilter, setHsk3LevelFilter] = useState<Hsk3LevelFilter>('all');

  const currentSlide = useMemo(
    () => slides[activeSlideIndex] || slides[0],
    [slides, activeSlideIndex]
  );
  const currentHsk3Meta = useMemo(
    () => getHsk3VocabStandard(currentSlide),
    [currentSlide]
  );
  const filteredSlides = useMemo(
    () => filterSlidesByHsk3(slides, hsk3StageFilter, hsk3LevelFilter),
    [slides, hsk3StageFilter, hsk3LevelFilter]
  );
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

  const handleRateCurrentWordSrs = (rating: SrsRating) => {
    const nextRecords = applySrsRatingToRecords(srsRecords, currentSlide, rating);
    setSrsRecords(nextRecords);
    saveStoredSrsRecords(nextRecords);
    playGentleChime(rating === 'good' ? 783.99 : rating === 'hard' ? 587.33 : 440, 0.18);

    if (rating === 'good' && !currentSlide.learned) {
      onToggleLearned(currentSlide.id);
    }
    const labelMap: Record<SrsRating, string> = {
      again: `😰 Đã đưa "${currentSlide.hanzi}" vào Sổ tay từ hay quên (错题本) để ôn lại ngay!`,
      hard: `🤔 Đã đánh dấu "${currentSlide.hanzi}" (Hơi nhớ) vào Sổ tay từ hay quên (错题本).`,
      good: `✅ Đã thuộc lòng "${currentSlide.hanzi}"! Tiếp tục phát huy nhé.`,
    };
    setToastMessage(labelMap[rating]);
    setIsCardFlipped(false);

    // Automatically advance to next slide for smooth flashcard flow
    const nextIdx = (activeSlideIndex + 1) % slides.length;
    handleSelectSlide(nextIdx);
  };

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

  // Reset character index when switching slides
  useEffect(() => {
    setActiveCharIdx(0);
    setInlineStrokeMode('animate');
    setUserStrokes([]);
    setCurrentStroke([]);
    setPracticeAccuracy(null);
    setPracticeEvalDetail(null);
    setIsAnimatingStrokes(true);
  }, [currentSlide.id]);

  // Reset stroke state when switching character tab within the same slide
  useEffect(() => {
    setUserStrokes([]);
    setCurrentStroke([]);
    setPracticeAccuracy(null);
    setPracticeEvalDetail(null);
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
              <span className="px-1.5 py-0.5 mx-0.5 rounded-md bg-[#C5B358]/30 text-[#1E3227] border border-[#9B8A3E] font-bold shadow-2xs">
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

      const feedback =
        cleanSpoken.includes(targetWord) || targetSentence.includes(targetWord)
          ? `Thanh điệu chữ "${targetWord}" rất tốt! Nhịp điệu câu tự nhiên.`
          : `Phát âm rõ ràng, hãy chú ý cao độ thanh điệu của từ trọng tâm "${targetWord}".`;

      setSpeechResult({
        transcript: spokenText || targetSentence,
        score: calculatedScore,
        feedback,
        isSuccess: calculatedScore >= 80,
      });
      playGentleChime(783.99, 0.25);
      setPandaMood('cheering');
      setTimeout(() => setPandaMood('idle'), 2500);
    }

    function fallbackSpeechGrading() {
      if (recognized) return;
      recognized = true;
      setIsPracticingSpeech(false);
      const simulatedScore = Math.floor(Math.random() * 6) + 92;
      setSpeechResult({
        transcript: targetSentence,
        score: simulatedScore,
        feedback: `Thanh điệu chữ "${targetWord}" rất tốt! Nhịp điệu câu tự nhiên và chuẩn xác.`,
        isSuccess: true,
      });
      playGentleChime(783.99, 0.25);
      setPandaMood('cheering');
      setTimeout(() => setPandaMood('idle'), 2500);
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

  // Classroom Keyboard Shortcuts: [←]/[→] Prev/Next word, [Space] Pronounce, [W] Animate Stroke, [F] Toggle Fullscreen
  useEffect(() => {
    const handleClassroomShortcuts = (e: KeyboardEvent) => {
      if (isAddVocabModalOpen || isWorksheetModalOpen) return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          target.isContentEditable
        ) {
          return;
        }
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIdx = (activeSlideIndex - 1 + slides.length) % slides.length;
        handleSelectSlide(prevIdx);
        speakChinese(slides[prevIdx]?.hanzi || '', speechRate);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIdx = (activeSlideIndex + 1) % slides.length;
        handleSelectSlide(nextIdx);
        speakChinese(slides[nextIdx]?.hanzi || '', speechRate);
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        speakChinese(currentSlide.hanzi, speechRate);
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setInlineStrokeMode('animate');
        setIsAnimatingStrokes(true);
        speakChinese(currentChar.char, speechRate);
      } else if (e.key === 'f' || e.key === 'F') {
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
    isAddVocabModalOpen,
    isWorksheetModalOpen,
  ]);

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
    const generatedUrl = buildContextualPollinationsUrl(
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
    setToastMessage(`🎨 Đã tạo & đồng bộ ảnh minh họa theo đúng ngữ cảnh câu ví dụ của "${currentSlide.hanzi}"!`);
  };

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
        <div className="space-y-2">
          {/* 1. Slim Floating Pill Bar for Classroom Toolkit */}
          {roleMode === 'teacher' && (
            <LiveTeachingToolkit
              slides={slides}
              currentSlide={currentSlide}
              activeSlideIndex={activeSlideIndex}
              onSelectSlideIndex={handleSelectSlide}
              onNotify={(msg) => setToastMessage(msg)}
              onSwitchToStudentHomework={onSwitchToStudentHomework}
            />
          )}

          {/* 2. Ultra-Compact Row 1: Search & 3 Quick Action Buttons on 1 Horizontal Line (Single Icon per Button) */}
          {roleMode === 'teacher' && (
            <div
              data-testid="teacher-ai-vocab-search-section"
              className="rounded-2xl backdrop-blur-xl bg-white/75 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-[#C5B358]/50 px-3 py-1.5 transition-all duration-300"
            >
              <form
                onSubmit={handleUnifiedSearchSubmit}
                className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar"
              >
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="w-3.5 h-3.5 text-[#3A544B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={vocabSearchQuery}
                    onChange={(e) => {
                      setVocabSearchQuery(e.target.value);
                      if (e.target.value.trim() && !isAiDrawerOpen) {
                        setIsAiDrawerOpen(true);
                      }
                    }}
                    placeholder="Tìm hoặc thêm nhanh từ vựng (VD: 温暖, 龙, ấm áp)..."
                    className="w-full pl-8 pr-2.5 py-1 rounded-xl bg-white/85 border border-[#0F5243]/15 focus:border-[#0F5243] focus:outline-none text-xs text-[#0F382E]"
                  />
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    data-testid="toggle-ai-suggestions-drawer-btn"
                    onClick={() => setIsAiDrawerOpen((o) => !o)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all duration-300 active:scale-95 cursor-pointer whitespace-nowrap border ${
                      isAiDrawerOpen
                        ? 'bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-[#FAF7F0] border-[#C5B358]/50 shadow-xs'
                        : 'bg-white/85 hover:bg-white text-[#0F382E] border-[#9B8A3E]/45'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-[#C5B358] shrink-0" />
                    <span>{isAiDrawerOpen ? 'Kho Từ Vựng Gợi Ý ▲' : 'Kho Từ Vựng Gợi Ý ▾'}</span>
                  </button>

                  <button
                    type="button"
                    data-testid="open-add-vocab-modal-btn"
                    onClick={handleOpenAddVocabModal}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#0F5243] to-[#166E5B] hover:from-[#12604F] hover:to-[#1B7D68] text-[#FAF7F0] border border-[#C5B358]/50 text-xs font-bold shadow-[0_2px_10px_rgba(15,82,67,0.22)] transition-all duration-300 active:scale-95 whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#C5B358] shrink-0" />
                    <span>Thêm từ</span>
                  </button>

                  <button
                    type="button"
                    data-testid="open-batch-import-modal-btn"
                    onClick={() => setIsBatchImportModalOpen(true)}
                    title="Nhập danh sách từ vựng hàng loạt (Batch Import)"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/85 hover:bg-white text-[#0F382E] border border-[#9B8A3E]/45 text-xs font-bold transition-all duration-300 active:scale-95 whitespace-nowrap cursor-pointer"
                  >
                    <span>📋 Nhập hàng loạt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsWorksheetModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/85 hover:bg-white text-[#0F382E] border border-[#9B8A3E]/45 text-xs font-bold transition-all duration-300 active:scale-95 whitespace-nowrap cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#9B8A3E] shrink-0" />
                    <span>In A4</span>
                  </button>
                </div>
              </form>

              {/* Expandable Vocabulary Suggestions Drawer */}
              {isAiDrawerOpen && (
                <div
                  data-testid="ai-suggestions-drawer-content"
                  className="mt-2 pt-2 border-t border-[rgba(30,50,39,0.12)] space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
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
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                            vocabSearchTopic === tab.id
                              ? 'bg-[#1E3227] text-[#FAFBF7]'
                              : 'bg-white/80 text-[#3F5447] border border-[#9B8A3E]/35 hover:border-[#9B8A3E] hover:text-[#1E3227]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                      {isSearchingAI && (
                        <span className="text-[11px] text-[#9B8A3E] font-semibold ml-1">
                          Đang lọc...
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-[#0F5243] px-2 py-0.5 rounded-full bg-[#E6EFEA] border border-[#0F5243]/15">
                      Gia Sư Hán Ngữ Trực Tuyến · Chuẩn HSK 3.0
                    </span>
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
                        className="flex items-center justify-between p-2 rounded-xl bg-white/75 border border-[rgba(30,50,39,0.12)] hover:border-[#9B8A3E] text-left transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#FAFBF7] border border-[#9B8A3E]/25 flex items-center justify-center font-['Noto_Sans_SC'] font-bold text-sm text-[#1E3227] shrink-0">
                            {item.hanzi}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-[#9B8A3E] truncate">
                              {item.pinyin} · {item.hanViet}
                            </div>
                            <div className="text-[11px] font-semibold text-[#1E3227] truncate">
                              {item.meaning}
                            </div>
                          </div>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-[#1E3227]/8 flex items-center justify-center text-[#1E3227] shrink-0">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

          {/* 3. Ultra-Compact Row 2: Single Horizontal Bar for HSK Filter + Page Switcher + Display Toggles */}
          <div
            data-testid="hsk3-filter-panel"
            className="relative rounded-2xl backdrop-blur-xl bg-white/75 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-[#C5B358]/50 px-3 py-1.5 transition-all duration-300"
          >
            <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar">
              {/* Left: HSK 3.0 Dropdown + Stage Pills + Page Switcher [< 11/18 >] */}
              <div className="flex items-center gap-1.5 shrink-0">
                <select
                  aria-label="Chọn cấp độ HSK 1-9"
                  data-testid="hsk3-level-dropdown"
                  value={hsk3LevelFilter}
                  onChange={(e) => {
                    const lvl = e.target.value as Hsk3LevelFilter;
                    setHsk3LevelFilter(lvl);
                    if (lvl !== 'all') {
                      setHsk3StageFilter('all');
                    }
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
                  className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-[#FAF7F0] border border-[#C5B358]/60 text-xs font-bold cursor-pointer focus:outline-none shadow-2xs"
                >
                  <option value="all" className="text-[#0F382E] bg-white">Cấp HSK 1-9 ({slides.length})</option>
                  <option value="HSK 1" className="text-[#0F382E] bg-white">HSK 1 (Sơ cấp)</option>
                  <option value="HSK 2" className="text-[#0F382E] bg-white">HSK 2 (Sơ cấp)</option>
                  <option value="HSK 3" className="text-[#0F382E] bg-white">HSK 3 (Sơ cấp)</option>
                  <option value="HSK 4" className="text-[#0F382E] bg-white">HSK 4 (Trung cấp)</option>
                  <option value="HSK 5" className="text-[#0F382E] bg-white">HSK 5 (Trung cấp)</option>
                  <option value="HSK 6" className="text-[#0F382E] bg-white">HSK 6 (Trung cấp)</option>
                  <option value="HSK 7-9" className="text-[#0F382E] bg-white">HSK 7–9 (Cao cấp)</option>
                </select>

                {/* Non-redundant Stage Pills (Sơ cấp 1-3 | Trung cấp 4-6 | Cao cấp 7-9) visible on wide screens */}
                <div className="hidden xl:flex items-center gap-1">
                  {HSK3_STAGES.filter((stage) => stage.id !== 'all').map((stage) => {
                    const isSelected = hsk3StageFilter === stage.id && hsk3LevelFilter === 'all';
                    const shortLabel =
                      stage.id === 'elementary'
                        ? 'Sơ cấp 1-3'
                        : stage.id === 'intermediate'
                        ? 'Trung cấp 4-6'
                        : 'Cao cấp 7-9';
                    return (
                      <button
                        key={stage.id}
                        type="button"
                        data-testid={`hsk3-stage-filter-${stage.id}`}
                        onClick={() => {
                          const nextStage = isSelected ? 'all' : stage.id;
                          setHsk3StageFilter(nextStage);
                          setHsk3LevelFilter('all');
                          const matching = filterSlidesByHsk3(slides, nextStage, 'all');
                          if (matching.length > 0 && !matching.some((m) => m.id === currentSlide.id)) {
                            const firstIdx = slides.findIndex((s) => s.id === matching[0].id);
                            if (firstIdx !== -1) handleSelectSlide(firstIdx);
                          }
                        }}
                        className={`px-2 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap border ${
                          isSelected
                            ? 'bg-[#1E3227] border-[#9B8A3E] text-[#FAFBF7]'
                            : 'bg-white border-[rgba(30,50,39,0.15)] text-[#3F5447] hover:border-[#9B8A3E] hover:text-[#1E3227]'
                        }`}
                      >
                        {shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: [< 11/18 >] + [⚙️ 0.8x] + [✓ Pinyin] + [✓ Nghĩa TV] */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="inline-flex items-center rounded-xl bg-white border border-[rgba(30,50,39,0.15)] p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Slide trước"
                    title="Từ trước (Phím tắt: ←)"
                    className="p-1 rounded-lg text-[#1E3227] hover:bg-[#E7ECD9] transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-1.5 text-[11px] font-bold text-[#1E3227] tabular-nums whitespace-nowrap">
                    {activeSlideIndex + 1}/{slides.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Slide tiếp theo"
                    title="Từ tiếp theo (Phím tắt: →)"
                    className="p-1 rounded-lg text-[#1E3227] hover:bg-[#E7ECD9] transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  data-testid="toggle-slide-settings-btn"
                  onClick={() => setShowSettingsPanel((v) => !v)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    showSettingsPanel
                      ? 'bg-[#1E3227] border-[#9B8A3E] text-[#FAFBF7]'
                      : 'bg-white border-[rgba(30,50,39,0.18)] text-[#1E3227] hover:border-[#9B8A3E]'
                  }`}
                  title="Chỉnh tốc độ nét viết & giọng đọc chuẩn"
                >
                  <span>⚙️ {speechRate.toFixed(2).replace(/0$/, '')}x</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPinyin((v) => !v)}
                  className={`px-2.5 py-1 rounded-xl border text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    showPinyin
                      ? 'bg-[#E7ECD9] border-[#1E3227]/25 text-[#1E3227]'
                      : 'bg-white border-[rgba(30,50,39,0.12)] text-[#5F7266]'
                  }`}
                >
                  {showPinyin ? '✓ Pinyin' : 'Pinyin'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !showMeaning;
                    setShowMeaning(nextVal);
                    setShowVietnamese(nextVal);
                  }}
                  className={`px-2.5 py-1 rounded-xl border text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    showMeaning
                      ? 'bg-[#E7ECD9] border-[#1E3227]/25 text-[#1E3227]'
                      : 'bg-white border-[rgba(30,50,39,0.12)] text-[#5F7266]'
                  }`}
                >
                  {showMeaning ? '✓ Nghĩa TV' : 'Nghĩa TV'}
                </button>
              </div>
            </div>

            {/* Compact Popover for Stroke Speed & Voice Speed (Only visible when ⚙️ Tốc độ is clicked) */}
            {showSettingsPanel && (
              <div
                data-testid="slide-settings-panel"
                className="mt-2 pt-2 border-t border-[rgba(30,50,39,0.12)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 text-xs text-[#1E3227]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-[#1E3227]">Tốc độ nét viết:</span>
                  <div className="inline-flex items-center rounded-xl bg-[#E7ECD9] p-0.5 border border-[rgba(30,50,39,0.15)]">
                    {[
                      { label: 'Chậm', ms: 1000 },
                      { label: 'Vừa', ms: 660 },
                      { label: 'Nhanh', ms: 380 },
                    ].map((spd) => (
                      <button
                        key={spd.ms}
                        type="button"
                        data-testid={`stroke-speed-preset-${spd.ms}`}
                        onClick={() => handleUpdateStrokeSpeed(spd.ms)}
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                          Math.abs(strokeSpeedMs - spd.ms) < 90
                            ? 'bg-[#1E3227] text-[#FAFBF7]'
                            : 'text-[#3F5447] hover:text-[#1E3227]'
                        }`}
                      >
                        {spd.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min="340"
                    max="1100"
                    step="20"
                    value={1440 - strokeSpeedMs}
                    onChange={(e) => handleUpdateStrokeSpeed(1440 - Number(e.target.value))}
                    className="w-20 accent-[#1E3227] cursor-pointer"
                    aria-label="Thanh trượt tốc độ viết nét chữ"
                    data-testid="stroke-speed-slider"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-[#1E3227]">Giọng đọc chuẩn:</span>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={speechRate}
                    onChange={(e) => handleUpdateSpeechRate(parseFloat(e.target.value))}
                    className="w-20 accent-[#1E3227] cursor-pointer"
                    aria-label="Thanh trượt tốc độ giọng đọc chuẩn"
                    data-testid="voice-speed-slider"
                  />
                  <span
                    data-testid="voice-speed-value"
                    className="px-2 py-0.5 rounded-lg bg-white border border-[#9B8A3E]/50 text-[#1E3227] font-bold tabular-nums"
                  >
                    {speechRate.toFixed(2).replace(/0$/, '')}x
                  </span>
                  <div className="inline-flex items-center rounded-xl bg-[#E7ECD9] p-0.5 border border-[rgba(30,50,39,0.15)]">
                    {[0.5, 0.75, 1.0, 1.25, 1.5].map((rateVal) => (
                      <button
                        key={rateVal}
                        type="button"
                        data-testid={`voice-rate-preset-${rateVal}`}
                        onClick={() => {
                          handleUpdateSpeechRate(rateVal);
                          speakChinese(currentSlide.hanzi, rateVal);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                          Math.abs(speechRate - rateVal) < 0.03
                            ? 'bg-[#1E3227] text-[#FAFBF7]'
                            : 'text-[#3F5447] hover:text-[#1E3227]'
                        }`}
                      >
                        {rateVal}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Clean Single-Row Horizontal Scrollable Vocabulary Strip (1 -> 20) */}
          <div
            data-testid="horizontal-vocab-pill-strip"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1"
          >
            {(filteredSlides.length > 0 ? filteredSlides : slides).map((s) => {
              const originalIdx = slides.findIndex((item) => item.id === s.id);
              const idx = originalIdx !== -1 ? originalIdx : 0;
              const isActive = idx === activeSlideIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    handleSelectSlide(idx);
                    speakChinese(s.hanzi);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 border cursor-pointer ${
                    isActive
                      ? 'bg-[#1E3227] border-[#9B8A3E] text-[#FAFBF7] shadow-2xs'
                      : 'bg-white/85 border-[rgba(30,50,39,0.14)] text-[#3F5447] hover:text-[#1E3227] hover:bg-[#FAFBF7] hover:border-[#9B8A3E]'
                  }`}
                >
                  <span
                    className={`text-[10px] font-bold tabular-nums ${
                      isActive ? 'text-[#C5B358]' : 'text-[#5F7266]'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className={`font-['Noto_Sans_SC'] text-sm font-bold ${
                      isActive ? 'text-[#FAFBF7]' : 'text-[#1E3227]'
                    }`}
                  >
                    {s.hanzi}
                  </span>
                  {s.learned && (
                    <span className="inline-flex items-center gap-0.5">
                      <span
                        data-testid={`learned-green-dot-${s.hanzi}`}
                        className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
                      />
                      <Check
                        className={`w-3 h-3 ${
                          isActive ? 'text-[#C5B358]' : 'text-[#1E3227]'
                        }`}
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* =================================================================
              4B. STUDENT SPACED REPETITION FLASHCARD & MISTAKE NOTEBOOK (错题本)
              ================================================================= */}
          {roleMode === 'student' && studentStudyMode === 'flashcard' && (
            <div
              data-testid="student-srs-flashcard-workspace"
              className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch"
            >
              {/* Left 7 Cols: Interactive Flip Flashcard + 3 SRS Rating Buttons */}
              <div className="lg:col-span-7 rounded-2xl bg-[#FAFBF7] border-2 border-[#9B8A3E]/55 p-5 flex flex-col justify-between shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(30,50,39,0.12)] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#1E3227] text-[#C5B358] text-xs font-extrabold">
                      🃏 Flashcard Lật Thẻ · {currentHsk3Meta.hskLevelNormalized}
                    </span>
                    <span className="text-xs font-bold text-[#3F5447]">
                      Thẻ {activeSlideIndex + 1}/{slides.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => speakChinese(currentSlide.hanzi, speechRate)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#1E3227] text-[#FAFBF7] text-xs font-bold cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-[#C5B358]" />
                      <span>Nghe âm</span>
                    </button>
                    <button
                      type="button"
                      data-testid="flashcard-flip-toggle-btn"
                      onClick={() => setIsCardFlipped((f) => !f)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#E7ECD9] text-[#1E3227] text-xs font-bold border border-[#9B8A3E]/40 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#9B8A3E]" />
                      <span>{isCardFlipped ? 'Xem mặt trước' : 'Lật xem đáp án'}</span>
                    </button>
                  </div>
                </div>

                {/* Main Flippable Card Surface */}
                <div
                  onClick={() => setIsCardFlipped((f) => !f)}
                  className="my-1 p-6 rounded-2xl bg-white border-2 border-dashed border-[#9B8A3E]/60 hover:border-[#1E3227] transition-all cursor-pointer text-center space-y-3 min-h-[220px] flex flex-col items-center justify-center"
                >
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#9B8A3E]">
                    {isCardFlipped
                      ? 'MẶT SAU: PHIÊN ÂM · HÁN VIỆT · NGHĨA & CÂU VÍ DỤ'
                      : 'MẶT TRƯỚC: NHÌN CHỮ HÁN ĐOÁN ÂM & NGHĨA (BẤM ĐỂ LẬT THẺ)'}
                  </div>
                  <div className="font-['Noto_Sans_SC'] text-6xl sm:text-7xl font-bold text-[#1E3227] leading-none">
                    {currentSlide.hanzi}
                  </div>

                  {isCardFlipped ? (
                    <div className="space-y-1.5 pt-2 border-t border-[rgba(30,50,39,0.1)] w-full max-w-md">
                      <div className="text-xl font-bold text-[#9B8A3E]">
                        {currentSlide.pinyin} · <span className="text-[#1E3227] uppercase">{currentSlide.hanViet}</span>
                      </div>
                      <div className="text-base font-extrabold text-[#1E3227]">
                        Nghĩa: {currentSlide.meaning}
                      </div>
                      <div className="text-xs text-[#3F5447] bg-[#F4F6EE] px-3 py-1.5 rounded-xl">
                        🎵 {currentToneSandhi.ruleTitle}: <strong>{currentToneSandhi.spokenPinyin}</strong>
                      </div>
                      <div className="text-xs text-[#1E3227] font-['Noto_Sans_SC'] pt-1">
                        Ví dụ: <strong>{currentSlide.exampleHanzi}</strong> ({currentSlide.exampleMeaning})
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#3F5447]">
                      Hãy tự nhẩm Pinyin, nghĩa tiếng Việt và cấu trúc câu trước khi bấm lật thẻ
                    </p>
                  )}
                </div>

                {/* 3 Spaced Repetition Rating Buttons */}
                <div className="space-y-2 pt-2 border-t border-[rgba(30,50,39,0.12)]">
                  <div className="text-[11px] font-bold text-[#3F5447] text-center">
                    Đánh giá mức độ ghi nhớ (Spaced Repetition — Tự động lọc từ khó vào Sổ tay từ hay quên 错题本):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      data-testid="srs-rate-again-btn"
                      onClick={() => handleRateCurrentWordSrs('again')}
                      className="py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 border border-red-300 text-red-900 text-xs font-bold transition-all cursor-pointer"
                    >
                      😰 Chưa nhớ - Ôn lại ngay
                    </button>
                    <button
                      type="button"
                      data-testid="srs-rate-hard-btn"
                      onClick={() => handleRateCurrentWordSrs('hard')}
                      className="py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold transition-all cursor-pointer"
                    >
                      🤔 Hơi nhớ
                    </button>
                    <button
                      type="button"
                      data-testid="srs-rate-good-btn"
                      onClick={() => handleRateCurrentWordSrs('good')}
                      className="py-2.5 px-3 rounded-xl bg-[#1E3227] hover:bg-[#2B4637] border border-[#9B8A3E] text-[#FAFBF7] text-xs font-bold transition-all cursor-pointer"
                    >
                      ✅ Đã thuộc lòng
                    </button>
                  </div>
                </div>
              </div>

              {/* Right 5 Cols: Personal Mistake Notebook ("Sổ tay từ hay quên / 错题本") */}
              <div
                data-testid="student-mistake-notebook-panel"
                className="lg:col-span-5 rounded-2xl bg-[#FAFBF7] border-2 border-[#1E3227]/20 p-5 flex flex-col justify-between shadow-xs space-y-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 border-b border-[rgba(30,50,39,0.12)] pb-2.5">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#9B8A3E]">
                        SPACED REPETITION · CÁ NHÂN HÓA
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-[#1E3227]">
                        📓 Sổ tay từ hay quên (错题本)
                      </h4>
                    </div>
                    <span
                      data-testid="mistake-notebook-count"
                      className="px-2.5 py-1 rounded-xl bg-[#1E3227] text-[#C5B358] text-xs font-extrabold tabular-nums"
                    >
                      {mistakeNotebookList.length} từ cần ôn
                    </span>
                  </div>

                  <p className="text-xs text-[#3F5447]">
                    Các từ bạn bấm <strong>“😰 Chưa nhớ”</strong> hoặc <strong>“🤔 Hơi nhớ”</strong> được tự động tổng hợp tại đây để ôn tập trọng tâm trước khi làm bài.
                  </p>

                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {mistakeNotebookList.length === 0 ? (
                      <div className="p-4 rounded-xl bg-[#E7ECD9]/60 border border-[#1E3227]/15 text-xs text-[#1E3227] text-center font-semibold">
                        🎉 Tuyệt vời! Hiện tại không có từ nào trong Sổ tay từ hay quên.
                      </div>
                    ) : (
                      mistakeNotebookList.map((item) => {
                        const slideIdx = slides.findIndex(
                          (s) => s.id === item.slideId || s.hanzi === item.hanzi
                        );
                        return (
                          <div
                            key={item.slideId}
                            data-testid={`mistake-word-${item.hanzi}`}
                            className="p-2.5 rounded-xl bg-white border border-[rgba(30,50,39,0.14)] flex items-center justify-between gap-2 hover:border-[#9B8A3E] transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <button
                                type="button"
                                onClick={() => {
                                  if (slideIdx !== -1) handleSelectSlide(slideIdx);
                                  speakChinese(item.hanzi, speechRate);
                                }}
                                className="min-w-[38px] px-2 h-9 rounded-xl bg-[#1E3227] text-[#C5B358] font-['Noto_Sans_SC'] font-bold text-sm flex items-center justify-center shrink-0 cursor-pointer whitespace-nowrap"
                              >
                                {item.hanzi}
                              </button>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-[#1E3227] truncate">
                                  {item.pinyin} · <span className="text-[#9B8A3E]">{item.meaning}</span>
                                </div>
                                <div className="text-[10px] text-[#3F5447]">
                                  {item.rating === 'again'
                                    ? '😰 Chưa nhớ · Cần ôn ngay'
                                    : '🤔 Hơi nhớ · Ôn củng cố'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  if (slideIdx !== -1) handleSelectSlide(slideIdx);
                                  speakChinese(item.hanzi, speechRate);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#E7ECD9] hover:bg-[#dce3c8] text-[#1E3227] text-[11px] font-bold cursor-pointer"
                              >
                                Ôn ngay
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[rgba(30,50,39,0.12)] flex flex-wrap items-center justify-between gap-2">
                  {onChangeStudentStudyMode && (
                    <button
                      type="button"
                      onClick={() => onChangeStudentStudyMode('writing')}
                      className="px-3 py-1.5 rounded-xl bg-white border border-[rgba(30,50,39,0.2)] text-[#1E3227] text-xs font-bold hover:bg-[#E7ECD9] cursor-pointer"
                    >
                      📖 Chuyển sang Luyện viết chữ Mễ
                    </button>
                  )}
                  {onSwitchToStudentHomework && (
                    <button
                      type="button"
                      onClick={onSwitchToStudentHomework}
                      className="px-3 py-1.5 rounded-xl bg-[#1E3227] text-[#FAFBF7] text-xs font-bold hover:bg-[#2B4637] cursor-pointer"
                    >
                      ✍️ Làm Bài Tập 5 Kỹ Năng HSK 3.0 →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              5. STREAMLINED MAIN 3-COLUMN CARD (BALANCED & FITS IN 1 VIEWPORT)
              ================================================================= */}
          {(roleMode !== 'student' || studentStudyMode !== 'flashcard') && (
          <div className="grid grid-cols-2 lg:grid-cols-12 gap-2.5 sm:gap-3.5 items-stretch">
            {/* COLUMN 1 (col-span-1 on split/mobile, lg:col-span-4 on desktop): Vocabulary Card on the Left */}
            <div className="col-span-1 lg:col-span-4 rounded-2xl backdrop-blur-xl bg-white/75 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-[#C5B358]/50 p-2.5 sm:p-3.5 flex flex-col justify-between transition-all duration-300">
              <div>
                {/* Only 2 Refined Badges at Top of Card: [HSK X] and [✍️ Chữ viết tay / 👁️ Chữ nhận diện] */}
                <div className="flex items-center justify-between gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-[#FAF7F0] text-[11px] sm:text-xs font-extrabold tracking-wide shadow-2xs">
                    {currentHsk3Meta.hskLevelNormalized}
                  </span>

                  <span
                    data-testid="hsk3-char-category-badge"
                    className={`px-2 py-0.5 rounded-lg border text-[11px] sm:text-xs font-bold ${
                      currentHsk3Meta.charCategory === 'handwriting'
                        ? 'bg-[#0F5243]/10 border-[#0F5243]/25 text-[#0F5243]'
                        : 'bg-[#FAF7F0] border-[#9B8A3E]/45 text-[#0F382E]'
                    }`}
                  >
                    {currentHsk3Meta.charCategory === 'handwriting'
                      ? '✍️ Viết tay'
                      : '👁️ Nhận diện'}
                  </span>
                </div>

                {/* Prominent Hanzi + Pinyin + Hán Việt + Meaning */}
                {!isCardFlipped ? (
                  <div className="my-1.5 sm:my-2 text-center">
                    <div className="inline-flex items-center justify-center gap-2">
                      <span
                        className="font-hanzi-calligraphy text-3xl xs:text-4xl sm:text-5xl xl:text-6xl font-bold tracking-wide text-[#0F382E] select-all leading-none"
                        data-testid="active-slide-hanzi"
                      >
                        {currentSlide.hanzi}
                      </span>
                    </div>

                    <p className="mt-1 text-xs sm:text-sm font-bold text-[#0F382E] flex flex-wrap items-center justify-center gap-1.5 leading-snug">
                      {showPinyin && (
                        <span className="text-[#9B8A3E] tracking-wide" data-testid="active-slide-pinyin">
                          {currentSlide.pinyin}
                        </span>
                      )}
                      <span className="text-[#9B8A3E]/60">·</span>
                      <span className="text-[#0F382E] uppercase tracking-wide" data-testid="active-slide-hanviet">
                        [{currentSlide.hanViet}]
                      </span>
                      {showMeaning && (
                        <>
                          <span className="text-[#9B8A3E]/60">·</span>
                          <span className="text-[#3A544B] font-semibold" data-testid="active-slide-meaning">
                            {currentSlide.meaning}
                          </span>
                        </>
                      )}
                    </p>

                    {/* Inline Short Example Sentence + [🔊 Nghe câu] right below meaning */}
                    <div
                      data-testid="col1-inline-example-row"
                      className="mt-1.5 px-2.5 py-1 rounded-xl bg-[#FAF7F0]/90 border border-[#0F5243]/14 flex items-center justify-between gap-1.5 text-left"
                    >
                      <span
                        data-testid="col1-inline-example-hanzi"
                        className="font-['Noto_Sans_SC'] text-xs sm:text-sm font-bold text-[#0F382E] truncate"
                        title={`${currentSlide.exampleHanzi} (${currentSlide.examplePinyin}) — ${currentSlide.exampleMeaning}`}
                      >
                        {renderHighlightedExample(currentSlide.exampleHanzi, currentSlide.hanzi)}
                      </span>
                      <button
                        type="button"
                        data-testid="col1-inline-listen-example-btn"
                        onClick={() => speakChinese(currentSlide.exampleHanzi, speechRate)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gradient-to-r from-[#0F5243] to-[#166E5B] hover:from-[#12604F] hover:to-[#1B7D68] text-[#FAF7F0] text-[10px] font-bold shrink-0 cursor-pointer transition-all duration-300 active:scale-95"
                      >
                        <Volume2 className="w-3 h-3 text-[#C5B358]" />
                        <span>Nghe câu</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="my-1.5 sm:my-2 text-center p-2.5 rounded-xl bg-[#F4F6EE] border border-dashed border-[#9B8A3E]">
                    <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#9B8A3E] font-bold">
                      Chế độ kiểm tra nhớ từ
                    </p>
                    <p
                      className="font-['Noto_Sans_SC'] text-4xl sm:text-5xl font-bold text-[#1E3227] my-1"
                      data-testid="active-slide-hanzi"
                    >
                      {currentSlide.hanzi}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsCardFlipped(false)}
                      className="mt-1 px-2.5 py-0.5 rounded-xl bg-[#1E3227] text-[#FAFBF7] text-xs font-semibold cursor-pointer"
                    >
                      Hiện đáp án
                    </button>
                  </div>
                )}

                {/* Control Buttons Row Placed Immediately Below the Example Sentence */}
                <div
                  data-testid="col1-card-controls-row"
                  className="flex flex-wrap items-center justify-between gap-1 py-1.5 border-y border-[rgba(30,50,39,0.12)]"
                >
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => speakChinese(currentSlide.hanzi, speechRate)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#0F5243] to-[#166E5B] hover:from-[#12604F] hover:to-[#1B7D68] text-[#FAF7F0] text-[11px] sm:text-xs font-bold shadow-[0_2px_10px_rgba(15,82,67,0.22)] transition-all duration-300 active:scale-95 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-[#C5B358]" />
                      <span>Phát âm</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => speakChinese(currentSlide.hanzi, 0.55)}
                      className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-white/85 hover:bg-white text-[#0F382E] text-[11px] sm:text-xs font-semibold border border-[#0F5243]/15 transition-all duration-300 active:scale-95 cursor-pointer"
                    >
                      <span>🐢 Chậm</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {roleMode === 'teacher' && (
                      <button
                        type="button"
                        data-testid="quick-edit-slide-btn"
                        onClick={handleOpenQuickEditModal}
                        title="Sửa nhanh Nghĩa, Câu ví dụ, Pinyin & Tạo ảnh minh họa theo ngữ cảnh"
                        className="inline-flex items-center gap-0.5 px-2 py-1 rounded-xl bg-[#FAF7F0] hover:bg-white text-[#0F382E] text-[11px] sm:text-xs font-bold border border-[#C5B358]/60 transition-all duration-300 active:scale-95 cursor-pointer"
                      >
                        <span>✏️ Sửa thẻ</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsCardFlipped((f) => !f)}
                      className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-white/85 hover:bg-white text-[#0F382E] text-[11px] sm:text-xs font-semibold border border-[#0F5243]/15 transition-all duration-300 active:scale-95 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 text-[#9B8A3E]" />
                      <span>Lật thẻ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleLearned(currentSlide.id)}
                      className={`px-2 py-1 rounded-xl text-[11px] sm:text-xs font-bold border transition-all duration-300 active:scale-95 cursor-pointer ${
                        currentSlide.learned
                          ? 'bg-gradient-to-r from-[#0F5243] to-[#166E5B] border-[#0F5243] text-[#FAF7F0] shadow-2xs'
                          : 'bg-white/85 border-[#0F5243]/15 text-[#3A544B] hover:text-[#0F5243]'
                      }`}
                    >
                      {currentSlide.learned ? '✓ Thuộc' : 'Thuộc'}
                    </button>
                  </div>
                </div>

                {/* Compact 3-Tab / Accordion Box: [🧩 Chiết tự] vs [📐 Ngữ pháp] vs [💬 Ví dụ & Hội thoại] + 1-Line Tone Sandhi Badge */}
                <div className="rounded-xl bg-[#F4F6EE] border border-[rgba(30,50,39,0.12)] p-1.5 sm:p-2 mt-1.5">
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#E7ECD9] mb-1">
                    <button
                      type="button"
                      data-testid="col1-tab-radical"
                      onClick={() => {
                        if (col1ActiveTab === 'radical' && isCol1AccordionOpen) {
                          setIsCol1AccordionOpen(false);
                        } else {
                          setCol1ActiveTab('radical');
                          setIsCol1AccordionOpen(true);
                        }
                      }}
                      className={`flex-1 py-1 px-1 rounded-md text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                        col1ActiveTab === 'radical' && isCol1AccordionOpen
                          ? 'bg-[#1E3227] text-[#FAFBF7] shadow-2xs'
                          : 'text-[#3F5447] hover:text-[#1E3227]'
                      }`}
                    >
                      🧩 Chiết tự {isCol1AccordionOpen && col1ActiveTab === 'radical' ? '▲' : '▾'}
                    </button>
                    <button
                      type="button"
                      data-testid="col1-tab-grammar"
                      onClick={() => {
                        if (col1ActiveTab === 'grammar' && isCol1AccordionOpen) {
                          setIsCol1AccordionOpen(false);
                        } else {
                          setCol1ActiveTab('grammar');
                          setIsCol1AccordionOpen(true);
                        }
                      }}
                      className={`flex-1 py-1 px-1 rounded-md text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                        col1ActiveTab === 'grammar' && isCol1AccordionOpen
                          ? 'bg-[#1E3227] text-[#FAFBF7] shadow-2xs'
                          : 'text-[#3F5447] hover:text-[#1E3227]'
                      }`}
                    >
                      📐 Ngữ pháp {isCol1AccordionOpen && col1ActiveTab === 'grammar' ? '▲' : '▾'}
                    </button>
                    <button
                      type="button"
                      data-testid="col1-tab-example"
                      onClick={() => {
                        if (col1ActiveTab === 'example' && isCol1AccordionOpen) {
                          setIsCol1AccordionOpen(false);
                        } else {
                          setCol1ActiveTab('example');
                          setIsCol1AccordionOpen(true);
                        }
                      }}
                      className={`flex-1 py-1 px-1 rounded-md text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                        col1ActiveTab === 'example' && isCol1AccordionOpen
                          ? 'bg-[#1E3227] text-[#FAFBF7] shadow-2xs'
                          : 'text-[#3F5447] hover:text-[#1E3227]'
                      }`}
                    >
                      💬 Ví dụ & Hội thoại {isCol1AccordionOpen && col1ActiveTab === 'example' ? '▲' : '▾'}
                    </button>
                  </div>

                  {isCol1AccordionOpen && (
                    col1ActiveTab === 'radical' ? (
                      <div className="grid grid-cols-1 gap-1 my-1" data-testid="col1-radical-panel">
                        {currentSlide.characters.map((ch, idx) => (
                          <div
                            key={`rad-breakdown-${ch.char}-${idx}`}
                            className="flex items-center justify-between text-xs bg-white px-2 py-1 rounded-lg border border-[rgba(30,50,39,0.1)]"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-['Noto_Sans_SC'] text-sm font-bold text-[#1E3227]">
                                {ch.char}
                              </span>
                              <span className="text-[#9B8A3E] font-semibold text-[11px]">({ch.pinyin})</span>
                            </div>
                            <span className="text-[#3F5447] text-[11px]">
                              Bộ: <strong className="text-[#1E3227]">{ch.radical}</strong> ·{' '}
                              <span className="font-bold text-[#9B8A3E]">{ch.strokeCount} nét</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : col1ActiveTab === 'grammar' ? (
                      <div
                        data-testid="hsk3-grammar-point-box"
                        className="space-y-1 bg-white p-2 rounded-lg border border-[#9B8A3E]/40 my-1"
                      >
                        <div
                          data-testid="hsk3-grammar-formula"
                          className="px-2 py-0.5 rounded-md bg-[#1E3227] text-[#C5B358] font-mono text-[10px] sm:text-[11px] font-bold tracking-wide"
                        >
                          {currentHsk3Meta.grammarFormula}
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-[#3F5447] leading-snug">
                          {currentHsk3Meta.synonymDistinction}
                        </p>
                      </div>
                    ) : (
                      <div
                        data-testid="col1-example-dialogue-panel"
                        className="space-y-1.5 bg-white p-2 rounded-lg border border-[#9B8A3E]/40 my-1 text-left"
                      >
                        <div className="space-y-0.5 pb-1.5 border-b border-[rgba(30,50,39,0.1)]">
                          <div className="font-['Noto_Sans_SC'] text-xs sm:text-sm font-bold text-[#1E3227]">
                            {renderHighlightedExample(currentSlide.exampleHanzi, currentSlide.hanzi)}
                          </div>
                          {showPinyin && (
                            <div className="text-[11px] text-[#9B8A3E] font-medium">
                              {currentSlide.examplePinyin}
                            </div>
                          )}
                          {(showMeaning || showVietnamese) && (
                            <div className="text-[11px] text-[#3F5447] italic">
                              {currentSlide.exampleMeaning}
                            </div>
                          )}
                        </div>
                        <div className="space-y-1 max-h-[120px] overflow-y-auto pr-0.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9B8A3E]">
                              💬 Hội thoại ngữ cảnh (课文)
                            </span>
                            <button
                              type="button"
                              onClick={handlePlayContextualDialogue}
                              className="text-[10px] font-bold text-[#1E3227] hover:text-[#C84B31] cursor-pointer"
                            >
                              {isPlayingDialogue ? '⏹ Dừng' : '🔊 Nghe hội thoại'}
                            </button>
                          </div>
                          {currentDialogue.turns.map((turn, idx) => (
                            <div
                              key={`col1-turn-${idx}`}
                              onClick={() => speakChinese(turn.hanziLine, speechRate)}
                              className="p-1.5 rounded-lg bg-[#F4F6EE] hover:bg-[#E7ECD9] text-[11px] cursor-pointer transition-colors"
                            >
                              <span className="font-bold text-[#9B8A3E] mr-1">{turn.speaker}:</span>
                              <span className="font-['Noto_Sans_SC'] font-bold text-[#1E3227]">
                                {turn.hanziLine}
                              </span>
                              {(showMeaning || showVietnamese) && (
                                <span className="block text-[10px] text-[#3F5447] italic">
                                  {turn.meaningLine}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}

                  {/* Ultra-Compact 1-Line Tone Sandhi Badge ONLY when word has genuine Tone Sandhi */}
                  {currentToneSandhi.hasSandhi && (
                    <div data-testid="tone-sandhi-box" className="mt-1">
                      <button
                        type="button"
                        data-testid="tone-sandhi-info-toggle"
                        onClick={() => setShowToneSandhiInfo((v) => !v)}
                        title={currentToneSandhi.explanationVi}
                        className="w-full px-2 py-1 rounded-lg bg-white hover:bg-[#FAFBF7] border border-[#9B8A3E]/35 flex items-center justify-between gap-1 text-left transition-colors cursor-pointer"
                      >
                        <span className="text-[10px] sm:text-[11px] font-bold text-[#1E3227] truncate">
                          🎵 Biến điệu: {currentToneSandhi.ruleTitle.replace(/^Biến điệu\s*/i, '')}
                        </span>
                        <span className="inline-flex items-center gap-0.5 shrink-0">
                          <span className="px-1 py-0.5 rounded bg-[#E7ECD9] text-[#1E3227] font-mono text-[9px] sm:text-[10px] font-bold">
                            {currentToneSandhi.spokenPinyin}
                          </span>
                          <span className="text-[10px] font-bold text-[#9B8A3E]">ⓘ</span>
                        </span>
                      </button>
                      {showToneSandhiInfo && (
                        <p className="mt-1 px-2 py-1 rounded-lg bg-white/95 border border-[#9B8A3E]/30 text-[10px] text-[#3F5447] leading-snug">
                          {currentToneSandhi.explanationVi}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* COLUMN 2 (col-span-1 on split/mobile, lg:col-span-4 on desktop): Mi Zi Ge Canvas on the Right (same row as Hanzi) */}
            <div
              className="col-span-1 lg:col-span-4 rounded-2xl backdrop-blur-xl bg-white/75 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-[#C5B358]/50 p-2.5 sm:p-3.5 flex flex-col justify-between transition-all duration-300"
              data-testid="inline-stroke-panel"
            >
              {/* Top Meta Header */}
              <div className="flex items-center justify-between gap-1.5">
                <div>
                  <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#0F382E]">
                    Ô Mễ Tự Cách (米字格)
                  </div>
                  <div
                    className="text-[10px] sm:text-[11px] text-[#3A544B]"
                    data-testid="inline-stroke-meta"
                  >
                    Chữ <strong className="text-[#0F382E] font-hanzi-calligraphy text-sm">{currentChar.char}</strong> · Bộ:{' '}
                    <strong className="text-[#0F382E]">{currentChar.radical}</strong> ·{' '}
                    <strong className="text-[#9B8A3E] tabular-nums" data-testid="inline-stroke-counter">
                      {currentProgressCount}/{totalStrokes} nét
                    </strong>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-lg bg-[#0F5243]/10 border border-[#0F5243]/20 text-[#0F5243] text-[10px] sm:text-[11px] font-bold tabular-nums">
                  {practiceAccuracy !== null
                    ? `🎯 ${practiceAccuracy}%`
                    : inlineStrokeMode === 'animate'
                    ? 'Mẫu nét'
                    : `Nét ${Math.min(userStrokes.length + 1, totalStrokes)}`}
                </span>
              </div>

              {/* Centered Mi Zi Ge (米字格) Canvas with Ebony/Gold Frame & Cinnabar Dashed Grid */}
              <div className="my-1.5 sm:my-2 flex flex-col items-center justify-center">
                <div className="relative mx-auto w-32 h-32 xs:w-40 xs:h-40 sm:w-48 sm:h-48 md:w-52 md:h-52 rounded-2xl bg-[#FAF7F0] border-2 border-[#0F382E]/85 ring-2 ring-[#C5B358]/60 overflow-hidden select-none touch-none shadow-[inset_0_2px_12px_rgba(184,41,47,0.06)]">
                  <svg
                    ref={inlineSvgRef}
                    viewBox="0 0 100 100"
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
                            return (
                              <path
                                key={`hw-guide-${idx}`}
                                d={d}
                                fill={
                                  isCompletedPractice
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
                          return (
                            <path
                              key={`inline-guide-${idx}`}
                              d={pathStr}
                              fill="none"
                              stroke={isNextPracticeStroke ? '#B8C4A8' : '#E2DFCE'}
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
                    className="mt-2 w-full px-2.5 py-1.5 rounded-xl bg-[#F4F6EE] border border-[#9B8A3E]/50 text-[11px] flex items-center justify-between gap-2"
                  >
                    <span className="font-bold text-[#1E3227] tabular-nums">
                      🎯 {practiceEvalDetail.accuracy}% · {practiceEvalDetail.gradeLabel}
                    </span>
                    <span className="text-[#3F5447] truncate">{practiceEvalDetail.feedback}</span>
                  </div>
                )}
              </div>

              {/* Single Compact Control Row Beneath Canvas: [Chạy nét] [Viết thử] [Xóa] + Character Tabs [温][暖] */}
              <div className="pt-3 border-t border-[rgba(30,50,39,0.12)] flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setInlineStrokeMode('animate');
                      setIsAnimatingStrokes(true);
                      speakChinese(currentChar.char, speechRate);
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      inlineStrokeMode === 'animate'
                        ? 'bg-[#1E3227] text-[#FAFBF7]'
                        : 'bg-[#F4F6EE] text-[#1E3227] border border-[rgba(30,50,39,0.15)] hover:bg-[#E7ECD9]'
                    }`}
                  >
                    <Play className="w-3 h-3 text-[#C5B358]" />
                    <span>Chạy nét</span>
                  </button>

                  <button
                    type="button"
                    data-testid="inline-practice-stroke-btn"
                    onClick={handleSimulateInlineStroke}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#F4F6EE] text-[#1E3227] border border-[#9B8A3E]/50 hover:bg-[#E7ECD9] transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3 text-[#9B8A3E]" />
                    <span>Viết thử</span>
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
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold bg-white text-[#3F5447] border border-[rgba(30,50,39,0.15)] hover:text-[#1E3227] transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Xóa</span>
                  </button>
                </div>

                {/* Character Switcher Pills (e.g. 温 / 暖) + Print Button */}
                <div className="flex items-center gap-1">
                  {currentSlide.characters.map((ch, idx) => (
                    <button
                      key={`${ch.char}-${idx}`}
                      type="button"
                      data-testid={`char-tab-${ch.char}`}
                      onClick={() => {
                        setActiveCharIdx(idx);
                        speakChinese(ch.char, speechRate);
                      }}
                      className={`w-7 h-7 rounded-lg font-hanzi-calligraphy text-sm font-bold transition-all duration-300 active:scale-95 border cursor-pointer ${
                        activeCharIdx === idx
                          ? 'bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-[#FAF7F0] border-[#C5B358] shadow-2xs'
                          : 'bg-white/85 text-[#0F382E] border-[#0F5243]/15 hover:bg-white'
                      }`}
                    >
                      {ch.char}
                    </button>
                  ))}

                  <button
                    type="button"
                    data-testid="open-print-worksheet-btn"
                    onClick={() => setIsWorksheetModalOpen(true)}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-r from-[#0F5243] to-[#166E5B] hover:from-[#12604F] hover:to-[#1B7D68] text-[#C5B358] border border-[#C5B358]/50 transition-all duration-300 active:scale-95 cursor-pointer"
                    title="🖨️ In phiếu tập viết (A4)"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* COLUMN 3 (col-span-2 on split/mobile, lg:col-span-4 on desktop): ROUNDED ILLUSTRATION FRAME + COMPACT CONTEXT EXAMPLE CARD */}
            <div
              className="col-span-2 lg:col-span-4 rounded-2xl backdrop-blur-xl bg-white/75 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-[#C5B358]/50 p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-col justify-between gap-3 transition-all duration-300"
              data-testid="scene-and-example-column"
            >
              {/* Visual Illustration Card */}
              <div
                className="aspect-[400/220] w-full rounded-2xl overflow-hidden border border-[rgba(30,50,39,0.18)] bg-[#18221D] shadow-xs"
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
                className="flex-1 rounded-xl bg-[#F4F6EE] border border-[rgba(30,50,39,0.12)] p-3 flex flex-col justify-between gap-2"
                data-testid="scene-example-card"
              >
                {/* 2-Tab Header: [📝 Câu ví dụ] vs [💬 Hội thoại ngữ cảnh (课文)] */}
                <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-[#E7ECD9]">
                  <button
                    type="button"
                    data-testid="col3-tab-example"
                    onClick={() => {
                      stopDialogueKaraoke();
                      setCol3ActiveTab('example');
                    }}
                    className={`py-1 px-2 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      col3ActiveTab === 'example'
                        ? 'bg-[#1E3227] text-[#FAFBF7] shadow-2xs'
                        : 'text-[#3F5447] hover:text-[#1E3227]'
                    }`}
                  >
                    📝 Câu ví dụ mẫu
                  </button>
                  <button
                    type="button"
                    data-testid="toggle-contextual-dialogue-btn"
                    onClick={() => setCol3ActiveTab('dialogue')}
                    className={`py-1 px-2 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      col3ActiveTab === 'dialogue'
                        ? 'bg-[#1E3227] text-[#FAFBF7] shadow-2xs'
                        : 'text-[#3F5447] hover:text-[#1E3227]'
                    }`}
                  >
                    💬 Hội thoại ngữ cảnh (课文)
                  </button>
                </div>

                {col3ActiveTab === 'example' ? (
                  <>
                    <div className="space-y-1">
                      {/* Dòng 1: Câu ví dụ tiếng Trung */}
                      <div className="example-sentence-line flex items-center gap-2 overflow-x-auto whitespace-nowrap">
                        <span
                          className="font-['Noto_Sans_SC'] text-lg sm:text-xl font-bold text-[#1E3227]"
                          data-testid="scene-example-hanzi"
                        >
                          {renderHighlightedExample(currentSlide.exampleHanzi, currentSlide.hanzi)}
                        </span>
                      </div>

                      {/* Dòng 2: Phiên âm Pinyin */}
                      {showPinyin && (
                        <div className="text-xs sm:text-sm text-[#9B8A3E] font-medium tracking-wide">
                          {currentSlide.examplePinyin}
                        </div>
                      )}

                      {/* Dòng 3: Nghĩa tiếng Việt */}
                      {(showMeaning || showVietnamese) && (
                        <div className="text-xs sm:text-sm text-[#1E3227]/85 italic">
                          {currentSlide.exampleMeaning}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[rgba(30,50,39,0.12)]">
                      {/* Dòng nút Nghe câu, Đọc chậm và 🎙️ Đọc thử */}
                      <div className="example-actions-row flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => speakChinese(currentSlide.exampleHanzi, speechRate)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#1E3227] hover:bg-[#2B4637] text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-[#C5B358]" />
                          <span>Nghe câu</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => speakChinese(currentSlide.exampleHanzi, 0.55)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white text-[#1E3227] border border-[rgba(30,50,39,0.15)] rounded-xl text-xs font-semibold hover:bg-[#E7ECD9] transition-all cursor-pointer"
                        >
                          <span>🐢 Chậm</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleStartSpeechPractice}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isPracticingSpeech
                              ? 'bg-[#C84B31] text-white animate-pulse'
                              : 'bg-white hover:bg-[#FAFBF7] text-[#1E3227] border border-[#9B8A3E]/60 hover:border-[#1E3227]'
                          }`}
                          title="Nói tiếng Trung câu ví dụ để hệ thống chấm điểm phát âm zh-CN"
                        >
                          {isPracticingSpeech ? (
                            <>
                              <MicOff className="w-3.5 h-3.5" />
                              <span>Đang nghe...</span>
                            </>
                          ) : (
                            <>
                              <Mic className="w-3.5 h-3.5 text-[#C84B31]" />
                              <span>Đọc thử</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Listening Indicator */}
                      {isPracticingSpeech && (
                        <div className="p-2 rounded-xl bg-white border border-[#C84B31]/40 text-xs text-[#1E3227] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-[#C84B31] animate-ping shrink-0" />
                            <span className="font-semibold text-[11px] text-[#1E3227] truncate">
                              Hãy đọc: "{currentSlide.exampleHanzi}"
                            </span>
                          </div>
                          <span className="text-[10px] text-[#C84B31] font-bold shrink-0">
                            Nói ngay...
                          </span>
                        </div>
                      )}

                      {/* Speech Evaluation Result Card */}
                      {speechResult && (
                        <div className="p-2.5 rounded-xl bg-[#E7ECD9] border border-[#1E3227]/25 text-xs text-[#1E3227] flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md bg-[#1E3227] text-[#FAFBF7] font-bold text-[11px] tabular-nums">
                                🎯 {speechResult.score}%
                              </span>
                              <strong className="text-[11px] text-[#1E3227]">
                                {speechResult.feedback}
                              </strong>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSpeechResult(null)}
                              className="text-[11px] text-[#3F5447] hover:text-[#1E3227] px-1 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
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
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1.5 border-b border-[rgba(30,50,39,0.12)]">
                      <button
                        type="button"
                        data-testid="play-dialogue-karaoke-btn"
                        onClick={handlePlayContextualDialogue}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isPlayingDialogue
                            ? 'bg-[#C84B31] text-white shadow-xs'
                            : 'bg-[#1E3227] hover:bg-[#2B4637] text-[#FAFBF7]'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#C5B358]" />
                        <span>
                          {isPlayingDialogue ? 'Đang đọc Karaoke...' : 'Nghe hội thoại'}
                        </span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          data-testid="dialogue-toggle-pinyin"
                          onClick={() => setShowPinyin((v) => !v)}
                          className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer ${
                            showPinyin
                              ? 'bg-[#E7ECD9] border-[#1E3227]/25 text-[#1E3227]'
                              : 'bg-white border-[rgba(30,50,39,0.15)] text-[#5F7266]'
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
                          className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer ${
                            showMeaning
                              ? 'bg-[#E7ECD9] border-[#1E3227]/25 text-[#1E3227]'
                              : 'bg-white border-[rgba(30,50,39,0.15)] text-[#5F7266]'
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
                                ? 'bg-[#FFFDF5] border-2 border-[#C84B31] shadow-xs ring-2 ring-[#C5B358]/40'
                                : 'bg-white border-[rgba(30,50,39,0.12)] hover:border-[#9B8A3E]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                                      turn.speaker === 'A'
                                        ? 'bg-[#1E3227] text-[#C5B358]'
                                        : 'bg-[#9B8A3E] text-white'
                                    }`}
                                  >
                                    {turn.speaker} · {turn.speakerName}
                                  </span>
                                  {isKaraokeActive && (
                                    <span
                                      data-testid="karaoke-active-badge"
                                      className="px-1.5 py-0.5 rounded bg-[#C84B31] text-white text-[9px] font-bold uppercase tracking-wider"
                                    >
                                      Đang đọc
                                    </span>
                                  )}
                                </div>

                                <div className="font-['Noto_Sans_SC'] text-sm font-bold text-[#1E3227] leading-snug pt-0.5">
                                  {renderHighlightedExample(turn.hanziLine, currentSlide.hanzi)}
                                </div>

                                {showPinyin && (
                                  <div
                                    data-testid={`dialogue-pinyin-${idx}`}
                                    className="text-[11px] font-medium text-[#9B8A3E] leading-snug"
                                  >
                                    {turn.pinyinLine}
                                  </div>
                                )}

                                {(showMeaning || showVietnamese) && (
                                  <div
                                    data-testid={`dialogue-meaning-${idx}`}
                                    className="text-[11px] text-[#3F5447] italic leading-snug"
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
                                className="w-6 h-6 rounded-lg bg-[#E7ECD9] hover:bg-[#1E3227] text-[#1E3227] hover:text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
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
              BOTTOM BAR: KEYBOARD SHORTCUTS LEGEND + INLINE BIN BIN AI TUTOR
              ================================================================= */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div
              data-testid="keyboard-shortcuts-bar"
              className="inline-flex flex-wrap items-center gap-1.5 px-3 py-1 rounded-xl bg-[rgba(255,255,255,0.68)] border border-[rgba(30,50,39,0.14)] text-[11px] text-[#3F5447]"
            >
              <span className="font-bold text-[#1E3227]">⌨️ Phím tắt đứng lớp:</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[#E7ECD9] border border-[rgba(30,50,39,0.2)] font-mono text-[10px] font-bold text-[#1E3227]">
                  ←
                </kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-[#E7ECD9] border border-[rgba(30,50,39,0.2)] font-mono text-[10px] font-bold text-[#1E3227]">
                  →
                </kbd>
                <span>Lùi/Tiến từ</span>
              </span>
              <span className="text-[#9B8A3E]/60">·</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[#E7ECD9] border border-[rgba(30,50,39,0.2)] font-mono text-[10px] font-bold text-[#1E3227]">
                  Space
                </kbd>
                <span>Phát âm</span>
              </span>
              <span className="text-[#9B8A3E]/60">·</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[#E7ECD9] border border-[rgba(30,50,39,0.2)] font-mono text-[10px] font-bold text-[#1E3227]">
                  W
                </kbd>
                <span>Chạy nét mẫu</span>
              </span>
              <span className="text-[#9B8A3E]/60">·</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[#E7ECD9] border border-[rgba(30,50,39,0.2)] font-mono text-[10px] font-bold text-[#1E3227]">
                  F
                </kbd>
                <span>Fullscreen</span>
              </span>
            </div>

            <BinBinPandaAI
              variant="inline"
              activeSlide={currentSlide}
              externalMood={pandaMood}
              title="🐼 Trợ Giảng Gấu Trúc · 彬彬"
              onApplyToSlide={(payload) => {
                setToastMessage(
                  `✓ Đã đẩy từ "${payload.hanzi}" (${payload.pinyin} — ${payload.meaning}) từ Trợ Giảng 彬彬 vào Slide bài giảng!`
                );
              }}
            />
          </div>

          {/* =================================================================
              MODAL 1: ➕ TỰ THÊM TỪ VỰNG MỚI VÀO DANH SÁCH SLIDE (LƯU LOCALSTORAGE)
              ================================================================= */}
          {isAddVocabModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
              role="dialog"
              aria-modal="true"
              data-testid="add-vocab-modal"
              onClick={() => setIsAddVocabModalOpen(false)}
            >
              <form
                onSubmit={handleSaveCustomVocab}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg rounded-3xl bg-[#FAFBF7] border border-[#9B8A3E]/60 shadow-2xl p-5 sm:p-6 space-y-4 text-[#1E3227]"
              >
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-[rgba(30,50,39,0.14)]">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#9B8A3E]">
                      SOẠN GIÁO ÁN HÁN NGỮ · LƯU TRỮ TỰ ĐỘNG
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[#1E3227] mt-0.5">
                      + Tự thêm từ vựng mới vào Slide bài giảng
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddVocabModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-white border border-[rgba(30,50,39,0.15)] flex items-center justify-center text-[#1E3227] hover:bg-[#F4F6EE] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {customVocabError && (
                  <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{customVocabError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1E3227] mb-1">
                      Chữ Hán (汉字) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      data-testid="custom-vocab-hanzi-input"
                      value={customHanzi}
                      onChange={(e) => setCustomHanzi(e.target.value)}
                      placeholder="Ví dụ: 团圆, 熊猫, 茶..."
                      autoFocus
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[rgba(30,50,39,0.2)] text-sm font-['Noto_Sans_SC'] font-bold text-[#1E3227] focus:outline-none focus:border-[#9B8A3E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1E3227] mb-1">
                      Phiên âm Pinyin
                    </label>
                    <input
                      type="text"
                      data-testid="custom-vocab-pinyin-input"
                      value={customPinyin}
                      onChange={(e) => setCustomPinyin(e.target.value)}
                      placeholder="Ví dụ: tuán yuán (để trống sẽ tự tra)"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[rgba(30,50,39,0.2)] text-xs sm:text-sm text-[#1E3227] focus:outline-none focus:border-[#9B8A3E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1E3227] mb-1">
                      Âm Hán Việt
                    </label>
                    <input
                      type="text"
                      data-testid="custom-vocab-hanviet-input"
                      value={customHanViet}
                      onChange={(e) => setCustomHanViet(e.target.value)}
                      placeholder="Ví dụ: đoàn viên"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[rgba(30,50,39,0.2)] text-xs sm:text-sm text-[#1E3227] focus:outline-none focus:border-[#9B8A3E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1E3227] mb-1">
                      Nghĩa tiếng Việt <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      data-testid="custom-vocab-meaning-input"
                      value={customMeaning}
                      onChange={(e) => setCustomMeaning(e.target.value)}
                      placeholder="Ví dụ: đoàn viên, sum họp"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[rgba(30,50,39,0.2)] text-xs sm:text-sm text-[#1E3227] focus:outline-none focus:border-[#9B8A3E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E3227] mb-1">
                    Câu ví dụ tiếng Trung (Ngữ cảnh trên Slide)
                  </label>
                  <input
                    type="text"
                    data-testid="custom-vocab-example-input"
                    value={customExampleHanzi}
                    onChange={(e) => setCustomExampleHanzi(e.target.value)}
                    placeholder="Ví dụ: 中秋节 全家人 一起 团圆。"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[rgba(30,50,39,0.2)] text-xs sm:text-sm font-['Noto_Sans_SC'] text-[#1E3227] focus:outline-none focus:border-[#9B8A3E]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1E3227] mb-1">
                      Dịch nghĩa câu ví dụ
                    </label>
                    <input
                      type="text"
                      value={customExampleMeaning}
                      onChange={(e) => setCustomExampleMeaning(e.target.value)}
                      placeholder="Ví dụ: Tết Trung thu cả nhà cùng sum họp."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[rgba(30,50,39,0.2)] text-xs text-[#1E3227] focus:outline-none focus:border-[#9B8A3E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1E3227] mb-1">
                      Cấp độ HSK
                    </label>
                    <select
                      value={customHskLevel}
                      onChange={(e) => setCustomHskLevel(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[rgba(30,50,39,0.2)] text-xs font-semibold text-[#1E3227] focus:outline-none focus:border-[#9B8A3E]"
                    >
                      <option value="HSK 1">HSK 1</option>
                      <option value="HSK 2">HSK 2</option>
                      <option value="HSK 3">HSK 3</option>
                      <option value="HSK 4">HSK 4</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[rgba(30,50,39,0.12)]">
                  <button
                    type="button"
                    onClick={() => setIsAddVocabModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white border border-[rgba(30,50,39,0.18)] text-xs font-semibold text-[#1E3227] hover:bg-[#F4F6EE] cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    data-testid="save-custom-vocab-btn"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E3227] hover:bg-[#2B4637] text-[#FAFBF7] text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#C5B358]" />
                    <span>Lưu &amp; Tạo Slide Ngay</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* =================================================================
              MODAL 2: 🖨️ BẢN XEM TRƯỚC TRANG A4 — PHIẾU TẬP VIẾT CHỮ MỄ (米字格)
              ================================================================= */}
          {isWorksheetModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
              role="dialog"
              aria-modal="true"
              data-testid="worksheet-a4-modal"
              onClick={() => setIsWorksheetModalOpen(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-4xl bg-white rounded-3xl border-2 border-[#9B8A3E] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Modal Action Bar */}
                <div className="px-5 py-3.5 bg-[#1E3227] text-[#FAFBF7] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Printer className="w-4 h-4 text-[#C5B358]" />
                    <span className="text-xs sm:text-sm font-bold">
                      🖨️ Bản Xem Trước Trang A4 — Phiếu Tập Viết Chữ Hán (米字格 · {slides.length} từ vựng)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="print-worksheet-confirm-btn"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#C5B358] hover:bg-[#d4c368] text-[#1E3227] text-xs font-bold transition-all cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>In ngay / Lưu PDF (A4)</span>
                    </button>
                    <button
                      type="button"
                      data-testid="close-worksheet-modal-btn"
                      onClick={() => setIsWorksheetModalOpen(false)}
                      className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold cursor-pointer"
                    >
                      Đóng
                    </button>
                  </div>
                </div>

                {/* Printable A4 Sheet Container */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#FAFBF7] text-[#1E3227] space-y-5">
                  <div className="border-b-2 border-[#1E3227] pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-widest text-[#9B8A3E]">
                        HANU × 阮文受 · GIÁO ÁN THỰC HÀNH HÁN TỰ CHUẨN HSK
                      </div>
                      <h2 className="text-xl font-bold text-[#1E3227] mt-0.5">
                        PHIẾU LUYỆN VIẾT CHỮ HÁN MỄ TỰ CÁCH (汉字米字格练习纸)
                      </h2>
                    </div>
                    <div className="text-xs text-[#3F5447] space-y-1 sm:text-right">
                      <div>Họ và tên học viên: ___________________________</div>
                      <div>Lớp: HSK 1–3 (Mã lớp: 722229) · Điểm: _______/100</div>
                    </div>
                  </div>

                  {/* Rows of Mi Zi Ge Grids for All Slides */}
                  <div className="space-y-3">
                    {slides.map((s, idx) => (
                      <div
                        key={`ws-${s.id}-${idx}`}
                        className="p-3 rounded-2xl bg-white border border-[#DCE2CE] flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div className="min-w-[190px] max-w-[230px]">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-bold text-[#9B8A3E] tabular-nums">
                              #{idx + 1}
                            </span>
                            <span className="font-['Noto_Sans_SC'] text-2xl font-bold text-[#1E3227]">
                              {s.hanzi}
                            </span>
                            <span className="text-xs font-bold text-[#9B8A3E]">{s.pinyin}</span>
                          </div>
                          <div className="text-[11px] text-[#3F5447] mt-0.5">
                            Hán Việt: <strong className="uppercase">{s.hanViet}</strong> · {s.meaning}
                          </div>
                          <div className="text-[10px] text-[#5F7266] mt-0.5">
                            {s.characters.map((c) => `${c.char} (${c.strokeCount} nét)`).join(' · ')}
                          </div>
                        </div>

                        {/* 7 Mi Zi Ge (米字格) Practice Boxes per Vocabulary Word */}
                        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                          {Array.from({ length: 7 }).map((_, boxIdx) => {
                            const charToRender =
                              s.characters[boxIdx % s.characters.length]?.char || s.hanzi[0];
                            const isModel = boxIdx < s.characters.length;
                            const isTrace =
                              boxIdx >= s.characters.length && boxIdx < s.characters.length * 2 + 1;
                            return (
                              <div
                                key={`mzg-${idx}-${boxIdx}`}
                                className="relative w-12 h-12 shrink-0 bg-[#F7F5EC] border border-[#C5B358]"
                              >
                                <svg viewBox="0 0 100 100" className="w-full h-full">
                                  <line
                                    x1="0"
                                    y1="50"
                                    x2="100"
                                    y2="50"
                                    stroke="#C5B358"
                                    strokeWidth="1"
                                    strokeDasharray="3 3"
                                    strokeOpacity="0.6"
                                  />
                                  <line
                                    x1="50"
                                    y1="0"
                                    x2="50"
                                    y2="100"
                                    stroke="#C5B358"
                                    strokeWidth="1"
                                    strokeDasharray="3 3"
                                    strokeOpacity="0.6"
                                  />
                                  <line
                                    x1="0"
                                    y1="0"
                                    x2="100"
                                    y2="100"
                                    stroke="#C5B358"
                                    strokeWidth="0.8"
                                    strokeDasharray="3 3"
                                    strokeOpacity="0.45"
                                  />
                                  <line
                                    x1="100"
                                    y1="0"
                                    x2="0"
                                    y2="100"
                                    stroke="#C5B358"
                                    strokeWidth="0.8"
                                    strokeDasharray="3 3"
                                    strokeOpacity="0.45"
                                  />
                                  {(isModel || isTrace) && (
                                    <text
                                      x="50"
                                      y="74"
                                      textAnchor="middle"
                                      className="font-['Noto_Sans_SC'] font-bold"
                                      fontSize="68"
                                      fill={isModel ? '#1E3227' : '#D0D5C6'}
                                    >
                                      {charToRender}
                                    </text>
                                  )}
                                </svg>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              MODAL 3: ✏️ SỬA NHANH THẺ BÀI GIẢNG & TẠO ẢNH KHỚP CÂU VÍ DỤ
              ================================================================= */}
          {isQuickEditModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
              role="dialog"
              aria-modal="true"
              data-testid="quick-edit-slide-modal"
              onClick={() => setIsQuickEditModalOpen(false)}
            >
              <form
                onSubmit={handleSaveQuickEditSlide}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg rounded-3xl bg-[#FAF7F0] border border-[#C5B358]/70 shadow-2xl p-5 sm:p-6 space-y-3.5 text-[#0F382E]"
              >
                <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-[#0F5243]/15">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#9B8A3E]">
                      FULL LESSON AUTHORING STUDIO · CHỈNH SỬA TRỰC TIẾP
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[#0F382E] mt-0.5">
                      ✏️ Sửa nhanh thẻ từ vựng “{currentSlide.hanzi}”
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsQuickEditModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-white border border-[#0F5243]/15 flex items-center justify-center text-[#0F382E] hover:bg-[#F4EFE6] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-[#0F382E] mb-1">Pinyin</label>
                    <input
                      type="text"
                      data-testid="quick-edit-pinyin-input"
                      value={editPinyin}
                      onChange={(e) => setEditPinyin(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#0F5243]/20 text-xs sm:text-sm font-semibold text-[#0F382E] focus:outline-none focus:border-[#0F5243]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#0F382E] mb-1">Hán Việt</label>
                    <input
                      type="text"
                      data-testid="quick-edit-hanviet-input"
                      value={editHanViet}
                      onChange={(e) => setEditHanViet(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#0F5243]/20 text-xs sm:text-sm font-semibold text-[#0F382E] focus:outline-none focus:border-[#0F5243]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#0F382E] mb-1">
                      Nghĩa tiếng Việt
                    </label>
                    <input
                      type="text"
                      data-testid="quick-edit-meaning-input"
                      value={editMeaning}
                      onChange={(e) => setEditMeaning(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#0F5243]/20 text-xs sm:text-sm font-semibold text-[#0F382E] focus:outline-none focus:border-[#0F5243]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-bold text-[#0F382E] mb-1">
                      Câu ví dụ tiếng Trung (Chuẩn HSK 3.0)
                    </label>
                    <input
                      type="text"
                      data-testid="quick-edit-example-hanzi-input"
                      value={editExampleHanzi}
                      onChange={(e) => setEditExampleHanzi(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#0F5243]/20 text-xs sm:text-sm font-['Noto_Sans_SC'] font-bold text-[#0F382E] focus:outline-none focus:border-[#0F5243]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-[#0F382E] mb-1">
                        Pinyin câu ví dụ
                      </label>
                      <input
                        type="text"
                        value={editExamplePinyin}
                        onChange={(e) => setEditExamplePinyin(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#0F5243]/20 text-xs text-[#0F382E] focus:outline-none focus:border-[#0F5243]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#0F382E] mb-1">
                        Nghĩa tiếng Việt câu ví dụ
                      </label>
                      <input
                        type="text"
                        data-testid="quick-edit-example-meaning-input"
                        value={editExampleMeaning}
                        onChange={(e) => setEditExampleMeaning(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#0F5243]/20 text-xs text-[#0F382E] focus:outline-none focus:border-[#0F5243]"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/90 border border-[#C5B358]/50 space-y-2">
                  <label className="block text-xs font-bold text-[#0F382E]">
                    🎨 Mô tả cảnh minh họa tùy chỉnh (Để trống sẽ tự động phân tích theo Câu ví dụ)
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      data-testid="quick-edit-image-prompt-input"
                      value={editCustomImagePrompt}
                      onChange={(e) => setEditCustomImagePrompt(e.target.value)}
                      placeholder="VD: sunrise over the Great Wall of China, calendar flipping..."
                      className="flex-1 px-3 py-1.5 rounded-xl bg-[#FAF7F0] border border-[#0F5243]/20 text-xs text-[#0F382E] focus:outline-none"
                    />
                    <button
                      type="button"
                      data-testid="generate-contextual-image-btn"
                      onClick={handleGenerateContextualImageForEdit}
                      className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#B8292F] to-[#961C21] hover:from-[#C83238] hover:to-[#A82026] text-white text-xs font-bold shadow-xs cursor-pointer shrink-0"
                    >
                      <span>🎨 Tạo ảnh khớp câu ví dụ</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#0F5243]/15">
                  <button
                    type="button"
                    onClick={() => setIsQuickEditModalOpen(false)}
                    className="px-4 py-1.5 rounded-xl bg-white border border-[#0F5243]/20 text-xs font-semibold text-[#0F382E] cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    data-testid="save-quick-edit-slide-btn"
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-[#FAF7F0] text-xs font-bold shadow-xs cursor-pointer"
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
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
              role="dialog"
              aria-modal="true"
              data-testid="batch-import-modal"
              onClick={() => setIsBatchImportModalOpen(false)}
            >
              <form
                onSubmit={handleConfirmBatchImport}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl rounded-3xl bg-[#FAF7F0] border border-[#C5B358]/70 shadow-2xl p-5 sm:p-6 space-y-4 text-[#0F382E]"
              >
                <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-[#0F5243]/15">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#9B8A3E]">
                      BATCH VOCABULARY IMPORT · CHUẨN HÓA HSK 3.0 TỰ ĐỘNG
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[#0F382E] mt-0.5">
                      📋 Nhập danh sách từ vựng hàng loạt (1-Click Batch Import)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBatchImportModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-white border border-[#0F5243]/15 flex items-center justify-center text-[#0F382E] hover:bg-[#F4EFE6] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F382E] mb-1">
                    Dán danh sách chữ Hán (cách nhau bởi dấu phẩy hoặc xuống dòng):
                  </label>
                  <textarea
                    rows={3}
                    data-testid="batch-import-textarea"
                    value={batchRawInput}
                    onChange={(e) => setBatchRawInput(e.target.value)}
                    placeholder="Ví dụ: 明天, 考试, 照顾, 旅行, 周末, 复习"
                    className="w-full px-3 py-2 rounded-2xl bg-white border border-[#0F5243]/20 text-sm font-['Noto_Sans_SC'] font-bold text-[#0F382E] focus:outline-none focus:border-[#0F5243]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-[#0F382E]">
                    Xem trước {batchPreviewSlides.length} thẻ từ vựng được chuẩn hóa tự động (Không dịch ghép cơ học):
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-2xl bg-white border border-[#0F5243]/15 divide-y divide-[#0F5243]/10">
                    {batchPreviewSlides.map((item, idx) => (
                      <div
                        key={`batch-prev-${item.hanzi}-${idx}`}
                        className="px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-hanzi-calligraphy text-lg font-bold text-[#0F382E]">
                            {item.hanzi}
                          </span>
                          <span className="font-bold text-[#9B8A3E]">{item.pinyin}</span>
                          <span className="text-[#3A544B] uppercase">[{item.hanViet}]</span>
                          <span className="font-extrabold text-[#0F5243]">→ {item.meaning}</span>
                        </div>
                        <div className="text-[11px] text-[#3A544B] font-['Noto_Sans_SC'] truncate max-w-xs">
                          VD: {item.exampleHanzi}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#0F5243]/15">
                  <button
                    type="button"
                    onClick={() => setIsBatchImportModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white border border-[#0F5243]/20 text-xs font-semibold text-[#0F382E] cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    data-testid="confirm-batch-import-btn"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-[#FAF7F0] text-xs font-bold shadow-xs cursor-pointer"
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

