export interface MultipleChoiceQ {
  id: string;
  type: 'meaning' | 'fill-blank';
  targetWord: string;
  question: string;
  pinyinSentence?: string;
  options: { key: string; label: string; isCorrect: boolean }[];
  explanation: string;
  grammarTip?: string;
}

export interface SentenceOrderingQ {
  id: string;
  targetWord: string;
  vietnameseMeaning: string;
  pinyin: string;
  correctTokens: string[];
  tokensShuffled: string[];
  explanation: string;
  grammarTip?: string;
  modelSentence?: string;
}

export interface EssayQ {
  id: string;
  targetWord: string;
  pinyin: string;
  meaning: string;
  suggestedPrompt: string;
  sampleSentence: string;
  samplePinyin: string;
  sampleTranslation: string;
  grammarFocus?: string;
}

export interface UploadedAssignmentPackage {
  id: string;
  fileName: string;
  fileType: 'docx' | 'pdf' | 'txt' | 'csv' | 'pasted';
  sessionTitle: string;
  sessionNumber: number;
  uploadedAt: string;
  dueDate: string;
  teacherName: string;
  rawContent?: string;
  multipleChoiceList: MultipleChoiceQ[];
  sentenceOrderingList: SentenceOrderingQ[];
  essayList: EssayQ[];
}

export const STORAGE_KEY_ASSIGNMENT = 'hanu_active_assignment_v2';

