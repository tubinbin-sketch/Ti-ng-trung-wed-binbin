import React, { useState } from 'react';
import {
  Trophy,
  Sparkles,
  Volume2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Plus,
  ArrowRight,
} from 'lucide-react';
import {
  INITIAL_LEADERBOARD,
  LeaderboardEntry,
  MULTIPLE_CHOICE_ITEMS,
  MultipleChoiceQuizItem,
  SENTENCE_QUIZ_ITEMS,
  SentenceQuizItem,
  VocabSlide,
} from '../data/chineseData';
import {
  evaluateSentenceOrder,
  parseQuickSlideInput,
  shuffleTokensDeterministic,
  updateLeaderboardWithScore,
} from '../utils/chineseEngine';
import { playGentleChime, speakChinese } from '../utils/speech';
import { BinBinPandaAI, PandaMood } from './BinBinPandaAI';

interface QuizGameArenaProps {
  defaultStudentName?: string;
  activeSlide?: VocabSlide | null;
}

export const QuizGameArena: React.FC<QuizGameArenaProps> = ({
  defaultStudentName = 'Lưu Thị Minh Thư',
  activeSlide = null,
}) => {
  const [gameMode, setGameMode] = useState<'sentence' | 'multiple-choice'>('sentence');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [studentName, setStudentName] = useState(defaultStudentName);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(INITIAL_LEADERBOARD);
  const [pandaMood, setPandaMood] = useState<PandaMood>('idle');

  // Sentence game state
  const currentSentenceItem: SentenceQuizItem =
    SENTENCE_QUIZ_ITEMS[currentIdx % SENTENCE_QUIZ_ITEMS.length];

  const [availableTokens, setAvailableTokens] = useState<string[]>(() =>
    shuffleTokensDeterministic(SENTENCE_QUIZ_ITEMS[0].correctTokens, 1)
  );
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{
    status: 'idle' | 'correct' | 'wrong';
    message: string;
  }>({ status: 'idle', message: '' });

  // Multiple choice & Builder state
  const [mcItems, setMcItems] = useState<MultipleChoiceQuizItem[]>(MULTIPLE_CHOICE_ITEMS);
  const [activeMcIdx, setActiveMcIdx] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [newQuestionWord, setNewQuestionWord] = useState('');
  const [newQuestionMeaning, setNewQuestionMeaning] = useState('');
  const [newQuestionGrammar, setNewQuestionGrammar] = useState('');
  const [builderError, setBuilderError] = useState('');

  const loadSentenceQuestion = (nextIndex: number) => {
    const item = SENTENCE_QUIZ_ITEMS[nextIndex % SENTENCE_QUIZ_ITEMS.length];
    setCurrentIdx(nextIndex);
    setSelectedTokens([]);
    setAvailableTokens(shuffleTokensDeterministic(item.correctTokens, nextIndex + 1));
    setFeedback({ status: 'idle', message: '' });
  };

  const handlePickToken = (token: string, tokenIndex: number) => {
    setSelectedTokens((prev) => [...prev, token]);
    setAvailableTokens((prev) => prev.filter((_, idx) => idx !== tokenIndex));
    setFeedback({ status: 'idle', message: '' });
    speakChinese(token);
  };

  const handleReturnToken = (token: string, tokenIndex: number) => {
    setAvailableTokens((prev) => [...prev, token]);
    setSelectedTokens((prev) => prev.filter((_, idx) => idx !== tokenIndex));
    setFeedback({ status: 'idle', message: '' });
  };

  const handleSubmitSentence = () => {
    if (selectedTokens.length === 0) {
      setFeedback({
        status: 'wrong',
        message: 'Hãy bấm chọn các từ tiếng Trung bên dưới để ghép thành câu hoàn chỉnh.',
      });
      return;
    }

    const result = evaluateSentenceOrder(
      selectedTokens,
      currentSentenceItem.correctTokens
    );

    if (result.isCorrect) {
      playGentleChime(659.25, 0.22);
      speakChinese(currentSentenceItem.correctTokens.join(''));
      setPandaMood('cheering');
      setFeedback({
        status: 'correct',
        message: `Đúng rồi! +1 điểm · Gấu trúc Bin Bin khen bạn giỏi lắm! Đáp án chuẩn: ${currentSentenceItem.correctTokens.join(' ')}`,
      });
      setLeaderboard((prev) =>
        updateLeaderboardWithScore(prev, studentName, 1)
      );
    } else {
      playGentleChime(329.63, 0.18);
      setFeedback({
        status: 'wrong',
        message: `Chưa chính xác. Gợi ý phiên âm: ${currentSentenceItem.pinyinHint}`,
      });
    }
  };

  const handleAutoSolveDemo = () => {
    setSelectedTokens([...currentSentenceItem.correctTokens]);
    setAvailableTokens([]);
    speakChinese(currentSentenceItem.correctTokens.join(''));
    setPandaMood('cheering');
    setFeedback({
      status: 'correct',
      message: `Đúng rồi! +1 điểm · Đáp án chuẩn: ${currentSentenceItem.correctTokens.join(' ')}`,
    });
    setLeaderboard((prev) => updateLeaderboardWithScore(prev, studentName, 1));
  };

  const handleAddCustomMcQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionWord.trim() || !newQuestionMeaning.trim()) {
      setBuilderError('Vui lòng nhập cả từ tiếng Trung và nghĩa đúng.');
      return;
    }
    const parsedWord = parseQuickSlideInput(newQuestionWord.trim(), 99);
    const created: MultipleChoiceQuizItem = {
      id: `mc-custom-${Date.now()}`,
      question: `“${newQuestionWord.trim()}” nghĩa là gì?`,
      hanziFocus: newQuestionWord.trim(),
      pinyinFocus: parsedWord?.pinyin || newQuestionWord.trim(),
      options: [
        { id: 'a', text: newQuestionMeaning.trim(), isCorrect: true },
        { id: 'b', text: 'bận rộn, vội vàng', isCorrect: false },
        { id: 'c', text: 'thích thú, hào hứng', isCorrect: false },
        { id: 'd', text: 'cẩn thận, chu đáo', isCorrect: false },
      ],
      grammarRule:
        newQuestionGrammar.trim() ||
        parsedWord?.usageNote ||
        `Cấu trúc ứng dụng với ${newQuestionWord.trim()} trong HSK`,
      exampleSentence:
        parsedWord?.exampleHanzi || `${newQuestionWord.trim()} 是 重要 的 词语。`,
      exampleTranslation:
        parsedWord?.exampleMeaning ||
        `Ví dụ thực hành với từ “${newQuestionMeaning.trim()}”.`,
    };
    setMcItems((prev) => [...prev, created]);
    setActiveMcIdx(mcItems.length);
    setSelectedOptionId(null);
    setNewQuestionWord('');
    setNewQuestionMeaning('');
    setNewQuestionGrammar('');
    setBuilderError('');
    setPandaMood('cheering');
  };

  const currentMc = mcItems[activeMcIdx] || mcItems[0];
  const currentStudentScore =
    leaderboard.find(
      (e) => e.studentName.toLowerCase() === studentName.toLowerCase()
    )?.score ?? 2;

  return (
    <div className="rounded-3xl bg-[rgba(255,255,255,0.45)] backdrop-blur-md border border-[rgba(30,50,39,0.15)] text-[#1E3227] p-5 md:p-7 shadow-xs">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[rgba(30,50,39,0.15)]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setGameMode('sentence')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              gameMode === 'sentence'
                ? 'bg-[#1E3227] text-white'
                : 'bg-[#E7ECD9] text-[#3F5447] hover:bg-[#DCE3CA]'
            }`}
          >
            Game 1: Sắp xếp từ thành câu
          </button>
          <button
            type="button"
            onClick={() => setGameMode('multiple-choice')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              gameMode === 'multiple-choice'
                ? 'bg-[#1E3227] text-white'
                : 'bg-[#E7ECD9] text-[#3F5447] hover:bg-[#DCE3CA]'
            }`}
          >
            Game 2: Trắc nghiệm từ vựng &amp; Ngữ pháp ({mcItems.length} câu)
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-[#3F5447]">
            Học sinh đang thi:{' '}
            <strong className="text-[#1E3227]">{studentName}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-[#9B8A3E] tabular-nums">
            {currentStudentScore} điểm
          </span>
        </div>
      </div>

      {gameMode === 'sentence' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
          {/* Left: Interactive Sentence Rearrangement Card (matching 00:36-00:48 in video) */}
          <div className="lg:col-span-7 rounded-2xl bg-white border border-[#D5DEC7] p-6">
            <div className="flex items-center justify-between text-xs text-[#3F5447] mb-3">
              <span className="font-semibold text-[#1E3227]">
                Game 1: Sắp xếp câu · Câu {(currentIdx % SENTENCE_QUIZ_ITEMS.length) + 1}/{SENTENCE_QUIZ_ITEMS.length}
              </span>
              <span className="text-[#9B8A3E] font-medium">+1 điểm / câu đúng</span>
            </div>

            {/* Prompt Box */}
            <div className="rounded-2xl bg-[#FDF6F6] border border-[#F3D2D2] p-5 text-center">
              <p className="text-xs uppercase tracking-wider text-[#9B5151] font-semibold">
                Yêu cầu sắp xếp câu
              </p>
              <h4
                className="text-xl sm:text-2xl font-bold text-[#1E3227] mt-1"
                data-testid="sentence-quiz-prompt"
              >
                Sắp xếp thành “{currentSentenceItem.vietnamesePrompt}”
              </h4>
              <p className="text-xs text-[#6B7280] mt-1">
                {currentSentenceItem.grammarPoint}
              </p>
            </div>

            {/* Selected Answer Slot Area */}
            <div className="mt-5">
              <p className="text-xs text-[#3F5447] mb-2 text-center">
                Câu trả lời của bạn (bấm vào từ để bỏ chọn):
              </p>
              <div
                className="min-h-16 rounded-2xl bg-[#F4F6EE] border-2 border-dashed border-[#BFC8B0] p-3 flex flex-wrap items-center justify-center gap-2.5"
                data-testid="sentence-selected-slots"
              >
                {selectedTokens.length === 0 ? (
                  <span className="text-xs text-[#7B8B7F]">
                    Bấm các thẻ từ bên dưới theo đúng thứ tự ngữ pháp tiếng Trung...
                  </span>
                ) : (
                  selectedTokens.map((token, idx) => (
                    <button
                      key={`sel-${token}-${idx}`}
                      type="button"
                      onClick={() => handleReturnToken(token, idx)}
                      className="px-4 py-2 rounded-xl bg-[#4F46E5] text-white font-['Noto_Sans_SC'] text-base font-medium hover:bg-[#4338CA] transition-colors"
                    >
                      {token}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Word Bank Tiles */}
            <div className="mt-4">
              <p className="text-xs text-[#3F5447] mb-2 text-center">
                Bấm các từ bên dưới theo thứ tự:
              </p>
              <div
                className="flex flex-wrap items-center justify-center gap-2.5 min-h-12 rounded-xl bg-[#FAFBF7] border border-[#E5E9DC] p-2.5"
                data-testid="sentence-word-bank"
              >
                {availableTokens.length === 0 ? (
                  <span className="text-xs text-[#6B7280]">
                    Đã đưa hết từ lên khung trả lời — bấm “Trả lời” hoặc “Câu tiếp theo”.
                  </span>
                ) : (
                  availableTokens.map((token, idx) => (
                    <button
                      key={`avail-${token}-${idx}`}
                      type="button"
                      onClick={() => handlePickToken(token, idx)}
                      className="px-4 py-2 rounded-xl bg-white border-2 border-[#6366F1] text-[#312E81] font-['Noto_Sans_SC'] text-base font-medium hover:bg-[#EEF2FF] transition-colors"
                    >
                      {token}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Feedback Banner */}
            {feedback.status !== 'idle' && (
              <div
                className={`mt-5 p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium ${
                  feedback.status === 'correct'
                    ? 'bg-[#ECFDF5] border-[#6EE7B7] text-[#065F46]'
                    : 'bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]'
                }`}
                data-testid="sentence-quiz-feedback"
              >
                <div className="flex items-center gap-2">
                  {feedback.status === 'correct' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              </div>
            )}

            {/* Submit & Next Controls */}
            <div className="mt-5 pt-4 border-t border-[#E5E9DC] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadSentenceQuestion(currentIdx)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[#EEF1E6] text-[#3F5447] hover:bg-[#E1E7D4] transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Xếp lại
                </button>
                <button
                  type="button"
                  onClick={handleAutoSolveDemo}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[#F4EFE0] text-[#7D6B24] hover:bg-[#EAE1C8] transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Ghép mẫu đúng
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSubmitSentence}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#E05A47] hover:bg-[#C94A38] text-white transition-colors whitespace-nowrap"
                >
                  Trả lời
                </button>
                <button
                  type="button"
                  onClick={() => loadSentenceQuestion(currentIdx + 1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#1E3227] hover:bg-[#2B4637] text-white transition-colors whitespace-nowrap"
                >
                  Câu tiếp theo
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Live Leaderboard ("Bảng xếp hạng" matching 00:43 & 00:48 in video) */}
          <div className="lg:col-span-5 rounded-2xl bg-[#1E3227] text-[#F3F5EC] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#EAB308]" />
                <h4 className="text-base font-semibold">Bảng xếp hạng trực tuyến</h4>
              </div>
              <span className="text-xs text-[#CBCFB8] tabular-nums">
                {leaderboard.length} học sinh
              </span>
            </div>

            <div className="space-y-2.5" data-testid="quiz-leaderboard">
              {leaderboard.map((entry, idx) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border ${
                    idx === 0
                      ? 'bg-[#2B4637] border-[#9B8A3E]'
                      : 'bg-[#243B2E] border-[#355242]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-bold text-sm text-[#EAB308] tabular-nums">
                      #{idx + 1}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-[#9B8A3E] text-[#1E3227] flex items-center justify-center text-xs font-bold">
                      {entry.avatarCode}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">
                        {entry.studentName}
                      </div>
                      <div className="text-[11px] text-[#CBCFB8]">
                        Chuỗi đúng: {entry.streak} câu · {entry.timeSeconds}s
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-[#FDE68A] tabular-nums">
                      {entry.score}đ
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick student switcher */}
            <div className="mt-5 pt-4 border-t border-[#345040]">
              <label
                htmlFor="student-name-input"
                className="block text-xs text-[#CBCFB8] mb-1.5"
              >
                Đổi tên học sinh tham gia trả lời:
              </label>
              <input
                id="student-name-input"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#15241C] border border-[#3B5947] text-xs text-white focus:outline-none focus:border-[#9B8A3E]"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Mode 2: Multiple Choice & Teacher 1-Click Quiz Editor (matching 00:49-00:52 in video) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* Left: Playable Multiple Choice Card */}
          <div className="lg:col-span-7 rounded-2xl bg-white border border-[#D5DEC7] p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-[#3F5447]">
                Thẻ câu hỏi {activeMcIdx + 1} / {mcItems.length}
              </span>
              <div className="flex items-center gap-2">
                {mcItems.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveMcIdx(idx);
                      setSelectedOptionId(null);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                      idx === activeMcIdx
                        ? 'bg-[#1E3227] text-white'
                        : 'bg-[#EEF1E6] text-[#3F5447]'
                    }`}
                  >
                    Câu {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[#F4F6EE] border border-[#DCE2CE]">
              <div>
                <h4 className="text-xl font-bold text-[#1E3227]">
                  {currentMc.question}
                </h4>
                <p className="text-xs text-[#3F5447] mt-0.5">
                  Phiên âm: {currentMc.pinyinFocus}
                </p>
              </div>
              <button
                type="button"
                onClick={() => speakChinese(currentMc.hanziFocus)}
                aria-label={`Phát âm ${currentMc.hanziFocus}`}
                className="p-2.5 rounded-xl bg-[#1E3227] text-white hover:bg-[#2B4637]"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {/* 4 Options */}
            <div className="space-y-2.5 mt-4">
              {currentMc.options.map((opt) => {
                const isPicked = selectedOptionId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedOptionId(opt.id);
                      if (opt.isCorrect) {
                        playGentleChime(659.25, 0.2);
                        setPandaMood('cheering');
                        setLeaderboard((prev) =>
                          updateLeaderboardWithScore(prev, studentName, 1)
                        );
                      } else {
                        playGentleChime(311.13, 0.16);
                      }
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left text-sm font-medium transition-colors ${
                      isPicked
                        ? opt.isCorrect
                          ? 'bg-[#ECFDF5] border-[#10B981] text-[#065F46]'
                          : 'bg-[#FEF2F2] border-[#EF4444] text-[#991B1B]'
                        : 'bg-[#FAFBF7] border-[#D5DEC7] text-[#1E3227] hover:border-[#9B8A3E]'
                    }`}
                  >
                    <span>
                      <strong className="uppercase mr-2">{opt.id}.</strong>
                      {opt.text}
                    </span>
                    {isPicked && (
                      <span className="text-xs font-semibold">
                        {opt.isCorrect ? '✓ Đáp án đúng (+1đ)' : '✕ Chưa đúng'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Grammar & Example Notes (matching 00:50 in video) */}
            <div className="mt-5 rounded-xl bg-[#2E1A47] text-white p-4 space-y-2">
              <div className="text-xs font-semibold text-[#C4B5FD]">
                NGỮ PHÁP: {currentMc.grammarRule}
              </div>
              <div className="text-sm font-['Noto_Sans_SC']">
                Ví dụ: {currentMc.exampleSentence}
              </div>
              <div className="text-xs text-[#E9D5FF]">
                Dịch nghĩa: {currentMc.exampleTranslation}
              </div>
            </div>
          </div>

          {/* Right: 1-Click Teacher Question Creator ("Thêm hình / Thêm câu hỏi") */}
          <div className="lg:col-span-5 rounded-2xl bg-white border border-[#D5DEC7] p-6">
            <h4 className="text-base font-bold text-[#1E3227]">
              Soạn nhanh thẻ Quiz mới (Dành cho Giáo viên)
            </h4>
            <p className="text-xs text-[#3F5447] mt-1">
              Nhập từ vựng tiếng Trung để hệ thống tự động tạo phương án nhiễu và gắn ngữ pháp.
            </p>

            <form onSubmit={handleAddCustomMcQuestion} className="space-y-3.5 mt-4">
              <div>
                <label
                  htmlFor="mc-word-input"
                  className="block text-xs font-medium text-[#1E3227] mb-1"
                >
                  Từ vựng chữ Hán *
                </label>
                <input
                  id="mc-word-input"
                  type="text"
                  value={newQuestionWord}
                  onChange={(e) => setNewQuestionWord(e.target.value)}
                  placeholder="Ví dụ: 聪明 (cōngmíng)"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAFBF7] border border-[#C5CFB4] text-sm text-[#1E3227] focus:outline-none focus:border-[#1E3227]"
                />
              </div>

              <div>
                <label
                  htmlFor="mc-meaning-input"
                  className="block text-xs font-medium text-[#1E3227] mb-1"
                >
                  Đáp án nghĩa tiếng Việt đúng *
                </label>
                <input
                  id="mc-meaning-input"
                  type="text"
                  value={newQuestionMeaning}
                  onChange={(e) => setNewQuestionMeaning(e.target.value)}
                  placeholder="Ví dụ: thông minh, lanh lợi"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAFBF7] border border-[#C5CFB4] text-sm text-[#1E3227] focus:outline-none focus:border-[#1E3227]"
                />
              </div>

              <div>
                <label
                  htmlFor="mc-grammar-input"
                  className="block text-xs font-medium text-[#1E3227] mb-1"
                >
                  Ghi chú ngữ pháp / cấu trúc (Tùy chọn)
                </label>
                <input
                  id="mc-grammar-input"
                  type="text"
                  value={newQuestionGrammar}
                  onChange={(e) => setNewQuestionGrammar(e.target.value)}
                  placeholder="Ví dụ: 很 + Tính từ (rất thông minh)"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAFBF7] border border-[#C5CFB4] text-sm text-[#1E3227] focus:outline-none focus:border-[#1E3227]"
                />
              </div>

              {builderError && (
                <p className="text-xs text-[#DC2626] font-medium">{builderError}</p>
              )}

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3227] hover:bg-[#2B4637] text-white text-xs font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" />
                Tạo thẻ Quiz tự động
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Embedded Bin Bin (彬彬) Panda AI Tutor inside Student Quiz & Game Arena */}
      <div className="mt-6">
        <BinBinPandaAI
          variant="inline"
          activeSlide={activeSlide}
          quizContext={
            gameMode === 'sentence'
              ? {
                  prompt: `Sắp xếp câu: “${currentSentenceItem.vietnamesePrompt}”`,
                  grammarHint: currentSentenceItem.grammarPoint,
                  pinyinHint: currentSentenceItem.pinyinHint,
                }
              : {
                  prompt: currentMc.question,
                  grammarHint: currentMc.grammarRule,
                  pinyinHint: currentMc.pinyinFocus,
                }
          }
          externalMood={pandaMood}
          title="Hỏi Gấu trúc Bin Bin (彬彬) · Gợi ý Trò chơi & Sửa lỗi câu"
        />
      </div>
    </div>
  );
};
