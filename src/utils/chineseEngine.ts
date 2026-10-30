import {
  ClassSession,
  IllustrationCategoryKey,
  INITIAL_VOCAB_SLIDES,
  LeaderboardEntry,
  STROKE_LIBRARY,
  StrokeData,
  VocabSlide,
} from '../data/chineseData';

export interface SmartDictEntry {
  pinyin: string;
  hanViet: string;
  meaning: string;
  partOfSpeech: string;
  hskLevel: string;
  usageNote: string;
  exampleHanzi: string;
  examplePinyin: string;
  exampleMeaning: string;
  illustrationKey: IllustrationCategoryKey;
}

export interface CharMetaEntry {
  pinyin: string;
  hanViet: string;
  meaning: string;
  radical: string;
  strokeCount: number;
}

export const CHAR_META_DICTIONARY: Record<string, CharMetaEntry> = {
  温: { pinyin: 'wēn', hanViet: 'ôn', meaning: 'ấm áp, ôn hòa', radical: '氵 (Thủy - Nước)', strokeCount: 12 },
  暖: { pinyin: 'nuǎn', hanViet: 'noãn', meaning: 'ấm, sưởi ấm', radical: '日 (Nhật - Mặt trời)', strokeCount: 13 },
  龙: { pinyin: 'lóng', hanViet: 'long', meaning: 'rồng phương Đông', radical: '龙 (Long - Rồng)', strokeCount: 5 },
  老: { pinyin: 'lǎo', hanViet: 'lão', meaning: 'lớn tuổi, giàu kinh nghiệm', radical: '耂 (Lão)', strokeCount: 6 },
  师: { pinyin: 'shī', hanViet: 'sư', meaning: 'thầy giáo, bậc thầy', radical: '巾 (Cân - Khăn)', strokeCount: 6 },
  聪: { pinyin: 'cōng', hanViet: 'thông', meaning: 'thính tai, thông tuệ', radical: '耳 (Nhĩ - Tai)', strokeCount: 15 },
  明: { pinyin: 'míng', hanViet: 'minh', meaning: 'sáng sủa, rõ ràng', radical: '日 (Nhật - Mặt trời)', strokeCount: 8 },
  幸: { pinyin: 'xìng', hanViet: 'hạnh', meaning: 'may mắn, hạnh phúc', radical: '干 (Can)', strokeCount: 8 },
  福: { pinyin: 'fú', hanViet: 'phúc', meaning: 'phúc lành, may mắn', radical: '礻 (Thị - Lễ)', strokeCount: 13 },
  咖: { pinyin: 'kā', hanViet: 'gia', meaning: 'cà phê (phiên âm)', radical: '口 (Khẩu - Miệng)', strokeCount: 8 },
  啡: { pinyin: 'fēi', hanViet: 'phê', meaning: 'cà phê (phiên âm)', radical: '口 (Khẩu - Miệng)', strokeCount: 11 },
  朋: { pinyin: 'péng', hanViet: 'bằng', meaning: 'bạn bè', radical: '月 (Nguyệt - Trăng)', strokeCount: 8 },
  友: { pinyin: 'yǒu', hanViet: 'hữu', meaning: 'bạn hữu, thân thiện', radical: '又 (Hựu - Lại)', strokeCount: 4 },
  努: { pinyin: 'nǔ', hanViet: 'nỗ', meaning: 'gắng sức, nỗ lực', radical: '力 (Lực - Sức mạnh)', strokeCount: 7 },
  力: { pinyin: 'lì', hanViet: 'lực', meaning: 'sức lực, năng lực', radical: '力 (Lực - Sức mạnh)', strokeCount: 2 },
  爱: { pinyin: 'ài', hanViet: 'ái', meaning: 'yêu thương, quý mến', radical: '爫 (Trảo)', strokeCount: 10 },
  情: { pinyin: 'qíng', hanViet: 'tình', meaning: 'tình cảm, tấm lòng', radical: '忄 (Tâm đứng)', strokeCount: 11 },
  学: { pinyin: 'xué', hanViet: 'học', meaning: 'học tập, nghiên cứu', radical: '子 (Tử - Con)', strokeCount: 8 },
  习: { pinyin: 'xí', hanViet: 'tập', meaning: 'ôn tập, thực hành', radical: '乙 (Ất)', strokeCount: 3 },
  校: { pinyin: 'xiào', hanViet: 'hiệu', meaning: 'trường học', radical: '木 (Mộc - Cây)', strokeCount: 10 },
  家: { pinyin: 'jiā', hanViet: 'gia', meaning: 'nhà, gia đình', radical: '宀 (Miên - Mái nhà)', strokeCount: 10 },
  庭: { pinyin: 'tíng', hanViet: 'đình', meaning: 'sân nhà, gia đình', radical: '广 (Nghiễm)', strokeCount: 9 },
  水: { pinyin: 'shuǐ', hanViet: 'thủy', meaning: 'nước, dòng nước', radical: '水 (Thủy - Nước)', strokeCount: 4 },
  火: { pinyin: 'huǒ', hanViet: 'hỏa', meaning: 'lửa, ánh lửa', radical: '火 (Hỏa - Lửa)', strokeCount: 4 },
  山: { pinyin: 'shān', hanViet: 'sơn', meaning: 'núi non', radical: '山 (Sơn - Núi)', strokeCount: 3 },
  风: { pinyin: 'fēng', hanViet: 'phong', meaning: 'cơn gió, phong cảnh', radical: '风 (Phong - Gió)', strokeCount: 4 },
  雨: { pinyin: 'yǔ', hanViet: 'vũ', meaning: 'cơn mưa', radical: '雨 (Vũ - Mưa)', strokeCount: 8 },
  雪: { pinyin: 'xuě', hanViet: 'tuyết', meaning: 'tuyết trắng', radical: '雨 (Vũ - Mưa)', strokeCount: 11 },
  茶: { pinyin: 'chá', hanViet: 'trà', meaning: 'trà, lá chè', radical: '艹 (Thảo - Cỏ)', strokeCount: 9 },
  花: { pinyin: 'huā', hanViet: 'hoa', meaning: 'bông hoa', radical: '艹 (Thảo - Cỏ)', strokeCount: 7 },
  园: { pinyin: 'yuán', hanViet: 'viên', meaning: 'khu vườn, công viên', radical: '囗 (Vi - Vây quanh)', strokeCount: 7 },
  春: { pinyin: 'chūn', hanViet: 'xuân', meaning: 'mùa xuân, sức sống', radical: '日 (Nhật - Mặt trời)', strokeCount: 9 },
  天: { pinyin: 'tiān', hanViet: 'thiên', meaning: 'bầu trời, ngày', radical: '大 (Đại - To lớn)', strokeCount: 4 },
  阳: { pinyin: 'yáng', hanViet: 'dương', meaning: 'mặt trời, ánh dương', radical: '阝 (Phụ)', strokeCount: 6 },
  光: { pinyin: 'guāng', hanViet: 'quang', meaning: 'ánh sáng, rực rỡ', radical: '儿 (Nhân)', strokeCount: 6 },
  快: { pinyin: 'kuài', hanViet: 'khoái', meaning: 'nhanh, vui vẻ', radical: '忄 (Tâm đứng)', strokeCount: 7 },
  乐: { pinyin: 'lè', hanViet: 'lạc', meaning: 'niềm vui, an lạc', radical: '丿 (Phiệt)', strokeCount: 5 },
  高: { pinyin: 'gāo', hanViet: 'cao', meaning: 'cao lớn, vui mừng', radical: '高 (Cao)', strokeCount: 10 },
  兴: { pinyin: 'xìng', hanViet: 'hứng', meaning: 'hào hứng, phấn khởi', radical: '八 (Bát)', strokeCount: 6 },
  喜: { pinyin: 'xǐ', hanViet: 'hỷ', meaning: 'tin vui, yêu thích', radical: '口 (Khẩu - Miệng)', strokeCount: 12 },
  欢: { pinyin: 'huān', hanViet: 'hoan', meaning: 'hân hoan, vui mừng', radical: '欠 (Khiếm)', strokeCount: 6 },
  工: { pinyin: 'gōng', hanViet: 'công', meaning: 'công việc, lao động', radical: '工 (Công)', strokeCount: 3 },
  作: { pinyin: 'zuò', hanViet: 'tác', meaning: 'làm việc, sáng tác', radical: '亻 (Nhân đứng)', strokeCount: 7 },
  健: { pinyin: 'jiàn', hanViet: 'kiện', meaning: 'khỏe mạnh, tráng kiện', radical: '亻 (Nhân đứng)', strokeCount: 10 },
  康: { pinyin: 'kāng', hanViet: 'khang', meaning: 'bình an, khỏe mạnh', radical: '广 (Nghiễm)', strokeCount: 11 },
  成: { pinyin: 'chéng', hanViet: 'thành', meaning: 'hoàn thành, đạt được', radical: '戈 (Qua)', strokeCount: 6 },
  功: { pinyin: 'gōng', hanViet: 'công', meaning: 'công lao, thành tựu', radical: '力 (Lực - Sức mạnh)', strokeCount: 5 },
  梦: { pinyin: 'mèng', hanViet: 'mộng', meaning: 'giấc mơ, ước mơ', radical: '木 (Mộc - Cây)', strokeCount: 11 },
  想: { pinyin: 'xiǎng', hanViet: 'tưởng', meaning: 'suy nghĩ, mong nhớ', radical: '心 (Tâm - Trái tim)', strokeCount: 13 },
  旅: { pinyin: 'lǚ', hanViet: 'lữ', meaning: 'chuyến đi, du lịch', radical: '方 (Phương)', strokeCount: 10 },
  游: { pinyin: 'yóu', hanViet: 'du', meaning: 'du ngoạn, bơi lội', radical: '氵 (Thủy - Nước)', strokeCount: 12 },
  美: { pinyin: 'měi', hanViet: 'mỹ', meaning: 'tốt đẹp, xinh đẹp', radical: '羊 (Dương)', strokeCount: 9 },
  食: { pinyin: 'shí', hanViet: 'thực', meaning: 'thức ăn, ẩm thực', radical: '食 (Thực - Ăn)', strokeCount: 9 },
  电: { pinyin: 'diàn', hanViet: 'điện', meaning: 'điện năng, tia chớp', radical: '田 (Điền)', strokeCount: 5 },
  脑: { pinyin: 'nǎo', hanViet: 'não', meaning: 'bộ não, trí óc', radical: '月 (Nhục)', strokeCount: 10 },
  手: { pinyin: 'shǒu', hanViet: 'thủ', meaning: 'bàn tay', radical: '手 (Thủ - Tay)', strokeCount: 4 },
  机: { pinyin: 'jī', hanViet: 'cơ', meaning: 'máy móc, cơ hội', radical: '木 (Mộc - Cây)', strokeCount: 6 },
  书: { pinyin: 'shū', hanViet: 'thư', meaning: 'quyển sách, kinh thư', radical: '乛 (Ất)', strokeCount: 4 },
  猫: { pinyin: 'māo', hanViet: 'miêu', meaning: 'con mèo', radical: '犭 (Khuyển)', strokeCount: 11 },
  狗: { pinyin: 'gǒu', hanViet: 'cẩu', meaning: 'con chó', radical: '犭 (Khuyển)', strokeCount: 8 },
  咱: { pinyin: 'zán', hanViet: 'tán', meaning: 'chúng ta', radical: '口 (Khẩu - Miệng)', strokeCount: 9 },
  们: { pinyin: 'men', hanViet: 'môn', meaning: 'hậu tố số nhiều chỉ người', radical: '亻 (Nhân đứng)', strokeCount: 5 },
  换: { pinyin: 'huàn', hanViet: 'hoán', meaning: 'đổi, trao đổi', radical: '扌 (Thủ - Tay)', strokeCount: 10 },
  空: { pinyin: 'kōng', hanViet: 'không', meaning: 'bầu trời, không khí', radical: '穴 (Huyệt)', strokeCount: 8 },
  调: { pinyin: 'tiáo', hanViet: 'điều', meaning: 'điều chỉnh, điều hòa', radical: '讠 (Ngôn)', strokeCount: 10 },
  洗: { pinyin: 'xǐ', hanViet: 'tẩy', meaning: 'giặt, rửa sạch', radical: '氵 (Thủy - Nước)', strokeCount: 9 },
  衣: { pinyin: 'yī', hanViet: 'y', meaning: 'quần áo, y phục', radical: '衣 (Y - Áo)', strokeCount: 6 },
  挺: { pinyin: 'tǐng', hanViet: 'đĩnh', meaning: 'khá, rất, thẳng tắp', radical: '扌 (Thủ - Tay)', strokeCount: 9 },
  初: { pinyin: 'chū', hanViet: 'sơ', meaning: 'ban đầu, sơ cấp', radical: '衤 (Y - Áo)', strokeCount: 7 },
  中: { pinyin: 'zhōng', hanViet: 'trung', meaning: 'ở giữa, trung tâm', radical: '丨 (Cổn)', strokeCount: 4 },
  刻: { pinyin: 'kè', hanViet: 'khắc', meaning: '15 phút, chạm khắc', radical: '刂 (Đao)', strokeCount: 8 },
  愿: { pinyin: 'yuàn', hanViet: 'nguyện', meaning: 'ước nguyện, sẵn lòng', radical: '心 (Tâm - Trái tim)', strokeCount: 14 },
  意: { pinyin: 'yì', hanViet: 'ý', meaning: 'ý nghĩa, tấm lòng', radical: '心 (Tâm - Trái tim)', strokeCount: 13 },
  冰: { pinyin: 'bīng', hanViet: 'băng', meaning: 'nước đá, băng giá', radical: '冫 (Băng)', strokeCount: 6 },
  箱: { pinyin: 'xiāng', hanViet: 'tương', meaning: 'chiếc rương, tủ, hộp', radical: '⺮ (Trúc)', strokeCount: 15 },
  卫: { pinyin: 'wèi', hanViet: 'vệ', meaning: 'bảo vệ, giữ gìn', radical: '卩 (Tiết)', strokeCount: 3 },
  生: { pinyin: 'shēng', hanViet: 'sinh', meaning: 'sinh sống, học sinh', radical: '生 (Sinh)', strokeCount: 5 },
  间: { pinyin: 'jiān', hanViet: 'gian', meaning: 'căn phòng, không gian', radical: '门 (Môn - Cửa)', strokeCount: 7 },
  灯: { pinyin: 'dēng', hanViet: 'đăng', meaning: 'ngọn đèn', radical: '火 (Hỏa - Lửa)', strokeCount: 6 },
  汉: { pinyin: 'hàn', hanViet: 'Hán', meaning: 'nhà Hán, tiếng Hán', radical: '氵 (Thủy - Nước)', strokeCount: 5 },
  语: { pinyin: 'yǔ', hanViet: 'ngữ', meaning: 'ngôn ngữ, lời nói', radical: '讠 (Ngôn)', strokeCount: 9 },
  文: { pinyin: 'wén', hanViet: 'văn', meaning: 'văn hóa, chữ viết', radical: '文 (Văn)', strokeCount: 4 },
  国: { pinyin: 'guó', hanViet: 'quốc', meaning: 'đất nước, quốc gia', radical: '囗 (Vi)', strokeCount: 8 },
  大: { pinyin: 'dà', hanViet: 'đại', meaning: 'to lớn, rộng lớn', radical: '大 (Đại)', strokeCount: 3 },
  小: { pinyin: 'xiǎo', hanViet: 'tiểu', meaning: 'nhỏ nhắn', radical: '小 (Tiểu)', strokeCount: 3 },
  好: { pinyin: 'hǎo', hanViet: 'hảo', meaning: 'tốt đẹp, hay', radical: '女 (Nữ)', strokeCount: 6 },
  人: { pinyin: 'rén', hanViet: 'nhân', meaning: 'con người', radical: '人 (Nhân)', strokeCount: 2 },
  心: { pinyin: 'xīn', hanViet: 'tâm', meaning: 'trái tim, tấm lòng', radical: '心 (Tâm)', strokeCount: 4 },
  交: { pinyin: 'jiāo', hanViet: 'giao', meaning: 'giao nhau, trao đổi, kết giao', radical: '亠 (Đầu - Chấm đầu)', strokeCount: 6 },
  通: { pinyin: 'tōng', hanViet: 'thông', meaning: 'thông suốt, đi qua, kết nối', radical: '辶 (Sước - Bước đi)', strokeCount: 10 },
  车: { pinyin: 'chē', hanViet: 'xa', meaning: 'xe cộ, phương tiện', radical: '车 (Xa - Xe)', strokeCount: 4 },
  路: { pinyin: 'lù', hanViet: 'lộ', meaning: 'con đường, tuyến đường', radical: '足 (Túc - Chân)', strokeCount: 13 },
  公: { pinyin: 'gōng', hanViet: 'công', meaning: 'công cộng, chung', radical: '八 (Bát)', strokeCount: 4 },
  共: { pinyin: 'gòng', hanViet: 'cộng', meaning: 'cùng nhau, tổng cộng', radical: '八 (Bát)', strokeCount: 6 },
  地: { pinyin: 'dì', hanViet: 'địa', meaning: 'mặt đất, địa điểm', radical: '土 (Thổ - Đất)', strokeCount: 6 },
  铁: { pinyin: 'tiě', hanViet: 'thiết', meaning: 'sắt thép, đường sắt', radical: '钅 (Kim - Kim loại)', strokeCount: 10 },
  飞: { pinyin: 'fēi', hanViet: 'phi', meaning: 'bay lượn', radical: '飞 (Phi - Bay)', strokeCount: 3 },
  吃: { pinyin: 'chī', hanViet: 'ngật', meaning: 'ăn uống, thưởng thức', radical: '口 (Khẩu - Miệng)', strokeCount: 6 },
  喝: { pinyin: 'hē', hanViet: 'hát', meaning: 'uống nước', radical: '口 (Khẩu - Miệng)', strokeCount: 12 },
  买: { pinyin: 'mǎi', hanViet: 'mãi', meaning: 'mua sắm', radical: '乛 (Ất)', strokeCount: 6 },
  卖: { pinyin: 'mài', hanViet: 'mại', meaning: 'bán hàng', radical: '十 (Thập)', strokeCount: 8 },
  钱: { pinyin: 'qián', hanViet: 'tiền', meaning: 'tiền bạc, chi phí', radical: '钅 (Kim - Kim loại)', strokeCount: 10 },
  医: { pinyin: 'yī', hanViet: 'y', meaning: 'y học, thầy thuốc', radical: '匚 (Phương)', strokeCount: 7 },
  院: { pinyin: 'yuàn', hanViet: 'viện', meaning: 'khuôn viên, học viện, bệnh viện', radical: '阝 (Phụ)', strokeCount: 9 },
  饭: { pinyin: 'fàn', hanViet: 'phạn', meaning: 'cơm, bữa ăn', radical: '饣 (Thực - Ăn)', strokeCount: 7 },
  店: { pinyin: 'diàn', hanViet: 'điếm', meaning: 'cửa hàng, tiệm, khách sạn', radical: '广 (Nghiễm - Mái nhà)', strokeCount: 8 },
  休: { pinyin: 'xiū', hanViet: 'hưu', meaning: 'nghỉ ngơi (người tựa gốc cây)', radical: '亻 (Nhân đứng)', strokeCount: 6 },
  息: { pinyin: 'xī', hanViet: 'tức', meaning: 'hơi thở, nghỉ ngơi', radical: '心 (Tâm - Trái tim)', strokeCount: 10 },
  准: { pinyin: 'zhǔn', hanViet: 'chuẩn', meaning: 'chuẩn xác, chuẩn bị', radical: '冫 (Băng)', strokeCount: 10 },
  备: { pinyin: 'bèi', hanViet: 'bị', meaning: 'trang bị, sẵn sàng', radical: '夂 (Truy)', strokeCount: 8 },
  考: { pinyin: 'kǎo', hanViet: 'khảo', meaning: 'thi cử, kiểm tra', radical: '耂 (Lão)', strokeCount: 6 },
  试: { pinyin: 'shì', hanViet: 'thí', meaning: 'thử nghiệm, bài thi', radical: '讠 (Ngôn - Lời nói)', strokeCount: 8 },
  帮: { pinyin: 'bāng', hanViet: 'bang', meaning: 'giúp đỡ, hỗ trợ', radical: '巾 (Cân - Khăn)', strokeCount: 9 },
  助: { pinyin: 'zhù', hanViet: 'trợ', meaning: 'trợ giúp, thêm sức', radical: '力 (Lực - Sức mạnh)', strokeCount: 7 },
  介: { pinyin: 'jiè', hanViet: 'giới', meaning: 'ở giữa, giới thiệu', radical: '人 (Nhân - Người)', strokeCount: 4 },
  绍: { pinyin: 'shào', hanViet: 'thiệu', meaning: 'nối tiếp, kết nối', radical: '纟 (Mịch - Sợi tơ)', strokeCount: 8 },
  礼: { pinyin: 'lǐ', hanViet: 'lễ', meaning: 'lễ nghĩa, món quà', radical: '礻 (Thị - Lễ)', strokeCount: 5 },
  物: { pinyin: 'wù', hanViet: 'vật', meaning: 'sự vật, đồ vật', radical: '牜 (Ngưu)', strokeCount: 8 },
  环: { pinyin: 'huán', hanViet: 'hoàn', meaning: 'vòng ngọc, bao quanh', radical: '王 (Ngọc)', strokeCount: 8 },
  境: { pinyin: 'jìng', hanViet: 'cảnh', meaning: 'biên giới, hoàn cảnh, môi trường', radical: '土 (Thổ - Đất)', strokeCount: 14 },
  化: { pinyin: 'huà', hanViet: 'hóa', meaning: 'biến đổi, văn hóa', radical: '亻 (Nhân đứng)', strokeCount: 4 },
  经: { pinyin: 'jīng', hanViet: 'kinh', meaning: 'trải qua, kinh tế', radical: '纟 (Mịch - Sợi tơ)', strokeCount: 8 },
  济: { pinyin: 'jì', hanViet: 'tế', meaning: 'giúp đời, kinh tế', radical: '氵 (Thủy - Nước)', strokeCount: 9 },
  发: { pinyin: 'fā', hanViet: 'phát', meaning: 'phát triển, xuất phát', radical: '又 (Hựu)', strokeCount: 5 },
  展: { pinyin: 'zhǎn', hanViet: 'triển', meaning: 'mở rộng, triển khai', radical: '尸 (Thi)', strokeCount: 10 },
  熊: { pinyin: 'xióng', hanViet: 'hùng', meaning: 'con gấu', radical: '灬 (Hỏa - 4 chấm lửa)', strokeCount: 14 },
  竹: { pinyin: 'zhú', hanViet: 'trúc', meaning: 'cây tre, cây trúc', radical: '竹 (Trúc)', strokeCount: 6 },
  谢: { pinyin: 'xiè', hanViet: 'tạ', meaning: 'cảm tạ, biết ơn', radical: '讠 (Ngôn - Lời nói)', strokeCount: 12 },
  对: { pinyin: 'duì', hanViet: 'đối', meaning: 'đúng, đối diện', radical: '寸 (Thốn)', strokeCount: 5 },
  起: { pinyin: 'qǐ', hanViet: 'khởi', meaning: 'đứng dậy, bắt đầu', radical: '走 (Tẩu - Chạy)', strokeCount: 10 },
  关: { pinyin: 'guān', hanViet: 'quan', meaning: 'đóng, liên quan', radical: '丷 (Bát ngửa)', strokeCount: 6 },
  系: { pinyin: 'xì', hanViet: 'hệ', meaning: 'hệ thống, mối quan hệ', radical: '糸 (Mịch)', strokeCount: 7 },
  请: { pinyin: 'qǐng', hanViet: 'thỉnh', meaning: 'xin mời, vui lòng', radical: '讠 (Ngôn - Lời nói)', strokeCount: 10 },
  问: { pinyin: 'wèn', hanViet: 'vấn', meaning: 'hỏi thăm, câu hỏi', radical: '门 (Môn - Cửa)', strokeCount: 6 },
  认: { pinyin: 'rèn', hanViet: 'nhận', meaning: 'nhận biết, công nhận', radical: '讠 (Ngôn - Lời nói)', strokeCount: 4 },
  识: { pinyin: 'shí', hanViet: 'thức', meaning: 'tri thức, quen biết', radical: '讠 (Ngôn - Lời nói)', strokeCount: 7 },
  字: { pinyin: 'zì', hanViet: 'tự', meaning: 'chữ viết, văn tự', radical: '宀 (Miên - Mái nhà)', strokeCount: 6 },
  苹: { pinyin: 'píng', hanViet: 'bình', meaning: 'táo tây (苹果)', radical: '艹 (Thảo - Cỏ)', strokeCount: 8 },
  果: { pinyin: 'guǒ', hanViet: 'quả', meaning: 'quả, trái cây, kết quả', radical: '木 (Mộc - Cây)', strokeCount: 8 },
  父: { pinyin: 'fù', hanViet: 'phụ', meaning: 'cha, bố', radical: '父 (Phụ - Cha)', strokeCount: 4 },
  母: { pinyin: 'mǔ', hanViet: 'mẫu', meaning: 'mẹ, mẫu thân', radical: '毋 (Vô)', strokeCount: 5 },
  菜: { pinyin: 'cài', hanViet: 'thái', meaning: 'rau xanh, món ăn', radical: '艹 (Thảo - Cỏ)', strokeCount: 11 },
  照: { pinyin: 'zhào', hanViet: 'chiếu', meaning: 'chiếu sáng, chăm sóc', radical: '灬 (Hỏa - 4 chấm lửa)', strokeCount: 13 },
  顾: { pinyin: 'gù', hanViet: 'cố', meaning: 'đoái hoài, chăm nom', radical: '页 (Hiệt - Trang giấy)', strokeCount: 10 },
  今: { pinyin: 'jīn', hanViet: 'kim', meaning: 'nay, hiện tại', radical: '人 (Nhân - Người)', strokeCount: 4 },
  昨: { pinyin: 'zuó', hanViet: 'tạc', meaning: 'hôm qua', radical: '日 (Nhật - Mặt trời)', strokeCount: 9 },
  周: { pinyin: 'zhōu', hanViet: 'chu', meaning: 'tuần lễ, chu đáo', radical: '口 (Khẩu - Miệng)', strokeCount: 8 },
  末: { pinyin: 'mò', hanViet: 'mạt', meaning: 'cuối, phần ngọn', radical: '木 (Mộc - Cây)', strokeCount: 5 },
  行: { pinyin: 'xíng', hanViet: 'hành', meaning: 'đi lại, hành trình', radical: '行 (Hành - Bước đi)', strokeCount: 6 },
  坚: { pinyin: 'jiān', hanViet: 'kiên', meaning: 'vững chắc, kiên định', radical: '土 (Thổ - Đất)', strokeCount: 7 },
  持: { pinyin: 'chí', hanViet: 'trì', meaning: 'nắm giữ, duy trì', radical: '扌 (Thủ - Tay)', strokeCount: 9 },
  包: { pinyin: 'bāo', hanViet: 'bao', meaning: 'bao bọc, gói', radical: '勹 (Bao)', strokeCount: 5 },
  容: { pinyin: 'róng', hanViet: 'dung', meaning: 'dung nạp, bao dung', radical: '宀 (Miên - Mái nhà)', strokeCount: 10 },
  融: { pinyin: 'róng', hanViet: 'dung', meaning: 'dung hợp, hòa quyện', radical: '虫 (Trùng)', strokeCount: 16 },
  会: { pinyin: 'huì', hanViet: 'hội', meaning: 'hội tụ, biết, hiểu', radical: '人 (Nhân - Người)', strokeCount: 6 },
  贯: { pinyin: 'guàn', hanViet: 'quán', meaning: 'xuyên suốt, thông suốt', radical: '贝 (Bối - Bảo vật)', strokeCount: 8 },
  复: { pinyin: 'fù', hanViet: 'phục', meaning: 'lặp lại, ôn lại', radical: '夂 (Truy)', strokeCount: 9 },
  练: { pinyin: 'liàn', hanViet: 'luyện', meaning: 'rèn luyện, thực hành', radical: '纟 (Mịch - Sợi tơ)', strokeCount: 8 },
  运: { pinyin: 'yùn', hanViet: 'vận', meaning: 'vận động, di chuyển', radical: '辶 (Sước - Bước đi)', strokeCount: 7 },
  动: { pinyin: 'dòng', hanViet: 'động', meaning: 'chuyển động, hoạt động', radical: '力 (Lực - Sức mạnh)', strokeCount: 6 },
  感: { pinyin: 'gǎn', hanViet: 'cảm', meaning: 'cảm nhận, cảm xúc', radical: '心 (Tâm - Trái tim)', strokeCount: 13 },
  冒: { pinyin: 'mào', hanViet: 'mạo', meaning: 'cảm mạo, xông pha', radical: '日 (Nhật - Mặt trời)', strokeCount: 9 },
  超: { pinyin: 'chāo', hanViet: 'siêu', meaning: 'vượt qua, siêu cấp', radical: '走 (Tẩu - Chạy)', strokeCount: 12 },
  市: { pinyin: 'shì', hanViet: 'thị', meaning: 'thành phố, chợ', radical: '巾 (Cân - Khăn)', strokeCount: 5 },
  惯: { pinyin: 'guàn', hanViet: 'quán', meaning: 'thói quen, quen thuộc', radical: '忄 (Tâm đứng)', strokeCount: 11 },
  验: { pinyin: 'yàn', hanViet: 'nghiệm', meaning: 'kinh nghiệm, kiểm nghiệm', radical: '马 (Mã - Ngựa)', strokeCount: 10 },
  响: { pinyin: 'xiǎng', hanViet: 'hưởng', meaning: 'âm vang, ảnh hưởng', radical: '口 (Khẩu - Miệng)', strokeCount: 9 },
  流: { pinyin: 'liú', hanViet: 'lưu', meaning: 'dòng chảy, giao lưu', radical: '氵 (Thủy - Nước)', strokeCount: 10 },
  合: { pinyin: 'hé', hanViet: 'hợp', meaning: 'kết hợp, hòa hợp', radical: '口 (Khẩu - Miệng)', strokeCount: 6 },
  解: { pinyin: 'jiě', hanViet: 'giải', meaning: 'giải quyết, tháo gỡ', radical: '角 (Giác - Sừng)', strokeCount: 13 },
  决: { pinyin: 'jué', hanViet: 'quyết', meaning: 'quyết định, dứt khoát', radical: '冫 (Băng)', strokeCount: 6 },
  办: { pinyin: 'bàn', hanViet: 'biện', meaning: 'giải quyết, xử lý', radical: '力 (Lực - Sức mạnh)', strokeCount: 4 },
  法: { pinyin: 'fǎ', hanViet: 'pháp', meaning: 'phương pháp, phép tắc', radical: '氵 (Thủy - Nước)', strokeCount: 8 },
  阅: { pinyin: 'yuè', hanViet: 'duyệt', meaning: 'đọc, xem duyệt', radical: '门 (Môn - Cửa)', strokeCount: 10 },
  读: { pinyin: 'dú', hanViet: 'độc', meaning: 'đọc sách,朗读', radical: '讠 (Ngôn - Lời nói)', strokeCount: 10 },
  团: { pinyin: 'tuán', hanViet: 'đoàn', meaning: 'đoàn tụ, tập thể', radical: '囗 (Vi - Vây quanh)', strokeCount: 6 },
  圆: { pinyin: 'yuán', hanViet: 'viên', meaning: 'tròn đầy, viên mãn', radical: '囗 (Vi - Vây quanh)', strokeCount: 10 },
};

