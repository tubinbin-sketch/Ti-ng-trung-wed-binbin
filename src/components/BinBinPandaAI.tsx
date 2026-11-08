import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Mic,
  MicOff,
  PanelRight,
  PanelRightClose,
  PlusCircle,
  RotateCcw,
  Send,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { appStore, useAppStoreSelector } from '../context/AppStoreContext';
import { VocabSlide } from '../data/chineseData';
import {
  askBinBinPandaAI,
  BinBinActionType,
  BinBinHistoryTurn,
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
  describeSpeechFailure,
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
  aiError?: string;
  retryPayload?: {
    actionType: BinBinActionType;
    queryText: string;
  };
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

  const binbinOpenTick = useAppStoreSelector((s) => s.binbinOpenTick);
  const binbinAskPayload = useAppStoreSelector((s) => s.binbinAskPayload);

  useEffect(() => {
    if (binbinOpenTick > 0) {
      setIsOpen(true);
    }
  }, [binbinOpenTick]);

  // Sync dock state via AppStoreContext so App.tsx can shift main content when BinBin is open & docked right
  useEffect(() => {
    if (variant === 'floating') {
      appStore.setBinBinDockState(isOpen, displayMode === 'docked' ? 'docked' : 'floating');
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
  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;

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

    // Conversation memory: the last few real turns before this question.
    const history = buildHistory(messages);

    setMessages((prev) => [...prev, userMsg, binbinMsg]);
    setMood('cheering');

    // Enrich via server-side Gemini (/api/binbin/chat)
    await enrichMessageWithAI(replyId, actionType, queryText, history);
  };

  const buildHistory = (list: ChatMessage[]): BinBinHistoryTurn[] =>
    list
      .filter((m) => m.id !== 'binbin-welcome' && m.text && !m.aiError)
      .slice(-6)
      .map(
        (m): BinBinHistoryTurn => ({ role: m.sender === 'user' ? 'user' : 'model', text: m.text })
      );

  const enrichMessageWithAI = async (
    replyId: string,
    actionType: BinBinActionType,
    queryText: string,
    history?: BinBinHistoryTurn[]
  ) => {
    setIsLoading(true);
    setMessages((prev) =>
      prev.map((m) => (m.id === replyId ? { ...m, aiError: undefined } : m))
    );
    try {
      // On retry, rebuild memory from everything before this reply.
      const turns =
        history ??
        buildHistory(
          messagesRef.current.slice(
            0,
            Math.max(0, messagesRef.current.findIndex((m) => m.id === replyId) - 1)
          )
        );
      const enriched = await askBinBinPandaAI(
        actionType,
        queryText,
        activeSlide,
        quizContext,
        turns
      );
      if (enriched) {
        if (enriched.usedOfflineFallback) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === replyId
                ? {
                    ...m,
                    usedOfflineFallback: true,
                    fallbackNotice: enriched.fallbackNotice,
                    aiError:
                      enriched.fallbackNotice ||
                      'Kết nối AI Trợ giảng 彬彬 bị gián đoạn hoặc quá thời gian chờ.',
                    retryPayload: { actionType, queryText },
                  }
                : m
            )
          );
        } else {
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
                    usedOfflineFallback: false,
                    aiError: undefined,
                  }
                : m
            )
          );
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === replyId
            ? {
                ...m,
                aiError:
                  err instanceof Error
                    ? err.message
                    : 'Không thể kết nối AI Trợ giảng 彬彬 lúc này.',
                retryPayload: { actionType, queryText },
              }
            : m
        )
      );
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

    // Never invent what the learner "said": explain why the mic didn't work instead.
    const addMicNotice = (text: string) =>
      setMessages((prev) => [
        ...prev,
        { id: `binbin-mic-${Date.now()}`, sender: 'binbin', text },
      ]);

    if (!isSpeechRecognitionSupported()) {
      addMicNotice(describeSpeechFailure('unsupported'));
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
        } else {
          setMood('idle');
          addMicNotice(describeSpeechFailure('no-speech'));
        }
      },
      (reason) => {
        setIsListeningMic(false);
        setMood('idle');
        if (reason && reason !== 'aborted') addMicNotice(describeSpeechFailure(reason));
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
    appStore.applyBinBinSlide(payload);

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

  // Listen for contextual "🐼 Hỏi 彬彬 câu này" actions from AppStoreContext
  useEffect(() => {
    if (!binbinAskPayload) return;
    const promptText = (binbinAskPayload.questionPrompt || '').trim();
    setIsOpen(true);
    setActiveInteractivePanel('none');
    if (promptText) {
      triggerAction('chat', promptText, promptText);
    }
    appStore.clearBinBinQuestion();
  }, [binbinAskPayload]);

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
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold border border-highlight/60 shadow-sm transition-all duration-200 active:scale-95 cursor-pointer"
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
          className="group relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary text-on-primary border-2 border-highlight hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer"
        >
          <span className="text-base sm:text-lg leading-none select-none">🐼</span>
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-success border border-surface" />
        </button>
      </div>
    );
  }

  // Determine container layout classes based on displayMode ('docked' 360px right sidebar vs 'compact' popover)
  const containerClassName =
    displayMode === 'docked'
      ? 'fixed top-0 right-0 z-50 w-full sm:w-[360px] h-dvh flex flex-col bg-surface border-l border-border shadow-xl'
      : 'fixed bottom-[calc(68px+env(safe-area-inset-bottom))] right-3 lg:bottom-5 lg:right-5 z-50 w-[calc(100vw-24px)] sm:w-[400px] h-[520px] max-h-[78dvh] rounded-3xl flex flex-col overflow-hidden bg-surface border border-border shadow-2xl animate-fade-in';

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
      <div className="px-3 py-2.5 bg-surface text-ink flex items-center justify-between gap-2 shrink-0 border-b border-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary-soft p-0.5 shrink-0">
            <PandaMascotSVG mood={mood} className="w-full h-full" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink whitespace-nowrap">
              {title || 'Trợ giảng 彬彬'}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-ink-muted truncate">
              <span>{isSpeakingTts ? 'Đang phát âm…' : 'Đang xem từ'}</span>
              <strong className="font-hanzi text-primary">{activeSlide?.hanzi || '温暖'}</strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            data-testid="binbin-toggle-dock-mode"
            onClick={() =>
              setDisplayMode((prev) => (prev === 'compact' ? 'docked' : 'compact'))
            }
            title={displayMode === 'compact' ? 'Ghim sang cạnh phải' : 'Chuyển về cửa sổ nổi'}
            aria-label={displayMode === 'compact' ? 'Ghim sang cạnh phải' : 'Chuyển về cửa sổ nổi'}
            aria-pressed={displayMode === 'docked'}
            className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
              displayMode === 'docked'
                ? 'bg-primary-soft text-primary'
                : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
            }`}
          >
            {displayMode === 'compact' ? (
              <PanelRight className="w-4 h-4" />
            ) : (
              <PanelRightClose className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            data-testid="binbin-clear-chat"
            onClick={handleClearChat}
            title="Xóa cuộc trò chuyện"
            aria-label="Xóa cuộc trò chuyện"
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-ink-muted hover:bg-surface-2 hover:text-accent transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            data-testid="binbin-close-btn"
            onClick={() => setIsOpen(false)}
            title="Đóng"
            aria-label="Đóng trợ giảng"
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. SPACIOUS MESSAGE STREAM (Zero Duplicate Text + Clean Visual Cards)
          ===================================================================== */}
      <div
        ref={messageStreamRef}
        data-testid="binbin-message-stream"
        className="flex-1 min-h-0 overflow-y-auto px-3 py-2.5 space-y-3 bg-surface-2"
      >
        {messages.map((msg) => {
          if (msg.sender === 'user') {
            return (
              <div key={msg.id} className="flex justify-end animate-pop-in">
                <div className="max-w-[85%] rounded-2xl rounded-tr-xs px-3 py-2 bg-primary text-on-primary text-xs font-medium shadow-xs">
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
            <div key={msg.id} className="flex justify-start animate-fade-in">
              <div className="w-full rounded-2xl rounded-tl-xs bg-surface border border-border p-3 space-y-2.5 text-ink">
                {msg.aiError && (
                  <div
                    role="alert"
                    data-testid="binbin-ai-error-banner"
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-bold"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>{msg.aiError}</span>
                    </span>
                    {msg.retryPayload && (
                      <button
                        type="button"
                        data-testid="binbin-retry-ai-btn"
                        disabled={isLoading}
                        onClick={() =>
                          enrichMessageWithAI(
                            msg.id,
                            msg.retryPayload!.actionType,
                            msg.retryPayload!.queryText
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Thử lại</span>
                      </button>
                    )}
                  </div>
                )}
                {/* Top Word Summary Header (when wordCard is available) */}
                {msg.wordCard && (
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-primary/10">
                    <div className="flex items-baseline gap-2">
                      <span className="font-['Noto_Sans_SC'] text-xl font-semibold text-ink">
                        {msg.wordCard.hanzi}
                      </span>
                      <span className="text-xs font-bold text-gold">
                        {msg.wordCard.pinyin}
                      </span>
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-surface-2 text-ink-muted border border-border">
                        {msg.wordCard.hanViet}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-primary text-on-primary text-xs font-bold">
                        {msg.wordCard.hskLevel}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-primary-soft text-primary text-xs font-bold">
                        {msg.wordCard.partOfSpeech}
                      </span>
                    </div>
                  </div>
                )}

                {/* Main Structured Explanation (Non-duplicated Bullet Lines) */}
                <div className="space-y-1 text-xs leading-relaxed text-ink">
                  {nonDuplicateLines.map((trimmedLine, lIdx) => {
                    const isBullet =
                      trimmedLine.startsWith('•') || /^\d+\./.test(trimmedLine);
                    return (
                      <p
                        key={`${msg.id}-line-${lIdx}`}
                        className={
                          isBullet
                            ? 'pl-2 border-l-2 border-highlight/70 py-0.5 text-xs'
                            : 'font-bold text-ink text-xs'
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
                    className="rounded-xl bg-surface-2 border border-accent/35 p-2.5 space-y-1.5"
                  >
                    <div className="text-xs font-semibold text-accent">
                      ✍️ Sửa câu &amp; Diễn đạt chuẩn bản xứ
                    </div>
                    {!msg.sentenceCorrection.isAlreadyCorrect && (
                      <div className="text-xs text-accent line-through">
                        ❌ Câu gốc: {msg.sentenceCorrection.originalInput}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-['Noto_Sans_SC'] text-sm font-bold text-primary">
                        {msg.sentenceCorrection.correctedHanzi}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleSpeakPhrase(msg.sentenceCorrection!.correctedHanzi)
                        }
                        className="px-2 py-0.5 rounded-lg bg-primary text-on-primary text-xs font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Đọc</span>
                      </button>
                    </div>
                    <div className="text-xs font-medium text-gold">
                      {msg.sentenceCorrection.correctedPinyin}
                    </div>
                    <div className="text-xs text-ink-muted italic">
                      → {msg.sentenceCorrection.vietnameseTranslation}
                    </div>
                  </div>
                )}

                {/* Authentic Collocations Strip (Single Visual Card) */}
                {msg.collocations && msg.collocations.length > 0 && (
                  <div
                    data-testid="binbin-collocations-box"
                    className="rounded-xl bg-surface-2 border border-primary/12 p-2 space-y-1.5"
                  >
                    <div className="text-xs font-semibold text-primary">
                      🔗 Cấu trúc kết hợp từ chuẩn (Collocations):
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.collocations.map((col, cIdx) => (
                        <button
                          key={`${msg.id}-col-${cIdx}`}
                          type="button"
                          onClick={() => handleSpeakPhrase(col.hanzi)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface hover:bg-primary-soft border border-primary/15 text-xs transition-colors cursor-pointer text-left"
                          title="Bấm để nghe phát âm cụm từ"
                        >
                          <Volume2 className="w-2.5 h-2.5 text-primary shrink-0" />
                          <span className="font-['Noto_Sans_SC'] font-bold text-ink">
                            {col.hanzi}
                          </span>
                          <span className="text-xs text-gold">
                            ({col.pinyin})
                          </span>
                          <span className="text-xs text-ink-muted">
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
                      className="rounded-xl bg-surface-2 border border-highlight/45 p-2 space-y-1"
                    >
                      <div className="text-xs font-semibold text-gold">
                        ⚖️ {msg.synonymDistinction.title}
                      </div>
                      <div className="space-y-1">
                        {msg.synonymDistinction.items.map((item, sIdx) => (
                          <div
                            key={`${msg.id}-syn-${sIdx}`}
                            className="text-xs leading-snug text-ink"
                          >
                            <strong className="font-['Noto_Sans_SC'] text-primary">
                              • {item.word}
                            </strong>{' '}
                            <span className="text-gold">({item.pinyin})</span>:{' '}
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
                    className="rounded-xl bg-surface-2 border border-primary/20 p-2.5 space-y-1.5"
                  >
                    <div className="text-xs font-semibold text-primary">
                      🎯 {msg.teacherExercise.title}
                    </div>
                    <div className="space-y-1.5">
                      {msg.teacherExercise.items.map((qItem, qIdx) => (
                        <div
                          key={`${msg.id}-q-${qIdx}`}
                          className="p-2 rounded-lg bg-surface border border-primary/10 text-xs space-y-0.5"
                        >
                          <div lang="zh-CN" className="font-bold text-ink font-['Noto_Sans_SC']">
                            {qItem.question}
                          </div>
                          <div className="text-xs text-primary font-semibold">
                            ✓ Đáp án: {qItem.answer}
                          </div>
                          <div className="text-xs text-ink-muted">
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
                    <div className="text-xs font-semibold text-ink-muted">
                      📝 2 Câu ví dụ thực tế (Bấm [🔊 Đọc] từng câu):
                    </div>
                    {msg.examples.map((ex, exIdx) => (
                      <div
                        key={`${msg.id}-ex-${exIdx}`}
                        className="rounded-xl bg-surface-2 border border-highlight/40 p-2 flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div lang="zh-CN" className="font-['Noto_Sans_SC'] text-xs font-bold text-ink">
                            {exIdx + 1}. {ex.hanzi}
                          </div>
                          <div className="text-xs font-medium text-gold">
                            {ex.pinyin}
                          </div>
                          <div className="text-xs text-ink-muted italic">
                            “{ex.meaning}”
                          </div>
                        </div>
                        <button
                          type="button"
                          data-testid={`binbin-read-example-${exIdx}`}
                          onClick={() => handleSpeakPhrase(ex.hanzi)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold shrink-0 transition-colors cursor-pointer"
                        >
                          <Volume2 className="w-3 h-3" />
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
                  className="pt-2 border-t border-primary/10 flex flex-wrap items-center gap-1.5"
                >
                  <button
                    type="button"
                    data-testid="binbin-add-to-slide-btn"
                    onClick={() => handleApplyMessageToSlide(msg)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSlideApplied
                        ? 'bg-success-soft text-success'
                        : 'bg-primary hover:bg-primary-hover text-on-primary shadow-2xs'
                    }`}
                  >
                    {isSlideApplied ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Đã đẩy vào Slide!</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-3 h-3" />
                        <span>Thêm từ/câu này vào Slide bài giảng</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    data-testid="binbin-copy-reply-btn"
                    onClick={() => handleCopyMessage(msg)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-2 hover:bg-primary-soft text-ink border border-primary/15 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-success" />
                        <span className="text-success">Đã copy</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-primary" />
                        <span>Copy nhanh</span>
                      </>
                    )}
                  </button>

                  {msg.chinesePhrase && (
                    <button
                      type="button"
                      data-testid="binbin-speak-reply-btn"
                      onClick={() => handleSpeakPhrase(msg.chinesePhrase!)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-2 hover:bg-primary-soft text-ink border border-primary/15 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-3 h-3 text-accent" />
                      <span>Nghe phát âm</span>
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
            className="rounded-2xl bg-surface-2 border-2 border-accent/45 p-3 shadow-xs space-y-2 text-ink"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-accent">
                ✍️ Thử thách Tự đặt câu với “{currentFocusWord}” ({currentFocusPinyin})
              </span>
              <button
                type="button"
                onClick={() => setActiveInteractivePanel('none')}
                className="text-xs font-bold text-ink-muted hover:text-ink cursor-pointer"
              >
                Đóng ✕
              </button>
            </div>
            <p className="text-xs text-ink-muted leading-snug">
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
                className="px-2 py-1 rounded-lg bg-accent-soft hover:bg-accent-soft border border-accent/30 text-xs font-semibold text-accent cursor-pointer"
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
                className="px-2 py-1 rounded-lg bg-accent-soft hover:bg-accent-soft border border-accent/30 text-xs font-semibold text-accent cursor-pointer"
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
            className="rounded-2xl bg-surface-2 border-2 border-primary/30 p-3 shadow-xs space-y-2 text-ink"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-primary">
                🗣️ Đóng vai Hội thoại Tương tác A / B · Từ khóa “{currentFocusWord}”
              </span>
              <button
                type="button"
                onClick={() => setActiveInteractivePanel('none')}
                className="text-xs font-bold text-ink-muted hover:text-ink cursor-pointer"
              >
                Đóng ✕
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="p-2 rounded-xl bg-surface border border-primary/15 flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-primary">🐼 彬彬 (Vai A): </span>
                  <span lang="zh-CN" className="font-['Noto_Sans_SC'] font-bold">
                    你能用“{currentFocusWord}”说一句话吗？
                  </span>
                  <div className="text-xs text-ink-muted">
                    (Bạn có thể dùng từ “{currentFocusWord}” đặt một câu trong giao tiếp không?)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleSpeakPhrase(`你能用${currentFocusWord}说一句话吗？`)
                  }
                  className="px-2 py-1 rounded-lg bg-primary text-on-primary text-xs font-bold shrink-0 cursor-pointer"
                >
                  🔊 Nghe A
                </button>
              </div>

              <div className="p-2 rounded-xl bg-surface-2 border border-highlight/50 space-y-1.5">
                <div className="text-xs font-bold text-gold">
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
                    className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold cursor-pointer text-left"
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
                    className="px-2.5 py-1 rounded-lg bg-surface hover:bg-primary-soft text-ink border border-primary/25 text-xs font-bold cursor-pointer text-left"
                  >
                    🗣️ Đáp mẫu 2: “这个词“{currentFocusWord}”在生活里很常用！”
                  </button>
                </div>
                {roleplayStep > 0 && (
                  <div className="pt-1 text-xs font-bold text-success">
                    🌟 彬彬 khen: 说得太棒了！ Phát âm và ngữ điệu rất tự nhiên chuẩn HSK!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div
            role="status"
            aria-live="polite"
            data-testid="binbin-typing-indicator"
            className="inline-flex items-center gap-2 ml-1 px-3 py-2 rounded-2xl rounded-tl-md bg-surface border border-border text-xs text-ink-muted animate-pop-in"
          >
            <span className="typing-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>彬彬 đang soạn câu trả lời</span>
          </div>
        )}
      </div>

      {/* =====================================================================
          3. FLEX-WRAP QUICK-ACTION CHIPS + INPUT BOX + FOOTER LABEL
          ===================================================================== */}
      <div className="px-3 py-2 bg-surface/95 border-t border-primary/12 space-y-1.5 shrink-0">
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
                    ? 'bg-primary text-on-primary border-highlight'
                    : 'bg-surface-2 hover:bg-primary text-ink hover:text-on-primary border-primary/18'
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
            aria-label="Nhập câu hỏi hoặc từ vựng cho trợ giảng 彬彬"
            data-testid="binbin-chat-input"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder={
              activeInteractivePanel === 'sentence-builder'
                ? `Gõ câu có chứa từ “${currentFocusWord}” để 彬彬 chấm & sửa lỗi...`
                : `Hỏi từ (${currentFocusWord}), tự đặt câu, tạo bài tập...`
            }
            className="flex-1 min-w-0 px-3 py-1.5 rounded-xl bg-surface-2 border border-primary/20 text-xs text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          />
          <button
            type="button"
            onClick={handleToggleVoiceChat}
            aria-label={
              isListeningMic
                ? 'Dừng thu âm giọng nói tiếng Trung'
                : 'Thu âm giọng nói tiếng Trung để 彬彬 dịch và chữa câu'
            }
            className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer ${
              isListeningMic
                ? 'bg-accent text-on-primary animate-pulse'
                : 'bg-surface-2 hover:bg-primary-soft text-ink border border-primary/18'
            }`}
          >
            {isListeningMic ? (
              <MicOff className="w-3.5 h-3.5" />
            ) : (
              <Mic className="w-3.5 h-3.5 text-accent" />
            )}
          </button>
          <button
            type="submit"
            data-testid="binbin-send-btn"
            disabled={isLoading || !userInput.trim()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-on-primary text-xs font-bold transition-all shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{activeInteractivePanel === 'sentence-builder' ? 'Chấm câu' : 'Gửi'}</span>
          </button>
        </form>

        <p data-testid="binbin-footer-label" className="text-[11px] text-ink-subtle text-center">
          彬彬 dùng AI và có thể nhầm — hãy kiểm tra lại với giáo viên khi cần.
        </p>
      </div>
    </div>
  );
};
