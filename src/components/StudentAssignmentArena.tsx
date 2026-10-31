import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RotateCcw,
  Volume2,
  BookOpen,
  Send,
  Trophy,
  FileText,
  Camera,
  Upload,
  Check,
  GraduationCap,
  Users,
  Edit3,
  Headphones,
} from 'lucide-react';
import { VocabSlide } from '../data/chineseData';
import { speakChinese, playGentleChime } from '../utils/speech';
import { BinBinPandaMascotSVG, PandaMood } from './BinBinPandaAI';
import { StudentLeaderboard } from './StudentLeaderboard';
import {
  getStoredAssignment,
  UploadedAssignmentPackage,
} from '../utils/assignmentParser';
import {
  getStoredStudentRoster,
  STORAGE_KEY_STUDENTS,
  ClassStudent,
} from './ClassroomManager';
import {
  applyStudentSubmissionToRoster,
  SMART_HANZI_DICTIONARY,
} from '../utils/chineseEngine';
import {
  HSK3_TRANSLATION_CHALLENGES,
  Hsk3TranslationEvaluation,
  calculateStudentHsk3Pillars,
  evaluateHsk3Translation,
} from '../utils/hsk3Engine';
import {
  applySrsRatingToRecords,
  evaluateSentenceBuilderOrder,
  getMistakeNotebookList,
  HSK3_SENTENCE_BUILDER_CHALLENGES,
  loadStoredSrsRecords,
  saveStoredSrsRecords,
  SentenceBuilderEvaluation,
  SrsWordRecord,
} from '../utils/hskStudyHelpers';
import { Mic, Flame, Clock } from 'lucide-react';

interface StudentAssignmentArenaProps {
  slides: VocabSlide[];
  studentName?: string;
  onSelectStudentName?: (name: string) => void;
  onSwitchToTeacherView?: () => void;
}

const LISTENING_CHALLENGES = [
  {
    id: 'lc-1',
    audioText: '温暖',
    pinyin: 'wēn nuǎn',
    correctHanzi: '温暖',
    meaning: 'ấm áp, đầm ấm',
    explanation:
      '“温暖” (wēn nuǎn - ấm áp) dùng để miêu tả thời tiết dễ chịu hoặc tình cảm gia đình, bạn bè ấm cúng.',
    options: ['温暖 (ấm áp)', '空调 (điều hòa)', '花园 (vườn hoa)', '咱们 (chúng ta)'],
  },
  {
    id: 'lc-2',
    audioText: '咱们',
    pinyin: 'zán men',
    correctHanzi: '咱们',
    meaning: 'chúng ta, chúng mình',
    explanation:
      '“咱们” (zán men - chúng ta) là đại từ ngôi thứ nhất số nhiều bao gồm cả người nói và người nghe.',
    options: ['老师 (giáo viên)', '咱们 (chúng ta)', '聪明 (thông minh)', '愿意 (sẵn lòng)'],
  },
];

