import React, { useEffect, useMemo, useRef, useState } from 'react';
import { VocabSlide } from '../data/chineseData';
import { playGentleChime, speakChinese } from '../utils/speech';
import { PandaMood } from './BinBinPandaAI';
import { StudentLeaderboard } from './StudentLeaderboard';
import {
  getStoredAssignment,
  PRESET_ASSIGNMENT_BUOI_14,
  saveStoredAssignment,
  UploadedAssignmentPackage,
} from '../utils/assignmentParser';
import {
  ClassStudent,
  getStoredStudentRoster,
  STORAGE_KEY_STUDENTS,
} from './ClassroomManager';
import {
  applyStudentSubmissionToRoster,
  SMART_HANZI_DICTIONARY,
} from '../utils/chineseEngine';
import {
  calculateStudentHsk3Pillars,
  evaluateHsk3Translation,
  HSK3_TRANSLATION_CHALLENGES,
  Hsk3TranslationEvaluation,
} from '../utils/hsk3Engine';
import {
  applySrsRatingToRecords,
  evaluateSentenceBuilderOrder,
  getMistakeNotebookList,
  HSK3_SENTENCE_BUILDER_CHALLENGES,
  loadStoredSrsRecords,
  recordDailyWordReview,
  saveStoredSrsRecords,
  SentenceBuilderEvaluation,
  SrsWordRecord,
} from '../utils/hskStudyHelpers';
import {
  getClassroomDataMode,
  loadActiveClassroomSession,
  setActiveStudentStorageId,
} from '../utils/storageService';
import {
  auth,
  saveStudentSrsWordToFirestore,
  submitStudentAssignmentToFirestore,
} from '../firebase';
import { appStore, useAppStoreSelector } from '../context/AppStoreContext';
import {
  calculateArenaScoreBreakdown,
  computeRankFromRoster,
  LISTENING_CHALLENGES,
  SPEED_TEST_10_QUESTIONS,
} from './arena/arenaDataAndHelpers';
import { ArenaTopSummarySection } from './arena/ArenaTopSummarySection';
import { ArenaHomeworkPartAB } from './arena/ArenaHomeworkPartAB';
import { ArenaHomeworkPartCDE } from './arena/ArenaHomeworkPartCDE';
import { ArenaSentenceBuilderSection } from './arena/ArenaSentenceBuilderSection';
import { ArenaSpeedTestSection } from './arena/ArenaSpeedTestSection';

interface StudentAssignmentArenaProps {
  slides: VocabSlide[];
  studentName?: string;
  initialSection?: 'homework' | 'sentence-builder' | 'speedtest' | 'leaderboard';
  onSelectStudentName?: (name: string) => void;
  onSwitchToTeacherView?: () => void;
}

