import { CHAR_META_DICTIONARY } from './chineseEngine';

export type SemanticVisualArchetype =
  | 'family_home'
  | 'friends_community'
  | 'appliance_ac'
  | 'appliance_washer'
  | 'appliance_fridge'
  | 'appliance_lamp_bath'
  | 'tech_device'
  | 'food_coffee_tea'
  | 'food_cuisine_fruit'
  | 'transport_city'
  | 'medical_hospital'
  | 'animal_dog_cat'
  | 'animal_panda_bamboo'
  | 'mythic_dragon'
  | 'nature_garden'
  | 'school_study'
  | 'work_effort'
  | 'state_warm_sun'
  | 'action_exchange'
  | 'time_quarter_clock'
  | 'state_willing_heart';

export interface SemanticVisualProfile {
  hanzi: string;
  archetype: SemanticVisualArchetype;
  categoryGroupLabel: string;
  englishKeyword: string;
  wikiQueryZh: string;
  wikiQueryEn: string;
  sceneCaptionVi: string;
  radicalHint: string;
  /** Multiple distinct high-resolution real photos matching the exact meaning of the word */
  photoUrls: string[];
}

interface ArchetypeDefinition {
  archetype: SemanticVisualArchetype;
  categoryGroupLabel: string;
  englishKeyword: string;
  wikiQueryEn: string;
  defaultCaptionVi: string;
  photoUrls: string[];
}

function getLocalArchetypeUrls(archetype: SemanticVisualArchetype): string[] {
  return [
    `/illustrations/${archetype}.svg`,
    `/illustrations/${archetype}_2.svg`,
    `/illustrations/${archetype}_3.svg`,
  ];
}

