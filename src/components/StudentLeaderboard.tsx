import React, { useState } from 'react';
import {
  Trophy,
  Medal,
  Flame,
  Clock,
  Sparkles,
  ArrowUp,
  UserCheck,
  TrendingUp,
  Award,
  Crown,
} from 'lucide-react';
import { LeaderboardEntry } from '../data/chineseData';

export interface ClassLeaderboardItem extends LeaderboardEntry {
  completedAt?: string;
  accuracyRate: number; // Percentage e.g. 95%
  badgeTitle?: string;
  isCurrentUser?: boolean;
}

interface StudentLeaderboardProps {
  currentStudentName: string;
  currentStudentScore?: number;
  hasSubmitted?: boolean;
}

export const StudentLeaderboard: React.FC<StudentLeaderboardProps> = ({
  currentStudentName,
  currentStudentScore = 0,
  hasSubmitted = false,
}) => {
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'all'>('today');

  // Realistic mock class peers with authentic scores from current HSK 1-3 class
  const baseEntries: ClassLeaderboardItem[] = [
    {
      id: 'lb-1',
      studentName: 'Trần Minh Quang',
      avatarCode: 'MQ',
      score: 100,
      streak: 5,
      timeSeconds: 42,
      accuracyRate: 100,
      badgeTitle: 'Quán Quân HSK',
      completedAt: '19:45',
    },
    {
      id: 'lb-2',
      studentName: 'Nguyễn Hoàng Hải Yến',
      avatarCode: 'HY',
      score: 95,
      streak: 4,
      timeSeconds: 58,
      accuracyRate: 95,
      badgeTitle: 'Ngữ Pháp Vàng',
      completedAt: '19:48',
    },
    {
      id: 'lb-3',
      studentName: 'Vũ Đức Anh',
      avatarCode: 'DA',
      score: 90,
      streak: 3,
      timeSeconds: 65,
      accuracyRate: 90,
      badgeTitle: 'Thần Tốc',
      completedAt: '19:52',
    },
    {
      id: 'lb-4',
      studentName: 'Lê Thảo Linh',
      avatarCode: 'TL',
      score: 85,
      streak: 2,
      timeSeconds: 78,
      accuracyRate: 85,
      badgeTitle: 'Chăm Chỉ',
      completedAt: '19:55',
    },
    {
      id: 'lb-5',
      studentName: 'Phạm Gia Huy',
      avatarCode: 'GH',
      score: 80,
      streak: 2,
      timeSeconds: 84,
      accuracyRate: 80,
      badgeTitle: 'Kiên Trì',
      completedAt: '19:59',
    },
    {
      id: 'lb-6',
      studentName: 'Đặng Mai Phương',
      avatarCode: 'MP',
      score: 75,
      streak: 1,
      timeSeconds: 95,
      accuracyRate: 75,
      badgeTitle: 'Tiến Bộ',
      completedAt: '20:05',
    },
  ];

  // Merge current student if they have submitted or match an existing entry
  let allEntries: ClassLeaderboardItem[] = [...baseEntries];
  const existingIdx = allEntries.findIndex((e) => e.studentName === currentStudentName);

  if (hasSubmitted) {
    const userItem: ClassLeaderboardItem = {
      id: 'current-user-lb',
      studentName: currentStudentName,
      avatarCode: currentStudentName
        .split(' ')
        .map((n) => n[0])
        .slice(-2)
        .join('')
        .toUpperCase() || 'HS',
      score: currentStudentScore,
      streak: currentStudentScore >= 80 ? 3 : 1,
      timeSeconds: 52,
      accuracyRate: currentStudentScore,
      badgeTitle: currentStudentScore === 100 ? 'Xuất Sắc Tuyệt Đối' : currentStudentScore >= 80 ? 'Hảo Thủ Hán Ngữ' : 'Nỗ Lực Vượt Bậc',
      completedAt: 'Vừa xong',
      isCurrentUser: true,
    };

    if (existingIdx !== -1) {
      allEntries[existingIdx] = {
        ...allEntries[existingIdx],
        score: Math.max(allEntries[existingIdx].score, currentStudentScore),
        accuracyRate: Math.max(allEntries[existingIdx].accuracyRate, currentStudentScore),
        isCurrentUser: true,
      };
    } else {
      allEntries.push(userItem);
    }
  } else if (existingIdx !== -1) {
    allEntries[existingIdx].isCurrentUser = true;
  }

  // Sort by score DESC, then timeSeconds ASC
  allEntries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.timeSeconds - b.timeSeconds;
  });

  // Calculate current student rank
  const myRank = allEntries.findIndex((e) => e.studentName === currentStudentName) + 1;
  const myEntry = allEntries.find((e) => e.studentName === currentStudentName);

  return (
    <div
      data-testid="student-leaderboard-card"
      className="rounded-3xl bg-[rgba(255,255,255,0.65)] backdrop-blur-md border border-[rgba(30,50,39,0.15)] p-5 sm:p-6 space-y-5 shadow-xs"
    >
      {/* Leaderboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(30,50,39,0.12)] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#1E3227] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Trophy className="w-5 h-5 text-[#C5B358]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base sm:text-lg font-bold text-[#1E3227]">
                Bảng Xếp Hạng Thi Đua Lớp Học
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-[#9B8A3E]/20 text-[#1E3227] text-[10px] font-bold uppercase">
                HSK 1–3
              </span>
            </div>
            <p className="text-xs text-[#3F5447] mt-0.5">
              Cập nhật tức thì dựa trên điểm số và tốc độ làm bài tập hôm nay
            </p>
          </div>
        </div>

        {/* Period Filter Pills */}
        <div className="inline-flex items-center p-1 rounded-xl bg-[#E7ECD9] border border-[rgba(30,50,39,0.15)] self-start sm:self-auto">
          {[
            { id: 'today', label: 'Hôm nay' },
            { id: 'week', label: 'Tuần này' },
            { id: 'all', label: 'Toàn khóa' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterPeriod(tab.id as 'today' | 'week' | 'all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filterPeriod === tab.id
                  ? 'bg-[#1E3227] text-[#FAFBF7] shadow-2xs'
                  : 'text-[#3F5447] hover:text-[#1E3227]'
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
          <div className="relative rounded-2xl bg-[#FAFBF7] border border-[rgba(30,50,39,0.12)] p-3 sm:p-4 flex flex-col items-center text-center shadow-2xs mt-4">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200 border-2 border-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center -mt-7 sm:-mt-8 mb-1.5 shadow-xs">
              2
            </div>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#E7ECD9] border border-[#9B8A3E]/40 font-bold text-xs sm:text-sm text-[#1E3227] flex items-center justify-center mb-1">
              {allEntries[1].avatarCode}
            </div>
            <div className="text-xs sm:text-sm font-bold text-[#1E3227] truncate w-full">
              {allEntries[1].studentName}
            </div>
            <div className="text-[11px] font-extrabold text-[#9B8A3E] mt-0.5">
              {allEntries[1].score} điểm
            </div>
            <div className="text-[10px] text-[#3F5447] flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3 text-[#3F5447]/60" />
              <span>{allEntries[1].timeSeconds}s</span>
            </div>
          </div>
        )}

        {/* Rank 1 - Gold (Center, prominent) */}
        {allEntries[0] && (
          <div className="relative rounded-2xl bg-gradient-to-b from-[#FFFDF0] to-[#FAFBF7] border-2 border-[#9B8A3E] p-3 sm:p-4 flex flex-col items-center text-center shadow-sm">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <Crown className="w-6 h-6 text-[#9B8A3E] fill-[#9B8A3E] drop-shadow-xs" />
            </div>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-100 border-2 border-[#9B8A3E] text-[#1E3227] font-black text-sm flex items-center justify-center -mt-6 sm:-mt-7 mb-1.5 shadow-xs">
              1
            </div>
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#1E3227] text-[#FAFBF7] font-bold text-xs sm:text-sm flex items-center justify-center mb-1 border-2 border-[#C5B358]">
              {allEntries[0].avatarCode}
            </div>
            <div className="text-xs sm:text-sm font-black text-[#1E3227] truncate w-full">
              {allEntries[0].studentName}
            </div>
            <div className="text-xs sm:text-sm font-black text-[#9B8A3E] mt-0.5">
              {allEntries[0].score} điểm
            </div>
            <span className="px-1.5 py-0.5 rounded-md bg-[#9B8A3E]/20 text-[#1E3227] text-[9px] font-bold uppercase mt-1">
              {allEntries[0].badgeTitle || 'Dẫn Đầu Lớp'}
            </span>
          </div>
        )}

        {/* Rank 3 - Bronze */}
        {allEntries[2] && (
          <div className="relative rounded-2xl bg-[#FAFBF7] border border-[rgba(30,50,39,0.12)] p-3 sm:p-4 flex flex-col items-center text-center shadow-2xs mt-4">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-700/20 border-2 border-amber-700/40 text-amber-900 font-bold text-xs flex items-center justify-center -mt-7 sm:-mt-8 mb-1.5 shadow-xs">
              3
            </div>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#E7ECD9] border border-[#9B8A3E]/40 font-bold text-xs sm:text-sm text-[#1E3227] flex items-center justify-center mb-1">
              {allEntries[2].avatarCode}
            </div>
            <div className="text-xs sm:text-sm font-bold text-[#1E3227] truncate w-full">
              {allEntries[2].studentName}
            </div>
            <div className="text-[11px] font-extrabold text-[#9B8A3E] mt-0.5">
              {allEntries[2].score} điểm
            </div>
            <div className="text-[10px] text-[#3F5447] flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3 text-[#3F5447]/60" />
              <span>{allEntries[2].timeSeconds}s</span>
            </div>
          </div>
        )}
      </div>

      {/* Current Student Quick Status Strip */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-[#1E3227] text-white flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-[#C5B358] font-bold text-xs">
            #{myRank > 0 ? myRank : '-'}
          </div>
          <div>
            <div className="text-xs font-bold text-[#FAFBF7] flex items-center gap-1.5">
              <span>Vị trí của bạn: {currentStudentName}</span>
              <span className="px-1.5 py-0.2 rounded bg-white/20 text-[10px] font-normal">Bạn</span>
            </div>
            <div className="text-[11px] text-white/75">
              {hasSubmitted
                ? `Đạt ${currentStudentScore}/100 điểm · Đang xếp hạng #${myRank} trên 12 bạn trong lớp`
                : 'Chưa nộp bài hôm nay. Hãy hoàn thành bài tập để ghi danh lên bảng vàng!'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {hasSubmitted ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/15 text-[#C5B358] font-bold">
              <Flame className="w-3.5 h-3.5 fill-[#C5B358]" />
              <span>{myEntry?.streak || 1} buổi liền</span>
            </div>
          ) : (
            <span className="text-[11px] text-[#C5B358] font-medium italic">
              Nộp bài để kích hoạt chuỗi Streak!
            </span>
          )}
        </div>
      </div>

      {/* Detailed Full Roster List */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase text-[#3F5447] px-3 pb-1">
          <span>Học Viên / Thứ Hạng</span>
          <div className="flex items-center gap-6">
            <span>Tốc độ</span>
            <span>Điểm số</span>
          </div>
        </div>

        {allEntries.map((item, idx) => {
          const rank = idx + 1;
          const isMe = item.studentName === currentStudentName;

          return (
            <div
              key={item.id}
              className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all border ${
                isMe
                  ? 'bg-[#E7ECD9] border-[#9B8A3E] shadow-xs'
                  : 'bg-[#FAFBF7] border-[rgba(30,50,39,0.08)] hover:border-[rgba(30,50,39,0.2)]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                    rank === 1
                      ? 'bg-[#9B8A3E] text-white'
                      : rank === 2
                      ? 'bg-slate-300 text-slate-800'
                      : rank === 3
                      ? 'bg-amber-600 text-white'
                      : 'bg-black/5 text-[#3F5447]'
                  }`}
                >
                  {rank}
                </div>

                <div className="w-8 h-8 rounded-full bg-white border border-[rgba(30,50,39,0.12)] font-bold text-xs text-[#1E3227] flex items-center justify-center shrink-0">
                  {item.avatarCode}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-bold text-[#1E3227] truncate">
                      {item.studentName}
                    </span>
                    {isMe && (
                      <span className="px-1.5 py-0.2 rounded bg-[#1E3227] text-white text-[9px] font-bold shrink-0">
                        Bạn
                      </span>
                    )}
                    {item.badgeTitle && (
                      <span className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-[#9B8A3E]/15 text-[#1E3227] text-[10px] font-semibold truncate">
                        {item.badgeTitle}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#3F5447] flex items-center gap-2">
                    <span>Chuỗi {item.streak} ngày</span>
                    <span>·</span>
                    <span>Hoàn thành lúc {item.completedAt || '19:50'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 shrink-0 text-right">
                <div className="text-[11px] text-[#3F5447] tabular-nums font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#3F5447]/50" />
                  <span>{item.timeSeconds}s</span>
                </div>
                <div className="text-sm font-black text-[#1E3227] tabular-nums min-w-[50px] text-right">
                  {item.score} <span className="text-[10px] font-semibold text-[#9B8A3E]">đ</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
