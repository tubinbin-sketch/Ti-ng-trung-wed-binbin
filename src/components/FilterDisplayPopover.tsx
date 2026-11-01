import React, { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, Check, Eye, EyeOff, ChevronDown, Volume2, Edit3 } from 'lucide-react';
import { HSK3_STAGES, Hsk3LevelFilter, Hsk3StageId } from '../utils/hsk3Engine';

interface FilterDisplayPopoverProps {
  totalSlidesCount: number;
  hsk3LevelFilter: Hsk3LevelFilter;
  hsk3StageFilter: Hsk3StageId;
  showPinyin: boolean;
  showMeaning: boolean;
  strokeSpeedMs: number;
  speechRate: number;
  isDueTodayFilterActive?: boolean;
  onSelectLevel: (level: Hsk3LevelFilter) => void;
  onSelectStage: (stage: Hsk3StageId) => void;
  onToggleDueToday?: () => void;
  onTogglePinyin: () => void;
  onToggleMeaning: () => void;
  onUpdateStrokeSpeed: (ms: number) => void;
  onUpdateSpeechRate: (rate: number) => void;
}

export const FilterDisplayPopover: React.FC<FilterDisplayPopoverProps> = ({
  totalSlidesCount,
  hsk3LevelFilter,
  hsk3StageFilter,
  showPinyin,
  showMeaning,
  strokeSpeedMs,
  speechRate,
  isDueTodayFilterActive = false,
  onSelectLevel,
  onSelectStage,
  onToggleDueToday,
  onTogglePinyin,
  onToggleMeaning,
  onUpdateStrokeSpeed,
  onUpdateSpeechRate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const activeFilterSummary =
    isDueTodayFilterActive
      ? 'Ôn hôm nay'
      : hsk3LevelFilter !== 'all'
      ? hsk3LevelFilter
      : hsk3StageFilter !== 'all'
      ? hsk3StageFilter === 'elementary'
        ? 'Sơ cấp 1-3'
        : hsk3StageFilter === 'intermediate'
        ? 'Trung cấp 4-6'
        : 'Cao cấp 7-9'
      : 'HSK 1–9';

  return (
    <div ref={containerRef} className="relative shrink-0" data-testid="hsk3-filter-panel">
      <button
        type="button"
        data-testid="filter-display-popover-btn"
        onClick={() => setIsOpen((v) => !v)}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 active:scale-95 cursor-pointer whitespace-nowrap border ${
          isOpen || hsk3LevelFilter !== 'all' || hsk3StageFilter !== 'all' || isDueTodayFilterActive
            ? 'bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-[#FAF7F0] border-[#C5B358]/60 shadow-xs'
            : 'bg-white/90 hover:bg-white text-[#0F382E] border-[#0F5243]/20'
        }`}
        title="Bộ lọc cấp độ HSK 3.0 & Tùy chọn hiển thị Pinyin, Nghĩa tiếng Việt, Tốc độ"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-[#C5B358] shrink-0" />
        <span>Bộ lọc &amp; Hiển thị</span>
        <span className="px-1.5 py-0.5 rounded-md bg-black/15 text-xs font-semibold">
          {activeFilterSummary}
        </span>
        <ChevronDown className="w-3.5 h-3.5 opacity-80 shrink-0" />
      </button>

      {isOpen && (
        <div
          data-testid="filter-display-popover-content"
          className="absolute left-0 xl:left-auto xl:right-0 mt-2 w-[min(350px,calc(100vw-2rem))] sm:w-[370px] z-40 rounded-2xl backdrop-blur-xl bg-[#FAF7F0]/98 border border-[#C5B358]/60 shadow-2xl p-4 space-y-3.5 text-sm text-[#0F382E]"
        >
          {/* 1. HSK 3.0 Level Selector */}
          <div className="space-y-1.5">
            <label
              htmlFor="popover-hsk-level-select"
              className="block text-sm font-bold text-[#0F382E]"
            >
              Cấp độ từ vựng HSK 3.0 ({totalSlidesCount} từ):
            </label>
            <select
              id="popover-hsk-level-select"
              aria-label="Chọn cấp độ HSK 1-9"
              data-testid="hsk3-level-dropdown"
              value={hsk3LevelFilter}
              onChange={(e) => onSelectLevel(e.target.value as Hsk3LevelFilter)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#0F5243]/25 text-sm font-bold text-[#0F382E] focus:outline-none focus:border-[#0F5243] cursor-pointer"
            >
              <option value="all">Tất cả cấp HSK 1–9 ({totalSlidesCount} từ)</option>
              <option value="HSK 1">HSK 1 (Sơ cấp)</option>
              <option value="HSK 2">HSK 2 (Sơ cấp)</option>
              <option value="HSK 3">HSK 3 (Sơ cấp)</option>
              <option value="HSK 4">HSK 4 (Trung cấp)</option>
              <option value="HSK 5">HSK 5 (Trung cấp)</option>
              <option value="HSK 6">HSK 6 (Trung cấp)</option>
              <option value="HSK 7-9">HSK 7–9 (Cao cấp)</option>
            </select>

            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {HSK3_STAGES.filter((s) => s.id !== 'all').map((stage) => {
                const isSelected = hsk3StageFilter === stage.id && hsk3LevelFilter === 'all';
                const shortLabel =
                  stage.id === 'elementary'
                    ? 'Sơ cấp 1-3'
                    : stage.id === 'intermediate'
                    ? 'Trung cấp 4-6'
                    : 'Cao cấp 7-9';
                return (
                  <button
                    key={stage.id}
                    type="button"
                    data-testid={`hsk3-stage-filter-${stage.id}`}
                    onClick={() => onSelectStage(isSelected ? 'all' : stage.id)}
                    className={`px-2 py-1.5 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#0F5243] border-[#C5B358] text-[#FAF7F0]'
                        : 'bg-white border-[#0F5243]/15 text-[#3A544B] hover:text-[#0F382E]'
                    }`}
                  >
                    {shortLabel}
                  </button>
                );
              })}
            </div>

            {onToggleDueToday && (
              <div className="pt-2">
                <button
                  type="button"
                  data-testid="filter-srs-due-today-btn"
                  onClick={onToggleDueToday}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                    isDueTodayFilterActive
                      ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white border-amber-800 shadow-sm'
                      : 'bg-white text-[#0F382E] border-[#0F5243]/20 hover:bg-[#FAF7F0]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>⏰</span>
                    <span>Cần ôn tập hôm nay (SRS &amp; Sổ lỗi)</span>
                  </span>
                  {isDueTodayFilterActive && <Check className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>

          {/* 2. Display Toggles: Pinyin & Nghĩa TV */}
          <div className="pt-2.5 border-t border-[#0F5243]/12 space-y-1.5">
            <div className="text-sm font-bold text-[#0F382E]">Chế độ hiển thị trên thẻ:</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="toggle-pinyin-btn"
                onClick={onTogglePinyin}
                className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold transition-colors cursor-pointer ${
                  showPinyin
                    ? 'bg-[#E7ECD9] border-[#0F5243]/30 text-[#0F382E]'
                    : 'bg-white border-[#0F5243]/15 text-[#3A544B]'
                }`}
              >
                {showPinyin ? <Check className="w-4 h-4 text-[#0F5243]" /> : <EyeOff className="w-4 h-4" />}
                <span>Hiện Pinyin</span>
              </button>

              <button
                type="button"
                data-testid="toggle-meaning-btn"
                onClick={onToggleMeaning}
                className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold transition-colors cursor-pointer ${
                  showMeaning
                    ? 'bg-[#E7ECD9] border-[#0F5243]/30 text-[#0F382E]'
                    : 'bg-white border-[#0F5243]/15 text-[#3A544B]'
                }`}
              >
                {showMeaning ? <Check className="w-4 h-4 text-[#0F5243]" /> : <Eye className="w-4 h-4" />}
                <span>Hiện Nghĩa TV</span>
              </button>
            </div>
          </div>

          {/* 3. Stroke & Voice Speed Controls */}
          <div className="pt-2.5 border-t border-[#0F5243]/12 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-bold text-sm text-[#0F382E]">
                <Edit3 className="w-4 h-4 text-[#9B8A3E]" />
                <span>Tốc độ nét viết:</span>
              </span>
              <div className="inline-flex items-center rounded-xl bg-[#E7ECD9] p-0.5 border border-[#0F5243]/15">
                {[
                  { label: 'Chậm', ms: 1000 },
                  { label: 'Vừa', ms: 660 },
                  { label: 'Nhanh', ms: 380 },
                ].map((spd) => (
                  <button
                    key={spd.ms}
                    type="button"
                    data-testid={`stroke-speed-preset-${spd.ms}`}
                    onClick={() => onUpdateStrokeSpeed(spd.ms)}
                    className={`px-2.5 py-1 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                      Math.abs(strokeSpeedMs - spd.ms) < 90
                        ? 'bg-[#0F5243] text-[#FAF7F0]'
                        : 'text-[#3A544B] hover:text-[#0F382E]'
                    }`}
                  >
                    {spd.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-bold text-sm text-[#0F382E]">
                <Volume2 className="w-4 h-4 text-[#9B8A3E]" />
                <span>Tốc độ đọc ({speechRate.toFixed(2).replace(/0$/, '')}x):</span>
              </span>
              <div className="inline-flex items-center rounded-xl bg-[#E7ECD9] p-0.5 border border-[#0F5243]/15">
                {[0.75, 1.0, 1.25].map((rateVal) => (
                  <button
                    key={rateVal}
                    type="button"
                    data-testid={`voice-rate-preset-${rateVal}`}
                    onClick={() => onUpdateSpeechRate(rateVal)}
                    className={`px-2.5 py-1 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                      Math.abs(speechRate - rateVal) < 0.04
                        ? 'bg-[#0F5243] text-[#FAF7F0]'
                        : 'text-[#3A544B] hover:text-[#0F382E]'
                    }`}
                  >
                    {rateVal}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