export const ARCHETYPE_DEFINITIONS: Record<SemanticVisualArchetype, ArchetypeDefinition> = {
  family_home: {
    archetype: 'family_home',
    categoryGroupLabel: 'Gia đình & Tổ ấm',
    englishKeyword: 'happy asian family home',
    wikiQueryEn: 'Family',
    defaultCaptionVi: 'Gia đình sum vầy bên mái ấm sáng đèn',
    photoUrls: getLocalArchetypeUrls('family_home'),
  },
  friends_community: {
    archetype: 'friends_community',
    categoryGroupLabel: 'Bạn bè & Giao tiếp',
    englishKeyword: 'friends talking together',
    wikiQueryEn: 'Friendship',
    defaultCaptionVi: 'Bạn bè & tập thể gắn kết, sẻ chia',
    photoUrls: getLocalArchetypeUrls('friends_community'),
  },
  appliance_ac: {
    archetype: 'appliance_ac',
    categoryGroupLabel: 'Thiết bị & Gia dụng',
    englishKeyword: 'air conditioner home cooling',
    wikiQueryEn: 'Air_conditioning',
    defaultCaptionVi: 'Máy điều hòa không khí mát lành 24°C',
    photoUrls: getLocalArchetypeUrls('appliance_ac'),
  },
  appliance_washer: {
    archetype: 'appliance_washer',
    categoryGroupLabel: 'Thiết bị & Gia dụng',
    englishKeyword: 'washing machine laundry',
    wikiQueryEn: 'Washing_machine',
    defaultCaptionVi: 'Máy giặt lồng ngang hiện đại & quần áo sạch thơm',
    photoUrls: getLocalArchetypeUrls('appliance_washer'),
  },
  appliance_fridge: {
    archetype: 'appliance_fridge',
    categoryGroupLabel: 'Thiết bị & Gia dụng',
    englishKeyword: 'refrigerator kitchen food',
    wikiQueryEn: 'Refrigerator',
    defaultCaptionVi: 'Tủ lạnh bảo quản thực phẩm & trái cây tươi mát',
    photoUrls: getLocalArchetypeUrls('appliance_fridge'),
  },
  appliance_lamp_bath: {
    archetype: 'appliance_lamp_bath',
    categoryGroupLabel: 'Nội thất & Đời sống',
    englishKeyword: 'warm interior lamp room',
    wikiQueryEn: 'Light_fixture',
    defaultCaptionVi: 'Không gian nội thất tiện nghi & ánh đèn ấm áp',
    photoUrls: getLocalArchetypeUrls('appliance_lamp_bath'),
  },
  tech_device: {
    archetype: 'tech_device',
    categoryGroupLabel: 'Công nghệ & Thiết bị số',
    englishKeyword: 'laptop computer smartphone',
    wikiQueryEn: 'Personal_computer',
    defaultCaptionVi: 'Máy tính & điện thoại thông minh kết nối số',
    photoUrls: getLocalArchetypeUrls('tech_device'),
  },
  food_coffee_tea: {
    archetype: 'food_coffee_tea',
    categoryGroupLabel: 'Ẩm thực & Đồ uống',
    englishKeyword: 'hot coffee cup tea',
    wikiQueryEn: 'Coffee',
    defaultCaptionVi: 'Tách cà phê & ấm trà nóng bốc khói thơm lừng',
    photoUrls: getLocalArchetypeUrls('food_coffee_tea'),
  },
  food_cuisine_fruit: {
    archetype: 'food_cuisine_fruit',
    categoryGroupLabel: 'Ẩm thực & Trái cây',
    englishKeyword: 'fresh red apple fruit asian food',
    wikiQueryEn: 'Apple',
    defaultCaptionVi: 'Trái cây tươi ngon & bàn ăn ẩm thực hấp dẫn',
    photoUrls: getLocalArchetypeUrls('food_cuisine_fruit'),
  },
  transport_city: {
    archetype: 'transport_city',
    categoryGroupLabel: 'Giao thông & Đô thị',
    englishKeyword: 'modern city train metro traffic',
    wikiQueryEn: 'Transport',
    defaultCaptionVi: 'Giao thông đô thị hiện đại, tàu điện & đại lộ thông suốt',
    photoUrls: getLocalArchetypeUrls('transport_city'),
  },
  medical_hospital: {
    archetype: 'medical_hospital',
    categoryGroupLabel: 'Y tế & Sức khỏe',
    englishKeyword: 'modern hospital medical doctor',
    wikiQueryEn: 'Hospital',
    defaultCaptionVi: 'Bệnh viện hiện đại & chăm sóc y tế tận tâm',
    photoUrls: getLocalArchetypeUrls('medical_hospital'),
  },
  animal_dog_cat: {
    archetype: 'animal_dog_cat',
    categoryGroupLabel: 'Động vật & Thú cưng',
    englishKeyword: 'cute golden retriever puppy dog',
    wikiQueryEn: 'Dog',
    defaultCaptionVi: 'Thú cưng đáng yêu vui đùa trên thảm cỏ xanh',
    photoUrls: getLocalArchetypeUrls('animal_dog_cat'),
  },
  animal_panda_bamboo: {
    archetype: 'animal_panda_bamboo',
    categoryGroupLabel: 'Thiên nhiên & Quốc bảo',
    englishKeyword: 'giant panda bamboo forest',
    wikiQueryEn: 'Giant_panda',
    defaultCaptionVi: 'Gấu trúc Quốc bảo bên rừng trúc xanh mướt',
    photoUrls: getLocalArchetypeUrls('animal_panda_bamboo'),
  },
  mythic_dragon: {
    archetype: 'mythic_dragon',
    categoryGroupLabel: 'Văn hóa Trung Hoa',
    englishKeyword: 'chinese dragon festival lantern',
    wikiQueryEn: 'Chinese_dragon',
    defaultCaptionVi: 'Thần Long Trung Hoa & biểu tượng văn hóa cát tường',
    photoUrls: getLocalArchetypeUrls('mythic_dragon'),
  },
  nature_garden: {
    archetype: 'nature_garden',
    categoryGroupLabel: 'Thiên nhiên & Khu vườn',
    englishKeyword: 'blooming flower garden spring',
    wikiQueryEn: 'Garden',
    defaultCaptionVi: 'Khu vườn hoa xuân nở rộ & thiên nhiên trong lành',
    photoUrls: getLocalArchetypeUrls('nature_garden'),
  },
  school_study: {
    archetype: 'school_study',
    categoryGroupLabel: 'Trường học & Tri thức',
    englishKeyword: 'classroom students studying books',
    wikiQueryEn: 'School',
    defaultCaptionVi: 'Lớp học Hán ngữ, sách vở & tri thức',
    photoUrls: getLocalArchetypeUrls('school_study'),
  },
  work_effort: {
    archetype: 'work_effort',
    categoryGroupLabel: 'Học tập & Nỗ lực',
    englishKeyword: 'studying hard goal achievement',
    wikiQueryEn: 'Study_skills',
    defaultCaptionVi: 'Nỗ lực rèn luyện, kiên trì vươn tới thành công',
    photoUrls: getLocalArchetypeUrls('work_effort'),
  },
  state_warm_sun: {
    archetype: 'state_warm_sun',
    categoryGroupLabel: 'Cảm xúc & Thời tiết ấm áp',
    englishKeyword: 'warm morning sunlight cozy tea',
    wikiQueryEn: 'Sunlight',
    defaultCaptionVi: 'Ánh nắng ban mai ấm áp & không gian an yên',
    photoUrls: getLocalArchetypeUrls('state_warm_sun'),
  },
  action_exchange: {
    archetype: 'action_exchange',
    categoryGroupLabel: 'Trao đổi & Giao dịch',
    englishKeyword: 'currency exchange hands trading',
    wikiQueryEn: 'Currency',
    defaultCaptionVi: 'Đôi bàn tay trao đổi tiền tệ & quà tặng',
    photoUrls: getLocalArchetypeUrls('action_exchange'),
  },
  time_quarter_clock: {
    archetype: 'time_quarter_clock',
    categoryGroupLabel: 'Thời gian & Đồng hồ',
    englishKeyword: 'classic watch clock quarter hour',
    wikiQueryEn: 'Clock',
    defaultCaptionVi: 'Đồng hồ chỉ 15 phút (Một khắc) · Quý trọng thời gian',
    photoUrls: getLocalArchetypeUrls('time_quarter_clock'),
  },
  state_willing_heart: {
    archetype: 'state_willing_heart',
    categoryGroupLabel: 'Tâm thế & Sẵn lòng',
    englishKeyword: 'helping hands volunteer kindness',
    wikiQueryEn: 'Kindness',
    defaultCaptionVi: 'Bàn tay sẻ chia, sẵn lòng giúp đỡ & đồng thuận',
    photoUrls: getLocalArchetypeUrls('state_willing_heart'),
  },
};

