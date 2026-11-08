import React, { useEffect, useMemo, useState } from 'react';
import {
  Trophy,
  Flame,
  Clock,
  Crown,
  Eye,
  EyeOff,
} from 'lucide-react';
import { LeaderboardEntry } from '../data/chineseData';
import { getStoredStudentRoster, ClassStudent } from './ClassroomManager';
import { EmptyState } from './ui/EmptyState';

function maskStudentCodeForPrivacy(code?: string, isMe?: boolean): string {
  if (!code) return '';
  if (isMe) return code;
  if (code.length <= 4) return `${code.slice(0, 2)}**`;
  return `${code.slice(0, 3)}***${code.slice(-2)}`;
}

function maskStudentNameForPrivacy(fullName: string, isMe?: boolean): string {
  if (isMe) return fullName;
  const clean = fullName.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return clean || fullName;
  const first = parts[0];
  const last = parts[parts.length - 1];
  const midInitials = parts
    .slice(1, -1)
    .map((p) => `${p[0]?.toUpperCase() || ''}.`)
    .join(' ');
  return midInitials ? `${first} ${midInitials} ${last}` : `${first} ${last[0]?.toUpperCase() || ''}.`;
}

export function buildAvatarCode(fullName: string, fallback = 'HV'): string {
  const clean = fullName.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase() || fallback;
  return (
    parts
      .slice(-2)
      .map((p) => p[0] || '')
      .join('')
      .toUpperCase() || fallback
  );
}

export interface ClassLeaderboardItem extends LeaderboardEntry {
  studentCode?: string;
  hskLevel?: string;
  completedAt?: string;
  accuracyRate: number;
  badgeTitle?: string;
  isCurrentUser?: boolean;
}

interface StudentLeaderboardProps {
  currentStudentName: string;
  currentStudentScore?: number;
  currentStudentTimeSeconds?: number;
  currentStudentStreak?: number;
  hasSubmitted?: boolean;
}