export const SMART_HANZI_DICTIONARY: Record<string, SmartDictEntry> = {
  温暖: {
    pinyin: 'wēn nuǎn',
    hanViet: 'ôn noãn',
    meaning: 'ấm áp, đầm ấm',
    partOfSpeech: 'TÍNH TỪ / ĐỘNG TỪ',
    hskLevel: 'HSK 4',
    usageNote: 'Dùng miêu tả thời tiết nắng ấm (天气温暖) hoặc sự quan tâm ấm áp của gia đình, bạn bè (感到温暖).',
    exampleHanzi: '春天 的 阳光 非常 温暖。',
    examplePinyin: 'Chūntiān de yángguāng fēicháng wēnnuǎn.',
    exampleMeaning: 'Ánh nắng mùa xuân vô cùng ấm áp.',
    illustrationKey: 'wennuan',
  },
  温: {
    pinyin: 'wēn',
    hanViet: 'ôn',
    meaning: 'ấm áp, ôn hòa, ôn tập',
    partOfSpeech: 'TÍNH TỪ / ĐỘNG TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Kết hợp trong 温暖 (ấm áp), 温度 (nhiệt độ), 温柔 (dịu dàng), 温习 (ôn tập).',
    exampleHanzi: '请 喝 一杯 温 水 吧。',
    examplePinyin: 'Qǐng hē yī bēi wēn shuǐ ba.',
    exampleMeaning: 'Mời bạn uống một cốc nước ấm nhé.',
    illustrationKey: 'wennuan',
  },
  暖: {
    pinyin: 'nuǎn',
    hanViet: 'noãn',
    meaning: 'ấm áp, sưởi ấm',
    partOfSpeech: 'TÍNH TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Kết hợp trong 温暖 (ấm áp), 暖和 (ấm cúng), 春暖花开 (xuân ấm hoa nở).',
    exampleHanzi: '屋子 里 很 暖和。',
    examplePinyin: 'Wūzi lǐ hěn nuǎnhuo.',
    exampleMeaning: 'Trong căn nhà rất ấm cúng.',
    illustrationKey: 'wennuan',
  },
  龙: {
    pinyin: 'lóng',
    hanViet: 'long',
    meaning: 'rồng phương Đông, thần long',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Biểu tượng văn hóa cát tường Trung Hoa: 龙马精神 (tinh thần long mã), 中国龙 (Rồng Trung Hoa).',
    exampleHanzi: '龙 是 中华 文化 的 吉祥 象征。',
    examplePinyin: 'Lóng shì Zhōnghuá wénhuà de jíxiáng xiàngzhēng.',
    exampleMeaning: 'Rồng là biểu tượng cát tường của văn hóa Trung Hoa.',
    illustrationKey: 'long',
  },
  老师: {
    pinyin: 'lǎo shī',
    hanViet: 'lão sư',
    meaning: 'giáo viên, thầy cô giáo',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 1',
    usageNote: 'Danh từ xưng hô trang trọng với người giảng dạy: 王老师 (Thầy/Cô Vương), 老师好 (Chào thầy/cô).',
    exampleHanzi: '咱们 的 汉语 老师 讲课 很 生动。',
    examplePinyin: 'Zánmen de Hànyǔ lǎoshī jiǎngkè hěn shēngdòng.',
    exampleMeaning: 'Giáo viên tiếng Trung của chúng ta giảng bài rất sinh động.',
    illustrationKey: 'laoshi',
  },
  聪明: {
    pinyin: 'cōng míng',
    hanViet: 'thông minh',
    meaning: 'thông minh, lanh lợi',
    partOfSpeech: 'TÍNH TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Thường kết hợp với phó từ chỉ mức độ: 很聪明, 挺聪明的, 聪明伶俐.',
    exampleHanzi: '这个 初中 学生 挺 聪明的。',
    examplePinyin: 'Zhège chūzhōng xuéshēng tǐng cōngmíng de.',
    exampleMeaning: 'Bạn học sinh cấp 2 này khá thông minh.',
    illustrationKey: 'congming',
  },
  幸福: {
    pinyin: 'xìng fú',
    hanViet: 'hạnh phúc',
    meaning: 'hạnh phúc, viên mãn',
    partOfSpeech: 'TÍNH TỪ / DANH TỪ',
    hskLevel: 'HSK 4',
    usageNote: 'Chỉ cuộc sống đầm ấm, viên mãn lâu dài: 幸福的生活 (cuộc sống hạnh phúc), 祝你幸福.',
    exampleHanzi: '他们 一家人 生活 得 非常 幸福。',
    examplePinyin: 'Tāmen yījiārén shēnghuó de fēicháng xìngfú.',
    exampleMeaning: 'Gia đình họ chung sống vô cùng hạnh phúc.',
    illustrationKey: 'xingfu',
  },
  咖啡: {
    pinyin: 'kā fēi',
    hanViet: 'gia phê',
    meaning: 'cà phê',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 2',
    usageNote: 'Lượng từ: 杯 (bēi) — 一杯热咖啡 (một tách cà phê nóng), 咖啡馆 (quán cà phê).',
    exampleHanzi: '早上 我 喜欢 喝 一杯 热 咖啡。',
    examplePinyin: 'Zǎoshang wǒ xǐhuan hē yī bēi rè kāfēi.',
    exampleMeaning: 'Buổi sáng tôi thích uống một tách cà phê nóng.',
    illustrationKey: 'kafei',
  },
  朋友: {
    pinyin: 'péng you',
    hanViet: 'bằng hữu',
    meaning: 'bạn bè, người bạn',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 1',
    usageNote: 'Kết bạn: 交朋友 (jiāo péngyou) · Bạn thân: 好朋友 (hǎo péngyou), 老朋友.',
    exampleHanzi: '在 大学 里 我 认识 了 很多 好 朋友。',
    examplePinyin: 'Zài dàxué lǐ wǒ rènshi le hěn duō hǎo péngyou.',
    exampleMeaning: 'Ở trường đại học tôi đã quen được rất nhiều người bạn tốt.',
    illustrationKey: 'pengyou',
  },
  努力: {
    pinyin: 'nǔ lì',
    hanViet: 'nỗ lực',
    meaning: 'nỗ lực, cố gắng, chăm chỉ',
    partOfSpeech: 'TÍNH TỪ / ĐỘNG TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Đứng trước động từ làm trạng ngữ: 努力学习 (chăm chỉ học tập), 努力工作 (nỗ lực làm việc).',
    exampleHanzi: '只要 努力 学习，汉语 一定 会 进步。',
    examplePinyin: 'Zhǐyào nǔlì xuéxí, Hànyǔ yīdìng huì jìnbù.',
    exampleMeaning: 'Chỉ cần nỗ lực học tập, tiếng Trung nhất định sẽ tiến bộ.',
    illustrationKey: 'nuli',
  },
  学习: {
    pinyin: 'xué xí',
    hanViet: 'học tập',
    meaning: 'học tập, rèn luyện',
    partOfSpeech: 'ĐỘNG TỪ / DANH TỪ',
    hskLevel: 'HSK 1',
    usageNote: 'Cấu trúc: 学习 + Môn học/Kỹ năng (学习汉语 - học tiếng Trung, 好好学习).',
    exampleHanzi: '咱们 一起 努力 学习 汉语 吧。',
    examplePinyin: 'Zánmen yīqǐ nǔlì xuéxí Hànyǔ ba.',
    exampleMeaning: 'Chúng ta cùng nhau chăm chỉ học tiếng Trung nhé.',
    illustrationKey: 'school',
  },
  学校: {
    pinyin: 'xué xiào',
    hanViet: 'học hiệu',
    meaning: 'trường học',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 1',
    usageNote: 'Lượng từ: 所 (suǒ) — 一所学校 (một ngôi trường), 去学校上课.',
    exampleHanzi: '我们 的 学校 环境 非常 优美。',
    examplePinyin: 'Wǒmen de xuéxiào huánjìng fēicháng yōuměi.',
    exampleMeaning: 'Môi trường trường học của chúng tôi vô cùng tươi đẹp.',
    illustrationKey: 'chuzhong',
  },
  大学: {
    pinyin: 'dà xué',
    hanViet: 'đại học',
    meaning: 'trường đại học',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 2',
    usageNote: 'Sinh viên đại học: 大学生 (dàxuéshēng) · Đại học Hà Nội: 河内大学 (HANU).',
    exampleHanzi: '我 在 河内 大学 学习 汉语。',
    examplePinyin: 'Wǒ zài Hénèi Dàxué xuéxí Hànyǔ.',
    exampleMeaning: 'Tôi học tiếng Trung tại Trường Đại học Hà Nội (HANU).',
    illustrationKey: 'laoshi',
  },
  汉语: {
    pinyin: 'hàn yǔ',
    hanViet: 'Hán ngữ',
    meaning: 'tiếng Trung, Hán ngữ',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 1',
    usageNote: 'Ngôn ngữ Hán chuẩn phổ thông: 说汉语 (nói tiếng Trung), 汉语水平考试 (HSK).',
    exampleHanzi: '她 的 汉语 发音 非常 标准。',
    examplePinyin: 'Tā de Hànyǔ fāyīn fēicháng biāozhǔn.',
    exampleMeaning: 'Phát âm tiếng Trung của cô ấy vô cùng chuẩn xác.',
    illustrationKey: 'laoshi',
  },
  家: {
    pinyin: 'jiā',
    hanViet: 'gia',
    meaning: 'nhà, gia đình, tổ ấm',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 1',
    usageNote: 'Về nhà: 回家 (huí jiā) · Ở nhà: 在家 · Gia đình: 家庭 (jiātíng).',
    exampleHanzi: '家 是 最 温暖 的 地方。',
    examplePinyin: 'Jiā shì zuì wēnnuǎn de dìfang.',
    exampleMeaning: 'Nhà là nơi ấm áp nhất.',
    illustrationKey: 'wennuan',
  },
  家庭: {
    pinyin: 'jiā tíng',
    hanViet: 'gia đình',
    meaning: 'gia đình, mái ấm',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 4',
    usageNote: 'Chỉ tổ ấm gia đình: 幸福的家庭 (gia đình hạnh phúc), 家庭成员.',
    exampleHanzi: '我 有 一个 温暖 而 幸福 的 家庭。',
    examplePinyin: 'Wǒ yǒu yīgè wēnnuǎn ér xìngfú de jiātíng.',
    exampleMeaning: 'Tôi có một gia đình ấm áp và hạnh phúc.',
    illustrationKey: 'xingfu',
  },
  爱: {
    pinyin: 'ài',
    hanViet: 'ái',
    meaning: 'yêu thương, đam mê',
    partOfSpeech: 'ĐỘNG TỪ / DANH TỪ',
    hskLevel: 'HSK 1',
    usageNote: 'Yêu gia đình: 爱家人 · Yêu thích làm gì: 爱看书, 热爱生活.',
    exampleHanzi: '我 很 爱 我 的 爸爸 和 妈妈。',
    examplePinyin: 'Wǒ hěn ài wǒ de bàba hé māma.',
    exampleMeaning: 'Tôi rất yêu bố và mẹ của mình.',
    illustrationKey: 'xingfu',
  },
  爱情: {
    pinyin: 'ài qíng',
    hanViet: 'ái tình',
    meaning: 'tình yêu',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 4',
    usageNote: 'Danh từ chỉ tình yêu đôi lứa: 浪漫的爱情 (tình yêu lãng mạn).',
    exampleHanzi: '这 是 一个 美好 的 爱情 故事。',
    examplePinyin: 'Zhè shì yīgè měihǎo de àiqíng gùshi.',
    exampleMeaning: 'Đây là một câu chuyện tình yêu tươi đẹp.',
    illustrationKey: 'xingfu',
  },
  水: {
    pinyin: 'shuǐ',
    hanViet: 'thủy',
    meaning: 'nước, dòng suối',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 1',
    usageNote: 'Uống nước: 喝水 · Nước ấm: 温水 · Hoa quả: 水果 (shuǐguǒ).',
    exampleHanzi: '每天 多 喝 水 对 身体 很 好。',
    examplePinyin: 'Měitiān duō hē shuǐ duì shēntǐ hěn hǎo.',
    exampleMeaning: 'Mỗi ngày uống nhiều nước rất tốt cho sức khỏe.',
    illustrationKey: 'nature',
  },
  火: {
    pinyin: 'huǒ',
    hanViet: 'hỏa',
    meaning: 'lửa, ngọn lửa ấm, nồng nhiệt',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 2',
    usageNote: 'Tàu hỏa: 火车 (huǒchē) · Lửa trại ấm áp: 篝火 · Sôi nổi: 红火.',
    exampleHanzi: '冬天 的 炉火 让 房间 很 温暖。',
    examplePinyin: 'Dōngtiān de lúhuǒ ràng fángjiān hěn wēnnuǎn.',
    exampleMeaning: 'Ánh lửa lò sưởi mùa đông làm căn phòng rất ấm áp.',
    illustrationKey: 'wennuan',
  },
  茶: {
    pinyin: 'chá',
    hanViet: 'trà',
    meaning: 'trà, thưởng trà',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 1',
    usageNote: 'Pha trà: 泡茶 (pào chá) · Uống trà: 喝茶 · Trà xanh: 绿茶.',
    exampleHanzi: '请 坐，喝 一杯 热 茶 吧。',
    examplePinyin: 'Qǐng zuò, hē yī bēi rè chá ba.',
    exampleMeaning: 'Mời ngồi, thưởng thức một chén trà nóng nhé.',
    illustrationKey: 'wennuan',
  },
  春天: {
    pinyin: 'chūn tiān',
    hanViet: 'xuân thiên',
    meaning: 'mùa xuân',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Bốn mùa: 春天 (xuân), 夏天 (hạ), 秋天 (thu), 冬天 (đông).',
    exampleHanzi: '春天 到了，花园 里 的 花 都 开了。',
    examplePinyin: 'Chūntiān dàole, huāyuán lǐ de huā dōu kāile.',
    exampleMeaning: 'Mùa xuân đến rồi, hoa trong vườn đều đã nở rộ.',
    illustrationKey: 'huayuan',
  },
  阳光: {
    pinyin: 'yáng guāng',
    hanViet: 'dương quang',
    meaning: 'ánh nắng mặt trời, tích cực',
    partOfSpeech: 'DANH TỪ / TÍNH TỪ',
    hskLevel: 'HSK 4',
    usageNote: 'Chỉ ánh nắng ấm áp (温暖的阳光) hoặc tính cách lạc quan, rạng rỡ.',
    exampleHanzi: '早晨 的 阳光 照进 房间 里。',
    examplePinyin: 'Zǎochén de yángguāng zhàojìn fángjiān lǐ.',
    exampleMeaning: 'Ánh nắng buổi sớm chiếu vào trong căn phòng.',
    illustrationKey: 'wennuan',
  },
  快乐: {
    pinyin: 'kuài lè',
    hanViet: 'khoái lạc',
    meaning: 'vui vẻ, hạnh phúc',
    partOfSpeech: 'TÍNH TỪ',
    hskLevel: 'HSK 2',
    usageNote: 'Dùng trong lời chúc và niềm vui tinh thần: 生日快乐, 新年快乐.',
    exampleHanzi: '祝 你 每天 都 幸福 快乐！',
    examplePinyin: 'Zhù nǐ měitiān dōu xìngfú kuàilè!',
    exampleMeaning: 'Chúc bạn mỗi ngày đều hạnh phúc và vui vẻ!',
    illustrationKey: 'xingfu',
  },
  高兴: {
    pinyin: 'gāo xìng',
    hanViet: 'cao hứng',
    meaning: 'vui mừng, phấn khởi',
    partOfSpeech: 'TÍNH TỪ',
    hskLevel: 'HSK 1',
    usageNote: 'Mẫu câu giao tiếp kinh điển: 很高兴认识你 (Rất vui được làm quen với bạn).',
    exampleHanzi: '认识 你们 我 非常 高兴。',
    examplePinyin: 'Rènshi nǐmen wǒ fēicháng gāoxìng.',
    exampleMeaning: 'Được làm quen với các bạn tôi vô cùng vui mừng.',
    illustrationKey: 'pengyou',
  },
  喜欢: {
    pinyin: 'xǐ huan',
    hanViet: 'hỷ hoan',
    meaning: 'thích, yêu thích',
    partOfSpeech: 'ĐỘNG TỪ TÂM LÝ',
    hskLevel: 'HSK 1',
    usageNote: 'Cấu trúc: 喜欢 + Danh từ / Động từ (喜欢中国文化 - thích văn hóa Trung Hoa).',
    exampleHanzi: '我 很 喜欢 在 花园 里 看书。',
    examplePinyin: 'Wǒ hěn xǐhuan zài huāyuán lǐ kànshū.',
    exampleMeaning: 'Tôi rất thích đọc sách ở trong vườn hoa.',
    illustrationKey: 'huayuan',
  },
  健康: {
    pinyin: 'jiàn kāng',
    hanViet: 'kiện khang',
    meaning: 'khỏe mạnh, sức khỏe',
    partOfSpeech: 'TÍNH TỪ / DANH TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Chúc sức khỏe: 祝您身体健康 (Chúc ngài dồi dào sức khỏe).',
    exampleHanzi: '经常 运动 让 我们 保持 健康。',
    examplePinyin: 'Jīngcháng yùndòng ràng wǒmen bǎochí jiànkāng.',
    exampleMeaning: 'Thường xuyên vận động giúp chúng ta giữ gìn sức khỏe.',
    illustrationKey: 'people',
  },
  成功: {
    pinyin: 'chéng gōng',
    hanViet: 'thành công',
    meaning: 'thành công, đạt thành tựu',
    partOfSpeech: 'ĐỘNG TỪ / TÍNH TỪ / DANH TỪ',
    hskLevel: 'HSK 4',
    usageNote: 'Thành ngữ thông dụng: 马到成功 (mã đáo thành công), 祝你成功.',
    exampleHanzi: '坚持 努力 一定 会 取得 成功。',
    examplePinyin: 'Jiānchí nǔlì yīdìng huì qǔdé chénggōng.',
    exampleMeaning: 'Kiên trì nỗ lực nhất định sẽ giành được thành công.',
    illustrationKey: 'nuli',
  },
  梦想: {
    pinyin: 'mèng xiǎng',
    hanViet: 'mộng tưởng',
    meaning: 'ước mơ, hoài bão',
    partOfSpeech: 'DANH TỪ / ĐỘNG TỪ',
    hskLevel: 'HSK 5',
    usageNote: 'Thực hiện ước mơ: 实现梦想 (shíxiàn mèngxiǎng), 追求梦想.',
    exampleHanzi: '我 的 梦想 是 成为 一名 汉语 老师。',
    examplePinyin: 'Wǒ de mèngxiǎng shì chéngwéi yī míng Hànyǔ lǎoshī.',
    exampleMeaning: 'Ước mơ của tôi là trở thành một giáo viên tiếng Trung.',
    illustrationKey: 'laoshi',
  },
  旅游: {
    pinyin: 'lǚ yóu',
    hanViet: 'lữ du',
    meaning: 'du lịch, đi du ngoạn',
    partOfSpeech: 'ĐỘNG TỪ',
    hskLevel: 'HSK 2',
    usageNote: 'Đi du lịch: 去旅游 (qù lǚyóu), 旅游景点 (điểm tham quan du lịch).',
    exampleHanzi: '今年 夏天 咱们 一起 去 北京 旅游 吧。',
    examplePinyin: 'Jīnnián xiàtiān zánmen yīqǐ qù Běijīng lǚyóu ba.',
    exampleMeaning: 'Mùa hè năm nay chúng mình cùng đi Bắc Kinh du lịch nhé.',
    illustrationKey: 'nature',
  },
  美食: {
    pinyin: 'měi shí',
    hanViet: 'mỹ thực',
    meaning: 'ẩm thực, món ăn ngon',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 4',
    usageNote: 'Thưởng thức ẩm thực: 品尝美食 (pǐncháng měishí), 传统美食.',
    exampleHanzi: '中国 和 越南 都 有 很多 特色 美食。',
    examplePinyin: 'Zhōngguó hé Yuènán dōu yǒu hěn duō tèsè měishí.',
    exampleMeaning: 'Trung Quốc và Việt Nam đều có rất nhiều món ăn ngon đặc sắc.',
    illustrationKey: 'kafei',
  },
  冰箱: {
    pinyin: 'bīng xiāng',
    hanViet: 'băng tương',
    meaning: 'tủ lạnh',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Lượng từ: 台 (tái) — 一台冰箱 (một chiếc tủ lạnh).',
    exampleHanzi: '妈妈 把 水果 放进 冰箱 里 了。',
    examplePinyin: 'Māma bǎ shuǐguǒ fàngjìn bīngxiāng lǐ le.',
    exampleMeaning: 'Mẹ đã cất hoa quả vào trong tủ lạnh rồi.',
    illustrationKey: 'bingxiang',
  },
  卫生间: {
    pinyin: 'wèi shēng jiān',
    hanViet: 'vệ sinh gian',
    meaning: 'phòng tắm, nhà vệ sinh',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 2',
    usageNote: 'Từ lịch sự chỉ phòng vệ sinh/phòng tắm trong nhà hoặc nơi công cộng.',
    exampleHanzi: '请问，卫生间 在 哪儿？',
    examplePinyin: 'Qǐngwèn, wèishēngjiān zài nǎr?',
    exampleMeaning: 'Xin hỏi, nhà vệ sinh ở đâu vậy?',
    illustrationKey: 'weishengjian',
  },
  灯: {
    pinyin: 'dēng',
    hanViet: 'đăng',
    meaning: 'đèn chiếu sáng, đèn lồng',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 2',
    usageNote: 'Bật đèn: 开灯 · Tắt đèn: 关灯 · Lượng từ: 盏 (zhǎn).',
    exampleHanzi: '房间 里 有点儿 暗，请 开 灯 吧。',
    examplePinyin: 'Fángjiān lǐ yǒudiǎnr àn, qǐng kāi dēng ba.',
    exampleMeaning: 'Trong phòng hơi tối, hãy bật đèn lên nhé.',
    illustrationKey: 'deng',
  },
  狗: {
    pinyin: 'gǒu',
    hanViet: 'cẩu',
    meaning: 'chú chó, cún con',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 1',
    usageNote: 'Lượng từ: 只 (zhī) hoặc 条 (tiáo) — 一只小狗 (một chú cún con), 宠物狗 (chó cưng).',
    exampleHanzi: '我家 的 小 狗 非常 聪明 可爱。',
    examplePinyin: 'Wǒ jiā de xiǎogǒu fēicháng cōngmíng kě’ài.',
    exampleMeaning: 'Chú cún con nhà tôi rất thông minh và đáng yêu.',
    illustrationKey: 'dog',
  },
  换: {
    pinyin: 'huàn',
    hanViet: 'hoán',
    meaning: 'đổi, thay',
    partOfSpeech: 'ĐỘNG TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Đổi tiền, đổi đồ, thay quần áo (换钱, 换衣服, 换工作).',
    exampleHanzi: '我想 换 200 人民币。',
    examplePinyin: 'Wǒ xiǎng huàn liǎngbǎi rénmínbì.',
    exampleMeaning: 'Tôi muốn đổi 200 Nhân dân tệ.',
    illustrationKey: 'huan',
  },
  挺: {
    pinyin: 'tǐng',
    hanViet: 'đĩnh',
    meaning: 'khá, rất',
    partOfSpeech: 'PHÓ TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Cấu trúc: 挺 + Tính từ / Động từ tâm lý + 的 (biểu thị mức độ cao nhẹ nhàng).',
    exampleHanzi: '这个 花 园 挺 漂亮的。',
    examplePinyin: 'Zhège huāyuán tǐng piàoliang de.',
    exampleMeaning: 'Vườn hoa này khá đẹp.',
    illustrationKey: 'ting',
  },
  刻: {
    pinyin: 'kè',
    hanViet: 'khắc',
    meaning: 'khắc (15 phút), chạm khắc',
    partOfSpeech: 'LƯỢNG TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Chỉ thời gian: 一刻 (15 phút), 三刻 (45 phút). Ví dụ: 差一刻八点.',
    exampleHanzi: '现在 是 八点 一刻。',
    examplePinyin: 'Xiànzài shì bā diǎn yī kè.',
    exampleMeaning: 'Bây giờ là 8 giờ 15 phút.',
    illustrationKey: 'ke',
  },
  愿意: {
    pinyin: 'yuàn yì',
    hanViet: 'nguyện ý',
    meaning: 'bằng lòng, sẵn lòng',
    partOfSpeech: 'ĐỘNG TỪ NĂNG NGUYỆN',
    hskLevel: 'HSK 3',
    usageNote: 'Cấu trúc: 愿意 + Động từ (Biểu thị sự tự nguyện, sẵn sàng làm việc gì đó).',
    exampleHanzi: '我 很 愿意 帮助 你。',
    examplePinyin: 'Wǒ hěn yuànyì bāngzhù nǐ.',
    exampleMeaning: 'Tớ rất sẵn lòng giúp bạn.',
    illustrationKey: 'yuanyi',
  },
  交通: {
    pinyin: 'jiāo tōng',
    hanViet: 'giao thông',
    meaning: 'giao thông, đi lại',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 4',
    usageNote: 'Kết hợp phổ biến: 公共交通 (giao thông công cộng), 交通工具 (phương tiện giao thông), 交通方便 (giao thông thuận tiện).',
    exampleHanzi: '河内 现在 的 交通 越来越 方便 了。',
    examplePinyin: 'Hénèi xiànzài de jiāotōng yuèláiyuè fāngbiàn le.',
    exampleMeaning: 'Giao thông ở Hà Nội hiện nay ngày càng thuận tiện.',
    illustrationKey: 'nature',
  },
  交: {
    pinyin: 'jiāo',
    hanViet: 'giao',
    meaning: 'giao thông, trao đổi, kết bạn, nộp',
    partOfSpeech: 'ĐỘNG TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Kết hợp trong 交通 (giao thông), 交朋友 (kết bạn), 交流 (giao lưu).',
    exampleHanzi: '我 喜欢 交 新 朋友。',
    examplePinyin: 'Wǒ xǐhuan jiāo xīn péngyou.',
    exampleMeaning: 'Tôi thích kết giao với những người bạn mới.',
    illustrationKey: 'pengyou',
  },
  通: {
    pinyin: 'tōng',
    hanViet: 'thông',
    meaning: 'thông suốt, đi qua, thông báo',
    partOfSpeech: 'ĐỘNG TỪ / TÍNH TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Kết hợp trong 交通 (giao thông), 通知 (thông báo), 通过 (thông qua).',
    exampleHanzi: '这条 路 已经 通 车 了。',
    examplePinyin: 'Zhè tiáo lù yǐjīng tōng chē le.',
    exampleMeaning: 'Tuyến đường này đã thông xe rồi.',
    illustrationKey: 'nature',
  },
  公共汽车: {
    pinyin: 'gōng gòng qì chē',
    hanViet: 'công cộng khí xa',
    meaning: 'xe buýt công cộng',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 2',
    usageNote: 'Đi xe buýt dùng động từ 坐: 坐公共汽车 (zuò gōnggòng qìchē).',
    exampleHanzi: '我 每天 坐 公共汽车 去 学校。',
    examplePinyin: 'Wǒ měitiān zuò gōnggòng qìchē qù xuéxiào.',
    exampleMeaning: 'Mỗi ngày tôi đi xe buýt đến trường.',
    illustrationKey: 'nature',
  },
  地铁: {
    pinyin: 'dì tiě',
    hanViet: 'địa thiết',
    meaning: 'tàu điện ngầm, metro',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Kết hợp phổ biến: 坐地铁 (đi tàu điện ngầm), 地铁站 (nhà ga tàu điện ngầm).',
    exampleHanzi: '坐 地铁 上班 又 快 又 方便。',
    examplePinyin: 'Zuò dìtiě shàngbān yòu kuài yòu fāngbiàn.',
    exampleMeaning: 'Đi làm bằng tàu điện ngầm vừa nhanh vừa tiện lợi.',
    illustrationKey: 'nature',
  },
  熊猫: {
    pinyin: 'xióng māo',
    hanViet: 'hùng miêu',
    meaning: 'gấu trúc',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Lượng từ: 一只大熊猫 (một chú gấu trúc lớn). Linh vật của lớp là 熊猫彬彬 (Gấu trúc Bin Bin).',
    exampleHanzi: '大 熊猫 非常 喜欢 吃 竹子。',
    examplePinyin: 'Dà xióngmāo fēicháng xǐhuan chī zhúzi.',
    exampleMeaning: 'Gấu trúc lớn rất thích ăn lá trúc.',
    illustrationKey: 'nature',
  },
  你好: {
    pinyin: 'nǐ hǎo',
    hanViet: 'nhĩ hảo',
    meaning: 'xin chào',
    partOfSpeech: 'THÁN TỪ / GIAO TIẾP',
    hskLevel: 'HSK 1',
    usageNote: 'Lời chào thông dụng nhất trong tiếng Trung; với thầy cô/người lớn tuổi dùng 您好 (nín hǎo).',
    exampleHanzi: '你好！很高兴 认识 你。',
    examplePinyin: 'Nǐ hǎo! Hěn gāoxìng rènshi nǐ.',
    exampleMeaning: 'Xin chào! Rất vui được làm quen với bạn.',
    illustrationKey: 'pengyou',
  },
  谢谢: {
    pinyin: 'xiè xie',
    hanViet: 'tạ tạ',
    meaning: 'cảm ơn',
    partOfSpeech: 'ĐỘNG TỪ / GIAO TIẾP',
    hskLevel: 'HSK 1',
    usageNote: 'Đáp lại lời cảm ơn bằng: 不客气 (bù kèqi - đừng khách sáo) hoặc 不用谢 (bùyòng xiè).',
    exampleHanzi: '谢谢 你的 热情 帮助！',
    examplePinyin: 'Xièxie nǐ de rèqíng bāngzhù!',
    exampleMeaning: 'Cảm ơn sự giúp đỡ nhiệt tình của bạn!',
    illustrationKey: 'pengyou',
  },
  休息: {
    pinyin: 'xiū xi',
    hanViet: 'hưu tức',
    meaning: 'nghỉ ngơi',
    partOfSpeech: 'ĐỘNG TỪ',
    hskLevel: 'HSK 2',
    usageNote: 'Cấu trúc lặp lại động từ: 休息一下 (nghỉ ngơi một chút).',
    exampleHanzi: '累 了 就 休息 一下 吧。',
    examplePinyin: 'Lèi le jiù xiūxi yīxià ba.',
    exampleMeaning: 'Mệt rồi thì nghỉ ngơi một chút nhé.',
    illustrationKey: 'wennuan',
  },
  准备: {
    pinyin: 'zhǔn bèi',
    hanViet: 'chuẩn bị',
    meaning: 'chuẩn bị, sẵn sàng',
    partOfSpeech: 'ĐỘNG TỪ',
    hskLevel: 'HSK 2',
    usageNote: 'Kết hợp: 准备好 (chuẩn bị xong), 准备考试 (chuẩn bị thi cử).',
    exampleHanzi: '我们 已经 准备 好 上课 了。',
    examplePinyin: 'Wǒmen yǐjīng zhǔnbèi hǎo shàngkè le.',
    exampleMeaning: 'Chúng tôi đã chuẩn bị sẵn sàng vào lớp học rồi.',
    illustrationKey: 'chuzhong',
  },
  考试: {
    pinyin: 'kǎo shì',
    hanViet: 'khảo thí',
    meaning: 'kỳ thi, thi cử',
    partOfSpeech: 'DANH TỪ / ĐỘNG TỪ',
    hskLevel: 'HSK 2',
    usageNote: 'Kết hợp: 参加考试 (tham gia kỳ thi), 汉语考试 (kỳ thi tiếng Trung), 取得好成绩 (đạt kết quả cao).',
    exampleHanzi: '祝 你 明天的 汉语 考试 取得 好 成绩！',
    examplePinyin: 'Zhù nǐ míngtiān de Hànyǔ kǎoshì qǔdé hǎo chéngjì!',
    exampleMeaning: 'Chúc bạn kỳ thi tiếng Trung ngày mai đạt kết quả cao!',
    illustrationKey: 'chuzhong',
  },
  帮助: {
    pinyin: 'bāng zhù',
    hanViet: 'bang trợ',
    meaning: 'giúp đỡ, hỗ trợ',
    partOfSpeech: 'ĐỘNG TỪ / DANH TỪ',
    hskLevel: 'HSK 2',
    usageNote: 'Kết hợp: 互相帮助 (giúp đỡ lẫn nhau), 帮助朋友 (giúp đỡ bạn bè).',
    exampleHanzi: '同学 之间 要 互相 帮助。',
    examplePinyin: 'Tóngxué zhījiān yào hùxiāng bāngzhù.',
    exampleMeaning: 'Bạn học với nhau cần giúp đỡ lẫn nhau.',
    illustrationKey: 'pengyou',
  },
  介绍: {
    pinyin: 'jiè shào',
    hanViet: 'giới thiệu',
    meaning: 'giới thiệu',
    partOfSpeech: 'ĐỘNG TỪ / DANH TỪ',
    hskLevel: 'HSK 2',
    usageNote: 'Kết hợp: 自我介绍 (tự giới thiệu bản thân), 介绍一下 (giới thiệu một chút).',
    exampleHanzi: '请 先 做 一下 自我 介绍。',
    examplePinyin: 'Qǐng xiān zuò yīxià zìwǒ jièshào.',
    exampleMeaning: 'Xin mời tự giới thiệu bản thân trước một chút.',
    illustrationKey: 'pengyou',
  },
  礼物: {
    pinyin: 'lǐ wù',
    hanViet: 'lễ vật',
    meaning: 'món quà, quà tặng',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Lượng từ: 一份礼物 (một phần quà), 一件礼物 (một món quà).',
    exampleHanzi: '这 是 送给 你的 生日 礼物。',
    examplePinyin: 'Zhè shì sònggěi nǐ de shēngrì lǐwù.',
    exampleMeaning: 'Đây là món quà sinh nhật tặng cho bạn.',
    illustrationKey: 'xingfu',
  },
  环境: {
    pinyin: 'huán jìng',
    hanViet: 'hoàn cảnh',
    meaning: 'môi trường, hoàn cảnh',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Kết hợp: 保护环境 (bảo vệ môi trường), 学习环境 (môi trường học tập).',
    exampleHanzi: '我们 学校 的 学习 环境 很 好。',
    examplePinyin: 'Wǒmen xuéxiào de xuéxí huánjìng hěn hǎo.',
    exampleMeaning: 'Môi trường học tập của trường chúng tôi rất tốt.',
    illustrationKey: 'huayuan',
  },
  文化: {
    pinyin: 'wén huà',
    hanViet: 'văn hóa',
    meaning: 'văn hóa',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Kết hợp: 中国文化 (văn hóa Trung Hoa), 文化交流 (giao lưu văn hóa).',
    exampleHanzi: '我 对 中国 传统 文化 很 感兴趣。',
    examplePinyin: 'Wǒ duì Zhōngguó chuántǒng wénhuà hěn gǎn xìngqù.',
    exampleMeaning: 'Tôi rất có hứng thú với văn hóa truyền thống Trung Hoa.',
    illustrationKey: 'long',
  },
  发展: {
    pinyin: 'fā zhǎn',
    hanViet: 'phát triển',
    meaning: 'phát triển',
    partOfSpeech: 'ĐỘNG TỪ / DANH TỪ',
    hskLevel: 'HSK 4',
    usageNote: 'Kết hợp: 经济发展 (phát triển kinh tế), 发展很快 (phát triển rất nhanh).',
    exampleHanzi: '现代 城市 的 交通 发展 得 很 快。',
    examplePinyin: 'Xiàndài chéngshì de jiāotōng fāzhǎn de hěn kuài.',
    exampleMeaning: 'Giao thông của các thành phố hiện đại phát triển rất nhanh.',
    illustrationKey: 'nuli',
  },
  经济: {
    pinyin: 'jīng jì',
    hanViet: 'kinh tế',
    meaning: 'kinh tế',
    partOfSpeech: 'DANH TỪ / TÍNH TỪ',
    hskLevel: 'HSK 4',
    usageNote: 'Kết hợp: 发展经济 (phát triển kinh tế), 经济实惠 (kinh tế phải chăng).',
    exampleHanzi: '交通 方便 有助于 经济 发展。',
    examplePinyin: 'Jiāotōng fāngbiàn yǒuzhùyú jīngjì fāzhǎn.',
    exampleMeaning: 'Giao thông thuận tiện giúp ích cho sự phát triển kinh tế.',
    illustrationKey: 'nuli',
  },
  医院: {
    pinyin: 'yī yuàn',
    hanViet: 'y viện',
    meaning: 'bệnh viện',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 1',
    usageNote: 'Lượng từ: 一家医院 (một bệnh viện). Kết hợp: 去医院看病 (đi bệnh viện khám bệnh).',
    exampleHanzi: '身体 不 舒服 要 及时 去 医院 检查。',
    examplePinyin: 'Shēntǐ bù shūfu yào jíshí qù yīyuàn jiǎnchá.',
    exampleMeaning: 'Cơ thể không khỏe cần kịp thời đến bệnh viện kiểm tra.',
    illustrationKey: 'daily',
  },
  苹果: {
    pinyin: 'píng guǒ',
    hanViet: 'bình quả',
    meaning: 'quả táo',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 1',
    usageNote: 'Lượng từ: 一个红苹果 (một quả táo đỏ), 一斤苹果 (nửa cân táo).',
    exampleHanzi: '桌子 上 的 红 苹果 又 甜 又 新鲜。',
    examplePinyin: 'Zhuōzi shàng de hóng píngguǒ yòu tián yòu xīnxiān.',
    exampleMeaning: 'Quả táo đỏ trên bàn vừa ngọt vừa tươi ngon.',
    illustrationKey: 'kafei',
  },
  水果: {
    pinyin: 'shuǐ guǒ',
    hanViet: 'thủy quả',
    meaning: 'hoa quả, trái cây',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 1',
    usageNote: 'Kết hợp: 新鲜水果 (hoa quả tươi), 吃水果 (ăn trái cây).',
    exampleHanzi: '每天 多 吃 新鲜 水果 对 健康 很 好。',
    examplePinyin: 'Měitiān duō chī xīnxiān shuǐguǒ duì jiànkāng hěn hǎo.',
    exampleMeaning: 'Mỗi ngày ăn nhiều hoa quả tươi rất tốt cho sức khỏe.',
    illustrationKey: 'kafei',
  },
  电脑: {
    pinyin: 'diàn nǎo',
    hanViet: 'điện não',
    meaning: 'máy vi tính, laptop',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 1',
    usageNote: 'Lượng từ: 一台笔记本电脑 (một chiếc máy tính xách tay).',
    exampleHanzi: '我 用 电脑 查阅 汉语 学习 资料。',
    examplePinyin: 'Wǒ yòng diànnǎo cháyuè Hànyǔ xuéxí zīliào.',
    exampleMeaning: 'Tôi dùng máy tính để tra cứu tài liệu học tiếng Trung.',
    illustrationKey: 'daily',
  },
  手机: {
    pinyin: 'shǒu jī',
    hanViet: 'thủ cơ',
    meaning: 'điện thoại di động',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 2',
    usageNote: 'Lượng từ: 一部手机 (một chiếc điện thoại). Kết hợp: 智能手机 (điện thoại thông minh).',
    exampleHanzi: '现在 大家 都 用 手机 查 词典。',
    examplePinyin: 'Xiànzài dàjiā dōu yòng shǒujī chá cídiǎn.',
    exampleMeaning: 'Hiện nay mọi người đều dùng điện thoại để tra từ điển.',
    illustrationKey: 'daily',
  },
  猫: {
    pinyin: 'māo',
    hanViet: 'miêu',
    meaning: 'con mèo',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 1',
    usageNote: 'Lượng từ: 一只小猫 (một chú mèo con).',
    exampleHanzi: '那只 小 白 猫 正在 晒 太阳。',
    examplePinyin: 'Nà zhī xiǎo bái māo zhèngzài shài tàiyáng.',
    exampleMeaning: 'Chú mèo trắng nhỏ kia đang sưởi nắng.',
    illustrationKey: 'dog',
  },
  父母: {
    pinyin: 'fù mǔ',
    hanViet: 'phụ mẫu',
    meaning: 'cha mẹ, bố mẹ',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 4',
    usageNote: 'Cách gọi trang trọng của 爸爸妈妈 (bố mẹ): 孝顺父母 (hiếu thảo với cha mẹ).',
    exampleHanzi: '周末 我 常 回家 陪伴 父母。',
    examplePinyin: 'Zhōumò wǒ cháng huíjiā péibàn fùmǔ.',
    exampleMeaning: 'Cuối tuần tôi thường về nhà bầu bạn cùng cha mẹ.',
    illustrationKey: 'xingfu',
  },
  菜: {
    pinyin: 'cài',
    hanViet: 'thái',
    meaning: 'món ăn, rau xanh',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 1',
    usageNote: 'Kết hợp: 中国菜 (món ăn Trung Quốc), 做菜 (nấu ăn), 点菜 (gọi món).',
    exampleHanzi: '妈妈 做 的 家常 菜 非常 好吃。',
    examplePinyin: 'Māma zuò de jiācháng cài fēicháng hǎochī.',
    exampleMeaning: 'Món ăn gia đình mẹ nấu vô cùng ngon miệng.',
    illustrationKey: 'kafei',
  },
  饭: {
    pinyin: 'fàn',
    hanViet: 'phạn',
    meaning: 'cơm, bữa ăn',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 1',
    usageNote: 'Kết hợp: 吃饭 (ăn cơm), 早饭 (bữa sáng), 晚饭 (bữa tối), 米饭 (cơm trắng).',
    exampleHanzi: '全 家人 一起 吃 晚饭 最 温暖。',
    examplePinyin: 'Quán jiārén yīqǐ chī wǎnfàn zuì wēnnuǎn.',
    exampleMeaning: 'Cả gia đình cùng nhau ăn bữa tối là ấm áp nhất.',
    illustrationKey: 'kafei',
  },
  空调: {
    pinyin: 'kōng tiáo',
    hanViet: 'không điều',
    meaning: 'máy điều hòa nhiệt độ',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Bật điều hòa: 开空调 · Tắt điều hòa: 关空调.',
    exampleHanzi: '天气 太 热 了，咱们 把 空调 打开 吧。',
    examplePinyin: 'Tiānqì tài rè le, zánmen bǎ kōngtiáo dǎkāi ba.',
    exampleMeaning: 'Thời tiết nóng quá rồi, chúng mình bật điều hòa lên nhé.',
    illustrationKey: 'kongtiao',
  },
  洗衣机: {
    pinyin: 'xǐ yī jī',
    hanViet: 'tẩy y cơ',
    meaning: 'máy giặt',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Lượng từ: 一台洗衣机 (một chiếc máy giặt).',
    exampleHanzi: '请 把 脏 衣服 放进 洗衣机 里 洗。',
    examplePinyin: 'Qǐng bǎ zāng yīfu fàngjìn xǐyījī lǐ xǐ.',
    exampleMeaning: 'Xin hãy cho quần áo bẩn vào máy giặt để giặt.',
    illustrationKey: 'xiyiji',
  },
  花园: {
    pinyin: 'huā yuán',
    hanViet: 'hoa viên',
    meaning: 'vườn hoa',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Kết hợp: 美丽的花园 (khu vườn xinh đẹp), 在花园散步 (dạo bộ trong vườn hoa).',
    exampleHanzi: '春天 花园 里 开满 了 鲜花。',
    examplePinyin: 'Chūntiān huāyuán lǐ kāimǎn le xiānhuā.',
    exampleMeaning: 'Mùa xuân trong vườn hoa nở đầy hoa tươi.',
    illustrationKey: 'huayuan',
  },
  咱们: {
    pinyin: 'zán men',
    hanViet: 'tán môn',
    meaning: 'chúng ta, chúng mình',
    partOfSpeech: 'ĐẠI TỪ',
    hskLevel: 'HSK 4',
    usageNote: 'Đại từ ngôi thứ nhất số nhiều bao gồm cả người nghe, mang sắc thái thân mật.',
    exampleHanzi: '咱们 一起 努力 学 好 汉语 吧！',
    examplePinyin: 'Zánmen yīqǐ nǔlì xué hǎo Hànyǔ ba!',
    exampleMeaning: 'Chúng mình cùng nhau nỗ lực học tốt tiếng Trung nhé!',
    illustrationKey: 'zanmen',
  },
  初中: {
    pinyin: 'chū zhōng',
    hanViet: 'sơ trung',
    meaning: 'trung học cơ sở (cấp 2)',
    partOfSpeech: 'DANH TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Học sinh cấp 2: 初中生 (chūzhōngshēng) · Cấp 3: 高中 (gāozhōng).',
    exampleHanzi: '我 从 初中 开始 学习 汉语。',
    examplePinyin: 'Wǒ cóng chūzhōng kāishǐ xuéxí Hànyǔ.',
    exampleMeaning: 'Tôi bắt đầu học tiếng Trung từ năm cấp 2.',
    illustrationKey: 'chuzhong',
  },
  明天: {
    pinyin: 'míng tiān',
    hanViet: 'minh thiên',
    meaning: 'ngày mai',
    partOfSpeech: 'DANH TỪ CHỈ THỜI GIAN',
    hskLevel: 'HSK 1',
    usageNote: 'Đứng đầu câu hoặc sau chủ ngữ làm trạng ngữ chỉ thời gian: 明天见 (hẹn gặp ngày mai), 明天早上 (sáng mai).',
    exampleHanzi: '明天 我们 一起 去 北京 看 长城 吧！',
    examplePinyin: 'Míngtiān wǒmen yīqǐ qù Běijīng kàn Chángchéng ba!',
    exampleMeaning: 'Ngày mai chúng ta cùng đi Bắc Kinh ngắm Vạn Lý Trường Thành nhé!',
    illustrationKey: 'nature',
  },
  照顾: {
    pinyin: 'zhào gù',
    hanViet: 'chiếu cố',
    meaning: 'chăm sóc, quan tâm',
    partOfSpeech: 'ĐỘNG TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Kết hợp: 照顾家人 (chăm sóc gia đình), 照顾好自己 (tự chăm sóc tốt bản thân), 细心地照顾 (chăm sóc chu đáo).',
    exampleHanzi: '妈妈 一直 很 细心地 照顾 我们。',
    examplePinyin: 'Māma yīzhí hěn xìxīn de zhàogù wǒmen.',
    exampleMeaning: 'Mẹ luôn ân cần và chu đáo chăm sóc chúng tôi.',
    illustrationKey: 'xingfu',
  },
  坚持: {
    pinyin: 'jiān chí',
    hanViet: 'kiên trì',
    meaning: 'kiên trì, bền bỉ',
    partOfSpeech: 'ĐỘNG TỪ',
    hskLevel: 'HSK 4',
    usageNote: 'Cấu trúc HSK 3.0 Trung cấp: 坚持 + Động từ (坚持学习, 坚持锻炼, 坚持下去 - kiên trì đến cùng).',
    exampleHanzi: '无论 多么 困难，我们 都 要 坚持 下去。',
    examplePinyin: 'Wúlùn duōme kùnnan, wǒmen dōu yào jiānchí xiàqù.',
    exampleMeaning: 'Dù khó khăn đến đâu, chúng ta đều phải kiên trì đến cùng.',
    illustrationKey: 'nuli',
  },
  包容: {
    pinyin: 'bāo róng',
    hanViet: 'bao dung',
    meaning: 'bao dung, độ lượng',
    partOfSpeech: 'ĐỘNG TỪ / TÍNH TỪ',
    hskLevel: 'HSK 5',
    usageNote: 'Từ vựng Trung cấp HSK 3.0: 学会包容 (học cách bao dung), 理解与包容 (thấu hiểu và bao dung).',
    exampleHanzi: '真正 的 友谊 需要 互相 理解 与 包容。',
    examplePinyin: 'Zhēnzhèng de yǒuyì xūyào hùxiāng lǐjiě yǔ bāoróng.',
    exampleMeaning: 'Tình bạn chân chính cần sự thấu hiểu và bao dung lẫn nhau.',
    illustrationKey: 'xingfu',
  },
  融会贯通: {
    pinyin: 'róng huì guàn tōng',
    hanViet: 'dung hội quán thông',
    meaning: 'hiểu thấu đáo, vận dụng linh hoạt',
    partOfSpeech: 'THÀNH NGỮ (成语)',
    hskLevel: 'HSK 7-9',
    usageNote: 'Thành ngữ Cao cấp HSK 3.0 (高等): Kết nối nhiều luồng kiến thức để hiểu thấu suốt và vận dụng tự nhiên.',
    exampleHanzi: '学习 语言 要 把 词汇 和 语法 融会贯通。',
    examplePinyin: 'Xuéxí yǔyán yào bǎ cíhuì hé yǔfǎ rónghuì-guàntōng.',
    exampleMeaning: 'Học ngôn ngữ cần phải dung hợp và thấu suốt từ vựng với ngữ pháp.',
    illustrationKey: 'laoshi',
  },
  旅行: {
    pinyin: 'lǚ xíng',
    hanViet: 'lữ hành',
    meaning: 'du lịch, chuyến đi xa',
    partOfSpeech: 'ĐỘNG TỪ / DANH TỪ',
    hskLevel: 'HSK 2',
    usageNote: 'Kết hợp: 去中国旅行 (đi du lịch Trung Quốc), 毕业旅行 (chuyến du lịch tốt nghiệp).',
    exampleHanzi: '今年 暑假 我们 打算 去 中国 旅行。',
    examplePinyin: 'Jīnnián shǔjià wǒmen dǎsuàn qù Zhōngguó lǚxíng.',
    exampleMeaning: 'Kỳ nghỉ hè năm nay chúng tôi dự định đi du lịch Trung Quốc.',
    illustrationKey: 'nature',
  },
  今天: {
    pinyin: 'jīn tiān',
    hanViet: 'kim thiên',
    meaning: 'hôm nay',
    partOfSpeech: 'DANH TỪ CHỈ THỜI GIAN',
    hskLevel: 'HSK 1',
    usageNote: 'Danh từ chỉ thời gian hiện tại: 今天天气很好 (thời tiết hôm nay rất đẹp).',
    exampleHanzi: '今天 的 天气 非常 温暖 晴朗。',
    examplePinyin: 'Jīntiān de tiānqì fēicháng wēnnuǎn qínglǎng.',
    exampleMeaning: 'Thời tiết ngày hôm nay vô cùng ấm áp và quang đãng.',
    illustrationKey: 'wennuan',
  },
  昨天: {
    pinyin: 'zuó tiān',
    hanViet: 'tạc thiên',
    meaning: 'hôm qua',
    partOfSpeech: 'DANH TỪ CHỈ THỜI GIAN',
    hskLevel: 'HSK 1',
    usageNote: 'Chỉ ngày hôm qua: 昨天晚上 (tối hôm qua), 昨天下午 (chiều hôm qua).',
    exampleHanzi: '昨天 我 和 朋友 一起 去 图书馆 看书 了。',
    examplePinyin: 'Zuótiān wǒ hé péngyou yīqǐ qù túshūguǎn kànshū le.',
    exampleMeaning: 'Hôm qua tôi đã cùng bạn bè tới thư viện đọc sách.',
    illustrationKey: 'school',
  },
  周末: {
    pinyin: 'zhōu mò',
    hanViet: 'chu mạt',
    meaning: 'cuối tuần',
    partOfSpeech: 'DANH TỪ CHỈ THỜI GIAN',
    hskLevel: 'HSK 2',
    usageNote: 'Kết hợp: 周末愉快 (cuối tuần vui vẻ), 这个周末 (cuối tuần này).',
    exampleHanzi: '这个 周末 我们 全家人 一起 去 公园 野餐。',
    examplePinyin: 'Zhège zhōumò wǒmen quán jiārén yīqǐ qù gōngyuán yěcān.',
    exampleMeaning: 'Cuối tuần này cả gia đình chúng tôi cùng đi dã ngoại ở công viên.',
    illustrationKey: 'huayuan',
  },
  复习: {
    pinyin: 'fù xí',
    hanViet: 'phục tập',
    meaning: 'ôn tập',
    partOfSpeech: 'ĐỘNG TỪ',
    hskLevel: 'HSK 2',
    usageNote: 'Kết hợp: 复习课文 (ôn tập bài khóa), 复习生词 (ôn tập từ mới).',
    exampleHanzi: '考试 之前 一定 要 认真 复习 课文。',
    examplePinyin: 'Kǎoshì zhīqián yīdìng yào rènzhēn fùxí kèwén.',
    exampleMeaning: 'Trước kỳ thi nhất định phải chăm chỉ ôn tập bài khóa.',
    illustrationKey: 'chuzhong',
  },
  练习: {
    pinyin: 'liàn xí',
    hanViet: 'luyện tập',
    meaning: 'luyện tập, bài tập',
    partOfSpeech: 'ĐỘNG TỪ / DANH TỪ',
    hskLevel: 'HSK 2',
    usageNote: 'Kết hợp: 练习写汉字 (luyện viết chữ Hán), 做练习 (làm bài tập).',
    exampleHanzi: '我 每天 都 坚持 练习 写 汉字。',
    examplePinyin: 'Wǒ měitiān dōu jiānchí liànxí xiě Hànzì.',
    exampleMeaning: 'Mỗi ngày tôi đều kiên trì luyện viết chữ Hán.',
    illustrationKey: 'nuli',
  },
  运动: {
    pinyin: 'yùn dòng',
    hanViet: 'vận động',
    meaning: 'thể thao, vận động',
    partOfSpeech: 'ĐỘNG TỪ / DANH TỪ',
    hskLevel: 'HSK 2',
    usageNote: 'Kết hợp: 做运动 (tập thể dục), 喜欢运动 (thích thể thao).',
    exampleHanzi: '每天 早上 坚持 运动 对 身体 很 好。',
    examplePinyin: 'Měitiān zǎoshang jiānchí yùndòng duì shēntǐ hěn hǎo.',
    exampleMeaning: 'Mỗi sáng kiên trì tập thể thao rất tốt cho sức khỏe.',
    illustrationKey: 'nuli',
  },
  感冒: {
    pinyin: 'gǎn mào',
    hanViet: 'cảm mạo',
    meaning: 'cảm cúm, bị cảm',
    partOfSpeech: 'ĐỘNG TỪ / DANH TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Kết hợp: 感冒了 (bị cảm rồi), 吃感冒药 (uống thuốc cảm).',
    exampleHanzi: '天气 变 冷 了，多 穿 衣服 小心 感冒。',
    examplePinyin: 'Tiānqì biàn lěng le, duō chuān yīfu xiǎoxīn gǎnmào.',
    exampleMeaning: 'Trời trở lạnh rồi, hãy mặc thêm áo kẻo bị cảm cúm.',
    illustrationKey: 'xingfu',
  },
  关心: {
    pinyin: 'guān xīn',
    hanViet: 'quan tâm',
    meaning: 'quan tâm, hỏi han',
    partOfSpeech: 'ĐỘNG TỪ / DANH TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Kết hợp: 关心朋友 (quan tâm bạn bè), 感谢您的关心 (cảm ơn sự quan tâm của ngài).',
    exampleHanzi: '父母 和 老师 的 关心 让 我 觉得 很 温暖。',
    examplePinyin: 'Fùmǔ hé lǎoshī de guānxīn ràng wǒ juéde hěn wēnnuǎn.',
    exampleMeaning: 'Sự quan tâm của bố mẹ và thầy cô khiến tôi cảm thấy rất ấm lòng.',
    illustrationKey: 'wennuan',
  },
  习惯: {
    pinyin: 'xí guàn',
    hanViet: 'tập quán',
    meaning: 'thói quen, quen với',
    partOfSpeech: 'DANH TỪ / ĐỘNG TỪ',
    hskLevel: 'HSK 3',
    usageNote: 'Kết hợp: 好习惯 (thói quen tốt), 习惯了早起 (đã quen dậy sớm).',
    exampleHanzi: '养成 每天 阅读 的 好 习惯 非常 重要。',
    examplePinyin: 'Yǎngchéng měitiān yuèdú de hǎo xíguàn fēicháng zhòngyào.',
    exampleMeaning: 'Rèn luyện thói quen tốt đọc sách mỗi ngày vô cùng quan trọng.',
    illustrationKey: 'school',
  },
  阅读: {
    pinyin: 'yuè dú',
    hanViet: 'duyệt độc',
    meaning: 'đọc hiểu, đọc sách',
    partOfSpeech: 'ĐỘNG TỪ / DANH TỪ',
    hskLevel: 'HSK 4',
    usageNote: 'Kết hợp: 阅读理解 (đọc hiểu), 喜欢阅读 (yêu thích đọc sách).',
    exampleHanzi: '广泛 阅读 可以 帮助 我们 积累 丰富 的 词汇。',
    examplePinyin: 'Guǎngfàn yuèdú kěyǐ bāngzhù wǒmen jīlěi fēngfù de cíhuì.',
    exampleMeaning: 'Đọc sách rộng rãi giúp chúng ta tích lũy vốn từ vựng phong phú.',
    illustrationKey: 'school',
  },
  交流: {
    pinyin: 'jiāo liú',
    hanViet: 'giao lưu',
    meaning: 'giao lưu, trao đổi',
    partOfSpeech: 'ĐỘNG TỪ / DANH TỪ',
    hskLevel: 'HSK 4',
    usageNote: 'Kết hợp: 文化交流 (giao lưu văn hóa), 用汉语交流 (giao tiếp bằng tiếng Trung).',
    exampleHanzi: '多 跟 中国 朋友 交流 能 快速 提高 口语。',
    examplePinyin: 'Duō gēn Zhōngguó péngyou jiāoliú néng kuàisù tígāo kǒuyǔ.',
    exampleMeaning: 'Trò chuyện giao lưu nhiều với bạn Trung Quốc sẽ giúp nâng cao khẩu ngữ nhanh chóng.',
    illustrationKey: 'pengyou',
  },
  团圆: {
    pinyin: 'tuán yuán',
    hanViet: 'đoàn viên',
    meaning: 'đoàn viên, sum họp',
    partOfSpeech: 'ĐỘNG TỪ / TÍNH TỪ',
    hskLevel: 'HSK 4',
    usageNote: 'Kết hợp: 全家团圆 (cả nhà đoàn viên), 团圆饭 (bữa cơm đoàn viên).',
    exampleHanzi: '中秋节 是 全家人 幸福 团圆 的 日子。',
    examplePinyin: 'Zhōngqiūjié shì quán jiārén xìngfú tuányuán de rìzi.',
    exampleMeaning: 'Tết Trung thu là ngày cả gia đình sum họp hạnh phúc.',
    illustrationKey: 'xingfu',
  },
};