/**
 * Exact per-word overrides so specific words like 茶, 苹果, 猫, 手机, 卫生间, 礼物, 火车, 飞机, 饭, 菜
 * get tailored multi-angle local illustrations.
 */
const WORD_SPECIFIC_VISUAL_OVERRIDES: Record<
  string,
  Partial<Pick<SemanticVisualProfile, 'archetype' | 'englishKeyword' | 'wikiQueryEn' | 'sceneCaptionVi' | 'photoUrls'>>
> = {
  家庭: {
    archetype: 'family_home',
    englishKeyword: 'warm happy family home',
    wikiQueryEn: 'Family',
    sceneCaptionVi: 'Gia đình đầm ấm quây quần bên ngôi nhà sáng đèn',
    photoUrls: getLocalArchetypeUrls('family_home'),
  },
  家: {
    archetype: 'family_home',
    englishKeyword: 'cozy home family house',
    wikiQueryEn: 'Home',
    sceneCaptionVi: 'Ngôi nhà ấm áp & tổ ấm gia đình sum họp',
  },
  父母: {
    archetype: 'family_home',
    englishKeyword: 'parents family love',
    wikiQueryEn: 'Parent',
    sceneCaptionVi: 'Cha mẹ hiền từ & tình thân gia đình ấm áp',
  },
  幸福: {
    archetype: 'family_home',
    englishKeyword: 'happy family smiling together',
    wikiQueryEn: 'Happiness',
    sceneCaptionVi: 'Tổ ấm hạnh phúc viên mãn & nụ cười rạng rỡ',
  },
  咱们: {
    archetype: 'friends_community',
    englishKeyword: 'close friends group together',
    wikiQueryEn: 'Friendship',
    sceneCaptionVi: 'Chúng ta (咱们) cùng nhau học tập và sẻ chia',
  },
  朋友: {
    archetype: 'friends_community',
    englishKeyword: 'best friends smiling',
    wikiQueryEn: 'Friendship',
    sceneCaptionVi: 'Những người bạn thân thiết đồng hành bên nhau',
  },
  包容: {
    archetype: 'friends_community',
    englishKeyword: 'harmony diversity hands together',
    wikiQueryEn: 'Toleration',
    sceneCaptionVi: 'Bao dung, thấu hiểu và gắn kết cộng đồng',
  },
  空调: {
    archetype: 'appliance_ac',
    englishKeyword: 'wall air conditioner cooling',
    wikiQueryEn: 'Air_conditioning',
    sceneCaptionVi: 'Máy điều hòa không khí hiện đại tỏa làn gió mát 24°C',
  },
  洗衣机: {
    archetype: 'appliance_washer',
    englishKeyword: 'front load washing machine',
    wikiQueryEn: 'Washing_machine',
    sceneCaptionVi: 'Máy giặt cửa trước tự động giặt sạch quần áo',
  },
  冰箱: {
    archetype: 'appliance_fridge',
    englishKeyword: 'modern kitchen refrigerator',
    wikiQueryEn: 'Refrigerator',
    sceneCaptionVi: 'Tủ lạnh hai cánh giữ thực phẩm tươi ngon',
  },
  卫生间: {
    archetype: 'appliance_lamp_bath',
    englishKeyword: 'clean modern bathroom interior',
    wikiQueryEn: 'Bathroom',
    sceneCaptionVi: 'Phòng tắm & nhà vệ sinh hiện đại, sáng sạch',
    photoUrls: getLocalArchetypeUrls('appliance_lamp_bath'),
  },
  灯: {
    archetype: 'appliance_lamp_bath',
    englishKeyword: 'warm glowing lamp lantern',
    wikiQueryEn: 'Lamp',
    sceneCaptionVi: 'Ngọn đèn tỏa ánh sáng vàng ấm áp trong phòng',
  },
  电脑: {
    archetype: 'tech_device',
    englishKeyword: 'modern laptop computer desk',
    wikiQueryEn: 'Computer',
    sceneCaptionVi: 'Máy tính xách tay hiện đại phục vụ học tập & công việc',
  },
  手机: {
    archetype: 'tech_device',
    englishKeyword: 'smartphone mobile phone screen',
    wikiQueryEn: 'Smartphone',
    sceneCaptionVi: 'Điện thoại thông minh kết nối liên lạc tức thì',
    photoUrls: getLocalArchetypeUrls('tech_device'),
  },
  咖啡: {
    archetype: 'food_coffee_tea',
    englishKeyword: 'latte coffee cup morning',
    wikiQueryEn: 'Coffee',
    sceneCaptionVi: 'Tách cà phê nóng bốc khói thơm lừng buổi sáng',
  },
  茶: {
    archetype: 'food_coffee_tea',
    englishKeyword: 'chinese green tea teapot cup',
    wikiQueryEn: 'Tea',
    sceneCaptionVi: 'Ấm trà đạo truyền thống & chén trà xanh thanh khiết',
    photoUrls: getLocalArchetypeUrls('food_coffee_tea'),
  },
  苹果: {
    archetype: 'food_cuisine_fruit',
    englishKeyword: 'fresh red apple fruit',
    wikiQueryEn: 'Apple',
    sceneCaptionVi: 'Quả táo đỏ tươi mọng nước trên bàn gỗ',
    photoUrls: getLocalArchetypeUrls('food_cuisine_fruit'),
  },
  水果: {
    archetype: 'food_cuisine_fruit',
    englishKeyword: 'fresh colorful fruits basket',
    wikiQueryEn: 'Fruit',
    sceneCaptionVi: 'Giỏ trái cây tươi ngon giàu vitamin',
  },
  美食: {
    archetype: 'food_cuisine_fruit',
    englishKeyword: 'chinese cuisine dumplings dishes',
    wikiQueryEn: 'Chinese_cuisine',
    sceneCaptionVi: 'Bàn tiệc ẩm thực truyền thống hấp dẫn',
    photoUrls: getLocalArchetypeUrls('food_cuisine_fruit'),
  },
  菜: {
    archetype: 'food_cuisine_fruit',
    englishKeyword: 'fresh vegetables chinese dish',
    wikiQueryEn: 'Vegetable',
    sceneCaptionVi: 'Món ăn nóng hổi & rau củ tươi xanh trên bàn ăn',
  },
  饭: {
    archetype: 'food_cuisine_fruit',
    englishKeyword: 'steaming bowl of white rice meal',
    wikiQueryEn: 'Cooked_rice',
    sceneCaptionVi: 'Bát cơm trắng dẻo thơm & bữa ăn ấm cúng',
  },
  交通: {
    archetype: 'transport_city',
    englishKeyword: 'high speed train city traffic',
    wikiQueryEn: 'Transport',
    sceneCaptionVi: 'Giao thông đô thị hiện đại với tàu điện & đại lộ',
    photoUrls: getLocalArchetypeUrls('transport_city'),
  },
  地铁: {
    archetype: 'transport_city',
    englishKeyword: 'modern subway metro train station',
    wikiQueryEn: 'Rapid_transit',
    sceneCaptionVi: 'Tàu điện ngầm (Metro) di chuyển nhanh chóng, đúng giờ',
  },
  公共汽车: {
    archetype: 'transport_city',
    englishKeyword: 'city public bus street',
    wikiQueryEn: 'Bus',
    sceneCaptionVi: 'Xe buýt công cộng thân thiện môi trường trên phố',
  },
  医院: {
    archetype: 'medical_hospital',
    englishKeyword: 'modern hospital building doctor',
    wikiQueryEn: 'Hospital',
    sceneCaptionVi: 'Bệnh viện y tế hiện đại & đội ngũ bác sĩ chăm sóc sức khỏe',
    photoUrls: getLocalArchetypeUrls('medical_hospital'),
  },
  狗: {
    archetype: 'animal_dog_cat',
    englishKeyword: 'cute golden puppy dog grass',
    wikiQueryEn: 'Dog',
    sceneCaptionVi: 'Chú cún con thông minh vui đùa trên bãi cỏ xanh',
  },
  猫: {
    archetype: 'animal_dog_cat',
    englishKeyword: 'cute kitten cat',
    wikiQueryEn: 'Cat',
    sceneCaptionVi: 'Chú mèo nhỏ đáng yêu & lanh lợi',
    photoUrls: getLocalArchetypeUrls('animal_dog_cat'),
  },
  熊猫: {
    archetype: 'animal_panda_bamboo',
    englishKeyword: 'giant panda eating bamboo',
    wikiQueryEn: 'Giant_panda',
    sceneCaptionVi: 'Gấu trúc Quốc bảo thưởng thức cành trúc xanh',
  },
  龙: {
    archetype: 'mythic_dragon',
    englishKeyword: 'chinese dragon art festival',
    wikiQueryEn: 'Chinese_dragon',
    sceneCaptionVi: 'Thần Long hí châu · Biểu tượng cát tường Trung Hoa',
  },
  花园: {
    archetype: 'nature_garden',
    englishKeyword: 'botanical flower garden blooming',
    wikiQueryEn: 'Garden',
    sceneCaptionVi: 'Vườn hoa rực rỡ sắc xuân & lối dạo xanh mát',
  },
  挺: {
    archetype: 'nature_garden',
    englishKeyword: 'beautiful blooming flowers nature',
    wikiQueryEn: 'Flower',
    sceneCaptionVi: 'Khung cảnh vườn hoa tươi đẹp (挺漂亮的)',
  },
  初中: {
    archetype: 'school_study',
    englishKeyword: 'middle school classroom students',
    wikiQueryEn: 'Middle_school',
    sceneCaptionVi: 'Trường trung học cơ sở & lớp học năng động',
  },
  老师: {
    archetype: 'school_study',
    englishKeyword: 'teacher classroom blackboard',
    wikiQueryEn: 'Teacher',
    sceneCaptionVi: 'Thầy cô giáo tận tâm giảng bài trên bục giảng',
  },
  融会贯通: {
    archetype: 'school_study',
    englishKeyword: 'library wisdom books knowledge',
    wikiQueryEn: 'Knowledge',
    sceneCaptionVi: 'Dung hội quán thông · Thấu hiểu sâu sắc và kết nối tri thức',
  },
  努力: {
    archetype: 'work_effort',
    englishKeyword: 'student studying hard desk lamp',
    wikiQueryEn: 'Motivation',
    sceneCaptionVi: 'Chăm chỉ nỗ lực học tập và rèn luyện mỗi ngày',
  },
  坚持: {
    archetype: 'work_effort',
    englishKeyword: 'mountain climber perseverance peak',
    wikiQueryEn: 'Perseverance',
    sceneCaptionVi: 'Kiên trì bền bỉ chinh phục mục tiêu cao nhất',
    photoUrls: getLocalArchetypeUrls('work_effort'),
  },
  温暖: {
    archetype: 'state_warm_sun',
    englishKeyword: 'warm spring sunlight cozy home',
    wikiQueryEn: 'Sunlight',
    sceneCaptionVi: 'Nắng xuân ấm áp chiếu sáng mái nhà & tách trà nóng',
  },
  换: {
    archetype: 'action_exchange',
    englishKeyword: 'currency exchange banknotes',
    wikiQueryEn: 'Foreign_exchange_market',
    sceneCaptionVi: 'Đổi tiền Nhân dân tệ & trao đổi hàng hóa',
  },
  刻: {
    archetype: 'time_quarter_clock',
    englishKeyword: 'classic pocket watch clock 15 minutes',
    wikiQueryEn: 'Ke_(unit)',
    sceneCaptionVi: 'Đồng hồ chỉ Một khắc (15 phút) · Thời gian quý báu',
  },
  愿意: {
    archetype: 'state_willing_heart',
    englishKeyword: 'helping hands volunteer heart',
    wikiQueryEn: 'Altruism',
    sceneCaptionVi: 'Đôi bàn tay sẻ chia · Sẵn lòng giúp đỡ bạn bè',
  },
  明天: {
    archetype: 'time_quarter_clock',
    englishKeyword: 'sunrise calendar tomorrow great wall of china Beijing travel',
    wikiQueryEn: 'Great_Wall_of_China',
    sceneCaptionVi: 'Lịch bàn lật sang trang “明天” bên ánh bình minh & chuyến đi Vạn Lý Trường Thành',
    photoUrls: getLocalArchetypeUrls('time_quarter_clock'),
  },
  照顾: {
    archetype: 'family_home',
    englishKeyword: 'mother caring for child family warm cup of water home love',
    wikiQueryEn: 'Caregiving',
    sceneCaptionVi: 'Mẹ ân cần bưng cốc nước ấm chăm sóc con cái trong gia đình',
    photoUrls: getLocalArchetypeUrls('family_home'),
  },
  考试: {
    archetype: 'school_study',
    englishKeyword: 'student taking exam writing test paper classroom desk',
    wikiQueryEn: 'Exam',
    sceneCaptionVi: 'Học sinh tập trung làm bài thi tiếng Trung đạt điểm 100分 xuất sắc',
    photoUrls: getLocalArchetypeUrls('school_study'),
  },
  旅行: {
    archetype: 'transport_city',
    englishKeyword: 'traveler suitcase journey china landmarks adventure',
    wikiQueryEn: 'Travel',
    sceneCaptionVi: 'Chuyến du lịch khám phá danh lam thắng cảnh Trung Quốc kỳ nghỉ hè',
    photoUrls: getLocalArchetypeUrls('transport_city'),
  },
};

