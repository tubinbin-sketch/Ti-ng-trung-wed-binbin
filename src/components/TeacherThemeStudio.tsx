import React, { useState } from 'react';
import { Check, Palette, PlayCircle, Save } from 'lucide-react';
import { TEACHER_THEME_PRESETS, TeacherThemePreset } from '../data/chineseData';

interface TeacherThemeStudioProps {
  selectedTheme: TeacherThemePreset;
  onSelectTheme: (theme: TeacherThemePreset) => void;
}

const ACCENT_OPTIONS = [
  { id: 'olive', label: 'Vàng ô liu', hex: '#9B8A3E' },
  { id: 'terracotta', label: 'Cam đất', hex: '#C85A32' },
  { id: 'jade', label: 'Xanh ngọc', hex: '#0D9488' },
  { id: 'lavender', label: 'Tím oải hương', hex: '#7C3AED' },
  { id: 'wine', label: 'Đỏ rượu', hex: '#9F1239' },
];

export const TeacherThemeStudio: React.FC<TeacherThemeStudioProps> = ({
  selectedTheme,
  onSelectTheme,
}) => {
  const [teacherName, setTeacherName] = useState('Hứa Yến Thư (Lộ Trưởng Lão)');
  const [teacherCert, setTeacherCert] = useState('HSK 8 · Thạc sĩ Giảng dạy Hán ngữ');
  const [teacherEmail, setTeacherEmail] = useState('giaovien.tiengtrung@luzhanglao.com');
  const [selectedAccent, setSelectedAccent] = useState(selectedTheme.accentColor);
  const [saveMessage, setSaveMessage] = useState('');
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  const isDarkTheme = selectedTheme.id === 'moon-night';

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherEmail.trim() || !teacherEmail.includes('@')) {
      setSaveMessage('Vui lòng nhập địa chỉ email hợp lệ để nhận kích hoạt không giới hạn.');
      return;
    }
    onSelectTheme({
      ...selectedTheme,
      accentColor: selectedAccent,
    });
    setSaveMessage(
      `Đã lưu giao diện "${selectedTheme.name}" và đăng ký email ${teacherEmail} nhận gói không giới hạn bài giảng & đề thi thử!`
    );
  };

  return (
    <div
      className={`rounded-3xl border p-5 md:p-7 transition-colors duration-300 ${
        isDarkTheme
          ? 'bg-[#171524] border-[#3B3554] text-[#F3F4F6]'
          : 'bg-[#FAFBF7] border-[#AEB79D] text-[#1E3227]'
      }`}
    >
      {/* Header */}
      <div
        className={`flex flex-wrap items-start justify-between gap-4 pb-5 border-b ${
          isDarkTheme ? 'border-[#2E2944]' : 'border-[#DCE2CE]'
        }`}
      >
        <div className="max-w-2xl">
          <div
            className={`text-xs ${
              isDarkTheme ? 'text-[#C4B5FD]' : 'text-[#3F5447]'
            }`}
          >
            Trang của tôi · https://luzhanglao.com/giao-vien/hua-yen-thu
          </div>
          <h3
            className={`text-xl sm:text-2xl font-bold mt-0.5 leading-snug ${
              isDarkTheme ? 'text-white' : 'text-[#1E3227]'
            }`}
            style={{ textWrap: 'balance' }}
          >
            Tùy chỉnh Trang cá nhân Giáo viên &amp; Gói Không giới hạn
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setShowVideoPlayer((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3227] hover:bg-[#2B4637] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border border-white/10"
        >
          <PlayCircle className="w-4 h-4 text-[#CBCFB8]" />
          {showVideoPlayer ? 'Ẩn Video hướng dẫn gốc' : 'Xem Video hướng dẫn'}
        </button>
      </div>

      {/* Optional Embedded Video Showcase of the User's Attached Video */}
      {showVideoPlayer && (
        <div className="mt-5 rounded-2xl bg-[#16191E] border border-[#2C323D] p-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#CBCFB8]">
              Video giới thiệu nền tảng giảng dạy tiếng Trung HANU × 阮文受
            </span>
            <button
              type="button"
              onClick={() => setShowVideoPlayer(false)}
              className="text-xs text-[#9CA3AF] hover:text-white"
            >
              Đóng video
            </button>
          </div>
          <div className="max-w-md mx-auto rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-96 flex items-center justify-center">
            <video
              src="/assets/aistudio/2HGb6FJTtADnczFwoP8GoghlSc76WXrqBsm0__1__dcb86d09.mp4"
              controls
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Service Package Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
        <div
          className={`rounded-2xl border p-3.5 ${
            isDarkTheme
              ? 'bg-[#221F33] border-[#3B3554]'
              : 'bg-white border-[#D5DEC7]'
          }`}
        >
          <div
            className={`text-[11px] ${
              isDarkTheme ? 'text-[#C4B5FD]' : 'text-[#3F5447]'
            }`}
          >
            Gói hiện tại
          </div>
          <div
            className={`text-sm font-bold mt-0.5 ${
              isDarkTheme ? 'text-white' : 'text-[#1E3227]'
            }`}
          >
            Giáo viên &amp; Gia sư Pro
          </div>
        </div>
        <div
          className={`rounded-2xl border p-3.5 ${
            isDarkTheme
              ? 'bg-[#221F33] border-[#3B3554]'
              : 'bg-white border-[#D5DEC7]'
          }`}
        >
          <div
            className={`text-[11px] ${
              isDarkTheme ? 'text-[#C4B5FD]' : 'text-[#3F5447]'
            }`}
          >
            Lượt tải lên bài giảng
          </div>
          <div
            className={`text-sm font-bold mt-0.5 ${
              isDarkTheme ? 'text-[#6EE7B7]' : 'text-[#065F46]'
            }`}
          >
            Không giới hạn (Tháng 10)
          </div>
        </div>
        <div
          className={`rounded-2xl border p-3.5 ${
            isDarkTheme
              ? 'bg-[#221F33] border-[#3B3554]'
              : 'bg-white border-[#D5DEC7]'
          }`}
        >
          <div
            className={`text-[11px] ${
              isDarkTheme ? 'text-[#C4B5FD]' : 'text-[#3F5447]'
            }`}
          >
            Lượt học sinh thi thử
          </div>
          <div
            className={`text-sm font-bold mt-0.5 ${
              isDarkTheme ? 'text-[#6EE7B7]' : 'text-[#065F46]'
            }`}
          >
            Không giới hạn
          </div>
        </div>
        <div
          className={`rounded-2xl border p-3.5 ${
            isDarkTheme
              ? 'bg-[#221F33] border-[#3B3554]'
              : 'bg-white border-[#D5DEC7]'
          }`}
        >
          <div
            className={`text-[11px] ${
              isDarkTheme ? 'text-[#C4B5FD]' : 'text-[#3F5447]'
            }`}
          >
            Từ vựng hệ thống
          </div>
          <div
            className="text-sm font-bold mt-0.5 tabular-nums"
            style={{ color: selectedAccent }}
          >
            82.120 từ (HSK 1–9)
          </div>
        </div>
      </div>

      {/* Step 1: 5 Theme Presets */}
      <div className="mt-4">
        <div
          className={`flex items-center gap-2 text-sm font-bold mb-1 ${
            isDarkTheme ? 'text-white' : 'text-[#1E3227]'
          }`}
        >
          <Palette className="w-4 h-4" style={{ color: selectedAccent }} />
          <span>Bước 1: Chọn mẫu nền tảng (Đồng bộ biến màu &amp; độ tương phản toàn trang)</span>
        </div>
        <p
          className={`text-xs mb-3 ${
            isDarkTheme ? 'text-[#C4B5FD]' : 'text-[#3F5447]'
          }`}
        >
          Bước 2: Đổi màu nhấn sang tông bạn thích · Bước 3: Xem thử và bấm Lưu giao diện.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {TEACHER_THEME_PRESETS.map((preset) => {
            const isSelected = selectedTheme.id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  onSelectTheme(preset);
                  setSelectedAccent(preset.accentColor);
                }}
                className={`rounded-2xl p-3.5 border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? isDarkTheme
                      ? 'border-[#EAB308] ring-2 ring-[#EAB308]/30 bg-[#26223A] text-white'
                      : 'border-[#1E3227] ring-2 ring-[#1E3227]/20 bg-white text-[#1E3227]'
                    : isDarkTheme
                    ? 'border-[#3B3554] bg-[#201D30] text-[#E5E7EB] hover:bg-[#28243C]'
                    : 'border-[#D5DEC7] bg-[#FAFBF7] text-[#1E3227] hover:bg-white'
                }`}
              >
                <div>
                  {/* Color preview bar */}
                  <div
                    className="h-12 rounded-xl p-2 flex flex-col justify-between border border-black/10"
                    style={{ backgroundColor: preset.bannerTone }}
                  >
                    <div
                      className="w-12 h-2 rounded-full"
                      style={{ backgroundColor: preset.accentColor }}
                    />
                    <div
                      className="w-20 h-2 rounded-full opacity-85"
                      style={{ backgroundColor: preset.bgCanvas }}
                    />
                  </div>
                  <div className="mt-2.5 font-bold text-xs flex items-center justify-between">
                    <span>{preset.name}</span>
                    {isSelected && (
                      <Check
                        className={`w-3.5 h-3.5 ${
                          isDarkTheme ? 'text-[#EAB308]' : 'text-[#065F46]'
                        }`}
                      />
                    )}
                  </div>
                  <div
                    className={`text-[11px] mt-0.5 ${
                      isDarkTheme ? 'text-[#C4B5FD]' : 'text-[#3F5447]'
                    }`}
                  >
                    {preset.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Step 2: Accent Swatches */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span
            className={`text-xs font-semibold mr-1 ${
              isDarkTheme ? 'text-[#C4B5FD]' : 'text-[#3F5447]'
            }`}
          >
            Màu nhấn:
          </span>
          {ACCENT_OPTIONS.map((acc) => (
            <button
              key={acc.id}
              type="button"
              onClick={() => {
                setSelectedAccent(acc.hex);
                onSelectTheme({ ...selectedTheme, accentColor: acc.hex });
              }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                selectedAccent === acc.hex
                  ? isDarkTheme
                    ? 'bg-[#2C2742] border-[#EAB308] text-white'
                    : 'bg-white border-[#1E3227] text-[#1E3227]'
                  : isDarkTheme
                  ? 'bg-[#201D30] border-[#3B3554] text-[#D1D5DB]'
                  : 'bg-[#F4F6EE] border-[#D5DEC7] text-[#3F5447]'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: acc.hex }}
              />
              {acc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Preview of Teacher Landing Page + Teacher Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-stretch">
        {/* Live Preview Card */}
        <div
          className="lg:col-span-7 rounded-2xl p-6 border flex flex-col justify-between transition-colors"
          style={{
            backgroundColor: selectedTheme.bgSurface,
            color: selectedTheme.inkPrimary,
            borderColor: isDarkTheme ? '#4C446E' : '#C5CFB4',
          }}
          data-testid="teacher-live-preview"
        >
          <div
            className="flex items-center justify-between text-xs"
            style={{ color: selectedTheme.inkSecondary }}
          >
            <span className="font-bold" style={{ color: selectedTheme.inkPrimary }}>
              路长老 · {teacherName}
            </span>
            <span>Xem trước Trang Giáo Viên</span>
          </div>

          <div className="my-6 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <div className="sm:col-span-7 space-y-2.5">
              <div
                className="text-xs font-semibold tracking-wider uppercase"
                style={{ color: selectedTheme.inkSecondary }}
              >
                {teacherCert}
              </div>
              <h4
                className="text-2xl sm:text-3xl font-bold leading-tight"
                style={{ color: selectedTheme.inkPrimary }}
              >
                Học hành điều độ.
                <br />
                Ngày ngày tiến bộ.
              </h4>
              <p
                className="text-xs leading-relaxed"
                style={{ color: selectedTheme.inkSecondary }}
              >
                Giúp người Việt học tiếng Trung hiểu sâu, nhớ lâu và nói tự nhiên từ cơ bản đến nâng cao.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <span
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white"
                  style={{ backgroundColor: selectedTheme.bannerTone }}
                >
                  Khám phá khóa học
                </span>
                <span
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border"
                  style={{
                    borderColor: selectedAccent,
                    color: selectedTheme.inkPrimary,
                  }}
                >
                  Học thử qua Zalo
                </span>
              </div>
            </div>

            {/* High-Contrast Frosted Glass Stats Badges */}
            <div className="sm:col-span-5 space-y-2.5">
              <div
                className="rounded-xl p-3.5 text-white border border-white/15"
                style={{ backgroundColor: selectedTheme.bannerTone }}
              >
                <div className="text-[11px] text-white/80">Chứng chỉ cao cấp</div>
                <div className="text-xl font-bold text-white">HSK 8</div>
                <div className="text-[11px] text-white/90">800+ Học viên HSK</div>
              </div>
              <div
                className="rounded-xl p-3.5 border backdrop-blur-md"
                style={{
                  backgroundColor: isDarkTheme
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(255, 255, 255, 0.88)',
                  borderColor: isDarkTheme
                    ? 'rgba(255, 255, 255, 0.18)'
                    : 'rgba(30, 50, 39, 0.14)',
                }}
              >
                <div
                  className="text-lg font-bold tabular-nums"
                  style={{ color: selectedAccent }}
                >
                  82.120
                </div>
                <div
                  className="text-[11px]"
                  style={{ color: selectedTheme.inkSecondary }}
                >
                  Từ vựng đã học &amp; thực hành
                </div>
              </div>
            </div>
          </div>

          <div
            className="text-[11px] pt-3 border-t flex items-center justify-between"
            style={{
              color: selectedTheme.inkSecondary,
              borderColor: isDarkTheme
                ? 'rgba(255,255,255,0.12)'
                : 'rgba(0,0,0,0.08)',
            }}
          >
            <span>Mẫu đang chọn: {selectedTheme.name}</span>
            <span>Tích hợp Trình chiếu · Tập viết · Quiz Game</span>
          </div>
        </div>

        {/* Teacher Info & Unlimited Registration Form */}
        <form
          onSubmit={handleSaveSettings}
          className={`lg:col-span-5 rounded-2xl border p-6 flex flex-col justify-between space-y-3.5 ${
            isDarkTheme
              ? 'bg-[#221F33] border-[#3B3554] text-white'
              : 'bg-white border-[#D5DEC7] text-[#1E3227]'
          }`}
        >
          <div>
            <h4
              className={`text-base font-bold ${
                isDarkTheme ? 'text-white' : 'text-[#1E3227]'
              }`}
            >
              Thông tin trang &amp; Đăng ký hỗ trợ Giáo viên
            </h4>
            <p
              className={`text-xs mt-0.5 ${
                isDarkTheme ? 'text-[#C4B5FD]' : 'text-[#3F5447]'
              }`}
            >
              Gửi email tài khoản để kích hoạt không giới hạn lượt tạo bài giảng và thi thử.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="teacher-name-input"
                className={`block text-xs font-medium mb-1 ${
                  isDarkTheme ? 'text-[#E5E7EB]' : 'text-[#1E3227]'
                }`}
              >
                Tên hiển thị trên trang
              </label>
              <input
                id="teacher-name-input"
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs ${
                  isDarkTheme
                    ? 'bg-[#171524] border-[#4C446E] text-white'
                    : 'bg-[#FAFBF7] border-[#C5CFB4] text-[#1E3227]'
                }`}
              />
            </div>

            <div>
              <label
                htmlFor="teacher-cert-input"
                className={`block text-xs font-medium mb-1 ${
                  isDarkTheme ? 'text-[#E5E7EB]' : 'text-[#1E3227]'
                }`}
              >
                Danh hiệu / Chứng chỉ HSK
              </label>
              <input
                id="teacher-cert-input"
                type="text"
                value={teacherCert}
                onChange={(e) => setTeacherCert(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs ${
                  isDarkTheme
                    ? 'bg-[#171524] border-[#4C446E] text-white'
                    : 'bg-[#FAFBF7] border-[#C5CFB4] text-[#1E3227]'
                }`}
              />
            </div>

            <div>
              <label
                htmlFor="teacher-email-input"
                className={`block text-xs font-medium mb-1 ${
                  isDarkTheme ? 'text-[#E5E7EB]' : 'text-[#1E3227]'
                }`}
              >
                Email tài khoản Giáo viên (Nhận gói Không giới hạn) *
              </label>
              <input
                id="teacher-email-input"
                type="email"
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs ${
                  isDarkTheme
                    ? 'bg-[#171524] border-[#4C446E] text-white'
                    : 'bg-[#FAFBF7] border-[#C5CFB4] text-[#1E3227]'
                }`}
              />
            </div>
          </div>

          {saveMessage && (
            <div
              className="p-3 rounded-xl bg-[#ECFDF5] border border-[#6EE7B7] text-xs text-[#065F46] font-medium"
              data-testid="teacher-save-confirmation"
            >
              {saveMessage}
            </div>
          )}

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-semibold transition-colors"
            style={{ backgroundColor: selectedTheme.bannerTone }}
          >
            <Save className="w-4 h-4" />
            Lưu giao diện &amp; Gửi đăng ký Giáo viên
          </button>
        </form>
      </div>
    </div>
  );
};
