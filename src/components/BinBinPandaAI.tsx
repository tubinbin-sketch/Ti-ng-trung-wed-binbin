import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Mic,
  MicOff,
  PanelRight,
  PanelRightClose,
  PlusCircle,
  Send,
  Sparkles,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { VocabSlide } from '../data/chineseData';
import {
  askBinBinPandaAI,
  BinBinActionType,
  BinBinExampleItem,
  BinBinSentenceCorrection,
  BinBinSlidePayload,
  BinBinSynonymComparison,
  BinBinTeacherExercise,
  BinBinWordCardInfo,
  generateBinBinSmartReply,
} from '../utils/chineseEngine';
import {
  getIsSpeaking,
  isSpeechRecognitionSupported,
  speakChinese,
  startChineseSpeechRecognition,
  subscribeSpeakingState,
} from '../utils/speech';

export type PandaMood = 'idle' | 'happy' | 'thinking' | 'speaking' | 'cheering';
export type BinBinDisplayMode = 'compact' | 'docked';

export interface BinBinPandaAIProps {
  /** 'floating' renders the bottom-right copilot widget; 'inline' embeds a trigger + copilot workspace */
  variant?: 'floating' | 'inline';
  /** Current vocabulary slide for contextual help */
  activeSlide?: VocabSlide | null;
  /** Optional quiz context for hinting without spoiling answers */
  quizContext?: {
    prompt?: string;
    grammarHint?: string;
    pinyinHint?: string;
  } | null;
  /** Optional external mood trigger (e.g., when student answers quiz right/wrong) */
  externalMood?: PandaMood;
  /** Optional custom header title */
  title?: string;
  /** Callback to push a vocabulary word or example sentence directly into the Slide Deck */
  onApplyToSlide?: (payload: BinBinSlidePayload) => void;
  /** Hide the closed floating trigger button (e.g. on Homework/Leaderboard tab where Top Navbar already has a fixed 🐼 trigger) */
  hideFloatingTrigger?: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'binbin' | 'user';
  text: string;
  chinesePhrase?: string;
  pinyinPhrase?: string;
  vietnamesePhrase?: string;
  wordCard?: BinBinWordCardInfo;
  essenceAndContext?: string;
  collocations?: { hanzi: string; pinyin: string; meaning: string }[];
  synonymDistinction?: BinBinSynonymComparison;
  examples?: BinBinExampleItem[];
  sentenceCorrection?: BinBinSentenceCorrection;
  teacherExercise?: BinBinTeacherExercise;
  slidePayload?: BinBinSlidePayload;
  usedOfflineFallback?: boolean;
  fallbackNotice?: string;
}

/**
 * Compact SVG Mascot Avatar for Gấu trúc Bin Bin (彬彬)
 */
