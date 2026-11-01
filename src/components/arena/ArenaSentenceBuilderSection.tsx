import React from 'react';
import { Volume2 } from 'lucide-react';
import {
  evaluateSentenceBuilderOrder,
  HSK3_SENTENCE_BUILDER_CHALLENGES,
  SentenceBuilderEvaluation,
} from '../../utils/hskStudyHelpers';
import { playGentleChime, speakChinese } from '../../utils/speech';

interface ArenaSentenceBuilderSectionProps {
  sentenceBuilderSelectedIds: Record<string, string[]>;
  onChangeSentenceBuilderSelectedIds: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  sentenceBuilderEvals: Record<string, SentenceBuilderEvaluation>;
  onChangeSentenceBuilderEvals: React.Dispatch<
    React.SetStateAction<Record<string, SentenceBuilderEvaluation>>
  >;
  showTilePinyin: boolean;
  onToggleShowTilePinyin: () => void;
  sentenceBuilderSyncBanner: string | null;
  onCheckAllSentenceBuilder: () => void;
  onAskBinBinAboutQuestion: (targetWord: string, questionText: string, explanationText?: string) => void;
}

export const ArenaSentenceBuilderSection: React.FC<ArenaSentenceBuilderSectionProps> = ({
  sentenceBuilderSelectedIds,
  onChangeSentenceBuilderSelectedIds,
  sentenceBuilderEvals,
  onChangeSentenceBuilderEvals,
  showTilePinyin,
  onToggleShowTilePinyin,
  sentenceBuilderSyncBanner,
  onCheckAllSentenceBuilder,
  onAskBinBinAboutQuestion,
}) => {
  return (
    <div
      data-testid="sentence-builder-arena"
      className="rounded-3xl bg-surface/90 border-2 border-gold/55 p-5 sm:p-6 shadow-2xs space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-primary">
            PHÒNG LUYỆN CẤU TRÚC CÂU &amp; TRẬT TỰ TỪ HSK 3.0 · <span lang="zh-CN">连词成句</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-ink mt-0.5">
            🧩 Lắp Ghép Thẻ Từ Loại &amp; Chẩn Đoán Ngữ Pháp Hán Ngữ ({HSK3_SENTENCE_BUILDER_CHALLENGES.length} cấu trúc trọng tâm)
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="sentence-builder-toggle-pinyin-btn"
            onClick={onToggleShowTilePinyin}
            className="px-3 py-1.5 rounded-xl bg-canvas hover:bg-primary/10 border border-border text-xs font-bold text-ink cursor-pointer"
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
              onChangeSentenceBuilderSelectedIds(nextSel);
              onChangeSentenceBuilderEvals(nextEval);
              playGentleChime(783.99, 0.22);
            }}
            className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-ink border border-gold/50 text-xs font-bold cursor-pointer"
          >
            ⚡ Điền mẫu nhanh 5 câu
          </button>

          <button
            type="button"
            data-testid="sentence-builder-check-btn"
            onClick={onCheckAllSentenceBuilder}
            className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer"
          >
            ✨ Kiểm tra &amp; Chấm cấu trúc câu
          </button>
        </div>
      </div>

      {sentenceBuilderSyncBanner && (
        <div
          data-testid="sentence-builder-sync-banner"
          className="p-3.5 rounded-2xl bg-success/10 border border-success/30 text-xs font-bold text-ink flex flex-wrap items-center justify-between gap-2"
        >
          <span>{sentenceBuilderSyncBanner}</span>
        </div>
      )}

      <div className="space-y-4">
        {HSK3_SENTENCE_BUILDER_CHALLENGES.map((challenge, idx) => {
          const selectedIds = sentenceBuilderSelectedIds[challenge.id] || [];
          const tileLookup = new Map(challenge.tilesInCorrectOrder.map((t) => [t.id, t]));
          const selectedTiles = selectedIds.map((id) => tileLookup.get(id)).filter(Boolean);
          const availableTiles = challenge.shuffledTiles.filter(
            (t) => !selectedIds.includes(t.id)
          );
          const evalItem = sentenceBuilderEvals[challenge.id];

          return (
            <div
              key={challenge.id}
              data-testid={`sentence-builder-card-${challenge.id}`}
              className="p-4 sm:p-5 rounded-2xl bg-canvas border border-border space-y-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-primary text-white text-xs font-bold">
                    Câu {idx + 1} · {challenge.hskLevel}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-ink">
                    {challenge.grammarPointTitle}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => speakChinese(challenge.targetSentence, 0.88)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-surface border border-gold/45 text-xs font-bold text-ink hover:bg-primary/10 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-gold" />
                    <span>Nghe câu chuẩn</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeSentenceBuilderSelectedIds((prev) => ({
                        ...prev,
                        [challenge.id]: [],
                      }));
                      onChangeSentenceBuilderEvals((prev) => {
                        const next = { ...prev };
                        delete next[challenge.id];
                        return next;
                      });
                    }}
                    className="px-2.5 py-1 rounded-xl bg-surface border border-border text-xs font-semibold text-ink-muted hover:text-ink cursor-pointer"
                  >
                    Xóa chọn
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-gold/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-bold text-gold uppercase mr-1.5">Nghĩa tiếng Việt:</span>
                  <strong className="text-ink">&ldquo;{challenge.vietnamesePrompt}&rdquo;</strong>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-canvas text-primary font-mono text-xs font-bold">
                  📐 {challenge.grammarFormula}
                </span>
              </div>

              <div
                data-testid={`sentence-builder-dropzone-${challenge.id}`}
                className="min-h-[56px] p-3 rounded-2xl bg-surface border-2 border-dashed border-primary/30 flex flex-wrap items-center gap-2"
              >
                {selectedTiles.length === 0 ? (
                  <span className="text-xs text-ink-muted italic">
                    Bấm vào các thẻ từ bên dưới theo đúng trật tự ngữ pháp tiếng Trung...
                  </span>
                ) : (
                  selectedTiles.map((tile) =>
                    tile ? (
                      <button
                        key={`sel-${tile.id}`}
                        type="button"
                        onClick={() => {
                          onChangeSentenceBuilderSelectedIds((prev) => ({
                            ...prev,
                            [challenge.id]: (prev[challenge.id] || []).filter(
                              (id) => id !== tile.id
                            ),
                          }));
                        }}
                        className="px-3 py-1.5 rounded-xl bg-primary text-white text-left cursor-pointer hover:opacity-90 transition-all"
                      >
                        <div lang="zh-CN" className="font-['Noto_Sans_SC'] text-base font-bold leading-tight">
                          {tile.hanzi}
                        </div>
                        {showTilePinyin && (
                          <div className="text-xs text-gold font-semibold">
                            {tile.pinyin} · {tile.posTag}
                          </div>
                        )}
                      </button>
                    ) : null
                  )
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {availableTiles.map((tile) => (
                  <button
                    key={`avail-${tile.id}`}
                    type="button"
                    data-testid={`sentence-tile-${tile.id}`}
                    onClick={() => {
                      speakChinese(tile.hanzi, 0.95);
                      const nextIds = [...selectedIds, tile.id];
                      onChangeSentenceBuilderSelectedIds((prev) => ({
                        ...prev,
                        [challenge.id]: nextIds,
                      }));
                      if (nextIds.length === challenge.tilesInCorrectOrder.length) {
                        const autoEval = evaluateSentenceBuilderOrder(nextIds, challenge);
                        onChangeSentenceBuilderEvals((prev) => ({
                          ...prev,
                          [challenge.id]: autoEval,
                        }));
                        playGentleChime(autoEval.isCorrect ? 880 : 440, 0.2);
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-surface hover:bg-primary/10 border border-border hover:border-primary text-left transition-all cursor-pointer"
                  >
                    <div lang="zh-CN" className="font-['Noto_Sans_SC'] text-base font-bold text-ink leading-tight">
                      {tile.hanzi}
                    </div>
                    {showTilePinyin && (
                      <div className="text-xs font-semibold text-gold mt-0.5">
                        {tile.pinyin} · <span className="text-primary">{tile.posTag}</span> ({tile.meaningHint})
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {evalItem && (
                <div
                  data-testid={`sentence-builder-feedback-${challenge.id}`}
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                    evalItem.isCorrect
                      ? 'bg-success/10 border-success/40 text-ink'
                      : 'bg-warning/15 border-warning/40 text-ink'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 font-bold">
                    <span>
                      {evalItem.isCorrect ? '✅ Trật tự chuẩn HSK 3.0:' : '⚠️ Chẩn đoán trật tự câu:'}{' '}
                      <span lang="zh-CN" className="font-['Noto_Sans_SC'] text-sm">
                        {evalItem.assembledHanzi}
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-surface text-ink tabular-nums">
                        Điểm: {evalItem.score}/100đ
                      </span>
                      <button
                        type="button"
                        data-testid={`ask-binbin-sb-${challenge.id}`}
                        onClick={() =>
                          onAskBinBinAboutQuestion(
                            challenge.tilesInCorrectOrder[0]?.hanzi || '温暖',
                            challenge.targetSentence,
                            evalItem.grammarDiagnostic
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-primary text-white text-xs font-bold cursor-pointer"
                      >
                        <span>🐼 Hỏi 彬彬 câu này</span>
                      </button>
                    </div>
                  </div>
                  <p className="font-semibold text-sm">{evalItem.feedbackVi}</p>
                  <p className="text-xs text-ink-muted">{evalItem.grammarDiagnostic}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