/**
 * In-memory cache of authentic HanziWriter CDN stroke data
 */
const HANZI_WRITER_CACHE = new Map<string, StrokeData>();

export function inferIllustrationCategory(
  hanzi: string,
  meaning = ''
): IllustrationCategoryKey {
  const lower = `${hanzi} ${meaning}`.toLowerCase();
  if (/狗|犬|chó|cún|dog|puppy/.test(lower)) return 'dog';
  if (/换|đổi|thay|trao đổi|exchange|convert/.test(lower)) return 'huan';
  if (/刻|thời gian|15 phút|đồng hồ|clock|time/.test(lower)) return 'ke';
  if (/愿|nguyện|bằng lòng|sẵn lòng|willing/.test(lower)) return 'yuanyi';
  if (/温|暖|热|茶|阳|春|火|ấm|nắng|trà|mùa xuân/.test(lower)) return 'wennuan';
  if (/龙|神|华|rồng|thần long/.test(lower)) return 'long';
  if (/咖啡|cà phê|coffee/.test(lower)) return 'kafei';
  if (/美食|吃|菜|饭|ẩm thực|ăn/.test(lower)) return 'kafei';
  if (/幸福|爱|家|喜|乐|hạnh phúc|yêu|gia đình|vui/.test(lower)) return 'xingfu';
  if (/努|功|梦|成|nỗ lực|thành công|ước mơ/.test(lower)) return 'nuli';
  if (/朋友|咱们|高|bạn bè|chúng ta|cùng nhau/.test(lower)) return 'pengyou';
  if (/老师|汉语|中文|大|thầy|cô|giáo viên|đại học/.test(lower)) return 'laoshi';
  if (/学|校|书|初|生|trường|học|sách/.test(lower)) return 'chuzhong';
  if (/花|园|树|草|美|vườn|hoa|cây/.test(lower)) return 'huayuan';
  if (/挺|khá|rất/.test(lower)) return 'ting';
  if (/空调|风|凉|điều hòa|mát/.test(lower)) return 'kongtiao';
  if (/洗衣|洗|衣|máy giặt|quần áo/.test(lower)) return 'xiyiji';
  if (/冰箱|tủ lạnh/.test(lower)) return 'bingxiang';
  if (/卫生间|vệ sinh|toilet/.test(lower)) return 'weishengjian';
  if (/灯|đèn/.test(lower)) return 'deng';
  if (/水|山|雨|雪|天|旅|游|thiên nhiên|núi|sông|du lịch/.test(lower)) return 'nature';
  return 'nature';
}

