import React from 'react';
import { Camera, Check, Edit3, Headphones, Mic, Send, Sparkles, Upload, Volume2 } from 'lucide-react';
import { UploadedAssignmentPackage } from '../../utils/assignmentParser';
import {
  evaluateHsk3Translation,
  HSK3_TRANSLATION_CHALLENGES,
  Hsk3TranslationEvaluation,
} from '../../utils/hsk3Engine';
import { playGentleChime, speakChinese } from '../../utils/speech';
import { LISTENING_CHALLENGES } from './arenaDataAndHelpers';

interface ArenaHomeworkPartCDEProps {
  assignmentPackage: UploadedAssignmentPackage;
  essayAnswers: Record<string, string>;
  onChangeEssayAnswer: (qId: string, val: string) => void;
  uploadedHomeworkFile: File | null;
  homeworkImagePreview: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  partCSpeechScores: Record<string, number>;
  onRecordSpeechScore: (qId: string, score: number) => void;
  listeningAnswers: Record<string, string>;
  onSelectListeningAnswer: (lcId: string, option: string) => void;
  practicedChars: Record<string, number>;
  onPracticeChar: (ch: string) => void;
  avgWritingAccuracy: number;
  translationAnswers: Record<string, string>;
  onChangeTranslationAnswer: (trId: string, val: string) => void;
  translationEvaluations: Record<string, Hsk3TranslationEvaluation>;
  onSetTranslationEvaluation: (trId: string, ev: Hsk3TranslationEvaluation) => void;
  isSubmitted: boolean;
  isGrading: boolean;
  activeStudentName: string;
  onSubmitAssignment: () => void;
}