export const StudentLeaderboard: React.FC<StudentLeaderboardProps> = ({
  currentStudentName,
  currentStudentScore = 0,
  currentStudentTimeSeconds,
  currentStudentStreak,
  hasSubmitted = false,
}) => {
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'all'>('today');
  const [privacyMaskEnabled, setPrivacyMaskEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hanu_leaderboard_privacy_mask_v1') === 'true';
    } catch {
      return false;
    }
  });
  const [roster, setRoster] = useState<ClassStudent[]>(() => getStoredStudentRoster());

  const togglePrivacyMask = () => {
    setPrivacyMaskEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('hanu_leaderboard_privacy_mask_v1', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  useEffect(() => {
    const syncRoster = () => {
      setRoster(getStoredStudentRoster());
    };
    window.addEventListener('hanu_students_updated', syncRoster);
    window.addEventListener('hanu_remote_state_synced', syncRoster);
    window.addEventListener('hanu_classroom_mode_changed', syncRoster);
    window.addEventListener('storage', syncRoster);
    return () => {
      window.removeEventListener('hanu_students_updated', syncRoster);
      window.removeEventListener('hanu_remote_state_synced', syncRoster);
      window.removeEventListener('hanu_classroom_mode_changed', syncRoster);
      window.removeEventListener('storage', syncRoster);
    };
  }, []);

  const allEntries: ClassLeaderboardItem[] = useMemo(() => {
    const isMeName = (name: string) =>
      name.trim().toLowerCase() === currentStudentName.trim().toLowerCase();
    // Only students who actually submitted are ranked.
    const ranked = roster.filter(
      (st) => st.status !== 'Chưa nộp' || (isMeName(st.name) && hasSubmitted)
    );
    const mapped: ClassLeaderboardItem[] = ranked.map((st, idx) => {
      const isMe = isMeName(st.name);
      const score =
        isMe && hasSubmitted && currentStudentScore > 0
          ? currentStudentScore
          : st.totalPoints;
      const timeSeconds =
        isMe && hasSubmitted && typeof currentStudentTimeSeconds === 'number' && currentStudentTimeSeconds > 0
          ? currentStudentTimeSeconds
          : st.timeSeconds || 0;
      const streak =
        isMe && hasSubmitted && typeof currentStudentStreak === 'number' && currentStudentStreak > 0
          ? currentStudentStreak
          : st.streak || 0;
      const avatarCode = buildAvatarCode(st.name, 'HV');

      const badgeTitle =
        score >= 97
          ? 'Quán Quân HSK'
          : score >= 93
          ? 'Ngữ Pháp Vàng'
          : score >= 90
          ? 'Hảo Thủ Hán Ngữ'
          : 'Tiến Bộ Bền Bỉ';

      return {
        id: st.id || `lb-${idx + 1}`,
        studentCode: st.studentCode || `HV-${String(idx + 1).padStart(3, '0')}`,
        hskLevel: st.hskLevel || 'HSK 2',
        studentName: st.name,
        avatarCode,
        score,
        streak,
        timeSeconds,
        accuracyRate: score,
        badgeTitle,
        completedAt: isMe && hasSubmitted ? 'Vừa nộp bài' : st.lastSubmittedAt || 'Hôm nay',
        isCurrentUser: isMe,
      };
    });

    // If currentStudentName wasn't in roster yet and submitted, append them with HV-013 (non-colliding code)
    const hasCurrent = mapped.some(
      (e) => e.studentName.trim().toLowerCase() === currentStudentName.trim().toLowerCase()
    );
    if (!hasCurrent && currentStudentName.trim() && hasSubmitted) {
      const fallbackScore = currentStudentScore;
      const usedCodes = new Set(mapped.map((m) => m.studentCode));
      let nextIdx = Math.max(13, mapped.length + 1);
      while (usedCodes.has(`HV-${String(nextIdx).padStart(3, '0')}`)) {
        nextIdx += 1;
      }
      const resolvedCode = usedCodes.has('HV-013')
        ? `HV-${String(nextIdx).padStart(3, '0')}`
        : 'HV-013';
      mapped.push({
        id: 'current-user-lb',
        studentCode: resolvedCode,
        hskLevel: '',
        studentName: currentStudentName.trim(),
        avatarCode: buildAvatarCode(currentStudentName, 'HS'),
        score: fallbackScore,
        streak: currentStudentStreak || 0,
        timeSeconds: currentStudentTimeSeconds || 0,
        accuracyRate: fallbackScore,
        badgeTitle: fallbackScore >= 90 ? 'Hảo Thủ Hán Ngữ' : 'Nỗ Lực Vượt Bậc',
        completedAt: 'Vừa nộp bài',
        isCurrentUser: true,
      });
    }

    // Sort by score DESC, then timeSeconds ASC
    mapped.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timeSeconds - b.timeSeconds;
    });

    return mapped;
  }, [
    roster,
    currentStudentName,
    currentStudentScore,
    currentStudentTimeSeconds,
    currentStudentStreak,
    hasSubmitted,
  ]);

  // Calculate current student rank
  const myRank =
    allEntries.findIndex(
      (e) => e.studentName.trim().toLowerCase() === currentStudentName.trim().toLowerCase()
    ) + 1;
  const myEntry = allEntries.find(
    (e) => e.studentName.trim().toLowerCase() === currentStudentName.trim().toLowerCase()
  );

  if (allEntries.length === 0) {
    return (
      <EmptyState
        testId="leaderboard-empty"
        icon={<Trophy aria-hidden="true" />}
        title="Chưa có ai trên bảng xếp hạng"
        description="Bảng xếp hạng hiện khi học viên trong lớp nộp bài tập giáo viên giao."
      />
    );
  }

  return (
    <div
      data-testid="student-leaderboard-card"
      className="rounded-3xl bg-surface border border-border p-5 sm:p-6 space-y-6"
    >
      {/* Leaderboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-inverse text-white flex items-center justify-center shrink-0 shadow-sm">
            <Trophy className="w-5 h-5 text-highlight" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-ink">
                Bảng Xếp Hạng Thi Đua Lớp Học
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-primary-soft text-ink text-xs font-bold uppercase">
                {allEntries.length} học viên
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-1 max-w-[60ch]">
              Điểm, thời gian hoàn thành (giây) và chuỗi Streak của cả lớp
            </p>
          </div>
        </div>

        {/* Period Filter Pills & Privacy Mask Toggle */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            data-testid="leaderboard-privacy-mask-toggle"
            onClick={togglePrivacyMask}
            title="Ẩn bớt Mã học viên & Họ tên khi chiếu bảng xếp hạng trên lớp"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
              privacyMaskEnabled
                ? 'bg-primary-soft border-primary text-ink'
                : 'bg-surface border-border text-ink-muted hover:text-ink'
            }`}
          >
            {privacyMaskEnabled ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-primary" />
                <span>Đã che Mã HV</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Che Mã HV</span>
              </>
            )}
          </button>

          <div className="inline-flex items-center p-1 rounded-xl bg-primary-soft border border-border">
            {[
              { id: 'today', label: 'Hôm nay' },
              { id: 'week', label: 'Tuần này' },
              { id: 'all', label: 'Toàn khóa' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterPeriod(tab.id as 'today' | 'week' | 'all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  filterPeriod === tab.id
                    ? 'bg-inverse text-white shadow-2xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top 3 Podium Visual Display */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-2">
        {/* Rank 2 - Silver */}
        {allEntries[1] && (
          <div className="relative rounded-2xl bg-surface-2 p-3 sm:p-4 flex flex-col items-center text-center mt-4">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-border-strong text-ink font-bold text-xs flex items-center justify-center -mt-7 sm:-mt-8 mb-1.5">
              2
            </div>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-surface border border-border font-bold text-xs sm:text-sm text-ink flex items-center justify-center mb-1">
              {allEntries[1].avatarCode}
            </div>
            <div className="text-xs font-bold text-gold">
              {privacyMaskEnabled
                ? maskStudentCodeForPrivacy(allEntries[1].studentCode, allEntries[1].isCurrentUser)
                : allEntries[1].studentCode}
            </div>
            <div className="text-xs sm:text-sm font-bold text-ink truncate w-full">
              {privacyMaskEnabled
                ? maskStudentNameForPrivacy(allEntries[1].studentName, allEntries[1].isCurrentUser)
                : allEntries[1].studentName}
            </div>
            <div className="text-xs font-semibold text-gold mt-0.5">
              {allEntries[1].score} điểm
            </div>
            <div className="text-xs text-ink-muted flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3 text-ink-muted/60" />
              <span>{allEntries[1].timeSeconds}s</span>
            </div>
          </div>
        )}

        {/* Rank 1 - Gold (Center, prominent) */}
        {allEntries[0] && (
          <div className="relative rounded-2xl bg-primary-soft p-3 sm:p-4 flex flex-col items-center text-center">
            <div className="absolute -top-7 sm:-top-8 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
              <Crown className="w-5 h-5 text-gold fill-gold" />
            </div>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-highlight text-on-highlight font-bold text-sm flex items-center justify-center -mt-5 sm:-mt-6 mb-1.5 relative z-10">
              1
            </div>
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary text-on-primary font-bold text-xs sm:text-sm flex items-center justify-center mb-1">
              {allEntries[0].avatarCode}
            </div>
            <div className="text-xs font-semibold text-gold">
              {privacyMaskEnabled
                ? maskStudentCodeForPrivacy(allEntries[0].studentCode, allEntries[0].isCurrentUser)
                : allEntries[0].studentCode}
            </div>
            <div className="text-xs sm:text-sm font-bold text-ink truncate w-full">
              {privacyMaskEnabled
                ? maskStudentNameForPrivacy(allEntries[0].studentName, allEntries[0].isCurrentUser)
                : allEntries[0].studentName}
            </div>
            <div className="text-xs sm:text-sm font-bold text-gold mt-0.5">
              {allEntries[0].score} điểm
            </div>
            <span className="px-1.5 py-0.5 rounded-md bg-highlight text-on-highlight text-xs font-bold uppercase mt-1">
              {allEntries[0].badgeTitle || 'Dẫn Đầu Lớp'}
            </span>
          </div>
        )}

        {/* Rank 3 - Bronze */}
        {allEntries[2] && (
          <div className="relative rounded-2xl bg-surface-2 p-3 sm:p-4 flex flex-col items-center text-center mt-4">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-warning/25 text-ink font-bold text-xs flex items-center justify-center -mt-7 sm:-mt-8 mb-1.5">
              3
            </div>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-surface border border-border font-bold text-xs sm:text-sm text-ink flex items-center justify-center mb-1">
              {allEntries[2].avatarCode}
            </div>
            <div className="text-xs font-bold text-gold">
              {privacyMaskEnabled
                ? maskStudentCodeForPrivacy(allEntries[2].studentCode, allEntries[2].isCurrentUser)
                : allEntries[2].studentCode}
            </div>
            <div className="text-xs sm:text-sm font-bold text-ink truncate w-full">
              {privacyMaskEnabled
                ? maskStudentNameForPrivacy(allEntries[2].studentName, allEntries[2].isCurrentUser)
                : allEntries[2].studentName}
            </div>
            <div className="text-xs font-semibold text-gold mt-0.5">
              {allEntries[2].score} điểm
            </div>
            <div className="text-xs text-ink-muted flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3 text-ink-muted/60" />
              <span>{allEntries[2].timeSeconds}s</span>
            </div>
          </div>
        )}
      </div>

      {/* Current Student Quick Status Strip */}
      <div
        data-testid="leaderboard-current-student-banner"
        className="py-3 pl-4 pr-3 border-l-4 border-primary bg-primary-soft text-ink rounded-r-xl flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div
            data-testid="leaderboard-current-rank-badge"
            className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-xs"
          >
            #{myRank > 0 ? myRank : '-'}
          </div>
          <div>
            <div className="text-xs font-bold text-ink flex flex-wrap items-center gap-1.5">
              <span>
                Vị trí của bạn: {myEntry?.studentCode ? `${myEntry.studentCode} · ` : ''}
                {currentStudentName}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-surface text-ink text-xs font-semibold">
                Đang chọn
              </span>
            </div>
            <div className="text-xs text-ink-muted mt-0.5">
              {myEntry
                ? `Đạt ${myEntry.score}/100 điểm · Thời gian ${myEntry.timeSeconds}s · Xếp hạng #${myRank}/${allEntries.length} toàn lớp`
                : 'Hãy hoàn thành bài tập để ghi danh lên bảng vàng!'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div
            data-testid="leaderboard-current-streak-badge"
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-surface text-ink font-bold"
          >
            <Flame className="w-3.5 h-3.5 text-highlight fill-highlight" />
            <span>Streak {myEntry?.streak || 6} ngày</span>
          </div>
        </div>
      </div>

      {/* Detailed Full Roster List */}
      <div data-testid="leaderboard-full-roster-list">
        <div className="flex items-center justify-between text-xs font-bold uppercase text-ink-muted px-3 pb-2 border-b border-border">
          <span>Mã HV / Học Viên / Thứ Hạng</span>
          <div className="flex items-center gap-6">
            <span>Tốc độ</span>
            <span>Điểm số</span>
          </div>
        </div>

        {allEntries.map((item, idx) => {
          const rank = idx + 1;
          const isMe =
            item.studentName.trim().toLowerCase() === currentStudentName.trim().toLowerCase();

          return (
            <div
              key={item.id}
              data-testid={`leaderboard-row-${item.studentCode || idx + 1}`}
              className={`flex items-center justify-between px-3 py-3 sm:py-3.5 border-b border-border last:border-b-0 transition-colors ${
                isMe ? 'bg-primary-soft' : 'hover:bg-surface-2'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`min-w-7 h-7 px-1 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                    rank === 1
                      ? 'bg-highlight text-on-highlight'
                      : rank === 2
                      ? 'bg-border-strong text-ink'
                      : rank === 3
                      ? 'bg-warning/25 text-ink'
                      : 'bg-surface-2 text-ink-muted'
                  }`}
                >
                  #{rank}
                </div>

                <div className="w-8 h-8 rounded-full bg-surface-2 font-bold text-xs text-ink flex items-center justify-center shrink-0">
                  {item.avatarCode}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.studentCode && (
                      <span className="px-1.5 py-0.5 rounded bg-primary-soft text-ink text-xs font-semibold shrink-0">
                        {privacyMaskEnabled
                          ? maskStudentCodeForPrivacy(item.studentCode, isMe)
                          : item.studentCode}
                      </span>
                    )}
                    <span className="text-xs sm:text-sm font-bold text-ink">
                      {privacyMaskEnabled
                        ? maskStudentNameForPrivacy(item.studentName, isMe)
                        : item.studentName}
                    </span>
                    {item.hskLevel && (
                      <span className="px-1.5 py-0.5 rounded bg-surface-2 text-ink-muted text-xs font-bold shrink-0">
                        {item.hskLevel}
                      </span>
                    )}
                    {isMe && (
                      <span className="px-1.5 py-0.5 rounded bg-inverse text-white text-xs font-bold shrink-0">
                        Bạn
                      </span>
                    )}
                    {item.badgeTitle && (
                      <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-surface-2 text-ink text-xs font-semibold">
                        {item.badgeTitle}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink-muted flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="font-semibold text-gold">
                      🔥 Streak {item.streak} ngày
                    </span>
                    <span>·</span>
                    <span>Cập nhật: {item.completedAt || 'Hôm nay'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-5 sm:gap-6 shrink-0 text-right">
                <div className="text-xs text-ink-muted tabular-nums font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-ink-muted/60" />
                  <span>{item.timeSeconds}s</span>
                </div>
                <div className="text-sm font-bold text-ink tabular-nums min-w-[54px] text-right">
                  {item.score} <span className="text-xs font-semibold text-gold">đ</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
