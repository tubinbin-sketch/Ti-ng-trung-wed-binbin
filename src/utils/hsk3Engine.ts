import { VocabSlide } from '../data/chineseData';
import { ClassStudentRecord } from './chineseEngine';

export type Hsk3StageId = 'all' | 'elementary' | 'intermediate' | 'advanced';

export type Hsk3LevelFilter =
  | 'all'
  | 'HSK 1'
  | 'HSK 2'
  | 'HSK 3'
  | 'HSK 4'
  | 'HSK 5'
  | 'HSK 6'
  | 'HSK 7-9';

export interface Hsk3StageDefinition {
  id: Hsk3StageId;
  titleVi: string;
  titleZh: string;
  badgeLabel: string;
  levels: string[];
  description: string;
}

export const HSK3_STAGES: Hsk3StageDefinition[] = [
  {
    id: 'all',
    titleVi: 'Tất cả (三等九级)',
    titleZh: '全部等级',
    badgeLabel: 'HSK 1–9',
    levels: ['HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6', 'HSK 7-9', 'HSK 7–9'],
    description: 'Toàn bộ từ vựng và điểm ngữ pháp theo chuẩn HSK 3.0 (3 Bậc - 9 Cấp)',
  },
  {
    id: 'elementary',
    titleVi: 'Sơ cấp (初等)',
    titleZh: '初等 · HSK 1–3',
    badgeLabel: 'HSK 1, 2, 3',
    levels: ['HSK 1', 'HSK 2', 'HSK 3'],
    description: 'Nền tảng giao tiếp đời sống · 300 chữ viết tay (手写字)/cấp · 2.245 từ vựng sơ cấp',
  },
  {
    id: 'intermediate',
    titleVi: 'Trung cấp (中等)',
    titleZh: '中等 · HSK 4–6',
    badgeLabel: 'HSK 4, 5, 6',
    levels: ['HSK 4', 'HSK 5', 'HSK 6'],
    description: 'Diễn đạt thành đoạn văn, nghị luận xã hội & phân biệt từ đồng nghĩa chuyên sâu',
  },
  {
    id: 'advanced',
    titleVi: 'Cao cấp (高等)',
    titleZh: '高等 · HSK 7–9',
    badgeLabel: 'HSK 7–9',
    levels: ['HSK 7-9', 'HSK 7–9', 'HSK 7', 'HSK 8', 'HSK 9'],
    description: 'Hán ngữ học thuật, thành ngữ tứ tự (成语) & biên phiên dịch chuyên nghiệp',
  },
];

export interface Hsk3VocabStandardMeta {
  hanzi: string;
  stageId: 'elementary' | 'intermediate' | 'advanced';
  stageLabel: string;
  hskLevelNormalized: string;
  charCategory: 'handwriting' | 'recognition';
  charCategoryLabel: string;
  charCategoryShort: string;
  charCategoryDetail: string;
  grammarTitle: string;
  grammarFormula: string;
  grammarExampleHanzi: string;
  grammarExamplePinyin: string;
  grammarExampleMeaning: string;
  synonymDistinction: string;
}

const CURATED_HSK3_META: Record<
  string,
  Omit<
    Hsk3VocabStandardMeta,
    'hanzi' | 'stageId' | 'stageLabel' | 'hskLevelNormalized' | 'charCategoryLabel' | 'charCategoryShort'
  >
