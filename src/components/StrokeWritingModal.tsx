import React, { useEffect, useRef, useState } from 'react';
import { Play, Edit3, Volume2, RotateCcw, Check, X, Sparkles, Sliders } from 'lucide-react';
import { StrokeData, VocabSlide } from '../data/chineseData';
import {
  evaluateStrokeSimilarity,
  fetchHanziWriterCharacter,
} from '../utils/chineseEngine';
import {
  getPreferredSpeechRate,
  getPreferredStrokeSpeedMs,
  setPreferredStrokeSpeedMs,
  speakChinese,
  subscribeSlideSettings,
} from '../utils/speech';
import { Dialog } from './ui/Dialog';

interface StrokeWritingModalProps {
  slide: VocabSlide;
  onClose: () => void;
  onToggleLearned: (slideId: string) => void;
}

export const StrokeWritingModal: React.FC<StrokeWritingModalProps> = ({
  slide,
  onClose,
  onToggleLearned,
}) => {
  const [activeCharIdx, setActiveCharIdx] = useState(0);
  const [hydratedCharMap, setHydratedCharMap] = useState<Record<string, StrokeData>>({});
  const [mode, setMode] = useState<'animate' | 'practice'>('animate');
  const [animatedStrokeIndex, setAnimatedStrokeIndex] = useState<number>(1);
  const [strokeSubProgress, setStrokeSubProgress] = useState<number>(100);
  const [isAnimating, setIsAnimating] = useState(true);
  const [userStrokes, setUserStrokes] = useState<number[][][]>([]);
  const [currentStroke, setCurrentStroke] = useState<number[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [practiceAccuracy, setPracticeAccuracy] = useState<number | null>(null);
  const [strokeSpeedMs, setStrokeSpeedMs] = useState<number>(() => getPreferredStrokeSpeedMs());
  const [speechRate, setSpeechRate] = useState<number>(() => getPreferredSpeechRate());

  const svgBoxRef = useRef<SVGSVGElement | null>(null);
  const baseChar: StrokeData = slide.characters[activeCharIdx] || slide.characters[0];
  const currentChar: StrokeData = hydratedCharMap[baseChar.char] || baseChar;

  useEffect(() => {
    return subscribeSlideSettings(() => {
      setStrokeSpeedMs(getPreferredStrokeSpeedMs());
      setSpeechRate(getPreferredSpeechRate());
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const pinyinParts = slide.pinyin.split(/\s+/);
    slide.characters.forEach((chObj, idx) => {
      fetchHanziWriterCharacter(
        chObj.char,
        pinyinParts[idx] || chObj.pinyin,
        chObj.radical
      ).then((cdnData) => {
        if (cancelled) return;
        setHydratedCharMap((prev) => ({ ...prev, [chObj.char]: cdnData }));
      });
    });
    return () => {
      cancelled = true;
    };
  }, [slide]);

  useEffect(() => {
    setUserStrokes([]);
    setCurrentStroke([]);
    setPracticeAccuracy(null);
    setMode('animate');
    setIsAnimating(true);
  }, [activeCharIdx]);

  useEffect(() => {
    const total = Math.max(
      1,
      currentChar.hanziWriterStrokes?.length ||
        currentChar.strokes.length ||
        currentChar.strokeCount
    );
    if (!isAnimating) {
      setAnimatedStrokeIndex(total);
      setStrokeSubProgress(100);
      return;
    }

    let currentStep = 1;
    let stepStartTime = performance.now();
    setAnimatedStrokeIndex(1);
    setStrokeSubProgress(0);

    const intervalId = window.setInterval(() => {
      const now = performance.now();
      const elapsed = now - stepStartTime;
      const drawDuration = Math.max(200, strokeSpeedMs * 0.78);
      const rawRatio = Math.min(1, elapsed / drawDuration);
      const eased = 1 - Math.pow(1 - rawRatio, 2.4);
      setStrokeSubProgress(Math.round(eased * 100));

      if (elapsed >= strokeSpeedMs) {
        if (currentStep < total) {
          currentStep += 1;
          stepStartTime = now;
          setAnimatedStrokeIndex(currentStep);
          setStrokeSubProgress(0);
        } else {
          setStrokeSubProgress(100);
          setIsAnimating(false);
          window.clearInterval(intervalId);
        }
      }
    }, 38);

    return () => window.clearInterval(intervalId);
  }, [isAnimating, strokeSpeedMs, currentChar]);

  const handleStartAnimate = () => {
    setMode('animate');
    setIsAnimating(true);
    speakChinese(currentChar.char, speechRate);
  };

  const handleResetPractice = () => {
    setIsAnimating(false);
    setMode('practice');
    setUserStrokes([]);
    setCurrentStroke([]);
    setPracticeAccuracy(null);
  };

  const getRelativePoint = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>
  ): [number, number] | null => {
    const svg = svgBoxRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return null;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  };

  const handlePointerDown = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>
  ) => {
    setIsAnimating(false);
    if (mode !== 'practice') setMode('practice');
    const pt = getRelativePoint(e);
    if (!pt) return;
    setIsDrawing(true);
    setCurrentStroke([pt]);
  };

  const handlePointerMove = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>
  ) => {
    if (!isDrawing) return;
    const pt = getRelativePoint(e);
    if (!pt) return;
    setCurrentStroke((prev) => [...prev, pt]);
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 1) {
      const targetIdx = Math.min(
        userStrokes.length,
        Math.max(0, currentChar.strokePoints.length - 1)
      );
      const evalResult = evaluateStrokeSimilarity(
        currentStroke,
        currentChar.strokePoints[targetIdx] || []
      );
      setUserStrokes((prev) => [...prev, currentStroke]);
      setPracticeAccuracy(evalResult.accuracy);
    }
    setCurrentStroke([]);
  };

  const handleSimulateHandwritingStroke = () => {
    setIsAnimating(false);
    setMode('practice');
    const totalCount = Math.max(
      1,
      currentChar.strokePoints.length || currentChar.hanziWriterStrokes?.length || 1
    );
    const nextIdx = userStrokes.length % totalCount;
    const sampleStroke = currentChar.strokePoints[nextIdx] || [
      [25, 25],
      [75, 75],
    ];
    setUserStrokes((prev) => [...prev, sampleStroke]);
    setPracticeAccuracy(97);
  };

  const pointsToSvgPath = (pts: number[][]): string => {
    if (pts.length === 0) return '';
    return pts.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`).join(' ');
  };

  const totalStrokes =
    currentChar.hanziWriterStrokes?.length ||
    currentChar.strokes.length ||
    currentChar.strokeCount;
  const currentProgressCount =
    mode === 'animate'
      ? Math.min(animatedStrokeIndex, totalStrokes)
      : Math.min(userStrokes.length, totalStrokes);
  const progressPct = Math.min(
    100,
    Math.round((currentProgressCount / Math.max(1, totalStrokes)) * 100)
  );
  const hasAuthenticOutlines =
    Array.isArray(currentChar.hanziWriterStrokes) &&
    currentChar.hanziWriterStrokes.length > 0;

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      labelledBy="stroke-writing-modal-title"
      maxWidthClass="max-w-md"
      testId="stroke-writing-dialog"
    >
      <div className="w-full rounded-3xl bg-canvas border-2 border-border-strong text-ink p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 id="stroke-writing-modal-title" className="text-lg font-bold tracking-tight text-ink">
              Viết chữ Mễ (<span lang="zh-CN">米字格</span>):{' '}
              <span lang="zh-CN" className="font-['Noto_Sans_SC'] text-primary">{slide.hanzi}</span> ({slide.pinyin})
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Chữ <strong lang="zh-CN" className="text-ink">{currentChar.char}</strong> · Bộ thủ: <span lang="zh-CN">{currentChar.radical}</span> · Tổng số nét:{' '}
              <strong className="text-primary">{totalStrokes} nét</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ tập viết"
            className="p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-primary/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {slide.characters.map((ch, idx) => (
              <button
                key={`${ch.char}-${idx}`}
                type="button"
                lang="zh-CN"
                onClick={() => setActiveCharIdx(idx)}
                className={`w-10 h-10 rounded-xl font-['Noto_Sans_SC'] text-lg font-bold transition-colors cursor-pointer ${
                  activeCharIdx === idx
                    ? 'bg-accent text-on-primary'
                    : 'bg-surface text-ink border border-border hover:bg-primary/10'
                }`}
              >
                {ch.char}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => speakChinese(slide.hanzi, speechRate)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-primary text-on-primary hover:opacity-95 transition-colors cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Nghe ({speechRate.toFixed(2).replace(/\.00$/, '.0')}x)</span>
          </button>
        </div>

        <div className="mb-3 p-2.5 rounded-xl bg-surface border border-border flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-ink font-semibold">
            <Sliders className="w-3.5 h-3.5 text-gold" />
            <span>Tốc độ nét:</span>
            {[
              { label: 'Chậm', ms: 1000 },
              { label: 'Vừa', ms: 660 },
              { label: 'Nhanh', ms: 380 },
            ].map((item) => (
              <button
                key={item.ms}
                type="button"
                onClick={() => {
                  setPreferredStrokeSpeedMs(item.ms);
                  setMode('animate');
                  setIsAnimating(true);
                }}
                className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                  Math.abs(strokeSpeedMs - item.ms) < 90
                    ? 'bg-primary text-on-primary'
                    : 'bg-canvas text-ink-muted hover:text-ink'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-ink-muted tabular-nums">
              Tiến độ từng nét: <strong className="text-ink">{currentProgressCount}/{totalStrokes} nét</strong>
            </span>
            <span className="text-primary font-semibold tabular-nums">
              {practiceAccuracy !== null
                ? `Độ chính xác: ${practiceAccuracy}%`
                : `${progressPct}% hoàn thành`}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="relative mx-auto w-64 h-64 rounded-2xl bg-[#111317] border-2 border-border-strong overflow-hidden select-none touch-none">
          <svg
            ref={svgBoxRef}
            viewBox="0 0 100 100"
            role="img"
            aria-label={`Ô Mễ Tự Cách luyện viết chữ Hán ${currentChar.char} (${totalStrokes} nét)`}
            className="w-full h-full cursor-crosshair"
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            data-testid="hanzi-writing-grid"
          >
            <rect x="2" y="2" width="96" height="96" fill="none" stroke="#282E38" strokeWidth="0.8" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#2B323C" strokeWidth="0.8" strokeDasharray="2.5 2.5" />
            <line x1="50" y1="0" x2="50" y2="100" stroke="#2B323C" strokeWidth="0.8" strokeDasharray="2.5 2.5" />
            <line x1="0" y1="0" x2="100" y2="100" stroke="#242A33" strokeWidth="0.7" strokeDasharray="2.5 2.5" />
            <line x1="100" y1="0" x2="0" y2="100" stroke="#242A33" strokeWidth="0.7" strokeDasharray="2.5 2.5" />

            {hasAuthenticOutlines ? (
              <g transform="scale(0.09765625, -0.09765625) translate(0, -900)">
                {currentChar.hanziWriterStrokes!.map((d, idx) => {
                  const isCompletedAnim = mode === 'animate' && idx < animatedStrokeIndex;
                  const isCompletedPractice = mode === 'practice' && idx < userStrokes.length;
                  return (
                    <path
                      key={`modal-hw-guide-${idx}`}
                      d={d}
                      fill={
                        isCompletedAnim
                          ? idx === animatedStrokeIndex - 1
                            ? '#F97316'
                            : '#FAF7F0'
                          : isCompletedPractice
                          ? '#10B981'
                          : '#334155'
                      }
                    />
                  );
                })}
              </g>
            ) : (
              currentChar.strokes.slice(0, animatedStrokeIndex).map((pathStr, idx) => (
                <path
                  key={`anim-${idx}`}
                  d={pathStr}
                  fill="none"
                  stroke={idx === animatedStrokeIndex - 1 ? '#F97316' : '#FAF7F0'}
                  strokeWidth="6.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))
            )}

            {mode === 'practice' &&
              userStrokes.map((pts, idx) => (
                <path
                  key={`user-${idx}`}
                  d={pointsToSvgPath(pts)}
                  fill="none"
                  stroke="#E05A47"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

            {currentStroke.length > 1 && (
              <path
                d={pointsToSvgPath(currentStroke)}
                fill="none"
                stroke="#F59E0B"
                strokeWidth="5.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          <button
            type="button"
            onClick={handleStartAnimate}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              mode === 'animate'
                ? 'bg-primary text-on-primary'
                : 'bg-surface text-ink border border-border'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Xem viết mẫu</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsAnimating(false);
              setMode('practice');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              mode === 'practice'
                ? 'bg-accent text-on-primary'
                : 'bg-surface text-ink border border-border'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Tập viết</span>
          </button>

          <button
            type="button"
            onClick={handleSimulateHandwritingStroke}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-surface text-gold border border-border cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Vẽ nét mẫu</span>
          </button>

          <button
            type="button"
            onClick={handleResetPractice}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-surface text-ink border border-border cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Xóa viết lại</span>
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onToggleLearned(slide.id)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              slide.learned
                ? 'bg-primary text-on-primary'
                : 'bg-surface text-ink border border-border'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>{slide.learned ? 'Đã đánh dấu học xong' : 'Đánh dấu đã học xong'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-surface text-ink border border-border cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </Dialog>
  );
};