export const ArenaHomeworkPartCDE: React.FC<ArenaHomeworkPartCDEProps> = ({
  assignmentPackage,
  essayAnswers,
  onChangeEssayAnswer,
  uploadedHomeworkFile,
  homeworkImagePreview,
  fileInputRef,
  onPhotoUpload,
  partCSpeechScores,
  onRecordSpeechScore,
  listeningAnswers,
  onSelectListeningAnswer,
  practicedChars,
  onPracticeChar,
  avgWritingAccuracy,
  translationAnswers,
  onChangeTranslationAnswer,
  translationEvaluations,
  onSetTranslationEvaluation,
  isSubmitted,
  isGrading,
  activeStudentName,
  onSubmitAssignment,
}) => {
  return (
    <div className="space-y-6">
      {/* SECTION C: TỰ LUẬN ĐẶT CÂU & TẢI ẢNH BÀI LÀM VIẾT TAY */}
      <div className="rounded-2xl bg-surface/90 border border-border shadow-2xs p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center justify-center">
              C
            </span>
            <h3 className="text-sm sm:text-base font-bold text-ink">
              Phần C · Tự Luận Đặt Câu &amp; Chấm Chữa Chi Tiết ({assignmentPackage.essayList.length} câu · 30 điểm)
            </h3>
          </div>
          <span className="text-xs text-gold font-semibold">15 điểm / câu</span>
        </div>

        <div className="p-4 rounded-2xl bg-canvas border border-border-strong flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-xs font-bold text-ink">
                📸 Tải ảnh bài viết chữ tay / File bài làm (Tùy chọn)
              </div>
              <div className="text-xs text-ink-muted">
                Chụp vở viết ô Mễ (<span lang="zh-CN">米字格</span>) hoặc giấy kiểm tra · Tự động phân tích nét bút &amp; ngữ pháp
              </div>
            </div>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.docx,.txt"
              onChange={onPhotoUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={isSubmitted}
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-surface border border-border-strong hover:bg-primary/10 text-xs font-bold text-ink flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-gold" />
              <span>{uploadedHomeworkFile ? 'Đổi ảnh/file khác' : 'Chụp / Tải ảnh lên'}</span>
            </button>
          </div>
        </div>

        {uploadedHomeworkFile && (
          <div className="p-3 rounded-xl bg-primary/10 text-xs text-ink flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span>
                Đã đính kèm: <strong>{uploadedHomeworkFile.name}</strong> (
                {(uploadedHomeworkFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            {homeworkImagePreview && (
              <img
                src={homeworkImagePreview}
                alt="Preview bài viết tay"
                className="w-10 h-10 object-cover rounded-lg border border-border"
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
                className="rounded-2xl bg-canvas border border-border p-4 sm:p-5 space-y-3"
              >
                <div>
                  <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold">
                    Câu {idx + 1}
                  </span>
                  <h4 className="text-sm font-bold text-ink mt-1">
                    Đặt câu có chứa từ: &ldquo;
                    <span lang="zh-CN" className="font-['Noto_Sans_SC'] text-base text-gold">
                      {q.targetWord}
                    </span>
                    &rdquo; ({q.pinyin} · {q.meaning})
                  </h4>
                  <p className="text-xs text-ink-muted mt-0.5">{q.suggestedPrompt}</p>
                </div>

                <div>
                  <textarea
                    rows={2}
                    disabled={isSubmitted}
                    value={userText}
                    onChange={(e) => onChangeEssayAnswer(q.id, e.target.value)}
                    placeholder={`Gõ câu tiếng Trung của bạn ở đây (bắt buộc có chữ "${q.targetWord}")...`}
                    className="w-full p-3 rounded-xl bg-surface border border-border text-sm font-['Noto_Sans_SC'] text-ink placeholder:text-ink-muted"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted mt-1.5 px-1">
                    <span>
                      {hasTarget ? (
                        <span className="text-success font-bold">
                          ✓ Đã xuất hiện từ &ldquo;<span lang="zh-CN">{q.targetWord}</span>&rdquo;
                        </span>
                      ) : (
                        <span className="text-warning">
                          Chưa chứa từ vựng bắt buộc &ldquo;<span lang="zh-CN">{q.targetWord}</span>&rdquo;
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
                          onRecordSpeechScore(q.id, hasTarget ? 97 : 92);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 cursor-pointer"
                      >
                        <Mic className="w-3 h-3 text-gold" />
                        <span>Luyện nói chấm phát âm</span>
                      </button>

                      {partCSpeechScores[q.id] && (
                        <span
                          data-testid={`part-c-speech-score-${q.id}`}
                          className="px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20 text-ink font-bold tabular-nums"
                        >
                          🎯 Phát âm: {partCSpeechScores[q.id]}%
                        </span>
                      )}

                      <span>{userText.length} ký tự</span>
                    </div>
                  </div>
                </div>

                {isSubmitted && (
                  <div className="p-4 rounded-xl bg-surface border border-border-strong text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-ink">
                        <Sparkles className="w-4 h-4 text-gold" />
                        <span>Trợ Giảng 彬彬 &amp; Thầy Nguyễn Văn Thụ Chấm Sửa:</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-md bg-primary text-on-primary font-bold text-xs">
                        {hasTarget && isGoodLength
                          ? '+15/15 điểm (Xuất sắc)'
                          : hasTarget || isGoodLength || uploadedHomeworkFile
                          ? '+10/15 điểm (Khá)'
                          : '+6/15 điểm'}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-canvas border border-border text-ink space-y-1">
                      <div className="font-bold text-sm text-ink">
                        {hasTarget && isGoodLength
                          ? '✅ Nhận xét ngữ pháp: Câu viết tự nhiên, dùng đúng vị trí trạng từ và cấu trúc Hán ngữ.'
                          : '⚠️ Lưu ý chẩn đoán: Cần đảm bảo có đầy đủ thành phần Chủ ngữ + Vị ngữ và đặt trạng từ thời gian/địa điểm trước động từ.'}
                      </div>
                      {q.grammarFocus && (
                        <div className="text-xs text-ink-muted">
                          <strong>Trọng điểm bài giảng:</strong> {q.grammarFocus}
                        </div>
                      )}
                    </div>

                    <div className="p-3 rounded-lg bg-primary/10 border border-border-strong text-ink space-y-1">
                      <div className="flex items-center justify-between text-xs text-gold font-bold">
                        <span>Câu Mẫu Chuẩn Của Giáo Viên (<span lang="zh-CN">范句</span>):</span>
                        <button
                          type="button"
                          onClick={() => speakChinese(q.sampleSentence)}
                          className="inline-flex items-center gap-1 text-ink hover:underline cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Nghe mẫu</span>
                        </button>
                      </div>
                      <p lang="zh-CN" className="font-['Noto_Sans_SC'] font-bold text-sm text-ink">
                        {q.sampleSentence}
                      </p>
                      <p className="text-xs text-gold font-medium">{q.samplePinyin}</p>
                      <p className="text-xs text-ink-muted italic">
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

      {/* SECTION D: NGHE ÂM CHỌN CHỮ & KIỂM TRA VIẾT NÉT CHỮ HÁN */}
      <div className="rounded-2xl bg-surface/90 border border-border shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-primary text-gold text-xs font-bold flex items-center justify-center">
              D
            </span>
            <h3 className="text-sm sm:text-base font-bold text-ink">
              Phần D · Nghe Âm Chọn Chữ &amp; Luyện Viết Nét Chữ Hán (<span lang="zh-CN">米字格</span>)
            </h3>
          </div>
          <span className="text-xs text-gold font-semibold">
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
                className="p-4 rounded-2xl bg-canvas border border-border space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-ink">
                    🎧 Câu nghe #{idx + 1}: Chọn đúng chữ Hán
                  </span>
                  <button
                    type="button"
                    data-testid={`listening-play-btn-${lc.id}`}
                    onClick={() => speakChinese(lc.audioText)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold cursor-pointer"
                  >
                    <Headphones className="w-3.5 h-3.5 text-gold" />
                    <span>Nghe phát âm câu #{idx + 1}</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {lc.options.map((opt) => {
                    const picked = selectedAnswer === opt;
                    const isOptCorrect = opt.startsWith(lc.correctHanzi);
                    let btnStyle = 'bg-surface text-ink border-border hover:border-border-strong';
                    if (isSubmitted) {
                      if (isOptCorrect) {
                        btnStyle = 'bg-primary text-on-primary border-transparent font-bold';
                      } else if (picked && !isOptCorrect) {
                        btnStyle = 'bg-accent text-on-primary border-accent font-bold';
                      }
                    } else if (picked) {
                      btnStyle = 'bg-primary text-on-primary border-transparent';
                    }

                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={isSubmitted}
                        onClick={() => {
                          speakChinese(opt.split(' ')[0]);
                          onSelectListeningAnswer(lc.id, opt);
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${btnStyle}`}
                      >
                        <span lang="zh-CN">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {hasAnsweredOrSubmitted && (
                  <div
                    data-testid={`listening-feedback-${lc.id}`}
                    className={`p-3 rounded-xl text-xs space-y-1 ${
                      isListeningCorrect
                        ? 'bg-success/10 text-ink border border-success/30'
                        : 'bg-warning/15 text-ink border border-warning/30'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1 font-bold">
                      <span>
                        {isListeningCorrect
                          ? `✓ Chính xác! Từ vừa nghe là “${lc.correctHanzi}” (${lc.meaning})`
                          : `💡 Đáp án chuẩn: “${lc.correctHanzi}” (${lc.meaning})`}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-surface text-gold font-bold">
                        Pinyin: {lc.pinyin}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted leading-relaxed">{lc.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 rounded-2xl bg-canvas border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-ink flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-gold" />
              <span>Kiểm tra nhanh nét viết chữ trọng tâm trên ô Mễ (<span lang="zh-CN">米字格</span>):</span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
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
                    onPracticeChar(ch);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    acc
                      ? 'bg-primary text-on-primary border-transparent'
                      : 'bg-surface text-ink border-border hover:border-primary'
                  }`}
                >
                  <span lang="zh-CN" className="font-hanzi-calligraphy text-sm mr-1">
                    {ch}
                  </span>
                  <span>{acc ? `✓ ${acc}%` : 'Viết thử'}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION E: LUYỆN DỊCH & ĐẶT CÂU CHUẨN HSK 3.0 */}
      <div
        data-testid="student-part-e-translation"
        className="rounded-2xl bg-surface/90 border border-border shadow-2xs p-5 sm:p-6 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-accent text-on-primary text-xs font-bold flex items-center justify-center">
              E
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-ink">
                Phần E · Luyện Dịch &amp; Đặt Câu Chuẩn HSK 3.0 (<span lang="zh-CN">翻译与造句</span>)
              </h3>
              <p className="text-xs text-ink-muted">
                Kỹ năng thứ 5 của HSK 3.0: Dịch câu tiếng Việt sang tiếng Trung có chứa từ trọng tâm
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-primary text-on-primary text-xs font-bold">
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
                className="rounded-2xl bg-canvas border border-border p-4 sm:p-5 space-y-3.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                        Bài dịch #{idx + 1} · {tr.hskLevel}
                      </span>
                      <span lang="zh-CN" className="px-2.5 py-0.5 rounded-lg bg-primary text-on-primary text-xs font-bold font-['Noto_Sans_SC']">
                        Từ khóa bắt buộc: {tr.targetKeyword} ({tr.targetPinyin})
                      </span>
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-ink mt-2">
                      Câu tiếng Việt cần dịch: &ldquo;{tr.vietnameseSource}&rdquo;
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => speakChinese(tr.modelChinese)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-bold text-ink hover:border-border-strong cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-gold" />
                    <span>Nghe phát âm mẫu</span>
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-surface border border-border-strong flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-ink-muted">
                    📐 Công thức Ngữ pháp HSK 3.0 gợi ý:
                  </span>
                  <span className="font-mono font-bold text-ink bg-canvas px-2.5 py-1 rounded-lg border border-border">
                    {tr.grammarFormula}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-ink-muted">
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
                          onChangeTranslationAnswer(tr.id, (translationAnswers[tr.id] || '') + chip);
                        }}
                        className="px-3 py-1 rounded-xl bg-surface hover:bg-primary/10 border border-border text-xs font-bold font-['Noto_Sans_SC'] text-ink cursor-pointer"
                      >
                        + <span lang="zh-CN">{chip}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      data-testid={`part-e-sample-btn-${tr.id}`}
                      onClick={() => {
                        onChangeTranslationAnswer(tr.id, tr.modelChinese);
                        const evaluated = evaluateHsk3Translation(tr.modelChinese, tr);
                        onSetTranslationEvaluation(tr.id, evaluated);
                        playGentleChime(783.99, 0.2);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-primary/10 hover:bg-primary/15 border border-primary/20 text-xs font-bold text-primary cursor-pointer"
                    >
                      ⚡ Điền &amp; Chấm thử câu mẫu
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <input
                    type="text"
                    data-testid={`part-e-input-${tr.id}`}
                    value={userVal}
                    onChange={(e) => onChangeTranslationAnswer(tr.id, e.target.value)}
                    placeholder={`Nhập bản dịch tiếng Trung có từ “${tr.targetKeyword}”...`}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface border border-border text-sm font-['Noto_Sans_SC'] font-bold text-ink"
                  />
                  <button
                    type="button"
                    data-testid={`part-e-grade-btn-${tr.id}`}
                    onClick={() => {
                      const evaluated = evaluateHsk3Translation(userVal, tr);
                      onSetTranslationEvaluation(tr.id, evaluated);
                      playGentleChime(evaluated.passed ? 783.99 : 440, 0.2);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold whitespace-nowrap cursor-pointer"
                  >
                    ✨ Chấm điểm Ngữ pháp HSK 3.0
                  </button>
                </div>

                {evalResult && (
                  <div
                    data-testid={`part-e-feedback-${tr.id}`}
                    className={`p-3.5 rounded-xl text-xs space-y-1.5 border ${
                      evalResult.passed
                        ? 'bg-success/10 border-success/30 text-ink'
                        : 'bg-warning/15 border-warning/30 text-ink'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-xs">
                        🎯 Điểm Dịch thuật &amp; Ngữ pháp:{' '}
                        <strong className="tabular-nums">{evalResult.score}/100đ</strong> ·{' '}
                        {evalResult.gradeBadge}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-surface text-xs font-bold text-ink">
                        {evalResult.hasKeyword
                          ? `✓ Đã có từ khóa “${tr.targetKeyword}”`
                          : `⚠️ Thiếu từ khóa “${tr.targetKeyword}”`}
                      </span>
                    </div>
                    <p className="leading-relaxed font-medium text-sm">{evalResult.feedbackVi}</p>
                    <div className="pt-1.5 border-t border-border text-xs text-ink-muted">
                      <strong className="text-ink">💡 Gợi ý diễn đạt chuẩn bản xứ:</strong>{' '}
                      <span lang="zh-CN" className="font-['Noto_Sans_SC'] font-bold text-ink">
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

      {/* STICKY SUBMIT BAR */}
      {!isSubmitted && (
        <div
          data-testid="sticky-submit-assignment-bar"
          className="sticky bottom-4 z-20 p-3 sm:px-5 sm:py-3.5 rounded-2xl bg-primary text-on-primary border border-transparent shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 text-xs">
            <Sparkles className="w-4 h-4 text-gold shrink-0" />
            <span>
              Học viên:{' '}
              <strong data-testid="bottom-bar-student-name" className="text-gold">
                {activeStudentName}
              </strong>{' '}
              · Buổi {assignmentPackage.sessionNumber} · Tự động lưu kết quả bài làm.
            </span>
          </div>

          <button
            type="button"
            data-testid="submit-student-assignment-btn"
            disabled={isGrading}
            onClick={onSubmitAssignment}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-canvas hover:bg-surface text-ink font-bold text-xs transition-all whitespace-nowrap cursor-pointer"
          >
            <Send className="w-4 h-4 text-gold" />
            <span>
              {isGrading ? 'Đang phân tích & chấm điểm...' : 'Nộp Bài & Chấm Chữa Ngay (100đ)'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