export function getStrokeDataForChar(char: string, fallbackPinyin?: string): StrokeData {
  const cached = HANZI_WRITER_CACHE.get(char);
  if (cached) {
    return cached;
  }
  if (STROKE_LIBRARY[char]) {
    return STROKE_LIBRARY[char];
  }
  const meta = CHAR_META_DICTIONARY[char];
  return {
    char,
    pinyin: fallbackPinyin || meta?.pinyin || char,
    radical: meta?.radical || 'Bộ thủ Hán tự',
    strokeCount: meta?.strokeCount || 8,
    // Empty strokes array until HanziWriter CDN resolves (no fake 5-stroke cross!)
    strokes: [],
    strokePoints: [],
  };
}

/**
 * Fetches 100% authentic SVG stroke outlines and medians for ANY Chinese character
 * directly from the official HanziWriter CDN:
 * https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(char)}.json
 */
export async function fetchHanziWriterCharacter(
  char: string,
  fallbackPinyin?: string,
  fallbackRadical?: string
): Promise<StrokeData> {
  const cached = HANZI_WRITER_CACHE.get(char);
  if (cached && cached.hanziWriterStrokes && cached.hanziWriterStrokes.length > 0) {
    return cached;
  }

  const existingLib = STROKE_LIBRARY[char];
  const meta = CHAR_META_DICTIONARY[char];
  const resolvedPinyin = fallbackPinyin || existingLib?.pinyin || meta?.pinyin || char;
  const resolvedRadical =
    fallbackRadical || existingLib?.radical || meta?.radical || 'Bộ thủ chuẩn';

  try {
    const url = `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(
      char
    )}.json`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HanziWriter CDN returned ${res.status}`);
    }
    const data = (await res.json()) as {
      strokes: string[];
      medians: number[][][];
    };

    if (Array.isArray(data.strokes) && data.strokes.length > 0) {
      // Convert HanziWriter 1024x1024 medians (where y=900 is top, y=-124 is bottom)
      // into our 0..100 SVG coordinate box: x100 = x / 10.24, y100 = (900 - y) / 10.24
      const strokePoints100: number[][][] = (data.medians || []).map((median) =>
        median.map(([mx, my]) => [
          Math.round((mx / 10.24) * 10) / 10,
          Math.round(((900 - my) / 10.24) * 10) / 10,
        ])
      );

      const medianPathStrings100: string[] = strokePoints100.map((pts) =>
        pts.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`).join(' ')
      );

      const hydrated: StrokeData = {
        char,
        pinyin: resolvedPinyin,
        radical: resolvedRadical,
        strokeCount: data.strokes.length,
        strokes: medianPathStrings100,
        strokePoints: strokePoints100,
        hanziWriterStrokes: data.strokes,
      };
      HANZI_WRITER_CACHE.set(char, hydrated);
      return hydrated;
    }
  } catch {
    // Fallback to STROKE_LIBRARY if offline
  }

  if (existingLib) {
    return existingLib;
  }
  return getStrokeDataForChar(char, resolvedPinyin);
}

/**
 * Hydrates all characters of a VocabSlide with real HanziWriter CDN stroke data
 */
export async function hydrateSlideStrokesFromCDN(slide: VocabSlide): Promise<VocabSlide> {
  const pinyinSyllables = slide.pinyin.split(/\s+/);
  const chars = Array.from(slide.hanzi).filter((c) => /[\u4e00-\u9fff]/.test(c));
  const targetChars = chars.length > 0 ? chars : Array.from(slide.hanzi);

  const hydratedCharacters = await Promise.all(
    targetChars.map((ch, idx) => {
      const existingChar = slide.characters.find((c) => c.char === ch);
      return fetchHanziWriterCharacter(
        ch,
        pinyinSyllables[idx] || existingChar?.pinyin,
        existingChar?.radical
      );
    })
  );

  return {
    ...slide,
    characters: hydratedCharacters,
  };
}

/**
 * Calls server-side Gemini API (/api/hanzi/enrich) to enrich any arbitrary Chinese word
 * with accurate Pinyin, Hán Việt, Vietnamese meaning, radicals, and contextual example sentence.
 */
export async function enrichVocabSlideWithAI(slide: VocabSlide): Promise<VocabSlide> {
  try {
    const response = await fetch('/api/hanzi/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hanzi: slide.hanzi }),
    });
    if (!response.ok) {
      return hydrateSlideStrokesFromCDN(slide);
    }
    const aiData = await response.json();
    if (!aiData || !aiData.pinyin) {
      return hydrateSlideStrokesFromCDN(slide);
    }

    const updatedSlide: VocabSlide = {
      ...slide,
      pinyin: aiData.pinyin || slide.pinyin,
      hanViet: aiData.hanViet || slide.hanViet,
      meaning: aiData.meaning || slide.meaning,
      partOfSpeech: aiData.partOfSpeech || slide.partOfSpeech,
      hskLevel: aiData.hskLevel || slide.hskLevel,
      usageNote: aiData.usageNote || slide.usageNote,
      exampleHanzi: aiData.exampleHanzi || slide.exampleHanzi,
      examplePinyin: aiData.examplePinyin || slide.examplePinyin,
      exampleMeaning: aiData.exampleMeaning || slide.exampleMeaning,
      illustrationKey:
        aiData.illustrationKey ||
        inferIllustrationCategory(slide.hanzi, aiData.meaning || slide.meaning),
      characters: slide.characters.map((ch, idx) => ({
        ...ch,
        pinyin: aiData.characterDetails?.[idx]?.pinyin || ch.pinyin,
        radical: aiData.characterDetails?.[idx]?.radical || ch.radical,
      })),
    };

    return hydrateSlideStrokesFromCDN(updatedSlide);
  } catch {
    return hydrateSlideStrokesFromCDN(slide);
  }
}

export function evaluateSentenceOrder(
  selectedTokens: string[],
  correctTokens: string[]
): { isCorrect: boolean; scoreDelta: number; joinedAnswer: string } {
  const joinedAnswer = selectedTokens.join(' ');
  if (selectedTokens.length !== correctTokens.length) {
    return { isCorrect: false, scoreDelta: 0, joinedAnswer };
  }
  const isCorrect = selectedTokens.every((token, idx) => token === correctTokens[idx]);
  return {
    isCorrect,
    scoreDelta: isCorrect ? 1 : 0,
    joinedAnswer,
  };
}

export function shuffleTokensDeterministic(tokens: string[], seed = 1): string[] {
  if (tokens.length <= 1) return [...tokens];
  const copy = [...tokens];
  const offset = (Math.abs(seed) % (copy.length - 1)) + 1;
  const rotated = [...copy.slice(offset), ...copy.slice(0, offset)];
  if (rotated.every((val, idx) => val === tokens[idx])) {
    const temp = rotated[0];
    rotated[0] = rotated[rotated.length - 1];
    rotated[rotated.length - 1] = temp;
  }
  return rotated;
}

export function evaluateStrokeSimilarity(
  userPoints: number[][],
  targetStrokePoints: number[][]
): { passed: boolean; accuracy: number } {
  if (!userPoints || userPoints.length < 2) {
    return { passed: false, accuracy: 0 };
  }
  const startUser = userPoints[0];
  const endUser = userPoints[userPoints.length - 1];
  const dxUser = endUser[0] - startUser[0];
  const dyUser = endUser[1] - startUser[1];
  const lengthUser = Math.hypot(dxUser, dyUser);

  if (lengthUser < 6) {
    return { passed: false, accuracy: 20 };
  }

  if (!targetStrokePoints || targetStrokePoints.length < 2) {
    return { passed: true, accuracy: 92 };
  }

  const startTarget = targetStrokePoints[0];
  const endTarget = targetStrokePoints[targetStrokePoints.length - 1];
  const startDist = Math.hypot(startUser[0] - startTarget[0], startUser[1] - startTarget[1]);
  const endDist = Math.hypot(endUser[0] - endTarget[0], endUser[1] - endTarget[1]);
  const avgDist = (startDist + endDist) / 2;

  const rawAccuracy = Math.max(68, Math.min(99, Math.round(100 - avgDist * 0.42)));
  return {
    passed: true,
    accuracy: rawAccuracy,
  };
}

/**
 * Synthesizes a natural Vietnamese meaning for a Chinese word when it is not yet in SMART_HANZI_DICTIONARY,
 * NEVER concatenating character meanings with ' · '.
 */
function synthesizeHolisticMeaning(hanzi: string, composedHanViet: string): string {
  const clean = hanzi.trim();
  if (SMART_HANZI_DICTIONARY[clean]) {
    return SMART_HANZI_DICTIONARY[clean].meaning;
  }
  const preset = INITIAL_VOCAB_SLIDES.find((s) => s.hanzi === clean);
  if (preset) {
    return preset.meaning;
  }
  if (clean.length === 1 && CHAR_META_DICTIONARY[clean]) {
    return CHAR_META_DICTIONARY[clean].meaning;
  }
  // If a substring matches a known compound word in SMART_HANZI_DICTIONARY, adapt its meaning
  for (const [key, entry] of Object.entries(SMART_HANZI_DICTIONARY)) {
    if (key.length >= 2 && clean.includes(key)) {
      return entry.meaning;
    }
  }
  if (composedHanViet && composedHanViet !== clean) {
    return composedHanViet;
  }
  return `từ vựng ${clean}`;
}

/**
 * Generates a realistic, natural HSK 3.0 contextual example sentence for any word,
 * NEVER using the mechanical "我们今天一起学习...这个词" template.
 */
export function synthesizeContextualExample(
  hanzi: string,
  pinyin: string,
  meaning: string
): {
  exampleHanzi: string;
  examplePinyin: string;
  exampleMeaning: string;
} {
  const clean = hanzi.trim();
  const dict = SMART_HANZI_DICTIONARY[clean];
  if (dict) {
    return {
      exampleHanzi: dict.exampleHanzi,
      examplePinyin: dict.examplePinyin,
      exampleMeaning: dict.exampleMeaning,
    };
  }
  const preset = INITIAL_VOCAB_SLIDES.find((s) => s.hanzi === clean);
  if (preset) {
    return {
      exampleHanzi: preset.exampleHanzi,
      examplePinyin: preset.examplePinyin,
      exampleMeaning: preset.exampleMeaning,
    };
  }

  const lower = `${clean} ${meaning}`.toLowerCase();
  if (/天|周|月|年|早|晚|时|ngày|tuần|tháng|năm|buổi|mùa/.test(lower)) {
    return {
      exampleHanzi: `${clean} 我们 一起 去 公园 散步 吧！`,
      examplePinyin: `${pinyin} wǒmen yīqǐ qù gōngyuán sànbù ba!`,
      exampleMeaning: `${meaning.charAt(0).toUpperCase() + meaning.slice(1)} chúng ta cùng đi dạo ở công viên nhé!`,
    };
  }
  if (/考|试|学|习|书|校|课|thi|học|sách|trường|bài/.test(lower)) {
    return {
      exampleHanzi: `为了 取得 好 成绩，大家 都 认真 准备 ${clean}。`,
      examplePinyin: `Wèile qǔdé hǎo chéngjì, dàjiā dōu rènzhēn zhǔnbèi ${pinyin}.`,
      exampleMeaning: `Để đạt kết quả cao, mọi người đều nghiêm túc chuẩn bị cho ${meaning}.`,
    };
  }
  if (/家|妈|爸|父|母|顾|爱|nhà|mẹ|bố|chăm sóc|gia đình|yêu/.test(lower)) {
    return {
      exampleHanzi: `家人 之间 总是 互相 ${clean} 和 理解。`,
      examplePinyin: `Jiārén zhījiān zǒngshì hùxiāng ${pinyin} hé lǐjiě.`,
      exampleMeaning: `Người thân trong gia đình luôn ${meaning} và thấu hiểu lẫn nhau.`,
    };
  }
  return {
    exampleHanzi: `在 日常 生活 中，大家 都很 重视 ${clean}。`,
    examplePinyin: `Zài rìcháng shēnghuó zhōng, dàjiā dōu hěn zhòngshì ${pinyin}.`,
    exampleMeaning: `Trong đời sống hằng ngày, mọi người đều rất coi trọng ${meaning}.`,
  };
}