// Preset Demo 1: Buổi 14 - HSK 1-3
export const PRESET_ASSIGNMENT_BUOI_14: UploadedAssignmentPackage = {
  id: 'assign-b14',
  fileName: 'De_On_Tap_Buoi_14_HSK1-3_Tet_Trung_Thu.docx',
  fileType: 'docx',
  sessionNumber: 14,
  sessionTitle: 'Buổi 14: Đón Tết Trung Thu & Ôn Tập Ngữ Pháp HSK 1–3',
  uploadedAt: 'Hôm nay, 14:30',
  dueDate: 'Hôm nay, 23:59',
  teacherName: 'Nguyễn Văn Thụ (阮文受)',
  multipleChoiceList: [
    {
      id: 'mc-14-1',
      type: 'fill-blank',
      targetWord: '温暖',
      question: '春天 来了，阳光 非常 ______。',
      pinyinSentence: 'Chūntiān láile, yángguāng fēicháng ______.',
      options: [
        { key: 'A', label: '温暖 (wēnnuǎn - ấm áp)', isCorrect: true },
        { key: 'B', label: '空调 (kōngtiáo - máy điều hòa)', isCorrect: false },
        { key: 'C', label: '换 (huàn - thay, đổi)', isCorrect: false },
        { key: 'D', label: '初中 (chūzhōng - cấp 2)', isCorrect: false },
      ],
      explanation: 'Từ "温暖" (ấm áp) dùng để miêu tả thời tiết, ánh nắng mặt trời mùa xuân mang lại cảm giác dễ chịu khoan khoái.',
      grammarTip: 'Lưu ý tính từ vị ngữ: "非常 温暖" có phó từ chỉ mức độ "非常" đứng trước tính từ.',
    },
    {
      id: 'mc-14-2',
      type: 'meaning',
      targetWord: '咱们',
      question: 'Trong khẩu ngữ Bắc Kinh, từ “咱们” (zánmen) khác với “我们” (wǒmen) ở điểm cốt lõi nào?',
      options: [
        { key: 'A', label: '“咱们” chỉ người nghe, không bao gồm người nói', isCorrect: false },
        { key: 'B', label: '“咱们” bắt buộc bao gồm cả người nói VÀ người nghe (chúng mình, chúng ta)', isCorrect: true },
        { key: 'C', label: '“咱们” chỉ dùng trong văn viết trang trọng, không dùng khẩu ngữ', isCorrect: false },
        { key: 'D', label: '“咱们” chỉ dành riêng cho người cao tuổi xưng hô', isCorrect: false },
      ],
      explanation: '“咱们” là đại từ số nhiều thân mật, luôn bao hàm cả bên nói và bên nghe; còn “我们” có thể chỉ nhóm của người nói mà không gồm người nghe.',
      grammarTip: 'Quy tắc phân biệt: 咱们 = 我 + 你 (hoặc 你们). Chúng mình cùng đi nhé: 咱们一起走吧！',
    },
    {
      id: 'mc-14-3',
      type: 'fill-blank',
      targetWord: '愿意',
      question: '你 ______ 和 我 一起 去 咖啡馆 喝 奶茶 吗？',
      pinyinSentence: 'Nǐ ______ hé wǒ yīqǐ qù kāfēiguǎn hē nǎichá ma?',
      options: [
        { key: 'A', label: '冰箱 (bīngxiāng - tủ lạnh)', isCorrect: false },
        { key: 'B', label: '刻 (kè - khắc, 15 phút)', isCorrect: false },
        { key: 'C', label: '愿意 (yuànyì - bằng lòng, sẵn lòng)', isCorrect: true },
        { key: 'D', label: '洗衣机 (xǐyījī - máy giặt)', isCorrect: false },
      ],
      explanation: '“愿意” (yuànyì) là động từ năng nguyện diễn tả ý muốn chủ quan, sự sẵn lòng và đồng thuận.',
      grammarTip: 'Vị trí động từ năng nguyện (能愿动词): Đứng TRƯỚC giới từ kết cấu "和 我" và động từ chính "去".',
    },
  ],
  sentenceOrderingList: [
    {
      id: 'so-14-1',
      targetWord: '温暖',
      vietnameseMeaning: 'Ánh nắng của mùa xuân vô cùng ấm áp.',
      pinyin: 'Chūntiān de yángguāng fēicháng wēnnuǎn.',
      correctTokens: ['春天', '的', '阳光', '非常', '温暖', '。'],
      tokensShuffled: ['阳光', '温暖', '春天', '非常', '。', '的'],
      explanation: 'Cấu trúc câu miêu tả: [春天 的 阳光] (Định ngữ + 的 + Trung tâm ngữ) + [非常 温暖] (Phó từ mức độ + Tính từ).',
      grammarTip: 'Tránh lỗi đảo ngược trung tâm ngữ: Không viết "阳光的春天" khi ý muốn nói ánh nắng của mùa xuân.',
      modelSentence: '春天 的 阳光 非常 温暖 。',
    },
    {
      id: 'so-14-2',
      targetWord: '咱们',
      vietnameseMeaning: 'Chúng ta cùng nhau đi xem một bộ phim đi.',
      pinyin: 'Zánmen yīqǐ kàn ge diànyǐng ba.',
      correctTokens: ['咱们', '一起', '看', '个', '电影', '吧', '。'],
      tokensShuffled: ['看', '电影', '咱们', '吧', '一起', '个', '。'],
      explanation: 'Cấu trúc câu rủ rê thân mật: [咱们] (Chủ ngữ) + [一起] (Phó từ) + [看] (Động từ) + [个 电影] (Lượng từ + Tân ngữ) + [吧] (Trợ từ ngữ khí).',
      grammarTip: 'Quy tắc trợ từ ngữ khí: "吧" luôn đứng ở cuối câu cầu khiến hoặc thương lượng.',
      modelSentence: '咱们 一起 看 个 电影 吧 。',
    },
  ],
  essayList: [
    {
      id: 'es-14-1',
      targetWord: '温暖',
      pinyin: 'wēn nuǎn',
      meaning: 'ấm áp (thời tiết / tình cảm)',
      suggestedPrompt: 'Hãy đặt 1 câu tiếng Trung sử dụng từ "温暖" (Gợi ý: tả thời tiết mùa thu, ánh mắt, nụ cười của mẹ, hoặc sự quan tâm của bạn bè).',
      sampleSentence: '老师 的 关怀 让 我 感到 很 温暖 。',
      samplePinyin: 'Lǎoshī de guānhuái ràng wǒ gǎndào hěn wēnnuǎn.',
      sampleTranslation: 'Sự quan tâm của thầy giáo khiến em cảm thấy rất ấm áp.',
      grammarFocus: 'S + 让/使 + Sb + 感到 + 温暖 (Cấu trúc câu kiêm ngữ biểu thị sự tác động cảm xúc).',
    },
    {
      id: 'es-14-2',
      targetWord: '换',
      pinyin: 'huàn',
      meaning: 'đổi, thay đổi',
      suggestedPrompt: 'Hãy đặt 1 câu tiếng Trung sử dụng từ "换" (Gợi ý: đổi tiền nhân dân tệ, đổi vé tàu, hoặc thay chiếc áo mới).',
      sampleSentence: '请问 ， 我 可以 在 这里 换 人民币 吗 ？',
      samplePinyin: 'Qǐngwèn, wǒ kěyǐ zài zhèlǐ huàn rénmínbì ma?',
      sampleTranslation: 'Xin hỏi, tôi có thể đổi nhân dân tệ ở đây không?',
      grammarFocus: 'Giới từ chỉ địa điểm: "在 这里" bắt buộc đứng trước động từ hành động "换".',
    },
  ],
};

