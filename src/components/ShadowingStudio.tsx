import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Mic,
  Play,
  Plus,
  Square,
  Trash2,
  Volume2,
} from 'lucide-react';
import type { VocabSlide } from '../data/chineseData';
import { useAppStoreSelector } from '../context/AppStoreContext';
import { getStoredAssignment, hasAssignmentQuestions } from '../utils/assignmentParser';
import { SMART_HANZI_DICTIONARY } from '../utils/chineseEngine';
import { recordDailyWordReview } from '../utils/hskStudyHelpers';
import {
  cancelChineseSpeech,
  describeSpeechFailure,
  estimateChineseSpeechMs,
  isSpeechRecognitionSupported,
  practiceChinesePronunciationWithMic,
  speakChineseAsync,
  type PronunciationEvaluationResult,
  type SpeechFailureReason,
} from '../utils/speech';
import {
  buildShadowingLibrary,
  type CustomShadowPassage,
  HSK_LEVELS,
  type HskLevel,
  LEVEL_PRESETS,
  loadCustomPassages,
  loadShadowLevel,
  loadShadowProgress,
  recordShadowAttempt,
  saveCustomPassages,
  saveShadowLevel,
  type ShadowSentence,
  SOURCE_LABELS,
  splitIntoShadowSentences,
  suggestStartingLevel,
} from '../utils/shadowing';

const SPEEDS = [
  { value: 0.7, label: 'Chậm' },
  { value: 0.85, label: 'Vừa' },
  { value: 1, label: 'Chuẩn' },
];

type Phase = 'idle' | 'playing' | 'listening' | 'pause';

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function nearestSpeed(rate: number): number {
  return SPEEDS.reduce((best, s) => (Math.abs(s.value - rate) < Math.abs(best - rate) ? s.value : best), 1);
}

function scoreTone(score: number): string {
  if (score >= 85) return 'text-success';
  if (score >= 60) return 'text-warning';
  return 'text-accent';
}

