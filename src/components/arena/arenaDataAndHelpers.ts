import { UploadedAssignmentPackage } from '../../utils/assignmentParser';
import { ClassStudent } from '../ClassroomManager';

export const LISTENING_CHALLENGES = [
  {
    id: 'lc-1',
    audioText: '温暖',
    pinyin: 'wēn nuǎn',
    correctHanzi: '温暖',
    meaning: 'ấm áp, đầm ấm',
    explanation:
      '“温暖” (wēn nuǎn - ấm áp) dùng để miêu tả thời tiết dễ chịu hoặc tình cảm gia đình, bạn bè ấm cúng.',
    options: ['温暖 (ấm áp)', '空调 (điều hòa)', '花园 (vườn hoa)', '咱们 (chúng ta)'],
  },
  {
    id: 'lc-2',
    audioText: '咱们',
    pinyin: 'zán men',
    correctHanzi: '咱们',
    meaning: 'chúng ta, chúng mình',
    explanation:
      '“咱们” (zán men - chúng ta) là đại từ ngôi thứ nhất số nhiều bao gồm cả người nói và người nghe.',
    options: ['老师 (giáo viên)', '咱们 (chúng ta)', '聪明 (thông minh)', '愿意 (sẵn lòng)'],
  },
];

export interface SpeedTestQuestion {
  id: string;
  skillLabel: string;
  targetWord: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export const SPEED_TEST_10_QUESTIONS: SpeedTestQuestion[] = [
  {
    id: 'stq-1',
    skillLabel: 'Kỹ năng 1 · Nghe & Ngữ âm',
    targetWord: '温暖',
    prompt: 'Câu 1: Từ “温暖” (ấm áp, đầm ấm) có phiên âm Pinyin chuẩn là gì?',
    options: ['A. wén nuàn', 'B. wēn nuǎn', 'C. wēn luǎn', 'D. wèn nuǎn'],
    correctAnswer: 'B. wēn nuǎn',
    explanation: '温 (wēn - thanh 1) + 暖 (nuǎn - thanh 3) đọc là wēn nuǎn.',
  },
  {
    id: 'stq-2',
    skillLabel: 'Kỹ năng 2 · Từ vựng & Đại từ',
    targetWord: '咱们',
    prompt: 'Câu 2: Khi muốn rủ người đang nói chuyện cùng đi (“Chúng mình cùng đi nhé!”), ta ưu tiên dùng đại từ nào?',
    options: ['A. 他们 (tāmen)', 'B. 你们 (nǐmen)', 'C. 咱们 (zánmen)', 'D. 别人 (biérén)'],
    correctAnswer: 'C. 咱们 (zánmen)',
    explanation: '咱们 (zánmen) bao gồm cả người nói và người nghe, rất thân mật trong giao tiếp.',
  },
  {
    id: 'stq-3',
    skillLabel: 'Kỹ năng 3 · Đọc hiểu ngữ cảnh',
    targetWord: '办法',
    prompt: 'Câu 3: Điền từ thích hợp vào câu: “这个问题很难，你有什么好______吗？”',
    options: [
      'A. 办法 (bànfǎ - cách giải quyết)',
      'B. 季节 (jìjié - mùa)',
      'C. 空调 (kōngtiáo - điều hòa)',
      'D. 花园 (huāyuán - vườn hoa)',
    ],
    correctAnswer: 'A. 办法 (bànfǎ - cách giải quyết)',
    explanation: '好办法 (hǎo bànfǎ) nghĩa là cách giải quyết hay / biện pháp tốt.',
  },
  {
    id: 'stq-4',
    skillLabel: 'Kỹ năng 4 · Ngữ pháp vị trí trạng ngữ',
    targetWord: '明天',
    prompt: 'Câu 4: Câu nào dưới đây đặt đúng vị trí trạng ngữ chỉ thời gian “明天” (ngày mai)?',
    options: [
      'A. 我去图书馆复习明天。',
      'B. 我去明天图书馆复习。',
      'C. 图书馆我去复习明天。',
      'D. 我明天去图书馆复习。',
    ],
    correctAnswer: 'D. 我明天去图书馆复习。',
    explanation: 'Trong tiếng Trung, trạng ngữ thời gian (明天) đứng trước động từ (Đầu câu hoặc ngay sau Chủ ngữ).',
  },
  {
    id: 'stq-5',
    skillLabel: 'Kỹ năng 5 · Cấu trúc mức độ',
    targetWord: '挺',
    prompt: 'Câu 5: Cấu trúc “挺 + Tính từ + 的” (VD: 挺温暖的) biểu thị ý nghĩa gì?',
    options: [
      'A. Phủ định hoàn toàn',
      'B. Khá là / rất (nhấn mạnh mức độ vừa phải, tự nhiên)',
      'C. Câu hỏi lựa chọn',
      'D. Mệnh lệnh bắt buộc',
    ],
    correctAnswer: 'B. Khá là / rất (nhấn mạnh mức độ vừa phải, tự nhiên)',
    explanation: '挺...的 (tǐng... de) dùng rất phổ biến trong khẩu ngữ để khen hoặc nhận xét: “Khá là...”.',
  },
  {
    id: 'stq-6',
    skillLabel: 'Kỹ năng 6 · Hán tự & Bộ thủ',
    targetWord: '换',
    prompt: 'Câu 6: Chữ “换” (huàn - đổi, trao đổi) mang bộ thủ nào liên quan đến động tác bàn tay?',
    options: [
      'A. Bộ Thủy (氵)',
      'B. Bộ Ngôn (讠)',
      'C. Bộ Tài gẩy (扌)',
      'D. Bộ Tâm (忄)',
    ],
    correctAnswer: 'C. Bộ Tài gẩy (扌)',
    explanation: 'Bộ Tài gẩy (扌) biểu thị các động tác dùng tay như 换 (đổi), 打 (đánh), 找 (tìm).',
  },
  {
    id: 'stq-7',
    skillLabel: 'Kỹ năng 7 · Biến điệu thanh 3',
    targetWord: '打算',
    prompt: 'Câu 7: Khi hai thanh 3 đi liền nhau như “你好” (nǐ hǎo) hoặc “很好” (hěn hǎo), âm tiết đầu đọc biến điệu thành thanh mấy?',
    options: [
      'A. Thanh 1',
      'B. Thanh 4',
      'C. Giữ nguyên thanh 3 nặng',
      'D. Thanh 2 (ní hǎo / hén hǎo)',
    ],
    correctAnswer: 'D. Thanh 2 (ní hǎo / hén hǎo)',
    explanation: 'Quy tắc biến điệu HSK 3.0: 3 + 3 → 2 + 3 khi phát âm thực tế.',
  },
  {
    id: 'stq-8',
    skillLabel: 'Kỹ năng 8 · Giao tiếp thực tế',
    targetWord: '照顾',
    prompt: 'Câu 8: Từ “照顾” (zhàogù) trong câu “谢谢你照顾我” có nghĩa tiếng Việt chuẩn là gì?',
    options: [
      'A. Chăm sóc, quan tâm',
      'B. Thi cử',
      'C. Du lịch',
      'D. Trao đổi tiền tệ',
    ],
    correctAnswer: 'A. Chăm sóc, quan tâm',
    explanation: '照顾 (zhàogù - chiếu cố) nghĩa là chăm sóc, quan tâm chu đáo.',
  },
  {
    id: 'stq-9',
    skillLabel: 'Kỹ năng 9 · Dịch thuật Việt – Trung',
    targetWord: '愿意',
    prompt: 'Câu 9: Bản dịch chuẩn HSK 3.0 cho câu “Tôi rất sẵn lòng giúp đỡ bạn” là gì?',
    options: [
      'A. 我帮助你很愿意。',
      'B. 我很愿意帮助你。',
      'C. 愿意我很帮助你。',
      'D. 我不愿意去。',
    ],
    correctAnswer: 'B. 我很愿意帮助你。',
    explanation: '愿意 + Động từ (愿意帮助你: sẵn lòng giúp đỡ bạn).',
  },
  {
    id: 'stq-10',
    skillLabel: 'Kỹ năng 10 · Tổng hợp ngữ pháp',
    targetWord: '四季',
    prompt: 'Câu 10: Chọn câu miêu tả đúng về bốn mùa (四季 - sìjì):',
    options: [
      'A. 一年有两个季节。',
      'B. 四季是一件衣服。',
      'C. 一年有四个季节：春、夏、秋、冬。',
      'D. 冬天非常炎热。',
    ],
    correctAnswer: 'C. 一年有四个季节：春、夏、秋、冬。',
    explanation: 'Một năm có 4 mùa: Xuân (春), Hạ (夏), Thu (秋), Đông (冬).',
  },
];

export interface ArenaScoreBreakdown {
  mcScore: number;
  soScore: number;
  esScore: number;
  listeningScore: number;
  avgWritingAccuracy: number;
  reviewWords: string[];
  totalScore: number;
}

export function calculateArenaScoreBreakdown(params: {
  assignmentPackage: UploadedAssignmentPackage;
  mcAnswers: Record<string, string>;
  selectedTokensMap: Record<string, string[]>;
  essayAnswers: Record<string, string>;
  listeningAnswers: Record<string, string>;
  practicedChars: Record<string, number>;
  uploadedHomeworkFile: File | null;
}): ArenaScoreBreakdown {
  const {
    assignmentPackage,
    mcAnswers,
    selectedTokensMap,
    essayAnswers,
    listeningAnswers,
    practicedChars,
    uploadedHomeworkFile,
  } = params;

  let mcScore = 0;
  const mcTotalPossible = 30;
  const mcWeight =
    assignmentPackage.multipleChoiceList.length > 0
      ? mcTotalPossible / assignmentPackage.multipleChoiceList.length
      : 10;

  assignmentPackage.multipleChoiceList.forEach((q) => {
    const selected = q.options.find((opt) => opt.key === mcAnswers[q.id]);
    if (selected && selected.isCorrect) mcScore += mcWeight;
  });

  let soScore = 0;
  const soTotalPossible = 40;
  const soWeight =
    assignmentPackage.sentenceOrderingList.length > 0
      ? soTotalPossible / assignmentPackage.sentenceOrderingList.length
      : 20;

  assignmentPackage.sentenceOrderingList.forEach((q) => {
    const userTokens = selectedTokensMap[q.id] || [];
    if (userTokens.join('') === q.correctTokens.join('')) {
      soScore += soWeight;
    }
  });

  let esScore = 0;
  const esTotalPossible = 30;
  const esWeight =
    assignmentPackage.essayList.length > 0
      ? esTotalPossible / assignmentPackage.essayList.length
      : 15;

  assignmentPackage.essayList.forEach((q) => {
    const text = (essayAnswers[q.id] || '').trim();
    if (text.length >= 3 && text.includes(q.targetWord)) {
      esScore += esWeight;
    } else if (text.length >= 2 || uploadedHomeworkFile) {
      esScore += Math.round(esWeight * 0.6);
    }
  });

  let listeningBonus = 0;
  LISTENING_CHALLENGES.forEach((lc) => {
    if (listeningAnswers[lc.id]?.startsWith(lc.correctHanzi)) {
      listeningBonus += 5;
    }
  });

  const strokeValues = Object.values(practicedChars);
  const avgWritingAccuracy =
    strokeValues.length > 0
      ? Math.round(strokeValues.reduce((a, b) => a + b, 0) / strokeValues.length)
      : 94;

  const rawScore = Math.round(mcScore + soScore + esScore + listeningBonus);
  const totalScore = Math.min(100, Math.max(0, rawScore));

  const reviewSet = new Set<string>();
  assignmentPackage.multipleChoiceList.forEach((q) => {
    const selected = q.options.find((opt) => opt.key === mcAnswers[q.id]);
    if (!selected || !selected.isCorrect) {
      if (q.targetWord) reviewSet.add(q.targetWord);
    }
  });
  assignmentPackage.essayList.forEach((q) => {
    const text = (essayAnswers[q.id] || '').trim();
    if (!text.includes(q.targetWord)) {
      if (q.targetWord) reviewSet.add(q.targetWord);
    }
  });
  LISTENING_CHALLENGES.forEach((lc) => {
    if (listeningAnswers[lc.id] && !listeningAnswers[lc.id].startsWith(lc.correctHanzi)) {
      reviewSet.add(lc.correctHanzi);
    }
  });

  return {
    mcScore: Math.round(mcScore),
    soScore: Math.round(soScore),
    esScore: Math.round(esScore),
    listeningScore: listeningBonus,
    avgWritingAccuracy,
    reviewWords: Array.from(reviewSet),
    totalScore,
  };
}

export function computeRankFromRoster(
  list: ClassStudent[],
  studentNameToFind: string
): { rank: number; timeSeconds: number; streak: number } {
  const sorted = [...list].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return (a.timeSeconds || 50) - (b.timeSeconds || 50);
  });
  const idx = sorted.findIndex(
    (s) => s.name.trim().toLowerCase() === studentNameToFind.trim().toLowerCase()
  );
  const matched = idx >= 0 ? sorted[idx] : sorted[0];
  return {
    rank: idx >= 0 ? idx + 1 : 1,
    timeSeconds: matched?.timeSeconds || 42,
    streak: matched?.streak || 7,
  };
}