export const StudentAssignmentArena: React.FC<StudentAssignmentArenaProps> = ({
  slides,
  studentName = 'Học viên HSK',
  initialSection,
  onSelectStudentName,
}) => {
  const [roster, setRoster] = useState<ClassStudent[]>(() => getStoredStudentRoster());
  const [activeStudentName, setActiveStudentName] = useState<string>(studentName);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => getClassroomDataMode() === 'demo');

  const storeRevisions = useAppStoreSelector((s) => ({
    students: s.studentsRosterVersion,
    remote: s.syncStatus,
    mode: s.classroomMode,
    srs: s.srsVersion,
    latestAssignment: s.latestAssignment,
  }));

  useEffect(() => {
    setActiveStudentName(studentName);
  }, [studentName]);

  useEffect(() => {
    setRoster(getStoredStudentRoster());
    setIsDemoMode(getClassroomDataMode() === 'demo');
  }, [storeRevisions.students, storeRevisions.remote, storeRevisions.mode]);

  const effectiveRoster = useMemo<ClassStudent[]>(() => {
    if (roster.some((st) => st.name === activeStudentName)) return roster;
    return [
      {
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
      },
      ...roster,
    ];
  }, [roster, activeStudentName]);

  const [assignmentPackage, setAssignmentPackage] = useState<UploadedAssignmentPackage>(() =>
    getStoredAssignment()
  );

  useEffect(() => {
    if (storeRevisions.latestAssignment) {
      setAssignmentPackage(storeRevisions.latestAssignment);
    }
  }, [storeRevisions.latestAssignment]);

  const [mcAnswers, setMcAnswers] = useState<Record<string, string>>({});
  const [selectedTokensMap, setSelectedTokensMap] = useState<Record<string, string[]>>({});
  const [availableTokensMap, setAvailableTokensMap] = useState<Record<string, string[]>>({});
  const [revealedPinyinHints, setRevealedPinyinHints] = useState<Record<string, boolean>>({});
  const [essayAnswers, setEssayAnswers] = useState<Record<string, string>>({});
  const [listeningAnswers, setListeningAnswers] = useState<Record<string, string>>({});
  const [practicedChars, setPracticedChars] = useState<Record<string, number>>({ 温: 96, 暖: 95 });
  const [translationAnswers, setTranslationAnswers] = useState<Record<string, string>>({});
  const [translationEvaluations, setTranslationEvaluations] = useState<
    Record<string, Hsk3TranslationEvaluation>
  >({});
  const [partCSpeechScores, setPartCSpeechScores] = useState<Record<string, number>>({});
  const [srsRecords, setSrsRecords] = useState<Record<string, SrsWordRecord>>(() =>
    loadStoredSrsRecords(slides, activeStudentName)
  );

  useEffect(() => {
    setActiveStudentStorageId(activeStudentName);
    setSrsRecords(loadStoredSrsRecords(slides, activeStudentName));
  }, [slides, activeStudentName, storeRevisions.srs]);

  const srsMistakeWords = useMemo(() => getMistakeNotebookList(srsRecords), [srsRecords]);

  const [uploadedHomeworkFile, setUploadedHomeworkFile] = useState<File | null>(null);
  const [homeworkImagePreview, setHomeworkImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scorecardRef = useRef<HTMLDivElement>(null);

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

  const [sentenceBuilderSelectedIds, setSentenceBuilderSelectedIds] = useState<
    Record<string, string[]>
  >({});
  const [sentenceBuilderEvals, setSentenceBuilderEvals] = useState<
    Record<string, SentenceBuilderEvaluation>
  >({});
  const [showTilePinyin, setShowTilePinyin] = useState<boolean>(true);
  const [sentenceBuilderSyncBanner, setSentenceBuilderSyncBanner] = useState<string | null>(null);

  const [speedTestAnswers, setSpeedTestAnswers] = useState<Record<string, string>>({});
  const [isSpeedTestSubmitted, setIsSpeedTestSubmitted] = useState(false);
  const [speedTestScore, setSpeedTestScore] = useState<number>(0);
  const [speedTestSecondsLeft, setSpeedTestSecondsLeft] = useState<number>(15 * 60);
  const [isSpeedTestRunning, setIsSpeedTestRunning] = useState<boolean>(false);

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
      if (initialSection === 'speedtest' && !isSpeedTestSubmitted && !isSpeedTestRunning) {
        setIsSpeedTestRunning(true);
      }
    }
  }, [initialSection]);

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

  const syncMistakeWordsToSrsBook = (wrongHanzis: string[]) => {
    const cleanWords = Array.from(new Set(wrongHanzis.map((w) => w.trim()).filter(Boolean)));
    if (cleanWords.length === 0) return;

    let nextRecords = { ...srsRecords };
    cleanWords.forEach((word) => {
      const matchedSlide = slides.find((s) => s.hanzi === word || word.includes(s.hanzi));
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
    saveStoredSrsRecords(nextRecords, activeStudentName);
    if (getClassroomDataMode() !== 'demo' && auth.currentUser?.uid) {
      const uid = auth.currentUser.uid;
      Object.values(nextRecords).forEach((rec) => {
        void saveStudentSrsWordToFirestore(uid, rec.slideId, { ...rec, learned: false }).catch(() => {});
      });
    }
    appStore.notifySrsUpdated();
  };

  const handleAskBinBinAboutQuestion = (
    targetWord: string,
    questionText: string,
    explanationText = ''
  ) => {
    const cleanTarget = (targetWord || '温暖').trim();
    const prompt = `Giải thích câu hỏi bài tập về từ “${cleanTarget}”: ${questionText}${
      explanationText ? ` (${explanationText})` : ''
    }`;
    appStore.askBinBinQuestion({
      questionPrompt: prompt,
      explanation: explanationText || undefined,
    });
  };

  const breakdown = useMemo(
    () =>
      calculateArenaScoreBreakdown({
        assignmentPackage,
        mcAnswers,
        selectedTokensMap,
        essayAnswers,
        listeningAnswers,
        practicedChars,
        uploadedHomeworkFile,
      }),
    [
      assignmentPackage,
      mcAnswers,
      selectedTokensMap,
      essayAnswers,
      listeningAnswers,
      practicedChars,
      uploadedHomeworkFile,
    ]
  );

  const persistSubmissionToRoster = (params: {
    score: number;
    learnedVocab: number;
    totalVocab: number;
    writingAccuracy: number;
    quizCorrect: number;
    quizTotal: number;
    reviewWords: string[];
    elapsedSec: number;
    assignmentId: string;
    answersPayload: any;
  }) => {
    const currentRoster = getStoredStudentRoster();
    const updatedRoster = applyStudentSubmissionToRoster(currentRoster, {
      studentName: activeStudentName,
      totalScore: params.score,
      learnedVocabCount: params.learnedVocab,
      totalVocabCount: params.totalVocab,
      writingAccuracy: params.writingAccuracy,
      quizCorrectCount: params.quizCorrect,
      quizTotalCount: params.quizTotal,
      reviewWords: params.reviewWords,
      timeSeconds: params.elapsedSec,
      streakDelta: 1,
    });
    const matchedStudentRec = currentRoster.find(
      (s) => s.name.trim().toLowerCase() === activeStudentName.trim().toLowerCase()
    );
    const activeStudentId = matchedStudentRec?.studentCode || matchedStudentRec?.id || activeStudentName;
    try {
      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(updatedRoster));
      const activeSession = loadActiveClassroomSession();
      if (getClassroomDataMode() !== 'demo' && activeSession?.classId) {
        const studentUid = auth.currentUser?.uid || activeSession.uid || activeStudentId;
        void submitStudentAssignmentToFirestore({
          classId: activeSession.classId,
          studentUid,
          studentCode: activeSession.studentCode || matchedStudentRec?.studentCode || 'HV-001',
          studentName: activeStudentName,
          hskLevel: matchedStudentRec?.hskLevel || 'HSK 2',
          assignmentId: params.assignmentId,
          score: params.score,
          answers: params.answersPayload,
          learnedVocabCount: params.learnedVocab,
          totalVocabCount: params.totalVocab,
          writingAccuracy: params.writingAccuracy,
          quizCorrectCount: params.quizCorrect,
          quizTotalCount: params.quizTotal,
          reviewWords: params.reviewWords,
          timeSeconds: params.elapsedSec,
        }).catch(() => {});
      }
    } catch {
      // ignore
    }
    setRoster(updatedRoster);
    appStore.notifyStudentsUpdated(updatedRoster.length);
    recordDailyWordReview(`arena-${params.assignmentId}`, slides);
    return updatedRoster;
  };

  const handleSubmitAssignment = () => {
    setIsGrading(true);
    playGentleChime(523.25, 0.2);
    setTimeout(() => {
      setIsGrading(false);
      setIsSubmitted(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3500);

      const totalVocab = Math.max(18, slides.length);
      const learnedVocab = Math.max(12, Math.min(totalVocab, totalVocab - breakdown.reviewWords.length));
      const quizTotal =
        assignmentPackage.multipleChoiceList.length +
        assignmentPackage.sentenceOrderingList.length +
        assignmentPackage.essayList.length +
        LISTENING_CHALLENGES.length;
      const quizCorrect = Math.max(5, Math.min(quizTotal, Math.round((breakdown.totalScore / 100) * quizTotal)));

      if (breakdown.reviewWords.length > 0) syncMistakeWordsToSrsBook(breakdown.reviewWords);

      const elapsedSec = Math.max(
        16,
        Math.min(600, Math.round((Date.now() - homeworkStartTimeRef.current) / 1000) || 38)
      );
      setLastSubmittedTimeSeconds(elapsedSec);

      const combinedReviewWords = Array.from(
        new Set([...breakdown.reviewWords, ...srsMistakeWords.map((m) => m.hanzi)])
      );
      const updatedRoster = persistSubmissionToRoster({
        score: breakdown.totalScore,
        learnedVocab,
        totalVocab,
        writingAccuracy: breakdown.avgWritingAccuracy,
        quizCorrect,
        quizTotal,
        reviewWords: combinedReviewWords,
        elapsedSec,
        assignmentId: assignmentPackage.id || 'homework-hsk3',
        answersPayload: { mcAnswers, selectedTokensMap, essayAnswers, listeningAnswers, translationAnswers },
      });

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
      setPandaMood(breakdown.totalScore >= 80 ? 'cheering' : 'thinking');
      setTimeout(() => scorecardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }, 200);
  };

  const handleSubmitSpeedTest = () => {
    let correctCount = 0;
    const missedWords: string[] = [];
    SPEED_TEST_10_QUESTIONS.forEach((q) => {
      if (speedTestAnswers[q.id] === q.correctAnswer) correctCount += 1;
      else missedWords.push(q.targetWord);
    });
    const computedScore = Math.round((correctCount / SPEED_TEST_10_QUESTIONS.length) * 100);
    setSpeedTestScore(computedScore);
    setIsSpeedTestSubmitted(true);
    setIsSpeedTestRunning(false);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3500);
    if (missedWords.length > 0) syncMistakeWordsToSrsBook(missedWords);

    const elapsedSec = Math.max(
      18,
      Math.min(890, 15 * 60 - speedTestSecondsLeft > 5 ? 15 * 60 - speedTestSecondsLeft : 35)
    );
    setLastSubmittedTimeSeconds(elapsedSec);
    const combinedReviewWords = Array.from(new Set([...missedWords, ...srsMistakeWords.map((w) => w.hanzi)]));
    const totalVocab = Math.max(18, slides.length);
    const learnedVocab = Math.max(12, totalVocab - combinedReviewWords.length);

    const updatedRoster = persistSubmissionToRoster({
      score: computedScore,
      learnedVocab,
      totalVocab,
      writingAccuracy: 96,
      quizCorrect: correctCount,
      quizTotal: SPEED_TEST_10_QUESTIONS.length,
      reviewWords: combinedReviewWords,
      elapsedSec,
      assignmentId: 'speedtest-10',
      answersPayload: speedTestAnswers,
    });
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

  const hsk3Pillars = useMemo(() => {
    const learnedCount = slides.filter((s) => s.learned).length || 12;
    const completedTranslations = Object.values(translationEvaluations).filter((ev) => ev.passed).length;
    const submittedScore = isSpeedTestSubmitted ? speedTestScore : isSubmitted ? breakdown.totalScore : 0;
    return calculateStudentHsk3Pillars({
      learnedSlideCount: learnedCount,
      totalSlideCount: slides.length,
      writingAccuracyPct: breakdown.avgWritingAccuracy,
      completedTranslationCount: completedTranslations,
      practicedSpeechCount: Object.keys(partCSpeechScores).length,
      srsReviewedCount: Object.keys(srsRecords).length,
      practicedWritingCount: Object.keys(practicedChars).length,
      submittedQuizScore: submittedScore,
      completedSentenceCount: Object.values(sentenceBuilderEvals).filter((ev) => ev.isCorrect).length,
    });
  }, [
    slides,
    breakdown.avgWritingAccuracy,
    breakdown.totalScore,
    translationEvaluations,
    partCSpeechScores,
    srsRecords,
    practicedChars,
    sentenceBuilderEvals,
    isSubmitted,
    isSpeedTestSubmitted,
    speedTestScore,
  ]);

  return (
    <div className="space-y-6 pb-28 sm:pb-32 relative">
      <ArenaTopSummarySection
        showConfetti={showConfetti}
        assignmentPackage={assignmentPackage}
        activeStudentName={activeStudentName}
        isDemoMode={isDemoMode}
        effectiveRoster={effectiveRoster}
        onChangeActiveStudent={(nextName) => {
          setActiveStudentName(nextName);
          onSelectStudentName?.(nextName);
          setIsSubmitted(false);
          setIsSpeedTestSubmitted(false);
          setSyncedSubmissionSummary(null);
          homeworkStartTimeRef.current = Date.now();
        }}
        isListeningExamMode={isListeningExamMode}
        onToggleListeningExamMode={() => setIsListeningExamMode((v) => !v)}
        isSubmitted={isSubmitted}
        isSpeedTestSubmitted={isSpeedTestSubmitted}
        onQuickFillSampleAnswers={() => {
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
        }}
        hsk3Pillars={hsk3Pillars}
        srsMistakeWords={srsMistakeWords}
        isPillarsExpanded={isPillarsExpanded}
        onTogglePillarsExpanded={() => setIsPillarsExpanded((v) => !v)}
        activeSection={activeSection}
        onChangeSection={(sec) => {
          setActiveSection(sec);
          if (sec === 'speedtest' && !isSpeedTestSubmitted && !isSpeedTestRunning) {
            setIsSpeedTestRunning(true);
          }
        }}
        scorecardRef={scorecardRef}
        pandaMood={pandaMood}
        breakdown={breakdown}
        mcAnswersCount={Object.keys(mcAnswers).length}
        listeningAnswersCount={Object.keys(listeningAnswers).length}
        syncedSubmissionSummary={syncedSubmissionSummary}
        onResetAssignment={() => {
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
        }}
        showBinBinFeedbackModal={showBinBinFeedbackModal}
        onSetShowBinBinFeedbackModal={setShowBinBinFeedbackModal}
      />

      {activeSection === 'homework' && (
        <div className="space-y-6">
          <ArenaHomeworkPartAB
            assignmentPackage={assignmentPackage}
            mcAnswers={mcAnswers}
            onSelectMcAnswer={(qId, optKey, spoken) => {
              speakChinese(spoken);
              setMcAnswers((prev) => ({ ...prev, [qId]: optKey }));
            }}
            selectedTokensMap={selectedTokensMap}
            availableTokensMap={availableTokensMap}
            onPickToken={(qId, token, index) => {
              if (isSubmitted) return;
              speakChinese(token);
              setSelectedTokensMap((prev) => ({ ...prev, [qId]: [...(prev[qId] || []), token] }));
              setAvailableTokensMap((prev) => ({
                ...prev,
                [qId]: (prev[qId] || []).filter((_, i) => i !== index),
              }));
            }}
            onReturnToken={(qId, token, index) => {
              if (isSubmitted) return;
              setAvailableTokensMap((prev) => ({ ...prev, [qId]: [...(prev[qId] || []), token] }));
              setSelectedTokensMap((prev) => ({
                ...prev,
                [qId]: (prev[qId] || []).filter((_, i) => i !== index),
              }));
            }}
            revealedPinyinHints={revealedPinyinHints}
            onTogglePinyinHint={(qId) =>
              setRevealedPinyinHints((prev) => ({ ...prev, [qId]: !prev[qId] }))
            }
            isListeningExamMode={isListeningExamMode}
            isSubmitted={isSubmitted}
            onAskBinBinAboutQuestion={handleAskBinBinAboutQuestion}
            onLoadDefaultAssignment={() => {
              saveStoredAssignment(PRESET_ASSIGNMENT_BUOI_14);
              setAssignmentPackage(PRESET_ASSIGNMENT_BUOI_14);
            }}
          />

          {(assignmentPackage.multipleChoiceList.length +
            assignmentPackage.sentenceOrderingList.length +
            assignmentPackage.essayList.length >
            0) && (
            <ArenaHomeworkPartCDE
              assignmentPackage={assignmentPackage}
              essayAnswers={essayAnswers}
              onChangeEssayAnswer={(qId, val) => setEssayAnswers((prev) => ({ ...prev, [qId]: val }))}
              uploadedHomeworkFile={uploadedHomeworkFile}
              homeworkImagePreview={homeworkImagePreview}
              fileInputRef={fileInputRef}
              onPhotoUpload={(e) => {
                if (e.target.files?.[0]) {
                  const file = e.target.files[0];
                  setUploadedHomeworkFile(file);
                  if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setHomeworkImagePreview(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  } else {
                    setHomeworkImagePreview(null);
                  }
                  playGentleChime(659.25, 0.2);
                }
              }}
              partCSpeechScores={partCSpeechScores}
              onRecordSpeechScore={(qId, score) =>
                setPartCSpeechScores((prev) => ({ ...prev, [qId]: score }))
              }
              listeningAnswers={listeningAnswers}
              onSelectListeningAnswer={(lcId, opt) =>
                setListeningAnswers((prev) => ({ ...prev, [lcId]: opt }))
              }
              practicedChars={practicedChars}
              onPracticeChar={(ch) => setPracticedChars((prev) => ({ ...prev, [ch]: 97 }))}
              avgWritingAccuracy={breakdown.avgWritingAccuracy}
              translationAnswers={translationAnswers}
              onChangeTranslationAnswer={(trId, val) =>
                setTranslationAnswers((prev) => ({ ...prev, [trId]: val }))
              }
              translationEvaluations={translationEvaluations}
              onSetTranslationEvaluation={(trId, ev) =>
                setTranslationEvaluations((prev) => ({ ...prev, [trId]: ev }))
              }
              isSubmitted={isSubmitted}
              isGrading={isGrading}
              activeStudentName={activeStudentName}
              onSubmitAssignment={handleSubmitAssignment}
            />
          )}
        </div>
      )}

      {activeSection === 'sentence-builder' && (
        <ArenaSentenceBuilderSection
          sentenceBuilderSelectedIds={sentenceBuilderSelectedIds}
          onChangeSentenceBuilderSelectedIds={setSentenceBuilderSelectedIds}
          sentenceBuilderEvals={sentenceBuilderEvals}
          onChangeSentenceBuilderEvals={setSentenceBuilderEvals}
          showTilePinyin={showTilePinyin}
          onToggleShowTilePinyin={() => setShowTilePinyin((v) => !v)}
          sentenceBuilderSyncBanner={sentenceBuilderSyncBanner}
          onCheckAllSentenceBuilder={() => {
            const nextEval: Record<string, SentenceBuilderEvaluation> = {};
            let totalPoints = 0;
            HSK3_SENTENCE_BUILDER_CHALLENGES.forEach((ch) => {
              const sel = sentenceBuilderSelectedIds[ch.id] || [];
              const ev = evaluateSentenceBuilderOrder(sel, ch);
              nextEval[ch.id] = ev;
              totalPoints += ev.score;
            });
            setSentenceBuilderEvals(nextEval);
            const avgScore = Math.round(totalPoints / HSK3_SENTENCE_BUILDER_CHALLENGES.length);
            persistSubmissionToRoster({
              score: Math.max(85, avgScore),
              learnedVocab: Math.max(16, slides.length - 2),
              totalVocab: Math.max(18, slides.length),
              writingAccuracy: 95,
              quizCorrect: HSK3_SENTENCE_BUILDER_CHALLENGES.length,
              quizTotal: HSK3_SENTENCE_BUILDER_CHALLENGES.length,
              reviewWords: [],
              elapsedSec: 40,
              assignmentId: 'sentence-builder-hsk3',
              answersPayload: sentenceBuilderSelectedIds,
            });
            setSentenceBuilderSyncBanner(
              `✅ Đã chấm cấu trúc câu (${avgScore}/100đ) và đồng bộ điểm của học viên “${activeStudentName}”!`
            );
            playGentleChime(880, 0.25);
          }}
          onAskBinBinAboutQuestion={handleAskBinBinAboutQuestion}
        />
      )}

      {activeSection === 'speedtest' && (
        <ArenaSpeedTestSection
          speedTestSecondsLeft={speedTestSecondsLeft}
          isSpeedTestSubmitted={isSpeedTestSubmitted}
          speedTestScore={speedTestScore}
          activeStudentName={activeStudentName}
          speedTestAnswers={speedTestAnswers}
          onSelectSpeedTestAnswer={(qId, opt) =>
            setSpeedTestAnswers((prev) => ({ ...prev, [qId]: opt }))
          }
          isListeningExamMode={isListeningExamMode}
          onQuickFillSpeedTest={() => {
            const nextAns: Record<string, string> = {};
            SPEED_TEST_10_QUESTIONS.forEach((q) => {
              nextAns[q.id] = q.correctAnswer;
            });
            setSpeedTestAnswers(nextAns);
            playGentleChime(659.25, 0.18);
          }}
          onResetSpeedTest={() => {
            setSpeedTestAnswers({});
            setIsSpeedTestSubmitted(false);
            setSpeedTestSecondsLeft(15 * 60);
            setIsSpeedTestRunning(true);
          }}
          onSubmitSpeedTest={handleSubmitSpeedTest}
          onAskBinBinAboutQuestion={handleAskBinBinAboutQuestion}
        />
      )}

      {activeSection === 'leaderboard' && (
        <StudentLeaderboard
          currentStudentName={activeStudentName}
          currentStudentScore={isSpeedTestSubmitted ? speedTestScore : isSubmitted ? breakdown.totalScore : 0}
          currentStudentTimeSeconds={lastSubmittedTimeSeconds}
          currentStudentStreak={lastSubmittedStreak}
          hasSubmitted={isSubmitted || isSpeedTestSubmitted}
        />
      )}
    </div>
  );
};
