import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildContextualImagePrompt,
  buildSafeContextualSvgDataUrl,
  inferSemanticArchetype,
  resolveSemanticVisualProfile,
} from './vocabVisualEngine';

test('Auto Semantic Vocabulary Visual Engine maps family and people words to family_home and friends_community', () => {
  const jiaTing = resolveSemanticVisualProfile('家庭', 'gia đình, mái ấm', 'jiā tíng');
  assert.equal(jiaTing.archetype, 'family_home');
  assert.ok(jiaTing.photoUrls.length >= 3);
  assert.ok(jiaTing.sceneCaptionVi.includes('Gia đình'));

  const fuMu = resolveSemanticVisualProfile('父母', 'cha mẹ', 'fù mǔ');
  assert.equal(fuMu.archetype, 'family_home');

  const zanMen = resolveSemanticVisualProfile('咱们', 'chúng ta', 'zán men');
  assert.equal(zanMen.archetype, 'friends_community');
});

test('Auto Semantic Vocabulary Visual Engine maps appliances, tech, food, transport, and medical words accurately', () => {
  assert.equal(inferSemanticArchetype('空调', 'điều hòa'), 'appliance_ac');
  assert.equal(inferSemanticArchetype('洗衣机', 'máy giặt'), 'appliance_washer');
  assert.equal(inferSemanticArchetype('电脑', 'máy tính'), 'tech_device');
  assert.equal(inferSemanticArchetype('手机', 'điện thoại'), 'tech_device');
  assert.equal(inferSemanticArchetype('咖啡', 'cà phê'), 'food_coffee_tea');
  assert.equal(inferSemanticArchetype('茶', 'trà'), 'food_coffee_tea');
  assert.equal(inferSemanticArchetype('苹果', 'quả táo'), 'food_cuisine_fruit');
  assert.equal(inferSemanticArchetype('水果', 'hoa quả'), 'food_cuisine_fruit');
  assert.equal(inferSemanticArchetype('交通', 'giao thông'), 'transport_city');
  assert.equal(inferSemanticArchetype('医院', 'bệnh viện'), 'medical_hospital');
});

test('Auto Semantic Vocabulary Visual Engine maps animals, nature, school, and action/state words accurately', () => {
  assert.equal(inferSemanticArchetype('狗', 'chú chó'), 'animal_dog_cat');
  assert.equal(inferSemanticArchetype('猫', 'con mèo'), 'animal_dog_cat');
  assert.equal(inferSemanticArchetype('熊猫', 'gấu trúc'), 'animal_panda_bamboo');
  assert.equal(inferSemanticArchetype('龙', 'rồng'), 'mythic_dragon');
  assert.equal(inferSemanticArchetype('花园', 'vườn hoa'), 'nature_garden');
  assert.equal(inferSemanticArchetype('初中', 'trung học cơ sở'), 'school_study');
  assert.equal(inferSemanticArchetype('努力', 'nỗ lực'), 'work_effort');
  assert.equal(inferSemanticArchetype('温暖', 'ấm áp'), 'state_warm_sun');
  assert.equal(inferSemanticArchetype('愿意', 'sẵn lòng'), 'state_willing_heart');
  assert.equal(inferSemanticArchetype('换', 'đổi tiền'), 'action_exchange');
  assert.equal(inferSemanticArchetype('刻', '15 phút'), 'time_quarter_clock');
});

test('resolveSemanticVisualProfile prioritizes custom image URL when provided', () => {
  const customUrl = 'https://images.unsplash.com/photo-custom-test?w=800';
  const profile = resolveSemanticVisualProfile('家庭', 'gia đình', 'jiā tíng', customUrl);
  assert.equal(profile.photoUrls[0], customUrl);
  assert.ok(profile.photoUrls.length >= 4);
});

test('buildContextualImagePrompt and buildSafeContextualSvgDataUrl generate school-safe SVG data URIs with zero pollinations dependency', () => {
  const prompt = buildContextualImagePrompt(
    '明天',
    'ngày mai',
    '明天我们一起去北京看长城吧！'
  );
  assert.ok(prompt.toLowerCase().includes('great wall') || prompt.toLowerCase().includes('calendar'));
  const url = buildSafeContextualSvgDataUrl(
    '明天',
    'ngày mai',
    '明天我们一起去北京看长城吧！'
  );
  assert.ok(url.startsWith('data:image/svg+xml;charset=utf-8,'));
  assert.equal(url.includes('pollinations'), false);
});