> = {
  温暖: {
    charCategory: 'handwriting',
    charCategoryDetail: 'Thuộc nhóm 300 chữ trọng tâm cần luyện viết tay chuẩn bút thuận (温: 12 nét, 暖: 13 nét).',
    grammarTitle: 'Cấu trúc truyền đạt sự ấm áp & cảm xúc',
    grammarFormula: 'Chủ ngữ + 给 + Tân ngữ + 带来 + 温暖',
    grammarExampleHanzi: '老师 的 话 给 我 带来 了 温暖。',
    grammarExamplePinyin: 'Lǎoshī de huà gěi wǒ dàilái le wēnnuǎn.',
    grammarExampleMeaning: 'Lời nói của thầy cô đã mang lại sự ấm áp cho tôi.',
    synonymDistinction:
      'Phân biệt từ gần nghĩa: 温暖 (dùng cho cả thời tiết lẫn tình cảm trừu tượng, trang trọng) vs 暖和 (chỉ dùng cho thời tiết, phòng ốc hoặc cơ thể ấm áp trong khẩu ngữ).',
  },
  咱们: {
    charCategory: 'handwriting',
    charCategoryDetail: 'Thuộc bảng chữ viết tay sơ cấp HSK 3.0 (咱: 9 nét, 们: 5 nét).',
    grammarTitle: 'Cấu trúc đề nghị, rủ rê bao gồm người nghe',
    grammarFormula: '咱们 + 一起 + Động từ + (Tân ngữ) + 吧',
    grammarExampleHanzi: '咱们 一起 复习 HSK 词汇 吧！',
    grammarExamplePinyin: 'Zánmen yīqǐ fùxí HSK cíhuì ba!',
    grammarExampleMeaning: 'Chúng mình cùng nhau ôn tập từ vựng HSK nhé!',
    synonymDistinction:
      'Phân biệt từ gần nghĩa: 咱们 (bắt buộc bao gồm cả người nói và người nghe) vs 我们 (có thể bao gồm hoặc loại trừ người nghe tùy ngữ cảnh).',
  },
  换: {
    charCategory: 'handwriting',
    charCategoryDetail: 'Chữ viết tay cốt lõi có bộ Thủ 扌 (10 nét) biểu thị hành động trao đổi bằng tay.',
    grammarTitle: 'Cấu trúc đổi / thay thế vật phẩm hoặc tiền tệ',
    grammarFormula: 'Chủ ngữ + 把 + A + 换成 + B  /  换 + Danh từ (钱 / 衣服 / 车)',
    grammarExampleHanzi: '请 把 这 张 大钞 换成 零钱。',
    grammarExamplePinyin: 'Qǐng bǎ zhè zhāng dàchāo huànchéng língqián.',
    grammarExampleMeaning: 'Xin hãy đổi tờ tiền mệnh giá lớn này thành tiền lẻ.',
    synonymDistinction:
      'Phân biệt từ gần nghĩa: 换 (đổi cái này lấy cái khác, thay đồ) vs 变 (biến đổi tính chất, trạng thái nội tại).',
  },
  空调: {
    charCategory: 'recognition',
    charCategoryDetail: 'Từ ghép thiết bị sinh hoạt: Ưu tiên nhận diện đọc hiểu nhanh (认读字) và phát âm chuẩn.',
    grammarTitle: 'Cấu trúc điều khiển thiết bị điện gia dụng với bổ ngữ trạng thái',
    grammarFormula: '开 / 关 + 空调  |  把 空调 调到 + Nhiệt độ (度)',
    grammarExampleHanzi: '请 把 空调 调到 二十六 度。',
    grammarExamplePinyin: 'Qǐng bǎ kōngtiáo tiáodào èrshíliù dù.',
    grammarExampleMeaning: 'Xin hãy chỉnh điều hòa về mức 26 độ.',
    synonymDistinction:
      'Lưu ý lượng từ chuẩn HSK 3.0: 一台空调 (một chiếc điều hòa) vs 一部手机 (một chiếc điện thoại).',
  },
  洗衣机: {
    charCategory: 'recognition',
    charCategoryDetail: 'Chữ 衣 & 机 thuộc nhóm viết tay cơ bản; chữ 洗 ưu tiên nhận diện mặt chữ trong tổ hợp.',
    grammarTitle: 'Câu chữ 把 với công cụ giặt giũ',
    grammarFormula: 'Chủ ngữ + 把 + 衣服 + 放进 + 洗衣机 + 里',
    grammarExampleHanzi: '妈妈 把 衣服 放进 洗衣机 里 了。',
    grammarExamplePinyin: 'Māma bǎ yīfu fàngjìn xǐyījī lǐ le.',
    grammarExampleMeaning: 'Mẹ đã cho quần áo vào trong máy giặt rồi.',
    synonymDistinction:
      'Phân biệt động từ: 用洗衣机洗 (giặt bằng máy giặt) vs 手洗 (giặt tay).',
  },
  花园: {
    charCategory: 'handwriting',
    charCategoryDetail: 'Cả hai chữ 花 (7 nét) và 园 (7 nét) đều thuộc danh mục 300 chữ viết tay sơ cấp.',
    grammarTitle: 'Cấu trúc câu tồn hiện miêu tả cảnh vật nơi chốn',
    grammarFormula: 'Từ chỉ nơi chốn (花园里) + Động từ + 着 / 了 + Danh từ',
    grammarExampleHanzi: '花园 里 开满 了 五颜六色 的 鲜花。',
    grammarExamplePinyin: 'Huāyuán lǐ kāimǎn le wǔyánliùsè de xiānhuā.',
    grammarExampleMeaning: 'Trong vườn hoa nở rộ những bông hoa tươi đủ màu sắc.',
    synonymDistinction:
      'Phân biệt từ gần nghĩa: 花园 (vườn hoa gia đình/khu dân cư) vs 公园 (công viên công cộng lớn).',
  },
  挺: {
    charCategory: 'recognition',
    charCategoryDetail: 'Phó từ chỉ mức độ thông dụng trong khẩu ngữ: Nhận diện đọc hiểu & vận dụng đặt câu.',
    grammarTitle: 'Cấu trúc phó từ mức độ vừa phải, tự nhiên',
    grammarFormula: 'Chủ ngữ + 挺 + Tính từ / Động từ tâm lý + 的',
    grammarExampleHanzi: '今天 的 汉语 课 挺 有意思 的。',
    grammarExamplePinyin: 'Jīntiān de Hànyǔ kè tǐng yǒuyìsi de.',
    grammarExampleMeaning: 'Buổi học tiếng Trung hôm nay khá là thú vị.',
    synonymDistinction:
      'Phân biệt từ gần nghĩa: 挺...的 (khẩu ngữ thân mật, thường có 的 ở cuối) vs 很 / 非常 (dùng được cả văn nói và văn viết, không bắt buộc 的).',
  },
  初中: {
    charCategory: 'handwriting',
    charCategoryDetail: 'Chữ 初 (7 nét) và 中 (4 nét) thuộc nhóm chữ Hán bắt buộc viết tay bậc Sơ cấp.',
    grammarTitle: 'Cấu trúc biểu thị giai đoạn học tập và thời gian',
    grammarFormula: '上 / 读 + 初中  |  初中 + Danh từ (初中生 / 初中同学)',
    grammarExampleHanzi: '弟弟 今年 九月 开始 上 初中。',
    grammarExamplePinyin: 'Dìdi jīnnián jiǔyuè kāishǐ shàng chūzhōng.',
    grammarExampleMeaning: 'Tháng 9 năm nay em trai bắt đầu học cấp 2 (THCS).',
    synonymDistinction:
      'Hệ thống cấp học Trung Quốc: 小学 (Tiểu học) → 初中 (THCS - Cấp 2) → 高中 (THPT - Cấp 3) → 大学 (Đại học).',
  },
  刻: {
    charCategory: 'handwriting',
    charCategoryDetail: 'Chữ 刻 (8 nét, bộ Đao 刂) thuộc nhóm chữ viết tay chỉ thời gian bắt buộc ở HSK 2–3.',
    grammarTitle: 'Cấu trúc biểu đạt giờ giấc với Khắc (15 phút)',
    grammarFormula: 'Số giờ + 点 + 一刻 (15p) / 三刻 (45p)  |  差一刻 + Số giờ + 点',
    grammarExampleHanzi: '我们 差 一刻 八点 在 学校 门口 见。',
    grammarExamplePinyin: 'Wǒmen chà yī kè bā diǎn zài xuéxiào ménkǒu jiàn.',
    grammarExampleMeaning: '8 giờ kém 15 phút chúng ta gặp nhau ở cổng trường nhé.',
    synonymDistinction:
      'Phân biệt: 一刻 (mốc thời gian 15 phút trên đồng hồ) vs 一刻钟 (khoảng thời gian dài 15 phút).',
  },
  愿意: {
    charCategory: 'handwriting',
    charCategoryDetail: 'Cả hai chữ 愿 và 意 đều chứa bộ Tâm (心), thuộc nhóm chữ viết tay trọng tâm.',
    grammarTitle: 'Động từ năng nguyện biểu thị sự tự nguyện, đồng ý',
    grammarFormula: 'Chủ ngữ + (很 / 不) + 愿意 + Cụm động từ',
    grammarExampleHanzi: '为了 学好 中文，我 愿意 每天 练习 汉字。',
    grammarExamplePinyin: 'Wèile xuéhǎo Zhōngwén, wǒ yuànyì měitiān liànxí Hànzì.',
    grammarExampleMeaning: 'Để học tốt tiếng Trung, tôi sẵn lòng luyện viết chữ Hán mỗi ngày.',
    synonymDistinction:
      'Phân biệt từ gần nghĩa: 愿意 (tự nguyện từ trong lòng) vs 肯 (chịu/đồng ý làm việc gì sau khi cân nhắc).',
  },
  龙: {
    charCategory: 'handwriting',
    charCategoryDetail: 'Chữ 龙 (5 nét) là chữ tượng hình văn hóa cốt lõi cần viết tay chuẩn xác.',
    grammarTitle: 'Cấu trúc định ngữ văn hóa & thành ngữ Hán ngữ',
    grammarFormula: 'A + 是 + B + 的 + 象征 (A là biểu tượng của B)',
    grammarExampleHanzi: '神龙 是 中华 传统文化 的 吉祥 象征。',
    grammarExamplePinyin: 'Shénlóng shì Zhōnghuá chuántǒng wénhuà de jíxiáng xiàngzhēng.',
    grammarExampleMeaning: 'Thần Long là biểu tượng cát tường của văn hóa truyền thống Trung Hoa.',
    synonymDistinction:
      'Thành ngữ HSK mở rộng: 龙马精神 (tinh thần dồi dào mạnh mẽ như rồng ngựa) · 望子成龙 (mong con thành tài).',
  },
  狗: {
    charCategory: 'handwriting',
    charCategoryDetail: 'Chữ 狗 (8 nét, bộ Khuyển 犭) thuộc 300 chữ viết tay đầu tiên của HSK 1.',
    grammarTitle: 'Cấu trúc lượng từ đi với động vật & tính từ miêu tả',
    grammarFormula: 'Số từ + 只 / 条 + (Tính từ) + 狗',
    grammarExampleHanzi: '她 养 了 一只 非常 聪明 的 小狗。',
    grammarExamplePinyin: 'Tā yǎng le yī zhī fēicháng cōngmíng de xiǎogǒu.',
    grammarExampleMeaning: 'Cô ấy nuôi một chú cún con vô cùng thông minh.',
    synonymDistinction:
      'Lượng từ chuẩn: 一只小狗 (chú chó nhỏ đáng yêu) vs 一条大狗 (con chó lớn).',
  },
  咖啡: {
    charCategory: 'recognition',
    charCategoryDetail: 'Từ mượn âm (咖 + 啡, bộ Khẩu 口): Thuộc nhóm chữ nhận diện đọc hiểu (认读字) sơ cấp.',
    grammarTitle: 'Cấu trúc gọi đồ uống và lượng từ chỉ cốc/tách',
    grammarFormula: 'Chủ ngữ + 想 / 喜欢 + 喝 + Số từ + 杯 + (冰 / 热) + 咖啡',
    grammarExampleHanzi: '服务员，请 给 我 来 一杯 热 咖啡。',
    grammarExamplePinyin: 'Fúwùyuán, qǐng gěi wǒ lái yī bēi rè kāfēi.',
    grammarExampleMeaning: 'Bạn phục vụ ơi, làm ơn cho tôi một tách cà phê nóng.',
    synonymDistinction:
      'Từ vựng đồ uống cùng nhóm HSK 2: 一杯咖啡 (tách cà phê) · 一壶茶 (ấm trà) · 一瓶牛奶 (chai sữa).',
  },
  努力: {
    charCategory: 'handwriting',
    charCategoryDetail: 'Chữ 努 (7 nét) và 力 (2 nét) thuộc danh mục chữ viết tay bắt buộc bậc Sơ cấp.',
    grammarTitle: 'Cấu trúc trạng ngữ chỉ sự nỗ lực & câu điều kiện 只要...就...',
    grammarFormula: '只要 + Chủ ngữ + 努力 + Động từ，就 + 一定 能 / 会 + Kết quả',
    grammarExampleHanzi: '只要 你 努力 学习，就 一定 能 通过 HSK 考试。',
    grammarExamplePinyin: 'Zhǐyào nǐ nǔlì xuéxí, jiù yīdìng néng tōngguò HSK kǎoshì.',
    grammarExampleMeaning: 'Chỉ cần bạn nỗ lực học tập thì nhất định sẽ thi đỗ kỳ thi HSK.',
    synonymDistinction:
      'Phân biệt từ gần nghĩa: 努力 (vừa là tính từ vừa làm trạng ngữ trước động từ: 努力工作) vs 用功 (thường chỉ sự chăm chỉ trong học tập).',
  },
  交通: {
    charCategory: 'handwriting',
    charCategoryDetail: 'Chữ 交 (6 nét) và 通 (10 nét) thuộc 600 chữ viết tay cốt lõi của bậc Sơ cấp HSK 2–3.',
    grammarTitle: 'Cấu trúc nhận xét hệ thống giao thông & phương tiện đi lại',
    grammarFormula: 'Địa điểm + 的 + 交通 + 很 / 非常 + 方便 (hoặc 拥堵)',
    grammarExampleHanzi: '现在 城市 的 公共交通 非常 方便。',
    grammarExamplePinyin: 'Xiànzài chéngshì de gōnggòng jiāotōng fēicháng fāngbiàn.',
    grammarExampleMeaning: 'Hiện nay giao thông công cộng của thành phố vô cùng thuận tiện.',
    synonymDistinction:
      'Phân biệt từ gần nghĩa: 交通 (hệ thống giao thông, đi lại nói chung: 交通工具) vs 运输 (vận tải hàng hóa, hành khách quy mô lớn).',
  },
  坚持: {
    charCategory: 'handwriting',
    charCategoryDetail: 'Thuộc nhóm chữ viết tay Trung cấp HSK 4 (坚: 7 nét, 持: 9 nét).',
    grammarTitle: 'Cấu trúc kiên trì thực hiện mục tiêu đến cùng',
    grammarFormula: 'Chủ ngữ + 坚持 + Động từ / Cụm động từ + 下去',
    grammarExampleHanzi: '无论 多么 困难，我们 都 要 坚持 下去。',
    grammarExamplePinyin: 'Wúlùn duōme kùnnan, wǒmen dōu yào jiānchí xiàqù.',
    grammarExampleMeaning: 'Dù khó khăn đến đâu, chúng ta đều phải kiên trì đến cùng.',
    synonymDistinction:
      'Phân biệt từ gần nghĩa: 坚持 (kiên trì hành động hoặc giữ vững lập trường) vs 保持 (duy trì một trạng thái, mức độ sẵn có như 保持安静).',
  },
  包容: {
    charCategory: 'recognition',
    charCategoryDetail: 'Từ vựng Trung cấp HSK 5–6: Chữ 包 viết tay, chữ 容 nhận diện đọc hiểu và vận dụng nghị luận.',
    grammarTitle: 'Cấu trúc biểu đạt sự bao dung, thấu hiểu trong giao tiếp xã hội',
    grammarFormula: '对 + Người / Sự việc + 充满 + 包容  |  互相 + 理解 与 包容',
    grammarExampleHanzi: '真正 的 友谊 需要 互相 理解 与 包容。',
    grammarExamplePinyin: 'Zhēnzhèng de yǒuyì xūyào hùxiāng lǐjiě yǔ bāoróng.',
    grammarExampleMeaning: 'Tình bạn chân chính cần sự thấu hiểu và bao dung lẫn nhau.',
    synonymDistinction:
      'Phân biệt từ gần nghĩa: 包容 (bao dung, chấp nhận sự khác biệt về văn hóa/tính cách) vs 原谅 (tha thứ cho một lỗi lầm cụ thể).',
  },
  融会贯通: {
    charCategory: 'recognition',
    charCategoryDetail: 'Thành ngữ Cao cấp HSK 7–9: Trọng tâm nhận diện đọc hiểu (认读字) và diễn đạt học thuật.',
    grammarTitle: 'Cấu trúc thành ngữ tứ tự làm vị ngữ hoặc bổ ngữ kết quả',
    grammarFormula: '把 + 知识 / 语法 + 融会贯通  |  学得 + 融会贯通',
    grammarExampleHanzi: '学习 语言 要 把 词汇 和 语法 融会贯通。',
    grammarExamplePinyin: 'Xuéxí yǔyán yào bǎ cíhuì hé yǔfǎ rónghuì-guàntōng.',
    grammarExampleMeaning: 'Học ngôn ngữ cần phải dung hợp và thấu suốt từ vựng với ngữ pháp.',
    synonymDistinction:
      'Phân biệt thành ngữ HSK 7–9: 融会贯通 (hiểu sâu sắc và kết nối toàn diện kiến thức) vs 举一反三 (học một biết mười, suy luận linh hoạt).',
  },
  明天: {
    charCategory: 'handwriting',
    charCategoryDetail: 'Thuộc 300 chữ Hán viết tay cốt lõi của HSK 1 (明: 8 nét, 天: 4 nét).',
    grammarTitle: 'Trạng ngữ chỉ thời gian đứng trước hoặc sau Chủ ngữ',
    grammarFormula: '明天 + Chủ ngữ + Động từ + Tân ngữ  |  Chủ ngữ + 明天 + Động từ + Tân ngữ',
    grammarExampleHanzi: '明天 我们 一起 去 北京 看 长城 吧！',
    grammarExamplePinyin: 'Míngtiān wǒmen yīqǐ qù Běijīng kàn Chángchéng ba!',
    grammarExampleMeaning: 'Ngày mai chúng ta cùng đi Bắc Kinh ngắm Vạn Lý Trường Thành nhé!',
    synonymDistinction:
      'Hệ thống danh từ thời gian: 昨天 (hôm qua) → 今天 (hôm nay) → 明天 (ngày mai) → 后天 (ngày kia).',
  },
  照顾: {
    charCategory: 'handwriting',
    charCategoryDetail: 'Thuộc nhóm từ vựng trọng tâm HSK 3 (照: 13 nét bộ Hỏa 灬, 顾: 10 nét bộ Hiệt 页).',
    grammarTitle: 'Cấu trúc chăm sóc, quan tâm chu đáo tới ai đó',
    grammarFormula: 'Chủ ngữ + (很 / 细心地) + 照顾 + Tân ngữ (家人 / 孩子 / 自己)',
    grammarExampleHanzi: '妈妈 一直 很 细心地 照顾 我们。',
    grammarExamplePinyin: 'Māma yīzhí hěn xìxīn de zhàogù wǒmen.',
    grammarExampleMeaning: 'Mẹ luôn ân cần và chu đáo chăm sóc chúng tôi.',
    synonymDistinction:
      'Phân biệt từ gần nghĩa: 照顾 (chăm sóc cụ thể về ăn ở, sức khỏe, sinh hoạt) vs 关心 (quan tâm về mặt tình cảm, hỏi han tinh thần).',
  },
  考试: {
    charCategory: 'handwriting',
    charCategoryDetail: 'Thuộc nhóm chữ viết tay bắt buộc HSK 2 (考: 6 nét bộ Lão 耂, 试: 8 nét bộ Ngôn 讠).',
    grammarTitle: 'Cấu trúc tham gia kỳ thi & đạt kết quả cao',
    grammarFormula: '参加 + (HSK / 汉语) + 考试  |  考试 + 取得 + 好成绩',
    grammarExampleHanzi: '祝 你 明天的 汉语 考试 取得 好 成绩！',
    grammarExamplePinyin: 'Zhù nǐ míngtiān de Hànyǔ kǎoshì qǔdé hǎo chéngjì!',
    grammarExampleMeaning: 'Chúc bạn kỳ thi tiếng Trung ngày mai đạt kết quả cao!',
    synonymDistinction:
      'Phân biệt: 考试 (vừa là danh từ “kỳ thi”, vừa là động từ “thi cử”) vs 测验 (bài kiểm tra nhỏ trên lớp).',
  },
  旅行: {
    charCategory: 'handwriting',
    charCategoryDetail: 'Thuộc danh mục từ vựng HSK 2–3 (旅: 10 nét bộ Phương 方, 行: 6 nét bộ Hành 行).',
    grammarTitle: 'Câu liên động biểu thị mục đích chuyến đi du lịch',
    grammarFormula: 'Chủ ngữ + 去 + Địa điểm + 旅行',
    grammarExampleHanzi: '今年 暑假 我们 打算 去 中国 旅行。',
    grammarExamplePinyin: 'Jīnnián shǔjià wǒmen dǎsuàn qù Zhōngguó lǚxíng.',
    grammarExampleMeaning: 'Kỳ nghỉ hè năm nay chúng tôi dự định đi du lịch Trung Quốc.',
    synonymDistinction:
      'Phân biệt từ gần nghĩa: 旅行 (chuyến hành trình đi xa khám phá, du lịch) vs 旅游 (du lịch tham quan nghỉ dưỡng nói chung).',
  },
};

