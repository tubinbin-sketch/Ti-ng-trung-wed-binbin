import React from 'react';
import { AlertCircle, BookOpen, CheckCircle2, Headphones, Sparkles, Volume2 } from 'lucide-react';
import { UploadedAssignmentPackage } from '../../utils/assignmentParser';
import { speakChinese } from '../../utils/speech';
import { EmptyState } from '../ui/EmptyState';

interface ArenaHomeworkPartABProps {
  assignmentPackage: UploadedAssignmentPackage;
  mcAnswers: Record<string, string>;
  onSelectMcAnswer: (questionId: string, optionKey: string, spokenLabel: string) => void;
  selectedTokensMap: Record<string, string[]>;
  availableTokensMap: Record<string, string[]>;
  onPickToken: (qId: string, token: string, index: number) => void;
  onReturnToken: (qId: string, token: string, index: number) => void;
  revealedPinyinHints: Record<string, boolean>;
  onTogglePinyinHint: (qId: string) => void;
  isListeningExamMode: boolean;
  isSubmitted: boolean;
  onAskBinBinAboutQuestion: (targetWord: string, questionText: string, explanationText?: string) => void;
  onLoadDefaultAssignment: () => void;
}

export const ArenaHomeworkPartAB: React.FC<ArenaHomeworkPartABProps> = ({
  assignmentPackage,
  mcAnswers,
  onSelectMcAnswer,
  selectedTokensMap,
  availableTokensMap,
  onPickToken,
  onReturnToken,
  revealedPinyinHints,
  onTogglePinyinHint,
  isListeningExamMode,
  isSubmitted,
  onAskBinBinAboutQuestion,
  onLoadDefaultAssignment,
}) => {
  const totalQuestionsCount =
    assignmentPackage.multipleChoiceList.length +
    assignmentPackage.sentenceOrderingList.length +
    assignmentPackage.essayList.length;

  if (totalQuestionsCount === 0) {
    return (
      <EmptyState
        testId="empty-state-zero-assignments"
        icon={<BookOpen className="w-7 h-7" />}
        title="Chưa có bài tập nào được giao"
        description="Hiện tại lớp học chưa có phiếu bài tập mới hoặc gói đề đang trống. Bạn có thể nạp bộ đề ôn tập chuẩn HSK 1–3 Buổi 14 để luyện tập ngay."
        actionLabel="Nạp đề chuẩn Buổi 14 (HSK 1–3)"
        onAction={onLoadDefaultAssignment}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* SECTION A: TRẮC NGHIỆM TỪ VỰNG & NGỮ CẢNH (30 ĐIỂM) */}
      <div className="rounded-2xl bg-surface/90 border border-border shadow-2xs p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-primary text-white text-xs font-bold flex items-center justify-center">
              A
            </span>
            <h3 className="text-sm sm:text-base font-bold text-ink">
              Phần A · Trắc Nghiệm Từ Vựng &amp; Ngữ Cảnh ({assignmentPackage.multipleChoiceList.length} câu · 30 điểm)
            </h3>
          </div>
          <span className="text-xs text-gold font-semibold">10 điểm / câu</span>
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
                className="rounded-2xl bg-canvas border border-border p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-full">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                        Câu {idx + 1}
                      </span>
                      <button
                        type="button"
                        data-testid={`part-a-listen-btn-${q.id}`}
                        onClick={() => speakChinese(fullSpokenSentence)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-gold" />
                        <span>🔊 Nghe câu (<span lang="zh-CN">听力</span>)</span>
                      </button>
                    </div>

                    {isListeningExamMode && !isSubmitted ? (
                      <div
                        data-testid={`part-a-listening-mask-${q.id}`}
                        className="mt-2 p-3 rounded-xl bg-surface border border-dashed border-primary/35 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="text-xs font-bold text-ink flex items-center gap-2">
                          <Headphones className="w-4 h-4 text-accent shrink-0" />
                          <span>
                            🎧 Chế độ Nghe hiểu HSK (<span lang="zh-CN">听力</span>): Đang ẩn chữ Hán gốc — Hãy bấm{' '}
                            <strong>&ldquo;🔊 Nghe câu&rdquo;</strong> để chọn đáp án đúng!
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h4
                          lang="zh-CN"
                          className="text-sm sm:text-base font-bold text-ink mt-1.5 font-['Noto_Sans_SC']"
                        >
                          {q.question}
                        </h4>
                        {q.pinyinSentence && (
                          <p className="text-xs text-gold font-medium mt-1">
                            {q.pinyinSentence}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options.map((opt) => {
                    const isChosen = userChoice === opt.key;
                    let optionStyle =
                      'bg-surface border-border text-ink hover:border-gold';

                    if (isSubmitted) {
                      if (opt.isCorrect) {
                        optionStyle =
                          'bg-primary border-gold text-white font-bold tactile-pill-correct';
                      } else if (isChosen && !opt.isCorrect) {
                        optionStyle =
                          'bg-accent border-accent text-white font-bold tactile-pill-wrong';
                      } else {
                        optionStyle = 'bg-surface/60 opacity-60 border-border text-ink-muted';
                      }
                    } else if (isChosen) {
                      optionStyle = 'bg-primary border-gold text-white font-semibold';
                    }

                    return (
                      <button
                        key={opt.key}
                        type="button"
                        disabled={isSubmitted}
                        onClick={() => onSelectMcAnswer(q.id, opt.key, opt.label)}
                        className={`p-3 rounded-2xl border text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${optionStyle}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                              isChosen || (isSubmitted && opt.isCorrect)
                                ? 'bg-white/20 text-white border border-white/40'
                                : 'bg-primary/10 text-primary'
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span lang="zh-CN" className="truncate font-['Noto_Sans_SC'] text-sm">
                            {opt.label}
                          </span>
                        </div>

                        {isSubmitted && opt.isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
                        )}
                        {isSubmitted && isChosen && !opt.isCorrect && (
                          <AlertCircle className="w-4 h-4 text-white shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {isSubmitted && (
                  <div
                    className={`p-3.5 rounded-xl text-xs space-y-2 ${
                      isCorrect
                        ? 'bg-success/10 text-ink border border-success/30'
                        : 'bg-danger/10 text-ink border border-danger/30'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold">
                        {isCorrect ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            <span>Đáp án chính xác! (+10 điểm)</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-danger" />
                            <span>
                              Chưa chính xác (0/10 điểm) — Bạn đã chọn {userChoice || 'trống'} · Đã lưu từ &ldquo;<span lang="zh-CN">{q.targetWord}</span>&rdquo; vào 📓 Sổ từ khó.
                            </span>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        data-testid={`ask-binbin-mc-${q.id}`}
                        onClick={() =>
                          onAskBinBinAboutQuestion(q.targetWord, q.question, q.explanation)
                        }
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary text-white text-xs font-bold border border-gold/60 cursor-pointer"
                      >
                        <span>🐼 Hỏi 彬彬 câu này</span>
                      </button>
                    </div>
                    <div className="text-sm">
                      <strong>Giải thích chuẩn xác:</strong> {q.explanation}
                    </div>
                    {q.grammarTip && (
                      <div className="text-xs pt-1 border-t border-border flex items-start gap-1">
                        <Sparkles className="w-3.5 h-3.5 shrink-0 text-gold mt-0.5" />
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

      {/* SECTION B: SẮP XẾP CÂU TIẾNG TRUNG (40 ĐIỂM) */}
      <div className="rounded-2xl bg-surface/90 border border-border shadow-2xs p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-accent text-white text-xs font-bold flex items-center justify-center">
              B
            </span>
            <h3 className="text-sm sm:text-base font-bold text-ink">
              Phần B · Sắp Xếp Câu Tiếng Trung ({assignmentPackage.sentenceOrderingList.length} câu · 40 điểm)
            </h3>
          </div>
          <span className="text-xs text-gold font-semibold">20 điểm / câu</span>
        </div>

        <div className="space-y-4">
          {assignmentPackage.sentenceOrderingList.map((q, idx) => {
            const userTokens = selectedTokensMap[q.id] || [];
            const remainingTokens = availableTokensMap[q.id] || [];
            const isCorrect = userTokens.join('') === q.correctTokens.join('');

            return (
              <div
                key={q.id}
                className="rounded-2xl bg-canvas border border-border p-4 sm:p-5 space-y-3.5"
              >
                <div>
                  <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                    Câu {idx + 1}
                  </span>
                  <h4 className="text-sm font-bold text-ink mt-1">
                    Dịch nghĩa cần sắp xếp: &ldquo;{q.vietnameseMeaning}&rdquo;
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {(isSubmitted || revealedPinyinHints[q.id]) && (
                      <p
                        data-testid={`part-b-pinyin-${q.id}`}
                        className="text-xs text-gold font-medium"
                      >
                        {q.pinyin}
                      </p>
                    )}
                    {!isSubmitted && (
                      <button
                        type="button"
                        data-testid={`toggle-pinyin-hint-${q.id}`}
                        onClick={() => onTogglePinyinHint(q.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary/10 hover:bg-primary/15 border border-primary/20 text-xs font-bold text-primary transition-all cursor-pointer"
                      >
                        <span>
                          {revealedPinyinHints[q.id] ? '🙈 Ẩn gợi ý Pinyin' : '💡 Xem gợi ý Pinyin'}
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => speakChinese(q.correctTokens.join(''))}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-surface border border-border text-xs font-semibold text-ink hover:border-gold transition-all cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5 inline text-gold" />
                      <span>Nghe câu</span>
                    </button>
                  </div>
                </div>

                <div
                  className={`min-h-[58px] p-2.5 rounded-2xl bg-surface border-2 border-dashed flex flex-wrap items-center gap-2 transition-all ${
                    isSubmitted
                      ? isCorrect
                        ? 'border-primary tactile-pill-correct'
                        : 'border-accent tactile-pill-wrong'
                      : 'border-border'
                  }`}
                >
                  {userTokens.length === 0 ? (
                    <span className="text-xs text-ink-muted italic pl-1">
                      Bấm vào các thẻ từ bên dưới theo thứ tự đúng để ghép câu...
                    </span>
                  ) : (
                    userTokens.map((tok, tIdx) => (
                      <button
                        key={`${tok}-${tIdx}`}
                        type="button"
                        disabled={isSubmitted}
                        onClick={() => onReturnToken(q.id, tok, tIdx)}
                        className="px-3.5 py-1.5 rounded-xl bg-primary text-white font-['Noto_Sans_SC'] font-bold text-sm border border-gold/50 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span lang="zh-CN">{tok}</span>
                        {!isSubmitted && <span className="text-white/70 text-xs">×</span>}
                      </button>
                    ))
                  )}
                </div>

                {!isSubmitted && (
                  <div>
                    <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
                      Ngân hàng từ vựng (Bấm để chọn):
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {remainingTokens.map((tok, tIdx) => (
                        <button
                          key={`${tok}-${tIdx}`}
                          type="button"
                          onClick={() => onPickToken(q.id, tok, tIdx)}
                          className="px-3.5 py-1.5 rounded-xl bg-surface border border-border text-ink font-['Noto_Sans_SC'] font-bold text-sm hover:border-primary transition-all cursor-pointer"
                        >
                          <span lang="zh-CN">{tok}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isSubmitted && (
                  <div
                    className={`p-3.5 rounded-xl text-xs space-y-2 ${
                      isCorrect
                        ? 'bg-success/10 text-ink border border-success/30'
                        : 'bg-danger/10 text-ink border border-danger/30'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold">
                        {isCorrect ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            <span>Chính xác hoàn hảo! (+20 điểm)</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-danger" />
                            <span>Chưa chính xác (0/20 điểm)</span>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        data-testid={`ask-binbin-so-${q.id}`}
                        onClick={() =>
                          onAskBinBinAboutQuestion(
                            q.correctTokens[0] || '温暖',
                            q.correctTokens.join(''),
                            q.explanation
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary text-white text-xs font-bold border border-gold/60 cursor-pointer"
                      >
                        <span>🐼 Hỏi 彬彬 câu này</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span>Đáp án chuẩn:</span>
                      <strong lang="zh-CN" className="font-['Noto_Sans_SC'] text-sm text-ink">
                        {q.correctTokens.join(' ')}
                      </strong>
                      <button
                        type="button"
                        aria-label="Nghe đáp án chuẩn"
                        onClick={() => speakChinese(q.correctTokens.join(''))}
                        className="p-1 rounded-md bg-surface text-ink cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-sm leading-relaxed">{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