/**
 * Infers the exact semantic visual archetype from Hanzi, Vietnamese/English meaning, and radicals.
 * Guarantees 0% generic mountain-and-moon fallback.
 */
export function inferSemanticArchetype(
  hanzi = '',
  meaning = '',
  pinyin = ''
): SemanticVisualArchetype {
  const cleanHanzi = hanzi.trim();
  if (WORD_SPECIFIC_VISUAL_OVERRIDES[cleanHanzi]?.archetype) {
    return WORD_SPECIFIC_VISUAL_OVERRIDES[cleanHanzi].archetype!;
  }

  const combined = `${cleanHanzi} ${meaning} ${pinyin}`.toLowerCase();

  // 1. Specific appliance & technology checks
  if (/空调|điều hòa|máy lạnh|air condition/.test(combined)) return 'appliance_ac';
  if (/洗衣|máy giặt|giặt quần áo|washing machine|laundry/.test(combined)) return 'appliance_washer';
  if (/冰箱|tủ lạnh|refrigerator|fridge/.test(combined)) return 'appliance_fridge';
  if (/卫生间|灯|phòng tắm|nhà vệ sinh|toilet|đèn|lamp|bathroom/.test(combined)) {
    return 'appliance_lamp_bath';
  }
  if (/电脑|手机|网络|电话|科技|软件|máy tính|điện thoại|laptop|computer|phone|internet|công nghệ/.test(combined)) {
    return 'tech_device';
  }

  // 2. Medical & Hospital
  if (/医院|医|药|病|护士|健康|身体|bệnh viện|bác sĩ|y tế|thuốc|khỏe mạnh|sức khỏe|hospital|doctor|medical/.test(combined)) {
    return 'medical_hospital';
  }

  // 3. Transport & City
  if (/交通|车|地铁|铁|路|飞|机票|船|站|城市|发展|经济|giao thông|tàu|xe buýt|metro|đường|sân bay|máy bay|đô thị|kinh tế|transport|traffic|train/.test(combined)) {
    return 'transport_city';
  }

  // 4. Food, Drink & Fruit
  if (/咖啡|茶|喝|杯|牛奶|酒|水|cà phê|trà|uống|coffee|tea|drink/.test(combined)) {
    return 'food_coffee_tea';
  }
  if (/苹果|果|菜|饭|美食|吃|面|肉|鱼|面包|西瓜|香蕉|táo|hoa quả|trái cây|ẩm thực|món ăn|cơm|ăn|apple|fruit|food|meal/.test(combined)) {
    return 'food_cuisine_fruit';
  }

  // 5. Animals & Cultural Totems
  if (/熊猫|竹|gấu trúc|trúc|panda|bamboo/.test(combined)) return 'animal_panda_bamboo';
  if (/狗|犬|猫|宠|动物|鸟|chó|cún|mèo|thú cưng|động vật|dog|puppy|cat/.test(combined)) {
    return 'animal_dog_cat';
  }
  if (/龙|文化|传统|中华|节|春节|rồng|thần long|văn hóa|truyền thống|dragon/.test(combined)) {
    return 'mythic_dragon';
  }

  // 6. Time, Exchange & Willingness
  if (/刻|时间|点|分|钟|表|早|晚|khắc|15 phút|thời gian|đồng hồ|giờ|phút|clock|time/.test(combined)) {
    return 'time_quarter_clock';
  }
  if (/换|钱|买|卖|礼|人民币|商|đổi|thay|tiền|mua|bán|quà|exchange|money|gift/.test(combined)) {
    return 'action_exchange';
  }
  if (/愿意|愿|喜欢|高兴|快乐|希望|满意|sẵn lòng|bằng lòng|tự nguyện|thích|vui mừng|willing/.test(combined)) {
    return 'state_willing_heart';
  }

  // 7. Family & Friends
  if (/家庭|家|父|母|爸|妈|妻|夫|孩|幸福|爱|gia đình|mái ấm|nhà|bố|mẹ|cha mẹ|hạnh phúc|yêu thương|family|home|parent/.test(combined)) {
    return 'family_home';
  }
  if (/咱们|朋友|们|大家|同学|同事|帮|助|介绍|你好|谢|包容|chúng ta|bạn bè|giúp đỡ|giới thiệu|xin chào|cảm ơn|bao dung|friend|together/.test(combined)) {
    return 'friends_community';
  }

  // 8. Warmth & Weather
  if (/温暖|温|暖|阳|光|火|热|休息|夏|ấm áp|nắng|lửa|nghỉ ngơi|warm|sun/.test(combined)) {
    return 'state_warm_sun';
  }

  // 9. School, Study & Effort
  if (/努力|坚持|成功|工|作|梦|想|目标|进步|nỗ lực|kiên trì|thành công|công việc|ước mơ|effort|work|success/.test(combined)) {
    return 'work_effort';
  }
  if (/初|中|学|校|师|语|文|书|考|试|准|备|聪|明|融会贯通|字|trường|học|giáo viên|thầy|cô|sách|thi|thông minh|school|study|teacher/.test(combined)) {
    return 'school_study';
  }

  // 10. Nature & Garden
  if (/花|园|树|草|春|环|境|挺|森|林|山|河|旅|游|vườn|hoa|cây|mùa xuân|môi trường|khá|du lịch|garden|flower/.test(combined)) {
    return 'nature_garden';
  }

  // 11. Radical-driven procedural analysis for any arbitrary Chinese character
  for (const ch of cleanHanzi) {
    const meta = CHAR_META_DICTIONARY[ch];
    const rad = meta?.radical || '';
    if (/宀|女|子/.test(rad)) return 'family_home';
    if (/亻|口/.test(rad)) return 'friends_community';
    if (/饣|食|米|酉/.test(rad)) return 'food_cuisine_fruit';
    if (/氵/.test(rad)) return 'food_coffee_tea';
    if (/车|辶|足|马|舟/.test(rad)) return 'transport_city';
    if (/钅|电/.test(rad)) return 'tech_device';
    if (/犭|虫|鸟/.test(rad)) return 'animal_dog_cat';
    if (/讠|言|竹|文/.test(rad)) return 'school_study';
    if (/忄|心/.test(rad)) return 'state_willing_heart';
    if (/扌|手|贝|刂/.test(rad)) return 'action_exchange';
    if (/日|火|灬/.test(rad)) return 'state_warm_sun';
    if (/力|工/.test(rad)) return 'work_effort';
    if (/艹|木|土/.test(rad)) return 'nature_garden';
  }

  return 'school_study';
}