export function normalizeHskLevelLabel(rawLevel: string): string {
  const clean = (rawLevel || 'HSK 3').trim().toUpperCase();
  if (clean.includes('7') || clean.includes('8') || clean.includes('9')) {
    return 'HSK 7–9';
  }
  const match = clean.match(/HSK\s*([1-6])/);
  if (match) {
    return `HSK ${match[1]}`;
  }
  return 'HSK 3';
}

export function getHsk3StageForLevel(rawLevel: string): {
  stageId: 'elementary' | 'intermediate' | 'advanced';
  stageLabel: string;
} {
  const normalized = normalizeHskLevelLabel(rawLevel);
  if (normalized === 'HSK 1' || normalized === 'HSK 2' || normalized === 'HSK 3') {
    return { stageId: 'elementary', stageLabel: 'Sơ cấp (初等 · HSK 1–3)' };
  }
  if (normalized === 'HSK 4' || normalized === 'HSK 5' || normalized === 'HSK 6') {
    return { stageId: 'intermediate', stageLabel: 'Trung cấp (中等 · HSK 4–6)' };
  }
  return { stageId: 'advanced', stageLabel: 'Cao cấp (高等 · HSK 7–9)' };
}

export function getHsk3VocabStandard(slide: VocabSlide): Hsk3VocabStandardMeta {
  const hskLevelNormalized = normalizeHskLevelLabel(slide.hskLevel);
  const { stageId, stageLabel } = getHsk3StageForLevel(hskLevelNormalized);
  const curated = CURATED_HSK3_META[slide.hanzi];

  const totalStrokes = slide.characters.reduce((acc, c) => acc + (c.strokeCount || 8), 0);
  const avgStrokes = slide.characters.length > 0 ? totalStrokes / slide.characters.length : 8;

  const charCategory: 'handwriting' | 'recognition' = curated
    ? curated.charCategory
    : stageId === 'elementary' && avgStrokes <= 11
    ? 'handwriting'
    : 'recognition';

  const charCategoryLabel =
    charCategory === 'handwriting'
      ? '✍️ Chữ cần viết tay (手写字 - 300 chữ/cấp sơ cấp)'
      : '👁️ Chữ nhận diện đọc hiểu (认读字)';

  const charCategoryShort =
    charCategory === 'handwriting' ? '手写字 · Viết tay' : '认读字 · Nhận diện';

  if (curated) {
    return {
      hanzi: slide.hanzi,
      stageId,
      stageLabel,
      hskLevelNormalized,
      charCategory,
      charCategoryLabel,
      charCategoryShort,
      charCategoryDetail: curated.charCategoryDetail,
      grammarTitle: curated.grammarTitle,
      grammarFormula: curated.grammarFormula,
      grammarExampleHanzi: curated.grammarExampleHanzi,
      grammarExamplePinyin: curated.grammarExamplePinyin,
      grammarExampleMeaning: curated.grammarExampleMeaning,
      synonymDistinction: curated.synonymDistinction,
    };
  }

  return {
    hanzi: slide.hanzi,
    stageId,
    stageLabel,
    hskLevelNormalized,
    charCategory,
    charCategoryLabel,
    charCategoryShort,
    charCategoryDetail:
      charCategory === 'handwriting'
        ? `Thuộc nhóm 300 chữ Hán trọng tâm cần viết tay chuẩn thứ tự nét (${slide.characters
            .map((c) => `${c.char}: ${c.strokeCount} nét`)
            .join(', ')}).`
        : `Thuộc nhóm chữ nhận diện đọc hiểu (认读字) chuẩn HSK 3.0 — tập trung nhớ mặt chữ, phát âm và ngữ cảnh.`,
    grammarTitle: `Điểm ngữ pháp trọng tâm với “${slide.hanzi}” (${slide.partOfSpeech})`,
    grammarFormula: `Chủ ngữ + (Trạng ngữ) + ${slide.hanzi} + Thành phần tân ngữ / bổ ngữ`,
    grammarExampleHanzi: slide.exampleHanzi,
    grammarExamplePinyin: slide.examplePinyin,
    grammarExampleMeaning: slide.exampleMeaning,
    synonymDistinction: slide.usageNote
      ? `Ghi chú ngữ dụng & từ gần nghĩa: ${slide.usageNote}`
      : `Vận dụng chuẩn HSK 3.0: Kết hợp “${slide.hanzi}” (${slide.pinyin}) trong câu giao tiếp thực tế.`,
  };
}