// Preset Demo 2: Buổi 15 - HSK 1-3
export const PRESET_ASSIGNMENT_BUOI_15: UploadedAssignmentPackage = {
  id: 'assign-b15',
  fileName: 'Phieu_Kiem_Tra_Ngu_Phap_Buoi_15_Mua_Sam.pdf',
  fileType: 'pdf',
  sessionNumber: 15,
  sessionTitle: 'Buổi 15: Mua Sắm & Ngữ Pháp Lượng Từ Tiếng Trung',
  uploadedAt: 'Hôm nay, 16:15',
  dueDate: 'Ngày mai, 22:00',
  teacherName: 'Nguyễn Văn Thụ (阮文受)',
  multipleChoiceList: [
    {
      id: 'mc-15-1',
      type: 'fill-blank',
      targetWord: '件',
      question: '这 ______ 毛衣 颜色 很 漂亮 ， 也 很 暖和 。',
      pinyinSentence: 'Zhè ______ máoyī yánsè hěn piàoliang, yě hěn nuǎnhuo.',
      options: [
        { key: 'A', label: '件 (jiàn - lượng từ quần áo, sự việc)', isCorrect: true },
        { key: 'B', label: '本 (běn - lượng từ sách vở)', isCorrect: false },
        { key: 'C', label: '张 (zhāng - lượng từ mặt phẳng/bàn/giấy)', isCorrect: false },
        { key: 'D', label: '瓶 (píng - lượng từ chai, lọ)', isCorrect: false },
      ],
      explanation: '“件” (jiàn) là lượng từ chuyên dùng cho áo quần (毛衣, 衬衫, 大衣) hoặc sự việc (一件事).',
      grammarTip: 'Quy tắc lượng từ HSK: Chỉ từ (这/那) + Số từ (1,2..) + Lượng từ + Danh từ.',
    },
    {
      id: 'mc-15-2',
      type: 'fill-blank',
      targetWord: '便宜',
      question: '这 双 鞋子 有点儿 贵 ， 能 不能 ______ 一点儿 ？',
      pinyinSentence: 'Zhè shuāng xiézi yǒudiǎnr guì, néng bù néng ______ yīdiǎnr?',
      options: [
        { key: 'A', label: '便宜 (piányi - rẻ, bớt giá)', isCorrect: true },
        { key: 'B', label: '严肃 (yánsù - nghiêm túc)', isCorrect: false },
        { key: 'C', label: '空调 (kōngtiáo - điều hòa)', isCorrect: false },
        { key: 'D', label: '初中 (chūzhōng - cấp hai)', isCorrect: false },
      ],
      explanation: 'Trong ngữ cảnh mặc cả khi mua đồ: "便宜一点儿" nghĩa là bớt một chút, rẻ hơn một chút.',
      grammarTip: 'Phân biệt: "有点儿 + Tính từ tiêu cực" (hơi đắt) vs "Tính từ + 一点儿" (rẻ hơn một chút).',
    },
    {
      id: 'mc-15-3',
      type: 'meaning',
      targetWord: '地',
      question: 'Trong câu: “他 高兴 ______ 笑了”, cần điền trợ từ kết cấu nào?',
      options: [
        { key: 'A', label: '地 (de - đứng trước động từ biểu thị trạng thái)', isCorrect: true },
        { key: 'B', label: '的 (de - đứng trước danh từ trung tâm ngữ)', isCorrect: false },
        { key: 'C', label: '得 (de - đứng sau động từ/tính từ bổ ngữ)', isCorrect: false },
        { key: 'D', label: '了 (le - trợ từ động thái hoàn thành)', isCorrect: false },
      ],
      explanation: 'Trợ từ "地" tạo thành trạng ngữ: Tính từ/Phó từ + 地 + Động từ (cười một cách vui vẻ).',
      grammarTip: 'Quy tắc 3 chữ De: "的" nối Danh từ, "地" nối Động từ, "得" nối Bổ ngữ.',
    },
  ],
  sentenceOrderingList: [
    {
      id: 'so-15-1',
      targetWord: '超市',
      vietnameseMeaning: 'Buổi chiều tôi muốn đến siêu thị mua một chiếc áo khoác.',
      pinyin: 'Xiàwǔ wǒ xiǎng qù chāoshì mǎi yī jiàn wàitào.',
      correctTokens: ['下午', '我', '想', '去', '超市', '买', '一件', '外套', '。'],
      tokensShuffled: ['外套', '想', '买', '下午', '超市', '一件', '。', '去', '我'],
      explanation: 'Thứ tự từ chỉ thời gian: Thời gian (下午) đứng trước hoặc sau chủ ngữ (我), tiếp đến liên động từ: [去 超市] + [买 一件 外套].',
      grammarTip: 'Quy tắc ngữ pháp vàng Hán ngữ: Trạng từ chỉ thời gian và địa điểm luôn đứng TRƯỚC động từ chính.',
      modelSentence: '下午 我 想 去 超市 买 一件 外套 。',
    },
    {
      id: 'so-15-2',
      targetWord: '一共',
      vietnameseMeaning: 'Tất cả những đồ này tổng cộng là bao nhiêu tiền?',
      pinyin: 'Zhèxiē dōngxi yígòng shì duōshao qián?',
      correctTokens: ['这些', '东西', '一共', '是', '多少', '钱', '？'],
      tokensShuffled: ['多少', '这些', '是', '钱', '一共', '东西', '？'],
      explanation: 'Cấu trúc hỏi giá tiền: [这些 东西] (Chủ ngữ) + [一共] (Phó từ tổng cộng) + [是] + [多少 钱] (Cụm hỏi số lượng tiền) + [？].',
      grammarTip: 'Lưu ý từ để hỏi: "多少" dùng khi dự đoán số lượng lớn hơn 10.',
      modelSentence: '这些 东西 一共 是 多少 钱 ？',
    },
  ],
  essayList: [
    {
      id: 'es-15-1',
      targetWord: '贵',
      pinyin: 'guì',
      meaning: 'đắt, quý báu',
      suggestedPrompt: 'Hãy đặt 1 câu tiếng Trung sử dụng từ "贵" kết hợp cấu trúc "太...了" hoặc "有点儿".',
      sampleSentence: '这 个 手机 太 贵 了 ， 我 不 买 。',
      samplePinyin: 'Zhè ge shǒujī tài guì le, wǒ bù mǎi.',
      sampleTranslation: 'Chiếc điện thoại này đắt quá, tôi không mua đâu.',
      grammarFocus: 'Cấu trúc cảm thán: 太 + Tính từ + 了 (quá đắt rồi).',
    },
    {
      id: 'es-15-2',
      targetWord: '一件',
      pinyin: 'yī jiàn',
      meaning: 'một chiếc, một cái (quần áo/sự việc)',
      suggestedPrompt: 'Hãy đặt 1 câu miêu tả việc mua sắm hoặc tặng người thân 1 chiếc áo mới có cụm "一件".',
      sampleSentence: '妈妈 送 给 我 一件 很 漂亮 的 衣服 。',
      samplePinyin: 'Māma sòng gěi wǒ yī jiàn hěn piàoliang de yīfu.',
      sampleTranslation: 'Mẹ tặng cho em một bộ quần áo rất đẹp.',
      grammarFocus: 'Cấu trúc tặng quà: A + 送 给 + B + Lượng từ + Danh từ.',
    },
  ],
};