export const PandaMascotSVG: React.FC<{
  mood: PandaMood;
  className?: string;
}> = ({ mood, className = 'w-10 h-10' }) => {
  const uid = React.useId().replace(/:/g, '');
  const glowId = `binbinGlow-${uid}`;
  const hatId = `scholarHatGrad-${uid}`;
  const isCheering = mood === 'cheering' || mood === 'happy';
  const isSpeaking = mood === 'speaking';
  const isThinking = mood === 'thinking';

  return (
    <svg
      viewBox="0 0 120 120"
      className={`${className} select-none`}
      role="img"
      aria-label="Gấu trúc Bin Bin (彬彬)"
    >
      <defs>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FDFBF7" />
          <stop offset="75%" stopColor="#E6EFEA" />
          <stop offset="100%" stopColor="#C5B358" stopOpacity="0.35" />
        </radialGradient>
        <linearGradient id={hatId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0F5243" />
          <stop offset="100%" stopColor="#166E5B" />
        </linearGradient>
      </defs>

      <circle
        cx="60"
        cy="62"
        r="50"
        fill={`url(#${glowId})`}
        stroke="#C5B358"
        strokeWidth="2.5"
      />

      {/* Panda Ears */}
      <circle cx="29" cy="30" r="13" fill="#1E242B" />
      <circle cx="29" cy="30" r="6" fill="#374151" />
      <circle cx="91" cy="30" r="13" fill="#1E242B" />
      <circle cx="91" cy="30" r="6" fill="#374151" />

      {/* Scholar Hat */}
      <path d="M 38 22 L 60 12 L 82 22 L 60 30 Z" fill={`url(#${hatId})`} />
      <rect x="46" y="22" width="28" height="6" rx="3" fill="#C84B31" />
      <path
        d="M 80 21 Q 88 26 88 36"
        fill="none"
        stroke="#F59E0B"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="88" cy="37" r="2.6" fill="#F59E0B" />

      {/* Body */}
      <path d="M 32 95 C 32 76, 88 76, 88 95 Z" fill="#1E242B" />
      <path d="M 42 95 C 42 82, 78 82, 78 95 Z" fill="#FFFFFF" />
      <path d="M 43 80 Q 60 88 77 80" fill="none" stroke="#C84B31" strokeWidth="5" strokeLinecap="round" />

      {/* Head */}
      <ellipse cx="60" cy="56" rx="33" ry="29" fill="#FFFFFF" stroke="#1E242B" strokeWidth="2.2" />

      {/* Eye Patches */}
      <ellipse
        cx="45"
        cy="54"
        rx="10"
        ry="12"
        transform="rotate(-14 45 54)"
        fill="#1E242B"
      />
      <ellipse
        cx="75"
        cy="54"
        rx="10"
        ry="12"
        transform="rotate(14 75 54)"
        fill="#1E242B"
      />

      {/* Eyes */}
      {isCheering ? (
        <>
          <path
            d="M 40 54 Q 45 47 50 54"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path
            d="M 70 54 Q 75 47 80 54"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle cx="46" cy={isThinking ? 51 : 53} r="4.3" fill="#FFFFFF" />
          <circle cx="47.5" cy={isThinking ? 49.5 : 51.5} r="1.7" fill="#60A5FA" />
          <circle cx="74" cy={isThinking ? 51 : 53} r="4.3" fill="#FFFFFF" />
          <circle cx="75.5" cy={isThinking ? 49.5 : 51.5} r="1.7" fill="#60A5FA" />
        </>
      )}

      {/* Cheeks */}
      <ellipse cx="34" cy="64" rx="5.5" ry="3.2" fill="#FDA4AF" opacity="0.75" />
      <ellipse cx="86" cy="64" rx="5.5" ry="3.2" fill="#FDA4AF" opacity="0.75" />

      {/* Nose & Mouth */}
      <ellipse cx="60" cy="61" rx="4.6" ry="3.2" fill="#1E242B" />
      {isSpeaking ? (
        <ellipse cx="60" cy="69" rx="5.5" ry="4.5" fill="#C84B31" />
      ) : (
        <path
          d="M 53 66 Q 60 72 67 66"
          fill="none"
          stroke="#1E242B"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
};

export const BinBinPandaMascotSVG: React.FC<{
  size?: number;
  mood?: PandaMood;
  className?: string;
}> = ({ size = 32, mood = 'happy', className = '' }) => (
  <div style={{ width: size, height: size }} className={className}>
    <PandaMascotSVG mood={mood} className="w-full h-full" />
  </div>
);

export const BinBinPandaAI: React.FC<BinBinPandaAIProps> = ({
  variant = 'floating',
  activeSlide,
  quizContext,
  externalMood,
  title,
  onApplyToSlide,
  hideFloatingTrigger = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [displayMode, setDisplayMode] = useState<BinBinDisplayMode>('compact');
  const [mood, setMood] = useState<PandaMood>('idle');
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [activeInteractivePanel, setActiveInteractivePanel] = useState<
    'none' | 'sentence-builder' | 'roleplay'
  >('none');
  const [roleplayStep, setRoleplayStep] = useState<number>(0);
  const stopRecognitionRef = useRef<(() => void) | null>(null);
  const messageStreamRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('binbin:open-assistant', handleOpen);
    return () => window.removeEventListener('binbin:open-assistant', handleOpen);
  }, []);

  // Broadcast dock state so App.tsx can shift main content when BinBin is open & docked right
  useEffect(() => {
    if (typeof window !== 'undefined' && variant === 'floating') {
      window.dispatchEvent(
        new CustomEvent('binbin:dock-state', {
          detail: { isOpen, displayMode },
        })
      );
    }
  }, [isOpen, displayMode, variant]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const buildInitialMessage = (slide?: VocabSlide | null): ChatMessage => {
    const initialReply = generateBinBinSmartReply(
      'chat',
      slide?.hanzi || '温暖',
      slide || null,
      quizContext
    );
    return {
      id: 'binbin-welcome',
      sender: 'binbin',
      text: initialReply.replyText,
      chinesePhrase: initialReply.chinesePhrase,
      pinyinPhrase: initialReply.pinyinPhrase,
      vietnamesePhrase: initialReply.vietnamesePhrase,
      wordCard: initialReply.wordCard,
      essenceAndContext: initialReply.essenceAndContext,
      collocations: initialReply.collocations,
      synonymDistinction: initialReply.synonymDistinction,
      examples: initialReply.examples,
      slidePayload: initialReply.slidePayload,
    };
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    buildInitialMessage(activeSlide),
  ]);

  const [isSpeakingTts, setIsSpeakingTts] = useState<boolean>(() => getIsSpeaking());
  const [appliedSlideMsgId, setAppliedSlideMsgId] = useState<string | null>(null);

  useEffect(() => {
    return subscribeSpeakingState((speaking) => {
      setIsSpeakingTts(speaking);
      setMood((prev) => (speaking ? 'speaking' : prev === 'speaking' ? 'happy' : prev));
    });
  }, []);

  useEffect(() => {
    if (externalMood) {
      setMood(externalMood);
    }
  }, [externalMood]);

  // Keep welcome card synced with activeSlide if user hasn't started chatting yet
  useEffect(() => {
    if (!activeSlide) return;
    setRoleplayStep(0);
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'binbin-welcome') {
        return [buildInitialMessage(activeSlide)];
      }
      return prev;
    });
  }, [activeSlide?.hanzi]);

  // Auto-scroll message stream: top for initial welcome card, bottom when new messages arrive
  useEffect(() => {
    if (!messageStreamRef.current) return;
    if (messages.length <= 1) {
      messageStreamRef.current.scrollTop = 0;
    } else {
      messageStreamRef.current.scrollTop = messageStreamRef.current.scrollHeight;
    }
  }, [messages.length, isOpen, activeSlide?.hanzi, activeInteractivePanel]);

  const handleSpeakPhrase = (hanzi: string) => {
    setMood('speaking');
    speakChinese(hanzi, 0.85);
    setTimeout(() => {
      setMood('happy');
    }, 1400);
  };

  const triggerAction = async (
    actionType: BinBinActionType,
    promptLabel: string,
    customUserText?: string
  ) => {
    const queryText = (customUserText ?? promptLabel).trim();
    if (!queryText) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText,
    };

    // Instant 0ms Practical AI Copilot reply
    const instantReply = generateBinBinSmartReply(
      actionType,
      queryText,
      activeSlide,
      quizContext
    );
    const replyId = `binbin-${Date.now() + 1}`;
    const binbinMsg: ChatMessage = {
      id: replyId,
      sender: 'binbin',
      text: instantReply.replyText,
      chinesePhrase: instantReply.chinesePhrase,
      pinyinPhrase: instantReply.pinyinPhrase,
      vietnamesePhrase: instantReply.vietnamesePhrase,
      wordCard: instantReply.wordCard,
      essenceAndContext: instantReply.essenceAndContext,
      collocations: instantReply.collocations,
      synonymDistinction: instantReply.synonymDistinction,
      examples: instantReply.examples,
      sentenceCorrection: instantReply.sentenceCorrection,
      teacherExercise: instantReply.teacherExercise,
      slidePayload: instantReply.slidePayload,
    };

    setMessages((prev) => [...prev, userMsg, binbinMsg]);
    setMood('cheering');

    // Enrich via server-side Gemini 2.5 Flash (/api/binbin/chat) for free-form questions
    setIsLoading(true);
    try {
      const enriched = await askBinBinPandaAI(
        actionType,
        queryText,
        activeSlide,
        quizContext
      );
      if (enriched) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === replyId
              ? {
                  ...m,
                  text: enriched.replyText || m.text,
                  chinesePhrase: enriched.chinesePhrase || m.chinesePhrase,
                  pinyinPhrase: enriched.pinyinPhrase || m.pinyinPhrase,
                  vietnamesePhrase: enriched.vietnamesePhrase || m.vietnamesePhrase,
                  wordCard: enriched.wordCard || m.wordCard,
                  essenceAndContext: enriched.essenceAndContext || m.essenceAndContext,
                  collocations: enriched.collocations || m.collocations,
                  synonymDistinction:
                    enriched.synonymDistinction || m.synonymDistinction,
                  examples: enriched.examples || m.examples,
                  sentenceCorrection:
                    enriched.sentenceCorrection || m.sentenceCorrection,
                  teacherExercise: enriched.teacherExercise || m.teacherExercise,
                  slidePayload: enriched.slidePayload || m.slidePayload,
                  usedOfflineFallback: enriched.usedOfflineFallback,
                  fallbackNotice: enriched.fallbackNotice,
                }
              : m
          )
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    const text = userInput.trim();
    setUserInput('');
    if (activeInteractivePanel === 'sentence-builder') {
      triggerAction('grammar-fix', text, text);
    } else {
      triggerAction('chat', text, text);
    }
  };

  const handleToggleVoiceChat = () => {
    if (isListeningMic) {
      stopRecognitionRef.current?.();
      setIsListeningMic(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      const sampleSpoken = activeSlide?.exampleHanzi || '春天的阳光非常温暖。';
      triggerAction('grammar-fix', sampleSpoken, sampleSpoken);
      return;
    }

    setIsListeningMic(true);
    setMood('thinking');
    const stopFn = startChineseSpeechRecognition(
      (res) => {
        setIsListeningMic(false);
        const transcript = (res.transcript || '').trim();
        if (transcript) {
          triggerAction('grammar-fix', transcript, transcript);
        }
      },
      () => {
        setIsListeningMic(false);
        const fallbackSpoken = activeSlide?.hanzi || '温暖';
        triggerAction('chat', fallbackSpoken, fallbackSpoken);
      }
    );
    stopRecognitionRef.current = stopFn;
  };

  const handleCopyMessage = async (msg: ChatMessage) => {
    const collocationsLine = msg.collocations
      ? `\n• Kết hợp từ chuẩn: ${msg.collocations
          .map((c) => `${c.hanzi} (${c.pinyin} - ${c.meaning})`)
          .join(', ')}`
      : '';
    const examplesLines = msg.examples
      ? `\n• Ví dụ thực tế:\n${msg.examples
          .map((ex, i) => `  ${i + 1}. ${ex.hanzi} (${ex.pinyin}) — ${ex.meaning}`)
          .join('\n')}`
      : msg.chinesePhrase
      ? `\n• Ví dụ: ${msg.chinesePhrase} (${msg.pinyinPhrase}) — ${msg.vietnamesePhrase}`
      : '';

    const fullCopy = `${msg.text}${collocationsLine}${examplesLines}`.trim();
    try {
      await navigator.clipboard.writeText(fullCopy);
    } catch {
      // Fallback copy if clipboard permission is restricted
    }
    setCopiedMsgId(msg.id);
    setTimeout(() => {
      setCopiedMsgId((prev) => (prev === msg.id ? null : prev));
    }, 1800);
  };

  const handleApplyMessageToSlide = (msg: ChatMessage) => {
    const payload: BinBinSlidePayload = msg.slidePayload || {
      hanzi: msg.wordCard?.hanzi || activeSlide?.hanzi || '温暖',
      pinyin: msg.wordCard?.pinyin || activeSlide?.pinyin || 'wēn nuǎn',
      hanViet: msg.wordCard?.hanViet || activeSlide?.hanViet || 'ôn noãn',
      meaning: msg.wordCard?.meaning || activeSlide?.meaning || 'ấm áp',
      partOfSpeech: msg.wordCard?.partOfSpeech || activeSlide?.partOfSpeech || 'TỪ VỰNG HSK',
      hskLevel: msg.wordCard?.hskLevel || activeSlide?.hskLevel || 'HSK 3',
      usageNote: msg.essenceAndContext || activeSlide?.usageNote || '',
      exampleHanzi:
        msg.examples?.[0]?.hanzi || msg.chinesePhrase || activeSlide?.exampleHanzi || '',
      examplePinyin:
        msg.examples?.[0]?.pinyin || msg.pinyinPhrase || activeSlide?.examplePinyin || '',
      exampleMeaning:
        msg.examples?.[0]?.meaning ||
        msg.vietnamesePhrase ||
        activeSlide?.exampleMeaning ||
        '',
    };

    if (onApplyToSlide) {
      onApplyToSlide(payload);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('binbin:apply-slide', { detail: payload })
      );
    }

    setAppliedSlideMsgId(msg.id);
    setTimeout(() => {
      setAppliedSlideMsgId((prev) => (prev === msg.id ? null : prev));
    }, 2200);
  };

  const handleClearChat = () => {
    setMessages([buildInitialMessage(activeSlide)]);
    setActiveInteractivePanel('none');
    setMood('idle');
  };

  const currentFocusWord = activeSlide?.hanzi || '温暖';
  const currentFocusPinyin = activeSlide?.pinyin || 'wēn nuǎn';
  const currentFocusMeaning = activeSlide?.meaning || 'ấm áp';

  // Quick-Action Chips right above the input box (flex-wrap so no button is ever clipped)
  const quickActionChips: {
    id: BinBinActionType;
    label: string;
    prompt: string;
  }[] = [
    {
      id: 'mnemonic',
      label: '💡 Mẹo nhớ chữ',
      prompt: `Giải thích mẹo nhớ chiết tự cho từ “${currentFocusWord}”`,
    },
    {
      id: 'distinguish',
      label: '⚖️ Phân biệt từ',
      prompt: `Phân biệt từ dễ nhầm với “${currentFocusWord}”`,
    },
    {
      id: 'grammar-fix',
      label: '✍️ Chữa câu',
      prompt: userInput.trim()
        ? userInput.trim()
        : `Chữa câu và hướng dẫn ngữ pháp với từ “${currentFocusWord}”`,
    },
    {
      id: 'quiz-gen',
      label: '🎯 Tạo câu hỏi Quiz',
      prompt: `Tạo 5 câu bài tập điền từ với ${currentFocusWord}`,
    },
    {
      id: 'dialogue',
      label: '🗣️ Đóng vai hội thoại',
      prompt: `Đóng vai hội thoại thực tế với từ “${currentFocusWord}”`,
    },
  ];

  const handleQuickChipClick = (chip: {
    id: BinBinActionType;
    label: string;
    prompt: string;
  }) => {
    if (chip.id === 'grammar-fix') {
      setActiveInteractivePanel('sentence-builder');
      if (userInput.trim()) {
        const text = userInput.trim();
        setUserInput('');
        triggerAction('grammar-fix', text, text);
      } else {
        setTimeout(() => chatInputRef.current?.focus(), 60);
      }
      return;
    }
    if (chip.id === 'dialogue') {
      setActiveInteractivePanel('roleplay');
      setRoleplayStep(0);
      triggerAction('dialogue', chip.prompt);
      return;
    }
    setActiveInteractivePanel('none');
    triggerAction(chip.id, chip.prompt);
  };

  // Listen for contextual "🐼 Hỏi 彬彬 câu này" events from wrong quiz questions
  useEffect(() => {
    const handleAskQuestion = (e: Event) => {
      const customEvent = e as CustomEvent<{
        prompt?: string;
        targetWord?: string;
        actionType?: BinBinActionType;
      }>;
      const promptText = (customEvent.detail?.prompt || '').trim();
      const actionType = customEvent.detail?.actionType || 'chat';
      setIsOpen(true);
      setActiveInteractivePanel('none');
      if (promptText) {
        triggerAction(actionType, promptText, promptText);
      }
    };
    window.addEventListener('binbin:ask-question', handleAskQuestion);
    return () => window.removeEventListener('binbin:ask-question', handleAskQuestion);
  }, [activeSlide?.hanzi]);

  // Closed state trigger button (renders for both inline and floating when !isOpen)
  if (!isOpen) {
    if (variant === 'inline') {
      return (
        <div
          data-testid="binbin-inline-card"
          className="inline-flex items-center gap-1.5"
        >
          <button
            type="button"
            data-testid="binbin-inline-open-btn"
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0F5243] to-[#166E5B] hover:from-[#12604F] hover:to-[#1B7D68] text-[#FAF7F0] text-xs font-bold border border-[#C5B358]/60 shadow-sm transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <span className="text-sm">🐼</span>
            <span>Trợ Giảng Gấu Trúc · 彬彬</span>
          </button>
        </div>
      );
    }

    if (hideFloatingTrigger) {
      return null;
    }

    return (
      <div
        className="fixed bottom-2.5 right-2.5 z-40 flex items-center justify-center opacity-75 hover:opacity-100 transition-opacity duration-200"
        data-testid="binbin-floating-widget"
      >
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="Hỏi Trợ Giảng Gấu Trúc · 彬彬"
          aria-label="Mở Trợ Giảng Gấu Trúc · 彬彬"
          data-testid="binbin-floating-toggle"
          className="group relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-[#FAF7F0] border-2 border-[#C5B358] shadow-[0_4px_14px_rgba(15,82,67,0.3)] hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer"
        >
          <span className="text-base sm:text-lg leading-none select-none">🐼</span>
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#10B981] border border-[#0F5243] animate-pulse" />
        </button>
      </div>
    );
  }

  // Determine container layout classes based on displayMode ('docked' 360px right sidebar vs 'compact' popover)
  const containerClassName =
    displayMode === 'docked'
      ? 'fixed top-0 right-0 z-50 w-full sm:w-[360px] h-screen flex flex-col bg-[#FAF7F0] border-l-2 border-[#C5B358] shadow-[-12px_0_40px_rgb(15,56,46,0.22)]'
      : 'fixed bottom-3 right-3 sm:bottom-4 sm:right-5 z-50 w-[94vw] sm:w-[415px] h-[510px] max-h-[82vh] rounded-2xl flex flex-col overflow-hidden bg-[#FAF7F0] border-2 border-[#C5B358]/80 shadow-[0_20px_50px_rgb(15,56,46,0.25)]';

  return (
    <div
      data-testid={
        variant === 'inline' ? 'binbin-inline-card' : 'binbin-floating-widget'
      }
      data-display-mode={displayMode}
      onKeyDown={(e) => e.stopPropagation()}
      className={containerClassName}
    >
      {/* =====================================================================
          1. COMPACT HEADER (Dock Right / Floating Mode Switcher + Clear + Close)
          ===================================================================== */}
      <div className="px-3 py-2 bg-[#0F5243] text-[#FAF7F0] flex items-center justify-between gap-1.5 shrink-0 border-b border-[#C5B358]/50">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#FAF7F0] p-0.5 shrink-0 shadow-2xs">
            <PandaMascotSVG mood={mood} className="w-full h-full" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-extrabold tracking-tight text-[#FAF7F0] whitespace-nowrap">
              {title || '🐼 Trợ Giảng Gấu Trúc · 彬彬'}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#E6EFEA]/90 truncate">
              <span className="text-[#FDE68A] font-bold">
                {isSpeakingTts ? '🔊 Đang phát âm chuẩn...' : 'Gia Sư Hán Ngữ Trực Tuyến'}
              </span>
              <span>·</span>
              <strong className="text-[#FDE68A] font-['Noto_Sans_SC']">
                {activeSlide?.hanzi || '温暖'}
              </strong>
            </div>
          </div>
        </div>

        {/* Right Header Controls: [Neo phải / Cửa sổ nổi] + [🗑️ Xóa] + [Thu nhỏ ✕] */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            data-testid="binbin-toggle-dock-mode"
            onClick={() =>
              setDisplayMode((prev) => (prev === 'compact' ? 'docked' : 'compact'))
            }
            title={
              displayMode === 'compact'
                ? 'Neo sang phải (Dock right) để không che khuất thẻ từ vựng & Ô Mễ Tự Cách'
                : 'Chuyển về cửa sổ nổi (Floating)'
            }
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              displayMode === 'docked'
                ? 'bg-[#C5B358] text-[#0F382E] border-[#FDE68A]'
                : 'bg-white/12 hover:bg-white/22 text-[#FAF7F0] border-white/15'
            }`}
          >
            {displayMode === 'compact' ? (
              <>
                <PanelRight className="w-3 h-3 text-[#FDE68A]" />
                <span>Neo phải</span>
              </>
            ) : (
              <>
                <PanelRightClose className="w-3 h-3 text-[#0F382E]" />
                <span>Đang neo</span>
              </>
            )}
          </button>

          <button
            type="button"
            data-testid="binbin-clear-chat"
            onClick={handleClearChat}
            title="Xóa lịch sử trò chuyện"
            className="inline-flex items-center gap-1 px-1.5 py-1 rounded-lg bg-white/12 hover:bg-white/22 text-xs font-bold text-[#FAF7F0] border border-white/15 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3 text-[#FCA5A5]" />
            <span>Xóa</span>
          </button>

          <button
            type="button"
            data-testid="binbin-close-btn"
            onClick={() => setIsOpen(false)}
            title="Thu nhỏ cửa sổ Trợ Giảng Gấu Trúc · 彬彬"
            className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-[#C84B31] hover:bg-[#B03E26] text-xs font-bold text-white shadow-2xs transition-colors cursor-pointer"
          >
            <span>Thu nhỏ</span>
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. SPACIOUS MESSAGE STREAM (Zero Duplicate Text + Clean Visual Cards)
          ===================================================================== */}
      <div
        ref={messageStreamRef}
        data-testid="binbin-message-stream"
        className="flex-1 min-h-0 overflow-y-auto px-3 py-2.5 space-y-3 bg-gradient-to-b from-[#FAF7F0] to-[#F4EFE6]"
      >
        {messages.map((msg) => {
          if (msg.sender === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-xs px-3 py-2 bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-[#FAF7F0] text-xs font-medium shadow-xs">
                  {msg.text}
                </div>
              </div>
            );
          }

          const isCopied = copiedMsgId === msg.id;
          const isSlideApplied = appliedSlideMsgId === msg.id;
          const hasCollocationsCard = Boolean(
            msg.collocations && msg.collocations.length > 0
          );
          const hasSynonymCard = Boolean(
            msg.synonymDistinction && msg.synonymDistinction.items.length > 1
          );
          const hasCorrectionCard = Boolean(msg.sentenceCorrection);
          const hasExerciseCard = Boolean(msg.teacherExercise);

          // Filter out any text lines that duplicate the dedicated visual cards below
          const nonDuplicateLines = msg.text
            .split('\n')
            .map((line) => line.trim())
            .filter((trimmedLine) => {
              if (!trimmedLine) return false;
              if (
                hasCollocationsCard &&
                (/^•\s*(\d+\.\s*)?Kết hợp từ chuẩn/i.test(trimmedLine) ||
                  /Collocations/i.test(trimmedLine))
              ) {
                return false;
              }
              if (
                hasSynonymCard &&
                /^•\s*(\d+\.\s*)?Phân biệt từ dễ nhầm/i.test(trimmedLine)
              ) {
                return false;
              }
              if (
                hasCorrectionCard &&
                (/^•\s*Câu chuẩn/i.test(trimmedLine) ||
                  /^•\s*Dịch nghĩa/i.test(trimmedLine))
              ) {
                return false;
              }
              if (
                hasExerciseCard &&
                (/^\d+\.\s*Câu\s*\d+/i.test(trimmedLine) ||
                  /^→\s*Đáp án:/i.test(trimmedLine))
              ) {
                return false;
              }
              return true;
            });

          return (
            <div key={msg.id} className="flex justify-start">
              <div className="w-full rounded-2xl rounded-tl-xs bg-white/95 border border-[#0F5243]/15 p-3 shadow-xs space-y-2.5 text-[#0F382E]">
                {msg.usedOfflineFallback && msg.fallbackNotice && (
                  <div
                    data-testid="binbin-fallback-notice-badge"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[10.5px] font-bold"
                  >
                    <span>📚 {msg.fallbackNotice}</span>
                  </div>
                )}
                {/* Top Word Summary Header (when wordCard is available) */}
                {msg.wordCard && (
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-[#0F5243]/10">
                    <div className="flex items-baseline gap-2">
                      <span className="font-['Noto_Sans_SC'] text-xl font-extrabold text-[#0F382E]">
                        {msg.wordCard.hanzi}
                      </span>
                      <span className="text-xs font-bold text-[#9B8A3E]">
                        {msg.wordCard.pinyin}
                      </span>
                      <span className="text-xs font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#F4EFE6] text-[#5C4D3C] border border-[#C5B358]/30">
                        {msg.wordCard.hanViet}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-[#0F5243] text-[#FAF7F0] text-xs font-bold">
                        {msg.wordCard.hskLevel}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#E6EFEA] text-[#0F5243] text-xs font-bold">
                        {msg.wordCard.partOfSpeech}
                      </span>
                    </div>
                  </div>
                )}

                {/* Main Structured Explanation (Non-duplicated Bullet Lines) */}
                <div className="space-y-1 text-xs leading-relaxed text-[#1E3227]">
                  {nonDuplicateLines.map((trimmedLine, lIdx) => {
                    const isBullet =
                      trimmedLine.startsWith('•') || /^\d+\./.test(trimmedLine);
                    return (
                      <p
                        key={`${msg.id}-line-${lIdx}`}
                        className={
                          isBullet
                            ? 'pl-2 border-l-2 border-[#C5B358]/70 py-0.5 text-[11.5px]'
                            : 'font-bold text-[#0F382E] text-xs'
                        }
                      >
                        {trimmedLine}
                      </p>
                    );
                  })}
                </div>

                {/* Sentence Correction Card (when user inputs a sentence to translate / fix) */}
                {msg.sentenceCorrection && (
                  <div
                    data-testid="binbin-sentence-correction-box"
                    className="rounded-xl bg-[#FDFBF7] border border-[#C84B31]/35 p-2.5 space-y-1.5"
                  >
                    <div className="text-xs font-extrabold uppercase tracking-wider text-[#C84B31]">
                      ✍️ Sửa câu &amp; Diễn đạt chuẩn bản xứ
                    </div>
                    {!msg.sentenceCorrection.isAlreadyCorrect && (
                      <div className="text-xs text-[#7F1D1D] line-through">
                        ❌ Câu gốc: {msg.sentenceCorrection.originalInput}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-['Noto_Sans_SC'] text-sm font-bold text-[#0F5243]">
                        ✅ {msg.sentenceCorrection.correctedHanzi}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleSpeakPhrase(msg.sentenceCorrection!.correctedHanzi)
                        }
                        className="px-2 py-0.5 rounded-lg bg-[#0F5243] text-white text-xs font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Volume2 className="w-3 h-3 text-[#FDE68A]" />
                        <span>Đọc</span>
                      </button>
                    </div>
                    <div className="text-xs font-medium text-[#9B8A3E]">
                      {msg.sentenceCorrection.correctedPinyin}
                    </div>
                    <div className="text-xs text-[#3F5447] italic">
                      → {msg.sentenceCorrection.vietnameseTranslation}
                    </div>
                  </div>
                )}

                {/* Authentic Collocations Strip (Single Visual Card) */}
                {msg.collocations && msg.collocations.length > 0 && (
                  <div
                    data-testid="binbin-collocations-box"
                    className="rounded-xl bg-[#F4F6EE] border border-[#0F5243]/12 p-2 space-y-1.5"
                  >
                    <div className="text-xs font-extrabold uppercase tracking-wider text-[#0F5243]">
                      🔗 Cấu trúc kết hợp từ chuẩn (Collocations):
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.collocations.map((col, cIdx) => (
                        <button
                          key={`${msg.id}-col-${cIdx}`}
                          type="button"
                          onClick={() => handleSpeakPhrase(col.hanzi)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-[#E6EFEA] border border-[#0F5243]/15 text-xs transition-colors cursor-pointer text-left"
                          title="Bấm để nghe phát âm cụm từ"
                        >
                          <Volume2 className="w-2.5 h-2.5 text-[#0F5243] shrink-0" />
                          <span className="font-['Noto_Sans_SC'] font-bold text-[#0F382E]">
                            {col.hanzi}
                          </span>
                          <span className="text-xs text-[#9B8A3E]">
                            ({col.pinyin})
                          </span>
                          <span className="text-xs text-[#3F5447]">
                            : {col.meaning}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Synonym Distinction Box (Single Visual Card) */}
                {msg.synonymDistinction &&
                  msg.synonymDistinction.items.length > 1 && (
                    <div
                      data-testid="binbin-synonym-box"
                      className="rounded-xl bg-[#FFFDF7] border border-[#C5B358]/45 p-2 space-y-1"
                    >
                      <div className="text-xs font-extrabold uppercase tracking-wider text-[#8A7630]">
                        ⚖️ {msg.synonymDistinction.title}
                      </div>
                      <div className="space-y-1">
                        {msg.synonymDistinction.items.map((item, sIdx) => (
                          <div
                            key={`${msg.id}-syn-${sIdx}`}
                            className="text-xs leading-snug text-[#1E3227]"
                          >
                            <strong className="font-['Noto_Sans_SC'] text-[#0F5243]">
                              • {item.word}
                            </strong>{' '}
                            <span className="text-[#9B8A3E]">({item.pinyin})</span>:{' '}
                            {item.nuance}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Teacher 5-Question Exercise Box (when generated) */}
                {msg.teacherExercise && (
                  <div
                    data-testid="binbin-teacher-exercise-box"
                    className="rounded-xl bg-[#F4F6EE] border border-[#0F5243]/20 p-2.5 space-y-1.5"
                  >
                    <div className="text-xs font-extrabold uppercase tracking-wider text-[#0F5243]">
                      🎯 {msg.teacherExercise.title}
                    </div>
                    <div className="space-y-1.5">
                      {msg.teacherExercise.items.map((qItem, qIdx) => (
                        <div
                          key={`${msg.id}-q-${qIdx}`}
                          className="p-2 rounded-lg bg-white border border-[#0F5243]/10 text-xs space-y-0.5"
                        >
                          <div className="font-bold text-[#0F382E] font-['Noto_Sans_SC']">
                            {qItem.question}
                          </div>
                          <div className="text-[10.5px] text-[#0F5243] font-semibold">
                            ✓ Đáp án: {qItem.answer}
                          </div>
                          <div className="text-xs text-[#5F7266]">
                            {qItem.explanation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2 Authentic Example Sentences with Individual [🔊 Đọc] Buttons */}
                {msg.examples && msg.examples.length > 0 && (
                  <div
                    data-testid="binbin-examples-list"
                    className="space-y-1.5 pt-0.5"
                  >
                    <div className="text-xs font-extrabold uppercase tracking-wider text-[#3F5447]">
                      📝 2 Câu ví dụ thực tế (Bấm [🔊 Đọc] từng câu):
                    </div>
                    {msg.examples.map((ex, exIdx) => (
                      <div
                        key={`${msg.id}-ex-${exIdx}`}
                        className="rounded-xl bg-[#FAF7F0] border border-[#C5B358]/40 p-2 flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="font-['Noto_Sans_SC'] text-xs font-bold text-[#0F382E]">
                            {exIdx + 1}. {ex.hanzi}
                          </div>
                          <div className="text-[10.5px] font-medium text-[#9B8A3E]">
                            {ex.pinyin}
                          </div>
                          <div className="text-[10.5px] text-[#3F5447] italic">
                            “{ex.meaning}”
                          </div>
                        </div>
                        <button
                          type="button"
                          data-testid={`binbin-read-example-${exIdx}`}
                          onClick={() => handleSpeakPhrase(ex.hanzi)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#0F5243] hover:bg-[#166E5B] text-[#FAF7F0] text-xs font-bold shrink-0 transition-colors cursor-pointer"
                        >
                          <Volume2 className="w-3 h-3 text-[#FDE68A]" />
                          <span>Đọc</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* =============================================================
                    1-CLICK ACTIONABLE AI BUTTONS BAR (Below Every AI Response)
                    ============================================================= */}
                <div
                  data-testid="binbin-actionable-bar"
                  className="pt-2 border-t border-[#0F5243]/10 flex flex-wrap items-center gap-1.5"
                >
                  <button
                    type="button"
                    data-testid="binbin-add-to-slide-btn"
                    onClick={() => handleApplyMessageToSlide(msg)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                      isSlideApplied
                        ? 'bg-[#065F46] text-white'
                        : 'bg-gradient-to-r from-[#0F5243] to-[#166E5B] hover:from-[#12604F] hover:to-[#1B7D68] text-[#FAF7F0] shadow-2xs'
                    }`}
                  >
                    {isSlideApplied ? (
                      <>
                        <Check className="w-3 h-3 text-[#A7F3D0]" />
                        <span>Đã đẩy vào Slide!</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-3 h-3 text-[#FDE68A]" />
                        <span>➕ Thêm từ/câu này vào Slide bài giảng</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    data-testid="binbin-copy-reply-btn"
                    onClick={() => handleCopyMessage(msg)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F4F6EE] hover:bg-[#E6EFEA] text-[#0F382E] border border-[#0F5243]/15 text-[10.5px] font-bold transition-colors cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-[#059669]" />
                        <span className="text-[#059669]">Đã copy</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-[#0F5243]" />
                        <span>📋 Copy nhanh</span>
                      </>
                    )}
                  </button>

                  {msg.chinesePhrase && (
                    <button
                      type="button"
                      data-testid="binbin-speak-reply-btn"
                      onClick={() => handleSpeakPhrase(msg.chinesePhrase!)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F4F6EE] hover:bg-[#E6EFEA] text-[#0F382E] border border-[#0F5243]/15 text-[10.5px] font-bold transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-3 h-3 text-[#C84B31]" />
                      <span>🔊 Nghe phát âm</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Interactive Sentence Builder & Grammar Checker Card */}
        {activeInteractivePanel === 'sentence-builder' && (
          <div
            data-testid="binbin-interactive-sentence-builder"
            className="rounded-2xl bg-[#FFFDF7] border-2 border-[#C84B31]/45 p-3 shadow-xs space-y-2 text-[#0F382E]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#C84B31]">
                ✍️ Thử thách Tự đặt câu với “{currentFocusWord}” ({currentFocusPinyin})
              </span>
              <button
                type="button"
                onClick={() => setActiveInteractivePanel('none')}
                className="text-xs font-bold text-[#5F7266] hover:text-[#0F382E] cursor-pointer"
              >
                Đóng ✕
              </button>
            </div>
            <p className="text-xs text-[#3F5447] leading-snug">
              Hãy gõ 1 câu tiếng Trung có chứa từ <strong>“{currentFocusWord}”</strong> ({currentFocusMeaning}) vào ô bên dưới để 彬彬 kiểm tra ngữ pháp, hoặc bấm thử các câu mẫu hay nhầm:
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                data-testid="binbin-sample-error-1"
                onClick={() => {
                  const s =
                    currentFocusWord === '温暖'
                      ? '今天天气很温暖'
                      : `我非常${currentFocusWord}今天`;
                  triggerAction('grammar-fix', s, s);
                }}
                className="px-2 py-1 rounded-lg bg-[#FDF2F2] hover:bg-[#FCE8E8] border border-[#C84B31]/30 text-[10.5px] font-bold text-[#7F1D1D] cursor-pointer"
              >
                Thử câu dễ nhầm: “
                {currentFocusWord === '温暖'
                  ? '今天天气很温暖'
                  : `我非常${currentFocusWord}今天`}
                ”
              </button>
              <button
                type="button"
                data-testid="binbin-sample-error-2"
                onClick={() => {
                  const s = `今天天气是${currentFocusWord}`;
                  triggerAction('grammar-fix', s, s);
                }}
                className="px-2 py-1 rounded-lg bg-[#FDF2F2] hover:bg-[#FCE8E8] border border-[#C84B31]/30 text-[10.5px] font-bold text-[#7F1D1D] cursor-pointer"
              >
                Thử lỗi dùng 是: “今天天气是{currentFocusWord}”
              </button>
            </div>
          </div>
        )}

        {/* Interactive Roleplay A/B Practice Card */}
        {activeInteractivePanel === 'roleplay' && (
          <div
            data-testid="binbin-interactive-roleplay-card"
            className="rounded-2xl bg-[#F4F6EE] border-2 border-[#0F5243]/30 p-3 shadow-xs space-y-2 text-[#0F382E]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#0F5243]">
                🗣️ Đóng vai Hội thoại Tương tác A / B · Từ khóa “{currentFocusWord}”
              </span>
              <button
                type="button"
                onClick={() => setActiveInteractivePanel('none')}
                className="text-xs font-bold text-[#5F7266] hover:text-[#0F382E] cursor-pointer"
              >
                Đóng ✕
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="p-2 rounded-xl bg-white border border-[#0F5243]/15 flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-[#0F5243]">🐼 彬彬 (Vai A): </span>
                  <span className="font-['Noto_Sans_SC'] font-bold">
                    你能用“{currentFocusWord}”说一句话吗？
                  </span>
                  <div className="text-[10.5px] text-[#5F7266]">
                    (Bạn có thể dùng từ “{currentFocusWord}” đặt một câu trong giao tiếp không?)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleSpeakPhrase(`你能用${currentFocusWord}说一句话吗？`)
                  }
                  className="px-2 py-1 rounded-lg bg-[#0F5243] text-white text-xs font-bold shrink-0 cursor-pointer"
                >
                  🔊 Nghe A
                </button>
              </div>

              <div className="p-2 rounded-xl bg-[#FAF7F0] border border-[#C5B358]/50 space-y-1.5">
                <div className="text-[10.5px] font-bold text-[#8A7630]">
                  🎓 Lượt của bạn (Vai B) — Chọn câu trả lời hoặc bấm 🎙️ để nói:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    data-testid="binbin-roleplay-reply-1"
                    onClick={() => {
                      const replyLine =
                        activeSlide?.exampleHanzi || `春天的阳光非常${currentFocusWord}。`;
                      setRoleplayStep(1);
                      handleSpeakPhrase(replyLine);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#0F5243] hover:bg-[#166E5B] text-[#FAF7F0] text-xs font-bold cursor-pointer text-left"
                  >
                    🗣️ Đáp mẫu 1: “{activeSlide?.exampleHanzi || `春天的阳光非常${currentFocusWord}。`}”
                  </button>
                  <button
                    type="button"
                    data-testid="binbin-roleplay-reply-2"
                    onClick={() => {
                      const replyLine = `这个词“${currentFocusWord}”在生活里很常用！`;
                      setRoleplayStep(2);
                      handleSpeakPhrase(replyLine);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#E6EFEA] text-[#0F382E] border border-[#0F5243]/25 text-xs font-bold cursor-pointer text-left"
                  >
                    🗣️ Đáp mẫu 2: “这个词“{currentFocusWord}”在生活里很常用！”
                  </button>
                </div>
                {roleplayStep > 0 && (
                  <div className="pt-1 text-xs font-bold text-[#059669]">
                    🌟 彬彬 khen: 说得太棒了！ Phát âm và ngữ điệu rất tự nhiên chuẩn HSK!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[#3F5447] italic px-2">
            <Sparkles className="w-3.5 h-3.5 text-[#9B8A3E] animate-spin" />
            <span>Gia Sư Hán Ngữ Trực Tuyến · 彬彬 đang phân tích chuyên sâu...</span>
          </div>
        )}
      </div>

      {/* =====================================================================
          3. FLEX-WRAP QUICK-ACTION CHIPS + INPUT BOX + FOOTER LABEL
          ===================================================================== */}
      <div className="px-3 py-2 bg-white/95 border-t border-[#0F5243]/12 space-y-1.5 shrink-0">
        {/* Flex-Wrap Quick-Action Chips (All 5 buttons visible without clipping) */}
        <div
          data-testid="binbin-quick-chips-bar"
          className="flex flex-wrap items-center gap-1.5 py-0.5"
        >
          {quickActionChips.map((chip) => {
            const isChipActive =
              (chip.id === 'grammar-fix' &&
                activeInteractivePanel === 'sentence-builder') ||
              (chip.id === 'dialogue' && activeInteractivePanel === 'roleplay');
            return (
              <button
                key={chip.id}
                type="button"
                data-testid={`binbin-action-${chip.id}`}
                disabled={isLoading}
                onClick={() => handleQuickChipClick(chip)}
                className={`px-2.5 py-1 rounded-full border text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                  isChipActive
                    ? 'bg-[#0F5243] text-[#FAF7F0] border-[#C5B358]'
                    : 'bg-[#F4F6EE] hover:bg-[#0F5243] text-[#0F382E] hover:text-[#FAF7F0] border-[#0F5243]/18'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Input Form */}
        <form onSubmit={handleFormSubmit} className="flex items-center gap-1.5">
          <input
            ref={chatInputRef}
            type="text"
            data-testid="binbin-chat-input"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder={
              activeInteractivePanel === 'sentence-builder'
                ? `Gõ câu có chứa từ “${currentFocusWord}” để 彬彬 chấm & sửa lỗi...`
                : `Hỏi từ (${currentFocusWord}), tự đặt câu, tạo bài tập...`
            }
            className="flex-1 min-w-0 px-3 py-1.5 rounded-xl bg-[#FAF7F0] border border-[#0F5243]/20 text-xs text-[#0F382E] placeholder:text-[#5F7266] focus:outline-none focus:border-[#0F5243]"
          />
          <button
            type="button"
            onClick={handleToggleVoiceChat}
            title="Nói tiếng Trung để 彬彬 dịch & chữa câu"
            className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer ${
              isListeningMic
                ? 'bg-[#C84B31] text-white animate-pulse'
                : 'bg-[#F4F6EE] hover:bg-[#E6EFEA] text-[#0F382E] border border-[#0F5243]/18'
            }`}
          >
            {isListeningMic ? (
              <MicOff className="w-3.5 h-3.5" />
            ) : (
              <Mic className="w-3.5 h-3.5 text-[#C84B31]" />
            )}
          </button>
          <button
            type="submit"
            data-testid="binbin-send-btn"
            disabled={isLoading || !userInput.trim()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0F5243] to-[#166E5B] hover:from-[#12604F] hover:to-[#1B7D68] disabled:opacity-50 text-[#FAF7F0] text-xs font-bold transition-all shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-[#FDE68A]" />
            <span>{activeInteractivePanel === 'sentence-builder' ? 'Chấm câu' : 'Gửi'}</span>
          </button>
        </form>

        {/* Footer System Signature Label */}
        <div
          data-testid="binbin-footer-label"
          className="pt-0.5 flex items-center justify-between text-xs font-semibold text-[#5F7266]"
        >
          <span>Hệ Thống Trợ Giảng Hán Ngữ Thông Minh · 彬彬</span>
          <span className="text-[#9B8A3E] font-bold">Gia Sư Hán Ngữ Trực Tuyến</span>
        </div>
      </div>
    </div>
  );
};