export function parseQuickSlideInput(rawInput: string, nextIndex: number): VocabSlide | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  const parts = trimmed.split('|').map((p) => p.trim());
  const hanzi = parts[0] || '';
  if (!hanzi) return null;

  // 1. Check INITIAL_VOCAB_SLIDES or SMART_HANZI_DICTIONARY
  const existingPreset = INITIAL_VOCAB_SLIDES.find((s) => s.hanzi === hanzi);
  const dictEntry = SMART_HANZI_DICTIONARY[hanzi];

  // 2. Compose syllable-by-syllable Pinyin & Hán Việt from CHAR_META_DICTIONARY if not in word dict
  const charList = Array.from(hanzi);
  const composedPinyin = charList
    .map((ch) => CHAR_META_DICTIONARY[ch]?.pinyin || STROKE_LIBRARY[ch]?.pinyin || '')
    .filter(Boolean)
    .join(' ');
  const composedHanViet = charList
    .map((ch) => CHAR_META_DICTIONARY[ch]?.hanViet || '')
    .filter(Boolean)
    .join(' ');

  const pinyin =
    parts[1] ||
    dictEntry?.pinyin ||
    existingPreset?.pinyin ||
    composedPinyin ||
    hanzi;
  const hanViet =
    parts[4] ||
    dictEntry?.hanViet ||
    existingPreset?.hanViet ||
    composedHanViet ||
    hanzi;
  const meaning =
    parts[2] ||
    dictEntry?.meaning ||
    existingPreset?.meaning ||
    synthesizeHolisticMeaning(hanzi, composedHanViet);

  const synthExample = synthesizeContextualExample(hanzi, pinyin, meaning);
  const exampleHanzi =
    parts[3] ||
    dictEntry?.exampleHanzi ||
    existingPreset?.exampleHanzi ||
    synthExample.exampleHanzi;
  const illustrationKey =
    dictEntry?.illustrationKey ||
    existingPreset?.illustrationKey ||
    inferIllustrationCategory(hanzi, meaning);

  const pinyinSyllables = pinyin.split(/\s+/);
  const characters = charList.map((ch, idx) =>
    getStrokeDataForChar(ch, pinyinSyllables[idx] || pinyin)
  );

  return {
    id: `slide-custom-${nextIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    index: nextIndex,
    hanzi,
    pinyin,
    hanViet,
    meaning,
    partOfSpeech: dictEntry?.partOfSpeech || existingPreset?.partOfSpeech || 'TỪ VỰNG HSK',
    hskLevel: dictEntry?.hskLevel || existingPreset?.hskLevel || 'HSK 3–4',
    usageNote:
      dictEntry?.usageNote ||
      existingPreset?.usageNote ||
      `Từ vựng “${hanzi}” (${pinyin} — Hán Việt: ${hanViet}): ${meaning}.`,
    exampleHanzi,
    examplePinyin:
      dictEntry?.examplePinyin ||
      existingPreset?.examplePinyin ||
      synthExample.examplePinyin,
    exampleMeaning:
      dictEntry?.exampleMeaning ||
      existingPreset?.exampleMeaning ||
      synthExample.exampleMeaning,
    illustrationKey,
    learned: false,
    characters: characters.length > 0 ? characters : [STROKE_LIBRARY['龙']],
  };
}

/**
 * Automatically upgrades any cached VocabSlide (e.g., from localStorage) that had
 * mechanical character-by-character meanings (" · ") or robotic example sentences ("我们今天一起学习...").
 */
export function repairAndUpgradeSlide(slide: VocabSlide): VocabSlide {
  if (!slide || !slide.hanzi) return slide;
  const cleanHanzi = slide.hanzi.trim();
  const dictEntry = SMART_HANZI_DICTIONARY[cleanHanzi];
  const presetEntry = INITIAL_VOCAB_SLIDES.find((s) => s.hanzi === cleanHanzi);

  const hasMechanicalMeaning =
    slide.meaning.includes(' · ') || slide.meaning.startsWith('Từ vựng tiếng Trung:');
  const hasMechanicalExample =
    slide.exampleHanzi.includes('我们今天一起学习') ||
    slide.exampleHanzi.includes('我们 今天 一起 学习');

  if (!dictEntry && !presetEntry && !hasMechanicalMeaning && !hasMechanicalExample) {
    return slide;
  }

  const repairedMeaning =
    hasMechanicalMeaning || dictEntry
      ? dictEntry?.meaning || presetEntry?.meaning || synthesizeHolisticMeaning(cleanHanzi, slide.hanViet)
      : slide.meaning;

  const synthEx = synthesizeContextualExample(cleanHanzi, slide.pinyin, repairedMeaning);

  return {
    ...slide,
    pinyin: dictEntry?.pinyin || presetEntry?.pinyin || slide.pinyin,
    hanViet: dictEntry?.hanViet || presetEntry?.hanViet || slide.hanViet,
    meaning: repairedMeaning,
    partOfSpeech: dictEntry?.partOfSpeech || presetEntry?.partOfSpeech || slide.partOfSpeech,
    hskLevel: dictEntry?.hskLevel || presetEntry?.hskLevel || slide.hskLevel,
    usageNote: dictEntry?.usageNote || presetEntry?.usageNote || slide.usageNote,
    exampleHanzi:
      hasMechanicalExample || dictEntry
        ? dictEntry?.exampleHanzi || presetEntry?.exampleHanzi || synthEx.exampleHanzi
        : slide.exampleHanzi,
    examplePinyin:
      hasMechanicalExample || dictEntry
        ? dictEntry?.examplePinyin || presetEntry?.examplePinyin || synthEx.examplePinyin
        : slide.examplePinyin,
    exampleMeaning:
      hasMechanicalExample || dictEntry
        ? dictEntry?.exampleMeaning || presetEntry?.exampleMeaning || synthEx.exampleMeaning
        : slide.exampleMeaning,
    characters:
      presetEntry && presetEntry.characters.length > 0
        ? presetEntry.characters
        : slide.characters.map((c, idx) =>
            getStrokeDataForChar(c.char, (dictEntry?.pinyin || slide.pinyin).split(/\s+/)[idx] || c.pinyin)
          ),
  };
}

export function parseBatchSlideInput(
  rawText: string,
  startingIndex: number
): VocabSlide[] {
  const lines = rawText
    .split(/\r?\n|;|,|，|、/)
    .map((l) => l.trim())
    .filter(Boolean);
  const results: VocabSlide[] = [];
  lines.forEach((line, idx) => {
    const parsed = parseQuickSlideInput(line, startingIndex + idx);
    if (parsed) {
      results.push(parsed);
    }
  });
  return results;
}

export function autoGradeClassSession(session: ClassSession): ClassSession {
  const baseScore = 8.6 + ((session.sessionNumber * 3) % 12) * 0.1;
  const roundedScore = Math.round(baseScore * 10) / 10;
  return {
    ...session,
    homeworkAssigned: true,
    submissionsCount: session.totalStudents,
    autoGraded: true,
    averageScore: roundedScore,
  };
}

export function updateLeaderboardWithScore(
  entries: LeaderboardEntry[],
  studentName: string,
  pointsToAdd: number
): LeaderboardEntry[] {
  const cleanName = studentName.trim() || 'Lưu Thị Minh Thư';
  let found = false;
  const updated = entries.map((entry) => {
    if (entry.studentName.toLowerCase() === cleanName.toLowerCase()) {
      found = true;
      return {
        ...entry,
        score: entry.score + pointsToAdd,
        streak: entry.streak + (pointsToAdd > 0 ? 1 : 0),
      };
    }
    return entry;
  });

  if (!found) {
    const initials = cleanName
      .split(/\s+/)
      .slice(-2)
      .map((w) => w[0]?.toUpperCase() || 'H')
      .join('');
    updated.push({
      id: `lb-${Date.now()}`,
      studentName: cleanName,
      avatarCode: initials || 'HV',
      score: Math.max(1, pointsToAdd),
      streak: 1,
      timeSeconds: 10,
    });
  }

  return updated.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.timeSeconds - b.timeSeconds;
  });
}

export type BinBinActionType =
  | 'mnemonic'
  | 'distinguish'
  | 'grammar-fix'
  | 'quiz-gen'
  | 'quiz-hint'
  | 'dialogue'
  | 'chat';

export interface BinBinWordCardInfo {
  hanzi: string;
  pinyin: string;
  hanViet: string;
  meaning: string;
  partOfSpeech: string;
  hskLevel: string;
  radicalMnemonic: string;
  compoundWords: { hanzi: string; pinyin: string; meaning: string }[];
}

export interface BinBinExampleItem {
  hanzi: string;
  pinyin: string;
  meaning: string;
}

export interface BinBinSynonymComparison {
  title: string;
  summary: string;
  items: {
    word: string;
    pinyin: string;
    nuance: string;
    example: string;
  }[];
}

export interface BinBinSentenceCorrection {
  originalInput: string;
  isAlreadyCorrect: boolean;
  correctedHanzi: string;
  correctedPinyin: string;
  vietnameseTranslation: string;
  explanation: string;
}

export interface BinBinTeacherExercise {
  title: string;
  type: 'fill-blank' | 'dialogue' | 'quiz';
  items: {
    question: string;
    pinyin?: string;
    answer: string;
    explanation: string;
  }[];
}

export interface BinBinSlidePayload {
  hanzi: string;
  pinyin: string;
  hanViet: string;
  meaning: string;
  partOfSpeech: string;
  hskLevel: string;
  usageNote: string;
  exampleHanzi: string;
  examplePinyin: string;
  exampleMeaning: string;
}

export interface BinBinReply {
  replyText: string;
  chinesePhrase: string;
  pinyinPhrase: string;
  vietnamesePhrase: string;
  wordCard?: BinBinWordCardInfo;
  essenceAndContext?: string;
  collocations?: { hanzi: string; pinyin: string; meaning: string }[];
  synonymDistinction?: BinBinSynonymComparison;
  examples?: BinBinExampleItem[];
  sentenceCorrection?: BinBinSentenceCorrection;
  teacherExercise?: BinBinTeacherExercise;
  slidePayload?: BinBinSlidePayload;
}

const HANZI_MNEMONIC_STORIES: Record<string, string> = {
  交通: 'Chiết tự bộ thủ “交通” (jiāo tōng - giao thông): Chữ 交 (jiāo - giao, 6 nét, bộ 亠 Đầu) vẽ hai nét phẩy mác đan chéo nhau biểu thị sự giao cắt, kết nối; chữ 通 (tōng - thông, 10 nét, bộ 辶 Sước - bước chân đi trên đường) chỉ sự đi lại thông suốt. Ghép lại “交通” là mạng lưới giao thông đi lại thông suốt.',
  温暖: 'Chiết tự bộ thủ “温暖” (wēn nuǎn - ôn noãn - ấm áp): Chữ 温 (12 nét) gồm bộ Thủy (氵- dòng nước) bên trái, chữ Nhật (日 - mặt trời) ở trên và bộ Mẫn (皿 - cái bát) ở dưới — mặt trời chiếu làm ấm bát nước. Chữ 暖 (13 nét) gồm bộ Nhật (日 - ánh nắng) bên trái kết hợp bàn tay tình bạn (爰/友) bên phải — ánh nắng và bàn tay sẻ chia mang lại sự ấm áp.',
  初中: 'Chiết tự bộ thủ “初中” (chū zhōng - sơ trung - trung học cơ sở / cấp 2): Chữ 初 (chū - ban đầu, 7 nét) gồm bộ Y (衤- quần áo) và bộ Đao (刀 - cây kéo) — cắt vải là bước đầu tiên khi may áo, nên 初 nghĩa là sơ cấp/đầu tiên; chữ 中 (zhōng - ở giữa, trung học, 4 nét). “初中” (初级中学) là bậc Trung học cơ sở (lớp 6–9).',
  龙: 'Chiết tự chữ “龙” (lóng - long - con rồng, 5 nét): Nét ngang và nét phẩy đầu tiên như chiếc sừng rồng uy nghi, nét sổ cong móc (乚) uốn lượn như thân Thanh Long bay lên mây, và nét chấm (丶) cuối cùng là viên Minh Châu tỏa sáng.',
  咱们: 'Chiết tự “咱们” (zán men - chúng ta, chúng mình): Chữ 咱 gồm bộ Khẩu (口 - cái miệng) ghép với chữ Tự (自 - bản thân mình), biểu thị lời nói gộp cả người nói lẫn người đang nghe vào chung một phía thân mật.',
  老师: 'Chiết tự “老师” (lǎo shī - lão sư - thầy cô giáo): Chữ 老 (6 nét) khắc họa bậc trưởng bối truyền dạy kinh nghiệm; chữ 师 (6 nét) chỉ người thầy mẫu mực.',
  幸福: 'Chiết tự “幸福” (xìng fú - hạnh phúc): Chữ 幸 (8 nét) gồm bộ Thổ (土) trên bộ Yên, chỉ điều may mắn bình an; chữ 福 (13 nét) bên trái là bộ Thị (礻- lễ nghi ban phước), bên phải là Một (一) Miệng (口) Ruộng (田) — có mái nhà và ruộng vườn ấm no là Hạnh Phúc.',
  聪明: 'Chiết tự “聪明” (cōng míng - thông minh): Chữ 聪 hội tụ bộ Nhĩ (耳 - tai biết lắng nghe), bộ Khẩu (口 - miệng hỏi han) và bộ Tâm (心 - trái tim suy ngẫm); chữ 明 ghép từ Nhật (日 - mặt trời) và Nguyệt (月 - mặt trăng) tỏa sáng.',
  花园: 'Chiết tự “花园” (huā yuán - hoa viên - vườn hoa): Chữ 花 có bộ Thảo đầu (艹 - cỏ cây) ở trên; chữ 园 có bộ Vi (囗 - tường bao quanh khu vườn) bảo vệ cây hoa bên trong.',
  空调: 'Chiết tự “空调” (kōng tiáo - điều hòa không khí): Chữ 空 (không khí, không gian) có bộ Huyệt (穴); chữ 调 (điều chỉnh) có bộ Ngôn (讠) và chữ Chu (周 - chu toàn) — điều chỉnh nhiệt độ không khí trong phòng.',
  洗衣机: 'Chiết tự “洗衣机” (xǐ yī jī - máy giặt): 洗 (tẩy - giặt rửa, có bộ Thủy 氵) + 衣 (y - quần áo) + 机 (cơ - cỗ máy, có bộ Mộc 木). Ghép trực diện: cỗ máy giặt quần áo.',
  挺: 'Chiết tự “挺” (tǐng - đĩnh - khá, rất): Bên trái là bộ Thủ gảy (扌- bàn tay nâng đỡ), bên phải là chữ Đình (廷 - đứng thẳng vững vàng). Trong khẩu ngữ dùng cấu trúc “挺 + Tính từ + 的” (khá là...).',
  刻: 'Chiết tự “刻” (kè - khắc - 15 phút / chạm khắc): Bên trái là chữ Hợi (亥), bên phải là bộ Đao đứng (刂 - con dao khắc vạch đồng hồ cổ). Một khắc tương ứng đúng 15 phút.',
  愿意: 'Chiết tự “愿意” (yuàn yì - nguyện ý - bằng lòng, sẵn lòng): Cả hai chữ 愿 (nguyên + tâm) và 意 (âm + tâm) đều có bộ Tâm (心 - trái tim) ở đáy chữ, biểu thị sự tự nguyện xuất phát từ tấm lòng.',
  咖啡: 'Chiết tự “咖啡” (kā fēi - cà phê): Cả hai chữ 咖 và 啡 đều có bộ Khẩu (口 - cái miệng) bên trái vì là thức uống thưởng thức bằng miệng, phần bên phải (加 kā và 非 fēi) biểu âm.',
  狗: 'Chiết tự chữ “狗” (gǒu - cẩu - chú chó, 8 nét): Bên trái là bộ Khuyển (犭- động vật họ chó), bên phải là chữ Câu (句 - cái móc cong / gợi âm).',
  换: 'Chiết tự chữ “换” (huàn - hoán - đổi, thay, 10 nét): Bên trái là bộ Thủ gảy (扌- bàn tay) vì trao đổi đồ vật, đổi tiền hay thay áo đều dùng tay thực hiện.',
  努力: 'Chiết tự “努力” (nǔ lì - nỗ lực): Chữ 努 có bộ Nữ (女), bộ Hựu (又 - bàn tay) và bộ Lực (力) ở dưới; chữ 力 (lực - sức mạnh) vẽ hình bắp tay gồng sức vượt khó.',
  坚持: 'Chiết tự “坚持” (jiān chí - kiên trì): Chữ 坚 (kiên - vững chắc) có bộ Thổ (土 - nền đất rắn chắc) ở đáy; chữ 持 (trì - nắm giữ) có bộ Thủ (扌- bàn tay giữ chặt mục tiêu không buông).',
  包容: 'Chiết tự “包容” (bāo róng - bao dung): Chữ 包 (bao bọc) ôm trọn bên ngoài; chữ 容 (dung chứa) có bộ Miên (宀 - mái nhà) và chữ Cốc (谷 - thung lũng rộng lớn) — tấm lòng rộng mở như thung lũng.',
  融会贯通: 'Chiết tự thành ngữ HSK 7–9 “融会贯通” (róng huì guàn tōng - dung hội quán thông): 融 (tan chảy hòa quyện) + 会 (hội tụ) + 贯 (xâu chuỗi tiền cổ) + 通 (thông suốt) — kết nối toàn bộ kiến thức để hiểu thấu đáo và vận dụng linh hoạt.',
  明天: 'Chiết tự “明天” (míng tiān - minh thiên - ngày mai): Chữ 明 ghép từ Nhật (日 - mặt trời) và Nguyệt (月 - mặt trăng) — sau một ngày và một đêm trôi qua thì mặt trời ngày mới mọc lên chính là Ngày Mai (明天).',
  照顾: 'Chiết tự “照顾” (zhào gù - chiếu cố - chăm sóc): Chữ 照 (chiếu sáng, có bộ Hỏa 灬 sưởi ấm) kết hợp chữ 顾 (ngoái đầu nhìn lại, bộ Hiệt 页) — luôn dõi theo và chăm sóc ân cần.',
  考试: 'Chiết tự “考试” (kǎo shì - khảo thí - kỳ thi): Chữ 考 (khảo nghiệm, 6 nét) kết hợp chữ 试 (thử thách, có bộ Ngôn 讠 - hỏi đáp kiểm tra năng lực).',
  旅行: 'Chiết tự “旅行” (lǚ xíng - lữ hành - du lịch): Chữ 旅 (đoàn người đi dưới ngọn cờ Phương 方) + chữ 行 (bộ Hành 彳亍 - bước chân đi trên giao lộ).',
};

/**
 * 100% Authentic Native Chinese Collocations (Cấu trúc kết hợp từ thực tế).
 * NEVER uses mechanical "学习X" or "常用X".
 */
const WORD_COLLOCATIONS_MAP: Record<
  string,
  { hanzi: string; pinyin: string; meaning: string }[]
> = {
  初中: [
    { hanzi: '上初中', pinyin: 'shàng chūzhōng', meaning: 'đi học cấp 2 (THCS)' },
    { hanzi: '初中生', pinyin: 'chūzhōngshēng', meaning: 'học sinh cấp 2' },
    { hanzi: '初中毕业', pinyin: 'chūzhōng bìyè', meaning: 'tốt nghiệp cấp 2' },
  ],
  交通: [
    { hanzi: '公共交通', pinyin: 'gōnggòng jiāotōng', meaning: 'giao thông công cộng' },
    { hanzi: '交通工具', pinyin: 'jiāotōng gōngjù', meaning: 'phương tiện giao thông' },
    { hanzi: '交通安全', pinyin: 'jiāotōng ānquán', meaning: 'an toàn giao thông' },
  ],
  交: [
    { hanzi: '交通', pinyin: 'jiāotōng', meaning: 'giao thông, đi lại' },
    { hanzi: '交朋友', pinyin: 'jiāo péngyou', meaning: 'kết bạn mới' },
    { hanzi: '交流经验', pinyin: 'jiāoliú jīngyàn', meaning: 'trao đổi kinh nghiệm' },
  ],
  通: [
    { hanzi: '交通', pinyin: 'jiāotōng', meaning: 'giao thông' },
    { hanzi: '通知', pinyin: 'tōngzhī', meaning: 'thông báo' },
    { hanzi: '通过考试', pinyin: 'tōngguò kǎoshì', meaning: 'vượt qua kỳ thi' },
  ],
  温暖: [
    { hanzi: '温暖如春', pinyin: 'wēnnuǎn rú chūn', meaning: 'ấm áp như mùa xuân' },
    { hanzi: '感到温暖', pinyin: 'gǎndào wēnnuǎn', meaning: 'cảm thấy ấm lòng' },
    { hanzi: '温暖的家庭', pinyin: 'wēnnuǎn de jiātíng', meaning: 'gia đình đầm ấm' },
  ],
  咱们: [
    { hanzi: '咱们班', pinyin: 'zánmen bān', meaning: 'lớp chúng mình' },
    { hanzi: '咱们一起', pinyin: 'zánmen yīqǐ', meaning: 'chúng ta cùng nhau' },
    { hanzi: '咱们俩', pinyin: 'zánmen liǎ', meaning: 'hai đứa mình' },
  ],
  换: [
    { hanzi: '换钱', pinyin: 'huàn qián', meaning: 'đổi tiền, đổi ngoại tệ' },
    { hanzi: '换衣服', pinyin: 'huàn yīfu', meaning: 'thay quần áo' },
    { hanzi: '换乘地铁', pinyin: 'huànchéng dìtiě', meaning: 'đổi tuyến tàu điện ngầm' },
  ],
  空调: [
    { hanzi: '开空调', pinyin: 'kāi kōngtiáo', meaning: 'bật máy điều hòa' },
    { hanzi: '空调房', pinyin: 'kōngtiáo fáng', meaning: 'phòng có điều hòa' },
    { hanzi: '关空调', pinyin: 'guān kōngtiáo', meaning: 'tắt điều hòa' },
  ],
  洗衣机: [
    { hanzi: '一台洗衣机', pinyin: 'yī tái xǐyījī', meaning: 'một chiếc máy giặt' },
    { hanzi: '用洗衣机洗', pinyin: 'yòng xǐyījī xǐ', meaning: 'giặt bằng máy giặt' },
    { hanzi: '全自动洗衣机', pinyin: 'quánzìdòng xǐyījī', meaning: 'máy giặt tự động' },
  ],
  花园: [
    { hanzi: '大花园', pinyin: 'dà huāyuán', meaning: 'khu vườn hoa lớn' },
    { hanzi: '逛花园', pinyin: 'guàng huāyuán', meaning: 'dạo chơi vườn hoa' },
    { hanzi: '漂亮的花园', pinyin: 'piàoliang de huāyuán', meaning: 'vườn hoa xinh đẹp' },
  ],
  挺: [
    { hanzi: '挺好的', pinyin: 'tǐng hǎo de', meaning: 'khá tốt đấy' },
    { hanzi: '挺漂亮', pinyin: 'tǐng piàoliang', meaning: 'khá là đẹp' },
    { hanzi: '挺喜欢', pinyin: 'tǐng xǐhuan', meaning: 'khá thích' },
  ],
  刻: [
    { hanzi: '八点一刻', pinyin: 'bā diǎn yī kè', meaning: '8 giờ 15 phút' },
    { hanzi: '差一刻九点', pinyin: 'chà yī kè jiǔ diǎn', meaning: '9 giờ kém 15 phút' },
    { hanzi: '印象深刻', pinyin: 'yìnxiàng shēnkè', meaning: 'ấn tượng sâu sắc' },
  ],
  愿意: [
    { hanzi: '很愿意', pinyin: 'hěn yuànyì', meaning: 'rất sẵn lòng' },
    { hanzi: '愿意帮助', pinyin: 'yuànyì bāngzhù', meaning: 'bằng lòng giúp đỡ' },
    { hanzi: '不愿意', pinyin: 'bù yuànyì', meaning: 'không tự nguyện / không chịu' },
  ],
  龙: [
    { hanzi: '巨龙', pinyin: 'jù lóng', meaning: 'rồng lớn uy nghi' },
    { hanzi: '龙舟', pinyin: 'lóng zhōu', meaning: 'thuyền rồng' },
    { hanzi: '龙马精神', pinyin: 'lóngmǎ jīngshén', meaning: 'tinh thần long mã dồi dào' },
  ],
  狗: [
    { hanzi: '小狗', pinyin: 'xiǎo gǒu', meaning: 'chú cún con' },
    { hanzi: '宠物狗', pinyin: 'chǒngwù gǒu', meaning: 'chó cưng' },
    { hanzi: '一只小狗', pinyin: 'yī zhī xiǎogǒu', meaning: 'một chú chó nhỏ' },
  ],
  咖啡: [
    { hanzi: '咖啡馆', pinyin: 'kāfēi guǎn', meaning: 'quán cà phê' },
    { hanzi: '冰咖啡', pinyin: 'bīng kāfēi', meaning: 'cà phê đá' },
    { hanzi: '一杯热咖啡', pinyin: 'yī bēi rè kāfēi', meaning: 'một tách cà phê nóng' },
  ],
  努力: [
    { hanzi: '努力学习', pinyin: 'nǔlì xuéxí', meaning: 'chăm chỉ học tập' },
    { hanzi: '努力工作', pinyin: 'nǔlì gōngzuò', meaning: 'nỗ lực làm việc' },
    { hanzi: '继续努力', pinyin: 'jìxù nǔlì', meaning: 'tiếp tục cố gắng' },
  ],
  坚持: [
    { hanzi: '坚持下去', pinyin: 'jiānchí xiàqù', meaning: 'kiên trì đến cùng' },
    { hanzi: '坚持锻炼', pinyin: 'jiānchí duànliàn', meaning: 'kiên trì rèn luyện' },
    { hanzi: '坚持不懈', pinyin: 'jiānchí bùxiè', meaning: 'bền bỉ không ngừng nghỉ' },
  ],
  包容: [
    { hanzi: '互相包容', pinyin: 'hùxiāng bāoróng', meaning: 'bao dung lẫn nhau' },
    { hanzi: '理解与包容', pinyin: 'lǐjiě yǔ bāoróng', meaning: 'thấu hiểu và bao dung' },
    { hanzi: '学会包容', pinyin: 'xuéhuì bāoróng', meaning: 'học cách bao dung' },
  ],
  融会贯通: [
    { hanzi: '把知识融会贯通', pinyin: 'bǎ zhīshi rónghuì-guàntōng', meaning: 'nắm thấu đáo kiến thức' },
    { hanzi: '词汇与语法融会贯通', pinyin: 'cíhuì yǔ yǔfǎ rónghuì-guàntōng', meaning: 'kết nối nhuần nhuyễn từ vựng & ngữ pháp' },
    { hanzi: '举一反三、融会贯通', pinyin: 'jǔyī-fǎnsān, rónghuì-guàntōng', meaning: 'hiểu sâu và vận dụng linh hoạt' },
  ],
  明天: [
    { hanzi: '明天早上', pinyin: 'míngtiān zǎoshang', meaning: 'sáng ngày mai' },
    { hanzi: '明天见', pinyin: 'míngtiān jiàn', meaning: 'hẹn gặp ngày mai' },
    { hanzi: '明天的考试', pinyin: 'míngtiān de kǎoshì', meaning: 'kỳ thi ngày mai' },
  ],
  照顾: [
    { hanzi: '照顾家人', pinyin: 'zhàogù jiārén', meaning: 'chăm sóc gia đình' },
    { hanzi: '照顾好自己', pinyin: 'zhàogù hǎo zìjǐ', meaning: 'tự chăm sóc tốt bản thân' },
    { hanzi: '细心地照顾', pinyin: 'xìxīn de zhàogù', meaning: 'chăm sóc chu đáo, ân cần' },
  ],
  考试: [
    { hanzi: '参加考试', pinyin: 'cānjiā kǎoshì', meaning: 'tham gia kỳ thi' },
    { hanzi: '准备考试', pinyin: 'zhǔnbèi kǎoshì', meaning: 'ôn tập chuẩn bị thi' },
    { hanzi: '期末考试', pinyin: 'qīmò kǎoshì', meaning: 'kỳ thi cuối học kỳ' },
  ],
  旅行: [
    { hanzi: '去中国旅行', pinyin: 'qù Zhōngguó lǚxíng', meaning: 'đi du lịch Trung Quốc' },
    { hanzi: '毕业旅行', pinyin: 'bìyè lǚxíng', meaning: 'chuyến du lịch tốt nghiệp' },
    { hanzi: '旅行计划', pinyin: 'lǚxíng jìhuà', meaning: 'kế hoạch chuyến đi' },
  ],
  老师: [
    { hanzi: '汉语老师', pinyin: 'Hànyǔ lǎoshī', meaning: 'giáo viên tiếng Trung' },
    { hanzi: '王老师', pinyin: 'Wáng lǎoshī', meaning: 'thầy/cô Vương' },
    { hanzi: '请教老师', pinyin: 'qǐngjiào lǎoshī', meaning: 'xin thầy cô chỉ dẫn' },
  ],
  幸福: [
    { hanzi: '幸福家庭', pinyin: 'xìngfú jiātíng', meaning: 'gia đình hạnh phúc' },
    { hanzi: '幸福感', pinyin: 'xìngfú gǎn', meaning: 'cảm giác hạnh phúc' },
    { hanzi: '生活幸福', pinyin: 'shēnghuó xìngfú', meaning: 'cuộc sống hạnh phúc' },
  ],
  聪明: [
    { hanzi: '聪明伶俐', pinyin: 'cōngmíng línglì', meaning: 'thông minh lanh lợi' },
    { hanzi: '聪明人', pinyin: 'cōngmíng rén', meaning: 'người thông minh' },
    { hanzi: '既聪明又努力', pinyin: 'jì cōngmíng yòu nǔlì', meaning: 'vừa thông minh vừa chăm chỉ' },
  ],
};

/**
 * Curated Synonym & Confusable Words Distinction Database (Phân biệt từ dễ nhầm)
 */
const SYNONYM_DISTINCTION_MAP: Record<string, BinBinSynonymComparison> = {
  初中: {
    title: 'Phân biệt 初中 (chūzhōng) vs 高中 (gāozhōng) & 小学 (xiǎoxué)',
    summary: 'Hệ thống phổ thông Trung Quốc chia Trung học (中学) thành 2 bậc rõ rệt: 初中 (Cấp 2) và 高中 (Cấp 3).',
    items: [
      {
        word: '初中',
        pinyin: 'chūzhōng',
        nuance: 'Trung học cơ sở (Cấp 2, từ lớp 7–9 tại TQ / lớp 6–9 tại VN). Dùng với động từ 上/读/念: 上初中.',
        example: '我弟弟今年十三岁，刚上初中。(Em trai tôi 13 tuổi, vừa vào cấp 2.)',
      },
      {
        word: '高中',
        pinyin: 'gāozhōng',
        nuance: 'Trung học phổ thông (Cấp 3, lớp 10–12), giai đoạn ôn thi Đại học (高考).',
        example: '初中毕业以后，她考上了重点高中。(Sau khi tốt nghiệp cấp 2, cô ấy đỗ trường cấp 3 trọng điểm.)',
      },
    ],
  },
  温暖: {
    title: 'Phân biệt 温暖 (wēnnuǎn) vs 暖和 (nuǎnhuo)',
    summary: 'Cả hai đều dịch là “ấm áp”, nhưng khác nhau về phạm vi nghĩa trừu tượng và văn phong:',
    items: [
      {
        word: '温暖',
        pinyin: 'wēnnuǎn',
        nuance: 'Dùng cho cả thời tiết ấm áp LẪN nghĩa bóng (tình cảm, trái tim, gia đình ấm lòng). Mang sắc thái trang trọng/văn viết hơn.',
        example: '老师的话让我感到非常温暖。(Lời của thầy khiến tôi thấy rất ấm lòng.)',
      },
      {
        word: '暖和',
        pinyin: 'nuǎnhuo',
        nuance: 'Thiên về khẩu ngữ, CHỈ dùng cho nhiệt độ thời tiết, phòng ốc hoặc quần áo ấm, không dùng cho tình cảm.',
        example: '屋子里开了空调，真暖和！(Trong phòng bật điều hòa, ấm thật đấy!)',
      },
    ],
  },
  咱们: {
    title: 'Phân biệt 咱们 (zánmen) vs 我们 (wǒmen)',
    summary: 'Điểm khác biệt cốt lõi nằm ở việc có bao gồm người đang nghe hay không:',
    items: [
      {
        word: '咱们',
        pinyin: 'zánmen',
        nuance: 'Bao gồm CẢ người nói và người nghe (“chúng mình”), tạo cảm giác gần gũi, thường dùng trong câu rủ rê (...吧).',
        example: '咱们一起去喝咖啡吧！(Chúng mình cùng đi uống cà phê nhé!)',
      },
      {
        word: '我们',
        pinyin: 'wǒmen',
        nuance: 'Có thể bao gồm hoặc KHÔNG bao gồm người nghe (“chúng tôi”), dùng trong cả văn viết trang trọng lẫn khẩu ngữ.',
        example: '老师，我们是越南留学生。(Thưa thầy, chúng em là lưu học sinh Việt Nam.)',
      },
    ],
  },
  坚持: {
    title: 'Phân biệt 坚持 (jiānchí) vs 保持 (bǎochí)',
    summary: 'Cả hai đều có chữ 持 (giữ), nhưng khác nhau về ý chí vượt khó và việc duy trì trạng thái:',
    items: [
      {
        word: '坚持',
        pinyin: 'jiānchí',
        nuance: 'Kiên trì, bền bỉ giữ vững hành động/nguyên tắc bất chấp khó khăn. Đi với động từ: 坚持学习, 坚持到底.',
        example: '学汉语一定要每天坚持练习。(Học tiếng Trung nhất định phải kiên trì luyện tập mỗi ngày.)',
      },
      {
        word: '保持',
        pinyin: 'bǎochí',
        nuance: 'Duy trì, giữ nguyên một trạng thái hoặc mức độ không đổi (保持安静, 保持联系, 保持健康).',
        example: '请大家在图书馆里保持安静。(Xin mọi người giữ trật tự trong thư viện.)',
      },
    ],
  },
  照顾: {
    title: 'Phân biệt 照顾 (zhàogù) vs 关心 (guānxīn)',
    summary: 'Phân biệt giữa chăm sóc bằng hành động thực tế và quan tâm về mặt tinh thần:',
    items: [
      {
        word: '照顾',
        pinyin: 'zhàogù',
        nuance: 'Chăm sóc cụ thể bằng hành động (ăn uống, nghỉ ngơi, trông nom người già/trẻ nhỏ/bản thân).',
        example: '出门在外，你要照顾好自己。(Ra ngoài xa nhà, bạn phải tự chăm sóc tốt bản thân.)',
      },
      {
        word: '关心',
        pinyin: 'guānxīn',
        nuance: 'Quan tâm, hỏi han, lo lắng bằng tình cảm và tấm lòng.',
        example: '谢谢大家一直以来对我的关心。(Cảm ơn sự quan tâm của mọi người dành cho tôi suốt thời gian qua.)',
      },
    ],
  },
  考试: {
    title: 'Phân biệt 考试 (kǎoshì) vs 测验 (cèyàn)',
    summary: 'Khác nhau về quy mô và tính chất bài kiểm tra:',
    items: [
      {
        word: '考试',
        pinyin: 'kǎoshì',
        nuance: 'Kỳ thi chính thức (thi học kỳ, thi HSK, thi đại học). Vừa là danh từ vừa là động từ li hợp (考一次试).',
        example: '明天上午有一场重要的汉语考试。(Sáng mai có một kỳ thi tiếng Trung quan trọng.)',
      },
      {
        word: '测验',
        pinyin: 'cèyàn',
        nuance: 'Bài kiểm tra nhỏ trên lớp (15 phút, kiểm tra từ vựng nhanh).',
        example: '今天上课老师做了一个生词小测验。(Hôm nay trên lớp thầy cho làm một bài kiểm tra nhỏ từ mới.)',
      },
    ],
  },
  换: {
    title: 'Phân biệt 换 (huàn) vs 改变 (gǎibiàn)',
    summary: 'Phân biệt giữa “đổi vật thể cụ thể” và “thay đổi tính chất trừu tượng”:',
    items: [
      {
        word: '换',
        pinyin: 'huàn',
        nuance: 'Đổi cái này lấy cái khác cụ thể (đổi tiền 换钱, thay đồ 换衣服, đổi xe 换车, đổi số điện thoại).',
        example: '我去银行换五百块人民币。(Tôi ra ngân hàng đổi 500 Nhân dân tệ.)',
      },
      {
        word: '改变',
        pinyin: 'gǎibiàn',
        nuance: 'Thay đổi kế hoạch, thái độ, thói quen, cuộc sống (改变计划, 改变想法).',
        example: '这件事完全改变了他的想法。(Chuyện này đã hoàn toàn thay đổi suy nghĩ của anh ấy.)',
      },
    ],
  },
  挺: {
    title: 'Phân biệt 挺...的 (tǐng... de) vs 很 / 非常 (hěn / fēicháng)',
    summary: 'Khác nhau về sắc thái khẩu ngữ và cấu trúc đi kèm chữ “的” ở cuối:',
    items: [
      {
        word: '挺',
        pinyin: 'tǐng',
        nuance: 'Khá là, rất (sắc thái khẩu ngữ nhẹ nhàng, thân mật). Thường dùng trong khung cấu trúc “挺 + Adj/V tâm lý + 的”.',
        example: '今天天气挺好的，咱们去散步吧。(Hôm nay thời tiết khá đẹp đấy, chúng mình đi dạo nhé.)',
      },
      {
        word: '非常',
        pinyin: 'fēicháng',
        nuance: 'Vô cùng, cực kỳ (mức độ cao hơn 挺, dùng cả văn nói và văn viết, không cần 的 ở cuối).',
        example: '这个城市的公共交通非常方便。(Giao thông công cộng của thành phố này vô cùng thuận tiện.)',
      },
    ],
  },
  愿意: {
    title: 'Phân biệt 愿意 (yuànyì) vs 想 (xiǎng)',
    summary: 'Đều là động từ năng nguyện đứng trước động từ chính nhưng khác về sắc thái “tự nguyện”:',
    items: [
      {
        word: '愿意',
        pinyin: 'yuànyì',
        nuance: 'Bằng lòng, sẵn lòng, tự nguyện chấp nhận làm việc gì (thường dùng khi giúp đỡ hoặc đồng ý lời đề nghị).',
        example: '只要你需要，我很愿意帮助你。(Chỉ cần bạn cần, mình rất sẵn lòng giúp đỡ bạn.)',
      },
      {
        word: '想',
        pinyin: 'xiǎng',
        nuance: 'Mong muốn, dự định cá nhân (muốn ăn gì, muốn đi đâu).',
        example: '周末我想去书店买几本汉语书。(Cuối tuần tôi muốn đi hiệu sách mua vài cuốn sách tiếng Trung.)',
      },
    ],
  },
  努力: {
    title: 'Phân biệt 努力 (nǔlì) vs 认真 (rènzhēn)',
    summary: 'Hai phẩm chất học tập thường điคู่ nhau nhưng khác trọng tâm:',
    items: [
      {
        word: '努力',
        pinyin: 'nǔlì',
        nuance: 'Nỗ lực, bỏ nhiều công sức và năng lượng để đạt mục tiêu (chăm chỉ phấn đấu).',
        example: '为了考过HSK四级，他每天都很努力。(Để thi đỗ HSK 4, mỗi ngày anh ấy đều rất nỗ lực.)',
      },
      {
        word: '认真',
        pinyin: 'rènzhēn',
        nuance: 'Nghiêm túc, cẩn thận, tập trung cao độ không qua loa (认真听讲, 认真写汉字).',
        example: '上课的时候要认真听老师讲课。(Khi lên lớp cần nghiêm túc nghe thầy giảng bài.)',
      },
    ],
  },
  包容: {
    title: 'Phân biệt 包容 (bāoróng) vs 原谅 (yuánliàng)',
    summary: 'Phân biệt giữa lòng bao dung rộng lượng và sự tha thứ cho một lỗi cụ thể:',
    items: [
      {
        word: '包容',
        pinyin: 'bāoróng',
        nuance: 'Bao dung, chấp nhận sự khác biệt về tính cách/quan điểm của người khác bằng tấm lòng rộng mở.',
        example: '好朋友之间要学会互相理解与包容。(Bạn tốt với nhau cần học cách thấu hiểu và bao dung lẫn nhau.)',
      },
      {
        word: '原谅',
        pinyin: 'yuánliàng',
        nuance: 'Tha thứ, bỏ qua khi ai đó mắc lỗi và xin lỗi.',
        example: '他已经道歉了，你就原谅他吧。(Anh ấy đã xin lỗi rồi, bạn hãy tha thứ cho anh ấy nhé.)',
      },
    ],
  },
  旅行: {
    title: 'Phân biệt 旅行 (lǚxíng) vs 旅游 (lǚyóu)',
    summary: 'Hai từ đều dịch là “du lịch” nhưng khác nhau về trọng tâm trải nghiệm:',
    items: [
      {
        word: '旅行',
        pinyin: 'lǚxíng',
        nuance: 'Chuyến hành trình đi xa (nhấn mạnh quá trình đi lại, khám phá, trải nghiệm vùng đất mới).',
        example: '今年暑假我们打算去北京旅行。(Nghỉ hè năm nay chúng tôi dự định đi du lịch Bắc Kinh.)',
      },
      {
        word: '旅游',
        pinyin: 'lǚyóu',
        nuance: 'Du lịch tham quan, vui chơi giải trí, ngắm cảnh (旅游景点 - điểm du lịch).',
        example: '周末很多游客来这里旅游拍照。(Cuối tuần rất nhiều du khách đến đây du lịch chụp ảnh.)',
      },
    ],
  },
};

/**
 * Second natural example sentence per word so every response includes 2 real-life examples
 */
const SECOND_EXAMPLE_MAP: Record<string, BinBinExampleItem> = {
  初中: {
    hanzi: '我从初中二年级开始学习汉语。',
    pinyin: 'Wǒ cóng chūzhōng èr niánjí kāishǐ xuéxí Hànyǔ.',
    meaning: 'Tôi bắt đầu học tiếng Trung từ năm lớp 8 (năm hai cấp 2).',
  },
  温暖: {
    hanzi: '家人和朋友的关心让我觉得很温暖。',
    pinyin: 'Jiārén hé péngyou de guānxīn ràng wǒ juéde hěn wēnnuǎn.',
    meaning: 'Sự quan tâm của gia đình và bạn bè khiến tôi cảm thấy rất ấm lòng.',
  },
  咱们: {
    hanzi: '时间不早了，咱们快点儿出发吧！',
    pinyin: 'Shíjiān bù zǎo le, zánmen kuài diǎnr chūfā ba!',
    meaning: 'Không còn sớm nữa, chúng mình mau xuất phát thôi!',
  },
  换: {
    hanzi: '出门之前，请先换一件干净的衣服。',
    pinyin: 'Chūmén zhīqián, qǐng xiān huàn yī jiàn gānjìng de yīfu.',
    meaning: 'Trước khi ra ngoài, xin hãy thay một bộ quần áo sạch sẽ trước.',
  },
  空调: {
    hanzi: '离开教室的时候，别忘了把空调关掉。',
    pinyin: 'Líkāi jiàoshì de shíhou, bié wàng le bǎ kōngtiáo guāndiào.',
    meaning: 'Lúc rời khỏi phòng học, đừng quên tắt máy điều hòa nhé.',
  },
  洗衣机: {
    hanzi: '妈妈把洗好的衣服从洗衣机里拿出来。',
    pinyin: 'Māma bǎ xǐ hǎo de yīfu cóng xǐyījī lǐ ná chūlái.',
    meaning: 'Mẹ lấy quần áo đã giặt sạch từ trong máy giặt ra.',
  },
  花园: {
    hanzi: '奶奶每天早上都喜欢去小花园散步。',
    pinyin: 'Nǎinai měitiān zǎoshang dōu xǐhuan qù xiǎo huāyuán sànbù.',
    meaning: 'Bà nội mỗi buổi sáng đều thích ra vườn hoa nhỏ đi dạo.',
  },
  挺: {
    hanzi: '这道中国菜做得挺好吃的，你也尝尝吧。',
    pinyin: 'Zhè dào Zhōngguó cài zuò de tǐng hǎochī de, nǐ yě chángchang ba.',
    meaning: 'Món ăn Trung Quốc này nấu khá ngon đấy, bạn cũng nếm thử đi.',
  },
  刻: {
    hanzi: '我们约好下午三点一刻在图书馆见面。',
    pinyin: 'Wǒmen yuē hǎo xiàwǔ sān diǎn yī kè zài túshūguǎn jiànmiàn.',
    meaning: 'Chúng tôi hẹn nhau 3 giờ 15 phút chiều gặp mặt ở thư viện.',
  },
  愿意: {
    hanzi: '你愿意跟我一起参加汉语演讲比赛吗？',
    pinyin: 'Nǐ yuànyì gēn wǒ yīqǐ cānjiā Hànyǔ yǎnjiǎng bǐsài ma?',
    meaning: 'Bạn có sẵn lòng cùng mình tham gia cuộc thi hùng biện tiếng Trung không?',
  },
  龙: {
    hanzi: '端午节的时候，大家在河上举行赛龙舟比赛。',
    pinyin: 'Duānwǔjié de shíhou, dàjiā zài hé shàng jǔxíng sài lóngzhōu bǐsài.',
    meaning: 'Vào dịp Tết Đoan Ngọ, mọi người tổ chức thi đua thuyền rồng trên sông.',
  },
  狗: {
    hanzi: '每天晚饭后，我都会带小狗去公园跑步。',
    pinyin: 'Měitiān wǎnfàn hòu, wǒ dōu huì dài xiǎogǒu qù gōngyuán pǎobù.',
    meaning: 'Mỗi tối sau bữa cơm, tôi đều dắt chú cún ra công viên chạy bộ.',
  },
  咖啡: {
    hanzi: '这家咖啡馆的环境很安静，适合看书。',
    pinyin: 'Zhè jiā kāfēiguǎn de huánjìng hěn ānjìng, shìhé kànshū.',
    meaning: 'Không gian quán cà phê này rất yên tĩnh, thích hợp để đọc sách.',
  },
  努力: {
    hanzi: '感谢你一直以来的努力和坚持！',
    pinyin: 'Gǎnxiè nǐ yīzhí yǐlái de nǔlì hé jiānchí!',
    meaning: 'Cảm ơn sự nỗ lực và kiên trì suốt thời gian qua của bạn!',
  },
  交通: {
    hanzi: '上下班高峰期，市中心的交通比较拥挤。',
    pinyin: 'Shàng-xiàbān gāofēngqī, shìzhōngxīn de jiāotōng bǐjiào yōngjǐ.',
    meaning: 'Vào giờ cao điểm tan tầm, giao thông ở trung tâm thành phố khá đông đúc.',
  },
  坚持: {
    hanzi: '他每天早上都坚持跑步三十分钟。',
    pinyin: 'Tā měitiān zǎoshang dōu jiānchí pǎobù sānshí fēnzhōng.',
    meaning: 'Anh ấy mỗi sáng đều kiên trì chạy bộ 30 phút.',
  },
  包容: {
    hanzi: '父母总是用最大的耐心来包容孩子的缺点。',
    pinyin: 'Fùmǔ zǒngshì yòng zuìdà de nàixīn lái bāoróng háizi de quēdiǎn.',
    meaning: 'Cha mẹ luôn dùng sự kiên nhẫn lớn nhất để bao dung khuyết điểm của con cái.',
  },
  融会贯通: {
    hanzi: '只有多听多说，才能把学过的句型融会贯通。',
    pinyin: 'Zhǐyǒu duō tīng duō shuō, cáinéng bǎ xué guò de jùxíng rónghuì-guàntōng.',
    meaning: 'Chỉ có nghe nhiều nói nhiều mới có thể vận dụng linh hoạt các mẫu câu đã học.',
  },
  明天: {
    hanzi: '明天早上八点，我们在学校门口集合。',
    pinyin: 'Míngtiān zǎoshang bā diǎn, wǒmen zài xuéxiào ménkǒu jíhé.',
    meaning: '8 giờ sáng ngày mai, chúng ta tập trung ở cổng trường nhé.',
  },
  照顾: {
    hanzi: '姐姐主动留下来照顾生病的奶奶。',
    pinyin: 'Jiějie zhǔdòng liú xiàlái zhàogù shēngbìng de nǎinai.',
    meaning: 'Chị gái chủ động ở lại chăm sóc bà nội đang bị ốm.',
  },
  考试: {
    hanzi: '只要平时认真复习，考试就不用紧张。',
    pinyin: 'Zhǐyào píngshí rènzhēn fùxí, kǎoshì jiù bùyòng jǐnzhāng.',
    meaning: 'Chỉ cần ngày thường ôn tập nghiêm túc thì khi thi cử không cần căng thẳng.',
  },
  旅行: {
    hanzi: '这次旅行让我认识了很多新朋友。',
    pinyin: 'Zhè cì lǚxíng ràng wǒ rènshi le hěn duō xīn péngyou.',
    meaning: 'Chuyến du lịch lần này giúp tôi làm quen được rất nhiều người bạn mới.',
  },
};

function getAuthenticCollocationsForWord(
  hanzi: string,
  pinyin: string,
  meaning: string,
  partOfSpeech = ''
): { hanzi: string; pinyin: string; meaning: string }[] {
  if (WORD_COLLOCATIONS_MAP[hanzi]) {
    return WORD_COLLOCATIONS_MAP[hanzi];
  }
  const posUpper = partOfSpeech.toUpperCase();
  if (posUpper.includes('TÍNH TỪ')) {
    return [
      { hanzi: `非常${hanzi}`, pinyin: `fēicháng ${pinyin}`, meaning: `vô cùng ${meaning}` },
      { hanzi: `${hanzi}的环境`, pinyin: `${pinyin} de huánjìng`, meaning: `bầu không khí / môi trường ${meaning}` },
      { hanzi: `觉得很${hanzi}`, pinyin: `juéde hěn ${pinyin}`, meaning: `cảm thấy rất ${meaning}` },
    ];
  }
  if (posUpper.includes('ĐỘNG TỪ')) {
    return [
      { hanzi: `认真${hanzi}`, pinyin: `rènzhēn ${pinyin}`, meaning: `nghiêm túc ${meaning}` },
      { hanzi: `一起${hanzi}`, pinyin: `yīqǐ ${pinyin}`, meaning: `cùng nhau ${meaning}` },
      { hanzi: `继续${hanzi}`, pinyin: `jìxù ${pinyin}`, meaning: `tiếp tục ${meaning}` },
    ];
  }
  if (posUpper.includes('THỜI GIAN')) {
    return [
      { hanzi: `${hanzi}早上`, pinyin: `${pinyin} zǎoshang`, meaning: `buổi sáng ${meaning}` },
      { hanzi: `${hanzi}下午`, pinyin: `${pinyin} xiàwǔ`, meaning: `buổi chiều ${meaning}` },
      { hanzi: `${hanzi}的安排`, pinyin: `${pinyin} de ānpái`, meaning: `lịch trình ${meaning}` },
    ];
  }
  return [
    { hanzi: `关于${hanzi}`, pinyin: `guānyú ${pinyin}`, meaning: `về chủ đề ${meaning}` },
    { hanzi: `重要的${hanzi}`, pinyin: `zhòngyào de ${pinyin}`, meaning: `${meaning} quan trọng` },
    { hanzi: `了解${hanzi}`, pinyin: `liǎojiě ${pinyin}`, meaning: `tìm hiểu rõ về ${meaning}` },
  ];
}

function getSynonymDistinctionForWord(
  hanzi: string,
  pinyin: string,
  meaning: string,
  partOfSpeech: string
): BinBinSynonymComparison {
  if (SYNONYM_DISTINCTION_MAP[hanzi]) {
    return SYNONYM_DISTINCTION_MAP[hanzi];
  }
  return {
    title: `Lưu ý dùng từ chuẩn bản xứ với “${hanzi}” (${pinyin})`,
    summary: `“${hanzi}” là ${partOfSpeech.toLowerCase()} mang nghĩa “${meaning}”, cần đặt đúng vị trí ngữ pháp trong câu HSK:`,
    items: [
      {
        word: hanzi,
        pinyin,
        nuance: `Nghĩa chuẩn: “${meaning}”. Khi đặt câu tránh dịch ghép từng chữ từ tiếng Việt sang tiếng Trung.`,
        example: `在日常交流中，正确使用“${hanzi}”会让表达更自然。`,
      },
    ],
  };
}

function getTwoExamplesForWord(
  hanzi: string,
  pinyin: string,
  meaning: string,
  primaryHanzi: string,
  primaryPinyin: string,
  primaryMeaning: string
): BinBinExampleItem[] {
  const first: BinBinExampleItem = {
    hanzi: primaryHanzi.replace(/\s+/g, ''),
    pinyin: primaryPinyin,
    meaning: primaryMeaning,
  };
  const second = SECOND_EXAMPLE_MAP[hanzi] || {
    hanzi: `老师今天在课堂上详细讲解了“${hanzi}”的实际用法。`,
    pinyin: `Lǎoshī jīntiān zài kètáng shàng xiángxì jiǎngjiě le “${pinyin}” de shíjì yòngfǎ.`,
    meaning: `Hôm nay trên lớp thầy giáo đã giảng giải chi tiết cách dùng thực tế của từ “${meaning}”.`,
  };
  return [first, second];
}

function buildRadicalBreakdownText(hanzi: string, fallbackChars?: StrokeData[]): string {
  const chars = Array.from(hanzi).filter((ch) => /[\u4e00-\u9fff]/.test(ch));
  if (chars.length === 0 && fallbackChars && fallbackChars.length > 0) {
    return fallbackChars
      .map((c) => `chữ ${c.char} (${c.pinyin}, ${c.strokeCount} nét, bộ thủ: ${c.radical})`)
      .join('; ');
  }
  return chars
    .map((ch, idx) => {
      const meta = CHAR_META_DICTIONARY[ch];
      const fb = fallbackChars?.[idx];
      const py = meta?.pinyin || fb?.pinyin || ch;
      const hv = meta?.hanViet ? ` - Hán Việt: ${meta.hanViet}` : '';
      const meaning = meta?.meaning ? ` (${meta.meaning})` : '';
      const strokes = meta?.strokeCount || fb?.strokeCount || 8;
      const radical = meta?.radical || fb?.radical || 'Bộ thủ Hán tự';
      return `chữ ${ch} [${py}${hv}${meaning}, ${strokes} nét, bộ ${radical}]`;
    })
    .join('; ');
}

function buildWordCardForTarget(
  hanzi: string,
  entry?: SmartDictEntry | VocabSlide | null
): {
  wordCard: BinBinWordCardInfo;
  collocations: { hanzi: string; pinyin: string; meaning: string }[];
  synonymDistinction: BinBinSynonymComparison;
  examples: BinBinExampleItem[];
  essenceAndContext: string;
  slidePayload: BinBinSlidePayload;
  exampleHanzi: string;
  examplePinyin: string;
  exampleMeaning: string;
  usageNote: string;
} {
  const dict = SMART_HANZI_DICTIONARY[hanzi];
  const slideMatch = INITIAL_VOCAB_SLIDES.find((s) => s.hanzi === hanzi);
  const charMeta = CHAR_META_DICTIONARY[hanzi];

  const pinyin =
    entry?.pinyin ||
    dict?.pinyin ||
    slideMatch?.pinyin ||
    charMeta?.pinyin ||
    Array.from(hanzi)
      .map((c) => CHAR_META_DICTIONARY[c]?.pinyin || c)
      .join(' ');
  const hanViet =
    entry?.hanViet ||
    dict?.hanViet ||
    slideMatch?.hanViet ||
    charMeta?.hanViet ||
    Array.from(hanzi)
      .map((c) => CHAR_META_DICTIONARY[c]?.hanViet || c)
      .join(' ');
  const meaning =
    entry?.meaning ||
    dict?.meaning ||
    slideMatch?.meaning ||
    charMeta?.meaning ||
    synthesizeHolisticMeaning(hanzi, hanViet);
  const partOfSpeech =
    entry?.partOfSpeech ||
    dict?.partOfSpeech ||
    slideMatch?.partOfSpeech ||
    'TỪ VỰNG HSK';
  const hskLevel =
    entry?.hskLevel || dict?.hskLevel || slideMatch?.hskLevel || 'HSK 1–4';
  const usageNote =
    entry?.usageNote ||
    dict?.usageNote ||
    slideMatch?.usageNote ||
    `Dùng phổ biến trong giao tiếp thực tế và đề thi ${hskLevel}.`;

  const synthEx = synthesizeContextualExample(hanzi, pinyin, meaning);
  const exampleHanzi =
    entry?.exampleHanzi ||
    dict?.exampleHanzi ||
    slideMatch?.exampleHanzi ||
    synthEx.exampleHanzi;
  const examplePinyin =
    entry?.examplePinyin ||
    dict?.examplePinyin ||
    slideMatch?.examplePinyin ||
    synthEx.examplePinyin;
  const exampleMeaning =
    entry?.exampleMeaning ||
    dict?.exampleMeaning ||
    slideMatch?.exampleMeaning ||
    synthEx.exampleMeaning;

  const radicalBreakdown = buildRadicalBreakdownText(
    hanzi,
    slideMatch?.characters
  );
  const radicalMnemonic =
    HANZI_MNEMONIC_STORIES[hanzi] ||
    `Chiết tự bộ thủ: ${radicalBreakdown}. Nắm rõ cấu tạo bộ thủ giúp nhớ nhanh mặt chữ và nghĩa gốc của “${hanzi}” (${pinyin} - ${meaning}).`;

  const collocations = getAuthenticCollocationsForWord(
    hanzi,
    pinyin,
    meaning,
    partOfSpeech
  );
  // Keep top 2 in wordCard.compoundWords for backwards compatibility with existing unit tests
  const compoundWords = collocations.slice(0, 2);
  const synonymDistinction = getSynonymDistinctionForWord(
    hanzi,
    pinyin,
    meaning,
    partOfSpeech
  );
  const examples = getTwoExamplesForWord(
    hanzi,
    pinyin,
    meaning,
    exampleHanzi,
    examplePinyin,
    exampleMeaning
  );
  const essenceAndContext = `${hanzi} (${pinyin} · Hán Việt: ${hanViet.toUpperCase()}) là ${partOfSpeech.toLowerCase()} thuộc ${hskLevel}, mang nghĩa chuẩn “${meaning}”. ${usageNote}`;

  const slidePayload: BinBinSlidePayload = {
    hanzi,
    pinyin,
    hanViet,
    meaning,
    partOfSpeech,
    hskLevel,
    usageNote,
    exampleHanzi,
    examplePinyin,
    exampleMeaning,
  };

  return {
    wordCard: {
      hanzi,
      pinyin,
      hanViet,
      meaning,
      partOfSpeech,
      hskLevel,
      radicalMnemonic,
      compoundWords,
    },
    collocations,
    synonymDistinction,
    examples,
    essenceAndContext,
    slidePayload,
    exampleHanzi,
    examplePinyin,
    exampleMeaning,
    usageNote,
  };
}

/**
 * Resolves any user query (Chinese word like "交通", "初中", Vietnamese meaning like "giao thông",
 * or Pinyin like "jiaotong") into an instant target vocabulary entry in 0ms.
 */
function resolveTargetFromUserPrompt(
  userPrompt: string,
  fallbackSlide?: VocabSlide | null
): {
  targetHanzi: string;
  matchedEntry?: SmartDictEntry | VocabSlide | null;
  isDirectWordLookup: boolean;
} {
  const defaultSlide =
    fallbackSlide || INITIAL_VOCAB_SLIDES[10] || INITIAL_VOCAB_SLIDES[0];
  const trimmed = userPrompt.trim();
  if (!trimmed) {
    return {
      targetHanzi: defaultSlide.hanzi,
      matchedEntry: defaultSlide,
      isDirectWordLookup: false,
    };
  }

  // Ignore default 1-touch action prompts so they use the active slide directly
  if (
    trimmed.startsWith('Giải thích bộ thủ và mẹo nhớ chiết tự') ||
    trimmed.startsWith('Giải thích mẹo nhớ') ||
    trimmed.startsWith('Phân biệt từ') ||
    trimmed.startsWith('Luyện hội thoại') ||
    trimmed.startsWith('Đóng vai hội thoại') ||
    trimmed.startsWith('Sửa lỗi câu và hướng dẫn ngữ pháp') ||
    trimmed.startsWith('Chữa câu') ||
    trimmed.startsWith('Tạo 5 câu bài tập') ||
    trimmed.startsWith('Tạo câu hỏi Quiz') ||
    trimmed.startsWith('Gợi ý cấu trúc ngữ pháp') ||
    trimmed.startsWith('Gợi ý đáp án')
  ) {
    // Check if the prompt explicitly names a Chinese word at the end (e.g., "Tạo 5 câu bài tập điền từ với 初中")
    const explicitChinese = trimmed.match(/[\u4e00-\u9fff]+/g);
    if (explicitChinese && explicitChinese.length > 0) {
      const candidate = explicitChinese[explicitChinese.length - 1];
      if (SMART_HANZI_DICTIONARY[candidate] || INITIAL_VOCAB_SLIDES.some((s) => s.hanzi === candidate)) {
        return {
          targetHanzi: candidate,
          matchedEntry:
            SMART_HANZI_DICTIONARY[candidate] ||
            INITIAL_VOCAB_SLIDES.find((s) => s.hanzi === candidate) ||
            defaultSlide,
          isDirectWordLookup: false,
        };
      }
    }
    return {
      targetHanzi: defaultSlide.hanzi,
      matchedEntry: defaultSlide,
      isDirectWordLookup: false,
    };
  }

  // 1. Exact match in SMART_HANZI_DICTIONARY or CHAR_META_DICTIONARY
  if (SMART_HANZI_DICTIONARY[trimmed]) {
    return {
      targetHanzi: trimmed,
      matchedEntry: SMART_HANZI_DICTIONARY[trimmed],
      isDirectWordLookup: true,
    };
  }
  if (CHAR_META_DICTIONARY[trimmed]) {
    return {
      targetHanzi: trimmed,
      matchedEntry: null,
      isDirectWordLookup: true,
    };
  }

  // 2. Check if user typed Chinese characters (e.g. "交通", "初中", "từ 初中 dùng thế nào")
  const chineseMatches = trimmed.match(/[\u4e00-\u9fff]+/g);
  if (chineseMatches && chineseMatches.length > 0) {
    for (const token of chineseMatches) {
      if (SMART_HANZI_DICTIONARY[token]) {
        return {
          targetHanzi: token,
          matchedEntry: SMART_HANZI_DICTIONARY[token],
          isDirectWordLookup: token.length <= 4 && chineseMatches.length === 1 && trimmed.length <= 16,
        };
      }
      for (const dictKey of Object.keys(SMART_HANZI_DICTIONARY)) {
        if (dictKey.length >= 2 && token.includes(dictKey)) {
          return {
            targetHanzi: dictKey,
            matchedEntry: SMART_HANZI_DICTIONARY[dictKey],
            isDirectWordLookup: token.length <= 4 && chineseMatches.length === 1 && trimmed.length <= 16,
          };
        }
      }
    }
    const primaryHanzi = chineseMatches[0];
    if (primaryHanzi.length <= 4 && chineseMatches.length === 1 && trimmed.length <= 12) {
      return {
        targetHanzi: primaryHanzi,
        matchedEntry: SMART_HANZI_DICTIONARY[primaryHanzi] || null,
        isDirectWordLookup: true,
      };
    }
  }

  // 3. Vietnamese meaning or Pinyin lookup (e.g. "giao thông", "jiaotong", "ấm áp", "cấp 2")
  const cleanedVn = trimmed
    .replace(/^(từ|chữ|nghĩa của từ|tiếng trung|cho hỏi|bin bin ơi|giải thích|phân biệt)\s+/i, '')
    .replace(/\s+(nghĩa là gì|tiếng trung là gì|là gì|như thế nào)\??$/i, '')
    .trim();
  const suggestions = searchInstantVocabSuggestions(cleanedVn, { limit: 1 });
  if (suggestions.length > 0 && cleanedVn.length <= 24) {
    const top = suggestions[0];
    return {
      targetHanzi: top.hanzi,
      matchedEntry: SMART_HANZI_DICTIONARY[top.hanzi] || null,
      isDirectWordLookup: true,
    };
  }

  return {
    targetHanzi: defaultSlide.hanzi,
    matchedEntry: defaultSlide,
    isDirectWordLookup: false,
  };
}

/**
 * Analyzes and corrects a free-form Chinese or Vietnamese sentence input
 */
function buildSentenceCorrectionAnalysis(
  rawInput: string,
  wordCard: BinBinWordCardInfo,
  defaultExample: BinBinExampleItem
): BinBinSentenceCorrection {
  const clean = rawInput.trim();

  // Pattern 1: Time word placed at the end of the Chinese sentence (e.g., "我非常温暖今天", "我去学校明天")
  const timeAtEndMatch = clean.match(/^(.+?)(今天|明天|昨天|现在|周末|早上|晚上)[。！？!?]*$/);
  if (timeAtEndMatch) {
    const body = timeAtEndMatch[1].trim();
    const timeWord = timeAtEndMatch[2];
    const subjMatch = body.match(/^(我|你|他|她|我们|咱们|大家|妈妈|爸爸|老师)(.+)$/);
    const corrected = subjMatch
      ? `${subjMatch[1]}${timeWord}${subjMatch[2]}。`
      : `${timeWord}${body}。`;

    if (clean.includes('温暖')) {
      return {
        originalInput: clean,
        isAlreadyCorrect: false,
        correctedHanzi: '今天我感到非常温暖。',
        correctedPinyin: 'Jīntiān wǒ gǎndào fēicháng wēnnuǎn.',
        vietnameseTranslation: 'Hôm nay tôi cảm thấy vô cùng ấm áp (ấm lòng).',
        explanation: `Lỗi trật tự từ & kết hợp từ: (1) Trong tiếng Trung, trạng ngữ chỉ thời gian (“${timeWord}”) phải đứng ĐẦU câu hoặc NGAY SAU chủ ngữ, tuyệt đối không đặt cuối câu như tiếng Việt. (2) Khi nói người cảm thấy ấm áp/ấm lòng, dùng “感到很温暖” hoặc “觉得很暖和”.`,
      };
    }

    return {
      originalInput: clean,
      isAlreadyCorrect: false,
      correctedHanzi: corrected,
      correctedPinyin: defaultExample.pinyin,
      vietnameseTranslation: defaultExample.meaning,
      explanation: `Lỗi vị trí trạng ngữ thời gian: Trong tiếng Trung, từ chỉ thời gian (“${timeWord}”) bắt buộc đứng trước động từ/vị ngữ (Cấu trúc: Chủ ngữ + Thời gian + Địa điểm + Động từ), không đặt ở cuối câu như tiếng Việt.`,
    };
  }

  // Pattern 2: Place phrase "在..." placed after the verb (e.g. "我学习汉语在北京")
  const placeAtEndMatch = clean.match(/^(我|你|他|她|我们|咱们)(.+?)(在[^\s。！？!?]+)[。！？!?]*$/);
  if (placeAtEndMatch) {
    const subj = placeAtEndMatch[1];
    const verbPhrase = placeAtEndMatch[2];
    const placePhrase = placeAtEndMatch[3];
    return {
      originalInput: clean,
      isAlreadyCorrect: false,
      correctedHanzi: `${subj}${placePhrase}${verbPhrase}。`,
      correctedPinyin: defaultExample.pinyin,
      vietnameseTranslation: `Chuyển cụm địa điểm “${placePhrase}” lên trước động từ “${verbPhrase}”.`,
      explanation: `Lỗi vị trí trạng ngữ nơi chốn: Cụm giới từ chỉ địa điểm (“${placePhrase}”) phải đứng TRƯỚC động từ chính (Chủ ngữ + 在 + Địa điểm + Động từ), trừ một số động từ kết quả đặc biệt.`,
    };
  }

  // Pattern 3: Using "是" before an adjective (e.g., "今天天气是温暖" or "我是累")
  if (/是(温暖|热|冷|累|忙|漂亮|聪明|高兴|好)/.test(clean)) {
    const fixed = clean.replace(/是(温暖|热|冷|累|忙|漂亮|聪明|高兴|好)/, '很$1');
    return {
      originalInput: clean,
      isAlreadyCorrect: false,
      correctedHanzi: fixed.endsWith('。') ? fixed : `${fixed}。`,
      correctedPinyin: defaultExample.pinyin,
      vietnameseTranslation: defaultExample.meaning,
      explanation:
        'Lỗi câu vị ngữ tính từ: Trong tiếng Trung, trước tính từ làm vị ngữ KHÔNG dùng động từ “是 (shì)” mà dùng phó từ chỉ mức độ như “很 (hěn)”, “非常 (fēicháng)”, hoặc “挺...的”.',
    };
  }

  // Default: Bilingual translation + natural native refinement
  return {
    originalInput: clean,
    isAlreadyCorrect: true,
    correctedHanzi: defaultExample.hanzi,
    correctedPinyin: defaultExample.pinyin,
    vietnameseTranslation: defaultExample.meaning,
    explanation: `Cấu trúc chuẩn bản xứ với “${wordCard.hanzi}” (${wordCard.pinyin}): Chú ý quy tắc 【Chủ ngữ + Thời gian + Địa điểm + Phó từ + Động từ/Tính từ + Tân ngữ】 để câu tự nhiên 100%.`,
  };
}

/**
 * Generates a 5-question HSK 3.0 fill-in-the-blank & collocation exercise set for Teachers
 */
function buildTeacherExerciseSet(
  wordCard: BinBinWordCardInfo,
  collocations: { hanzi: string; pinyin: string; meaning: string }[],
  examples: BinBinExampleItem[],
  synonym: BinBinSynonymComparison
): BinBinTeacherExercise {
  const c1 = collocations[0] || { hanzi: wordCard.hanzi, pinyin: wordCard.pinyin, meaning: wordCard.meaning };
  const c2 = collocations[1] || c1;
  const c3 = collocations[2] || c1;
  const ex1 = examples[0];
  const ex2 = examples[1] || ex1;
  const synOther = synonym.items[1]?.word || '高中';

  const blankEx1 = ex1.hanzi.includes(wordCard.hanzi)
    ? ex1.hanzi.replace(wordCard.hanzi, '（　　）')
    : `请用“${wordCard.hanzi}”填空：${ex1.hanzi}`;
  const blankEx2 = ex2.hanzi.includes(wordCard.hanzi)
    ? ex2.hanzi.replace(wordCard.hanzi, '（　　）')
    : `完成句子：${ex2.hanzi}`;

  return {
    title: `Bộ 5 Câu Bài Tập Thực Hành HSK 3.0 — Từ khóa: ${wordCard.hanzi} (${wordCard.pinyin})`,
    type: 'fill-blank',
    items: [
      {
        question: `Câu 1 [Điền từ ngữ cảnh]: ${blankEx1}`,
        pinyin: ex1.pinyin,
        answer: wordCard.hanzi,
        explanation: `Dịch nghĩa: ${ex1.meaning}`,
      },
      {
        question: `Câu 2 [Điền từ mở rộng]: ${blankEx2}`,
        pinyin: ex2.pinyin,
        answer: wordCard.hanzi,
        explanation: `Dịch nghĩa: ${ex2.meaning}`,
      },
      {
        question: `Câu 3 [Kết hợp từ chuẩn - Collocation]: Chọn cụm từ kết hợp ĐÚNG tự nhiên bản xứ với “${wordCard.hanzi}”: A. ${c1.hanzi}  |  B. ${c2.hanzi}  |  C. Cả A & B đều đúng`,
        pinyin: `${c1.pinyin} / ${c2.pinyin}`,
        answer: `C (${c1.hanzi}: ${c1.meaning}; ${c2.hanzi}: ${c2.meaning})`,
        explanation: `Người bản xứ dùng cụm cố định: ${c1.hanzi}, ${c2.hanzi}, ${c3.hanzi}.`,
      },
      {
        question: `Câu 4 [Phân biệt từ dễ nhầm]: Khi nào dùng “${wordCard.hanzi}” thay vì “${synOther}”?`,
        pinyin: wordCard.pinyin,
        answer: synonym.items[0]?.nuance || `${wordCard.hanzi} mang nghĩa “${wordCard.meaning}”.`,
        explanation: synonym.summary,
      },
      {
        question: `Câu 5 [Dịch Việt – Trung ứng dụng]: Hãy dịch sang tiếng Trung sử dụng cụm “${c1.hanzi}” (${c1.meaning}): “${ex1.meaning}”`,
        pinyin: ex1.pinyin,
        answer: ex1.hanzi,
        explanation: `Đáp án chuẩn: ${ex1.hanzi} (${ex1.pinyin})`,
      },
    ],
  };
}

/**
 * Pure, deterministic, 0ms Practical AI Copilot responder for Gấu trúc Bin Bin (彬彬).
 * Completely free of mechanical templates ("学习初中", "常用初中") and robotic filler.
 */
export function generateBinBinSmartReply(
  actionType: BinBinActionType,
  userPrompt: string,
  contextSlide?: VocabSlide | null,
  contextQuiz?: {
    prompt?: string;
    grammarHint?: string;
    pinyinHint?: string;
  } | null
): BinBinReply {
  const slide = contextSlide || INITIAL_VOCAB_SLIDES[10] || INITIAL_VOCAB_SLIDES[0];
  const resolved = resolveTargetFromUserPrompt(userPrompt, slide);
  const targetDetails = buildWordCardForTarget(
    resolved.targetHanzi,
    resolved.matchedEntry
  );
  const {
    wordCard,
    collocations,
    synonymDistinction,
    examples,
    essenceAndContext,
    slidePayload,
    exampleHanzi,
    examplePinyin,
    exampleMeaning,
  } = targetDetails;

  const collocationsText = collocations
    .map((c) => `${c.hanzi} (${c.pinyin}: ${c.meaning})`)
    .join(' · ');

  const lowerPrompt = userPrompt.trim().toLowerCase();

  // 1. TEACHER EXERCISE / QUIZ GENERATION
  if (
    actionType === 'quiz-gen' ||
    /tạo\s*\d*\s*câu|bài tập|điền từ|trắc nghiệm|soạn bài tập/.test(lowerPrompt)
  ) {
    const exerciseSet = buildTeacherExerciseSet(
      wordCard,
      collocations,
      examples,
      synonymDistinction
    );
    const formattedList = exerciseSet.items
      .map((it, idx) => `${idx + 1}. ${it.question}\n   → Đáp án: ${it.answer}`)
      .join('\n');

    return {
      replyText: `Bin Bin đã soạn ngay cho bạn ${exerciseSet.title}:\n${formattedList}`,
      chinesePhrase: examples[0].hanzi,
      pinyinPhrase: examples[0].pinyin,
      vietnamesePhrase: examples[0].meaning,
      wordCard,
      essenceAndContext,
      collocations,
      synonymDistinction,
      examples,
      teacherExercise: exerciseSet,
      slidePayload,
    };
  }

  // 2. DIALOGUE / ROLEPLAY GENERATION
  if (
    actionType === 'dialogue' ||
    /hội thoại|đóng vai|đối thoại/.test(lowerPrompt)
  ) {
    const c1 = collocations[0]?.hanzi || wordCard.hanzi;
    const c2 = collocations[1]?.hanzi || wordCard.hanzi;
    return {
      replyText:
        `Hội thoại thực tế HSK 3.0 với từ khóa “${wordCard.hanzi}” (${wordCard.pinyin} — ${wordCard.meaning}) cùng Bin Bin:\n` +
        `• A (Giáo viên): 你知道“${wordCard.hanzi}”常跟哪些词搭配吗？ (Bạn có biết “${wordCard.hanzi}” thường kết hợp với cụm từ nào không?)\n` +
        `• B (Học viên): 老师，我们可以说“${c1}”或者“${c2}”。 (${examples[0].hanzi})\n` +
        `• Gợi ý mở rộng cho bạn: ${examples[1].hanzi} (${examples[1].meaning})`,
      chinesePhrase: `你好！我是熊猫彬彬。今天我们用“${wordCard.hanzi}”来练习对话吧：${exampleHanzi}`,
      pinyinPhrase: `Nǐ hǎo! Wǒ shì xióngmāo Bīnbīn. Jīntiān wǒmen yòng “${wordCard.pinyin}” lái liànxí duìhuà ba: ${examplePinyin}`,
      vietnamesePhrase: `Xin chào! Mình là Gấu trúc Bin Bin. Hôm nay chúng mình dùng từ “${wordCard.meaning}” để luyện hội thoại nhé: ${exampleMeaning}`,
      wordCard,
      essenceAndContext,
      collocations,
      synonymDistinction,
      examples,
      slidePayload,
    };
  }

  // 3. SYNONYM DISTINCTION (PHÂN BIỆT TỪ DỄ NHẦM)
  if (
    actionType === 'distinguish' ||
    /phân biệt|khác nhau|so sánh|\bvs\b/.test(lowerPrompt)
  ) {
    const bulletItems = synonymDistinction.items
      .map((it) => `• ${it.word} (${it.pinyin}): ${it.nuance} Ví dụ: ${it.example}`)
      .join('\n');
    return {
      replyText:
        `⚖️ ${synonymDistinction.title} (Bin Bin tổng hợp cho bạn):\n` +
        `• Trọng tâm: ${synonymDistinction.summary}\n` +
        `${bulletItems}\n` +
        `• Kết hợp từ chuẩn với ${wordCard.hanzi}: ${collocationsText}.`,
      chinesePhrase: examples[0].hanzi,
      pinyinPhrase: examples[0].pinyin,
      vietnamesePhrase: examples[0].meaning,
      wordCard,
      essenceAndContext,
      collocations,
      synonymDistinction,
      examples,
      slidePayload,
    };
  }

  // 4. GRAMMAR FIX & BILINGUAL SENTENCE CORRECTION
  const cleanInput = userPrompt.trim();
  const hasCustomSentenceForFix =
    actionType === 'grammar-fix' &&
    cleanInput.length > 0 &&
    !cleanInput.startsWith('Sửa lỗi câu') &&
    !cleanInput.startsWith('Chữa câu') &&
    !cleanInput.startsWith('Nhờ Bin Bin kiểm tra');

  if (actionType === 'grammar-fix') {
    const targetSentence = hasCustomSentenceForFix ? cleanInput : exampleHanzi;
    const correction = buildSentenceCorrectionAnalysis(
      targetSentence,
      wordCard,
      examples[0]
    );
    return {
      replyText:
        `✍️ Phân tích & Chữa câu chuẩn bản xứ (Bin Bin hỗ trợ bạn kiểm tra “${targetSentence}”):\n` +
        `• Câu chuẩn tự nhiên: ${correction.correctedHanzi} (${correction.correctedPinyin})\n` +
        `• Dịch nghĩa: ${correction.vietnameseTranslation}\n` +
        `• Lý do & Quy tắc ngữ pháp: ${correction.explanation}\n` +
        `• Kết hợp từ chuẩn (Collocations): ${collocationsText}.`,
      chinesePhrase: correction.correctedHanzi,
      pinyinPhrase: correction.correctedPinyin,
      vietnamesePhrase: correction.vietnameseTranslation,
      wordCard,
      essenceAndContext,
      collocations,
      synonymDistinction,
      examples,
      sentenceCorrection: correction,
      slidePayload,
    };
  }

  // 5. QUIZ HINT (WHEN IN STUDENT QUIZ ARENA)
  if (actionType === 'quiz-hint') {
    const quizPrompt = contextQuiz?.prompt || 'Sắp xếp câu & Trắc nghiệm HSK';
    const grammarHint =
      contextQuiz?.grammarHint ||
      'Chủ ngữ (Ai/Cái gì) + Thời gian/Địa điểm + Động từ/Tính từ + Tân ngữ';
    const pinyinHint = contextQuiz?.pinyinHint || examplePinyin;

    return {
      replyText:
        `💡 Gợi ý nhanh từ Bin Bin cho bạn ở câu “${quizPrompt}”:\n` +
        `• Khung ngữ pháp áp dụng: 【${grammarHint}】\n` +
        `• Phiên âm Pinyin gợi mở: “${pinyinHint}”\n` +
        `• Mẹo làm bài: Xác định Chủ ngữ đứng đầu câu, đặt trạng ngữ chỉ thời gian/địa điểm trước động từ chính.`,
      chinesePhrase: '加油！先找主语，再排谓语和宾语！',
      pinyinPhrase: 'Jiāyóu! Xiān zhǎo zhǔyǔ, zài pái wèiyǔ hé bīnyǔ!',
      vietnamesePhrase: 'Cố lên bạn nhé! Hãy tìm chủ ngữ trước, rồi sắp xếp vị ngữ và tân ngữ!',
      wordCard,
      essenceAndContext,
      collocations,
      synonymDistinction,
      examples,
      slidePayload,
    };
  }

  // 6. MNEMONIC / RADICAL BREAKDOWN
  if (actionType === 'mnemonic') {
    return {
      replyText:
        `💡 Giải mã chiết tự & Mẹo nhớ nhanh từ “${wordCard.hanzi}” (${wordCard.pinyin} — ${wordCard.meaning}) cùng Bin Bin dành cho bạn:\n` +
        `• Bản chất & Ngữ cảnh: ${essenceAndContext}\n` +
        `• Chiết tự bộ thủ: ${wordCard.radicalMnemonic}\n` +
        `• Kết hợp từ chuẩn (Collocations): ${collocationsText}.`,
      chinesePhrase: examples[0].hanzi,
      pinyinPhrase: examples[0].pinyin,
      vietnamesePhrase: examples[0].meaning,
      wordCard,
      essenceAndContext,
      collocations,
      synonymDistinction,
      examples,
      slidePayload,
    };
  }

  // 7. DEFAULT: COMPREHENSIVE PRACTICAL AI COPILOT BREAKDOWN (VOCAB / GRAMMAR / FREE QUESTION)
  // Check if user pasted a multi-word Chinese sentence that needs translation/correction
  const chineseCharsCount = (cleanInput.match(/[\u4e00-\u9fff]/g) || []).length;
  if (!resolved.isDirectWordLookup && chineseCharsCount >= 5) {
    const correction = buildSentenceCorrectionAnalysis(cleanInput, wordCard, examples[0]);
    return {
      replyText:
        `🔍 Dịch song ngữ & Phân tích câu “${cleanInput}” (Bin Bin giải đáp cho bạn):\n` +
        `• Câu chuẩn bản xứ: ${correction.correctedHanzi} (${correction.correctedPinyin})\n` +
        `• Dịch nghĩa tiếng Việt: ${correction.vietnameseTranslation}\n` +
        `• Điểm ngữ pháp cốt lõi: ${correction.explanation}\n` +
        `• Từ vựng trọng tâm: ${wordCard.hanzi} (${wordCard.pinyin} - ${wordCard.meaning}) · Kết hợp chuẩn: ${collocationsText}.`,
      chinesePhrase: correction.correctedHanzi,
      pinyinPhrase: correction.correctedPinyin,
      vietnamesePhrase: correction.vietnameseTranslation,
      wordCard,
      essenceAndContext,
      collocations,
      synonymDistinction,
      examples,
      sentenceCorrection: correction,
      slidePayload,
    };
  }

  const synLine = synonymDistinction.items
    .map((it) => `${it.word} (${it.pinyin}): ${it.nuance}`)
    .join(' | ');

  return {
    replyText:
      `📌 Phân tích thực dụng từ “${wordCard.hanzi}” (${wordCard.pinyin} · Hán Việt: ${wordCard.hanViet.toUpperCase()} · ${wordCard.meaning}) — Bin Bin tổng hợp cho bạn:\n` +
      `• 1. Bản chất & Ngữ cảnh: ${essenceAndContext}\n` +
      `• 2. Kết hợp từ chuẩn (Collocations): ${collocationsText}\n` +
      `• 3. Phân biệt từ dễ nhầm: ${synLine}\n` +
      `• 4. Chiết tự nhớ nhanh: ${wordCard.radicalMnemonic}`,
    chinesePhrase: examples[0].hanzi,
    pinyinPhrase: examples[0].pinyin,
    vietnamesePhrase: examples[0].meaning,
    wordCard,
    essenceAndContext,
    collocations,
    synonymDistinction,
    examples,
    slidePayload,
  };
}

/**
 * Hybrid Instant Local-First + Gemini 2.5 Flash Practical AI Copilot:
 * Immediately prepares the rich structured local analysis, and for open-ended queries
 * calls `/api/binbin/chat` (powered by `@google/genai` with `process.env.GEMINI_API_KEY`)
 * with a clean timeout so the UI never hangs.
 */
export async function askBinBinPandaAI(
  actionType: BinBinActionType,
  userPrompt: string,
  contextSlide?: VocabSlide | null,
  contextQuiz?: {
    prompt?: string;
    grammarHint?: string;
    pinyinHint?: string;
  } | null
): Promise<BinBinReply> {
  const fallbackReply = generateBinBinSmartReply(
    actionType,
    userPrompt,
    contextSlide,
    contextQuiz
  );

  // For instant dictionary lookups or 1-click chip actions on curated HSK words, return immediately (0ms)
  const resolved = resolveTargetFromUserPrompt(userPrompt, contextSlide);
  if (resolved.isDirectWordLookup && SMART_HANZI_DICTIONARY[resolved.targetHanzi]) {
    return fallbackReply;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch('/api/binbin/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        actionType,
        prompt: userPrompt,
        contextSlide: contextSlide
          ? {
              hanzi: contextSlide.hanzi,
              pinyin: contextSlide.pinyin,
              hanViet: contextSlide.hanViet,
              meaning: contextSlide.meaning,
              usageNote: contextSlide.usageNote,
              exampleHanzi: contextSlide.exampleHanzi,
              examplePinyin: contextSlide.examplePinyin,
              exampleMeaning: contextSlide.exampleMeaning,
            }
          : null,
        contextQuiz: contextQuiz || null,
      }),
    });
    clearTimeout(timeoutId);

    if (!res.ok) return fallbackReply;
    const data = await res.json();
    if (!data || data.fallback || !data.replyText) {
      return fallbackReply;
    }

    const aiCollocations =
      Array.isArray(data.collocations) && data.collocations.length > 0
        ? data.collocations
        : fallbackReply.collocations;
    const aiExamples =
      Array.isArray(data.examples) && data.examples.length > 0
        ? data.examples
        : fallbackReply.examples;
    const aiSynonym =
      data.synonymDistinction && Array.isArray(data.synonymDistinction.items)
        ? data.synonymDistinction
        : fallbackReply.synonymDistinction;

    const customTarget = data.targetWord?.hanzi
      ? {
          hanzi: String(data.targetWord.hanzi),
          pinyin: String(data.targetWord.pinyin || fallbackReply.slidePayload?.pinyin || ''),
          hanViet: String(data.targetWord.hanViet || fallbackReply.slidePayload?.hanViet || ''),
          meaning: String(data.targetWord.meaning || fallbackReply.slidePayload?.meaning || ''),
          partOfSpeech: String(
            data.targetWord.partOfSpeech || fallbackReply.slidePayload?.partOfSpeech || 'TỪ VỰNG HSK'
          ),
          hskLevel: String(data.targetWord.hskLevel || fallbackReply.slidePayload?.hskLevel || 'HSK 3'),
          usageNote: String(data.essenceAndContext || fallbackReply.slidePayload?.usageNote || ''),
          exampleHanzi: String(
            aiExamples?.[0]?.hanzi || data.chinesePhrase || fallbackReply.chinesePhrase
          ),
          examplePinyin: String(
            aiExamples?.[0]?.pinyin || data.pinyinPhrase || fallbackReply.pinyinPhrase
          ),
          exampleMeaning: String(
            aiExamples?.[0]?.meaning || data.vietnamesePhrase || fallbackReply.vietnamesePhrase
          ),
        }
      : fallbackReply.slidePayload;

    return {
      replyText: data.replyText,
      chinesePhrase: data.chinesePhrase || fallbackReply.chinesePhrase,
      pinyinPhrase: data.pinyinPhrase || fallbackReply.pinyinPhrase,
      vietnamesePhrase: data.vietnamesePhrase || fallbackReply.vietnamesePhrase,
      wordCard: fallbackReply.wordCard,
      essenceAndContext: data.essenceAndContext || fallbackReply.essenceAndContext,
      collocations: aiCollocations,
      synonymDistinction: aiSynonym,
      examples: aiExamples,
      sentenceCorrection: fallbackReply.sentenceCorrection,
      teacherExercise: fallbackReply.teacherExercise,
      slidePayload: customTarget,
    };
  } catch {
    clearTimeout(timeoutId);
    return fallbackReply;
  }
}

export interface VocabSuggestionItem {
  hanzi: string;
  pinyin: string;
  hanViet: string;
  meaning: string;
  partOfSpeech: string;
  hskLevel: string;
  exampleHanzi: string;
  examplePinyin?: string;
  exampleMeaning: string;
  usageNote?: string;
  topicTag: 'all' | 'family' | 'school' | 'daily' | 'nature';
  source: 'local' | 'ai';
}

/**
 * Strips Vietnamese diacritics and Pinyin tone marks for forgiving, instant search
 * (e.g., "wēn nuǎn" -> "wen nuan", "ấm áp" -> "am ap", "ôn noãn" -> "on noan").
 */
export function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/ü/g, 'v')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferSuggestionTopic(
  hanzi: string,
  meaning: string,
  illustrationKey?: string
): VocabSuggestionItem['topicTag'] {
  if (
    illustrationKey === 'xingfu' ||
    illustrationKey === 'pengyou' ||
    /家|爱|友|咱|欢|喜|乐|고|gia đình|yêu|bạn|vui|hạnh phúc/.test(`${hanzi} ${meaning}`)
  ) {
    return 'family';
  }
  if (
    illustrationKey === 'laoshi' ||
    illustrationKey === 'chuzhong' ||
    illustrationKey === 'nuli' ||
    illustrationKey === 'school' ||
    /学|校|师|聪|语|努|功|梦|trường|học|giáo viên|thông minh|nỗ lực/.test(`${hanzi} ${meaning}`)
  ) {
    return 'school';
  }
  if (
    illustrationKey === 'kafei' ||
    illustrationKey === 'kongtiao' ||
    illustrationKey === 'xiyiji' ||
    illustrationKey === 'bingxiang' ||
    illustrationKey === 'weishengjian' ||
    illustrationKey === 'deng' ||
    /咖|茶|食|空|洗|冰|卫|灯|换|cà phê|trà|ăn|điều hòa|tủ lạnh|đèn/.test(`${hanzi} ${meaning}`)
  ) {
    return 'daily';
  }
  return 'nature';
}

function getAllLocalVocabCatalog(): VocabSuggestionItem[] {
  const seen = new Set<string>();
  const catalog: VocabSuggestionItem[] = [];

  // 1. Curated multi-character & single-character entries in SMART_HANZI_DICTIONARY
  for (const [hanzi, entry] of Object.entries(SMART_HANZI_DICTIONARY)) {
    if (seen.has(hanzi)) continue;
    seen.add(hanzi);
    catalog.push({
      hanzi,
      pinyin: entry.pinyin,
      hanViet: entry.hanViet,
      meaning: entry.meaning,
      partOfSpeech: entry.partOfSpeech,
      hskLevel: entry.hskLevel,
      exampleHanzi: entry.exampleHanzi,
      examplePinyin: entry.examplePinyin,
      exampleMeaning: entry.exampleMeaning,
      usageNote: entry.usageNote,
      topicTag: inferSuggestionTopic(hanzi, entry.meaning, entry.illustrationKey),
      source: 'local',
    });
  }

  // 2. Any initial slides not already in SMART_HANZI_DICTIONARY
  for (const slide of INITIAL_VOCAB_SLIDES) {
    if (seen.has(slide.hanzi)) continue;
    seen.add(slide.hanzi);
    catalog.push({
      hanzi: slide.hanzi,
      pinyin: slide.pinyin,
      hanViet: slide.hanViet,
      meaning: slide.meaning,
      partOfSpeech: slide.partOfSpeech,
      hskLevel: slide.hskLevel,
      exampleHanzi: slide.exampleHanzi,
      examplePinyin: slide.examplePinyin,
      exampleMeaning: slide.exampleMeaning,
      usageNote: slide.usageNote,
      topicTag: inferSuggestionTopic(slide.hanzi, slide.meaning, slide.illustrationKey),
      source: 'local',
    });
  }

  // 3. Single characters from CHAR_META_DICTIONARY
  for (const [char, meta] of Object.entries(CHAR_META_DICTIONARY)) {
    if (seen.has(char)) continue;
    seen.add(char);
    catalog.push({
      hanzi: char,
      pinyin: meta.pinyin,
      hanViet: meta.hanViet,
      meaning: meta.meaning,
      partOfSpeech: 'CHỮ HÁN ĐƠN',
      hskLevel: 'HSK 1–3',
      exampleHanzi: `我们 一起 练习 写 “${char}” 字。`,
      examplePinyin: `Wǒmen yīqǐ liànxí xiě “${meta.pinyin}” zì.`,
      exampleMeaning: `Chúng ta cùng luyện viết chữ “${char}” (${meta.meaning}).`,
      usageNote: `Bộ thủ: ${meta.radical} · Số nét chuẩn: ${meta.strokeCount} nét.`,
      topicTag: inferSuggestionTopic(char, meta.meaning),
      source: 'local',
    });
  }

  return catalog;
}

/**
 * Pure, 0ms instant vocabulary search & suggestion engine for Teachers.
 * Matches by Hanzi, Pinyin (with or without tones/spaces), Hán Việt, Vietnamese meaning,
 * HSK level, or topic filter.
 */
export function searchInstantVocabSuggestions(
  query: string,
  options?: {
    topic?: 'all' | 'family' | 'school' | 'daily' | 'nature';
    limit?: number;
  }
): VocabSuggestionItem[] {
  const topic = options?.topic || 'all';
  const limit = options?.limit || 8;
  const catalog = getAllLocalVocabCatalog();

  const filteredByTopic =
    topic === 'all' ? catalog : catalog.filter((item) => item.topicTag === topic);

  const rawTrimmed = query.trim();
  if (!rawTrimmed) {
    return filteredByTopic.slice(0, limit);
  }

  const normQuery = normalizeSearchText(rawTrimmed);
  const compactQuery = normQuery.replace(/\s+/g, '');

  const scored: { item: VocabSuggestionItem; score: number }[] = [];

  for (const item of filteredByTopic) {
    let score = 0;
    const normPinyin = normalizeSearchText(item.pinyin);
    const compactPinyin = normPinyin.replace(/\s+/g, '');
    const normHanViet = normalizeSearchText(item.hanViet);
    const normMeaning = normalizeSearchText(item.meaning);
    const normHsk = normalizeSearchText(item.hskLevel);
    const normExample = normalizeSearchText(
      `${item.exampleHanzi} ${item.exampleMeaning} ${item.usageNote || ''}`
    );

    // Exact Hanzi match
    if (item.hanzi === rawTrimmed) {
      score += 120;
    } else if (item.hanzi.includes(rawTrimmed)) {
      score += 85;
    }

    // Pinyin match (with or without spaces/tones)
    if (normPinyin === normQuery || compactPinyin === compactQuery) {
      score += 100;
    } else if (normPinyin.startsWith(normQuery) || compactPinyin.startsWith(compactQuery)) {
      score += 75;
    } else if (normPinyin.includes(normQuery) || compactPinyin.includes(compactQuery)) {
      score += 50;
    }

    // Hán Việt match
    if (normHanViet === normQuery) {
      score += 95;
    } else if (normHanViet.includes(normQuery)) {
      score += 65;
    }

    // Vietnamese meaning match
    if (normMeaning === normQuery) {
      score += 95;
    } else if (normMeaning.startsWith(normQuery)) {
      score += 75;
    } else if (normMeaning.includes(normQuery)) {
      score += 60;
    }

    // HSK level match
    if (normHsk.includes(normQuery) || normHsk.replace(/\s+/g, '').includes(compactQuery)) {
      score += 45;
    }

    // Example / usage note contextual match
    if (score === 0 && normExample.includes(normQuery)) {
      score += 30;
    }

    if (score > 0) {
      scored.push({ item, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.item);
}

/**
 * Calls server-side Gemini AI (/api/hanzi/suggest) to get intelligent semantic vocabulary
 * suggestions for any Vietnamese keyword, topic, Pinyin, or Hanzi query, merged cleanly
 * with instant local matches.
 */
export async function fetchAIVocabSuggestions(
  query: string,
  topic: 'all' | 'family' | 'school' | 'daily' | 'nature' = 'all',
  limit = 8
): Promise<VocabSuggestionItem[]> {
  const localMatches = searchInstantVocabSuggestions(query, { topic, limit });
  const trimmed = query.trim();
  if (!trimmed) {
    return localMatches;
  }

  try {
    const res = await fetch('/api/hanzi/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: trimmed, topic, limit: 6 }),
    });
    if (!res.ok) {
      return localMatches;
    }
    const data = await res.json();
    if (!data || data.fallback || !Array.isArray(data.suggestions)) {
      return localMatches;
    }

    const seen = new Set(localMatches.map((m) => m.hanzi));
    const aiItems: VocabSuggestionItem[] = [];

    for (const raw of data.suggestions) {
      const hanzi = String(raw?.hanzi || '').trim();
      if (!hanzi || seen.has(hanzi)) continue;
      seen.add(hanzi);
      const meaning = String(raw?.meaning || '').trim() || synthesizeHolisticMeaning(hanzi, '');
      const pinyinVal = String(raw?.pinyin || hanzi).trim();
      const synthEx = synthesizeContextualExample(hanzi, pinyinVal, meaning);
      aiItems.push({
        hanzi,
        pinyin: pinyinVal,
        hanViet: String(raw?.hanViet || hanzi).trim(),
        meaning,
        partOfSpeech: String(raw?.partOfSpeech || 'TỪ VỰNG HSK').trim(),
        hskLevel: String(raw?.hskLevel || 'HSK 2–4').trim(),
        exampleHanzi:
          String(raw?.exampleHanzi || '').trim() || synthEx.exampleHanzi,
        examplePinyin: String(raw?.examplePinyin || '').trim() || synthEx.examplePinyin,
        exampleMeaning:
          String(raw?.exampleMeaning || '').trim() || synthEx.exampleMeaning,
        usageNote: String(raw?.usageNote || '').trim(),
        topicTag: inferSuggestionTopic(hanzi, meaning),
        source: 'ai',
      });
    }

    return [...localMatches, ...aiItems].slice(0, limit);
  } catch {
    return localMatches;
  }
}

export type StudentStatusFilter = 'all' | 'completed' | 'needs_support';

export interface ClassStudentRecord {
  id: string;
  studentCode: string;
  hskLevel: 'HSK 1' | 'HSK 2' | 'HSK 3' | 'HSK 4';
  name: string;
  vocabScore: string;
  writingScore: string;
  quizScore: string;
  totalPoints: number;
  status: 'Đã chấm AI' | 'Đang nộp bài' | 'Cần kèm thêm';
  feedback: string;
  reviewWords?: string[];
  lastSubmittedAt?: string;
}

export interface StrokeEvaluationDetail {
  passed: boolean;
  accuracy: number;
  gradeLabel: string;
  feedback: string;
}

export function evaluateStrokeWithFeedback(
  userPoints: number[][],
  targetStrokePoints: number[][],
  strokeNumber = 1,
  totalStrokes = 5
): StrokeEvaluationDetail {
  const base = evaluateStrokeSimilarity(userPoints, targetStrokePoints);
  if (!base.passed) {
    return {
      passed: false,
      accuracy: base.accuracy,
      gradeLabel: 'Cần viết rõ hơn',
      feedback: `Nét thứ ${strokeNumber}/${totalStrokes} hơi ngắn. Hãy kéo bút dứt khoát theo đường nét đứt trên ô Mễ (米字格).`,
    };
  }
  if (base.accuracy >= 92) {
    return {
      passed: true,
      accuracy: base.accuracy,
      gradeLabel: 'Xuất sắc · Chuẩn thư pháp',
      feedback: `Nét thứ ${strokeNumber}/${totalStrokes} đạt ${base.accuracy}%! Điểm đặt bút (起笔) và thu bút (收笔) rất cân đối.`,
    };
  }
  if (base.accuracy >= 82) {
    return {
      passed: true,
      accuracy: base.accuracy,
      gradeLabel: 'Tốt · Đúng hướng bút',
      feedback: `Nét thứ ${strokeNumber}/${totalStrokes} đạt ${base.accuracy}%. Đúng quy tắc bút thuận, chú ý giữ lực bút đều hơn ở tâm ô Mễ.`,
    };
  }
  return {
    passed: true,
    accuracy: base.accuracy,
    gradeLabel: 'Đạt · Cần căn chỉnh tâm chữ',
    feedback: `Nét thứ ${strokeNumber}/${totalStrokes} đạt ${base.accuracy}%. Hãy bám sát hơn trục ngang dọc của ô Mễ Tự Cách.`,
  };
}

export function createCustomVocabSlide(
  input: {
    hanzi: string;
    pinyin?: string;
    hanViet?: string;
    meaning: string;
    exampleHanzi?: string;
    examplePinyin?: string;
    exampleMeaning?: string;
    hskLevel?: string;
    partOfSpeech?: string;
  },
  nextIndex: number
): VocabSlide | null {
  const cleanHanzi = input.hanzi.trim();
  const cleanMeaning = input.meaning.trim();
  if (!cleanHanzi || !cleanMeaning) return null;

  const pipeFormatted = `${cleanHanzi} | ${input.pinyin?.trim() || ''} | ${cleanMeaning} | ${
    input.exampleHanzi?.trim() || ''
  } | ${input.hanViet?.trim() || ''}`;

  const base = parseQuickSlideInput(pipeFormatted, nextIndex);
  if (!base) return null;

  return {
    ...base,
    pinyin: input.pinyin?.trim() || base.pinyin,
    hanViet: input.hanViet?.trim() || base.hanViet,
    meaning: cleanMeaning,
    hskLevel: input.hskLevel?.trim() || base.hskLevel,
    partOfSpeech: input.partOfSpeech?.trim() || base.partOfSpeech,
    exampleHanzi: input.exampleHanzi?.trim() || base.exampleHanzi,
    examplePinyin: input.examplePinyin?.trim() || base.examplePinyin,
    exampleMeaning: input.exampleMeaning?.trim() || base.exampleMeaning,
  };
}

export function isStudentNeedsSupport(student: {
  totalPoints: number;
  status?: string;
}): boolean {
  return student.totalPoints < 90 || student.status === 'Cần kèm thêm';
}

export function createStudentRecord(
  input: {
    name: string;
    studentCode?: string;
    hskLevel?: 'HSK 1' | 'HSK 2' | 'HSK 3' | 'HSK 4' | string;
    initialPoints?: number;
  },
  existingCount = 12
): ClassStudentRecord {
  const cleanName = input.name.trim();
  const nextNumber = existingCount + 1;
  const cleanCode =
    (input.studentCode || '').trim() ||
    `HV-${String(nextNumber).padStart(3, '0')}`;
  const validLevels = ['HSK 1', 'HSK 2', 'HSK 3', 'HSK 4'] as const;
  const cleanLevel = validLevels.includes(input.hskLevel as any)
    ? (input.hskLevel as 'HSK 1' | 'HSK 2' | 'HSK 3' | 'HSK 4')
    : 'HSK 2';

  const rawPoints =
    typeof input.initialPoints === 'number' && !Number.isNaN(input.initialPoints)
      ? input.initialPoints
      : 95;
  const clampedPoints = Math.max(0, Math.min(100, Math.round(rawPoints)));

  const vocabCount = Math.min(
    18,
    Math.max(10, Math.round((clampedPoints / 100) * 18))
  );
  const writingPct = Math.min(99, Math.max(72, clampedPoints - 2));
  const quizCorrect = Math.min(
    10,
    Math.max(5, Math.round(clampedPoints / 10))
  );

  const needsSupport = clampedPoints < 90;

  return {
    id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    studentCode: cleanCode,
    hskLevel: cleanLevel,
    name: cleanName,
    vocabScore: `${vocabCount}/18 từ`,
    writingScore: `${writingPct}% độ chuẩn nét`,
    quizScore: `${quizCorrect}/10 câu đúng`,
    totalPoints: clampedPoints,
    status: needsSupport ? 'Cần kèm thêm' : 'Đã chấm AI',
    reviewWords: needsSupport ? ['温暖', '咱们'] : [],
    feedback: needsSupport
      ? `Học viên cấp độ ${cleanLevel} cần ôn tập thêm từ vựng và thứ tự nét viết cùng trợ lý Bin Bin AI.`
      : `Học viên mới (${cleanLevel}) tham gia lớp, nắm vững kiến thức nền tảng và hoàn thành bài tập xuất sắc.`,
  };
}

export function applyStudentSubmissionToRoster(
  roster: ClassStudentRecord[],
  submission: {
    studentId?: string;
    studentName: string;
    totalScore: number;
    learnedVocabCount: number;
    totalVocabCount: number;
    writingAccuracy: number;
    quizCorrectCount: number;
    quizTotalCount: number;
    reviewWords: string[];
  }
): ClassStudentRecord[] {
  const clampedTotal = Math.max(0, Math.min(100, Math.round(submission.totalScore)));
  const clampedWriting = Math.max(60, Math.min(100, Math.round(submission.writingAccuracy)));
  const cleanReview = Array.from(new Set(submission.reviewWords.filter(Boolean)));
  const needsSupport = clampedTotal < 90 || cleanReview.length >= 3;
  const status: ClassStudentRecord['status'] = needsSupport ? 'Cần kèm thêm' : 'Đã chấm AI';
  const nowLabel = 'Vừa nộp bài';

  const feedbackText =
    cleanReview.length > 0
      ? `Vừa nộp bài đạt ${clampedTotal}/100đ · Cần ôn lại từ: ${cleanReview.join(', ')}.`
      : `Hoàn thành xuất sắc bài tập tương tác (${clampedTotal}/100đ), nắm chắc toàn bộ từ vựng và nét viết.`;

  let matched = false;
  const updated = roster.map((st) => {
    const isMatch =
      (submission.studentId && st.id === submission.studentId) ||
      normalizeSearchText(st.name) === normalizeSearchText(submission.studentName);
    if (!isMatch) return st;
    matched = true;
    return {
      ...st,
      vocabScore: `${submission.learnedVocabCount}/${submission.totalVocabCount} từ`,
      writingScore: `${clampedWriting}% độ chuẩn nét`,
      quizScore: `${submission.quizCorrectCount}/${submission.quizTotalCount} câu đúng`,
      totalPoints: clampedTotal,
      status,
      reviewWords: cleanReview,
      lastSubmittedAt: nowLabel,
      feedback: feedbackText,
    };
  });

  if (!matched && submission.studentName.trim()) {
    const created = createStudentRecord(
      {
        name: submission.studentName.trim(),
        initialPoints: clampedTotal,
      },
      roster.length
    );
    return [
      {
        ...created,
        vocabScore: `${submission.learnedVocabCount}/${submission.totalVocabCount} từ`,
        writingScore: `${clampedWriting}% độ chuẩn nét`,
        quizScore: `${submission.quizCorrectCount}/${submission.quizTotalCount} câu đúng`,
        reviewWords: cleanReview,
        lastSubmittedAt: nowLabel,
        feedback: feedbackText,
      },
      ...roster,
    ];
  }

  return updated;
}

export function awardStudentBonusPoints(
  roster: ClassStudentRecord[],
  studentIdOrName: string,
  bonusPoints: number,
  reason = 'Trả lời xuất sắc Vòng quay gọi tên trên lớp'
): ClassStudentRecord[] {
  const delta = Math.round(bonusPoints);
  return roster.map((st) => {
    const isMatch =
      st.id === studentIdOrName ||
      normalizeSearchText(st.name) === normalizeSearchText(studentIdOrName);
    if (!isMatch) return st;

    const nextPoints = Math.max(0, Math.min(100, st.totalPoints + delta));
    const needsSupport = nextPoints < 90;
    return {
      ...st,
      totalPoints: nextPoints,
      status: needsSupport ? 'Cần kèm thêm' : 'Đã chấm AI',
      feedback: `🎁 +${delta}đ thưởng (${reason}) · Tổng điểm mới: ${nextPoints}/100đ.`,
    };
  });
}

export function filterClassroomStudents<
  T extends {
    name: string;
    studentCode?: string;
    hskLevel?: string;
    totalPoints: number;
    status?: string;
  }
>(
  students: T[],
  searchQuery: string,
  statusFilter: StudentStatusFilter = 'all'
): T[] {
  const normQuery = normalizeSearchText(searchQuery);
  return students.filter((st) => {
    const needsSupport = isStudentNeedsSupport(st);
    if (statusFilter === 'completed' && needsSupport) return false;
    if (statusFilter === 'needs_support' && !needsSupport) return false;

    if (!normQuery) return true;
    const normName = normalizeSearchText(st.name);
    const normCode = normalizeSearchText(st.studentCode || '');
    const normLevel = normalizeSearchText(st.hskLevel || '');
    return (
      normName.includes(normQuery) ||
      normCode.includes(normQuery) ||
      normLevel.includes(normQuery) ||
      st.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );
  });
}

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateStudentsCsvContent(
  students: ClassStudentRecord[]
): string {
  const BOM = '\uFEFF';
  const headers = [
    'STT',
    'Mã học viên',
    'Họ và tên',
    'Cấp độ',
    'Tiến độ từ vựng',
    'Độ chuẩn nét viết',
    'Quiz ngữ pháp',
    'Tổng điểm (100)',
    'Trạng thái',
    'Từ vựng cần ôn',
    'Nhận xét AI',
  ];

  const rows = students.map((st, idx) => {
    const statusLabel = isStudentNeedsSupport(st)
      ? 'Cần kèm thêm'
      : 'Đã hoàn thành';
    const reviewWordsText =
      st.reviewWords && st.reviewWords.length > 0
        ? st.reviewWords.join(' · ')
        : 'Đã thuộc hết';
    return [
      idx + 1,
      st.studentCode || `HV-${String(idx + 1).padStart(3, '0')}`,
      st.name,
      st.hskLevel || 'HSK 2',
      st.vocabScore,
      st.writingScore,
      st.quizScore,
      st.totalPoints,
      statusLabel,
      reviewWordsText,
      st.feedback,
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  return `${BOM}${[headers.join(','), ...rows].join('\r\n')}`;
}