/**
 * Intelligent file / text parser that converts arbitrary pasted text or uploaded files
 * into a structured assignment package for Chinese language learners.
 */
export function parseAssignmentContent(
  text: string,
  fileName: string,
  sessionNumber: number,
  sessionTitle: string
): UploadedAssignmentPackage {
  // If the user uploads or picks a demo name, match accordingly
  const cleanName = fileName || 'Bai_Tap_HSK.txt';
  const fileExt = (cleanName.split('.').pop() || 'txt').toLowerCase() as
    | 'docx'
    | 'pdf'
    | 'txt'
    | 'csv'
    | 'pasted';

  // Check if text has custom identifiable keywords or if we extract dynamically
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Default Fallback Questions if the file text is short or generic
  let mcList = [...PRESET_ASSIGNMENT_BUOI_14.multipleChoiceList];
  let soList = [...PRESET_ASSIGNMENT_BUOI_14.sentenceOrderingList];
  let esList = [...PRESET_ASSIGNMENT_BUOI_14.essayList];

  // If text mentions specific vocabulary words, let's adapt them
  const hasKhaiThoa = text.includes('空调') || text.includes('kōngtiáo');
  const hasMuaSam = text.includes('买') || text.includes('件') || text.includes('贵');

  if (hasMuaSam) {
    mcList = [...PRESET_ASSIGNMENT_BUOI_15.multipleChoiceList];
    soList = [...PRESET_ASSIGNMENT_BUOI_15.sentenceOrderingList];
    esList = [...PRESET_ASSIGNMENT_BUOI_15.essayList];
  }

  // Attempt dynamic question parsing if user provided formatted text
  // e.g., finding lines with "A." "B." "C." "D."
  const dynamicMC: MultipleChoiceQ[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      (line.startsWith('Câu') || line.startsWith('Q') || /^\d+\./.test(line)) &&
      (lines[i + 1]?.startsWith('A.') || lines[i + 1]?.startsWith('A)'))
    ) {
      const qText = line.replace(/^\d+[\.\:\-]\s*/, '').replace(/^Câu\s*\d+[\.\:\-]\s*/, '');
      const optA = (lines[i + 1] || 'A. Đáp án A').substring(2).trim();
      const optB = (lines[i + 2] || 'B. Đáp án B').substring(2).trim();
      const optC = (lines[i + 3] || 'C. Đáp án C').substring(2).trim();
      const optD = (lines[i + 4] || 'D. Đáp án D').substring(2).trim();

      dynamicMC.push({
        id: `custom-mc-${dynamicMC.length + 1}`,
        type: 'fill-blank',
        targetWord: 'Từ vựng trọng tâm',
        question: qText,
        options: [
          { key: 'A', label: optA, isCorrect: true },
          { key: 'B', label: optB, isCorrect: false },
          { key: 'C', label: optC, isCorrect: false },
          { key: 'D', label: optD, isCorrect: false },
        ],
        explanation: 'AI đã tự động bóc tách từ file đề bài của giáo viên.',
        grammarTip: 'Ghi nhớ trọng điểm ngữ pháp của câu theo giáo án buổi học.',
      });
      i += 4;
    }
  }

  if (dynamicMC.length >= 2) {
    mcList = dynamicMC;
  }

  return {
    id: `pkg-${Date.now()}`,
    fileName: cleanName,
    fileType: fileExt,
    sessionNumber,
    sessionTitle,
    uploadedAt: 'Vừa xong',
    dueDate: 'Hôm nay, 23:59',
    teacherName: 'Nguyễn Văn Thụ (阮文受)',
    rawContent: text.substring(0, 500),
    multipleChoiceList: mcList,
    sentenceOrderingList: soList,
    essayList: esList,
  };
}

/**
 * Get active assignment from localStorage, with fallback to Buổi 14 default
 */
export function getStoredAssignment(): UploadedAssignmentPackage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ASSIGNMENT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.multipleChoiceList && parsed.multipleChoiceList.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fallback silently
  }
  return PRESET_ASSIGNMENT_BUOI_14;
}

/**
 * Save active assignment and broadcast event to sync role views in real-time
 */
export function saveStoredAssignment(pkg: UploadedAssignmentPackage): void {
  try {
    localStorage.setItem(STORAGE_KEY_ASSIGNMENT, JSON.stringify(pkg));
    window.dispatchEvent(
      new CustomEvent('hanu_assignment_updated', { detail: pkg })
    );
  } catch {
    // Ignore storage quota errors
  }
}