export const ShadowingStudio: React.FC<{ slides: VocabSlide[] }> = ({ slides }) => {
  const latestAssignment = useAppStoreSelector((s) => s.latestAssignment);
  const assignment = useMemo(() => {
    if (latestAssignment) return hasAssignmentQuestions(latestAssignment) ? latestAssignment : null;
    const stored = getStoredAssignment();
    return hasAssignmentQuestions(stored) ? stored : null;
  }, [latestAssignment]);

  const [customPassages, setCustomPassages] = useState<CustomShadowPassage[]>(() => loadCustomPassages());
  const library = useMemo(
    () =>
      buildShadowingLibrary({
        slides,
        dictionary: SMART_HANZI_DICTIONARY,
        assignment,
        customPassages,
      }),
    [slides, assignment, customPassages]
  );
  const countByLevel = useMemo(() => {
    const counts: Record<number, number> = {};
    library.forEach((s) => {
      counts[s.level] = (counts[s.level] || 0) + 1;
    });
    return counts;
  }, [library]);

  const [level, setLevel] = useState<HskLevel>(() => loadShadowLevel() || suggestStartingLevel(slides));
  const preset = LEVEL_PRESETS[level];
  const [rate, setRate] = useState(() => nearestSpeed(preset.rate));
  const [showPinyin, setShowPinyin] = useState(preset.showPinyin);
  const [showMeaning, setShowMeaning] = useState(true);
  const [showHanzi, setShowHanzi] = useState(true);

  const sentences = useMemo(() => library.filter((s) => s.level === level), [library, level]);
  const [index, setIndex] = useState(0);
  const safeIndex = sentences.length ? Math.min(index, sentences.length - 1) : 0;
  const current: ShadowSentence | undefined = sentences[safeIndex];

  const [phase, setPhase] = useState<Phase>('idle');
  const [autoMode, setAutoMode] = useState(false);
  const [evaluation, setEvaluation] = useState<PronunciationEvaluationResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [progress, setProgress] = useState(() => loadShadowProgress());
  const micSupported = useMemo(() => isSpeechRecognitionSupported(), []);

  const runIdRef = useRef(0);
  const stopListeningRef = useRef<(() => void) | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  const stopAll = useCallback(() => {
    runIdRef.current += 1;
    cancelChineseSpeech();
    stopListeningRef.current?.();
    stopListeningRef.current = null;
    setPhase('idle');
    setAutoMode(false);
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  // Keep the active row visible in the sentence list.
  useEffect(() => {
    // Scroll only the list itself; scrollIntoView would also move the page on phones.
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>(`[data-row="${safeIndex}"]`);
    if (!list || !row) return;
    const top = row.offsetTop - list.offsetTop;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (top + row.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = top + row.offsetHeight - list.clientHeight;
    }
  }, [safeIndex, level]);

  const changeLevel = (next: HskLevel) => {
    stopAll();
    setLevel(next);
    saveShadowLevel(next);
    setIndex(0);
    setEvaluation(null);
    setNotice(null);
    setRate(nearestSpeed(LEVEL_PRESETS[next].rate));
    setShowPinyin(LEVEL_PRESETS[next].showPinyin);
  };

  const goTo = (nextIndex: number) => {
    stopAll();
    if (!sentences.length) return;
    setIndex((nextIndex + sentences.length) % sentences.length);
    setEvaluation(null);
    setNotice(null);
  };

  const saveAttempt = (sentence: ShadowSentence, ev: PronunciationEvaluationResult) => {
    setProgress((prev) => recordShadowAttempt(prev, sentence.id, ev.score));
    recordDailyWordReview(`shadow-${sentence.id}`, slides);
  };

  /** Listen once; resolves null (and explains why) when nothing was heard. */
  const listenOnce = (sentence: ShadowSentence): Promise<PronunciationEvaluationResult | null> =>
    new Promise((resolve) => {
      const timeoutMs = Math.min(16000, estimateChineseSpeechMs(sentence.hanzi, 0.8) * 2 + 3500);
      stopListeningRef.current = practiceChinesePronunciationWithMic({
        targetHanzi: sentence.hanzi,
        targetPinyin: sentence.pinyin,
        timeoutMs,
        onResult: (ev) => {
          stopListeningRef.current = null;
          resolve(ev);
        },
        onUnavailable: (reason: SpeechFailureReason) => {
          stopListeningRef.current = null;
          setNotice(describeSpeechFailure(reason));
          resolve(null);
        },
      });
    });

  const playModel = async () => {
    if (!current) return;
    stopAll();
    const run = runIdRef.current;
    setNotice(null);
    setPhase('playing');
    await speakChineseAsync(current.hanzi, rate);
    if (run === runIdRef.current) setPhase('idle');
  };

  const shadowOnce = async () => {
    if (!current) return;
    stopAll();
    const run = runIdRef.current;
    setEvaluation(null);
    setNotice(null);
    setPhase('listening');
    const ev = await listenOnce(current);
    if (run !== runIdRef.current) return;
    setPhase('idle');
    if (ev) {
      setEvaluation(ev);
      saveAttempt(current, ev);
    }
  };

  /** Hands-free shadowing: model → repeat → next, until stopped or the list ends. */
  const startAuto = async () => {
    if (!sentences.length) return;
    stopAll();
    const run = runIdRef.current;
    setAutoMode(true);
    setNotice(null);
    for (let i = safeIndex; i < sentences.length; i++) {
      if (run !== runIdRef.current) return;
      const sentence = sentences[i];
      setIndex(i);
      setEvaluation(null);
      setPhase('playing');
      await speakChineseAsync(sentence.hanzi, rate);
      if (run !== runIdRef.current) return;
      if (micSupported) {
        setPhase('listening');
        const ev = await listenOnce(sentence);
        if (run !== runIdRef.current) return;
        if (!ev) {
          // Mic blocked or nothing heard: stop instead of looping silently.
          setPhase('idle');
          setAutoMode(false);
          return;
        }
        setEvaluation(ev);
        saveAttempt(sentence, ev);
        setPhase('pause');
        await wait(1400);
      } else {
        setPhase('pause');
        await wait(estimateChineseSpeechMs(sentence.hanzi, rate) * LEVEL_PRESETS[level].pauseFactor);
        setProgress((prev) => recordShadowAttempt(prev, sentence.id, null));
      }
    }
    if (run !== runIdRef.current) return;
    setPhase('idle');
    setAutoMode(false);
    setNotice(`Đã luyện hết ${sentences.length} câu HSK ${level}. Chọn câu bất kỳ để luyện lại.`);
  };

  const practicedCount = sentences.filter((s) => progress[s.id]?.attempts).length;
  const scored = sentences.map((s) => progress[s.id]?.best || 0).filter((b) => b > 0);
  const averageBest = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null;

  const busy = phase !== 'idle';
  const statusText =
    phase === 'playing'
      ? 'Đang đọc mẫu… nghe kỹ ngữ điệu'
      : phase === 'listening'
      ? 'Đến lượt bạn: đọc to theo câu mẫu'
      : phase === 'pause'
      ? micSupported
        ? 'Chuẩn bị câu tiếp theo…'
        : 'Nhại lại câu vừa nghe…'
      : micSupported
      ? 'Bấm Nghe mẫu, rồi Đọc theo để được chấm phát âm.'
      : 'Trình duyệt này chưa chấm được phát âm; bạn vẫn có thể nghe và nhại lại.';

  // ---- Add your own passage --------------------------------------------------
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [passageTitle, setPassageTitle] = useState('');
  const [passageText, setPassageText] = useState('');
  const passageSentences = useMemo(() => splitIntoShadowSentences(passageText), [passageText]);
  const levelCustom = customPassages.filter((p) => p.level === level);

  const addPassage = () => {
    if (passageSentences.length === 0) return;
    const passage: CustomShadowPassage = {
      id: Date.now().toString(36),
      title: passageTitle.trim() || `Đoạn văn ${customPassages.length + 1}`,
      level,
      sentences: passageSentences,
      createdAt: new Date().toISOString(),
    };
    const next = [passage, ...customPassages];
    setCustomPassages(next);
    saveCustomPassages(next);
    setPassageTitle('');
    setPassageText('');
    setIsAddOpen(false);
    setIndex(0);
    setEvaluation(null);
  };

  const removePassage = (id: string) => {
    stopAll();
    const next = customPassages.filter((p) => p.id !== id);
    setCustomPassages(next);
    saveCustomPassages(next);
    setIndex(0);
  };

  const toggleChip = (pressed: boolean) =>
    `inline-flex items-center min-h-9 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
      pressed ? 'bg-primary-soft text-primary' : 'text-ink-muted hover:text-ink hover:bg-surface-2'
    }`;

  return (
    <div className="space-y-5" data-testid="shadowing-studio">
      {/* Level picker */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="radiogroup" aria-label="Cấp độ HSK" className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap">
          {HSK_LEVELS.map((lv) => {
            const active = lv === level;
            return (
              <button
                key={lv}
                type="button"
                role="radio"
                aria-checked={active}
                data-testid={`shadowing-level-${lv}`}
                onClick={() => changeLevel(lv)}
                className={`inline-flex items-center justify-center gap-1.5 min-h-10 px-3.5 rounded-xl border text-sm transition-colors cursor-pointer ${
                  active
                    ? 'bg-primary text-on-primary border-transparent font-semibold'
                    : 'bg-surface border-border text-ink hover:bg-surface-2 font-medium'
                }`}
              >
                HSK {lv}
                <span className={`text-xs tabular-nums ${active ? 'opacity-80' : 'text-ink-subtle'}`}>
                  {countByLevel[lv] || 0}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-sm text-ink-muted tabular-nums">
          Đã luyện <strong className="text-ink">{practicedCount}</strong>/{sentences.length} câu
          {averageBest !== null && (
            <>
              {' '}· điểm TB <strong className="text-ink">{averageBest}</strong>
            </>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-5 items-start">
        {/* Practice card */}
        <section
          aria-label="Câu đang luyện"
          className="rounded-2xl bg-surface border border-border p-5 sm:p-7 space-y-6 min-w-0"
        >
          {current ? (
            <>
              <div className="flex items-center justify-between gap-2 text-xs text-ink-muted">
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Câu trước"
                    onClick={() => goTo(safeIndex - 1)}
                    className="inline-flex items-center justify-center w-10 h-10 -ml-2 rounded-full hover:bg-surface-2 text-ink transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                  </button>
                  <span className="tabular-nums min-w-[4.5rem] text-center text-sm">
                    Câu {safeIndex + 1}/{sentences.length}
                  </span>
                  <button
                    type="button"
                    aria-label="Câu tiếp theo"
                    onClick={() => goTo(safeIndex + 1)}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-2 text-ink transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <span className="px-2 py-0.5 rounded-md bg-surface-2 font-medium text-ink-muted">
                    {SOURCE_LABELS[current.source]}
                  </span>
                  <span lang="zh-CN" className="truncate max-w-[12rem]">
                    {current.sourceLabel}
                  </span>
                </span>
              </div>

              <div className="text-center space-y-3 py-2 min-h-[9rem] flex flex-col justify-center">
                {showHanzi ? (
                  <p
                    lang="zh-CN"
                    data-testid="shadowing-hanzi"
                    className="font-['Noto_Sans_SC'] text-3xl sm:text-4xl leading-snug text-ink text-balance"
                  >
                    {evaluation
                      ? evaluation.charMatches.map((c, i) => (
                          <span
                            key={i}
                            className={
                              c.isPunctuation || c.isMatched
                                ? undefined
                                : 'text-accent underline decoration-2 underline-offset-[6px]'
                            }
                          >
                            {c.char}
                          </span>
                        ))
                      : current.hanzi}
                  </p>
                ) : (
                  <p className="text-sm text-ink-muted">
                    Chữ Hán đang ẩn — nghe rồi nhại lại bằng tai.
                  </p>
                )}
                {showPinyin && current.pinyin && (
                  <p className="text-base sm:text-lg text-primary">{current.pinyin}</p>
                )}
                {showMeaning && current.meaning && (
                  <p className="text-sm text-ink-muted">{current.meaning}</p>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  data-testid="shadowing-play-btn"
                  onClick={playModel}
                  disabled={autoMode}
                  className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-full border text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 ${
                    phase === 'playing' && !autoMode
                      ? 'bg-primary-soft border-primary/40 text-primary'
                      : 'border-border hover:bg-surface-2 text-ink'
                  }`}
                >
                  <Volume2 className="w-5 h-5" aria-hidden="true" />
                  Nghe mẫu
                </button>
                <button
                  type="button"
                  data-testid="shadowing-record-btn"
                  onClick={phase === 'listening' && !autoMode ? stopAll : shadowOnce}
                  disabled={!micSupported || autoMode}
                  className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-full text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    phase === 'listening' && !autoMode
                      ? 'bg-accent text-on-primary'
                      : 'bg-primary hover:bg-primary-hover text-on-primary'
                  }`}
                >
                  {phase === 'listening' && !autoMode ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-current animate-pulse" aria-hidden="true" />
                      Dừng
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5" aria-hidden="true" />
                      Đọc theo
                    </>
                  )}
                </button>
              </div>

              {/* Status & result */}
              <div className="min-h-[4.5rem] flex flex-col items-center justify-center gap-2 text-center" aria-live="polite">
                {evaluation ? (
                  <div className="space-y-1 animate-pop-in" data-testid="shadowing-result">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className={`text-3xl font-semibold tabular-nums ${scoreTone(evaluation.score)}`}>
                        {evaluation.score}
                      </span>
                      <span className="text-sm text-ink-muted">/100 · {evaluation.badgeLabel}</span>
                    </div>
                    <p className="text-sm text-ink-muted max-w-md">
                      Máy nghe được: <span lang="zh-CN" className="text-ink">{evaluation.transcript}</span>
                    </p>
                  </div>
                ) : (
                  <p className={`text-sm ${busy ? 'text-primary font-medium' : 'text-ink-muted'}`}>{statusText}</p>
                )}
                {notice && (
                  <p role="alert" className="text-sm text-accent max-w-md">
                    {notice}
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="flex flex-col gap-3 pt-4 border-t border-border sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-xs text-ink-subtle mr-1">Hiện:</span>
                  <button type="button" aria-pressed={showHanzi} onClick={() => setShowHanzi((v) => !v)} className={toggleChip(showHanzi)}>
                    Chữ Hán
                  </button>
                  <button type="button" aria-pressed={showPinyin} onClick={() => setShowPinyin((v) => !v)} className={toggleChip(showPinyin)}>
                    Pinyin
                  </button>
                  <button type="button" aria-pressed={showMeaning} onClick={() => setShowMeaning((v) => !v)} className={toggleChip(showMeaning)}>
                    Nghĩa
                  </button>
                </div>
                <div role="radiogroup" aria-label="Tốc độ đọc mẫu" className="flex items-center gap-1">
                  <span className="text-xs text-ink-subtle mr-1">Tốc độ:</span>
                  {SPEEDS.map((sp) => (
                    <button
                      key={sp.value}
                      type="button"
                      role="radio"
                      aria-checked={rate === sp.value}
                      onClick={() => setRate(sp.value)}
                      className={toggleChip(rate === sp.value)}
                    >
                      {sp.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                data-testid="shadowing-auto-btn"
                onClick={autoMode ? stopAll : startAuto}
                className={`w-full inline-flex items-center justify-center gap-2 min-h-12 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  autoMode
                    ? 'bg-inverse text-white hover:opacity-90'
                    : 'bg-surface-2 hover:bg-primary-soft text-ink hover:text-primary'
                }`}
              >
                {autoMode ? (
                  <>
                    <Square className="w-4 h-4" aria-hidden="true" />
                    Dừng luyện liên tục
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" aria-hidden="true" />
                    Luyện liên tục từ câu này
                    <span className="hidden sm:inline font-normal text-ink-muted">
                      · {micSupported ? 'nghe → đọc → chấm' : 'nghe → nhại'}
                    </span>
                  </>
                )}
              </button>
            </>
          ) : (
            <p className="text-sm text-ink-muted text-center py-10">
              Chưa có câu nào ở HSK {level}. Thêm đoạn văn của bạn ở bên cạnh để bắt đầu.
            </p>
          )}
        </section>

        {/* Sentence list & own passages */}
        <aside className="space-y-4 min-w-0">
          <div className="rounded-2xl bg-surface border border-border">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Câu HSK {level}</h2>
              <span className="text-xs text-ink-subtle">{preset.label}</span>
            </div>
            <ol ref={listRef} className="max-h-[22rem] lg:max-h-[30rem] overflow-y-auto p-1.5">
              {sentences.map((s, i) => {
                const best = progress[s.id]?.best || 0;
                const tried = Boolean(progress[s.id]?.attempts);
                const active = i === safeIndex;
                return (
                  <li key={s.id} data-row={i}>
                    <button
                      type="button"
                      aria-current={active ? 'true' : undefined}
                      onClick={() => goTo(i)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                        active ? 'bg-primary-soft' : 'hover:bg-surface-2'
                      }`}
                    >
                      <span className="w-6 text-xs text-ink-subtle tabular-nums shrink-0">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span lang="zh-CN" className={`block truncate font-['Noto_Sans_SC'] ${active ? 'text-primary font-medium' : 'text-ink'}`}>
                          {s.hanzi}
                        </span>
                        <span className="block truncate text-xs text-ink-subtle">
                          {SOURCE_LABELS[s.source]} · {s.sourceLabel}
                        </span>
                      </span>
                      {tried && (
                        <span
                          className={`shrink-0 text-xs font-semibold tabular-nums ${best ? scoreTone(best) : 'text-ink-subtle'}`}
                          aria-label={best ? `Điểm cao nhất ${best}` : 'Đã luyện'}
                        >
                          {best || '✓'}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="rounded-2xl bg-surface border border-border px-4 py-2 space-y-3">
            <button
              type="button"
              aria-expanded={isAddOpen}
              onClick={() => setIsAddOpen((v) => !v)}
              className="w-full min-h-11 flex items-center justify-between gap-2 text-sm font-semibold text-ink cursor-pointer"
            >
              <span className="inline-flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" aria-hidden="true" />
                Thêm đoạn văn của bạn
              </span>
              <span className="text-xs font-normal text-ink-subtle">vào HSK {level}</span>
            </button>
            {isAddOpen && (
              <div className="space-y-2.5 animate-rise-in">
                <input
                  type="text"
                  value={passageTitle}
                  onChange={(e) => setPassageTitle(e.target.value)}
                  placeholder="Tên (VD: Bài khóa 5)"
                  aria-label="Tên đoạn văn"
                  className="w-full min-h-10 px-3 rounded-xl bg-surface-2 border border-border text-sm text-ink placeholder:text-ink-subtle"
                />
                <textarea
                  rows={4}
                  value={passageText}
                  onChange={(e) => setPassageText(e.target.value)}
                  placeholder="Dán đoạn tiếng Trung, mỗi câu kết thúc bằng 。！？"
                  aria-label="Nội dung tiếng Trung"
                  className="w-full p-3 rounded-xl bg-surface-2 border border-border text-sm text-ink placeholder:text-ink-subtle font-['Noto_Sans_SC',_inherit]"
                />
                <button
                  type="button"
                  disabled={passageSentences.length === 0}
                  onClick={addPassage}
                  className="w-full min-h-10 mb-2 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {passageSentences.length > 0 ? `Thêm ${passageSentences.length} câu` : 'Thêm câu'}
                </button>
              </div>
            )}
            {levelCustom.length > 0 && (
              <ul className="space-y-1 pt-1">
                {levelCustom.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-ink">
                      {p.title} <span className="text-ink-subtle text-xs">· {p.sentences.length} câu</span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Xóa ${p.title}`}
                      onClick={() => removePassage(p.id)}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-ink-muted hover:text-accent hover:bg-surface-2 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
