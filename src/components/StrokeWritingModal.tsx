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
  setPreferredSpeechRate,
  setPreferredStrokeSpeedMs,
  speakChinese,
  subscribeSlideSettings,
} from '../utils/speech';

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
  const baseChar: StrokeData =
    slide.characters[activeCharIdx] || slide.characters[0];
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
        setHydratedCharMap((prev) => ({
          ...prev,
          [chObj.char]: cdnData,
        }));
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

  // Smooth human-like brush cadence animation (progressive reveal within each stroke + natural pause between strokes)
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
      // Natural brush easing: press-in -> fluid glide -> gentle lift
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
  }, [
    isAnimating,
    strokeSpeedMs,
    currentChar.char,
    currentChar.strokeCount,
    currentChar.hanziWriterStrokes,
  ]);

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
    if (mode !== 'practice') {
      setMode('practice');
    }
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
    return pts
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`)
      .join(' ');
  };

  // Compute current brush tip coordinates along active stroke points for natural handwriting feel
  const getBrushTipPoint = (pts: number[][] | undefined, progressPct: number): [number, number] | null => {
    if (!pts || pts.length === 0) return null;
    if (pts.length === 1) return [pts[0][0], pts[0][1]];
    const exactIdx = (Math.max(0, Math.min(100, progressPct)) / 100) * (pts.length - 1);
    const low = Math.floor(exactIdx);
    const high = Math.min(pts.length - 1, Math.ceil(exactIdx));
    const ratio = exactIdx - low;
    const x = pts[low][0] + (pts[high][0] - pts[low][0]) * ratio;
    const y = pts[low][1] + (pts[high][1] - pts[low][1]) * ratio;
    return [x, y];
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

  const activeStrokePts = currentChar.strokePoints[animatedStrokeIndex - 1];
  const activeBrushTip =
    mode === 'animate' && isAnimating
      ? getBrushTipPoint(activeStrokePts, strokeSubProgress)
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Tập viết chữ Hán ${slide.hanzi}`}
    >
      <div className="w-full max-w-md rounded-2xl bg-[#181B20] border border-[#2D333B] text-[#F3F5EC] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-white">
              Viết chữ Mễ (米字格):{' '}
              <span className="font-['Noto_Sans_SC'] text-[#E5A970]">{slide.hanzi}</span> ({slide.pinyin})
            </h3>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Chữ <strong className="text-white">{currentChar.char}</strong> · Bộ thủ: {currentChar.radical} · Tổng số nét:{' '}
              <strong className="text-[#6EE7B7]">{totalStrokes} nét</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ tập viết"
            className="p-2 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Character Selector Tabs */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {slide.characters.map((ch, idx) => (
              <button
                key={`${ch.char}-${idx}`}
                type="button"
                onClick={() => setActiveCharIdx(idx)}
                className={`w-10 h-10 rounded-lg font-['Noto_Sans_SC'] text-lg font-medium transition-colors ${
                  activeCharIdx === idx
                    ? 'bg-[#D9534F] text-white'
                    : 'bg-[#252A32] text-[#D1D5DB] hover:bg-[#303640]'
                }`}
              >
                {ch.char}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => speakChinese(slide.hanzi, speechRate)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#252A32] text-[#E5A970] hover:bg-[#323842] transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5" />
            Nghe ({speechRate.toFixed(2).replace(/\.00$/, '.0')}x)
          </button>
        </div>

        {/* Compact Stroke & Voice Speed Control Bar in Modal */}
        <div className="mb-3 p-2.5 rounded-xl bg-[#13161B] border border-[#282E38] flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-[#A7F3D0] font-semibold">
            <Sliders className="w-3.5 h-3.5 text-[#DFC470]" />
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
                className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                  Math.abs(strokeSpeedMs - item.ms) < 90
                    ? 'bg-[#1E3227] text-[#F7E29C] border border-[#DFC470]/60'
                    : 'bg-[#1E232B] text-[#9CA3AF] hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-[#D1D5DB]">
            <span>Giọng:</span>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={speechRate}
              onChange={(e) => setPreferredSpeechRate(parseFloat(e.target.value))}
              className="w-16 accent-[#DFC470] cursor-pointer"
              aria-label="Tốc độ giọng đọc AI trong cửa sổ tập viết"
            />
            <span className="text-[#F7E29C] font-semibold tabular-nums">
              {speechRate.toFixed(2).replace(/0$/, '')}x
            </span>
          </div>
        </div>

        {/* Stroke Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[#9CA3AF] tabular-nums">
              Tiến độ từng nét: <strong className="text-white">{currentProgressCount}/{totalStrokes} nét</strong>
            </span>
            <span className="text-[#A7F3D0] font-semibold tabular-nums">
              {practiceAccuracy !== null
                ? `Độ chính xác: ${practiceAccuracy}%`
                : `${progressPct}% hoàn thành`}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#252A32] overflow-hidden">
            <div
              className="h-full bg-[#E05A47] transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Mi Zi Ge (米字格) Interactive Canvas Box */}
        <div className="relative mx-auto w-64 h-64 rounded-2xl bg-[#111317] border-2 border-[#3A424E] overflow-hidden select-none touch-none">
          <svg
            ref={svgBoxRef}
            viewBox="0 0 100 100"
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
            <defs>
              {/* Calligraphic Ink/Chalk Pressure Gradients (đậm nhạt tự nhiên) */}
              <linearGradient id="modalDoneStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFBEB" />
                <stop offset="55%" stopColor="#F3F5EC" />
                <stop offset="100%" stopColor="#CBD5E1" />
              </linearGradient>
              <linearGradient id="modalActiveStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE68A" />
                <stop offset="35%" stopColor="#F97316" />
                <stop offset="100%" stopColor="#E05A47" />
              </linearGradient>
              {/* Progressive Brush Mask for Active Stroke */}
              {currentChar.strokes[animatedStrokeIndex - 1] && (
                <mask id="modalActiveBrushMask" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
                  <path
                    d={currentChar.strokes[animatedStrokeIndex - 1]}
                    pathLength={100}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="28"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="100"
                    strokeDashoffset={Math.max(0, 100 - strokeSubProgress)}
                  />
                </mask>
              )}
            </defs>

            {/* Outer Rice-Grid Border & 8-Direction Mi Zi Ge Guide Lines */}
            <rect x="2" y="2" width="96" height="96" fill="none" stroke="#282E38" strokeWidth="0.8" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#2B323C" strokeWidth="0.8" strokeDasharray="2.5 2.5" />
            <line x1="50" y1="0" x2="50" y2="100" stroke="#2B323C" strokeWidth="0.8" strokeDasharray="2.5 2.5" />
            <line x1="0" y1="0" x2="100" y2="100" stroke="#242A33" strokeWidth="0.7" strokeDasharray="2.5 2.5" />
            <line x1="100" y1="0" x2="0" y2="100" stroke="#242A33" strokeWidth="0.7" strokeDasharray="2.5 2.5" />

            {hasAuthenticOutlines ? (
              <>
                <g transform="scale(0.09765625, -0.09765625) translate(0, -900)">
                  {currentChar.hanziWriterStrokes!.map((d, idx) => {
                    const isNextTarget = mode === 'practice' && idx === userStrokes.length;
                    const isCompletedPractice = mode === 'practice' && idx < userStrokes.length;
                    return (
                      <path
                        key={`modal-hw-guide-${idx}`}
                        d={d}
                        fill={
                          isCompletedPractice
                            ? '#10B981'
                            : isNextTarget
                            ? '#475569'
                            : '#232A34'
                        }
                      />
                    );
                  })}

                  {/* Completed Prior Strokes with Calligraphic Chalk Gradient */}
                  {mode === 'animate' &&
                    currentChar.hanziWriterStrokes!
                      .slice(0, Math.max(0, animatedStrokeIndex - 1))
                      .map((d, idx) => (
                        <path
                          key={`modal-hw-done-${idx}`}
                          d={d}
                          fill="url(#modalDoneStrokeGrad)"
                        />
                      ))}
                </g>

                {/* Active Stroke Progressive Brush Reveal with Calligraphic Pressure Shading */}
                {mode === 'animate' &&
                  currentChar.hanziWriterStrokes![animatedStrokeIndex - 1] && (
                    <g
                      mask={
                        currentChar.strokes[animatedStrokeIndex - 1]
                          ? 'url(#modalActiveBrushMask)'
                          : undefined
                      }
                    >
                      <g transform="scale(0.09765625, -0.09765625) translate(0, -900)">
                        <path
                          d={currentChar.hanziWriterStrokes![animatedStrokeIndex - 1]}
                          fill="url(#modalActiveStrokeGrad)"
                        />
                      </g>
                    </g>
                  )}
              </>
            ) : (
              <>
                {currentChar.strokes.map((pathStr, idx) => {
                  const isNextPracticeStroke =
                    mode === 'practice' && idx === userStrokes.length;
                  return (
                    <path
                      key={`guide-${idx}`}
                      d={pathStr}
                      fill="none"
                      stroke={isNextPracticeStroke ? '#526074' : '#2D3440'}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                })}

                {mode === 'animate' &&
                  currentChar.strokes.slice(0, animatedStrokeIndex).map((pathStr, idx) => {
                    const isCurrent = idx === animatedStrokeIndex - 1;
                    return (
                      <path
                        key={`anim-${idx}`}
                        d={pathStr}
                        pathLength={100}
                        fill="none"
                        stroke={isCurrent ? 'url(#modalActiveStrokeGrad)' : 'url(#modalDoneStrokeGrad)'}
                        strokeWidth={isCurrent ? '7' : '6.2'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={isCurrent ? '100' : undefined}
                        strokeDashoffset={isCurrent ? Math.max(0, 100 - strokeSubProgress) : undefined}
                      />
                    );
                  })}
              </>
            )}

            {/* Calligraphic Brush Spine & Starting Press Nib (顿笔) on Active Stroke */}
            {mode === 'animate' && currentChar.strokes[animatedStrokeIndex - 1] && (
              <>
                {activeStrokePts?.[0] && (
                  <circle
                    cx={activeStrokePts[0][0]}
                    cy={activeStrokePts[0][1]}
                    r="2.4"
                    fill="#FDE68A"
                    opacity="0.95"
                  />
                )}
                <path
                  d={currentChar.strokes[animatedStrokeIndex - 1]}
                  pathLength={100}
                  fill="none"
                  stroke="#FDE68A"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="100"
                  strokeDashoffset={Math.max(0, 100 - strokeSubProgress)}
                  opacity="0.9"
                />
                {activeBrushTip && (
                  <g transform={`translate(${activeBrushTip[0]}, ${activeBrushTip[1]})`}>
                    <circle cx="0" cy="0" r="3.6" fill="#FDE68A" opacity="0.35" />
                    <circle cx="0" cy="0" r="1.9" fill="#FFFBEB" />
                  </g>
                )}
              </>
            )}

            {/* User Practice Strokes with Natural Brush Pressure Dual-Layer */}
            {mode === 'practice' &&
              userStrokes.map((pts, idx) => (
                <g key={`user-${idx}`}>
                  {pts[0] && (
                    <circle cx={pts[0][0]} cy={pts[0][1]} r="3.2" fill="#E05A47" opacity="0.85" />
                  )}
                  <path
                    d={pointsToSvgPath(pts)}
                    fill="none"
                    stroke="url(#modalActiveStrokeGrad)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={pointsToSvgPath(pts)}
                    fill="none"
                    stroke="#FDE68A"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.65"
                  />
                </g>
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

        {/* Instruction text */}
        <p className="text-center text-xs text-[#9CA3AF] mt-3">
          {mode === 'animate'
            ? 'Nhịp bút thuận tự nhiên có độ nhấn đậm nhạt trên từng nét chữ Hán.'
            : 'Viết theo nét gợi ý sáng màu trên ô chữ Mễ để chấm điểm độ chính xác.'}
        </p>

        {/* Primary Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          <button
            type="button"
            onClick={handleStartAnimate}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'animate'
                ? 'bg-[#3B82F6] text-white'
                : 'bg-[#252A32] text-[#E5E7EB] hover:bg-[#323842]'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            Xem viết mẫu
          </button>

          <button
            type="button"
            onClick={() => {
              setIsAnimating(false);
              setMode('practice');
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'practice'
                ? 'bg-[#D9534F] text-white'
                : 'bg-[#252A32] text-[#E5E7EB] hover:bg-[#323842]'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Tập viết
          </button>

          <button
            type="button"
            onClick={handleSimulateHandwritingStroke}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#252A32] text-[#E5A970] hover:bg-[#323842] transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Vẽ nét mẫu
          </button>

          <button
            type="button"
            onClick={handleResetPractice}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#252A32] text-[#D1D5DB] hover:bg-[#323842] transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Xóa viết lại
          </button>
        </div>

        {/* Footer buttons */}
        <div className="mt-5 pt-4 border-t border-[#2D333B] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onToggleLearned(slide.id)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              slide.learned
                ? 'bg-[#1E3227] text-[#A7F3D0] border border-[#3F6852]'
                : 'bg-[#252A32] text-[#D1D5DB] hover:bg-[#303640]'
            }`}
          >
            <Check className="w-4 h-4" />
            {slide.learned ? 'Đã đánh dấu học xong' : 'Đánh dấu đã học xong'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-[#2D333B] text-white hover:bg-[#3B424C] transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
