import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { VocabSlide } from '../data/chineseData';
import { playGentleChime, speakChinese } from '../utils/speech';
import { StudentLeaderboard } from './StudentLeaderboard';
import {
  EMPTY_ASSIGNMENT,
  getStoredAssignment,
  hasAssignmentQuestions,
  UploadedAssignmentPackage,
} from '../utils/assignmentParser';
import { getStoredStudentRoster, STORAGE_KEY_STUDENTS } from './ClassroomManager';
import { applyStudentSubmissionToRoster, SMART_HANZI_DICTIONARY } from '../utils/chineseEngine';
import {
  applySrsRatingToRecords,
  loadStoredSrsRecords,
  recordDailyWordReview,
  saveStoredSrsRecords,
} from '../utils/hskStudyHelpers';
import { loadActiveClassroomSession, setActiveStudentStorageId } from '../utils/storageService';
import {
  auth,
  saveStudentSrsWordToFirestore,
  startStudentAssignmentOnServer,
  submitStudentAssignmentToFirestore,
} from '../firebase';
import { appStore, useAppStoreSelector } from '../context/AppStoreContext';
import { calculateArenaScoreBreakdown } from './arena/arenaDataAndHelpers';
import {
  ArenaAssignmentHeader,
  ArenaResultCard,
  type ArenaSubmissionResult,
} from './arena/ArenaAssignmentSummary';
import { ArenaHomeworkPartAB } from './arena/ArenaHomeworkPartAB';
import { ArenaHomeworkPartC } from './arena/ArenaHomeworkPartC';
import { EmptyState } from './ui/EmptyState';

interface StudentAssignmentArenaProps {
  slides: VocabSlide[];
  studentName?: string;
  initialSection?: 'homework' | 'leaderboard';
  onSelectStudentName?: (name: string) => void;
  onSwitchToTeacherView?: () => void;
}

function initialTokenMaps(pkg: UploadedAssignmentPackage) {
  const selected: Record<string, string[]> = {};
  const available: Record<string, string[]> = {};
  pkg.sentenceOrderingList.forEach((q) => {
    selected[q.id] = [];
    available[q.id] = [...q.tokensShuffled];
  });
  return { selected, available };
}