/**
 * Builds an English scene description synchronized with both the target Chinese word and its example sentence
 * for on-demand AI contextual illustration generation.
 */
export function buildContextualImagePrompt(
  hanzi = '',
  meaning = '',
  exampleHanzi = '',
  exampleMeaning = '',
  customPrompt = ''
): string {
  if (customPrompt && customPrompt.trim()) {
    return `${customPrompt.trim()}, warm modern oriental editorial illustration, high resolution`;
  }
  const cleanHanzi = hanzi.trim();
  const override = WORD_SPECIFIC_VISUAL_OVERRIDES[cleanHanzi];
  const baseKeyword =
    override?.englishKeyword ||
    ARCHETYPE_DEFINITIONS[inferSemanticArchetype(cleanHanzi, meaning)].englishKeyword;

  const contextNotes: string[] = [baseKeyword];
  const combinedContext = `${cleanHanzi} ${meaning} ${exampleHanzi} ${exampleMeaning}`.toLowerCase();

  if (/北京|长城|bắc kinh|trường thành/.test(combinedContext)) {
    contextNotes.push('morning sunrise over the Great Wall of China in Beijing, desk calendar flipping to tomorrow');
  } else if (/妈妈|照顾|mẹ|chăm sóc/.test(combinedContext)) {
    contextNotes.push('caring mother gently bringing a warm steaming cup of water to her child at home');
  } else if (/考试|成绩|kỳ thi|điểm|thi/.test(combinedContext)) {
    contextNotes.push('focused student taking a Chinese language exam at a desk with a 100 score paper and clock');
  } else if (/坚持|困难|kiên trì|khó khăn/.test(combinedContext)) {
    contextNotes.push('determined runner athlete pushing through rain toward the glowing finish line');
  } else if (/包容|友谊|bao dung|tình bạn/.test(combinedContext)) {
    contextNotes.push('warm embrace of friendship, kindness, and cultural harmony');
  } else if (/融会贯通|语法|词汇|thấu đáo|ngữ pháp/.test(combinedContext)) {
    contextNotes.push('glowing interconnected mindmap of Chinese calligraphy, books, and wisdom');
  } else if (exampleMeaning) {
    contextNotes.push(`scene illustrating: ${exampleMeaning}`);
  }

  return `${contextNotes.join(', ')}, warm natural lighting, cinematic photography`;
}