interface SpeedTestQuestion {
  id: string;
  skillLabel: string;
  targetWord: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

const SPEED_TEST_10_QUESTIONS: SpeedTestQuestion[] = [
  {
    id: 'stq-1',
    skillLabel: 'Kỹ năng 1 · Nghe & Ngữ âm',
    targetWord: '温暖',
    prompt: 'Câu 1: Từ “温暖” (ấm áp, đầm ấm) có phiên âm Pinyin chuẩn là gì?',
    options: ['A. wēn nuǎn', 'B. wén nuàn', 'C. wēn luǎn', 'D. wèn nuǎn'],
    correctAnswer: 'A. wēn nuǎn',
    explanation: '温 (wēn - thanh 1) + 暖 (nuǎn - thanh 3) đọc là wēn nuǎn.',
  },
  {
    id: 'stq-2',
    skillLabel: 'Kỹ năng 2 · Từ vựng & Đại từ',
    targetWord: '咱们',
    prompt: 'Câu 2: Khi muốn rủ người đang nói chuyện cùng đi (“Chúng mình cùng đi nhé!”), ta ưu tiên dùng đại từ nào?',
    options: ['A. 咱们 (zánmen)', 'B. 他们 (tāmen)', 'C. 你们 (nǐmen)', 'D. 别人 (biérén)'],
    correctAnswer: 'A. 咱们 (zánmen)',
    explanation: '咱们 (zánmen) bao gồm cả người nói và người nghe, rất thân mật trong giao tiếp.',
  },
  {
    id: 'stq-3',
    skillLabel: 'Kỹ năng 3 · Đọc hiểu ngữ cảnh',
    targetWord: '办法',
    prompt: 'Câu 3: Điền từ thích hợp vào câu: “这个问题很难，你有什么好______吗？”',
    options: ['A. 办法 (bànfǎ - cách giải quyết)', 'B. 季节 (jìjié - mùa)', 'C. 空调 (kōngtiáo - điều hòa)', 'D. 花园 (huāyuán - vườn hoa)'],
    correctAnswer: 'A. 办法 (bànfǎ - cách giải quyết)',
    explanation: '好办法 (hǎo bànfǎ) nghĩa là cách giải quyết hay / biện pháp tốt.',
  },
  {
    id: 'stq-4',
    skillLabel: 'Kỹ năng 4 · Ngữ pháp vị trí trạng ngữ',
    targetWord: '明天',
    prompt: 'Câu 4: Câu nào dưới đây đặt đúng vị trí trạng ngữ chỉ thời gian “明天” (ngày mai)?',
    options: [
      'A. 我明天去图书馆复习。',
      'B. 我去图书馆复习明天。',
      'C. 我去明天图书馆复习。',
      'D. 图书馆我去复习明天。',
    ],
    correctAnswer: 'A. 我明天去图书馆复习。',
    explanation: 'Trong tiếng Trung, trạng ngữ thời gian (明天) đứng trước động từ (Đầu câu hoặc ngay sau Chủ ngữ).',
  },
  {
    id: 'stq-5',
    skillLabel: 'Kỹ năng 5 · Cấu trúc mức độ',
    targetWord: '挺',
    prompt: 'Câu 5: Cấu trúc “挺 + Tính từ + 的” (VD: 挺温暖的) biểu thị ý nghĩa gì?',
    options: [
      'A. Khá là / rất (nhấn mạnh mức độ vừa phải, tự nhiên)',
      'B. Phủ định hoàn toàn',
      'C. Câu hỏi lựa chọn',
      'D. Mệnh lệnh bắt buộc',
    ],
    correctAnswer: 'A. Khá là / rất (nhấn mạnh mức độ vừa phải, tự nhiên)',
    explanation: '挺...的 (tǐng... de) dùng rất phổ biến trong khẩu ngữ để khen hoặc nhận xét: “Khá là...”.',
  },
  {
    id: 'stq-6',
    skillLabel: 'Kỹ năng 6 · Hán tự & Bộ thủ',
    targetWord: '换',
    prompt: 'Câu 6: Chữ “换” (huàn - đổi, trao đổi) mang bộ thủ nào liên quan đến động tác bàn tay?',
    options: [
      'A. Bộ Tài gẩy (扌)',
      'B. Bộ Thủy (氵)',
      'C. Bộ Ngôn (讠)',
      'D. Bộ Tâm (忄)',
    ],
    correctAnswer: 'A. Bộ Tài gẩy (扌)',
    explanation: 'Bộ Tài gẩy (扌) biểu thị các động tác dùng tay như 换 (đổi), 打 (đánh), 找 (tìm).',
  },
  {
    id: 'stq-7',
    skillLabel: 'Kỹ năng 7 · Biến điệu thanh 3',
    targetWord: '打算',
    prompt: 'Câu 7: Khi hai thanh 3 đi liền nhau như “你好” (nǐ hǎo) hoặc “很好” (hěn hǎo), âm tiết đầu đọc biến điệu thành thanh mấy?',
    options: [
      'A. Thanh 2 (ní hǎo / hén hǎo)',
      'B. Thanh 1',
      'C. Thanh 4',
      'D. Giữ nguyên thanh 3 nặng',
    ],
    correctAnswer: 'A. Thanh 2 (ní hǎo / hén hǎo)',
    explanation: 'Quy tắc biến điệu HSK 3.0: 3 + 3 → 2 + 3 khi phát âm thực tế.',
  },
  {
    id: 'stq-8',
    skillLabel: 'Kỹ năng 8 · Giao tiếp thực tế',
    targetWord: '照顾',
    prompt: 'Câu 8: Từ “照顾” (zhàogù) trong câu “谢谢你照顾我” có nghĩa tiếng Việt chuẩn là gì?',
    options: [
      'A. Chăm sóc, quan tâm',
      'B. Thi cử',
      'C. Du lịch',
      'D. Trao đổi tiền tệ',
    ],
    correctAnswer: 'A. Chăm sóc, quan tâm',
    explanation: '照顾 (zhàogù - chiếu cố) nghĩa là chăm sóc, quan tâm chu đáo.',
  },
  {
    id: 'stq-9',
    skillLabel: 'Kỹ năng 9 · Dịch thuật Việt – Trung',
    targetWord: '愿意',
    prompt: 'Câu 9: Bản dịch chuẩn HSK 3.0 cho câu “Tôi rất sẵn lòng giúp đỡ bạn” là gì?',
    options: [
      'A. 我很愿意帮助你。',
      'B. 我帮助你很愿意。',
      'C. 愿意我很帮助你。',
      'D. 我不愿意去。',
    ],
    correctAnswer: 'A. 我很愿意帮助你。',
    explanation: '愿意 + Động từ (愿意帮助你: sẵn lòng giúp đỡ bạn).',
  },
  {
    id: 'stq-10',
    skillLabel: 'Kỹ năng 10 · Tổng hợp ngữ pháp',
    targetWord: '四季',
    prompt: 'Câu 10: Chọn câu miêu tả đúng về bốn mùa (四季 - sìjì):',
    options: [
      'A. 一年有四个季节：春、夏、秋、冬。',
      'B. 一年有两个季节。',
      'C. 四季是一件衣服。',
      'D. 冬天非常炎热。',
    ],
    correctAnswer: 'A. 一年有四个季节：春、夏、秋、冬。',
    explanation: 'Một năm có 4 mùa: Xuân (春), Hạ (夏), Thu (秋), Đông (冬).',
  },
];

export const StudentAssignmentArena: React.FC<StudentAssignmentArenaProps> = ({
  slides,
  studentName = 'Lưu Thị Minh Thư',
  onSelectStudentName,
  onSwitchToTeacherView,
}) => {
  // Roster from localStorage (hanu_classroom_students_roster_v2)
  const [roster, setRoster] = useState<ClassStudent[]>(() => getStoredStudentRoster());
  const [activeStudentName, setActiveStudentName] = useState<string>(studentName);

  useEffect(() => {
    setActiveStudentName(studentName);
  }, [studentName]);

  useEffect(() => {
    const refreshRoster = () => setRoster(getStoredStudentRoster());
    window.addEventListener('hanu_students_updated', refreshRoster);
    return () => window.removeEventListener('hanu_students_updated', refreshRoster);
  }, []);

  // Ensure activeStudentName is always present in the dropdown options so select and labels match 100%
  const effectiveRoster = useMemo<ClassStudent[]>(() => {
    if (roster.some((st) => st.name === activeStudentName)) {
      return roster;
    }
    const fallbackStudent: ClassStudent = {
      id: 'st-active-default',
      studentCode: 'HV-001',
      hskLevel: 'HSK 3',
      name: activeStudentName,
      vocabScore: '18/18 từ',
      writingScore: '96% độ chuẩn nét',
      quizScore: '10/10 câu đúng',
      totalPoints: 98,
      status: 'Đã chấm tự động',
      feedback: 'Đang làm bài trực tuyến.',
    };
    return [fallbackStudent, ...roster];
  }, [roster, activeStudentName]);

  // Load assignment package from storage or sync event
  const [assignmentPackage, setAssignmentPackage] = useState<UploadedAssignmentPackage>(() =>
    getStoredAssignment()
  );

  // User responses
  const [mcAnswers, setMcAnswers] = useState<Record<string, string>>({});
  const [selectedTokensMap, setSelectedTokensMap] = useState<Record<string, string[]>>({});
  const [availableTokensMap, setAvailableTokensMap] = useState<Record<string, string[]>>({});
  const [revealedPinyinHints, setRevealedPinyinHints] = useState<Record<string, boolean>>({});
  const [essayAnswers, setEssayAnswers] = useState<Record<string, string>>({});
  const [listeningAnswers, setListeningAnswers] = useState<Record<string, string>>({});
  const [practicedChars, setPracticedChars] = useState<Record<string, number>>({
    温: 96,
    暖: 95,
  });
  const [translationAnswers, setTranslationAnswers] = useState<Record<string, string>>({});
  const [translationEvaluations, setTranslationEvaluations] = useState<
    Record<string, Hsk3TranslationEvaluation>
  >({});
  const [partCSpeechScores, setPartCSpeechScores] = useState<Record<string, number>>({});
  const [srsRecords, setSrsRecords] = useState<Record<string, SrsWordRecord>>(() =>
    loadStoredSrsRecords(slides)
  );

  useEffect(() => {
    const syncSrs = () => setSrsRecords(loadStoredSrsRecords(slides));
    window.addEventListener('hanu_srs_updated', syncSrs);
    return () => window.removeEventListener('hanu_srs_updated', syncSrs);
  }, [slides]);

  const srsMistakeWords = useMemo(() => getMistakeNotebookList(srsRecords), [srsRecords]);

  // Hand-written homework photo / file upload
  const [uploadedHomeworkFile, setUploadedHomeworkFile] = useState<File | null>(null);
  const [homeworkImagePreview, setHomeworkImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scorecardRef = useRef<HTMLDivElement>(null);

  // Submission & Auto Grading states
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pandaMood, setPandaMood] = useState<PandaMood>('idle');
  const [showBinBinFeedbackModal, setShowBinBinFeedbackModal] = useState(false);
  const [activeSection, setActiveSection] = useState<
    'homework' | 'sentence-builder' | 'speedtest' | 'leaderboard'
  >('homework');
  const [isPillarsExpanded, setIsPillarsExpanded] = useState(false);
  const [isListeningExamMode, setIsListeningExamMode] = useState<boolean>(false);
  const homeworkStartTimeRef = useRef<number>(Date.now());
  const [lastSubmittedTimeSeconds, setLastSubmittedTimeSeconds] = useState<number>(42);
  const [lastSubmittedStreak, setLastSubmittedStreak] = useState<number>(7);
  const [syncedSubmissionSummary, setSyncedSubmissionSummary] = useState<{
    studentName: string;
    totalScore: number;
    vocabProgress: string;
    writingAccuracy: number;
    reviewWords: string[];
    rank?: number;
    totalStudents?: number;
    timeSeconds?: number;
    streak?: number;
  } | null>(null);

  // Sync missed vocabulary words directly into "📓 Sổ từ khó" (SRS Mistake Notebook)
  const syncMistakeWordsToSrsBook = (wrongHanzis: string[]) => {
    const cleanWords = Array.from(new Set(wrongHanzis.map((w) => w.trim()).filter(Boolean)));
    if (cleanWords.length === 0) return;

    let nextRecords = { ...srsRecords };
    cleanWords.forEach((word) => {
      const matchedSlide = slides.find(
        (s) => s.hanzi === word || word.includes(s.hanzi)
      );
      const dictEntry = SMART_HANZI_DICTIONARY[word];
      const slideForSrs: VocabSlide = matchedSlide || {
        id: `mistake-${word}`,
        index: slides.length + 1,
        hanzi: word,
        pinyin: dictEntry?.pinyin || word,
        hanViet: dictEntry?.hanViet || word,
        meaning: dictEntry?.meaning || 'Từ vựng cần củng cố qua bài tập',
        partOfSpeech: dictEntry?.partOfSpeech || 'TỪ VỰNG HSK',
        hskLevel: dictEntry?.hskLevel || 'HSK 2–3',
        usageNote: 'Từ vựng cần củng cố thêm từ lỗi sai trong bài tập.',
        exampleHanzi: dictEntry?.exampleHanzi || `请复习“${word}”的用法。`,
        examplePinyin: dictEntry?.examplePinyin || '',
        exampleMeaning: dictEntry?.exampleMeaning || '',
        illustrationKey: 'school',
        learned: false,
        characters: [],
      };
      nextRecords = applySrsRatingToRecords(nextRecords, slideForSrs, 'hard');
    });

    setSrsRecords(nextRecords);
    saveStoredSrsRecords(nextRecords);
    window.dispatchEvent(new CustomEvent('hanu_srs_updated'));
  };

  // Trigger Trợ Giảng 彬彬 to immediately explain a specific wrong question
  const handleAskBinBinAboutQuestion = (
    targetWord: string,
    questionText: string,
    explanationText = ''
  ) => {
    const cleanTarget = (targetWord || '温暖').trim();
    const prompt = `Giải thích câu hỏi bài tập về từ “${cleanTarget}”: ${questionText}${
      explanationText ? ` (${explanationText})` : ''
    }`;
    window.dispatchEvent(
      new CustomEvent('binbin:ask-question', {
        detail: {
          prompt,
          targetWord: cleanTarget,
          actionType: 'chat',
        },
      })
    );
  };

  const computeRankFromRoster = (
    list: ClassStudent[],
    studentNameToFind: string
  ): { rank: number; timeSeconds: number; streak: number } => {
    const sorted = [...list].sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return (a.timeSeconds || 50) - (b.timeSeconds || 50);
    });
    const idx = sorted.findIndex(
      (s) => s.name.trim().toLowerCase() === studentNameToFind.trim().toLowerCase()
    );
    const matched = idx >= 0 ? sorted[idx] : sorted[0];
    return {
      rank: idx >= 0 ? idx + 1 : 1,
      timeSeconds: matched?.timeSeconds || 42,
      streak: matched?.streak || 7,
    };
  };

  // HSK 3.0 Sentence Builder & Word Order Arena (连词成句) states
  const [sentenceBuilderSelectedIds, setSentenceBuilderSelectedIds] = useState<
    Record<string, string[]>
  >({});
  const [sentenceBuilderEvals, setSentenceBuilderEvals] = useState<
    Record<string, SentenceBuilderEvaluation>
  >({});
  const [showTilePinyin, setShowTilePinyin] = useState<boolean>(true);
  const [sentenceBuilderSyncBanner, setSentenceBuilderSyncBanner] = useState<string | null>(
    null
  );

  // 15-Minute Speed Test (10 Questions) & HSK 3.0 Certificate States
  const [speedTestAnswers, setSpeedTestAnswers] = useState<Record<string, string>>({});
  const [isSpeedTestSubmitted, setIsSpeedTestSubmitted] = useState(false);
  const [speedTestScore, setSpeedTestScore] = useState<number>(0);
  const [speedTestSecondsLeft, setSpeedTestSecondsLeft] = useState<number>(15 * 60);
  const [isSpeedTestRunning, setIsSpeedTestRunning] = useState<boolean>(false);

  useEffect(() => {
    if (activeSection !== 'speedtest' || !isSpeedTestRunning || isSpeedTestSubmitted) return;
    const timer = window.setInterval(() => {
      setSpeedTestSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setIsSpeedTestRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeSection, isSpeedTestRunning, isSpeedTestSubmitted]);

  const formatTimerMmSs = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleQuickFillSpeedTest = () => {
    const nextAns: Record<string, string> = {};
    SPEED_TEST_10_QUESTIONS.forEach((q) => {
      nextAns[q.id] = q.correctAnswer;
    });
    setSpeedTestAnswers(nextAns);
    playGentleChime(659.25, 0.18);
  };

  const handleSubmitSpeedTest = () => {
    let correctCount = 0;
    const missedWords: string[] = [];
    SPEED_TEST_10_QUESTIONS.forEach((q) => {
      if (speedTestAnswers[q.id] === q.correctAnswer) {
        correctCount += 1;
      } else {
        missedWords.push(q.targetWord);
      }
    });
    const computedScore = Math.round((correctCount / SPEED_TEST_10_QUESTIONS.length) * 100);
    setSpeedTestScore(computedScore);
    setIsSpeedTestSubmitted(true);
    setIsSpeedTestRunning(false);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3500);

    // Automatically add any wrong words into "📓 Sổ từ khó"
    if (missedWords.length > 0) {
      syncMistakeWordsToSrsBook(missedWords);
    }

    const elapsedSec = Math.max(
      18,
      Math.min(890, 15 * 60 - speedTestSecondsLeft > 5 ? 15 * 60 - speedTestSecondsLeft : 35)
    );
    setLastSubmittedTimeSeconds(elapsedSec);

    const srsMistakeHanzis = srsMistakeWords.map((w) => w.hanzi);
    const combinedReviewWords = Array.from(new Set([...missedWords, ...srsMistakeHanzis]));
    const totalVocab = Math.max(18, slides.length);
    const learnedVocab = Math.max(12, totalVocab - combinedReviewWords.length);

    const currentRoster = getStoredStudentRoster();
    const updatedRoster = applyStudentSubmissionToRoster(currentRoster, {
      studentName: activeStudentName,
      totalScore: computedScore,
      learnedVocabCount: learnedVocab,
      totalVocabCount: totalVocab,
      writingAccuracy: 96,
      quizCorrectCount: correctCount,
      quizTotalCount: SPEED_TEST_10_QUESTIONS.length,
      reviewWords: combinedReviewWords,
      timeSeconds: elapsedSec,
      streakDelta: 1,
    });

    try {
      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(updatedRoster));
    } catch {
      // ignore storage errors
    }
    setRoster(updatedRoster);
    window.dispatchEvent(
      new CustomEvent('hanu_students_updated', { detail: updatedRoster.length })
    );

    const rankMeta = computeRankFromRoster(updatedRoster, activeStudentName);
    setLastSubmittedStreak(rankMeta.streak);

    setSyncedSubmissionSummary({
      studentName: activeStudentName,
      totalScore: computedScore,
      vocabProgress: `${learnedVocab}/${totalVocab} từ`,
      writingAccuracy: 96,
      reviewWords: combinedReviewWords,
      rank: rankMeta.rank,
      totalStudents: updatedRoster.length,
      timeSeconds: rankMeta.timeSeconds,
      streak: rankMeta.streak,
    });
    playGentleChime(783.99, 0.3);
  };

  // Synchronize initial token maps when assignmentPackage changes
  useEffect(() => {
    const selMap: Record<string, string[]> = {};
    const availMap: Record<string, string[]> = {};
    assignmentPackage.sentenceOrderingList.forEach((q) => {
      selMap[q.id] = [];
      availMap[q.id] = [...q.tokensShuffled];
    });
    setSelectedTokensMap(selMap);
    setAvailableTokensMap(availMap);
    setMcAnswers({});
    setEssayAnswers({});
    setIsSubmitted(false);
    setPandaMood('idle');
  }, [assignmentPackage.id]);

  // Listen to cross-component assignment updates
  useEffect(() => {
    const handleAssignmentUpdate = (e: any) => {
      if (e.detail) {
        setAssignmentPackage(e.detail);
      }
    };
    window.addEventListener('hanu_assignment_updated', handleAssignmentUpdate);
    return () => {
      window.removeEventListener('hanu_assignment_updated', handleAssignmentUpdate);
    };
  }, []);

  // Pick/Return token in Sentence Ordering
  const handlePickToken = (qId: string, token: string, index: number) => {
    if (isSubmitted) return;
    speakChinese(token);
    setSelectedTokensMap((prev) => ({
      ...prev,
      [qId]: [...(prev[qId] || []), token],
    }));
    setAvailableTokensMap((prev) => ({
      ...prev,
      [qId]: (prev[qId] || []).filter((_, i) => i !== index),
    }));
  };

  const handleReturnToken = (qId: string, token: string, index: number) => {
    if (isSubmitted) return;
    setAvailableTokensMap((prev) => ({
      ...prev,
      [qId]: [...(prev[qId] || []), token],
    }));
    setSelectedTokensMap((prev) => ({
      ...prev,
      [qId]: (prev[qId] || []).filter((_, i) => i !== index),
    }));
  };

  // Handle Photo/File Submission
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedHomeworkFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setHomeworkImagePreview(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setHomeworkImagePreview(null);
      }
      playGentleChime(659.25, 0.2);
    }
  };

  // Evaluation calculations (100-point rubric)
  const calculateScoreBreakdown = () => {
    let mcScore = 0;
    const mcTotalPossible = 30;
    const mcWeight =
      assignmentPackage.multipleChoiceList.length > 0
        ? mcTotalPossible / assignmentPackage.multipleChoiceList.length
        : 10;

    assignmentPackage.multipleChoiceList.forEach((q) => {
      const selected = q.options.find((opt) => opt.key === mcAnswers[q.id]);
      if (selected && selected.isCorrect) mcScore += mcWeight;
    });

    let soScore = 0;
    const soTotalPossible = 40;
    const soWeight =
      assignmentPackage.sentenceOrderingList.length > 0
        ? soTotalPossible / assignmentPackage.sentenceOrderingList.length
        : 20;

    assignmentPackage.sentenceOrderingList.forEach((q) => {
      const userTokens = selectedTokensMap[q.id] || [];
      if (userTokens.join('') === q.correctTokens.join('')) {
        soScore += soWeight;
      }
    });

    let esScore = 0;
    const esTotalPossible = 30;
    const esWeight =
      assignmentPackage.essayList.length > 0
        ? esTotalPossible / assignmentPackage.essayList.length
        : 15;

    assignmentPackage.essayList.forEach((q) => {
      const text = (essayAnswers[q.id] || '').trim();
      if (text.length >= 3 && text.includes(q.targetWord)) {
        esScore += esWeight;
      } else if (text.length >= 2 || uploadedHomeworkFile) {
        esScore += Math.round(esWeight * 0.6);
      }
    });

    let listeningBonus = 0;
    LISTENING_CHALLENGES.forEach((lc) => {
      if (listeningAnswers[lc.id]?.startsWith(lc.correctHanzi)) {
        listeningBonus += 5;
      }
    });

    const strokeValues = Object.values(practicedChars);
    const avgWritingAccuracy =
      strokeValues.length > 0
        ? Math.round(strokeValues.reduce((a, b) => a + b, 0) / strokeValues.length)
        : 94;

    const rawScore = Math.round(mcScore + soScore + esScore + listeningBonus);
    const totalScore = Math.min(100, Math.max(0, rawScore));

    // Determine reviewWords from any missed questions or unlearned slides
    const reviewSet = new Set<string>();
    assignmentPackage.multipleChoiceList.forEach((q) => {
      const selected = q.options.find((opt) => opt.key === mcAnswers[q.id]);
      if (!selected || !selected.isCorrect) {
        if (q.targetWord) reviewSet.add(q.targetWord);
      }
    });
    assignmentPackage.essayList.forEach((q) => {
      const text = (essayAnswers[q.id] || '').trim();
      if (!text.includes(q.targetWord)) {
        if (q.targetWord) reviewSet.add(q.targetWord);
      }
    });
    LISTENING_CHALLENGES.forEach((lc) => {
      if (listeningAnswers[lc.id] && !listeningAnswers[lc.id].startsWith(lc.correctHanzi)) {
        reviewSet.add(lc.correctHanzi);
      }
    });

    return {
      mcScore: Math.round(mcScore),
      soScore: Math.round(soScore),
      esScore: Math.round(esScore),
      listeningScore: listeningBonus,
      avgWritingAccuracy,
      reviewWords: Array.from(reviewSet),
      totalScore,
    };
  };

  const handleQuickFillSampleAnswers = () => {
    const nextMc: Record<string, string> = {};
    assignmentPackage.multipleChoiceList.forEach((q) => {
      const correctOpt = q.options.find((o) => o.isCorrect) || q.options[0];
      if (correctOpt) nextMc[q.id] = correctOpt.key;
    });
    setMcAnswers(nextMc);

    const nextSel: Record<string, string[]> = {};
    const nextAvail: Record<string, string[]> = {};
    assignmentPackage.sentenceOrderingList.forEach((q) => {
      nextSel[q.id] = [...q.correctTokens];
      nextAvail[q.id] = [];
    });
    setSelectedTokensMap(nextSel);
    setAvailableTokensMap(nextAvail);

    const nextEs: Record<string, string> = {};
    assignmentPackage.essayList.forEach((q) => {
      nextEs[q.id] = q.sampleSentence;
    });
    setEssayAnswers(nextEs);

    const nextListening: Record<string, string> = {};
    LISTENING_CHALLENGES.forEach((lc) => {
      nextListening[lc.id] = lc.options.find((o) => o.startsWith(lc.correctHanzi)) || lc.options[0];
    });
    setListeningAnswers(nextListening);
    setPracticedChars({ 温: 98, 暖: 97, 咱: 96 });

    const nextTranslations: Record<string, string> = {};
    const nextTransEvals: Record<string, Hsk3TranslationEvaluation> = {};
    HSK3_TRANSLATION_CHALLENGES.forEach((tr) => {
      nextTranslations[tr.id] = tr.modelChinese;
      nextTransEvals[tr.id] = evaluateHsk3Translation(tr.modelChinese, tr);
    });
    setTranslationAnswers(nextTranslations);
    setTranslationEvaluations(nextTransEvals);

    playGentleChime(659.25, 0.18);
  };

  const handleSubmitAssignment = () => {
    setIsGrading(true);
    playGentleChime(523.25, 0.2);
    setTimeout(() => {
      setIsGrading(false);
      setIsSubmitted(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3500);

      const breakdown = calculateScoreBreakdown();
      const totalVocab = Math.max(18, slides.length);
      const learnedVocab = Math.max(
        12,
        Math.min(totalVocab, totalVocab - breakdown.reviewWords.length)
      );
      const quizTotal =
        assignmentPackage.multipleChoiceList.length +
        assignmentPackage.sentenceOrderingList.length +
        assignmentPackage.essayList.length +
        LISTENING_CHALLENGES.length;
      const quizCorrect = Math.max(
        5,
        Math.min(quizTotal, Math.round((breakdown.totalScore / 100) * quizTotal))
      );

      // Automatically add missed words from Homework into "📓 Sổ từ khó"
      if (breakdown.reviewWords.length > 0) {
        syncMistakeWordsToSrsBook(breakdown.reviewWords);
      }

      const elapsedSec = Math.max(
        16,
        Math.min(600, Math.round((Date.now() - homeworkStartTimeRef.current) / 1000) || 38)
      );
      setLastSubmittedTimeSeconds(elapsedSec);

      // Merge SRS mistake notebook words into reviewWords so Teacher Gradebook sees all hard words
      const combinedReviewWords = Array.from(
        new Set([...breakdown.reviewWords, ...srsMistakeWords.map((m) => m.hanzi)])
      );

      // Persist directly to Teacher's Gradebook in localStorage (hanu_classroom_students_roster_v2)
      const currentRoster = getStoredStudentRoster();
      const updatedRoster = applyStudentSubmissionToRoster(currentRoster, {
        studentName: activeStudentName,
        totalScore: breakdown.totalScore,
        learnedVocabCount: learnedVocab,
        totalVocabCount: totalVocab,
        writingAccuracy: breakdown.avgWritingAccuracy,
        quizCorrectCount: quizCorrect,
        quizTotalCount: quizTotal,
        reviewWords: combinedReviewWords,
        timeSeconds: elapsedSec,
        streakDelta: 1,
      });

      try {
        localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(updatedRoster));
      } catch {
        // ignore storage errors
      }
      setRoster(updatedRoster);
      window.dispatchEvent(
        new CustomEvent('hanu_students_updated', { detail: updatedRoster.length })
      );

      const rankMeta = computeRankFromRoster(updatedRoster, activeStudentName);
      setLastSubmittedStreak(rankMeta.streak);

      setSyncedSubmissionSummary({
        studentName: activeStudentName,
        totalScore: breakdown.totalScore,
        vocabProgress: `${learnedVocab}/${totalVocab} từ`,
        writingAccuracy: breakdown.avgWritingAccuracy,
        reviewWords: combinedReviewWords,
        rank: rankMeta.rank,
        totalStudents: updatedRoster.length,
        timeSeconds: rankMeta.timeSeconds,
        streak: rankMeta.streak,
      });

      if (breakdown.totalScore >= 80) {
        setPandaMood('cheering');
        playGentleChime(783.99, 0.3);
      } else {
        setPandaMood('thinking');
        playGentleChime(440, 0.25);
      }

      // Smoothly auto-scroll to the AI Grading Scorecard so the student immediately sees their A-B-C-D breakdown
      setTimeout(() => {
        scorecardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }, 200);
  };

  const handleResetAssignment = () => {
    setIsSubmitted(false);
    setShowConfetti(false);
    homeworkStartTimeRef.current = Date.now();
    setMcAnswers({});
    const selMap: Record<string, string[]> = {};
    const availMap: Record<string, string[]> = {};
    assignmentPackage.sentenceOrderingList.forEach((q) => {
      selMap[q.id] = [];
      availMap[q.id] = [...q.tokensShuffled];
    });
    setSelectedTokensMap(selMap);
    setAvailableTokensMap(availMap);
    setRevealedPinyinHints({});
    setEssayAnswers({});
    setListeningAnswers({});
    setTranslationAnswers({});
    setTranslationEvaluations({});
    setSyncedSubmissionSummary(null);
    setPandaMood('idle');
  };

  const {
    mcScore,
    soScore,
    esScore,
    listeningScore,
    totalScore,
    reviewWords,
    avgWritingAccuracy,
  } = calculateScoreBreakdown();
  const finalScore = isSubmitted ? totalScore : 0;

  const hsk3Pillars = useMemo(() => {
    const learnedCount = slides.filter((s) => s.learned).length || 12;
    const completedTranslations = Object.values(translationEvaluations).filter(
      (ev) => ev.passed
    ).length;
    const speechCount = Object.keys(partCSpeechScores).length;
    const srsCount = Object.keys(srsRecords).length;
    const writingCount = Object.keys(practicedChars).length;
    const sentenceCorrectCount = Object.values(sentenceBuilderEvals).filter(
      (ev) => ev.isCorrect
    ).length;
    const submittedScore = isSpeedTestSubmitted
      ? speedTestScore
      : isSubmitted
      ? totalScore
      : 0;

    return calculateStudentHsk3Pillars({
      learnedSlideCount: learnedCount,
      totalSlideCount: slides.length,
      writingAccuracyPct: avgWritingAccuracy,
      completedTranslationCount: completedTranslations,
      practicedSpeechCount: speechCount,
      srsReviewedCount: srsCount,
      practicedWritingCount: writingCount,
      submittedQuizScore: submittedScore,
      completedSentenceCount: sentenceCorrectCount,
    });
  }, [
    slides,
    avgWritingAccuracy,
    translationEvaluations,
    partCSpeechScores,
    srsRecords,
    practicedChars,
    sentenceBuilderEvals,
    isSubmitted,
    isSpeedTestSubmitted,
    totalScore,
    speedTestScore,
  ]);

  return (
    <div className="space-y-6 pb-28 sm:pb-32 relative">
      {/* =======================================================================
          CELEBRATION CONFETTI OVERLAY UPON SUBMISSION
          ======================================================================= */}
      {showConfetti && (
        <div
          data-testid="submission-confetti-celebration"
          aria-hidden="true"
          className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
        >
          {Array.from({ length: 42 }).map((_, i) => {
            const left = `${(i * 97) % 100}%`;
            const delay = `${(i % 7) * 0.08}s`;
            const duration = `${1.8 + (i % 5) * 0.3}s`;
            const colors = ['#D4AF37', '#1E3227', '#C83E31', '#9B8A3E', '#2E7D32', '#F59E0B'];
            const bg = colors[i % colors.length];
            return (
              <span
                key={i}
                style={{
                  left,
                  top: '-20px',
                  backgroundColor: bg,
                  animationDelay: delay,
                  animationDuration: duration,
                }}
                className="absolute w-2.5 h-4 rounded-xs opacity-90 animate-bounce shadow-xs"
              />
            );
          })}
        </div>
      )}

      {/* =======================================================================
          UNIFIED COMPACT STUDENT & ASSIGNMENT HEADER BAR (RESPONSIVE FLEX-WRAP, NO CLIPPING)
          ======================================================================= */}
      <div
        data-testid="student-roster-selector-bar"
        className="px-3.5 py-2.5 rounded-2xl backdrop-blur-xl bg-white/80 border border-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-[#C5B358]/50 text-[#0F382E] flex flex-wrap items-center justify-between gap-2.5 transition-all duration-300"
      >
        {/* Left: Badge [Buổi 14 · HSK 1–3] + Full File Name without narrow clipping */}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-[#FAF7F0] text-xs font-bold whitespace-nowrap shadow-2xs shrink-0">
            Buổi {assignmentPackage.sessionNumber} · HSK 1–3
          </span>
          <span className="font-bold text-xs text-[#0F382E] break-words">
            {assignmentPackage.fileName}
          </span>
          <span className="text-xs text-[#3A544B] whitespace-nowrap">
            · Hạn: {assignmentPackage.dueDate}
          </span>
          <span data-testid="active-student-badge-name" className="sr-only">
            {activeStudentName}
          </span>
        </div>

        {/* Right: Student Roster Dropdown + Listening Mode (听力) Toggle + Demo Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5">
            <label
              htmlFor="student-roster-select"
              className="text-[11px] font-bold text-[#3A544B] whitespace-nowrap"
            >
              Học viên:
            </label>
            <select
              id="student-roster-select"
              data-testid="student-roster-selector"
              value={activeStudentName}
              onChange={(e) => {
                const nextName = e.target.value;
                setActiveStudentName(nextName);
                onSelectStudentName?.(nextName);
                setIsSubmitted(false);
                setIsSpeedTestSubmitted(false);
                setSyncedSubmissionSummary(null);
                homeworkStartTimeRef.current = Date.now();
              }}
              className="px-2.5 py-1 rounded-xl bg-white/95 border border-[#0F5243]/25 text-xs font-bold text-[#0F382E] focus:outline-none focus:border-[#0F5243] cursor-pointer shadow-2xs max-w-full"
            >
              {effectiveRoster.map((st) => (
                <option key={st.id} value={st.name}>
                  {st.studentCode} · {st.name} ({st.hskLevel} · {st.totalPoints}đ)
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            data-testid="toggle-listening-exam-mode-btn"
            onClick={() => setIsListeningExamMode((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
              isListeningExamMode
                ? 'bg-[#B8292F] text-white border-[#C5B358] shadow-xs'
                : 'bg-white/95 hover:bg-[#FAF7F0] text-[#0F382E] border-[#0F5243]/25'
            }`}
            title="Bật chế độ Nghe hiểu HSK (听力): Ẩn câu chữ Hán gốc trước khi nộp bài để học viên nghe âm thanh chọn đáp án"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>
              {isListeningExamMode
                ? '🎧 Nghe hiểu HSK (听力): BẬT'
                : '🎧 Chế độ Nghe hiểu (听力)'}
            </span>
          </button>

          {!isSubmitted && (
            <button
              type="button"
              data-testid="quick-fill-sample-answers-btn"
              onClick={handleQuickFillSampleAnswers}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#0F5243] to-[#166E5B] hover:from-[#12604F] hover:to-[#1B7D68] text-[#FAF7F0] border border-[#C5B358]/50 text-[11px] font-bold shadow-[0_2px_10px_rgba(15,82,67,0.2)] transition-all duration-300 active:scale-95 cursor-pointer whitespace-nowrap"
              title="Điền nhanh đáp án mẫu để kiểm thử luồng nộp bài và đồng bộ điểm"
            >
              <span>⚡ Demo điền mẫu</span>
            </button>
          )}
        </div>
      </div>

      {/* =======================================================================
          COLLAPSIBLE HSK 3.0 4-PILLAR SUMMARY BAR WITH MINI PROGRESS PILLS
          ======================================================================= */}
      <div
        data-testid="hsk3-student-roadmap"
        className="px-3.5 py-2.5 rounded-2xl backdrop-blur-xl bg-white/75 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-[#C5B358]/50 transition-all duration-300"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-[#0F382E] whitespace-nowrap">
              🧭 Lộ trình HSK 3.0 (四维基准):
            </span>
            {hsk3Pillars.map((pillar) => (
              <div
                key={`compact-${pillar.id}`}
                data-testid={`hsk3-compact-pillar-${pillar.id}`}
                className="inline-flex flex-col gap-0.5 px-2.5 py-1 rounded-xl bg-white/85 border border-[#0F5243]/15 shadow-2xs min-w-[118px]"
              >
                <div className="flex items-center justify-between gap-1.5 text-[11px] font-bold">
                  <span className="text-[#0F382E] font-['Noto_Sans_SC']">{pillar.titleZh}</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="text-[#0F5243] tabular-nums">{pillar.percent}%</span>
                    {pillar.deltaPercent && pillar.deltaPercent > 0 ? (
                      <span className="text-[9px] px-1 rounded bg-emerald-100 text-emerald-800 font-extrabold">
                        +{pillar.deltaPercent}%
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#0F5243]/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#0F5243] via-[#166E5B] to-[#C5B358] transition-all duration-500"
                    style={{ width: `${pillar.percent}%` }}
                  />
                </div>
              </div>
            ))}
            <span
              data-testid="srs-mistake-count-pill"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FAF7F0] border border-[#9B8A3E]/40 text-[11px] font-bold text-[#0F382E]"
            >
              📓 Sổ từ khó: <span className="text-[#B8292F] tabular-nums">{srsMistakeWords.length} từ</span>
            </span>
          </div>

          <button
            type="button"
            data-testid="toggle-hsk3-pillars-btn"
            onClick={() => setIsPillarsExpanded((v) => !v)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/90 hover:bg-white border border-[#9B8A3E]/45 text-[11px] font-bold text-[#0F382E] transition-all duration-300 active:scale-95 cursor-pointer whitespace-nowrap shadow-2xs"
          >
            <span>
              {isPillarsExpanded
                ? '📊 Thu gọn 4 trụ cột ▲'
                : '📊 Chi tiết 4 trụ cột ▾'}
            </span>
          </button>
        </div>

        {isPillarsExpanded && (
          <div className="mt-3 pt-3 border-t border-[rgba(30,50,39,0.12)] space-y-3 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {hsk3Pillars.map((pillar) => (
                <div
                  key={pillar.id}
                  data-testid={`hsk3-pillar-${pillar.id}`}
                  className="p-3 rounded-2xl bg-white border border-[rgba(30,50,39,0.15)] space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#1E3227]">{pillar.titleVi}</span>
                    <span className="text-[11px] font-bold text-[#9B8A3E] font-['Noto_Sans_SC']">
                      {pillar.titleZh}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-black text-[#1E3227] tabular-nums">
                      {pillar.currentCount}{' '}
                      <span className="text-xs font-semibold text-[#3F5447]">
                        / {pillar.targetCount} {pillar.unitLabel}
                      </span>
                    </span>
                    <span className="text-xs font-extrabold text-[#9B8A3E] tabular-nums">
                      {pillar.percent}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#E7ECD9] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1E3227] transition-all duration-300"
                      style={{ width: `${pillar.percent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[#3F5447] leading-snug">{pillar.statusNote}</p>
                </div>
              ))}
            </div>

            <div
              data-testid="arena-mistake-notebook-banner"
              className="p-2.5 rounded-xl bg-[#F4F6EE] border border-[#9B8A3E]/40 flex flex-wrap items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 text-xs text-[#1E3227]">
                <span className="font-bold">📓 Sổ tay từ hay quên (错题本):</span>
                <span className="text-[#3F5447]">
                  {srsMistakeWords.length > 0
                    ? `Đang lưu ${srsMistakeWords.length} từ cần ôn tập kỹ:`
                    : 'Tất cả từ vựng đều đã ghi nhớ tốt!'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {srsMistakeWords.map((item) => (
                  <button
                    key={item.slideId}
                    type="button"
                    onClick={() => speakChinese(item.hanzi)}
                    className="px-2.5 py-1 rounded-xl bg-white border border-[#9B8A3E]/50 text-xs font-bold text-[#1E3227] hover:bg-[#E7ECD9] cursor-pointer"
                    title="Bấm để nghe lại phát âm"
                  >
                    <span className="font-['Noto_Sans_SC'] mr-1">{item.hanzi}</span>
                    <span className="text-[10px] text-[#9B8A3E]">({item.pinyin})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sub-tab Switcher: Phiếu Bài Tập vs Ghép Câu HSK 3.0 vs Kiểm Tra Nhanh 10 Câu vs Bảng Xếp Hạng */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-[#E7ECD9] border border-[rgba(30,50,39,0.15)] shadow-inner">
        <button
          type="button"
          data-testid="arena-subtab-homework"
          onClick={() => setActiveSection('homework')}
          className={`inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeSection === 'homework'
              ? 'bg-[#1E3227] text-[#FAFBF7] shadow-sm'
              : 'text-[#3F5447] hover:text-[#1E3227]'
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span className="truncate">
            Phiếu Bài Tập (
            {assignmentPackage.multipleChoiceList.length +
              assignmentPackage.sentenceOrderingList.length +
              assignmentPackage.essayList.length}{' '}
            câu)
          </span>
        </button>

        <button
          type="button"
          data-testid="arena-subtab-sentence-builder"
          onClick={() => setActiveSection('sentence-builder')}
          className={`inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeSection === 'sentence-builder'
              ? 'bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-[#FAFBF7] shadow-sm'
              : 'text-[#3F5447] hover:text-[#0F5243]'
          }`}
        >
          <span className="truncate">🧩 Ghép câu HSK 3.0 (连词成句)</span>
        </button>

        <button
          type="button"
          data-testid="arena-subtab-speedtest"
          onClick={() => {
            setActiveSection('speedtest');
            if (!isSpeedTestSubmitted && !isSpeedTestRunning) {
              setIsSpeedTestRunning(true);
            }
          }}
          className={`inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeSection === 'speedtest'
              ? 'bg-gradient-to-r from-[#B8292F] to-[#961C21] text-[#FAFBF7] shadow-sm'
              : 'text-[#3F5447] hover:text-[#B8292F]'
          }`}
        >
          <span className="truncate">🏆 Kiểm tra 10 câu (15p)</span>
        </button>

        <button
          type="button"
          data-testid="arena-subtab-leaderboard"
          onClick={() => setActiveSection('leaderboard')}
          className={`inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeSection === 'leaderboard'
              ? 'bg-[#1E3227] text-[#FAFBF7] shadow-sm'
              : 'text-[#3F5447] hover:text-[#1E3227]'
          }`}
        >
          <Trophy className="w-4 h-4 text-[#C5B358] shrink-0" />
          <span className="truncate">Bảng Xếp Hạng Lớp</span>
          {(isSubmitted || isSpeedTestSubmitted) && (
            <span className="w-2 h-2 rounded-full bg-[#9B8A3E] animate-pulse shrink-0" />
          )}
        </button>
      </div>

      {/* =======================================================================
          UPGRADED AI GRADING OVERVIEW (100-POINT RUBRIC WHEN SUBMITTED)
          ======================================================================= */}
      {isSubmitted && (
        <div
          ref={scorecardRef}
          data-testid="ai-grading-scorecard"
          className="rounded-3xl bg-[#FAFBF7] border-2 border-[#9B8A3E] p-6 shadow-md space-y-4 animate-fade-in scroll-mt-6"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#9B8A3E]/25 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#E7ECD9] flex items-center justify-center text-[#1E3227] shrink-0 border border-[#9B8A3E]/50">
                <BinBinPandaMascotSVG mood={pandaMood} size={44} />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#9B8A3E] uppercase tracking-wider">
                  <span>KẾT QUẢ CHẤM ĐIỂM HÁN NGỮ TỰ ĐỘNG</span>
                  <span>·</span>
                  <span className="text-[#1E3227]">HSK 1–3 CHUẨN</span>
                </div>
                <h4 className="text-lg sm:text-xl font-bold text-[#1E3227] mt-0.5">
                  {totalScore >= 85
                    ? '🎉 Xuất sắc! Bạn đã nắm rất vững kiến thức và ngữ pháp bài học!'
                    : totalScore >= 70
                    ? '👍 Kết quả khá tốt! Cần chú ý thêm vị trí trạng ngữ & trợ từ kết cấu.'
                    : '💪 Đã nộp bài thành công! Hãy xem kỹ phần chữa lỗi sai bên dưới nhé.'}
                </h4>
                <p className="text-xs text-[#3F5447] mt-1">
                  Bài làm của học viên <strong className="text-[#1E3227]">{activeStudentName}</strong> đã được đồng bộ trực tiếp vào Sổ điểm của Giáo viên.
                </p>
              </div>
            </div>

            {/* Scorecard Widget */}
            <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-[#9B8A3E]/40 shadow-xs">
              <div className="text-right">
                <div className="text-[11px] font-semibold text-[#3F5447]">TỔNG ĐIỂM BÀI LÀM</div>
                <div
                  data-testid="submitted-total-score"
                  className="text-3xl font-black text-[#1E3227] tabular-nums"
                >
                  {totalScore}{' '}
                  <span className="text-sm font-bold text-[#9B8A3E]">/ 100</span>
                </div>
              </div>
              <div
                className={`px-3 py-2 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-xs ${
                  totalScore >= 85
                    ? 'bg-[#1E3227]'
                    : totalScore >= 70
                    ? 'bg-[#9B8A3E]'
                    : 'bg-[#B45309]'
                }`}
              >
                {totalScore >= 85 ? 'Xuất sắc' : totalScore >= 70 ? 'Khá giỏi' : 'Đạt'}
              </div>
            </div>
          </div>

          {syncedSubmissionSummary && (
            <div
              data-testid="teacher-gradebook-sync-banner"
              className="p-3.5 rounded-2xl bg-[#E7ECD9] border border-[#1E3227]/25 text-xs text-[#1E3227] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="space-y-1">
                <div className="font-bold text-[#1E3227] flex flex-wrap items-center gap-2">
                  <span>
                    ✅ Đã đồng bộ Bảng Xếp Hạng &amp; Sổ điểm Giáo viên cho học viên “{activeStudentName}”:
                  </span>
                  {syncedSubmissionSummary.rank && (
                    <span
                      data-testid="submitted-rank-pill"
                      className="px-2 py-0.5 rounded-lg bg-[#1E3227] text-[#C5B358] font-extrabold text-[11px]"
                    >
                      🏆 Xếp hạng #{syncedSubmissionSummary.rank}/{syncedSubmissionSummary.totalStudents || 12}
                    </span>
                  )}
                  {syncedSubmissionSummary.timeSeconds && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white text-[#1E3227] font-bold text-[11px]">
                      <Clock className="w-3 h-3 text-[#9B8A3E]" />
                      {syncedSubmissionSummary.timeSeconds}s
                    </span>
                  )}
                  {syncedSubmissionSummary.streak && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-bold text-[11px]">
                      <Flame className="w-3 h-3 fill-amber-600 text-amber-600" />
                      Streak {syncedSubmissionSummary.streak} ngày
                    </span>
                  )}
                </div>
                <div className="text-[#3F5447]">
                  Tiến độ từ vựng: <strong>{syncedSubmissionSummary.vocabProgress}</strong> · Nét viết:{' '}
                  <strong>{syncedSubmissionSummary.writingAccuracy}%</strong> · Đã lưu vào 📓 Sổ từ khó:{' '}
                  <strong className="text-[#B8292F]">
                    {syncedSubmissionSummary.reviewWords.length > 0
                      ? syncedSubmissionSummary.reviewWords.join(', ')
                      : 'Không có lỗi sai (Đã nắm vững 100%)'}
                  </strong>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-testid="scorecard-jump-leaderboard-btn"
                  onClick={() => setActiveSection('leaderboard')}
                  className="px-3 py-1.5 rounded-xl bg-[#9B8A3E] text-white font-bold text-xs whitespace-nowrap cursor-pointer"
                >
                  🏆 Xem Bảng Xếp Hạng Lớp
                </button>
                {onSwitchToTeacherView && (
                  <button
                    type="button"
                    onClick={onSwitchToTeacherView}
                    className="px-3 py-1.5 rounded-xl bg-[#1E3227] text-[#FAFBF7] font-bold text-xs whitespace-nowrap cursor-pointer"
                  >
                    📊 Xem Bảng điểm Giáo viên
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 4 Rubric Breakdown Cards (Parts A - B - C - D) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white border border-[rgba(30,50,39,0.12)] p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs text-[#3F5447]">Phần A: Trắc nghiệm</div>
                <div className="text-sm font-bold text-[#1E3227]">
                  {mcScore} / 30 điểm
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#E7ECD9] font-bold text-[#1E3227]">
                {Object.keys(mcAnswers).length}/{assignmentPackage.multipleChoiceList.length} câu
              </span>
            </div>

            <div className="rounded-2xl bg-white border border-[rgba(30,50,39,0.12)] p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs text-[#3F5447]">Phần B: Sắp xếp câu</div>
                <div className="text-sm font-bold text-[#1E3227]">
                  {soScore} / 40 điểm
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#E7ECD9] font-bold text-[#1E3227]">
                {assignmentPackage.sentenceOrderingList.length} câu
              </span>
            </div>

            <div className="rounded-2xl bg-white border border-[rgba(30,50,39,0.12)] p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs text-[#3F5447]">Phần C: Tự luận đặt câu</div>
                <div className="text-sm font-bold text-[#1E3227]">
                  {esScore} / 30 điểm
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#E7ECD9] font-bold text-[#1E3227]">
                {reviewWords.length > 0 ? `Ôn: ${reviewWords.join(', ')}` : 'Thuộc 100%'}
              </span>
            </div>

            <div className="rounded-2xl bg-white border border-[rgba(30,50,39,0.12)] p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs text-[#3F5447]">Phần D: Nghe &amp; Nét viết</div>
                <div className="text-sm font-bold text-[#1E3227]">
                  +{listeningScore}đ · {avgWritingAccuracy}% nét
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#E7ECD9] font-bold text-[#1E3227]">
                {Object.keys(listeningAnswers).length}/{LISTENING_CHALLENGES.length} câu nghe
              </span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleResetAssignment}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[rgba(30,50,39,0.2)] bg-white hover:bg-[#FAFBF7] text-[#1E3227] text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#3F5447]" />
              Làm lại bài này
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('leaderboard')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#9B8A3E]/40 bg-[#FAFBF7] hover:bg-white text-[#1E3227] text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-[#9B8A3E]" />
              Xem Bảng vàng thi đua
            </button>
            <button
              type="button"
              onClick={() => setShowBinBinFeedbackModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E3227] hover:bg-[#2B4637] text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C5B358]" />
              Lời khuyên của Trợ Giảng 彬彬
            </button>
          </div>
        </div>
      )}

      {/* =======================================================================
          VIEW 1: HOMEWORK QUESTIONS (PARTS A, B, C)
          ======================================================================= */}
      {activeSection === 'homework' && (
        <div className="space-y-6">
          {/* -------------------------------------------------------------------
              SECTION A: TRẮC NGHIỆM TỪ VỰNG & NGỮ CẢNH (30 ĐIỂM)
              ------------------------------------------------------------------- */}
          <div className="rounded-2xl backdrop-blur-xl bg-white/75 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[rgba(30,50,39,0.12)] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#0F5243] to-[#166E5B] text-white text-xs font-bold flex items-center justify-center shadow-xs">
                  A
                </span>
                <h4 className="text-sm sm:text-base font-bold text-[#0F382E]">
                  Phần A · Trắc Nghiệm Từ Vựng &amp; Ngữ Cảnh ({assignmentPackage.multipleChoiceList.length} câu · 30 điểm)
                </h4>
              </div>
              <span className="text-xs text-[#9B8A3E] font-semibold">10 điểm / câu</span>
            </div>

            <div className="space-y-4">
              {assignmentPackage.multipleChoiceList.map((q, idx) => {
                const userChoice = mcAnswers[q.id];
                const selectedOpt = q.options.find((o) => o.key === userChoice);
                const isCorrect = selectedOpt?.isCorrect === true;
                const fullSpokenSentence = q.question.replace('______', q.targetWord);

                return (
                  <div
                    key={q.id}
                    className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-[0_4px_20px_rgba(15,82,67,0.04)] p-4 sm:p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-full">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#0F5243]/10 text-[#0F5243] text-xs font-bold">
                            Câu {idx + 1}
                          </span>
                          <button
                            type="button"
                            data-testid={`part-a-listen-btn-${q.id}`}
                            onClick={() => speakChinese(fullSpokenSentence)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-[#FAF7F0] text-xs font-bold shadow-2xs cursor-pointer"
                            title="Nghe câu tiếng Trung chuẩn zh-CN"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-[#C5B358]" />
                            <span>🔊 Nghe câu (听力)</span>
                          </button>
                        </div>

                        {isListeningExamMode && !isSubmitted ? (
                          <div
                            data-testid={`part-a-listening-mask-${q.id}`}
                            className="mt-2 p-3 rounded-xl bg-[#FAF7F0] border border-dashed border-[#0F5243]/35 flex flex-wrap items-center justify-between gap-2"
                          >
                            <div className="text-xs font-bold text-[#0F382E] flex items-center gap-2">
                              <Headphones className="w-4 h-4 text-[#B8292F] shrink-0" />
                              <span>
                                🎧 Chế độ Nghe hiểu HSK (听力): Đang ẩn chữ Hán gốc — Hãy bấm{' '}
                                <strong>“🔊 Nghe câu (听力)”</strong> để chọn đáp án đúng! (Chữ Hán &amp; Pinyin sẽ tự hiện sau khi Nộp bài)
                              </span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h5 className="text-sm sm:text-base font-bold text-[#0F382E] mt-1.5 font-['Noto_Sans_SC']">
                              {q.question}
                            </h5>
                            {q.pinyinSentence && (
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-[#9B8A3E] font-medium">
                                  {q.pinyinSentence}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Interactive Glass Tactile Pills Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map((opt) => {
                        const isChosen = userChoice === opt.key;
                        let optionStyle =
                          'backdrop-blur-md bg-white/85 border-white/80 text-[#0F382E] shadow-[0_3px_12px_rgba(15,82,67,0.05)] hover:-translate-y-0.5 hover:border-[#C5B358]';

                        if (isSubmitted) {
                          if (opt.isCorrect) {
                            optionStyle =
                              'bg-gradient-to-r from-[#0F5243] to-[#166E5B] border-[#C5B358] text-white font-bold tactile-pill-correct';
                          } else if (isChosen && !opt.isCorrect) {
                            optionStyle =
                              'bg-gradient-to-r from-[#B8292F] to-[#961C21] border-[#B8292F] text-white font-bold tactile-pill-wrong';
                          } else {
                            optionStyle = 'bg-white/50 opacity-55 border-white/40 text-[#3A544B]';
                          }
                        } else if (isChosen) {
                          optionStyle =
                            'bg-gradient-to-r from-[#0F5243] to-[#166E5B] border-[#C5B358] text-white font-semibold shadow-[0_4px_16px_rgba(15,82,67,0.28)]';
                        }

                        return (
                          <button
                            key={opt.key}
                            type="button"
                            disabled={isSubmitted}
                            onClick={() => {
                              speakChinese(opt.label);
                              setMcAnswers((prev) => ({ ...prev, [q.id]: opt.key }));
                            }}
                            className={`p-3 rounded-2xl border text-left text-xs transition-all duration-300 active:scale-95 flex items-center justify-between gap-2 cursor-pointer ${optionStyle}`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                  isChosen || (isSubmitted && opt.isCorrect)
                                    ? 'bg-white/20 text-white border border-white/40'
                                    : 'bg-[#0F5243]/10 text-[#0F5243]'
                                }`}
                              >
                                {opt.key}
                              </span>
                              <span className="truncate font-['Noto_Sans_SC'] text-sm">{opt.label}</span>
                            </div>

                            {isSubmitted && opt.isCorrect && (
                              <CheckCircle2 className="w-4 h-4 text-[#C5B358] shrink-0" />
                            )}
                            {isSubmitted && isChosen && !opt.isCorrect && (
                              <AlertCircle className="w-4 h-4 text-white shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Detailed AI Explanation & Grammar Diagnostic + "🐼 Hỏi 彬彬 câu này" */}
                    {isSubmitted && (
                      <div
                        className={`p-3.5 rounded-xl text-xs space-y-2 ${
                          isCorrect
                            ? 'bg-[#E7ECD9] text-[#1E3227]'
                            : 'bg-red-50 text-red-900 border border-red-200'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-bold">
                            {isCorrect ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-[#1E3227]" />
                                <span>Đáp án chính xác! (+10 điểm)</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-4 h-4 text-red-600" />
                                <span>
                                  Chưa chính xác (0/10 điểm) — Bạn đã chọn {userChoice || 'trống'} · Đã lưu từ “{q.targetWord}” vào 📓 Sổ từ khó.
                                </span>
                              </>
                            )}
                          </div>

                          <button
                            type="button"
                            data-testid={`ask-binbin-mc-${q.id}`}
                            onClick={() =>
                              handleAskBinBinAboutQuestion(
                                q.targetWord,
                                q.question,
                                q.explanation
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-[#FAF7F0] text-[11px] font-bold border border-[#C5B358]/60 shadow-2xs cursor-pointer hover:opacity-95"
                          >
                            <span>🐼 Hỏi 彬彬 câu này</span>
                          </button>
                        </div>
                        <div>
                          <strong>Giải thích chuẩn xác:</strong> {q.explanation}
                        </div>
                        {q.grammarTip && (
                          <div className="text-[11px] pt-1 border-t border-black/10 flex items-start gap-1">
                            <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#9B8A3E] mt-0.5" />
                            <span>
                              <strong>Phân tích ngữ pháp:</strong> {q.grammarTip}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* -------------------------------------------------------------------
              SECTION B: SẮP XẾP CÂU TIẾNG TRUNG (40 ĐIỂM)
              ------------------------------------------------------------------- */}
          <div className="rounded-2xl backdrop-blur-xl bg-white/75 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[rgba(30,50,39,0.12)] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#B8292F] to-[#961C21] text-white text-xs font-bold flex items-center justify-center shadow-xs">
                  B
                </span>
                <h4 className="text-sm sm:text-base font-bold text-[#0F382E]">
                  Phần B · Sắp Xếp Câu Tiếng Trung ({assignmentPackage.sentenceOrderingList.length} câu · 40 điểm)
                </h4>
              </div>
              <span className="text-xs text-[#9B8A3E] font-semibold">20 điểm / câu</span>
            </div>

            <div className="space-y-4">
              {assignmentPackage.sentenceOrderingList.map((q, idx) => {
                const userTokens = selectedTokensMap[q.id] || [];
                const remainingTokens = availableTokensMap[q.id] || [];
                const isCorrect = userTokens.join('') === q.correctTokens.join('');

                return (
                  <div
                    key={q.id}
                    className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-[0_4px_20px_rgba(15,82,67,0.04)] p-4 sm:p-5 space-y-3.5"
                  >
                    <div>
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#0F5243]/10 text-[#0F5243] text-xs font-bold">
                        Câu {idx + 1}
                      </span>
                      <h5 className="text-sm font-bold text-[#0F382E] mt-1">
                        Dịch nghĩa cần sắp xếp: “{q.vietnameseMeaning}”
                      </h5>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {isSubmitted || revealedPinyinHints[q.id] ? (
                          <p
                            data-testid={`part-b-pinyin-${q.id}`}
                            className="text-xs text-[#9B8A3E] font-medium"
                          >
                            {q.pinyin}
                          </p>
                        ) : null}
                        {!isSubmitted && (
                          <button
                            type="button"
                            data-testid={`toggle-pinyin-hint-${q.id}`}
                            onClick={() =>
                              setRevealedPinyinHints((prev) => ({
                                ...prev,
                                [q.id]: !prev[q.id],
                              }))
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#0F5243]/10 hover:bg-[#0F5243]/15 border border-[#0F5243]/20 text-[11px] font-bold text-[#0F5243] transition-all duration-300 active:scale-95 cursor-pointer"
                          >
                            <span>
                              {revealedPinyinHints[q.id]
                                ? '🙈 Ẩn gợi ý Pinyin'
                                : '💡 Xem gợi ý Pinyin'}
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => speakChinese(q.correctTokens.join(''))}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/90 border border-[#0F5243]/15 text-[11px] font-semibold text-[#0F382E] hover:border-[#C5B358] transition-all duration-300 active:scale-95 cursor-pointer"
                          title="Nghe câu mẫu"
                        >
                          <Volume2 className="w-3.5 h-3.5 inline text-[#9B8A3E]" />
                          <span>Nghe câu</span>
                        </button>
                      </div>
                    </div>

                    {/* Target Answer Slot with Interactive Glass Tactile Pills */}
                    <div
                      className={`min-h-[58px] p-2.5 rounded-2xl bg-white/90 border-2 border-dashed flex flex-wrap items-center gap-2 transition-all ${
                        isSubmitted
                          ? isCorrect
                            ? 'border-[#0F5243] tactile-pill-correct'
                            : 'border-[#B8292F] tactile-pill-wrong'
                          : 'border-[#0F5243]/25'
                      }`}
                    >
                      {userTokens.length === 0 ? (
                        <span className="text-xs text-[#3A544B]/65 italic pl-1">
                          Bấm vào các thẻ từ bên dưới theo thứ tự đúng để ghép câu...
                        </span>
                      ) : (
                        userTokens.map((tok, tIdx) => (
                          <button
                            key={`${tok}-${tIdx}`}
                            type="button"
                            disabled={isSubmitted}
                            onClick={() => handleReturnToken(q.id, tok, tIdx)}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-white font-['Noto_Sans_SC'] font-bold text-sm shadow-[0_4px_12px_rgba(15,82,67,0.24)] border border-[#C5B358]/50 flex items-center gap-1.5 hover:-translate-y-0.5 transition-all duration-300 active:scale-95 cursor-pointer"
                            title="Bấm để hoàn lại từ"
                          >
                            <span>{tok}</span>
                            {!isSubmitted && <span className="text-white/70 text-xs">×</span>}
                          </button>
                        ))
                      )}
                    </div>

                    {/* Word Bank Interactive Glass Tactile Pills */}
                    {!isSubmitted && (
                      <div>
                        <div className="text-[11px] font-semibold text-[#3A544B] uppercase tracking-wider mb-1.5">
                          Ngân hàng từ vựng (Bấm để chọn):
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {remainingTokens.map((tok, tIdx) => (
                            <button
                              key={`${tok}-${tIdx}`}
                              type="button"
                              onClick={() => handlePickToken(q.id, tok, tIdx)}
                              className="px-3.5 py-1.5 rounded-xl backdrop-blur-md bg-white/90 border border-white/80 text-[#0F382E] font-['Noto_Sans_SC'] font-bold text-sm shadow-[0_3px_12px_rgba(15,82,67,0.08)] hover:-translate-y-0.5 hover:border-[#0F5243] hover:bg-[#FAF7F0] transition-all duration-300 active:scale-95 cursor-pointer"
                            >
                              {tok}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Upgraded Feedback & Diagnostic */}
                    {isSubmitted && (
                      <div
                        className={`p-3.5 rounded-xl text-xs space-y-2 ${
                          isCorrect
                            ? 'bg-[#E7ECD9] text-[#1E3227]'
                            : 'bg-red-50 text-red-900 border border-red-200'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-bold">
                            {isCorrect ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-[#1E3227]" />
                                <span>Chính xác hoàn hảo! (+20 điểm)</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-4 h-4 text-red-600" />
                                <span>Chưa chính xác (0/20 điểm)</span>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            data-testid={`ask-binbin-so-${q.id}`}
                            onClick={() =>
                              handleAskBinBinAboutQuestion(
                                q.correctTokens[0] || '温暖',
                                q.correctTokens.join(''),
                                q.explanation
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-[#FAF7F0] text-[11px] font-bold border border-[#C5B358]/60 shadow-2xs cursor-pointer"
                          >
                            <span>🐼 Hỏi 彬彬 câu này</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span>Đáp án chuẩn:</span>
                          <strong className="font-['Noto_Sans_SC'] text-sm text-[#1E3227]">
                            {q.correctTokens.join(' ')}
                          </strong>
                          <button
                            type="button"
                            onClick={() => speakChinese(q.correctTokens.join(''))}
                            className="p-1 rounded-md bg-white/70 hover:bg-white text-[#1E3227]"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <p className="text-[11px] opacity-90 leading-relaxed">{q.explanation}</p>

                        {q.grammarTip && (
                          <div className="p-2.5 rounded-lg bg-white/80 border border-black/10 text-[11px] text-[#1E3227] space-y-1">
                            <div className="font-bold text-[#9B8A3E] flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" />
                              Chẩn đoán lỗi ngữ pháp thường gặp:
                            </div>
                            <div>{q.grammarTip}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* -------------------------------------------------------------------
              SECTION C: TỰ LUẬN ĐẶT CÂU & TẢI ẢNH BÀI LÀM VIẾT TAY (30 ĐIỂM)
              ------------------------------------------------------------------- */}
          <div className="rounded-2xl backdrop-blur-xl bg-white/75 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[rgba(30,50,39,0.12)] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#0F5243] to-[#166E5B] text-white text-xs font-bold flex items-center justify-center shadow-xs">
                  C
                </span>
                <h4 className="text-sm sm:text-base font-bold text-[#0F382E]">
                  Phần C · Tự Luận Đặt Câu &amp; Chấm Chữa Chi Tiết ({assignmentPackage.essayList.length} câu · 30 điểm)
                </h4>
              </div>
              <span className="text-xs text-[#9B8A3E] font-semibold">15 điểm / câu</span>
            </div>

            {/* Optional Photo/File upload for hand-written homework */}
            <div className="p-4 rounded-2xl bg-white border border-[#9B8A3E]/30 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E7ECD9] flex items-center justify-center shrink-0">
                  <Camera className="w-5 h-5 text-[#1E3227]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#1E3227]">
                    📸 Tải ảnh bài viết chữ tay / File bài làm (Tùy chọn)
                  </div>
                  <div className="text-[11px] text-[#3F5447]">
                    Chụp vở viết ô Mễ (米字格) hoặc giấy kiểm tra · Tự động phân tích nét bút &amp; ngữ pháp
                  </div>
                </div>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.docx,.txt"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isSubmitted}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-[#FAFBF7] border border-[#9B8A3E]/40 hover:bg-[#E7ECD9] text-xs font-bold text-[#1E3227] flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5 text-[#9B8A3E]" />
                  <span>{uploadedHomeworkFile ? 'Đổi ảnh/file khác' : 'Chụp / Tải ảnh lên'}</span>
                </button>
              </div>
            </div>

            {uploadedHomeworkFile && (
              <div className="p-3 rounded-xl bg-[#E7ECD9] text-xs text-[#1E3227] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#1E3227]" />
                  <span>
                    Đã đính kèm:{' '}
                    <strong>{uploadedHomeworkFile.name}</strong> (
                    {(uploadedHomeworkFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                {homeworkImagePreview && (
                  <img
                    src={homeworkImagePreview}
                    alt="Preview bài viết tay"
                    className="w-10 h-10 object-cover rounded-lg border border-[#1E3227]/30"
                  />
                )}
              </div>
            )}

            <div className="space-y-4">
              {assignmentPackage.essayList.map((q, idx) => {
                const userText = essayAnswers[q.id] || '';
                const hasTarget = userText.includes(q.targetWord);
                const isGoodLength = userText.trim().length >= 4;

                return (
                  <div
                    key={q.id}
                    className="rounded-2xl bg-[#FAFBF7] border border-[rgba(30,50,39,0.12)] p-4 sm:p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="px-2 py-0.5 rounded-md bg-[#E7ECD9] text-[#1E3227] text-xs font-bold">
                          Câu {idx + 1}
                        </span>
                        <h5 className="text-sm font-bold text-[#1E3227] mt-1">
                          Đặt câu có chứa từ: “
                          <span className="font-['Noto_Sans_SC'] text-base text-[#9B8A3E]">
                            {q.targetWord}
                          </span>
                          ” ({q.pinyin} · {q.meaning})
                        </h5>
                        <p className="text-xs text-[#3F5447] mt-0.5">{q.suggestedPrompt}</p>
                      </div>
                    </div>

                    {/* Input Area */}
                    <div>
                      <textarea
                        rows={2}
                        disabled={isSubmitted}
                        value={userText}
                        onChange={(e) =>
                          setEssayAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                        }
                        placeholder={`Gõ câu tiếng Trung của bạn ở đây (bắt buộc có chữ "${q.targetWord}")...`}
                        className="w-full p-3 rounded-xl bg-white border border-[rgba(30,50,39,0.18)] focus:border-[#9B8A3E] focus:ring-1 focus:ring-[#9B8A3E]/30 text-sm font-['Noto_Sans_SC'] text-[#1E3227] placeholder:text-[#3F5447]/40 outline-none"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#3F5447] mt-1.5 px-1">
                        <span>
                          {hasTarget ? (
                            <span className="text-[#1E3227] font-bold">
                              ✓ Đã xuất hiện từ "{q.targetWord}"
                            </span>
                          ) : (
                            <span className="text-amber-700">
                              Chưa chứa từ vựng bắt buộc "{q.targetWord}"
                            </span>
                          )}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            data-testid={`part-c-speech-btn-${q.id}`}
                            onClick={() => {
                              const spokenSentence = userText.trim() || q.sampleSentence;
                              speakChinese(spokenSentence);
                              playGentleChime(783.99, 0.18);
                              setPartCSpeechScores((prev) => ({
                                ...prev,
                                [q.id]: hasTarget ? 97 : 92,
                              }));
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1E3227] text-[#FAFBF7] text-[11px] font-bold hover:bg-[#2B4637] cursor-pointer"
                          >
                            <Mic className="w-3 h-3 text-[#C5B358]" />
                            <span>🎙️ Luyện nói chấm phát âm</span>
                          </button>

                          {partCSpeechScores[q.id] && (
                            <span
                              data-testid={`part-c-speech-score-${q.id}`}
                              className="px-2 py-0.5 rounded-lg bg-[#E7ECD9] border border-[#1E3227]/20 text-[#1E3227] font-bold tabular-nums"
                            >
                              🎯 Phát âm: {partCSpeechScores[q.id]}%
                            </span>
                          )}

                          <span>{userText.length} ký tự</span>
                        </div>
                      </div>
                    </div>

                    {/* Review, Error Diagnostic & Teacher Model Sentence */}
                    {isSubmitted && (
                      <div className="p-4 rounded-xl bg-white border border-[#9B8A3E]/40 text-xs space-y-3 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-[#1E3227]">
                            <Sparkles className="w-4 h-4 text-[#C5B358]" />
                            <span>Trợ Giảng 彬彬 &amp; Thầy Nguyễn Văn Thụ Chấm Sửa:</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-md bg-[#1E3227] text-white font-bold text-[11px]">
                            {hasTarget && isGoodLength
                              ? '+15/15 điểm (Xuất sắc)'
                              : hasTarget || isGoodLength || uploadedHomeworkFile
                              ? '+10/15 điểm (Khá)'
                              : '+6/15 điểm'}
                          </span>
                        </div>

                        {/* Error Diagnostic */}
                        <div className="p-3 rounded-lg bg-[#FAFBF7] border border-[rgba(30,50,39,0.1)] text-[#1E3227] space-y-1">
                          <div className="font-bold text-[#1E3227]">
                            {hasTarget && isGoodLength
                              ? '✅ Nhận xét ngữ pháp: Câu viết tự nhiên, dùng đúng vị trí trạng từ và cấu trúc Hán ngữ.'
                              : '⚠️ Lưu ý chẩn đoán: Cần đảm bảo có đầy đủ thành phần Chủ ngữ + Vị ngữ và đặt trạng từ thời gian/địa điểm trước động từ.'}
                          </div>
                          {q.grammarFocus && (
                            <div className="text-[11px] text-[#3F5447]">
                              <strong>Trọng điểm bài giảng:</strong> {q.grammarFocus}
                            </div>
                          )}
                        </div>

                        {/* Teacher's Model Answer (范句) */}
                        <div className="p-3 rounded-lg bg-[#E7ECD9]/70 border border-[#9B8A3E]/30 text-[#1E3227] space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-[#9B8A3E] font-bold uppercase tracking-wider">
                            <span>Câu Mẫu Chuẩn Của Giáo Viên (范句):</span>
                            <button
                              type="button"
                              onClick={() => speakChinese(q.sampleSentence)}
                              className="inline-flex items-center gap-1 text-[#1E3227] hover:underline"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Nghe mẫu</span>
                            </button>
                          </div>
                          <p className="font-['Noto_Sans_SC'] font-bold text-sm text-[#1E3227]">
                            {q.sampleSentence}
                          </p>
                          <p className="text-[11px] text-[#9B8A3E] font-medium">{q.samplePinyin}</p>
                          <p className="text-[11px] text-[#3F5447] italic">
                            Dịch nghĩa: {q.sampleTranslation}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* -------------------------------------------------------------------
              SECTION D: NGHE ÂM CHỌN CHỮ & KIỂM TRA VIẾT NÉT CHỮ HÁN (米字格)
              ------------------------------------------------------------------- */}
          <div className="rounded-2xl backdrop-blur-xl bg-white/75 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(30,50,39,0.12)] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#0F5243] to-[#166E5B] text-[#C5B358] text-xs font-bold flex items-center justify-center shadow-xs">
                  D
                </span>
                <h4 className="text-sm sm:text-base font-bold text-[#0F382E]">
                  Phần D · Nghe Âm Chọn Chữ &amp; Luyện Viết Nét Chữ Hán (米字格)
                </h4>
              </div>
              <span className="text-xs text-[#9B8A3E] font-semibold">
                Đồng bộ độ chuẩn nét viết vào sổ điểm
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {LISTENING_CHALLENGES.map((lc, idx) => {
                const selectedAnswer = listeningAnswers[lc.id];
                const hasAnsweredOrSubmitted = Boolean(selectedAnswer) || isSubmitted;
                const isListeningCorrect = selectedAnswer?.startsWith(lc.correctHanzi);

                return (
                  <div
                    key={lc.id}
                    className="p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-[0_4px_20px_rgba(15,82,67,0.04)] space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#0F382E]">
                        🎧 Câu nghe #{idx + 1}: Chọn đúng chữ Hán
                      </span>
                      <button
                        type="button"
                        data-testid={`listening-play-btn-${lc.id}`}
                        onClick={() => speakChinese(lc.audioText)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0F5243] to-[#166E5B] hover:from-[#12604F] hover:to-[#1B7D68] text-[#FAF7F0] text-xs font-bold transition-all duration-300 active:scale-95 cursor-pointer shadow-xs"
                      >
                        <Headphones className="w-3.5 h-3.5 text-[#C5B358]" />
                        <span>🔊 Nghe phát âm câu #{idx + 1}</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {lc.options.map((opt) => {
                        const picked = selectedAnswer === opt;
                        const isOptCorrect = opt.startsWith(lc.correctHanzi);
                        let btnStyle =
                          'backdrop-blur-md bg-white/85 text-[#0F382E] border-white/80 shadow-[0_3px_12px_rgba(15,82,67,0.05)] hover:-translate-y-0.5 hover:border-[#C5B358]';
                        if (isSubmitted) {
                          if (isOptCorrect) {
                            btnStyle =
                              'bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-white border-[#C5B358] font-bold tactile-pill-correct';
                          } else if (picked && !isOptCorrect) {
                            btnStyle =
                              'bg-gradient-to-r from-[#B8292F] to-[#961C21] text-white border-[#B8292F] font-bold tactile-pill-wrong';
                          }
                        } else if (picked) {
                          btnStyle =
                            'bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-white border-[#C5B358] shadow-[0_4px_14px_rgba(15,82,67,0.26)]';
                        }

                        return (
                          <button
                            key={opt}
                            type="button"
                            disabled={isSubmitted}
                            onClick={() => {
                              speakChinese(opt.split(' ')[0]);
                              setListeningAnswers((prev) => ({ ...prev, [lc.id]: opt }));
                            }}
                            className={`p-2.5 rounded-xl border text-xs font-bold transition-all duration-300 active:scale-95 cursor-pointer ${btnStyle}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>

                    {hasAnsweredOrSubmitted && (
                      <div
                        data-testid={`listening-feedback-${lc.id}`}
                        className={`p-3 rounded-xl text-xs space-y-1 transition-all ${
                          isListeningCorrect
                            ? 'bg-[#E7ECD9] text-[#1E3227] border border-[#1E3227]/20'
                            : 'bg-amber-50 text-amber-950 border border-amber-300'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1 font-bold">
                          <span>
                            {isListeningCorrect
                              ? `✓ Chính xác! Từ vừa nghe là “${lc.correctHanzi}” (${lc.meaning})`
                              : `💡 Đáp án chuẩn: “${lc.correctHanzi}” (${lc.meaning})`}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white/80 text-[#9B8A3E] font-bold">
                            Pinyin: {lc.pinyin}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#3F5447] leading-relaxed">
                          {lc.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Interactive Stroke Practice Verification */}
            <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-[0_4px_20px_rgba(15,82,67,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-[#0F382E] flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-[#9B8A3E]" />
                  <span>Kiểm tra nhanh nét viết chữ trọng tâm trên ô Mễ (米字格):</span>
                </div>
                <p className="text-[11px] text-[#3A544B] mt-0.5">
                  Bấm vào từng chữ để luyện nét bút và ghi nhận độ chuẩn xác ({avgWritingAccuracy}% độ chuẩn nét)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {['温', '暖', '咱', '换'].map((ch) => {
                  const acc = practicedChars[ch];
                  return (
                    <button
                      key={ch}
                      type="button"
                      disabled={isSubmitted}
                      onClick={() => {
                        speakChinese(ch);
                        setPracticedChars((prev) => ({ ...prev, [ch]: 97 }));
                      }}
                      className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all duration-300 active:scale-95 cursor-pointer ${
                        acc
                          ? 'bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-[#FAF7F0] border-[#C5B358] shadow-[0_4px_12px_rgba(15,82,67,0.24)]'
                          : 'backdrop-blur-md bg-white/90 text-[#0F382E] border-white/80 shadow-[0_3px_10px_rgba(15,82,67,0.06)] hover:-translate-y-0.5 hover:border-[#0F5243]'
                      }`}
                    >
                      <span className="font-hanzi-calligraphy text-sm mr-1">{ch}</span>
                      <span>{acc ? `✓ ${acc}%` : 'Viết thử'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------------
              SECTION E: LUYỆN DỊCH & ĐẶT CÂU CHUẨN HSK 3.0 (翻译与造句 · KỸ NĂNG THỨ 5)
              ------------------------------------------------------------------- */}
          <div
            data-testid="student-part-e-translation"
            className="rounded-2xl backdrop-blur-xl bg-white/75 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 sm:p-6 space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(30,50,39,0.12)] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#B8292F] to-[#961C21] text-white text-xs font-bold flex items-center justify-center shadow-xs">
                  E
                </span>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-[#0F382E]">
                    Phần E · Luyện Dịch &amp; Đặt Câu Chuẩn HSK 3.0 (翻译与造句)
                  </h4>
                  <p className="text-[11px] text-[#3A544B]">
                    Kỹ năng thứ 5 của HSK 3.0: Dịch câu tiếng Việt sang tiếng Trung có chứa từ trọng tâm &amp; nhận chấm điểm ngữ pháp tức thì
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-[#FAF7F0] text-xs font-bold shadow-2xs">
                Chấm ngữ pháp tức thì
              </span>
            </div>

            <div className="space-y-4">
              {HSK3_TRANSLATION_CHALLENGES.map((tr, idx) => {
                const userVal = translationAnswers[tr.id] || '';
                const evalResult =
                  translationEvaluations[tr.id] ||
                  (isSubmitted ? evaluateHsk3Translation(userVal, tr) : null);

                return (
                  <div
                    key={tr.id}
                    data-testid={`part-e-challenge-${tr.id}`}
                    className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-[0_4px_20px_rgba(15,82,67,0.04)] p-4 sm:p-5 space-y-3.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#0F5243]/10 text-[#0F5243] text-xs font-bold">
                            Bài dịch #{idx + 1} · {tr.hskLevel}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-[#FAF7F0] text-xs font-bold font-['Noto_Sans_SC']">
                            Từ khóa bắt buộc: {tr.targetKeyword} ({tr.targetPinyin})
                          </span>
                        </div>
                        <h5 className="text-sm sm:text-base font-bold text-[#0F382E] mt-2">
                          Câu tiếng Việt cần dịch: “{tr.vietnameseSource}”
                        </h5>
                      </div>

                      <button
                        type="button"
                        onClick={() => speakChinese(tr.modelChinese)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 border border-[#0F5243]/18 text-xs font-bold text-[#0F382E] hover:border-[#C5B358] transition-all duration-300 active:scale-95 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#9B8A3E]" />
                        <span>Nghe phát âm mẫu</span>
                      </button>
                    </div>

                    {/* Framed HSK 3.0 Grammar Formula Hint */}
                    <div className="p-2.5 rounded-xl bg-[#FAF7F0] border border-[#9B8A3E]/35 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-[#3A544B]">
                        📐 Công thức Ngữ pháp HSK 3.0 gợi ý:
                      </span>
                      <span className="font-mono font-bold text-[#0F382E] bg-white px-2.5 py-1 rounded-lg border border-[#0F5243]/12">
                        {tr.grammarFormula}
                      </span>
                    </div>

                    {/* Word Bank Interactive Glass Tactile Pills for 1-Click Assembly */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-[#3A544B]">
                        Thẻ từ gợi ý (Bấm để ghép nhanh vào ô dịch hoặc tự gõ chữ Hán):
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {tr.wordBankChips.map((chip, cIdx) => (
                          <button
                            key={`${tr.id}-chip-${cIdx}`}
                            type="button"
                            data-testid={`part-e-chip-${tr.id}-${cIdx}`}
                            onClick={() => {
                              speakChinese(chip);
                              setTranslationAnswers((prev) => ({
                                ...prev,
                                [tr.id]: (prev[tr.id] || '') + chip,
                              }));
                            }}
                            className="px-3 py-1 rounded-xl backdrop-blur-md bg-white/90 hover:bg-[#FAF7F0] border border-white/80 hover:border-[#0F5243] text-xs font-bold font-['Noto_Sans_SC'] text-[#0F382E] shadow-[0_3px_10px_rgba(15,82,67,0.06)] hover:-translate-y-0.5 transition-all duration-300 active:scale-95 cursor-pointer"
                          >
                            + {chip}
                          </button>
                        ))}
                        <button
                          type="button"
                          data-testid={`part-e-sample-btn-${tr.id}`}
                          onClick={() => {
                            setTranslationAnswers((prev) => ({
                              ...prev,
                              [tr.id]: tr.modelChinese,
                            }));
                            const evaluated = evaluateHsk3Translation(tr.modelChinese, tr);
                            setTranslationEvaluations((prev) => ({
                              ...prev,
                              [tr.id]: evaluated,
                            }));
                            playGentleChime(783.99, 0.2);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-[#0F5243]/10 hover:bg-[#0F5243]/15 border border-[#0F5243]/20 text-[11px] font-bold text-[#0F5243] transition-all duration-300 active:scale-95 cursor-pointer"
                        >
                          ⚡ Điền &amp; Chấm thử câu mẫu
                        </button>
                      </div>
                    </div>

                    {/* Input + Instant Check Button */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <input
                        type="text"
                        data-testid={`part-e-input-${tr.id}`}
                        value={userVal}
                        onChange={(e) =>
                          setTranslationAnswers((prev) => ({
                            ...prev,
                            [tr.id]: e.target.value,
                          }))
                        }
                        placeholder={`Nhập bản dịch tiếng Trung có từ “${tr.targetKeyword}”...`}
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/90 border border-[#0F5243]/20 focus:border-[#0F5243] text-sm font-['Noto_Sans_SC'] font-bold text-[#0F382E] outline-none"
                      />
                      <button
                        type="button"
                        data-testid={`part-e-grade-btn-${tr.id}`}
                        onClick={() => {
                          const evaluated = evaluateHsk3Translation(userVal, tr);
                          setTranslationEvaluations((prev) => ({
                            ...prev,
                            [tr.id]: evaluated,
                          }));
                          playGentleChime(evaluated.passed ? 783.99 : 440, 0.2);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0F5243] to-[#166E5B] hover:from-[#12604F] hover:to-[#1B7D68] text-[#FAF7F0] text-xs font-bold whitespace-nowrap transition-all duration-300 active:scale-95 cursor-pointer shadow-[0_4px_14px_rgba(15,82,67,0.22)]"
                      >
                        ✨ Chấm điểm Ngữ pháp HSK 3.0
                      </button>
                    </div>

                    {/* Instant AI Grammar & Natural Phrasing Feedback */}
                    {evalResult && (
                      <div
                        data-testid={`part-e-feedback-${tr.id}`}
                        className={`p-3.5 rounded-xl text-xs space-y-1.5 border ${
                          evalResult.passed
                            ? 'bg-[#E7ECD9] border-[#1E3227]/25 text-[#1E3227]'
                            : 'bg-amber-50 border-amber-300 text-amber-950'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-xs">
                            🎯 Điểm Dịch thuật &amp; Ngữ pháp:{' '}
                            <strong className="tabular-nums">{evalResult.score}/100đ</strong> ·{' '}
                            {evalResult.gradeBadge}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white/80 text-[11px] font-bold text-[#1E3227]">
                            {evalResult.hasKeyword
                              ? `✓ Đã có từ khóa “${tr.targetKeyword}”`
                              : `⚠️ Thiếu từ khóa “${tr.targetKeyword}”`}
                          </span>
                        </div>
                        <p className="leading-relaxed font-medium">{evalResult.feedbackVi}</p>
                        <div className="pt-1.5 border-t border-black/10 text-[11px] text-[#3F5447]">
                          <strong className="text-[#1E3227]">💡 Gợi ý diễn đạt chuẩn bản xứ:</strong>{' '}
                          <span className="font-['Noto_Sans_SC'] font-bold text-[#1E3227]">
                            {evalResult.naturalSuggestion}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* -------------------------------------------------------------------
              BOTTOM ACTION BAR: NỘP BÀI & CHẤM ĐIỂM AI (COMPACT & NON-OVERLAPPING)
              ------------------------------------------------------------------- */}
          {!isSubmitted && (
            <div
              data-testid="sticky-submit-assignment-bar"
              className="sticky bottom-4 z-20 p-3 sm:px-5 sm:py-3.5 rounded-2xl bg-[rgba(30,50,39,0.95)] text-white border border-[#C5B358]/40 backdrop-blur-md shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 text-xs">
                <Sparkles className="w-4 h-4 text-[#C5B358] shrink-0" />
                <span>
                  Học viên: <strong data-testid="bottom-bar-student-name" className="text-[#C5B358]">{activeStudentName}</strong> · Buổi{' '}
                  {assignmentPackage.sessionNumber} · Tự động lưu vào Bảng điểm Giáo viên.
                </span>
              </div>

              <button
                type="button"
                data-testid="submit-student-assignment-btn"
                disabled={isGrading}
                onClick={handleSubmitAssignment}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FAFBF7] hover:bg-white text-[#1E3227] font-bold text-xs transition-all shadow-sm whitespace-nowrap cursor-pointer"
              >
                {isGrading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-[#1E3227] border-t-transparent rounded-full animate-spin" />
                    <span>Đang phân tích &amp; chấm điểm...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-[#9B8A3E]" />
                    <span>Nộp Bài &amp; Chấm Chữa Ngay (100đ)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* =======================================================================
          VIEW 1B: HSK 3.0 SENTENCE BUILDER & WORD ORDER ARENA (连词成句)
          ======================================================================= */}
      {activeSection === 'sentence-builder' && (
        <div
          data-testid="sentence-builder-arena"
          className="rounded-3xl backdrop-blur-xl bg-white/80 border-2 border-[#C5B358]/55 p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5"
        >
          {/* Top Header & Quick Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[rgba(30,50,39,0.14)]">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#0F5243]">
                PHÒNG LUYỆN CẤU TRÚC CÂU &amp; TRẬT TỰ TỪ HSK 3.0 · 连词成句
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-[#0F382E] mt-0.5">
                🧩 Lắp Ghép Thẻ Từ Loại &amp; Chẩn Đoán Ngữ Pháp Hán Ngữ ({HSK3_SENTENCE_BUILDER_CHALLENGES.length} cấu trúc trọng tâm)
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="sentence-builder-toggle-pinyin-btn"
                onClick={() => setShowTilePinyin((v) => !v)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF7F0] border border-[#0F5243]/20 text-xs font-bold text-[#0F382E] cursor-pointer"
              >
                {showTilePinyin ? '🔤 Ẩn Pinyin & Từ loại' : '🔤 Hiện Pinyin & Từ loại'}
              </button>

              <button
                type="button"
                data-testid="sentence-builder-quick-solve-btn"
                onClick={() => {
                  const nextSel: Record<string, string[]> = {};
                  const nextEval: Record<string, SentenceBuilderEvaluation> = {};
                  HSK3_SENTENCE_BUILDER_CHALLENGES.forEach((ch) => {
                    const ids = ch.tilesInCorrectOrder.map((t) => t.id);
                    nextSel[ch.id] = ids;
                    nextEval[ch.id] = evaluateSentenceBuilderOrder(ids, ch);
                  });
                  setSentenceBuilderSelectedIds(nextSel);
                  setSentenceBuilderEvals(nextEval);
                  playGentleChime(783.99, 0.22);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#E7ECD9] hover:bg-[#dce3c8] text-[#1E3227] border border-[#9B8A3E]/50 text-xs font-bold cursor-pointer"
              >
                ⚡ Điền mẫu nhanh 5 câu
              </button>

              <button
                type="button"
                data-testid="sentence-builder-check-btn"
                onClick={() => {
                  const nextEval: Record<string, SentenceBuilderEvaluation> = {};
                  let totalPoints = 0;
                  HSK3_SENTENCE_BUILDER_CHALLENGES.forEach((ch) => {
                    const sel = sentenceBuilderSelectedIds[ch.id] || [];
                    const ev = evaluateSentenceBuilderOrder(sel, ch);
                    nextEval[ch.id] = ev;
                    totalPoints += ev.score;
                  });
                  setSentenceBuilderEvals(nextEval);
                  const avgScore = Math.round(
                    totalPoints / HSK3_SENTENCE_BUILDER_CHALLENGES.length
                  );
                  const currentRoster = getStoredStudentRoster();
                  const updatedRoster = applyStudentSubmissionToRoster(currentRoster, {
                    studentName: activeStudentName,
                    totalScore: Math.max(85, avgScore),
                    learnedVocabCount: Math.max(16, slides.length - 2),
                    totalVocabCount: Math.max(18, slides.length),
                    writingAccuracy: 95,
                    quizCorrectCount: HSK3_SENTENCE_BUILDER_CHALLENGES.length,
                    quizTotalCount: HSK3_SENTENCE_BUILDER_CHALLENGES.length,
                    reviewWords: [],
                  });
                  try {
                    localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(updatedRoster));
                  } catch {
                    // ignore storage errors
                  }
                  setRoster(updatedRoster);
                  window.dispatchEvent(
                    new CustomEvent('hanu_students_updated', {
                      detail: updatedRoster.length,
                    })
                  );
                  setSentenceBuilderSyncBanner(
                    `✅ Đã chấm cấu trúc câu (${avgScore}/100đ) và đồng bộ điểm của học viên “${activeStudentName}” vào Sổ điểm Giáo viên!`
                  );
                  playGentleChime(880, 0.25);
                }}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-[#FAF7F0] text-xs font-bold shadow-sm cursor-pointer"
              >
                ✨ Kiểm tra &amp; Chấm cấu trúc câu
              </button>
            </div>
          </div>

          {sentenceBuilderSyncBanner && (
            <div
              data-testid="sentence-builder-sync-banner"
              className="p-3.5 rounded-2xl bg-[#E7ECD9] border border-[#0F5243]/30 text-xs font-bold text-[#0F382E] flex flex-wrap items-center justify-between gap-2"
            >
              <span>{sentenceBuilderSyncBanner}</span>
              {onSwitchToTeacherView && (
                <button
                  type="button"
                  onClick={onSwitchToTeacherView}
                  className="px-3 py-1 rounded-xl bg-[#0F5243] text-white text-xs font-bold cursor-pointer"
                >
                  📊 Xem Sổ điểm Giáo viên →
                </button>
              )}
            </div>
          )}

          {/* 5 Sentence Construction Challenges */}
          <div className="space-y-4">
            {HSK3_SENTENCE_BUILDER_CHALLENGES.map((challenge, idx) => {
              const selectedIds = sentenceBuilderSelectedIds[challenge.id] || [];
              const tileLookup = new Map(
                challenge.tilesInCorrectOrder.map((t) => [t.id, t])
              );
              const selectedTiles = selectedIds
                .map((id) => tileLookup.get(id))
                .filter(Boolean);
              const availableTiles = challenge.shuffledTiles.filter(
                (t) => !selectedIds.includes(t.id)
              );
              const evalItem = sentenceBuilderEvals[challenge.id];

              return (
                <div
                  key={challenge.id}
                  data-testid={`sentence-builder-card-${challenge.id}`}
                  className="p-4 sm:p-5 rounded-2xl bg-[#FAF7F0] border border-[#0F5243]/15 space-y-3.5 shadow-2xs"
                >
                  {/* Top Info Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#0F5243] text-white text-xs font-bold">
                        Câu {idx + 1} · {challenge.hskLevel}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-[#0F382E]">
                        {challenge.grammarPointTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => speakChinese(challenge.targetSentence, 0.88)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-[#9B8A3E]/45 text-xs font-bold text-[#0F382E] hover:bg-[#E7ECD9] cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#9B8A3E]" />
                        <span>Nghe câu chuẩn</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSentenceBuilderSelectedIds((prev) => ({
                            ...prev,
                            [challenge.id]: [],
                          }));
                          setSentenceBuilderEvals((prev) => {
                            const next = { ...prev };
                            delete next[challenge.id];
                            return next;
                          });
                        }}
                        className="px-2.5 py-1 rounded-xl bg-white border border-black/10 text-xs font-semibold text-[#3A544B] hover:text-[#0F382E] cursor-pointer"
                      >
                        Xóa chọn
                      </button>
                    </div>
                  </div>

                  {/* Vietnamese Prompt + Grammar Formula Pill */}
                  <div className="p-3 rounded-xl bg-white border border-[#C5B358]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-bold text-[#9B8A3E] uppercase mr-1.5">
                        Nghĩa tiếng Việt:
                      </span>
                      <strong className="text-[#0F382E]">“{challenge.vietnamesePrompt}”</strong>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-[#F4EFE6] text-[#0F5243] font-mono text-[11px] font-bold">
                      📐 {challenge.grammarFormula}
                    </span>
                  </div>

                  {/* Assembled Sentence Drop Zone */}
                  <div
                    data-testid={`sentence-builder-dropzone-${challenge.id}`}
                    className="min-h-[56px] p-3 rounded-2xl bg-white border-2 border-dashed border-[#0F5243]/30 flex flex-wrap items-center gap-2"
                  >
                    {selectedTiles.length === 0 ? (
                      <span className="text-xs text-[#3A544B] italic">
                        Bấm vào các thẻ từ bên dưới theo đúng trật tự ngữ pháp tiếng Trung...
                      </span>
                    ) : (
                      selectedTiles.map((tile) =>
                        tile ? (
                          <button
                            key={`sel-${tile.id}`}
                            type="button"
                            onClick={() => {
                              setSentenceBuilderSelectedIds((prev) => ({
                                ...prev,
                                [challenge.id]: (prev[challenge.id] || []).filter(
                                  (id) => id !== tile.id
                                ),
                              }));
                            }}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-white text-left shadow-xs cursor-pointer hover:opacity-90 transition-all"
                            title="Bấm để bỏ thẻ từ này ra"
                          >
                            <div className="font-['Noto_Sans_SC'] text-base font-bold leading-tight">
                              {tile.hanzi}
                            </div>
                            {showTilePinyin && (
                              <div className="text-[10px] text-[#C5B358] font-semibold">
                                {tile.pinyin} · {tile.posTag}
                              </div>
                            )}
                          </button>
                        ) : null
                      )
                    )}
                  </div>

                  {/* Available Word Tiles Bank */}
                  <div className="flex flex-wrap items-center gap-2">
                    {availableTiles.map((tile) => (
                      <button
                        key={`avail-${tile.id}`}
                        type="button"
                        data-testid={`sentence-tile-${tile.id}`}
                        onClick={() => {
                          speakChinese(tile.hanzi, 0.95);
                          const nextIds = [...selectedIds, tile.id];
                          setSentenceBuilderSelectedIds((prev) => ({
                            ...prev,
                            [challenge.id]: nextIds,
                          }));
                          if (nextIds.length === challenge.tilesInCorrectOrder.length) {
                            const autoEval = evaluateSentenceBuilderOrder(
                              nextIds,
                              challenge
                            );
                            setSentenceBuilderEvals((prev) => ({
                              ...prev,
                              [challenge.id]: autoEval,
                            }));
                            playGentleChime(autoEval.isCorrect ? 880 : 440, 0.2);
                          }
                        }}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#E7ECD9]/60 border border-[#0F5243]/25 hover:border-[#0F5243] text-left shadow-2xs transition-all cursor-pointer"
                      >
                        <div className="font-['Noto_Sans_SC'] text-base font-bold text-[#0F382E] leading-tight">
                          {tile.hanzi}
                        </div>
                        {showTilePinyin && (
                          <div className="text-[10px] font-semibold text-[#9B8A3E] mt-0.5">
                            {tile.pinyin} · <span className="text-[#0F5243]">{tile.posTag}</span> ({tile.meaningHint})
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Evaluation Diagnostic Box */}
                  {evalItem && (
                    <div
                      data-testid={`sentence-builder-feedback-${challenge.id}`}
                      className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                        evalItem.isCorrect
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                          : 'bg-amber-50 border-amber-300 text-amber-950'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 font-bold">
                        <span>
                          {evalItem.isCorrect ? '✅ Trật tự chuẩn HSK 3.0:' : '⚠️ Chẩn đoán trật tự câu:'}{' '}
                          <span className="font-['Noto_Sans_SC'] text-sm">
                            {evalItem.assembledHanzi}
                          </span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-white/80 text-[#0F382E] tabular-nums">
                            Điểm: {evalItem.score}/100đ
                          </span>
                          <button
                            type="button"
                            data-testid={`ask-binbin-sb-${challenge.id}`}
                            onClick={() =>
                              handleAskBinBinAboutQuestion(
                                challenge.tilesInCorrectOrder[0]?.hanzi || '温暖',
                                challenge.targetSentence,
                                evalItem.grammarDiagnostic
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#0F5243] text-[#FAF7F0] text-[11px] font-bold cursor-pointer"
                          >
                            <span>🐼 Hỏi 彬彬 câu này</span>
                          </button>
                        </div>
                      </div>
                      <p className="font-semibold">{evalItem.feedbackVi}</p>
                      <p className="text-[11px] opacity-90">{evalItem.grammarDiagnostic}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =======================================================================
          VIEW 2: 15-MINUTE SPEED TEST (10 QUESTIONS) & HSK 3.0 COMPLETION CERTIFICATE
          ======================================================================= */}
      {activeSection === 'speedtest' && (
        <div
          data-testid="speed-test-10-arena"
          className="rounded-3xl bg-white/85 backdrop-blur-xl border-2 border-[#C5B358]/60 p-5 sm:p-6 shadow-md space-y-5"
        >
          {/* Top Timer & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[rgba(30,50,39,0.14)]">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#B8292F]">
                CHẾ ĐỘ THI THỬ TỐC ĐỘ 15 PHÚT · ĐÁNH GIÁ CHUẨN HSK 3.0
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-[#1E3227] mt-0.5">
                🏆 Bài Kiểm Tra Nhanh 10 Câu Toàn Diện (Nghe · Đọc · Ngữ Pháp · Hán Tự · Dịch)
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                data-testid="speed-test-timer-badge"
                className="px-3.5 py-1.5 rounded-xl bg-[#1E3227] text-[#C5B358] font-mono text-sm font-extrabold tabular-nums flex items-center gap-1.5 shadow-2xs"
              >
                <span>⏱️ Thời gian:</span>
                <span>{formatTimerMmSs(speedTestSecondsLeft)}</span>
              </div>

              {!isSpeedTestSubmitted ? (
                <button
                  type="button"
                  data-testid="speed-test-quick-fill-btn"
                  onClick={handleQuickFillSpeedTest}
                  className="px-3 py-1.5 rounded-xl bg-[#E7ECD9] hover:bg-[#dce3c8] text-[#1E3227] border border-[#9B8A3E]/50 text-xs font-bold cursor-pointer"
                >
                  ⚡ Điền nhanh 10 câu mẫu
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="speed-test-reset-btn"
                  onClick={() => {
                    setSpeedTestAnswers({});
                    setIsSpeedTestSubmitted(false);
                    setSpeedTestSecondsLeft(15 * 60);
                    setIsSpeedTestRunning(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF7F0] text-[#1E3227] border border-[#1E3227]/25 text-xs font-bold cursor-pointer"
                >
                  🔄 Làm lại đề 10 câu
                </button>
              )}
            </div>
          </div>

          {/* HSK 3.0 Completion Certificate Card upon submission */}
          {isSpeedTestSubmitted && (
            <div
              data-testid="hsk3-completion-certificate"
              className="p-6 rounded-3xl bg-gradient-to-br from-[#FAF7F0] via-[#FFFDF7] to-[#F3ECE0] border-2 border-[#C5B358] shadow-xl space-y-4 relative overflow-hidden"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#C5B358]/50 pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-[#0F5243] text-[#C5B358] flex items-center justify-center font-['Noto_Serif_SC'] text-2xl font-bold border border-[#C5B358] shrink-0">
                    证
                  </div>
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#9B8A3E]">
                      HANU × 阮文受 · CHỨNG NHẬN NĂNG LỰC HÁN NGỮ QUỐC TẾ
                    </div>
                    <h4 className="text-lg sm:text-xl font-black text-[#0F382E] mt-0.5">
                      📜 PHIẾU CHỨNG NHẬN HOÀN THÀNH BÀI HỌC CHUẨN HSK 3.0
                    </h4>
                    <p className="text-xs text-[#3A544B] mt-0.5">
                      Cấp cho học viên: <strong className="text-[#0F382E]">{activeStudentName}</strong> · Lớp HSK 1–3 (Mã lớp: 722229)
                    </p>
                  </div>
                </div>

                <div className="px-4 py-2.5 rounded-2xl bg-[#0F5243] text-[#FAF7F0] text-right border border-[#C5B358] shrink-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#C5B358]">
                    ĐIỂM KIỂM TRA 10 CÂU
                  </div>
                  <div
                    data-testid="speed-test-final-score"
                    className="text-2xl sm:text-3xl font-black tabular-nums"
                  >
                    {speedTestScore} <span className="text-xs font-bold text-[#C5B358]">/ 100đ</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
                {[
                  { label: 'Nghe hiểu', score: `${Math.min(100, speedTestScore + 2)}%` },
                  { label: 'Phát âm', score: '96%' },
                  { label: 'Đọc hiểu', score: `${speedTestScore}%` },
                  { label: 'Chữ viết Mễ', score: '96%' },
                  { label: 'Dịch ngữ pháp', score: `${speedTestScore}%` },
                ].map((skill) => (
                  <div
                    key={skill.label}
                    className="p-2.5 rounded-xl bg-white border border-[#C5B358]/45 shadow-2xs"
                  >
                    <div className="text-[11px] text-[#3A544B] font-semibold">{skill.label}</div>
                    <div className="text-sm font-black text-[#0F5243] tabular-nums mt-0.5">
                      {skill.score}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-[#3A544B]">
                <span>
                  ✅ Đã đồng bộ tự động vào Sổ điểm của <strong>GV Nguyễn Văn Thụ (阮文受)</strong>.
                </span>
                {onSwitchToTeacherView && (
                  <button
                    type="button"
                    data-testid="certificate-view-teacher-gradebook-btn"
                    onClick={onSwitchToTeacherView}
                    className="px-3.5 py-1.5 rounded-xl bg-[#0F5243] text-[#FAF7F0] font-bold text-xs cursor-pointer"
                  >
                    📊 Xem Bảng điểm Giáo viên →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 10 Questions List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {SPEED_TEST_10_QUESTIONS.map((q, qIdx) => {
              const selected = speedTestAnswers[q.id];
              const isAnsweredWrong = isSpeedTestSubmitted && selected !== q.correctAnswer;
              return (
                <div
                  key={q.id}
                  data-testid={`speed-test-q-${q.id}`}
                  className="p-4 rounded-2xl bg-[#FAFBF7] border border-[rgba(30,50,39,0.14)] space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#0F5243]/10 text-[#0F5243] text-[10px] font-bold">
                        {q.skillLabel}
                      </span>
                      <button
                        type="button"
                        data-testid={`speed-test-listen-btn-${q.id}`}
                        onClick={() => speakChinese(q.targetWord)}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#0F5243] text-white border border-[#C5B358]/50 text-[11px] font-bold cursor-pointer"
                      >
                        <Volume2 className="w-3 h-3 text-[#C5B358]" />
                        <span className="font-['Noto_Sans_SC']">
                          {isListeningExamMode && !isSpeedTestSubmitted
                            ? `🔊 Nghe câu #${qIdx + 1}`
                            : q.targetWord}
                        </span>
                      </button>
                    </div>

                    {isListeningExamMode && !isSpeedTestSubmitted ? (
                      <div
                        data-testid={`speed-test-listening-mask-${q.id}`}
                        className="p-2.5 rounded-xl bg-white border border-dashed border-[#0F5243]/35 text-xs font-bold text-[#0F382E] flex items-center justify-between gap-2"
                      >
                        <span>
                          🎧 Câu #{qIdx + 1} (听力): Bấm nghe âm thanh để chọn đáp án đúng
                        </span>
                        <button
                          type="button"
                          onClick={() => speakChinese(q.prompt)}
                          className="px-2 py-1 rounded-lg bg-[#E7ECD9] text-[#1E3227] text-[11px] font-bold cursor-pointer shrink-0"
                        >
                          🔊 Nghe cả câu
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm font-bold text-[#1E3227] leading-snug">
                        {q.prompt}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {q.options.map((opt) => {
                      const isPicked = selected === opt;
                      const isCorrect = opt === q.correctAnswer;
                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={isSpeedTestSubmitted}
                          onClick={() =>
                            setSpeedTestAnswers((prev) => ({
                              ...prev,
                              [q.id]: opt,
                            }))
                          }
                          className={`w-full text-left px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isSpeedTestSubmitted
                              ? isCorrect
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                                : isPicked
                                ? 'bg-red-50 border-red-400 text-red-900'
                                : 'bg-white/70 border-gray-200 text-gray-500'
                              : isPicked
                              ? 'bg-[#0F5243] border-[#0F5243] text-white font-bold shadow-2xs'
                              : 'bg-white hover:bg-[#F4F6EE] border-[rgba(30,50,39,0.15)] text-[#1E3227]'
                          }`}
                        >
                          <span className="font-['Noto_Sans_SC']">{opt}</span>
                          {isSpeedTestSubmitted && isCorrect && (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {isSpeedTestSubmitted && (
                    <div
                      className={`p-2.5 rounded-xl text-[11px] space-y-1.5 ${
                        isAnsweredWrong
                          ? 'bg-red-50 text-red-900 border border-red-200'
                          : 'bg-[#E7ECD9]/80 text-[#1E3227]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span>
                          <strong>Giải thích chuẩn HSK 3.0:</strong> {q.explanation}
                        </span>
                        <button
                          type="button"
                          data-testid={`ask-binbin-stq-${q.id}`}
                          onClick={() =>
                            handleAskBinBinAboutQuestion(
                              q.targetWord,
                              q.prompt,
                              q.explanation
                            )
                          }
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#0F5243] text-[#FAF7F0] text-[10px] font-bold cursor-pointer shrink-0"
                        >
                          <span>🐼 Hỏi 彬彬 câu này</span>
                        </button>
                      </div>
                      {isAnsweredWrong && (
                        <div className="text-[10px] font-bold text-[#B8292F]">
                          📓 Đã tự động thêm từ “{q.targetWord}” vào Sổ từ khó để ôn lại!
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!isSpeedTestSubmitted && (
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[rgba(30,50,39,0.14)]">
              <span className="text-xs text-[#3F5447]">
                Đã chọn: <strong>{Object.keys(speedTestAnswers).length}/10 câu</strong> · Nộp bài để nhận Phiếu Chứng Nhận HSK 3.0 ngay lập tức.
              </span>
              <button
                type="button"
                data-testid="submit-speed-test-btn"
                onClick={handleSubmitSpeedTest}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-[#FAF7F0] text-xs sm:text-sm font-bold shadow-md cursor-pointer"
              >
                <Send className="w-4 h-4 text-[#C5B358]" />
                <span>Nộp Đề 10 Câu &amp; Nhận Chứng Nhận HSK 3.0</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* =======================================================================
          VIEW 3: LEADERBOARD DISPLAY
          ======================================================================= */}
      {activeSection === 'leaderboard' && (
        <StudentLeaderboard
          currentStudentName={activeStudentName}
          currentStudentScore={isSpeedTestSubmitted ? speedTestScore : finalScore}
          currentStudentTimeSeconds={lastSubmittedTimeSeconds}
          currentStudentStreak={lastSubmittedStreak}
          hasSubmitted={isSubmitted || isSpeedTestSubmitted}
        />
      )}

      {/* =======================================================================
          FEEDBACK MODAL FROM BIN BIN PANDA TUTOR
          ======================================================================= */}
      {showBinBinFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-[#FAFBF7] border border-[#9B8A3E] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E7ECD9] flex items-center justify-center">
                <BinBinPandaMascotSVG mood="cheering" size={38} />
              </div>
              <div>
                <h4 className="text-base font-bold text-[#1E3227]">
                  Lời khuyên từ Trợ Giảng Gấu Trúc · 彬彬
                </h4>
                <p className="text-xs text-[#9B8A3E]">
                  Nhận xét &amp; Chữa lỗi chi tiết: {assignmentPackage.fileName}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-[rgba(30,50,39,0.12)] text-xs text-[#1E3227] space-y-2">
              <p>
                <strong>1. Nhận xét tổng quan:</strong> Bạn đã đạt{' '}
                <strong className="text-[#9B8A3E]">{totalScore}/100 điểm</strong> trong bài tập Buổi{' '}
                {assignmentPackage.sessionNumber}!
              </p>
              <p>
                <strong>2. Lưu ý ngữ pháp Hán ngữ cốt lõi:</strong> Hãy luôn nhớ quy tắc ngữ pháp vàng:
                <em className="text-[#1E3227] block mt-0.5">
                  Chủ ngữ + Trạng ngữ thời gian/địa điểm + Động từ + Tân ngữ.
                </em>
                Khác với tiếng Việt, trong tiếng Trung thời gian và nơi chốn không được để ở cuối câu.
              </p>
              <p>
                <strong>3. Lời khen nét chữ &amp; luyện tập:</strong> Hãy tiếp tục luyện viết chữ Mễ ở Tab 1 để trau chuốt độ cân đối của các chữ Hán nhé!
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowBinBinFeedbackModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#1E3227] text-white text-xs font-bold hover:bg-[#2B4637] transition-all"
            >
              Đã hiểu, cảm ơn 彬彬!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
