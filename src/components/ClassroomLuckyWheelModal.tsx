import React, { useMemo, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { ClassStudent } from './ClassroomManager';
import { playGentleChime, speakChinese } from '../utils/speech';

export interface ClassroomLuckyWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentsList: ClassStudent[];
  onAwardBonusPoints: (studentId: string, points: number, reason: string) => void;
}

export const ClassroomLuckyWheelModal: React.FC<ClassroomLuckyWheelModalProps> = ({
  isOpen,
  onClose,
  studentsList,
  onAwardBonusPoints,
}) => {
  const [wheelModeTab, setWheelModeTab] = useState<'wheel' | 'match'>('wheel');
  const [isSpinningWheel, setIsSpinningWheel] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [selectedWheelStudentId, setSelectedWheelStudentId] = useState<string>(() =>
    studentsList[0]?.id || ''
  );
  const [bonusToastMessage, setBonusToastMessage] = useState<string | null>(null);

  const CLASS_MATCH_PAIRS = useMemo(
    () => [
      { pairId: 'p-1', hanzi: '温暖', pinyin: 'wēnnuǎn', meaning: 'ấm áp' },
      { pairId: 'p-2', hanzi: '空调', pinyin: 'kōngtiáo', meaning: 'điều hòa' },
      { pairId: 'p-3', hanzi: '洗衣机', pinyin: 'xǐyījī', meaning: 'máy giặt' },
      { pairId: 'p-4', hanzi: '初中', pinyin: 'chūzhōng', meaning: 'cấp 2' },
    ],
    []
  );

  const [selectedMatchCard, setSelectedMatchCard] = useState<{
    pairId: string;
    side: 'hanzi' | 'meaning';
  } | null>(null);
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const selectedWheelStudent =
    studentsList.find((s) => s.id === selectedWheelStudentId) || studentsList[0];

  const handleSpinWheel = () => {
    if (isSpinningWheel || studentsList.length === 0) return;
    setIsSpinningWheel(true);
    playGentleChime();

    const extraSpins = 5 + Math.floor(Math.random() * 4);
    const targetIdx = Math.floor(Math.random() * studentsList.length);
    const targetStudent = studentsList[targetIdx];
    const segmentAngle = 360 / Math.max(1, studentsList.length);
    const newRotation =
      wheelRotation + extraSpins * 360 + (360 - (targetIdx * segmentAngle) % 360);

    setWheelRotation(newRotation);

    setTimeout(() => {
      setSelectedWheelStudentId(targetStudent.id);
      setIsSpinningWheel(false);
      playGentleChime();
    }, 750);
  };

  const handleAwardBonus = (studentId: string, points: number, reason: string) => {
    onAwardBonusPoints(studentId, points, reason);
    setBonusToastMessage(`Đã cộng +${points}đ cho học viên!`);
    playGentleChime();
    setTimeout(() => {
      setBonusToastMessage(null);
    }, 2800);
  };

  const handleSelectMatchCard = (
    pairId: string,
    side: 'hanzi' | 'meaning',
    hanziToSpeak?: string
  ) => {
    if (hanziToSpeak) {
      speakChinese(hanziToSpeak);
    }
    if (!selectedMatchCard) {
      setSelectedMatchCard({ pairId, side });
      return;
    }
    if (selectedMatchCard.side === side) {
      setSelectedMatchCard({ pairId, side });
      return;
    }
    if (selectedMatchCard.pairId === pairId) {
      setMatchedPairIds((prev) => (prev.includes(pairId) ? prev : [...prev, pairId]));
      playGentleChime();
      setSelectedMatchCard(null);
    } else {
      setSelectedMatchCard(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      data-testid="lucky-wheel-modal"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[#FAFBF7] border-2 border-[#9B8A3E] rounded-3xl shadow-2xl p-5 sm:p-6 flex flex-col max-h-[90vh] overflow-y-auto text-[#1E3227] space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[rgba(30,50,39,0.15)]">
          <div>
            <div className="text-xs font-bold text-[#9B8A3E] uppercase tracking-wider">
              Mini-Game Tương Tác Lớp Học · Kết nối trực tiếp Sổ Điểm ({studentsList.length} Học viên)
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[#1E3227] mt-0.5">
              🎡 Vòng Quay Gọi Tên Ngẫu Nhiên &amp; Ghép Thẻ Từ Vựng
            </h3>
          </div>
          <button
            type="button"
            data-testid="close-lucky-wheel-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-[#F4F6EE] border border-[rgba(30,50,39,0.15)] text-[#1E3227] flex items-center justify-center text-xs font-bold cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#E7ECD9]/65 p-2 rounded-2xl border border-[#1E3227]/15">
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="lucky-wheel-tab-wheel"
              onClick={() => setWheelModeTab('wheel')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                wheelModeTab === 'wheel'
                  ? 'bg-[#1E3227] text-white shadow-xs'
                  : 'bg-white text-[#1E3227] hover:bg-[#FAFBF7]'
              }`}
            >
              🎡 Vòng Quay Gọi Tên ({studentsList.length} HV)
            </button>
            <button
              type="button"
              data-testid="lucky-wheel-tab-match"
              onClick={() => setWheelModeTab('match')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                wheelModeTab === 'match'
                  ? 'bg-[#1E3227] text-white shadow-xs'
                  : 'bg-white text-[#1E3227] hover:bg-[#FAFBF7]'
              }`}
            >
              🃏 Ghép Thẻ Từ Vựng Nhanh ({matchedPairIds.length}/{CLASS_MATCH_PAIRS.length})
            </button>
          </div>

          {selectedWheelStudent && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#3F5447] font-semibold">Đang gọi tên:</span>
              <select
                data-testid="wheel-student-select"
                value={selectedWheelStudent.id}
                onChange={(e) => setSelectedWheelStudentId(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-white border border-[#9B8A3E]/60 text-xs font-bold text-[#1E3227]"
              >
                {studentsList.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.totalPoints}đ)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {bonusToastMessage && (
          <div
            data-testid="lucky-wheel-bonus-toast"
            className="p-3 rounded-2xl bg-[#E7ECD9] border border-[#1E3227]/30 text-xs font-bold text-[#1E3227] flex items-center gap-2 shadow-2xs"
          >
            <CheckCircle2 className="w-4 h-4 text-[#065F46] shrink-0" />
            <span>{bonusToastMessage}</span>
          </div>
        )}

        {wheelModeTab === 'wheel' ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* Left: Interactive Visual Wheel */}
            <div className="md:col-span-6 flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-[rgba(30,50,39,0.12)]">
              <div className="relative w-52 h-52 flex items-center justify-center">
                {/* Top Pointer */}
                <div className="absolute -top-2 z-20 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-[#B91C1C] drop-shadow" />
                <svg
                  viewBox="0 0 200 200"
                  className="w-full h-full rounded-full border-4 border-[#9B8A3E] shadow-md transition-transform duration-700 ease-out"
                  style={{ transform: `rotate(${wheelRotation}deg)` }}
                >
                  <circle cx="100" cy="100" r="96" fill="#1E3227" />
                  {studentsList.slice(0, 8).map((st, idx, arr) => {
                    const angle = (360 / arr.length) * idx;
                    const rad = ((angle - 90) * Math.PI) / 180;
                    const tx = 100 + 58 * Math.cos(rad);
                    const ty = 100 + 58 * Math.sin(rad);
                    const shortName = st.name.split(' ').slice(-2).join(' ');
                    return (
                      <g key={st.id}>
                        <line
                          x1="100"
                          y1="100"
                          x2={100 + 95 * Math.cos(rad)}
                          y2={100 + 95 * Math.sin(rad)}
                          stroke="#C5B358"
                          strokeWidth="1"
                          strokeOpacity="0.45"
                        />
                        <text
                          x={tx}
                          y={ty}
                          fill={idx % 2 === 0 ? '#FAFBF7' : '#F3D778'}
                          fontSize="8.5"
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          {shortName}
                        </text>
                      </g>
                    );
                  })}
                  <circle cx="100" cy="100" r="22" fill="#9B8A3E" stroke="#FAFBF7" strokeWidth="3" />
                  <text
                    x="100"
                    y="104"
                    fill="#1E3227"
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    龍
                  </text>
                </svg>
              </div>

              <button
                type="button"
                data-testid="spin-lucky-wheel-btn"
                disabled={isSpinningWheel || studentsList.length === 0}
                onClick={handleSpinWheel}
                className="mt-4 px-5 py-2.5 rounded-xl bg-[#1E3227] hover:bg-[#2B4637] text-white text-xs font-bold border border-[#9B8A3E] shadow-sm transition-all cursor-pointer disabled:opacity-60"
              >
                {isSpinningWheel ? '🎡 Đang quay chọn học viên...' : '🎡 Quay gọi tên ngẫu nhiên'}
              </button>
            </div>

            {/* Right: Selected Student & Instant Bonus Points */}
            <div className="md:col-span-6 space-y-3">
              {selectedWheelStudent ? (
                <div
                  data-testid="selected-wheel-student-card"
                  className="p-4 rounded-2xl bg-white border-2 border-[#9B8A3E]/70 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#1E3227] text-[#C5B358] text-xs font-bold uppercase">
                      Học viên được gọi tên
                    </span>
                    <span className="text-xs font-mono font-bold text-[#5F7266]">
                      {selectedWheelStudent.studentCode} · {selectedWheelStudent.hskLevel}
                    </span>
                  </div>

                  <div>
                    <div
                      data-testid="selected-wheel-student-name"
                      className="text-xl font-bold text-[#1E3227]"
                    >
                      {selectedWheelStudent.name}
                    </div>
                    <div className="text-xs text-[#3F5447] mt-1 flex items-center gap-3">
                      <span>
                        Điểm hiện tại:{' '}
                        <strong
                          data-testid="selected-wheel-student-points"
                          className="text-base text-[#1E3227] tabular-nums"
                        >
                          {selectedWheelStudent.totalPoints}đ
                        </strong>
                      </span>
                      <span>·</span>
                      <span>Từ vựng: <strong>{selectedWheelStudent.vocabScore}</strong></span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E5E9DC] space-y-2">
                    <div className="text-xs font-bold text-[#1E3227]">
                      Thưởng điểm trực tiếp vào Bảng điểm:
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        data-testid="award-bonus-5-btn"
                        onClick={() =>
                          handleAwardBonus(
                            selectedWheelStudent.id,
                            5,
                            'Trả lời đúng câu hỏi Vòng quay trên lớp'
                          )
                        }
                        className="py-2 px-3 rounded-xl bg-[#E7ECD9] hover:bg-[#1E3227] text-[#1E3227] hover:text-white border border-[#9B8A3E]/60 text-xs font-bold transition-all cursor-pointer"
                      >
                        ⭐ +5 điểm thưởng
                      </button>
                      <button
                        type="button"
                        data-testid="award-bonus-10-btn"
                        onClick={() =>
                          handleAwardBonus(
                            selectedWheelStudent.id,
                            10,
                            'Phản xạ xuất sắc Vòng quay & Ghép thẻ'
                          )
                        }
                        className="py-2 px-3 rounded-xl bg-[#1E3227] hover:bg-[#2B4637] text-[#FAFBF7] border border-[#9B8A3E] text-xs font-bold transition-all cursor-pointer"
                      >
                        🏆 +10 điểm thưởng
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white text-xs text-[#5F7266]">
                  Chưa có học viên trong danh sách lớp.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Tab 2: Card Matching Mini-Game */
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-[#3F5447]">
                Chọn 1 thẻ <strong>Chữ Hán</strong> bên trái và ghép với thẻ <strong>Pinyin + Nghĩa</strong> tương ứng bên phải:
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMatchedPairIds([]);
                    setSelectedMatchCard(null);
                  }}
                  className="px-3 py-1 rounded-lg bg-white border border-[rgba(30,50,39,0.2)] text-xs font-semibold text-[#1E3227] cursor-pointer"
                >
                  Chơi lại ván mới
                </button>
                {selectedWheelStudent && (
                  <button
                    type="button"
                    data-testid="match-game-award-10-btn"
                    onClick={() =>
                      handleAwardBonus(
                        selectedWheelStudent.id,
                        10,
                        'Chiến thắng Mini-Game Ghép Thẻ Từ Vựng'
                      )
                    }
                    className="px-3 py-1 rounded-lg bg-[#1E3227] text-white text-xs font-bold cursor-pointer"
                  >
                    🏆 Thưởng +10đ cho {selectedWheelStudent.name}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {CLASS_MATCH_PAIRS.map((item) => {
                const isMatched = matchedPairIds.includes(item.pairId);
                const isSelected =
                  selectedMatchCard?.pairId === item.pairId &&
                  selectedMatchCard?.side === 'hanzi';
                return (
                  <button
                    key={`hz-${item.pairId}`}
                    type="button"
                    disabled={isMatched}
                    onClick={() => handleSelectMatchCard(item.pairId, 'hanzi', item.hanzi)}
                    className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                      isMatched
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800 opacity-75'
                        : isSelected
                        ? 'bg-[#1E3227] text-white border-[#9B8A3E] shadow-sm'
                        : 'bg-white hover:bg-[#FAFBF7] border-[rgba(30,50,39,0.2)] text-[#1E3227]'
                    }`}
                  >
                    <div className="text-2xl font-bold font-['Noto_Serif_SC']">{item.hanzi}</div>
                    <div className="text-xs mt-1 opacity-75">Thẻ Chữ Hán</div>
                  </button>
                );
              })}

              {CLASS_MATCH_PAIRS.map((item) => {
                const isMatched = matchedPairIds.includes(item.pairId);
                const isSelected =
                  selectedMatchCard?.pairId === item.pairId &&
                  selectedMatchCard?.side === 'meaning';
                return (
                  <button
                    key={`mn-${item.pairId}`}
                    type="button"
                    disabled={isMatched}
                    onClick={() => handleSelectMatchCard(item.pairId, 'meaning')}
                    className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                      isMatched
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800 opacity-75'
                        : isSelected
                        ? 'bg-[#1E3227] text-white border-[#9B8A3E] shadow-sm'
                        : 'bg-white hover:bg-[#FAFBF7] border-[rgba(30,50,39,0.2)] text-[#1E3227]'
                    }`}
                  >
                    <div className="text-xs font-bold text-[#9B8A3E]">{item.pinyin}</div>
                    <div className="text-xs font-semibold mt-0.5">{item.meaning}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
