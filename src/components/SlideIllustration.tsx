import React, { useState, useEffect, useMemo } from 'react';
import { IllustrationCategoryKey } from '../data/chineseData';
import {
  fetchWikipediaImageForVocab,
  getSavedCustomVocabImage,
  resolveSemanticVisualProfile,
  saveCustomVocabImage,
} from '../utils/vocabVisualEngine';
import { Image as ImageIcon, Palette, RefreshCw, Link2, Check, X } from 'lucide-react';
import { SafeImage } from './SafeImage';

interface SlideIllustrationProps {
  illustrationKey: IllustrationCategoryKey;
  hanzi?: string;
  pinyin?: string;
  meaning?: string;
  exampleHanzi?: string;
  exampleMeaning?: string;
  imageUrl?: string;
  className?: string;
  onUpdateImageUrl?: (newUrl: string) => void;
}

export const VOCAB_PHOTO_MAP: Record<string, string> = {
  家庭: '/illustrations/family_home.svg',
  家: '/illustrations/family_home.svg',
  父母: '/illustrations/family_home_2.svg',
  幸福: '/illustrations/family_home_3.svg',
  咱们: '/illustrations/friends_community.svg',
  换: '/illustrations/action_exchange.svg',
  空调: '/illustrations/appliance_ac.svg',
  洗衣机: '/illustrations/appliance_washer.svg',
  花园: '/illustrations/nature_garden.svg',
  挺: '/illustrations/nature_garden_2.svg',
  初中: '/illustrations/school_study.svg',
  刻: '/illustrations/time_quarter_clock.svg',
  愿意: '/illustrations/state_willing_heart.svg',
  龙: '/illustrations/mythic_dragon.svg',
  温暖: '/illustrations/state_warm_sun.svg',
  狗: '/illustrations/animal_dog_cat.svg',
  猫: '/illustrations/animal_dog_cat_2.svg',
  熊猫: '/illustrations/animal_panda_bamboo.svg',
  咖啡: '/illustrations/food_coffee_tea.svg',
  茶: '/illustrations/food_coffee_tea_2.svg',
  苹果: '/illustrations/food_cuisine_fruit.svg',
  水果: '/illustrations/food_cuisine_fruit_2.svg',
  美食: '/illustrations/food_cuisine_fruit_3.svg',
  菜: '/illustrations/food_cuisine_fruit_2.svg',
  饭: '/illustrations/food_cuisine_fruit_3.svg',
  交通: '/illustrations/transport_city.svg',
  医院: '/illustrations/medical_hospital.svg',
  电脑: '/illustrations/tech_device.svg',
  手机: '/illustrations/tech_device_2.svg',
  努力: '/illustrations/work_effort.svg',
  坚持: '/illustrations/work_effort_2.svg',
  包容: '/illustrations/friends_community_2.svg',
  融会贯通: '/illustrations/school_study_2.svg',
  冰箱: '/illustrations/appliance_fridge.svg',
  卫生间: '/illustrations/appliance_lamp_bath_2.svg',
  灯: '/illustrations/appliance_lamp_bath.svg',
  学校: '/illustrations/school_study_3.svg',
  老师: '/illustrations/school_study_2.svg',
  朋友: '/illustrations/friends_community.svg',
  明天: '/illustrations/time_quarter_clock_2.svg',
  照顾: '/illustrations/family_home_2.svg',
  考试: '/illustrations/school_study.svg',
  旅行: '/illustrations/transport_city_2.svg',
};

