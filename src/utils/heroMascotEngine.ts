export type HeroMascotMode = 'dragon' | 'panda' | 'harmony' | 'custom';

export interface HeroMascotThemeMeta {
  id: HeroMascotMode;
  badgeIcon: string;
  label: string;
  chineseTitle: string;
  subtitle: string;
  accentHex: string;
}

export const HERO_MASCOT_THEMES: Record<Exclude<HeroMascotMode, 'custom'>, HeroMascotThemeMeta> = {
  dragon: {
    id: 'dragon',
    badgeIcon: '🐉',
    label: 'Chu Sa Thần Long',
    chineseTitle: '中华神龙 · 龙戏珠',
    subtitle: 'Ngũ Trảo Kim Long uốn lượn vờn Minh Châu giữa mây lành Tường Vân',
    accentHex: '#DE2820',
  },
  panda: {
    id: 'panda',
    badgeIcon: '🐼',
    label: 'Gấu Trúc & Rừng Trúc',
    chineseTitle: '国宝熊猫 · 翠竹书香',
    subtitle: 'Trạng nguyên Gấu trúc Bin Bin cầm cuộn thư pháp bên rừng trúc ngọc bích',
    accentHex: '#2E7D5B',
  },
  harmony: {
    id: 'harmony',
    badgeIcon: '🏮',
    label: 'Long Trúc Song Hành',
    chineseTitle: '龙竹呈祥 · 阮文受印',
    subtitle: 'Thần Long cưỡi mây vàng hội tụ cùng Gấu trúc Bin Bin, rừng trúc và ấn chương Chu Sa',
    accentHex: '#D4AF37',
  },
};

export const CYCLE_MASCOT_ORDER: Exclude<HeroMascotMode, 'custom'>[] = [
  'dragon',
  'panda',
  'harmony',
];

export function getNextHeroMascotMode(current: HeroMascotMode): Exclude<HeroMascotMode, 'custom'> {
  if (current === 'custom') {
    return 'dragon';
  }
  const idx = CYCLE_MASCOT_ORDER.indexOf(current);
  if (idx === -1) return 'dragon';
  return CYCLE_MASCOT_ORDER[(idx + 1) % CYCLE_MASCOT_ORDER.length];
}

export interface DragonSpineNode {
  index: number;
  t: number;
  x: number;
  y: number;
  angleDeg: number;
  radius: number;
  finHeight: number;
}

/**
 * Generates mathematically smooth S-curve spine coordinates, tangent angles,
 * scale radii, and dorsal fin heights for the Oriental Dragon.
 */
export function generateDragonSpineNodes(
  count = 42,
  mode: 'full-circle' | 'upper-soar' = 'full-circle'
): DragonSpineNode[] {
  const safeCount = Math.max(8, Math.min(80, count));
  const nodes: DragonSpineNode[] = [];

  const samplePoint = (t: number): { x: number; y: number } => {
    if (mode === 'upper-soar') {
      // Smooth S-curve across upper-left to upper-right of the Moon Gate
      const x = -235 + t * 470 + Math.sin(t * Math.PI * 2) * 28;
      const y = -75 - Math.sin(t * Math.PI) * 145 + Math.cos(t * Math.PI * 2.5) * 48;
      return { x, y };
    }
    // Full S-wave coiling around the Moon Gate (head upper-left, body sweeps through S-curve)
    const theta = -Math.PI * 0.72 + t * Math.PI * 1.78;
    const waveR = 212 + Math.sin(t * Math.PI * 3.0) * 44;
    const x = Math.cos(theta) * waveR + Math.sin(t * Math.PI * 2) * 18;
    const y = Math.sin(theta) * (waveR * 0.94) - Math.cos(t * Math.PI * 2) * 16;
    return { x, y };
  };

  for (let i = 0; i < safeCount; i++) {
    const t = i / (safeCount - 1);
    const pt = samplePoint(t);
    const dt = 0.005;
    const ptNext = samplePoint(Math.min(1, t + dt));
    const ptPrev = samplePoint(Math.max(0, t - dt));
    const dx = ptNext.x - ptPrev.x;
    const dy = ptNext.y - ptPrev.y;
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

    // Taper smoothly from neck (t=0) through muscular mid-body to tail tip (t=1)
    const envelope = Math.sin(t * Math.PI * 0.88 + 0.12);
    const tailTaper = 1 - Math.pow(t, 1.85) * 0.72;
    const radius = Math.max(5.5, (16.5 + envelope * 11.5) * tailTaper);
    const finHeight = Math.max(6, (12 + Math.sin(t * Math.PI * 4) * 3.5 + envelope * 8) * tailTaper);

    nodes.push({
      index: i,
      t: Number(t.toFixed(4)),
      x: Number(pt.x.toFixed(2)),
      y: Number(pt.y.toFixed(2)),
      angleDeg: Number(angleDeg.toFixed(2)),
      radius: Number(radius.toFixed(2)),
      finHeight: Number(finHeight.toFixed(2)),
    });
  }

  return nodes;
}

export interface BambooStalkSpec {
  id: string;
  baseX: number;
  baseY: number;
  leanDeg: number;
  scale: number;
  segments: {
    y1: number;
    y2: number;
    width: number;
    hasLeafClusterLeft: boolean;
    hasLeafClusterRight: boolean;
  }[];
}

export function generateBambooGroveSpecs(): BambooStalkSpec[] {
  const configs = [
    { id: 'stalk-left-outer', baseX: -265, baseY: 285, leanDeg: 9, scale: 1.05, segCount: 6 },
    { id: 'stalk-left-inner', baseX: -215, baseY: 300, leanDeg: 14, scale: 0.88, segCount: 5 },
    { id: 'stalk-right-outer', baseX: 265, baseY: 285, leanDeg: -9, scale: 1.02, segCount: 6 },
    { id: 'stalk-right-inner', baseX: 218, baseY: 302, leanDeg: -13, scale: 0.84, segCount: 5 },
  ];

  return configs.map((cfg) => {
    const segments = [];
    let currentY = 0;
    for (let i = 0; i < cfg.segCount; i++) {
      const segLen = (68 - i * 4.5) * cfg.scale;
      const nextY = currentY - segLen;
      const width = Math.max(6, (15 - i * 1.4) * cfg.scale);
      segments.push({
        y1: Number(currentY.toFixed(1)),
        y2: Number(nextY.toFixed(1)),
        width: Number(width.toFixed(1)),
        hasLeafClusterLeft: i >= 2 && i % 2 === 0,
        hasLeafClusterRight: i >= 1 && i % 2 === 1,
      });
      currentY = nextY - 3; // small gap for bamboo node ring
    }
    return {
      id: cfg.id,
      baseX: cfg.baseX,
      baseY: cfg.baseY,
      leanDeg: cfg.leanDeg,
      scale: cfg.scale,
      segments,
    };
  });
}