export function filterSlidesByHsk3(
  slides: VocabSlide[],
  stageFilter: Hsk3StageId,
  levelFilter: Hsk3LevelFilter = 'all'
): VocabSlide[] {
  return slides.filter((s) => {
    const normLevel = normalizeHskLevelLabel(s.hskLevel);
    const { stageId } = getHsk3StageForLevel(normLevel);

    if (stageFilter !== 'all' && stageId !== stageFilter) {
      return false;
    }

    if (levelFilter !== 'all') {
      if (levelFilter === 'HSK 7-9') {
        return normLevel === 'HSK 7–9';
      }
      return normLevel === levelFilter;
    }

    return true;
  });
}

export function pickRandomStudent(
  roster: ClassStudentRecord[],
  previousStudentId?: string
): ClassStudentRecord | null {
  if (!roster || roster.length === 0) return null;
  if (roster.length === 1) return roster[0];
  const candidates = previousStudentId
    ? roster.filter((s) => s.id !== previousStudentId)
    : roster;
  const pool = candidates.length > 0 ? candidates : roster;
  const randomIdx = Math.floor(Math.random() * pool.length);
  return pool[randomIdx];
}

export function formatClassTimer(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export interface Hsk3LessonPlanRow {
  index: number;
  hanzi: string;
  pinyin: string;
  hanViet: string;
  meaning: string;
  hskLevel: string;
  stageLabel: string;
  charStandard: string;
  grammarFormula: string;
  synonymNote: string;
  exampleSentence: string;
}

export function generateHsk3LessonPlanSummary(
  slides: VocabSlide[],
  lessonTitle = 'Giáo án Thực chiến HSK 3.0 — HANU × 阮文受'
): {
  lessonTitle: string;
  totalWords: number;
  handwritingCount: number;
  recognitionCount: number;
  rows: Hsk3LessonPlanRow[];
} {
  let handwritingCount = 0;
  let recognitionCount = 0;

  const rows: Hsk3LessonPlanRow[] = slides.map((s, idx) => {
    const meta = getHsk3VocabStandard(s);
    if (meta.charCategory === 'handwriting') {
      handwritingCount += 1;
    } else {
      recognitionCount += 1;
    }
    return {
      index: idx + 1,
      hanzi: s.hanzi,
      pinyin: s.pinyin,
      hanViet: s.hanViet,
      meaning: s.meaning,
      hskLevel: meta.hskLevelNormalized,
      stageLabel: meta.stageLabel,
      charStandard: meta.charCategoryShort,
      grammarFormula: meta.grammarFormula,
      synonymNote: meta.synonymDistinction,
      exampleSentence: `${s.exampleHanzi} (${s.exampleMeaning})`,
    };
  });

  return {
    lessonTitle,
    totalWords: slides.length,
    handwritingCount,
    recognitionCount,
    rows,
  };
}

export interface StudentHsk3PillarMetric {
  id: 'syllables' | 'recognition' | 'handwriting' | 'vocab_grammar';
  titleVi: string;
  titleZh: string;
  currentCount: number;
  targetCount: number;
  unitLabel: string;
  percent: number;
  statusNote: string;
}

export function calculateStudentHsk3Pillars(params: {
  learnedSlideCount: number;
  totalSlideCount: number;
  writingAccuracyPct: number;
  completedTranslationCount: number;
}): StudentHsk3PillarMetric[] {
  const learnedRatio =
    params.totalSlideCount > 0
      ? Math.min(1, Math.max(0.4, params.learnedSlideCount / params.totalSlideCount))
      : 0.78;
  const writingBoost = Math.min(1, Math.max(0.65, params.writingAccuracyPct / 100));
  const translationBoost = Math.min(25, params.completedTranslationCount * 8);

  const syllableCurrent = Math.min(608, Math.round(485 + learnedRatio * 95 + translationBoost));
  const recognitionCurrent = Math.min(900, Math.round(680 + learnedRatio * 180 + translationBoost));
  const handwritingCurrent = Math.min(300, Math.round(215 * writingBoost + learnedRatio * 65));
  const vocabGrammarCurrent = Math.min(2245, Math.round(1690 + learnedRatio * 420 + translationBoost * 4));

  return [
    {
      id: 'syllables',
      titleVi: 'Âm tiết đã chuẩn',
      titleZh: '音节基准',
      currentCount: syllableCurrent,
      targetCount: 608,
      unitLabel: 'âm tiết',
      percent: Math.round((syllableCurrent / 608) * 100),
      statusNote: 'Chuẩn thanh điệu & biến điệu zh-CN bậc Sơ cấp',
    },
    {
      id: 'recognition',
      titleVi: 'Chữ Hán nhận biết',
      titleZh: '认读字',
      currentCount: recognitionCurrent,
      targetCount: 900,
      unitLabel: 'chữ Hán',
      percent: Math.round((recognitionCurrent / 900) * 100),
      statusNote: 'Nhận diện đọc hiểu nhanh mặt chữ trong văn cảnh',
    },
    {
      id: 'handwriting',
      titleVi: 'Chữ Hán viết tay',
      titleZh: '手写字',
      currentCount: handwritingCurrent,
      targetCount: 300,
      unitLabel: 'chữ viết tay',
      percent: Math.round((handwritingCurrent / 300) * 100),
      statusNote: `Độ chuẩn nét bút Mễ Tự Cách: ${Math.round(params.writingAccuracyPct)}%`,
    },
    {
      id: 'vocab_grammar',
      titleVi: 'Từ vựng & Ngữ pháp nắm vững',
      titleZh: '词汇与语法点',
      currentCount: vocabGrammarCurrent,
      targetCount: 2245,
      unitLabel: 'đơn vị',
      percent: Math.round((vocabGrammarCurrent / 2245) * 100),
      statusNote: 'Tích hợp 5 kỹ năng: Nghe · Nói · Đọc · Viết · Dịch',
    },
  ];
}

export interface Hsk3TranslationChallenge {
  id: string;
  hskLevel: string;
  targetKeyword: string;
  targetPinyin: string;
  vietnameseSource: string;
  grammarFormula: string;
  modelChinese: string;
  acceptedVariants: string[];
  modelPinyin: string;
  wordBankChips: string[];
  naturalStyleTip: string;
}

export const HSK3_TRANSLATION_CHALLENGES: Hsk3TranslationChallenge[] = [
  {
    id: 'tr-1',
    hskLevel: 'HSK 3–4 (Chuẩn 3.0)',
    targetKeyword: '温暖',
    targetPinyin: 'wēn nuǎn',
    vietnameseSource: 'Lời nói của thầy giáo mang lại sự ấm áp cho chúng tôi.',
    grammarFormula: 'Chủ ngữ + 给 + Tân ngữ + 带来 + 温暖',
    modelChinese: '老师的话给我们带来了温暖。',
    acceptedVariants: [
      '老师的话给我们带来了温暖',
      '老师的话给我们带来温暖',
      '老师的话让我们感到温暖',
      '春天的阳光非常温暖',
    ],
    modelPinyin: 'Lǎoshī de huà gěi wǒmen dàilái le wēnnuǎn.',
    wordBankChips: ['老师的话', '给', '我们', '带来了', '温暖', '。'],
    naturalStyleTip:
      'Dùng cấu trúc giới từ “给 + Tân ngữ + 带来 + 温暖” giúp câu văn tự nhiên, giàu cảm xúc và đạt điểm tối đa ở kỹ năng Dịch (翻译) HSK 3.0.',
  },
  {
    id: 'tr-2',
    hskLevel: 'HSK 2–3 (Chuẩn 3.0)',
    targetKeyword: '交通',
    targetPinyin: 'jiāo tōng',
    vietnameseSource: 'Giao thông của thành phố này vô cùng thuận tiện.',
    grammarFormula: 'Địa điểm + 的 + 交通 + 非常 + 方便',
    modelChinese: '这个城市的交通非常方便。',
    acceptedVariants: [
      '这个城市的交通非常方便',
      '这个城市的交通很方便',
      '北京的交通非常方便',
      '这里的交通非常方便',
    ],
    modelPinyin: 'Zhège chéngshì de jiāotōng fēicháng fāngbiàn.',
    wordBankChips: ['这个城市', '的', '交通', '非常', '方便', '。'],
    naturalStyleTip:
      'Kết hợp danh từ “交通” làm chủ ngữ với cụm vị ngữ tính từ “非常方便” là cấu trúc chuẩn mực khi miêu tả hạ tầng đô thị trong đề thi HSK 3.0.',
  },
];

export interface Hsk3TranslationEvaluation {
  score: number;
  passed: boolean;
  hasKeyword: boolean;
  matchesFormula: boolean;
  gradeBadge: string;
  feedbackVi: string;
  naturalSuggestion: string;
}

export function evaluateHsk3Translation(
  userChineseInput: string,
  challenge: Hsk3TranslationChallenge
): Hsk3TranslationEvaluation {
  const cleanUser = (userChineseInput || '').replace(/\s+/g, '').replace(/[。！？，、.!?,]/g, '');
  const cleanModel = challenge.modelChinese.replace(/\s+/g, '').replace(/[。！？，、.!?,]/g, '');

  if (!cleanUser) {
    return {
      score: 0,
      passed: false,
      hasKeyword: false,
      matchesFormula: false,
      gradeBadge: 'Chưa nhập câu dịch',
      feedbackVi: `Hãy nhập câu dịch tiếng Trung hoặc bấm chọn các thẻ từ gợi ý có chứa từ khóa “${challenge.targetKeyword}”.`,
      naturalSuggestion: challenge.modelChinese,
    };
  }

  const hasKeyword = cleanUser.includes(challenge.targetKeyword);
  const isExactOrVariant =
    cleanUser === cleanModel ||
    challenge.acceptedVariants.some(
      (v) => cleanUser.includes(v.replace(/\s+/g, '').replace(/[。！？，、.!?,]/g, ''))
    );

  // Check character overlap with model sentence
  let matchedChars = 0;
  for (const ch of cleanModel) {
    if (cleanUser.includes(ch)) matchedChars += 1;
  }
  const overlapRatio = cleanModel.length > 0 ? matchedChars / cleanModel.length : 0;

  const matchesFormula =
    isExactOrVariant ||
    (challenge.targetKeyword === '温暖' &&
      (cleanUser.includes('给') || cleanUser.includes('带来') || cleanUser.includes('非常'))) ||
    (challenge.targetKeyword === '交通' &&
      (cleanUser.includes('的') || cleanUser.includes('方便') || cleanUser.includes('非常')));

  let score = 45;
  if (isExactOrVariant) {
    score = 98;
  } else if (hasKeyword && matchesFormula) {
    score = Math.min(96, Math.max(88, Math.round(78 + overlapRatio * 20)));
  } else if (hasKeyword) {
    score = Math.min(86, Math.max(75, Math.round(68 + overlapRatio * 20)));
  } else {
    score = Math.min(68, Math.max(40, Math.round(35 + overlapRatio * 35)));
  }

  const passed = score >= 75;
  const gradeBadge =
    score >= 92
      ? 'Chuẩn HSK 3.0 Xuất Sắc'
      : score >= 80
      ? 'Đạt Chuẩn Ngữ Pháp'
      : 'Cần Bổ Sung Cấu Trúc';

  const feedbackVi = isExactOrVariant
    ? `Xuất sắc (${score}/100đ)! Câu dịch sử dụng chính xác từ trọng tâm “${challenge.targetKeyword}” và đúng công thức ngữ pháp HSK 3.0 (${challenge.grammarFormula}).`
    : hasKeyword && matchesFormula
    ? `Rất tốt (${score}/100đ)! Bạn đã vận dụng đúng từ khóa “${challenge.targetKeyword}” và cấu trúc câu tự nhiên.`
    : hasKeyword
    ? `Khá tốt (${score}/100đ)! Đã có từ khóa “${challenge.targetKeyword}”, hãy chú ý áp dụng cấu trúc “${challenge.grammarFormula}” để câu văn tự nhiên như người bản xứ.`
    : `Cần cải thiện (${score}/100đ): Câu dịch của bạn chưa xuất hiện từ khóa bắt buộc “${challenge.targetKeyword}” (${challenge.targetPinyin}).`;

  return {
    score,
    passed,
    hasKeyword,
    matchesFormula,
    gradeBadge,
    feedbackVi,
    naturalSuggestion: `${challenge.modelChinese} (${challenge.modelPinyin}) — ${challenge.naturalStyleTip}`,
  };
}