export const SlideIllustration: React.FC<SlideIllustrationProps> = ({
  hanzi = '',
  pinyin = '',
  meaning = '',
  exampleHanzi = '',
  exampleMeaning = '',
  imageUrl,
  className = 'w-full h-full',
  onUpdateImageUrl,
}) => {
  const [viewMode, setViewMode] = useState<'photo' | 'svg'>('photo');
  const [photoAngleIdx, setPhotoAngleIdx] = useState(0);
  const [wikiPhotoUrl, setWikiPhotoUrl] = useState<string | null>(null);
  const [savedCustomUrl, setSavedCustomUrl] = useState<string | undefined>(() =>
    getSavedCustomVocabImage(hanzi)
  );
  const [isCustomUrlEditorOpen, setIsCustomUrlEditorOpen] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Sync saved custom image & reset angle when switching words
  useEffect(() => {
    const customFromStorage = getSavedCustomVocabImage(hanzi);
    setSavedCustomUrl(customFromStorage);
    setCustomUrlInput(customFromStorage || imageUrl || '');
    setPhotoAngleIdx(0);
    setWikiPhotoUrl(null);
    setImageError(false);
    setImageLoaded(false);
    setIsCustomUrlEditorOpen(false);
  }, [hanzi, imageUrl]);

  const semanticProfile = useMemo(
    () =>
      resolveSemanticVisualProfile(
        hanzi,
        meaning,
        pinyin,
        savedCustomUrl || imageUrl,
        exampleHanzi,
        exampleMeaning
      ),
    [hanzi, meaning, pinyin, savedCustomUrl, imageUrl, exampleHanzi, exampleMeaning]
  );

  // Real-time Wikipedia / Wikimedia Commons REST API lookup for any word
  useEffect(() => {
    let cancelled = false;
    if (!hanzi) return;
    fetchWikipediaImageForVocab(hanzi, semanticProfile.wikiQueryEn).then((wikiUrl) => {
      if (cancelled || !wikiUrl) return;
      setWikiPhotoUrl(wikiUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [hanzi, semanticProfile.wikiQueryEn]);

  // Combine custom -> curated multi-angle -> Wikipedia REST API thumbnail
  const availablePhotos = useMemo(() => {
    const list = [...semanticProfile.photoUrls];
    if (wikiPhotoUrl && !list.includes(wikiPhotoUrl)) {
      // Insert Wikipedia encyclopedic photo as second angle (or first if not in preset map)
      if (!VOCAB_PHOTO_MAP[hanzi.trim()]) {
        list.unshift(wikiPhotoUrl);
      } else {
        list.splice(1, 0, wikiPhotoUrl);
      }
    }
    return list;
  }, [semanticProfile.photoUrls, wikiPhotoUrl, hanzi]);

  const safeAngleIdx = photoAngleIdx % Math.max(1, availablePhotos.length);
  const activePhotoUrl = availablePhotos[safeAngleIdx] || semanticProfile.photoUrls[0];

  const handleCyclePhotoAngle = () => {
    setImageError(false);
    setImageLoaded(false);
    if (viewMode === 'svg') {
      setViewMode('photo');
      setPhotoAngleIdx(0);
      return;
    }
    setPhotoAngleIdx((prev) => (prev + 1) % Math.max(1, availablePhotos.length));
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customUrlInput.trim();
    if (!trimmed) {
      saveCustomVocabImage(hanzi, null);
      setSavedCustomUrl(undefined);
      setPhotoAngleIdx(0);
      setIsCustomUrlEditorOpen(false);
      return;
    }
    saveCustomVocabImage(hanzi, trimmed);
    setSavedCustomUrl(trimmed);
    setPhotoAngleIdx(0);
    setImageError(false);
    setImageLoaded(false);
    setViewMode('photo');
    setIsCustomUrlEditorOpen(false);
    if (onUpdateImageUrl) {
      onUpdateImageUrl(trimmed);
    }
  };

  // Shared decorative Halora Sage & Gold frame + badge overlay + calligraphic watermark
  const renderSceneFrameAndBadge = (
    defaultHanzi: string,
    defaultLabel: string,
    themeTone = '#182A21'
  ) => {
    const titleHanzi = hanzi || defaultHanzi;
    const subText = meaning ? `${pinyin ? `${pinyin} · ` : ''}${meaning}` : defaultLabel;
    return (
      <g>
        {/* Subtle Calligraphic Seal Watermark in Top-Right Background */}
        <g transform="translate(332, 82)" opacity="0.18">
          <rect
            x="-28"
            y="-28"
            width="56"
            height="56"
            rx="10"
            fill="#DC2626"
            stroke="#FDE68A"
            strokeWidth="1.5"
          />
          <text
            x="0"
            y="10"
            textAnchor="middle"
            fill="#FFFBEB"
            fontSize="26"
            fontWeight="700"
            fontFamily="'Noto Serif SC', 'Noto Sans SC', serif"
          >
            {titleHanzi.slice(0, 2)}
          </text>
        </g>

        {/* Subtle Ambient Floating Gold & Sage Dust Motes */}
        {[
          { cx: 68, cy: 48, r: 1.8, dur: '4.2s', dy: -8 },
          { cx: 184, cy: 36, r: 2.2, dur: '5.1s', dy: -10 },
          { cx: 264, cy: 62, r: 1.6, dur: '3.8s', dy: -7 },
          { cx: 348, cy: 42, r: 2.0, dur: '4.6s', dy: -9 },
        ].map((p, idx) => (
          <circle
            key={`mote-${idx}`}
            cx={p.cx}
            cy={p.cy}
            r={p.r}
            fill="#FDE68A"
            opacity="0.65"
          >
            <animate
              attributeName="cy"
              values={`${p.cy};${p.cy + p.dy};${p.cy}`}
              dur={p.dur}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.25;0.8;0.25"
              dur={p.dur}
              repeatCount="indefinite"
            />
          </circle>
        ))}

        {/* Inner Classical Halora Gold Filigree Border */}
        <rect
          x="5"
          y="5"
          width="390"
          height="210"
          rx="11"
          fill="none"
          stroke="#DFC470"
          strokeOpacity="0.32"
          strokeWidth="1"
        />

        {/* Top-Left Halora Sage & Gold Glassmorphic Badge */}
        <rect
          x="12"
          y="12"
          width="196"
          height="42"
          rx="10"
          fill={themeTone}
          fillOpacity="0.9"
          stroke="#DFC470"
          strokeWidth="1.2"
        />
        <circle cx="24" cy="33" r="3.5" fill="#DFC470" />
        <text
          x="34"
          y="29"
          fill="#F7E29C"
          fontSize="14.5"
          fontWeight="700"
          fontFamily="'Noto Sans SC', sans-serif"
        >
          {titleHanzi}
        </text>
        <text
          x="34"
          y="44"
          fill="#E5E9D7"
          fontSize="9.5"
          fontWeight="500"
          fontFamily="'Plus Jakarta Sans', sans-serif"
        >
          {subText.length > 28 ? `${subText.slice(0, 27)}…` : subText}
        </text>

        {/* Bottom-Left Semantic Category & Radical Tag */}
        <rect
          x="12"
          y="188"
          width="248"
          height="20"
          rx="6"
          fill="#0F1D16"
          fillOpacity="0.82"
          stroke="#DFC470"
          strokeOpacity="0.45"
          strokeWidth="0.9"
        />
        <text
          x="20"
          y="201"
          fill="#FDE68A"
          fontSize="8.5"
          fontWeight="600"
          fontFamily="'Plus Jakarta Sans', sans-serif"
        >
          {`${semanticProfile.categoryGroupLabel} · ${semanticProfile.radicalHint}`.slice(0, 42)}
        </text>
      </g>
    );
  };

  /**
   * Dynamic Procedural SVG Composer (0% generic mountain-and-moon fallback).
   * Synthesizes a dedicated scene tailored to the word's SemanticVisualArchetype.
   */
  const renderProceduralSvgArtwork = () => {
    const cleanWord = hanzi.trim();

    // 1. Word-specific Contextual Story SVGs (100% synchronized with vocabulary & example sentence)
    if (cleanWord === '明天') {
      return (
        <svg
          viewBox="0 0 400 220"
          className="w-full h-full"
          data-testid="procedural-svg-mingtian"
          role="img"
          aria-label="Minh họa ngữ cảnh 明天 (Ngày mai): Lịch bàn lật sang trang Ngày mai bên ánh bình minh & chuyến đi Vạn Lý Trường Thành"
        >
          <defs>
            <linearGradient id="mingtianSunriseBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#142822" />
              <stop offset="50%" stopColor="#2A4B3C" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>
          <rect width="400" height="220" rx="14" fill="url(#mingtianSunriseBg)" />
          {/* Sunrise Window with Great Wall Silhouette */}
          <g transform="translate(226, 46)">
            <rect x="0" y="0" width="138" height="106" rx="10" fill="#FEF3C7" stroke="#DFC470" strokeWidth="2.5" />
            <circle cx="96" cy="36" r="22" fill="#F59E0B" opacity="0.85" />
            <path d="M0 84 Q38 62 74 78 T138 66 L138 106 L0 106 Z" fill="#065F46" />
            {/* Great Wall Watchtower */}
            <rect x="44" y="54" width="22" height="22" fill="#92400E" stroke="#FDE68A" strokeWidth="1" />
            <line x1="69" y1="0" x2="69" y2="106" stroke="#92400E" strokeWidth="2" opacity="0.45" />
          </g>
          {/* Flipping Desk Calendar showing 明天 */}
          <g transform="translate(64, 62)">
            <rect x="0" y="8" width="132" height="108" rx="12" fill="#FFFBEB" stroke="#DFC470" strokeWidth="2.5" />
            <rect x="0" y="8" width="132" height="30" rx="10" fill="#B91C1C" />
            <circle cx="32" cy="8" r="5" fill="#FDE68A" />
            <circle cx="100" cy="8" r="5" fill="#FDE68A" />
            <text x="66" y="28" textAnchor="middle" fill="#FEF08A" fontSize="11" fontWeight="800">
              TOMORROW · 计划
            </text>
            <text x="66" y="76" textAnchor="middle" fill="#1E3227" fontSize="30" fontWeight="900">
              明天
            </text>
            <text x="66" y="98" textAnchor="middle" fill="#B45309" fontSize="10.5" fontWeight="700">
              去北京看长城 ☀
            </text>
          </g>
          {renderSceneFrameAndBadge('明天 · míngtiān', semanticProfile.sceneCaptionVi, '#182A21')}
        </svg>
      );
    }

    if (cleanWord === '照顾') {
      return (
        <svg
          viewBox="0 0 400 220"
          className="w-full h-full"
          data-testid="procedural-svg-zhaogu"
          role="img"
          aria-label="Minh họa ngữ cảnh 照顾 (Chăm sóc): Mẹ ân cần bưng cốc nước ấm chăm sóc con"
        >
          <rect width="400" height="220" rx="14" fill="#1E2F26" />
          <circle cx="206" cy="112" r="78" fill="#FDE68A" fillOpacity="0.14" />
          {/* Caring Mother (Left) handing warm cup to Child (Right) */}
          <g transform="translate(132, 118)">
            <path d="M-24 52 C-24 14, 24 14, 24 52 Z" fill="#E11D48" stroke="#FDE68A" strokeWidth="1.8" />
            <circle cx="0" cy="-6" r="16" fill="#FDE68A" stroke="#B45309" strokeWidth="1.6" />
            <path d="M-6 -4 Q0 2 6 -4" fill="none" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" />
          </g>
          {/* Warm Cup of Water / Soup with Heart Steam in Center */}
          <g transform="translate(202, 116)">
            <path
              d="M0 -36 C0 -46, -14 -46, -14 -34 C-14 -24, 0 -16, 0 -10 C0 -16, 14 -24, 14 -34 C14 -46, 0 -46, 0 -36 Z"
              fill="#F43F5E"
              stroke="#FEF08A"
              strokeWidth="1.4"
            />
            <rect x="-16" y="0" width="32" height="26" rx="6" fill="#FFFBEB" stroke="#F59E0B" strokeWidth="2" />
            <path d="M-6 -6 Q-10 -14 -4 -20" fill="none" stroke="#FDE68A" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 -6 Q10 -14 4 -20" fill="none" stroke="#FDE68A" strokeWidth="2" strokeLinecap="round" />
          </g>
          {/* Child Receiving Care */}
          <g transform="translate(272, 126)">
            <path d="M-20 44 C-20 12, 20 12, 20 44 Z" fill="#059669" stroke="#A7F3D0" strokeWidth="1.8" />
            <circle cx="0" cy="-4" r="14" fill="#FEF08A" stroke="#B45309" strokeWidth="1.6" />
            <path d="M-5 -2 Q0 3 5 -2" fill="none" stroke="#78350F" strokeWidth="1.6" strokeLinecap="round" />
          </g>
          {renderSceneFrameAndBadge('照顾 · zhàogù', semanticProfile.sceneCaptionVi, '#1E3227')}
        </svg>
      );
    }

    if (cleanWord === '考试') {
      return (
        <svg
          viewBox="0 0 400 220"
          className="w-full h-full"
          data-testid="procedural-svg-kaoshi"
          role="img"
          aria-label="Minh họa ngữ cảnh 考试 (Kỳ thi): Học sinh làm bài thi tiếng Trung đạt 100 điểm"
        >
          <rect width="400" height="220" rx="14" fill="#152720" />
          {/* Exam Paper with 100分 A+ */}
          <g transform="translate(92, 54)">
            <rect x="0" y="0" width="128" height="122" rx="8" fill="#FFFBEB" stroke="#DFC470" strokeWidth="2.2" />
            <text x="20" y="28" fill="#1E3227" fontSize="12" fontWeight="800">
              HSK 汉语考试
            </text>
            <text x="96" y="34" textAnchor="middle" fill="#DC2626" fontSize="22" fontWeight="900">
              100分
            </text>
            <line x1="80" y1="38" x2="114" y2="38" stroke="#DC2626" strokeWidth="2" />
            <line x1="18" y1="54" x2="108" y2="54" stroke="#94A3B8" strokeWidth="2" />
            <line x1="18" y1="74" x2="96" y2="74" stroke="#94A3B8" strokeWidth="2" />
            <line x1="18" y1="94" x2="104" y2="94" stroke="#94A3B8" strokeWidth="2" />
          </g>
          {/* Focused Student & Exam Clock */}
          <g transform="translate(278, 92)">
            <circle cx="38" cy="-24" r="20" fill="#FAF5E8" stroke="#DFC470" strokeWidth="2" />
            <line x1="38" y1="-24" x2="38" y2="-36" stroke="#1E3227" strokeWidth="2" />
            <line x1="38" y1="-24" x2="48" y2="-24" stroke="#DC2626" strokeWidth="2" />
            <circle cx="-12" cy="14" r="16" fill="#FDE68A" stroke="#B45309" strokeWidth="1.6" />
            <path d="M-36 68 C-36 34, 12 34, 12 68 Z" fill="#0284C7" stroke="#BAE6FD" strokeWidth="1.8" />
          </g>
          {renderSceneFrameAndBadge('考试 · kǎoshì', semanticProfile.sceneCaptionVi, '#182A21')}
        </svg>
      );
    }

    if (cleanWord === '坚持') {
      return (
        <svg
          viewBox="0 0 400 220"
          className="w-full h-full"
          data-testid="procedural-svg-jianchi"
          role="img"
          aria-label="Minh họa ngữ cảnh 坚持 (Kiên trì): Vận động viên kiên trì vượt mưa gió về đích"
        >
          <rect width="400" height="220" rx="14" fill="#142620" />
          {/* Rain lines representing obstacles */}
          {[70, 120, 170, 220].map((rx) => (
            <line key={rx} x1={rx} y1="48" x2={rx - 14} y2="82" stroke="#7DD3FC" strokeWidth="1.8" opacity="0.55" />
          ))}
          {/* Running Track & Finish Line */}
          <path d="M40 172 L360 172" stroke="#D97706" strokeWidth="8" strokeLinecap="round" />
          <g transform="translate(292, 68)">
            <line x1="0" y1="0" x2="0" y2="104" stroke="#FEF08A" strokeWidth="3.5" />
            <line x1="56" y1="0" x2="56" y2="104" stroke="#FEF08A" strokeWidth="3.5" />
            <rect x="0" y="14" width="56" height="24" rx="4" fill="#DC2626" stroke="#FEF08A" strokeWidth="1.5" />
            <text x="28" y="30" textAnchor="middle" fill="#FFFBEB" fontSize="11" fontWeight="900">
              坚持到底
            </text>
          </g>
          {/* Determined Runner Striding Forward */}
          <g transform="translate(178, 122)">
            <circle cx="0" cy="-22" r="13" fill="#FDE68A" stroke="#B45309" strokeWidth="1.6" />
            <path d="M-14 14 L8 -6 L24 14" fill="none" stroke="#10B981" strokeWidth="8" strokeLinecap="round" />
            <path d="M-18 44 L0 14 L22 42" fill="none" stroke="#F59E0B" strokeWidth="6" strokeLinecap="round" />
          </g>
          {renderSceneFrameAndBadge('坚持 · jiānchí', semanticProfile.sceneCaptionVi, '#182A21')}
        </svg>
      );
    }

    if (cleanWord === '包容') {
      return (
        <svg
          viewBox="0 0 400 220"
          className="w-full h-full"
          data-testid="procedural-svg-baorong"
          role="img"
          aria-label="Minh họa ngữ cảnh 包容 (Bao dung): Vòng tay thấu hiểu và sẻ chia ấm áp"
        >
          <rect width="400" height="220" rx="14" fill="#182C23" />
          <circle cx="206" cy="114" r="68" fill="#FDE68A" fillOpacity="0.16" stroke="#DFC470" strokeWidth="1.8" />
          <g transform="translate(206, 114)">
            <path
              d="M-48 16 C-28 -24, 28 -24, 48 16"
              fill="none"
              stroke="#34D399"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M-48 -8 C-24 28, 24 28, 48 -8"
              fill="none"
              stroke="#FBBF24"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <circle cx="0" cy="0" r="24" fill="#FFFBEB" stroke="#DFC470" strokeWidth="2" />
            <text x="0" y="6" textAnchor="middle" fill="#1E3227" fontSize="15" fontWeight="900">
              包容
            </text>
          </g>
          {renderSceneFrameAndBadge('包容 · bāoróng', semanticProfile.sceneCaptionVi, '#182A21')}
        </svg>
      );
    }

    if (cleanWord === '融会贯通') {
      return (
        <svg
          viewBox="0 0 400 220"
          className="w-full h-full"
          data-testid="procedural-svg-ronghuiguantong"
          role="img"
          aria-label="Minh họa ngữ cảnh 融会贯通: Sơ đồ mạng lưới kết nối Từ vựng, Ngữ pháp và Văn hóa"
        >
          <rect width="400" height="220" rx="14" fill="#13241D" />
          {/* Glowing Mindmap Lines */}
          <line x1="122" y1="82" x2="206" y2="116" stroke="#FDE68A" strokeWidth="2.5" strokeDasharray="4 3" />
          <line x1="292" y1="82" x2="206" y2="116" stroke="#FDE68A" strokeWidth="2.5" strokeDasharray="4 3" />
          <line x1="206" y1="168" x2="206" y2="116" stroke="#34D399" strokeWidth="2.5" />
          {/* Nodes */}
          <circle cx="122" cy="82" r="24" fill="#065F46" stroke="#6EE7B7" strokeWidth="2" />
          <text x="122" y="86" textAnchor="middle" fill="#FFFBEB" fontSize="11" fontWeight="800">
            词汇
          </text>
          <circle cx="292" cy="82" r="24" fill="#92400E" stroke="#FDE68A" strokeWidth="2" />
          <text x="292" y="86" textAnchor="middle" fill="#FFFBEB" fontSize="11" fontWeight="800">
            语法
          </text>
          <circle cx="206" cy="116" r="32" fill="#FFFBEB" stroke="#DFC470" strokeWidth="3" />
          <text x="206" y="121" textAnchor="middle" fill="#1E3227" fontSize="12.5" fontWeight="900">
            融会贯通
          </text>
          {renderSceneFrameAndBadge('融会贯通', semanticProfile.sceneCaptionVi, '#182A21')}
        </svg>
      );
    }

    switch (semanticProfile.archetype) {
      case 'family_home':
        return (
          <svg
            viewBox="0 0 400 220"
            className="w-full h-full"
            data-testid="procedural-svg-family_home"
            role="img"
            aria-label={`Minh họa Gia đình & Tổ ấm cho từ ${hanzi}`}
          >
            <defs>
              <linearGradient id="familyWarmBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1E2F26" />
                <stop offset="50%" stopColor="#3E3227" />
                <stop offset="100%" stopColor="#6D4428" />
              </linearGradient>
              <radialGradient id="homeWindowGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="400" height="220" rx="14" fill="url(#familyWarmBg)" />

            {/* Warm Courtyard Ground */}
            <path d="M0 156 Q200 138 400 158 L400 220 L0 220 Z" fill="#2A3E31" />
            <path d="M0 176 Q180 164 400 178 L400 220 L0 220 Z" fill="#1B2A21" />

            {/* Cozy Illuminated Family House (Ngôi nhà sáng đèn ấm áp) */}
            <g transform="translate(36, 58)">
              <circle cx="72" cy="58" r="68" fill="url(#homeWindowGlow)" />
              {/* Chimney with gentle hearth smoke */}
              <rect x="104" y="6" width="14" height="26" rx="2" fill="#7C2D12" stroke="#DFC470" strokeWidth="1.2" />
              <circle cx="111" cy="-2" r="5" fill="#FDE68A" opacity="0.45">
                <animate attributeName="cy" values="-2;-14;-2" dur="3.2s" repeatCount="indefinite" />
              </circle>
              {/* Traditional Warm Roof */}
              <path
                d="M-12 42 Q72 -6 156 42 L144 48 Q72 8 0 48 Z"
                fill="#991B1B"
                stroke="#FDE68A"
                strokeWidth="1.8"
              />
              {/* House Walls */}
              <rect x="6" y="42" width="132" height="72" rx="8" fill="#FFFBEB" stroke="#D97706" strokeWidth="2" />
              {/* Warm Glowing Windows */}
              <rect x="20" y="56" width="42" height="32" rx="4" fill="#FBBF24" stroke="#78350F" strokeWidth="2" />
              <line x1="41" y1="56" x2="41" y2="88" stroke="#78350F" strokeWidth="1.5" />
              <line x1="20" y1="72" x2="62" y2="72" stroke="#78350F" strokeWidth="1.5" />
              {/* Red Wooden Door & Lanterns */}
              <rect x="84" y="56" width="34" height="58" rx="4" fill="#B91C1C" stroke="#FDE68A" strokeWidth="1.5" />
              <circle cx="16" cy="48" r="6" fill="#EF4444" stroke="#FDE047" strokeWidth="1.2" />
              <circle cx="128" cy="48" r="6" fill="#EF4444" stroke="#FDE047" strokeWidth="1.2" />
            </g>

            {/* Family Members Gathered Together (Bố, Mẹ & Con quây quần) */}
            <g transform="translate(248, 134)">
              {/* Heart of Family Love Above */}
              <path
                d="M12 -46 C12 -54, 0 -54, 0 -44 C0 -36, 12 -28, 12 -24 C12 -28, 24 -36, 24 -44 C24 -54, 12 -54, 12 -46 Z"
                fill="#F43F5E"
                stroke="#FDE68A"
                strokeWidth="1.2"
              />
              {/* Father (Left) */}
              <g transform="translate(-34, 0)">
                <path d="M-16 42 C-16 14, 16 14, 16 42 Z" fill="#1D4ED8" stroke="#FDE68A" strokeWidth="1.4" />
                <circle cx="0" cy="2" r="13" fill="#FDE68A" stroke="#B45309" strokeWidth="1.5" />
                <path d="M-5 4 Q0 8 5 4" fill="none" stroke="#78350F" strokeWidth="1.6" strokeLinecap="round" />
              </g>
              {/* Child (Center) */}
              <g transform="translate(12, 10)">
                <path d="M-13 32 C-13 10, 13 10, 13 32 Z" fill="#F59E0B" stroke="#FFFBEB" strokeWidth="1.4" />
                <circle cx="0" cy="2" r="10.5" fill="#FEF08A" stroke="#B45309" strokeWidth="1.5" />
                <path d="M-4 4 Q0 7 4 4" fill="none" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" />
              </g>
              {/* Mother (Right) */}
              <g transform="translate(56, 2)">
                <path d="M-15 40 C-15 14, 15 14, 15 40 Z" fill="#E11D48" stroke="#FDE68A" strokeWidth="1.4" />
                <circle cx="0" cy="2" r="12.5" fill="#FDE68A" stroke="#B45309" strokeWidth="1.5" />
                <path d="M-4.5 4 Q0 8 4.5 4" fill="none" stroke="#78350F" strokeWidth="1.6" strokeLinecap="round" />
              </g>
            </g>

            {renderSceneFrameAndBadge(hanzi || '家庭 · jiātíng', semanticProfile.sceneCaptionVi, '#1E3227')}
          </svg>
        );

      case 'friends_community':
        return (
          <svg
            viewBox="0 0 400 220"
            className="w-full h-full"
            data-testid="procedural-svg-friends_community"
            role="img"
            aria-label={`Minh họa Bạn bè & Cộng đồng cho từ ${hanzi}`}
          >
            <defs>
              <linearGradient id="friendsBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#142820" />
                <stop offset="55%" stopColor="#234838" />
                <stop offset="100%" stopColor="#3B624E" />
              </linearGradient>
            </defs>
            <rect width="400" height="220" rx="14" fill="url(#friendsBg)" />
            <circle cx="206" cy="112" r="74" fill="#FDE68A" fillOpacity="0.1" stroke="#DFC470" strokeDasharray="4 4" />

            {/* Three Friends Communicating Around Table */}
            <g transform="translate(200, 128)">
              {/* Round Table */}
              <ellipse cx="0" cy="36" rx="76" ry="18" fill="#432818" stroke="#DFC470" strokeWidth="2" />
              {/* Friend Left */}
              <g transform="translate(-54, -10)">
                <path d="M-16 38 C-16 12, 16 12, 16 38 Z" fill="#059669" stroke="#A7F3D0" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="12" fill="#FDE68A" />
              </g>
              {/* Friend Center */}
              <g transform="translate(0, -20)">
                <path d="M-17 42 C-17 14, 17 14, 17 42 Z" fill="#D97706" stroke="#FEF08A" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="13" fill="#FEF08A" />
              </g>
              {/* Friend Right */}
              <g transform="translate(54, -10)">
                <path d="M-16 38 C-16 12, 16 12, 16 38 Z" fill="#2563EB" stroke="#BFDBFE" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="12" fill="#FDE68A" />
              </g>
              {/* Speech Bubble with Hanzi */}
              <rect x="-34" y="-64" width="68" height="26" rx="12" fill="#FFFBEB" stroke="#DFC470" strokeWidth="1.8" />
              <text x="0" y="-47" textAnchor="middle" fill="#1E3227" fontSize="13" fontWeight="700">
                {hanzi || '咱们 · 朋友'}
              </text>
            </g>

            {renderSceneFrameAndBadge(hanzi || '咱们 · 朋友', semanticProfile.sceneCaptionVi, '#182A21')}
          </svg>
        );

      case 'appliance_ac':
        return (
          <svg
            viewBox="0 0 400 220"
            className="w-full h-full"
            data-testid="procedural-svg-appliance_ac"
            role="img"
            aria-label={`Minh họa Máy điều hòa cho từ ${hanzi}`}
          >
            <defs>
              <linearGradient id="acRoomBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0F2429" />
                <stop offset="60%" stopColor="#1A3E46" />
                <stop offset="100%" stopColor="#285E6B" />
              </linearGradient>
            </defs>
            <rect width="400" height="220" rx="14" fill="url(#acRoomBg)" />
            {/* Wall Air Conditioner Unit */}
            <g transform="translate(88, 62)">
              <rect x="0" y="0" width="224" height="58" rx="12" fill="#F8FAFC" stroke="#DFC470" strokeWidth="2.2" />
              <line x1="16" y1="44" x2="208" y2="44" stroke="#94A3B8" strokeWidth="2.5" />
              <rect x="164" y="14" width="42" height="20" rx="5" fill="#0F172A" />
              <text x="185" y="28" textAnchor="middle" fill="#38BDF8" fontSize="11" fontWeight="700">
                24°C ❄
              </text>
              {/* Cool Breeze Waves */}
              {[0, 1, 2].map((i) => (
                <path
                  key={`breeze-${i}`}
                  d={`M ${38 + i * 62} 66 Q ${22 + i * 62} 96, ${48 + i * 62} 118`}
                  fill="none"
                  stroke="#7DD3FC"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="6 4"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    values="20;0"
                    dur="1.6s"
                    repeatCount="indefinite"
                  />
                </path>
              ))}
            </g>
            {renderSceneFrameAndBadge(hanzi || '空调 · kōngtiáo', semanticProfile.sceneCaptionVi, '#0F172A')}
          </svg>
        );

      case 'appliance_washer':
        return (
          <svg
            viewBox="0 0 400 220"
            className="w-full h-full"
            data-testid="procedural-svg-appliance_washer"
            role="img"
            aria-label={`Minh họa Máy giặt cho từ ${hanzi}`}
          >
            <rect width="400" height="220" rx="14" fill="#152824" />
            <rect x="0" y="176" width="400" height="44" fill="#0E1C19" />
            {/* Front-Load Washing Machine */}
            <g transform="translate(138, 42)">
              <rect x="0" y="0" width="124" height="142" rx="14" fill="#F8FAFC" stroke="#DFC470" strokeWidth="2.2" />
              <line x1="8" y1="28" x2="116" y2="28" stroke="#CBD5E1" strokeWidth="1.5" />
              <circle cx="96" cy="14" r="6" fill="#0EA5E9" />
              <rect x="16" y="10" width="42" height="10" rx="3" fill="#0F172A" />
              {/* Rotating Drum with Water & Bubbles */}
              <circle cx="62" cy="84" r="40" fill="#0F172A" stroke="#9B8A3E" strokeWidth="4.5" />
              <circle cx="62" cy="84" r="32" fill="#0284C7" fillOpacity="0.45" />
              <path
                d="M32 84 Q47 72 62 84 T92 84 L92 114 L32 114 Z"
                fill="#38BDF8"
                fillOpacity="0.7"
              />
              <circle cx="50" cy="74" r="5" fill="#E0F2FE" />
              <circle cx="74" cy="68" r="3.5" fill="#E0F2FE" />
              <circle cx="64" cy="94" r="4" fill="#E0F2FE" />
            </g>
            {renderSceneFrameAndBadge(hanzi || '洗衣机 · xǐyījī', semanticProfile.sceneCaptionVi, '#0F172A')}
          </svg>
        );

      case 'appliance_fridge':
        return (
          <svg
            viewBox="0 0 400 220"
            className="w-full h-full"
            data-testid="procedural-svg-appliance_fridge"
            role="img"
            aria-label={`Minh họa Tủ lạnh cho từ ${hanzi}`}
          >
            <rect width="400" height="220" rx="14" fill="#142725" />
            <g transform="translate(142, 34)">
              <rect x="0" y="0" width="116" height="156" rx="12" fill="#E2E8F0" stroke="#DFC470" strokeWidth="2.2" />
              <line x1="4" y1="62" x2="112" y2="62" stroke="#64748B" strokeWidth="2" />
              {/* Handles */}
              <rect x="96" y="22" width="5" height="28" rx="2.5" fill="#475569" />
              <rect x="96" y="76" width="5" height="44" rx="2.5" fill="#475569" />
              {/* Digital Display */}
              <rect x="24" y="18" width="36" height="16" rx="3" fill="#0F172A" />
              <text x="42" y="29" textAnchor="middle" fill="#38BDF8" fontSize="9" fontWeight="700">
                4°C ❄
              </text>
            </g>
            {renderSceneFrameAndBadge(hanzi || '冰箱 · bīngxiāng', semanticProfile.sceneCaptionVi, '#0F172A')}
          </svg>
        );

      case 'appliance_lamp_bath':
        return (
          <svg
            viewBox="0 0 400 220"
            className="w-full h-full"
            data-testid="procedural-svg-appliance_lamp_bath"
            role="img"
            aria-label={`Minh họa Nội thất & Ánh đèn cho từ ${hanzi}`}
          >
            <rect width="400" height="220" rx="14" fill="#1B2821" />
            <circle cx="212" cy="96" r="76" fill="#FDE68A" fillOpacity="0.22" />
            {/* Warm Glowing Lantern / Lamp */}
            <g transform="translate(212, 86)">
              <line x1="0" y1="-64" x2="0" y2="-28" stroke="#DFC470" strokeWidth="3" />
              <ellipse cx="0" cy="0" rx="38" ry="28" fill="#F59E0B" stroke="#FEF08A" strokeWidth="2.2" />
              <ellipse cx="0" cy="0" rx="24" ry="26" fill="#FEF08A" opacity="0.85" />
              <rect x="-14" y="-32" width="28" height="6" rx="2" fill="#78350F" />
              <rect x="-14" y="26" width="28" height="6" rx="2" fill="#78350F" />
            </g>
            {renderSceneFrameAndBadge(hanzi || '灯 · 房间', semanticProfile.sceneCaptionVi, '#182A21')}
          </svg>
        );

      case 'tech_device':
        return (
          <svg
            viewBox="0 0 400 220"
            className="w-full h-full"
            data-testid="procedural-svg-tech_device"
            role="img"
            aria-label={`Minh họa Thiết bị Công nghệ cho từ ${hanzi}`}
          >
            <rect width="400" height="220" rx="14" fill="#111E27" />
            {/* Modern Laptop */}
            <g transform="translate(94, 58)">
              <rect x="16" y="0" width="144" height="92" rx="8" fill="#1E293B" stroke="#DFC470" strokeWidth="2.2" />
              <rect x="24" y="8" width="128" height="76" rx="4" fill="#0F172A" />
              <text x="88" y="48" textAnchor="middle" fill="#38BDF8" fontSize="22" fontWeight="700">
                {hanzi || '电脑'}
              </text>
              <path d="M0 92 L176 92 L164 106 L12 106 Z" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1.5" />
            </g>
            {/* Smartphone */}
            <g transform="translate(292, 68)">
              <rect x="0" y="0" width="52" height="94" rx="9" fill="#1E293B" stroke="#FDE68A" strokeWidth="2" />
              <rect x="5" y="8" width="42" height="74" rx="4" fill="#0284C7" />
              <circle cx="26" cy="88" r="2.5" fill="#FDE68A" />
              <text x="26" y="48" textAnchor="middle" fill="#FFFBEB" fontSize="13" fontWeight="700">
                5G
              </text>
            </g>
            {renderSceneFrameAndBadge(hanzi || '电脑 · 手机', semanticProfile.sceneCaptionVi, '#0F172A')}
          </svg>
        );

      case 'food_coffee_tea':
        return (
          <svg
            viewBox="0 0 400 220"
            className="w-full h-full"
            data-testid="procedural-svg-food_coffee_tea"
            role="img"
            aria-label={`Minh họa Cà phê & Trà nóng cho từ ${hanzi}`}
          >
            <defs>
              <linearGradient id="cafeBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1E2D24" />
                <stop offset="60%" stopColor="#3B2F26" />
                <stop offset="100%" stopColor="#5C4028" />
              </linearGradient>
            </defs>
            <rect width="400" height="220" rx="14" fill="url(#cafeBg)" />
            <circle cx="212" cy="118" r="68" fill="#DFC470" fillOpacity="0.14" stroke="#DFC470" strokeOpacity="0.4" />
            {/* Rising Aroma Steam */}
            <path d="M196 88 Q188 70 200 56" fill="none" stroke="#FDE68A" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
            <path d="M222 86 Q230 68 218 52" fill="none" stroke="#FDE68A" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
            {/* Saucer & Cup */}
            <ellipse cx="212" cy="164" rx="58" ry="12" fill="#432818" stroke="#DFC470" strokeWidth="1.5" />
            <path d="M172 104 L252 104 C250 148, 234 162, 212 162 C190 162, 174 148, 172 104 Z" fill="#FFFBEB" stroke="#DFC470" strokeWidth="2.5" />
            <path d="M252 114 C270 114, 270 142, 248 144" fill="none" stroke="#DFC470" strokeWidth="3.5" />
            <ellipse cx="212" cy="105" rx="38" ry="8" fill="#6F4E37" />
            {renderSceneFrameAndBadge(hanzi || '咖啡 · 茶', semanticProfile.sceneCaptionVi, '#3E2414')}
          </svg>
        );

      case 'food_cuisine_fruit':
        return (
          <svg
            viewBox="0 0 400 220"
            className="w-full h-full"
            data-testid="procedural-svg-food_cuisine_fruit"
            role="img"
            aria-label={`Minh họa Ẩm thực & Trái cây tươi cho từ ${hanzi}`}
          >
            <rect width="400" height="220" rx="14" fill="#231D18" />
            <rect x="28" y="152" width="344" height="54" rx="10" fill="#432818" stroke="#DFC470" strokeWidth="1.8" />
            {/* Fresh Red Apple with Green Leaf (苹果 / 水果) */}
            <g transform="translate(136, 118)">
              <circle cx="-10" cy="6" r="26" fill="#DC2626" />
              <circle cx="10" cy="6" r="26" fill="#EF4444" />
              <path d="M0 -18 Q4 -32 10 -34" fill="none" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
              <path d="M4 -26 C18 -34, 28 -22, 12 -16 Z" fill="#22C55E" />
            </g>
            {/* Warm Bowl of Rice / Cuisine & Chopsticks (饭 / 菜 / 美食) */}
            <g transform="translate(264, 122)">
              <path d="M-38 0 Q0 -26 38 0 Z" fill="#FFFBEB" />
              <path d="M-42 0 L42 0 C38 28, 22 36, 0 36 C-22 36, -38 28, -42 0 Z" fill="#B91C1C" stroke="#FDE68A" strokeWidth="2" />
              <line x1="-12" y1="-26" x2="48" y2="-8" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
              <line x1="-16" y1="-18" x2="46" y2="-2" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
            </g>
            {renderSceneFrameAndBadge(hanzi || '苹果 · 美食', semanticProfile.sceneCaptionVi, '#3E2414')}
          </svg>
        );

      case 'transport_city':
        return (
          <svg
            viewBox="0 0 400 220"
            className="w-full h-full"
            data-testid="procedural-svg-transport_city"
            role="img"
            aria-label={`Minh họa Giao thông & Tàu điện đô thị cho từ ${hanzi}`}
          >
            <defs>
              <linearGradient id="cityTrafficBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0F1F2E" />
                <stop offset="60%" stopColor="#1E3A52" />
                <stop offset="100%" stopColor="#2B5370" />
              </linearGradient>
            </defs>
            <rect width="400" height="220" rx="14" fill="url(#cityTrafficBg)" />
            {/* City Skyline Silhouette */}
            <rect x="44" y="64" width="32" height="90" fill="#1E293B" opacity="0.7" />
            <rect x="86" y="48" width="40" height="106" fill="#334155" opacity="0.7" />
            <rect x="284" y="54" width="44" height="100" fill="#1E293B" opacity="0.7" />
            {/* Elevated High-Speed Metro Bridge */}
            <rect x="0" y="144" width="400" height="12" fill="#64748B" stroke="#DFC470" strokeWidth="1" />
            {/* High-Speed Bullet Train / Metro (地铁 / 交通) */}
            <g transform="translate(64, 108)">
              <path
                d="M0 34 L228 34 L268 34 C256 10, 232 4, 204 4 L0 4 Z"
                fill="#F8FAFC"
                stroke="#38BDF8"
                strokeWidth="2"
              />
              <line x1="0" y1="22" x2="254" y2="22" stroke="#0284C7" strokeWidth="3.5" />
              {[20, 64, 108, 152].map((wx) => (
                <rect key={wx} x={wx} y="9" width="28" height="9" rx="2" fill="#0F172A" />
              ))}
            </g>
            {renderSceneFrameAndBadge(hanzi || '交通 · jiāotōng', semanticProfile.sceneCaptionVi, '#0F172A')}
          </svg>
        );

      case 'medical_hospital':
        return (
          <svg
            viewBox="0 0 400 220"
            className="w-full h-full"
            data-testid="procedural-svg-medical_hospital"
            role="img"
            aria-label={`Minh họa Bệnh viện & Y tế cho từ ${hanzi}`}
          >
            <rect width="400" height="220" rx="14" fill="#122B2A" />
            {/* Hospital Building with Red Cross */}
            <g transform="translate(124, 42)">
              <rect x="0" y="20" width="152" height="132" rx="8" fill="#F8FAFC" stroke="#DFC470" strokeWidth="2" />
              <circle cx="76" cy="20" r="20" fill="#FFFBEB" stroke="#DC2626" strokeWidth="2.5" />
              <rect x="72" y="9" width="8" height="22" rx="1.5" fill="#DC2626" />
              <rect x="65" y="16" width="22" height="8" rx="1.5" fill="#DC2626" />
              {[24, 64, 104].map((wx) => (
                <g key={wx}>
                  <rect x={wx} y="52" width="24" height="20" rx="3" fill="#38BDF8" />
                  <rect x={wx} y="82" width="24" height="20" rx="3" fill="#38BDF8" />
                </g>
              ))}
              <rect x="58" y="114" width="36" height="38" rx="3" fill="#0284C7" />
            </g>
            {renderSceneFrameAndBadge(hanzi || '医院 · yīyuàn', semanticProfile.sceneCaptionVi, '#0F172A')}
          </svg>
        );

      case 'animal_dog_cat':
        return (
          <svg
            viewBox="0 0 400 220"
            className="w-full h-full"
            data-testid="procedural-svg-animal_dog_cat"
            role="img"
            aria-label={`Minh họa Thú cưng cho từ ${hanzi}`}
          >
            <defs>
              <linearGradient id="dogSkyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1E382B" />
                <stop offset="45%" stopColor="#3F6B4F" />
                <stop offset="100%" stopColor="#D1FAE5" />
              </linearGradient>
            </defs>
            <rect width="400" height="220" rx="14" fill="url(#dogSkyGrad)" />
            <circle cx="328" cy="48" r="26" fill="#FEF08A" opacity="0.9" />
            <path d="M0 144 Q130 114 260 142 T400 134 L400 220 L0 220 Z" fill="#2E6044" />
            <path d="M0 168 Q150 148 290 166 T400 160 L400 220 L0 220 Z" fill="#1C3D2B" />

            <g transform="translate(204, 116)">
              <path
                d="M-38 24 Q-58 12 -48 -2"
                fill="none"
                stroke="#D97706"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <ellipse cx="0" cy="22" rx="42" ry="26" fill="#F59E0B" stroke="#B45309" strokeWidth="2.5" />
              <ellipse cx="4" cy="22" rx="28" ry="17" fill="#FDE68A" />
              <circle cx="28" cy="-6" r="28" fill="#F59E0B" stroke="#B45309" strokeWidth="2.5" />
              <path d="M8 -24 C-2 -12, 4 8, 14 0 Z" fill="#B45309" />
              <path d="M48 -24 C58 -12, 52 8, 42 0 Z" fill="#B45309" />
              <circle cx="18" cy="-10" r="4.5" fill="#1E293B" />
              <circle cx="38" cy="-10" r="4.5" fill="#1E293B" />
              <ellipse cx="28" cy="0" rx="4" ry="3" fill="#0F172A" />
              <path d="M10 14 Q28 24 46 14" fill="none" stroke="#DC2626" strokeWidth="5" strokeLinecap="round" />
            </g>

            {renderSceneFrameAndBadge(hanzi || '狗 · 猫', semanticProfile.sceneCaptionVi, '#1C3D2B')}
          </svg>
        );

      case 'animal_panda_bamboo':
        return (
          <svg
            viewBox="0 0 400 220"
            className="w-full h-full"
            data-testid="procedural-svg-animal_panda_bamboo"
            role="img"
            aria-label={`Minh họa Gấu trúc & Rừng trúc cho từ ${hanzi}`}
          >
            <rect width="400" height="220" rx="14" fill="#132A1F" />
            {/* Emerald Bamboo Stalks */}
            <line x1="76" y1="20" x2="76" y2="200" stroke="#22C55E" strokeWidth="10" strokeLinecap="round" />
            <line x1="324" y1="20" x2="324" y2="200" stroke="#16A34A" strokeWidth="10" strokeLinecap="round" />
            {/* Cute Giant Panda */}
            <g transform="translate(200, 124)">
              <ellipse cx="0" cy="24" rx="44" ry="34" fill="#F8FAFC" stroke="#1E293B" strokeWidth="2.5" />
              <circle cx="-18" cy="-32" r="11" fill="#0F172A" />
              <circle cx="18" cy="-32" r="11" fill="#0F172A" />
              <circle cx="0" cy="-12" r="28" fill="#F8FAFC" stroke="#1E293B" strokeWidth="2.5" />
              <ellipse cx="-10" cy="-14" rx="7" ry="5.5" fill="#0F172A" />
              <ellipse cx="10" cy="-14" rx="7" ry="5.5" fill="#0F172A" />
              <circle cx="-9" cy="-15" r="2" fill="#FFFFFF" />
              <circle cx="9" cy="-15" r="2" fill="#FFFFFF" />
              <ellipse cx="0" cy="-5" rx="4.5" ry="3" fill="#0F172A" />
            </g>
            {renderSceneFrameAndBadge(hanzi || '熊猫 · xióngmāo', semanticProfile.sceneCaptionVi, '#14532D')}
          </svg>
        );

      case 'mythic_dragon':
        return (
          <svg
            viewBox="0 0 400 220"
            className="w-full h-full"
            data-testid="procedural-svg-mythic_dragon"
            role="img"
            aria-label={`Minh họa Rồng Trung Hoa cho từ ${hanzi}`}
          >
            <rect width="400" height="220" rx="14" fill="#162920" />
            <circle cx="322" cy="56" r="28" fill="#FEF08A" stroke="#DFC470" strokeWidth="2" />
            <path
              d="M52 178 C78 114, 132 144, 168 96 C204 48, 258 112, 286 64 C302 40, 268 24, 242 40"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="16"
              strokeLinecap="round"
            />
            <circle cx="198" cy="78" r="18" fill="#FEF08A" stroke="#F59E0B" strokeWidth="2.5" />
            <text x="198" y="84" textAnchor="middle" fill="#1E3227" fontSize="16" fontWeight="700">
              {hanzi.slice(0, 1) || '龙'}
            </text>
            {renderSceneFrameAndBadge(hanzi || '龙 · lóng', semanticProfile.sceneCaptionVi, '#064E3B')}
          </svg>
        );

      case 'nature_garden':
        return (
          <svg
            viewBox="0 0 400 220"
            className="w-full h-full"
            data-testid="procedural-svg-nature_garden"
            role="img"
            aria-label={`Minh họa Vườn hoa mùa xuân cho từ ${hanzi}`}
          >
            <defs>
              <linearGradient id="gardenSky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1E382B" />
                <stop offset="45%" stopColor="#4F795E" />
                <stop offset="100%" stopColor="#A7F3D0" />
              </linearGradient>
            </defs>
            <rect width="400" height="220" rx="14" fill="url(#gardenSky)" />
            <circle cx="332" cy="46" r="24" fill="#FEF08A" opacity="0.88" />
            <path d="M0 144 Q120 116 240 142 T400 134 L400 220 L0 220 Z" fill="#3B6E52" />
            <path d="M0 168 Q150 146 290 168 T400 162 L400 220 L0 220 Z" fill="#234835" />
            {/* Blooming Garden Flowers */}
            {[84, 156, 232, 304].map((fx, idx) => (
              <g key={fx} transform={`translate(${fx}, ${148 + (idx % 2) * 10})`}>
                <line x1="0" y1="0" x2="0" y2="28" stroke="#4ADE80" strokeWidth="3" />
                <circle cx="0" cy="0" r="11" fill={idx % 2 === 0 ? '#FB7185' : '#FBBF24'} />
                <circle cx="0" cy="0" r="4.5" fill="#FFFBEB" />
              </g>
            ))}
            {renderSceneFrameAndBadge(hanzi || '花园 · huāyuán', semanticProfile.sceneCaptionVi, '#14532D')}
          </svg>
        );

      case 'school_study':
        return (
          <svg
            viewBox="0 0 400 220"
            className="w-full h-full"
            data-testid="procedural-svg-school_study"
            role="img"
            aria-label={`Minh họa Lớp học & Sách vở cho từ ${hanzi}`}
          >
            <rect width="400" height="220" rx="14" fill="#16281F" />
            <rect x="56" y="56" width="288" height="114" rx="12" fill="#1E3227" stroke="#DFC470" strokeWidth="2.2" />
            {/* Open Chinese Textbook */}
            <path
              d="M132 148 Q166 134 200 148 Q234 134 268 148 L268 92 Q234 78 200 92 Q166 78 132 92 Z"
              fill="#FFFBEB"
              stroke="#DFC470"
              strokeWidth="2.2"
            />
            <line x1="200" y1="92" x2="200" y2="148" stroke="#9B8A3E" strokeWidth="2" />
            <text x="166" y="124" textAnchor="middle" fill="#1E3227" fontSize="16" fontWeight="700">
              {hanzi.slice(0, 2) || '学习'}
            </text>
            <text x="234" y="122" textAnchor="middle" fill="#9B8A3E" fontSize="11" fontWeight="700">
              HSK 3.0
            </text>
            {renderSceneFrameAndBadge(hanzi || '初中 · 学习', semanticProfile.sceneCaptionVi, '#182A21')}
          </svg>
        );

      case 'work_effort':
        return (
          <svg
            viewBox="0 0 400 220"
            className="w-full h-full"
            data-testid="procedural-svg-work_effort"
            role="img"
            aria-label={`Minh họa Nỗ lực & Thành công cho từ ${hanzi}`}
          >
            <rect width="400" height="220" rx="14" fill="#172A22" />
            {/* Ascending Steps to Achievement */}
            <rect x="92" y="148" width="48" height="32" rx="4" fill="#2D4F3E" stroke="#DFC470" strokeWidth="1.5" />
            <rect x="148" y="122" width="48" height="58" rx="4" fill="#3B6952" stroke="#DFC470" strokeWidth="1.5" />
            <rect x="204" y="94" width="48" height="86" rx="4" fill="#4D8568" stroke="#DFC470" strokeWidth="1.5" />
            <rect x="260" y="66" width="54" height="114" rx="4" fill="#D97706" stroke="#FEF08A" strokeWidth="2" />
            {/* Victory Flag on Top Step */}
            <line x1="286" y1="28" x2="286" y2="66" stroke="#FEF08A" strokeWidth="3" />
            <polygon points="286,28 326,38 286,48" fill="#EF4444" stroke="#FEF08A" strokeWidth="1.2" />
            {renderSceneFrameAndBadge(hanzi || '努力 · 坚持', semanticProfile.sceneCaptionVi, '#182A21')}
          </svg>
        );

      case 'state_warm_sun':
        return (
          <svg
            viewBox="0 0 400 220"
            className="w-full h-full"
            data-testid="procedural-svg-state_warm_sun"
            role="img"
            aria-label={`Minh họa Nắng xuân ấm áp cho từ ${hanzi}`}
          >
            <defs>
              <linearGradient id="warmSkyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1E3227" />
                <stop offset="35%" stopColor="#856A3F" />
                <stop offset="100%" stopColor="#F7D08A" />
              </linearGradient>
            </defs>
            <rect width="400" height="220" rx="14" fill="url(#warmSkyGrad)" />
            <circle cx="316" cy="58" r="42" fill="#F59E0B" opacity="0.4" />
            <circle cx="316" cy="58" r="24" fill="#FFFBEB" stroke="#F59E0B" strokeWidth="2" />
            <g transform="translate(52, 86)">
              <path d="M-10 36 Q52 0 114 36 Z" fill="#7C2D12" stroke="#FDE68A" strokeWidth="1.5" />
              <rect x="4" y="36" width="96" height="58" rx="6" fill="#FAF5E8" stroke="#9B8A3E" strokeWidth="2" />
              <rect x="20" y="48" width="32" height="26" rx="4" fill="#FBBF24" />
            </g>
            {renderSceneFrameAndBadge(hanzi || '温暖 · wēnnuǎn', semanticProfile.sceneCaptionVi, '#1E3227')}
          </svg>
        );

      case 'action_exchange':
        return (
          <svg
            viewBox="0 0 400 220"
            className="w-full h-full"
            data-testid="procedural-svg-action_exchange"
            role="img"
            aria-label={`Minh họa Trao đổi & Đổi tiền cho từ ${hanzi}`}
          >
            <rect width="400" height="220" rx="14" fill="#182C22" />
            <g transform="translate(96, 114)">
              <rect x="-38" y="-22" width="76" height="44" rx="6" fill="#BE123C" stroke="#FDE68A" strokeWidth="1.5" />
              <text x="0" y="6" textAnchor="middle" fill="#FEF08A" fontSize="16" fontWeight="bold">
                ¥100
              </text>
            </g>
            <g transform="translate(200, 114)">
              <path d="M-32 -14 C-10 -30, 10 -30, 32 -14" fill="none" stroke="#FDE047" strokeWidth="4" strokeLinecap="round" />
              <path d="M32 14 C10 30, -10 30, -32 14" fill="none" stroke="#6EE7B7" strokeWidth="4" strokeLinecap="round" />
              <circle cx="0" cy="0" r="18" fill="#182A21" stroke="#DFC470" strokeWidth="2" />
              <text x="0" y="6" textAnchor="middle" fill="#F7E29C" fontSize="16" fontWeight="bold">
                {hanzi.slice(0, 1) || '换'}
              </text>
            </g>
            <g transform="translate(304, 114)">
              <circle cx="0" cy="0" r="24" fill="#F59E0B" stroke="#FEF08A" strokeWidth="2" />
              <rect x="-7" y="-7" width="14" height="14" fill="#182C22" stroke="#FEF08A" strokeWidth="1.5" />
            </g>
            {renderSceneFrameAndBadge(hanzi || '换 · huàn', semanticProfile.sceneCaptionVi, '#1E3227')}
          </svg>
        );

      case 'time_quarter_clock':
        return (
          <svg
            viewBox="0 0 400 220"
            className="w-full h-full"
            data-testid="procedural-svg-time_quarter_clock"
            role="img"
            aria-label={`Minh họa Đồng hồ 15 phút (Một khắc) cho từ ${hanzi}`}
          >
            <rect width="400" height="220" rx="14" fill="#13251D" />
            <g transform="translate(208, 114)">
              <circle cx="0" cy="0" r="64" fill="#182A21" stroke="#DFC470" strokeWidth="3.5" />
              <circle cx="0" cy="0" r="56" fill="#FAF5E8" stroke="#9B8A3E" strokeWidth="1.5" />
              {/* 15 Minute Quarter Sector */}
              <path d="M0 0 L0 -56 A56 56 0 0 1 56 0 Z" fill="#F59E0B" fillOpacity="0.45" />
              <line x1="0" y1="0" x2="0" y2="-42" stroke="#1E3227" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="0" y1="0" x2="38" y2="0" stroke="#DC2626" strokeWidth="2.8" strokeLinecap="round" />
              <circle cx="0" cy="0" r="4.5" fill="#DFC470" />
              <text x="26" y="-18" fill="#92400E" fontSize="10" fontWeight="800">
                15m (一刻)
              </text>
            </g>
            {renderSceneFrameAndBadge(hanzi || '刻 · kè', semanticProfile.sceneCaptionVi, '#182A21')}
          </svg>
        );

      case 'state_willing_heart':
        return (
          <svg
            viewBox="0 0 400 220"
            className="w-full h-full"
            data-testid="procedural-svg-state_willing_heart"
            role="img"
            aria-label={`Minh họa Tấm lòng sẵn lòng giúp đỡ cho từ ${hanzi}`}
          >
            <rect width="400" height="220" rx="14" fill="#182A22" />
            <g transform="translate(208, 112)">
              <circle cx="0" cy="0" r="56" fill="#FDE68A" fillOpacity="0.14" stroke="#DFC470" strokeWidth="1.5" />
              {/* Glowing Heart of Willingness & Kindness */}
              <path
                d="M0 -14 C0 -32, -28 -32, -28 -10 C-28 10, 0 24, 0 34 C0 24, 28 10, 28 -10 C28 -32, 0 -32, 0 -14 Z"
                fill="#E11D48"
                stroke="#FDE68A"
                strokeWidth="2"
              />
              <text x="0" y="4" textAnchor="middle" fill="#FFFBEB" fontSize="13" fontWeight="700">
                {hanzi || '愿意'}
              </text>
            </g>
            {renderSceneFrameAndBadge(hanzi || '愿意 · yuànyì', semanticProfile.sceneCaptionVi, '#182A21')}
          </svg>
        );
    }
  };

  return (
    <div
      className={`relative ${className} select-none overflow-hidden rounded-2xl group bg-[#111A15]`}
      data-testid="vocab-visual-engine-frame"
      data-archetype={semanticProfile.archetype}
      data-hanzi={hanzi}
    >
      {/* If Photo Mode is active and image hasn't errored */}
      {viewMode === 'photo' && !imageError ? (
        <div className="relative w-full h-full overflow-hidden">
          {!imageLoaded && (
            <div className="absolute inset-0 pointer-events-none">
              {renderProceduralSvgArtwork()}
            </div>
          )}
          <SafeImage
            src={activePhotoUrl}
            alt={`Minh họa ngữ cảnh từ vựng ${hanzi} (${pinyin}) — nghĩa tiếng Việt: ${meaning}${
              exampleHanzi ? ` · Ví dụ: ${exampleHanzi}` : ''
            }`}
            hanzi={hanzi}
            pinyin={pinyin}
            meaning={meaning}
            testId="vocab-active-photo-img"
            className="w-full h-full object-cover"
            fallbackNode={renderProceduralSvgArtwork()}
            onImageLoaded={() => setImageLoaded(true)}
            onImageError={() => {
              if (availablePhotos.length > 1 && photoAngleIdx < availablePhotos.length - 1) {
                setPhotoAngleIdx((prev) => prev + 1);
              } else {
                setImageError(true);
                setViewMode('svg');
              }
            }}
          />

          {/* Elegant Dark-to-Transparent Vignette Gradient */}
          <div className="absolute inset-0 bg-black/85 pointer-events-none" />

          {/* Halora Gold Filigree Inner Frame */}
          <div className="absolute inset-2 border border-highlight/40 rounded-xl pointer-events-none" />

          {/* Top-Left Word & Meaning Badge */}
          <div className="absolute top-3 left-3 bg-[#182A21]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-highlight/60 shadow-lg flex items-center gap-2 max-w-[60%]">
            <span className="w-2 h-2 rounded-full bg-highlight animate-pulse shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="font-['Noto_Sans_SC'] text-base font-bold text-[#F7E29C] leading-tight truncate">
                {hanzi}
              </span>
              <span className="text-sm text-[#E5E9D7] font-medium leading-tight truncate">
                {pinyin} {meaning ? `· ${meaning}` : ''}
              </span>
            </div>
          </div>

          {/* Bottom Angle Indicator */}
          <div className="absolute bottom-2.5 right-3 flex items-center justify-end pointer-events-none">
            <span
              data-testid="vocab-photo-angle-badge"
              className="px-2.5 py-0.5 rounded-md bg-[#182A21]/90 border border-highlight/50 text-sm font-bold text-[#E5E9D7] shrink-0 tabular-nums shadow"
            >
              Ảnh {safeAngleIdx + 1}/{availablePhotos.length}
            </span>
          </div>
        </div>
      ) : (
        renderProceduralSvgArtwork()
      )}

      {/* Top-Right Controls: [🔄 Đổi ảnh] + [🔗 Tự cập nhật] + [Tranh vẽ/Ảnh thật] */}
      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1">
        <button
          type="button"
          data-testid="cycle-vocab-image-btn"
          onClick={handleCyclePhotoAngle}
          title="Đổi sang góc ảnh minh họa khác của từ vựng này"
          className="flex items-center justify-center p-1.5 rounded-xl text-[10.5px] font-bold bg-[#182A21]/85 hover:bg-[#182A21] text-[#F7E29C] border border-highlight/60 backdrop-blur-md shadow-md transition-all active:scale-95 cursor-pointer"
          aria-label="Đổi góc ảnh minh họa khác"
        >
          <RefreshCw className="w-3.5 h-3.5 text-highlight" />
        </button>

        <button
          type="button"
          data-testid="open-custom-image-url-btn"
          onClick={() => setIsCustomUrlEditorOpen((v) => !v)}
          title="Dán link ảnh tùy chọn để minh họa theo ý riêng trên lớp"
          className="flex items-center justify-center p-1.5 rounded-xl text-[10.5px] font-bold bg-[#182A21]/85 hover:bg-[#182A21] text-[#F7E29C] border border-highlight/60 backdrop-blur-md shadow-md transition-all active:scale-95 cursor-pointer"
          aria-label="Tự cập nhật link ảnh minh họa"
        >
          <Link2 className="w-3.5 h-3.5 text-highlight" />
        </button>

        <button
          type="button"
          data-testid="toggle-illustration-mode-btn"
          onClick={() => {
            if (imageError) {
              setImageError(false);
            }
            setViewMode((m) => (m === 'photo' ? 'svg' : 'photo'));
          }}
          title={
            viewMode === 'photo'
              ? 'Chuyển sang Tranh vẽ SVG tự động theo bộ thủ & ngữ nghĩa'
              : 'Chuyển sang Ảnh thật'
          }
          className="flex items-center justify-center p-1.5 rounded-xl text-[10.5px] font-bold bg-[#182A21]/85 hover:bg-[#182A21] text-[#F7E29C] border border-highlight/60 backdrop-blur-md shadow-md transition-all active:scale-95 cursor-pointer"
          aria-label={viewMode === 'photo' ? 'Chuyển sang Tranh vẽ' : 'Chuyển sang Ảnh thật'}
        >
          {viewMode === 'photo' ? (
            <Palette className="w-3.5 h-3.5 text-highlight" />
          ) : (
            <ImageIcon className="w-3.5 h-3.5 text-highlight" />
          )}
        </button>
      </div>

      {/* Inline Custom Image URL Popover for Teachers */}
      {isCustomUrlEditorOpen && (
        <form
          onSubmit={handleApplyCustomUrl}
          data-testid="custom-vocab-image-form"
          className="absolute inset-x-2.5 bottom-2.5 z-20 p-3 rounded-xl bg-[#111F18]/95 backdrop-blur-md border border-highlight/70 shadow-xl flex flex-col gap-2"
        >
          <div className="flex items-center justify-between gap-2 text-sm font-bold text-[#F7E29C]">
            <span className="inline-flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-highlight" />
              <span>Tự cập nhật ảnh minh họa cho "{hanzi}"</span>
            </span>
            <button
              type="button"
              onClick={() => setIsCustomUrlEditorOpen(false)}
              className="text-[#E5E9D7] hover:text-white p-0.5 cursor-pointer"
              aria-label="Đóng khung cập nhật ảnh"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="url"
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
              placeholder="Dán link ảnh (https://...) hoặc để trống để tự động..."
              data-testid="custom-vocab-image-input"
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface/95 text-ink text-sm border border-highlight/50 focus:outline-none"
            />
            <button
              type="submit"
              data-testid="apply-custom-vocab-image-btn"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-highlight hover:bg-highlight text-[#182A21] text-sm font-semibold cursor-pointer shrink-0"
            >
              <Check className="w-4 h-4" />
              <span>Lưu ảnh</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