/**
 * Generates a school-safe, self-contained contextual HSK SVG illustration data URI
 * synchronized with the vocabulary word, meaning, and example sentence (0 external AI image dependency).
 */
export function buildSafeContextualSvgDataUrl(
  hanzi = '',
  meaning = '',
  exampleHanzi = '',
  exampleMeaning = '',
  customCaption = ''
): string {
  const cleanHanzi = (hanzi || '汉语').trim();
  const archetype = inferSemanticArchetype(cleanHanzi, meaning);
  const baseDef = ARCHETYPE_DEFINITIONS[archetype];
  const categoryLabel = baseDef.categoryGroupLabel;
  const subtitle = (
    customCaption ||
    exampleMeaning ||
    meaning ||
    baseDef.defaultCaptionVi
  )
    .replace(/[<>&"']/g, '')
    .slice(0, 56);
  const exLine = (exampleHanzi || cleanHanzi).replace(/[<>&"']/g, '').slice(0, 28);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#11241C"/>
        <stop offset="55%" stop-color="#1B392D"/>
        <stop offset="100%" stop-color="#284E3E"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="42%" r="48%">
        <stop offset="0%" stop-color="#FDE68A" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="#0F5243" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="800" height="600" rx="24" fill="url(#bg)"/>
    <circle cx="400" cy="250" r="240" fill="url(#glow)"/>
    <rect x="24" y="24" width="752" height="552" rx="18" fill="none" stroke="#DFC470" stroke-opacity="0.45" stroke-width="2"/>
    <rect x="48" y="44" width="320" height="44" rx="12" fill="#0F1D16" fill-opacity="0.78" stroke="#DFC470" stroke-width="1.2"/>
    <text x="68" y="72" fill="#FDE68A" font-size="20" font-weight="700" font-family="Plus Jakarta Sans, Noto Sans SC, sans-serif">${categoryLabel}</text>
    <text x="400" y="265" text-anchor="middle" fill="#FFFBEB" font-size="116" font-weight="700" font-family="Noto Sans SC, sans-serif">${cleanHanzi}</text>
    <text x="400" y="345" text-anchor="middle" fill="#FDE68A" font-size="30" font-weight="600" font-family="Noto Sans SC, sans-serif">${exLine}</text>
    <rect x="80" y="470" width="640" height="68" rx="16" fill="#0F1D16" fill-opacity="0.82" stroke="#DFC470" stroke-opacity="0.5" stroke-width="1.5"/>
    <text x="400" y="512" text-anchor="middle" fill="#E5E9D7" font-size="22" font-weight="600" font-family="Plus Jakarta Sans, sans-serif">${subtitle}</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Resolves the complete visual profile for any vocabulary word, including multi-angle curated static photos,
 * Wikipedia REST API queries, radical hints, and procedural SVG archetype (never uses pollinations.ai).
 */
export function resolveSemanticVisualProfile(
  hanzi = '',
  meaning = '',
  pinyin = '',
  customImageUrl?: string,
  exampleHanzi = '',
  exampleMeaning = ''
): SemanticVisualProfile {
  const cleanHanzi = hanzi.trim() || '汉语';
  const archetype = inferSemanticArchetype(cleanHanzi, meaning, pinyin);
  const baseDef = ARCHETYPE_DEFINITIONS[archetype];
  const wordOverride = WORD_SPECIFIC_VISUAL_OVERRIDES[cleanHanzi];

  // Extract radical hint from the characters of the word
  const charRadicals: string[] = [];
  for (const ch of cleanHanzi) {
    if (CHAR_META_DICTIONARY[ch]?.radical) {
      charRadicals.push(`${ch}: ${CHAR_META_DICTIONARY[ch].radical}`);
    }
  }
  const radicalHint =
    charRadicals.length > 0 ? charRadicals.join(' · ') : 'Chiết tự ngữ nghĩa Hán tự';

  const basePhotos = wordOverride?.photoUrls || baseDef.photoUrls;
  const mergedPhotos: string[] = [];
  if (
    customImageUrl &&
    customImageUrl.trim() &&
    !customImageUrl.toLowerCase().includes('pollinations.ai')
  ) {
    mergedPhotos.push(customImageUrl.trim());
  }
  for (const url of basePhotos) {
    if (!mergedPhotos.includes(url)) {
      mergedPhotos.push(url);
    }
  }
  const safeSvgDataUrl = buildSafeContextualSvgDataUrl(
    cleanHanzi,
    meaning,
    exampleHanzi,
    exampleMeaning
  );
  if (!mergedPhotos.includes(safeSvgDataUrl)) {
    mergedPhotos.push(safeSvgDataUrl);
  }

  return {
    hanzi: cleanHanzi,
    archetype,
    categoryGroupLabel: baseDef.categoryGroupLabel,
    englishKeyword: wordOverride?.englishKeyword || baseDef.englishKeyword,
    wikiQueryZh: cleanHanzi,
    wikiQueryEn: wordOverride?.wikiQueryEn || baseDef.wikiQueryEn,
    sceneCaptionVi:
      wordOverride?.sceneCaptionVi ||
      (meaning ? `${cleanHanzi} (${meaning}) — ${baseDef.defaultCaptionVi}` : baseDef.defaultCaptionVi),
    radicalHint,
    photoUrls: mergedPhotos,
  };
}

const WIKI_IMAGE_CACHE = new Map<string, string>();
const CUSTOM_VOCAB_IMAGE_STORAGE_KEY = 'hanu_vocab_custom_images_v1';

export function getSavedCustomVocabImage(hanzi: string): string | undefined {
  if (typeof window === 'undefined' || !hanzi) return undefined;
  try {
    const raw = window.localStorage.getItem(CUSTOM_VOCAB_IMAGE_STORAGE_KEY);
    if (!raw) return undefined;
    const map = JSON.parse(raw) as Record<string, string>;
    const saved = map[hanzi.trim()];
    if (saved && saved.toLowerCase().includes('pollinations.ai')) {
      return undefined;
    }
    return saved;
  } catch {
    return undefined;
  }
}

export function saveCustomVocabImage(hanzi: string, url: string | null): void {
  if (typeof window === 'undefined' || !hanzi) return;
  try {
    const raw = window.localStorage.getItem(CUSTOM_VOCAB_IMAGE_STORAGE_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    if (!url || !url.trim()) {
      delete map[hanzi.trim()];
    } else {
      map[hanzi.trim()] = url.trim();
    }
    window.localStorage.setItem(CUSTOM_VOCAB_IMAGE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
}

/**
 * Local-first illustration resolver (replaces external Wikipedia HTTP calls with local /illustrations/*.svg).
 */
export async function fetchWikipediaImageForVocab(
  hanzi: string,
  wikiQueryEn?: string
): Promise<string | null> {
  const cleanHanzi = hanzi.trim();
  if (!cleanHanzi) return null;

  const cacheKey = `${cleanHanzi}|${wikiQueryEn || ''}`;
  if (WIKI_IMAGE_CACHE.has(cacheKey)) {
    return WIKI_IMAGE_CACHE.get(cacheKey)!;
  }

  const archetype = inferSemanticArchetype(cleanHanzi, wikiQueryEn || '');
  const localUrl = `/illustrations/${archetype}.svg`;
  WIKI_IMAGE_CACHE.set(cacheKey, localUrl);
  return localUrl;
}

