import React, { useEffect, useMemo, useState } from 'react';
import {
  Trophy,
  Flame,
  Clock,
  Crown,
} from 'lucide-react';
import { LeaderboardEntry } from '../data/chineseData';
import { getStoredStudentRoster, ClassStudent } from './ClassroomManager';

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
  const [roster, setRoster] = useState<ClassStudent[]>(() => getStoredStudentRoster());

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
    const mapped: ClassLeaderboardItem[] = roster.map((st, idx) => {
      const isMe = st.name.trim().toLowerCase() === currentStudentName.trim().toLowerCase();
      const score =
        isMe && hasSubmitted && currentStudentScore > 0
          ? currentStudentScore
          : st.totalPoints;
      const timeSeconds =
        isMe && hasSubmitted && typeof currentStudentTimeSeconds === 'number' && currentStudentTimeSeconds > 0
          ? currentStudentTimeSeconds
          : st.timeSeconds || Math.max(28, 128 - st.totalPoints);
      const streak =
        isMe && hasSubmitted && typeof currentStudentStreak === 'number' && currentStudentStreak > 0
          ? currentStudentStreak
          : st.streak || Math.max(3, Math.round(st.totalPoints / 11));
      const avatarCode =
        st.name
          .split(' ')
          .filter(Boolean)
          .map((n) => n[0])
          .slice(-2)
          .join('')
          .toUpperCase() || 'HV';

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

    // If currentStudentName wasn't in roster yet and submitted, append them
    const hasCurrent = mapped.some(
      (e) => e.studentName.trim().toLowerCase() === currentStudentName.trim().toLowerCase()
    );
    if (!hasCurrent && currentStudentName.trim()) {
      const fallbackScore = hasSubmitted && currentStudentScore > 0 ? currentStudentScore : 91;
      mapped.push({
        id: 'current-user-lb',
        studentCode: `HV-${String(mapped.length + 1).padStart(3, '0')}`,
        hskLevel: 'HSK 2',
        studentName: currentStudentName.trim(),
        avatarCode:
          currentStudentName
            .split(' ')
            .filter(Boolean)
            .map((n) => n[0])
            .slice(-2)
            .join('')
            .toUpperCase() || 'HS',
        score: fallbackScore,
        streak: currentStudentStreak || 6,
        timeSeconds: currentStudentTimeSeconds || 45,
        accuracyRate: fallbackScore,
        badgeTitle: fallbackScore >= 90 ? 'Hảo Thủ Hán Ngữ' : 'Nỗ Lực Vượt Bậc',
        completedAt: hasSubmitted ? 'Vừa nộp bài' : 'Hôm nay',
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

  return (
    <div
      data-testid="student-leaderboard-card"
      className="rounded-3xl bg-surface/65 backdrop-blur-md border border-border p-5 sm:p-6 space-y-5 shadow-xs"
    >
      {/* Leaderboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-inverse text-white flex items-center justify-center shrink-0 shadow-sm">
            <Trophy className="w-5 h-5 text-highlight" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base sm:text-lg font-bold text-ink">
                Bảng Xếp Hạng Thi Đua Lớp Học
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-gold/20 text-ink text-xs font-bold uppercase">
                Đồng bộ {allEntries.length} Học viên · HSK 1–3
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Cập nhật tức thì điểm số thực tế, thời gian hoàn thành (giây) & chuỗi Streak từ danh sách lớp
            </p>
          </div>
        </div>

        {/* Period Filter Pills */}
        <div className="inline-flex items-center p-1 rounded-xl bg-primary-soft border border-border self-start sm:self-auto">
          {[
            { id: 'today', label: 'Hôm nay' },
            { id: 'week', label: 'Tuần này' },
            { id: 'all', label: 'Toàn khóa' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterPeriod(tab.id as 'today' | 'week' | 'all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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

      {/* Top 3 Podium Visual Display */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-2">
        {/* Rank 2 - Silver */}
        {allEntries[1] && (
          <div className="relative rounded-2xl bg-surface border border-border p-3 sm:p-4 flex flex-col items-center text-center shadow-2xs mt-4">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200 border-2 border-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center -mt-7 sm:-mt-8 mb-1.5 shadow-xs">
              2
            </div>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary-soft border border-border-strong/40 font-bold text-xs sm:text-sm text-ink flex items-center justify-center mb-1">
              {allEntries[1].avatarCode}
            </div>
            <div className="text-xs font-bold text-gold">
              {allEntries[1].studentCode}
            </div>
            <div className="text-xs sm:text-sm font-bold text-ink truncate w-full">
              {allEntries[1].studentName}
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
          <div className="relative rounded-2xl bg-surface-2 border-2 border-border-strong p-3 sm:p-4 flex flex-col items-center text-center shadow-sm">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <Crown className="w-6 h-6 text-gold fill-gold drop-shadow-xs" />
            </div>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-100 border-2 border-border-strong text-ink font-bold text-sm flex items-center justify-center -mt-6 sm:-mt-7 mb-1.5 shadow-xs">
              1
            </div>
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-inverse text-white font-bold text-xs sm:text-sm flex items-center justify-center mb-1 border-2 border-highlight">
              {allEntries[0].avatarCode}
            </div>
            <div className="text-xs font-semibold text-gold">
              {allEntries[0].studentCode}
            </div>
            <div className="text-xs sm:text-sm font-bold text-ink truncate w-full">
              {allEntries[0].studentName}
            </div>
            <div className="text-xs sm:text-sm font-bold text-gold mt-0.5">
              {allEntries[0].score} điểm
            </div>
            <span className="px-1.5 py-0.5 rounded-md bg-gold/20 text-ink text-xs font-bold uppercase mt-1">
              {allEntries[0].badgeTitle || 'Dẫn Đầu Lớp'}
            </span>
          </div>
        )}

        {/* Rank 3 - Bronze */}
        {allEntries[2] && (
          <div className="relative rounded-2xl bg-surface border border-border p-3 sm:p-4 flex flex-col items-center text-center shadow-2xs mt-4">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-700/20 border-2 border-amber-700/40 text-amber-900 font-bold text-xs flex items-center justify-center -mt-7 sm:-mt-8 mb-1.5 shadow-xs">
              3
            </div>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary-soft border border-border-strong/40 font-bold text-xs sm:text-sm text-ink flex items-center justify-center mb-1">
              {allEntries[2].avatarCode}
            </div>
            <div className="text-xs font-bold text-gold">
              {allEntries[2].studentCode}
            </div>
            <div className="text-xs sm:text-sm font-bold text-ink truncate w-full">
              {allEntries[2].studentName}
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
        className="p-3 sm:p-3.5 rounded-2xl bg-inverse text-white flex flex-wrap items-center justify-between gap-3 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div
            data-testid="leaderboard-current-rank-badge"
            className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-highlight font-semibold text-xs"
          >
            #{myRank > 0 ? myRank : '-'}
          </div>
          <div>
            <div className="text-xs font-bold text-white flex flex-wrap items-center gap-1.5">
              <span>
                Vị trí của bạn: {myEntry?.studentCode ? `${myEntry.studentCode} · ` : ''}
                {currentStudentName}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-white/20 text-xs font-semibold">
                Đang chọn
              </span>
            </div>
            <div className="text-xs text-white/80 mt-0.5">
              {myEntry
                ? `Đạt ${myEntry.score}/100 điểm · Thời gian ${myEntry.timeSeconds}s · Xếp hạng #${myRank}/${allEntries.length} toàn lớp`
                : 'Hãy hoàn thành bài tập để ghi danh lên bảng vàng!'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div
            data-testid="leaderboard-current-streak-badge"
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/15 text-highlight font-bold"
          >
            <Flame className="w-3.5 h-3.5 fill-[#C5B358]" />
            <span>Streak {myEntry?.streak || 6} ngày</span>
          </div>
        </div>
      </div>

      {/* Detailed Full Roster List */}
      <div className="space-y-1.5" data-testid="leaderboard-full-roster-list">
        <div className="flex items-center justify-between text-xs font-bold uppercase text-ink-muted px-3 pb-1">
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
              className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all border ${
                isMe
                  ? 'bg-primary-soft border-border-strong shadow-xs'
                  : 'bg-surface border-border hover:border-border'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                    rank === 1
                      ? 'bg-gold text-white'
                      : rank === 2
                      ? 'bg-slate-300 text-slate-800'
                      : rank === 3
                      ? 'bg-amber-600 text-white'
                      : 'bg-black/5 text-ink-muted'
                  }`}
                >
                  #{rank}
                </div>

                <div className="w-8 h-8 rounded-full bg-surface border border-border font-bold text-xs text-ink flex items-center justify-center shrink-0">
                  {item.avatarCode}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.studentCode && (
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold shrink-0">
                        {item.studentCode}
                      </span>
                    )}
                    <span className="text-xs sm:text-sm font-bold text-ink">
                      {item.studentName}
                    </span>
                    {item.hskLevel && (
                      <span className="px-1.5 py-0.5 rounded bg-primary-soft text-ink-muted text-xs font-bold shrink-0">
                        {item.hskLevel}
                      </span>
                    )}
                    {isMe && (
                      <span className="px-1.5 py-0.5 rounded bg-inverse text-white text-xs font-bold shrink-0">
                        Bạn
                      </span>
                    )}
                    {item.badgeTitle && (
                      <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-gold/15 text-ink text-xs font-semibold">
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
