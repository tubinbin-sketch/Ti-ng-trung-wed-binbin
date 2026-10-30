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
import { applyStudentSubmissionToRoster } from '../utils/chineseEngine';
import {
  HSK3_TRANSLATION_CHALLENGES,
  Hsk3TranslationEvaluation,
  calculateStudentHsk3Pillars,
  evaluateHsk3Translation,
} from '../utils/hsk3Engine';
import {
  getMistakeNotebookList,
  loadStoredSrsRecords,
  SrsWordRecord,
} from '../utils/hskStudyHelpers';
import { Mic } from 'lucide-react';

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
      status: 'Đã chấm AI',
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

  // Submission & AI Grading states
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pandaMood, setPandaMood] = useState<PandaMood>('idle');
  const [showBinBinFeedbackModal, setShowBinBinFeedbackModal] = useState(false);
  const [activeSection, setActiveSection] = useState<'homework' | 'leaderboard'>('homework');
  const [isPillarsExpanded, setIsPillarsExpanded] = useState(false);
  const [syncedSubmissionSummary, setSyncedSubmissionSummary] = useState<{
    studentName: string;
    totalScore: number;
    vocabProgress: string;
    writingAccuracy: number;
    reviewWords: string[];
  } | null>(null);

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
        reviewWords: breakdown.reviewWords,
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

      setSyncedSubmissionSummary({
        studentName: activeStudentName,
        totalScore: breakdown.totalScore,
        vocabProgress: `${learnedVocab}/${totalVocab} từ`,
        writingAccuracy: breakdown.avgWritingAccuracy,
        reviewWords: breakdown.reviewWords,
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
    return calculateStudentHsk3Pillars({
      learnedSlideCount: learnedCount,
      totalSlideCount: slides.length,
      writingAccuracyPct: avgWritingAccuracy,
      completedTranslationCount: completedTranslations,
    });
  }, [slides, avgWritingAccuracy, translationEvaluations]);

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
          UNIFIED COMPACT STUDENT & ASSIGNMENT HEADER BAR (1 SINGLE HORIZONTAL ROW)
          ======================================================================= */}
      <div
        data-testid="student-roster-selector-bar"
        className="px-3.5 py-2 rounded-2xl backdrop-blur-xl bg-white/75 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-[#C5B358]/50 text-[#0F382E] flex items-center justify-between gap-2.5 flex-nowrap overflow-x-auto no-scrollbar transition-all duration-300"
      >
        {/* Left: Badge [Buổi 14 · HSK 1–3] + File Name on the exact same row */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <span className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-[#FAF7F0] text-xs font-bold whitespace-nowrap shadow-2xs shrink-0">
            Buổi {assignmentPackage.sessionNumber} · HSK 1–3
          </span>
          <span className="font-bold text-xs text-[#0F382E] truncate max-w-[220px] sm:max-w-[320px]">
            {assignmentPackage.fileName}
          </span>
          <span className="hidden md:inline text-xs text-[#3A544B] whitespace-nowrap">
            · Hạn: {assignmentPackage.dueDate}
          </span>
          <span data-testid="active-student-badge-name" className="sr-only">
            {activeStudentName}
          </span>
        </div>

        {/* Right: Student Roster Dropdown + Compact Demo Button on the exact same row */}
        <div className="flex items-center gap-2 shrink-0">
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
              setSyncedSubmissionSummary(null);
            }}
            className="px-2.5 py-1 rounded-xl bg-white/90 border border-[#0F5243]/20 text-xs font-bold text-[#0F382E] focus:outline-none focus:border-[#0F5243] cursor-pointer shadow-2xs"
          >
            {effectiveRoster.map((st) => (
              <option key={st.id} value={st.name}>
                {st.studentCode} · {st.name} ({st.hskLevel} · {st.totalPoints}đ)
              </option>
            ))}
          </select>

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
                className="inline-flex flex-col gap-0.5 px-2.5 py-1 rounded-xl bg-white/85 border border-[#0F5243]/15 shadow-2xs min-w-[112px]"
              >
                <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                  <span className="text-[#0F382E] font-['Noto_Sans_SC']">{pillar.titleZh}</span>
                  <span className="text-[#0F5243] tabular-nums">{pillar.percent}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#0F5243]/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#0F5243] via-[#166E5B] to-[#C5B358] transition-all duration-500"
                    style={{ width: `${pillar.percent}%` }}
                  />
                </div>
              </div>
            ))}
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FAF7F0] border border-[#9B8A3E]/40 text-[11px] font-bold text-[#0F382E]">
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

      {/* Sub-tab Switcher: Phiếu Bài Tập vs Bảng Xếp Hạng Thi Đua */}
      <div className="flex items-center justify-between gap-3 p-1.5 rounded-2xl bg-[#E7ECD9] border border-[rgba(30,50,39,0.15)] shadow-inner">
        <button
          type="button"
          onClick={() => setActiveSection('homework')}
          className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeSection === 'homework'
              ? 'bg-[#1E3227] text-[#FAFBF7] shadow-sm'
              : 'text-[#3F5447] hover:text-[#1E3227]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>
            Phiếu Làm Bài Tập (
            {assignmentPackage.multipleChoiceList.length +
              assignmentPackage.sentenceOrderingList.length +
              assignmentPackage.essayList.length}{' '}
            câu hỏi)
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('leaderboard')}
          className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeSection === 'leaderboard'
              ? 'bg-[#1E3227] text-[#FAFBF7] shadow-sm'
              : 'text-[#3F5447] hover:text-[#1E3227]'
          }`}
        >
          <Trophy className="w-4 h-4 text-[#C5B358]" />
          <span>Bảng Xếp Hạng Học Tập (Thi đua lớp)</span>
          {isSubmitted && (
            <span className="w-2 h-2 rounded-full bg-[#9B8A3E] animate-pulse" />
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
              <div className="space-y-0.5">
                <div className="font-bold text-[#1E3227]">
                  ✅ Đã lưu điểm vào Sổ điểm Giáo viên cho học viên “{activeStudentName}”:
                </div>
                <div className="text-[#3F5447]">
                  Tiến độ từ vựng: <strong>{syncedSubmissionSummary.vocabProgress}</strong> · Nét viết:{' '}
                  <strong>{syncedSubmissionSummary.writingAccuracy}%</strong> · Từ vựng cần ôn:{' '}
                  <strong className="text-[#9B8A3E]">
                    {syncedSubmissionSummary.reviewWords.length > 0
                      ? syncedSubmissionSummary.reviewWords.join(', ')
                      : 'Không có (Đã nắm vững 100%)'}
                  </strong>
                </div>
              </div>
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

                return (
                  <div
                    key={q.id}
                    className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-[0_4px_20px_rgba(15,82,67,0.04)] p-4 sm:p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-lg bg-[#0F5243]/10 text-[#0F5243] text-xs font-bold">
                          Câu {idx + 1}
                        </span>
                        <h5 className="text-sm sm:text-base font-bold text-[#0F382E] mt-1 font-['Noto_Sans_SC']">
                          {q.question}
                        </h5>
                        {q.pinyinSentence && (
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-[#9B8A3E] font-medium">
                              {q.pinyinSentence}
                            </p>
                            <button
                              type="button"
                              onClick={() => speakChinese(q.question.replace('______', q.targetWord))}
                              className="text-xs text-[#3A544B] hover:text-[#0F5243]"
                              title="Nghe phát âm chuẩn zh-CN"
                            >
                              <Volume2 className="w-3.5 h-3.5 inline" />
                            </button>
                          </div>
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

                    {/* Detailed AI Explanation & Grammar Diagnostic */}
                    {isSubmitted && (
                      <div
                        className={`p-3.5 rounded-xl text-xs space-y-1.5 ${
                          isCorrect
                            ? 'bg-[#E7ECD9] text-[#1E3227]'
                            : 'bg-red-50 text-red-900 border border-red-200'
                        }`}
                      >
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
                                Chưa chính xác (0/10 điểm) — Bạn đã chọn {userChoice || 'trống'}.
                              </span>
                            </>
                          )}
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
              className="sticky bottom-4 z-20 sm:mr-44 md:mr-48 p-3 sm:px-5 sm:py-3.5 rounded-2xl bg-[rgba(30,50,39,0.95)] text-white border border-[#C5B358]/40 backdrop-blur-md shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3"
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
          VIEW 2: LEADERBOARD DISPLAY
          ======================================================================= */}
      {activeSection === 'leaderboard' && (
        <StudentLeaderboard
          currentStudentName={activeStudentName}
          currentStudentScore={finalScore}
          hasSubmitted={isSubmitted}
        />
      )}

      {/* =======================================================================
          FEEDBACK MODAL FROM BIN BIN PANDA AI
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
                  Lời khuyên từ Trợ lý Gấu trúc Bin Bin (彬彬)
                </h4>
                <p className="text-xs text-[#9B8A3E]">
                  Đánh giá bài tập: {assignmentPackage.fileName}
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
              Đã hiểu, cảm ơn Bin Bin!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