export const StudentAssignmentArena: React.FC<StudentAssignmentArenaProps> = ({
  slides,
  studentName = 'Học viên',
  initialSection,
}) => {
  const navigate = useNavigate();
  const latestAssignment = useAppStoreSelector((s) => s.latestAssignment);

  const [assignmentPackage, setAssignmentPackage] = useState<UploadedAssignmentPackage>(() =>
    getStoredAssignment()
  );
  useEffect(() => {
    if (latestAssignment) {
      setAssignmentPackage(hasAssignmentQuestions(latestAssignment) ? latestAssignment : EMPTY_ASSIGNMENT);
    }
  }, [latestAssignment]);

  const [mcAnswers, setMcAnswers] = useState<Record<string, string>>({});
  const [selectedTokensMap, setSelectedTokensMap] = useState<Record<string, string[]>>({});
  const [availableTokensMap, setAvailableTokensMap] = useState<Record<string, string[]>>({});
  const [revealedPinyinHints, setRevealedPinyinHints] = useState<Record<string, boolean>>({});
  const [essayAnswers, setEssayAnswers] = useState<Record<string, string>>({});
  const [uploadedHomeworkFile, setUploadedHomeworkFile] = useState<File | null>(null);
  const [homeworkImagePreview, setHomeworkImagePreview] = useState<string | null>(null);
  const [isListeningExamMode, setIsListeningExamMode] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [result, setResult] = useState<ArenaSubmissionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    setActiveStudentStorageId(studentName);
  }, [studentName]);

  const resetAnswers = (pkg: UploadedAssignmentPackage) => {
    const { selected, available } = initialTokenMaps(pkg);
    setSelectedTokensMap(selected);
    setAvailableTokensMap(available);
    setMcAnswers({});
    setEssayAnswers({});
    setRevealedPinyinHints({});
    setUploadedHomeworkFile(null);
    setHomeworkImagePreview(null);
    setIsSubmitted(false);
    setResult(null);
    startTimeRef.current = Date.now();
  };

  useEffect(() => {
    resetAnswers(assignmentPackage);
    const session = loadActiveClassroomSession();
    if (session?.classId && assignmentPackage.id && hasAssignmentQuestions(assignmentPackage)) {
      void startStudentAssignmentOnServer({
        classId: session.classId,
        assignmentId: assignmentPackage.id,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentPackage.id]);

  const breakdown = useMemo(
    () =>
      calculateArenaScoreBreakdown({
        assignmentPackage,
        mcAnswers,
        selectedTokensMap,
        essayAnswers,
      }),
    [assignmentPackage, mcAnswers, selectedTokensMap, essayAnswers]
  );

  const addWordsToMistakeBook = (words: string[]) => {
    const clean = Array.from(new Set(words.map((w) => w.trim()).filter(Boolean)));
    if (clean.length === 0) return;
    let records = loadStoredSrsRecords(slides, studentName);
    clean.forEach((word) => {
      const matched = slides.find((s) => s.hanzi === word);
      const dict = SMART_HANZI_DICTIONARY[word];
      const slide: VocabSlide = matched || {
        id: `mistake-${word}`,
        index: slides.length + 1,
        hanzi: word,
        pinyin: dict?.pinyin || '',
        hanViet: dict?.hanViet || '',
        meaning: dict?.meaning || '',
        partOfSpeech: dict?.partOfSpeech || '',
        hskLevel: dict?.hskLevel || '',
        usageNote: '',
        exampleHanzi: dict?.exampleHanzi || '',
        examplePinyin: dict?.examplePinyin || '',
        exampleMeaning: dict?.exampleMeaning || '',
        illustrationKey: 'school',
        learned: false,
        characters: [],
      };
      records = applySrsRatingToRecords(records, slide, 'hard');
    });
    saveStoredSrsRecords(records, studentName);
    const uid = auth.currentUser?.uid;
    if (uid) {
      Object.values(records).forEach((rec) => {
        void saveStudentSrsWordToFirestore(uid, rec.slideId, { ...rec, learned: false }).catch(() => {});
      });
    }
    appStore.notifySrsUpdated();
  };

  const saveToLocalRoster = (score: number, correct: number, total: number, reviewWords: string[], seconds: number) => {
    const roster = applyStudentSubmissionToRoster(getStoredStudentRoster(), {
      studentName,
      totalScore: score,
      learnedVocabCount: slides.filter((s) => s.learned).length,
      totalVocabCount: slides.length,
      writingAccuracy: 0,
      quizCorrectCount: correct,
      quizTotalCount: total,
      reviewWords,
      timeSeconds: seconds,
      streakDelta: 0,
    });
    try {
      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(roster));
    } catch {
      // storage full: the server copy is still authoritative
    }
    appStore.notifyStudentsUpdated(roster.length);
  };

  const handleSubmitAssignment = () => {
    if (isGrading) return;
    setIsGrading(true);
    const seconds = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    const session = loadActiveClassroomSession();
    const answersPayload = { mcAnswers, selectedTokensMap, essayAnswers };
    const local: ArenaSubmissionResult = breakdown.canGradeLocally
      ? {
          score: breakdown.totalScore,
          correctCount: breakdown.correctCount,
          totalQuestions: breakdown.questionCount,
          reviewWords: breakdown.reviewWords,
          source: 'local',
        }
      : {
          score: null,
          correctCount: null,
          totalQuestions: breakdown.questionCount,
          reviewWords: [],
          source: 'pending',
        };

    setIsSubmitted(true);
    setResult(local);
    if (local.source === 'local') {
      addWordsToMistakeBook(local.reviewWords);
      saveToLocalRoster(local.score ?? 0, local.correctCount ?? 0, local.totalQuestions, local.reviewWords, seconds);
    }
    recordDailyWordReview(`assignment-${assignmentPackage.id}`, slides);
    playGentleChime(659.25, 0.2);
    setTimeout(() => resultRef.current?.focus({ preventScroll: false }), 60);

    if (!session?.classId) {
      setIsGrading(false);
      return;
    }
    const roster = getStoredStudentRoster();
    const me = roster.find((s) => s.name.trim().toLowerCase() === studentName.trim().toLowerCase());
    submitStudentAssignmentToFirestore({
      classId: session.classId,
      studentUid: auth.currentUser?.uid || session.uid,
      studentCode: session.studentCode || me?.studentCode || '',
      studentName,
      hskLevel: me?.hskLevel || '',
      assignmentId: assignmentPackage.id,
      score: breakdown.totalScore,
      answers: answersPayload,
      quizCorrectCount: breakdown.correctCount,
      quizTotalCount: breakdown.questionCount,
      reviewWords: breakdown.reviewWords,
    })
      .then((res) => {
        const reviewWords = res.reviewWords.length > 0 ? res.reviewWords : local.reviewWords;
        setResult({
          score: res.score,
          correctCount: res.correctCount ?? null,
          totalQuestions: res.totalQuestions || breakdown.questionCount,
          reviewWords,
          source: 'server',
        });
        if (local.source !== 'local') addWordsToMistakeBook(reviewWords);
        saveToLocalRoster(
          res.score,
          res.correctCount ?? 0,
          res.totalQuestions || breakdown.questionCount,
          reviewWords,
          res.timeSeconds || seconds
        );
      })
      .catch((err: unknown) => {
        setResult((prev) => ({
          ...(prev || local),
          error:
            err instanceof Error && err.message
              ? `${err.message} Bài làm vẫn được giữ, bấm "Gửi lại bài" khi có mạng.`
              : 'Chưa gửi được bài lên máy chủ. Kiểm tra mạng rồi bấm "Gửi lại bài".',
        }));
      })
      .finally(() => setIsGrading(false));
  };

  const handleAskBinBinAboutQuestion = (targetWord: string, questionText: string, explanationText = '') => {
    const target = (targetWord || '').trim();
    appStore.askBinBinQuestion({
      questionPrompt: `Giải thích câu hỏi bài tập${target ? ` về từ “${target}”` : ''}: ${questionText}${
        explanationText ? ` (${explanationText})` : ''
      }`,
      explanation: explanationText || undefined,
    });
  };

  if (initialSection === 'leaderboard') {
    return (
      <StudentLeaderboard
        currentStudentName={studentName}
        currentStudentScore={result?.score ?? 0}
        hasSubmitted={isSubmitted && result?.score !== null}
      />
    );
  }

  if (!hasAssignmentQuestions(assignmentPackage)) {
    return (
      <EmptyState
        testId="empty-state-zero-assignments"
        icon={<ClipboardList aria-hidden="true" />}
        title="Chưa có bài tập nào"
        description="Khi giáo viên giao bài cho lớp, bài sẽ hiện ở đây. Trong lúc chờ, bạn có thể luyện nói theo câu hoặc ôn từ vựng."
        actionLabel="Luyện Shadowing"
        onAction={() => navigate('/shadowing')}
        secondaryActionLabel="Ôn Flashcard"
        onSecondaryAction={() => navigate('/flashcard')}
      />
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <ArenaAssignmentHeader
        assignmentPackage={assignmentPackage}
        isListeningExamMode={isListeningExamMode}
        onToggleListeningExamMode={() => setIsListeningExamMode((v) => !v)}
      />

      {result && (
        <ArenaResultCard
          result={result}
          resultRef={resultRef}
          onRetry={() => resetAnswers(assignmentPackage)}
          onResubmit={handleSubmitAssignment}
          onOpenLeaderboard={() => navigate('/bai-tap/leaderboard')}
          onAskBinBin={() =>
            appStore.askBinBinQuestion({
              questionPrompt: `Mình vừa làm bài "${assignmentPackage.sessionTitle}"${
                result.score !== null ? ` được ${result.score}/100 điểm` : ''
              }.${
                result.reviewWords.length ? ` Các từ còn sai: ${result.reviewWords.join(', ')}.` : ''
              } Bạn giúp mình ôn lại nhé.`,
            })
          }
        />
      )}

      <ArenaHomeworkPartAB
        assignmentPackage={assignmentPackage}
        mcAnswers={mcAnswers}
        onSelectMcAnswer={(qId, optKey, spoken) => {
          if (isSubmitted) return;
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
        onTogglePinyinHint={(qId) => setRevealedPinyinHints((prev) => ({ ...prev, [qId]: !prev[qId] }))}
        isListeningExamMode={isListeningExamMode}
        isSubmitted={isSubmitted}
        onAskBinBinAboutQuestion={handleAskBinBinAboutQuestion}
      />

      <ArenaHomeworkPartC
        assignmentPackage={assignmentPackage}
        essayAnswers={essayAnswers}
        onChangeEssayAnswer={(qId, val) => setEssayAnswers((prev) => ({ ...prev, [qId]: val }))}
        uploadedHomeworkFile={uploadedHomeworkFile}
        homeworkImagePreview={homeworkImagePreview}
        fileInputRef={fileInputRef}
        onPhotoUpload={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUploadedHomeworkFile(file);
          const reader = new FileReader();
          reader.onload = (ev) => setHomeworkImagePreview(String(ev.target?.result || ''));
          reader.readAsDataURL(file);
        }}
        answeredCount={breakdown.answeredCount}
        totalCount={breakdown.questionCount}
        isSubmitted={isSubmitted}
        isGrading={isGrading}
        onSubmitAssignment={handleSubmitAssignment}
      />
    </div>
  );
};
