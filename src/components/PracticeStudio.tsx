import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ListChecks, Puzzle } from 'lucide-react';
import type { VocabSlide } from '../data/chineseData';
import { appStore } from '../context/AppStoreContext';
import {
  evaluateSentenceBuilderOrder,
  HSK3_SENTENCE_BUILDER_CHALLENGES,
  type SentenceBuilderEvaluation,
} from '../utils/hskStudyHelpers';
import { playGentleChime } from '../utils/speech';
import { ArenaSentenceBuilderSection } from './arena/ArenaSentenceBuilderSection';
import { ArenaSpeedTestSection } from './arena/ArenaSpeedTestSection';
import { SPEED_TEST_10_QUESTIONS } from './arena/arenaDataAndHelpers';

type PracticeTab = 'ghep-cau' | 'trac-nghiem';

const TABS: { id: PracticeTab; label: string; icon: typeof Puzzle }[] = [
  { id: 'ghep-cau', label: 'Ghép câu', icon: Puzzle },
  { id: 'trac-nghiem', label: 'Trắc nghiệm nhanh', icon: ListChecks },
];

const QUIZ_SECONDS = 15 * 60;

/** Self-practice: nothing here is graded for the class or sent to the teacher. */
export const PracticeStudio: React.FC<{ slides: VocabSlide[]; studentName: string }> = ({
  slides,
  studentName,
}) => {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();
  const activeTab: PracticeTab = TABS.some((t) => t.id === tab) ? (tab as PracticeTab) : 'ghep-cau';

  // Sentence builder
  const [builderSelected, setBuilderSelected] = useState<Record<string, string[]>>({});
  const [builderEvals, setBuilderEvals] = useState<Record<string, SentenceBuilderEvaluation>>({});
  const [showTilePinyin, setShowTilePinyin] = useState(true);
  const [builderBanner, setBuilderBanner] = useState<string | null>(null);

  // Quick quiz
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(QUIZ_SECONDS);

  useEffect(() => {
    if (activeTab !== 'trac-nghiem' || quizSubmitted) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeTab, quizSubmitted]);

  const askBinBin = (targetWord: string, questionText: string, explanationText = '') =>
    appStore.askBinBinQuestion({
      questionPrompt: `Giải thích giúp mình${targetWord ? ` từ “${targetWord}” trong` : ''}: ${questionText}`,
      explanation: explanationText || undefined,
    });

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label="Kiểu luyện tập"
        className="flex items-end gap-1 border-b border-border overflow-x-auto no-scrollbar"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = t.id === activeTab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`practice-tab-${t.id}`}
              onClick={() => navigate(t.id === 'ghep-cau' ? '/luyen-tap' : `/luyen-tap/${t.id}`)}
              className={`inline-flex items-center gap-2 h-11 px-3 sm:px-4 -mb-px border-b-2 text-sm whitespace-nowrap transition-colors cursor-pointer ${
                active
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-ink-muted hover:text-ink font-medium'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'ghep-cau' && (
        <ArenaSentenceBuilderSection
          sentenceBuilderSelectedIds={builderSelected}
          onChangeSentenceBuilderSelectedIds={setBuilderSelected}
          sentenceBuilderEvals={builderEvals}
          onChangeSentenceBuilderEvals={setBuilderEvals}
          showTilePinyin={showTilePinyin}
          onToggleShowTilePinyin={() => setShowTilePinyin((v) => !v)}
          sentenceBuilderSyncBanner={builderBanner}
          onCheckAllSentenceBuilder={() => {
            const next: Record<string, SentenceBuilderEvaluation> = {};
            let correct = 0;
            HSK3_SENTENCE_BUILDER_CHALLENGES.forEach((ch) => {
              const ev = evaluateSentenceBuilderOrder(builderSelected[ch.id] || [], ch);
              next[ch.id] = ev;
              if (ev.isCorrect) correct += 1;
            });
            setBuilderEvals(next);
            setBuilderBanner(
              `Đúng ${correct}/${HSK3_SENTENCE_BUILDER_CHALLENGES.length} câu. Đây là bài tự luyện, không tính vào điểm lớp.`
            );
            playGentleChime(correct === HSK3_SENTENCE_BUILDER_CHALLENGES.length ? 880 : 587.33, 0.2);
          }}
          onAskBinBinAboutQuestion={askBinBin}
        />
      )}

      {activeTab === 'trac-nghiem' && (
        <ArenaSpeedTestSection
          speedTestSecondsLeft={secondsLeft}
          isSpeedTestSubmitted={quizSubmitted}
          speedTestScore={quizScore}
          activeStudentName={studentName}
          speedTestAnswers={quizAnswers}
          onSelectSpeedTestAnswer={(qId, opt) => {
            if (quizSubmitted) return;
            setQuizAnswers((prev) => ({ ...prev, [qId]: opt }));
          }}
          isListeningExamMode={false}
          onResetSpeedTest={() => {
            setQuizAnswers({});
            setQuizSubmitted(false);
            setQuizScore(0);
            setSecondsLeft(QUIZ_SECONDS);
          }}
          onSubmitSpeedTest={() => {
            const correct = SPEED_TEST_10_QUESTIONS.filter((q) => quizAnswers[q.id] === q.correctAnswer).length;
            setQuizScore(Math.round((correct / SPEED_TEST_10_QUESTIONS.length) * 100));
            setQuizSubmitted(true);
            playGentleChime(783.99, 0.25);
          }}
          onAskBinBinAboutQuestion={askBinBin}
        />
      )}
    </div>
  );
};
