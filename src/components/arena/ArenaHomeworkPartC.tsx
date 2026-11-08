import React from 'react';
import { Camera, Check, Send, Volume2 } from 'lucide-react';
import { UploadedAssignmentPackage } from '../../utils/assignmentParser';
import { speakChinese } from '../../utils/speech';

interface ArenaHomeworkPartCProps {
  assignmentPackage: UploadedAssignmentPackage;
  essayAnswers: Record<string, string>;
  onChangeEssayAnswer: (qId: string, val: string) => void;
  uploadedHomeworkFile: File | null;
  homeworkImagePreview: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  answeredCount: number;
  totalCount: number;
  isSubmitted: boolean;
  isGrading: boolean;
  onSubmitAssignment: () => void;
}

/** Part C (sentence writing) of an assigned homework, plus the submit bar. */
export const ArenaHomeworkPartC: React.FC<ArenaHomeworkPartCProps> = ({
  assignmentPackage,
  essayAnswers,
  onChangeEssayAnswer,
  uploadedHomeworkFile,
  homeworkImagePreview,
  fileInputRef,
  onPhotoUpload,
  answeredCount,
  totalCount,
  isSubmitted,
  isGrading,
  onSubmitAssignment,
}) => {
  const essays = assignmentPackage.essayList;
  const sectionLetter =
    String.fromCharCode(
      65 +
        (assignmentPackage.multipleChoiceList.length > 0 ? 1 : 0) +
        (assignmentPackage.sentenceOrderingList.length > 0 ? 1 : 0)
    );

  return (
    <div className="space-y-6">
      {essays.length > 0 && (
        <section
          aria-labelledby="part-c-heading"
          className="rounded-2xl bg-surface border border-border p-5 sm:p-6 space-y-5"
        >
          <div className="flex items-center gap-2.5 border-b border-border pb-3">
            <span className="w-7 h-7 rounded-lg bg-primary-soft text-primary text-xs font-bold flex items-center justify-center">
              {sectionLetter}
            </span>
            <h2 id="part-c-heading" className="text-base font-semibold text-ink">
              Đặt câu <span className="text-sm font-normal text-ink-muted">({essays.length} câu)</span>
            </h2>
          </div>

          <div className="divide-y divide-border">
          {essays.map((q, idx) => {
            const userText = essayAnswers[q.id] || '';
            const hasTarget = Boolean(q.targetWord) && userText.includes(q.targetWord);
            return (
              <div key={q.id} className="space-y-2.5 py-5 first:pt-0">
                <div>
                  <div className="text-xs font-medium text-ink-subtle">Câu {idx + 1}</div>
                  <h3 className="text-sm font-semibold text-ink mt-0.5">
                    Đặt câu với{' '}
                    <span lang="zh-CN" className="font-['Noto_Sans_SC'] text-base text-primary">
                      {q.targetWord}
                    </span>
                    {(q.pinyin || q.meaning) && (
                      <span className="font-normal text-ink-muted">
                        {' '}
                        ({[q.pinyin, q.meaning].filter(Boolean).join(' · ')})
                      </span>
                    )}
                  </h3>
                </div>
                <textarea
                  rows={2}
                  disabled={isSubmitted}
                  aria-label={`Câu tiếng Trung của bạn có dùng từ ${q.targetWord}`}
                  value={userText}
                  onChange={(e) => onChangeEssayAnswer(q.id, e.target.value)}
                  placeholder={`Viết một câu có “${q.targetWord}”…`}
                  className="w-full p-3 rounded-xl bg-surface-2 border border-border text-base font-['Noto_Sans_SC',_inherit] text-ink placeholder:text-ink-subtle disabled:opacity-80"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  {userText.trim() ? (
                    hasTarget ? (
                      <span className="text-success font-medium">✓ Đã dùng “{q.targetWord}”</span>
                    ) : (
                      <span className="text-warning">Câu chưa có “{q.targetWord}”</span>
                    )
                  ) : (
                    <span className="text-ink-subtle">Chưa trả lời</span>
                  )}
                  {userText.trim() && (
                    <button
                      type="button"
                      onClick={() => speakChinese(userText.trim())}
                      className="inline-flex items-center gap-1.5 min-h-9 px-2.5 rounded-lg hover:bg-surface-2 text-ink-muted hover:text-ink font-medium cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Nghe lại câu của bạn
                    </button>
                  )}
                </div>
                {isSubmitted && q.sampleSentence && (
                  <div className="p-3 rounded-xl bg-primary-soft text-sm space-y-0.5">
                    <div className="text-xs font-medium text-ink-muted">Câu mẫu của giáo viên</div>
                    <p lang="zh-CN" className="font-['Noto_Sans_SC'] font-semibold text-ink">
                      {q.sampleSentence}
                    </p>
                    {q.sampleTranslation && <p className="text-xs text-ink-muted">{q.sampleTranslation}</p>}
                  </div>
                )}
              </div>
            );
          })}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-surface-2">
            <div className="flex items-center gap-3 min-w-0">
              <Camera className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
              <div className="min-w-0 text-sm">
                <div className="font-medium text-ink">Ảnh bài viết tay (không bắt buộc)</div>
                <div className="text-xs text-ink-muted truncate">
                  {uploadedHomeworkFile
                    ? `${uploadedHomeworkFile.name} · ${(uploadedHomeworkFile.size / 1024).toFixed(0)} KB`
                    : 'Chụp vở viết để giáo viên xem.'}
                </div>
              </div>
              {homeworkImagePreview && (
                <img
                  src={homeworkImagePreview}
                  alt="Ảnh bài viết tay đã đính kèm"
                  className="w-10 h-10 object-cover rounded-lg border border-border shrink-0"
                />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onPhotoUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={isSubmitted}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-1.5 min-h-10 px-3.5 rounded-xl bg-surface border border-border hover:bg-surface-2 text-sm font-medium text-ink transition-colors cursor-pointer disabled:opacity-60"
            >
              {uploadedHomeworkFile ? <Check className="w-4 h-4 text-success" aria-hidden="true" /> : null}
              {uploadedHomeworkFile ? 'Đổi ảnh' : 'Chọn ảnh'}
            </button>
          </div>
        </section>
      )}

      {!isSubmitted && (
        <div
          data-testid="sticky-submit-assignment-bar"
          className="sticky bottom-24 lg:bottom-4 z-20 px-4 py-3 rounded-2xl bg-surface border border-border-strong shadow-lg flex items-center justify-between gap-3"
        >
          <div className="text-sm text-ink-muted tabular-nums">
            Đã làm <strong className="text-ink">{answeredCount}</strong>/{totalCount} câu
          </div>
          <button
            type="button"
            data-testid="submit-student-assignment-btn"
            disabled={isGrading || answeredCount === 0}
            onClick={onSubmitAssignment}
            className="inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-semibold text-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            {isGrading ? 'Đang chấm…' : 'Nộp bài'}
          </button>
        </div>
      )}
    </div>
  );
};
