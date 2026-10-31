import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload,
  Sparkles,
  Check,
  RotateCcw,
  X,
  Palette,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import {
  HeroMascotMode,
  HERO_MASCOT_THEMES,
  CYCLE_MASCOT_ORDER,
  getNextHeroMascotMode,
  generateDragonSpineNodes,
  generateBambooGroveSpecs,
} from '../utils/heroMascotEngine';

const STORAGE_KEY_MASCOT_MODE = 'hanu_hero_mascot_mode_v2';

export const HaloraCenterScene: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Mascot Theme Mode: 'dragon' (Chu Sa Thần Long) | 'panda' (Gấu Trúc & Rừng Trúc) | 'harmony' (Long Trúc Song Hành) | 'custom'
  const [activeMode, setActiveMode] = useState<HeroMascotMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MASCOT_MODE);
      if (saved === 'dragon' || saved === 'panda' || saved === 'harmony') {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    return 'dragon';
  });

  const [characterForm, setCharacterForm] = useState<'traditional' | 'simplified'>('traditional');
  const [showCalligraphyOnDragon, setShowCalligraphyOnDragon] = useState(true);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [customBlendMode, setCustomBlendMode] = useState<'normal' | 'screen' | 'overlay'>('normal');
  const [modalOpen, setModalOpen] = useState(false);

  const handleSelectMode = (nextMode: HeroMascotMode) => {
    setActiveMode(nextMode);
    if (nextMode !== 'custom') {
      try {
        localStorage.setItem(STORAGE_KEY_MASCOT_MODE, nextMode);
      } catch {
        // ignore
      }
    }
  };

  const handleCycleMode = () => {
    const next = getNextHeroMascotMode(activeMode);
    handleSelectMode(next);
  };

  // Precompute geometric dragon spine nodes & bamboo grove specs
  const fullDragonNodes = useMemo(() => generateDragonSpineNodes(44, 'full-circle'), []);
  const upperDragonNodes = useMemo(() => generateDragonSpineNodes(34, 'upper-soar'), []);
  const bambooStalks = useMemo(() => generateBambooGroveSpecs(), []);

  // Rising Golden & Jade Auspicious Light Particles (Hạt sáng linh khí bay lên)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const width = 960;
    const height = 960;
    canvas.width = width;
    canvas.height = height;

    const particles = Array.from({ length: 42 }, (_, i) => ({
      angle: (i / 42) * Math.PI * 2,
      radius: 110 + (i % 9) * 28,
      speed: 0.0014 + (i % 4) * 0.00045,
      riseY: (i * 19) % 320,
      riseSpeed: 0.35 + (i % 5) * 0.14,
      size: 1.5 + (i % 3) * 1.15,
      alpha: 0.28 + (i % 5) * 0.12,
      tone: i % 3 === 0 ? 'gold' : i % 3 === 1 ? 'jade' : 'cinnabar',
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const cx = width * 0.5;
      const cy = height * 0.5;

      for (const p of particles) {
        p.angle += p.speed;
        p.riseY = (p.riseY + p.riseSpeed) % 320;
        const upwardOffset = 160 - p.riseY;
        const x = cx + Math.cos(p.angle) * p.radius;
        const y = cy + Math.sin(p.angle * 1.05) * (p.radius * 0.85) + upwardOffset * 0.25;

        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        if (p.tone === 'gold') {
          ctx.fillStyle = `rgba(236, 200, 105, ${p.alpha})`;
        } else if (p.tone === 'jade') {
          ctx.fillStyle = `rgba(116, 229, 180, ${p.alpha * 0.85})`;
        } else {
          ctx.fillStyle = `rgba(235, 80, 68, ${p.alpha * 0.8})`;
        }
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Handle custom image upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        if (typeof loadEvent.target?.result === 'string') {
          setCustomImage(loadEvent.target.result);
          setActiveMode('custom');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate 48 Hồi Văn (Fretwork / Meander) repeating teeth around outer ring
  const meanderSegments = useMemo(
    () => Array.from({ length: 48 }, (_, i) => (i * 360) / 48),
    []
  );

  // Helper renderer for 5-Clawed Imperial Golden Talons (Ngũ Trảo Kim Long - 五爪金龙)
  const renderFiveClawedLimb = (
    key: string,
    x: number,
    y: number,
    rotateDeg: number,
    scale = 1,
    flipX = false
  ) => (
    <g
      key={key}
      transform={`translate(${x}, ${y}) rotate(${rotateDeg}) scale(${flipX ? -scale : scale}, ${scale})`}
    >
      {/* Muscular Scaled Forearm & Shoulder Flame */}
      <path
        d="M -28,-18 C -12,-14 6,-4 18,12 C 26,22 30,30 34,38"
        fill="none"
        stroke="#5E0B07"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d="M -28,-18 C -12,-14 6,-4 18,12 C 26,22 30,30 34,38"
        fill="none"
        stroke="url(#cinnabarDragonGrad)"
        strokeWidth="13.5"
        strokeLinecap="round"
      />
      <path
        d="M -24,-16 C -10,-10 5,-2 18,12"
        fill="none"
        stroke="url(#imperialGoldBeam)"
        strokeWidth="4.5"
        strokeDasharray="3 4"
        strokeLinecap="round"
      />
      {/* Elbow Golden Flame Tuft */}
      <path
        d="M -6,-8 C -2,-22 10,-28 22,-25 C 12,-16 8,-8 4,-2 C 14,-10 24,-10 30,-5 C 18,0 10,4 4,6 Z"
        fill="url(#imperialGoldBeam)"
        opacity="0.92"
      />
      {/* Golden Wrist Knuckle */}
      <circle cx="34" cy="38" r="7.5" fill="url(#imperialGoldBeam)" stroke="#4A2504" strokeWidth="1.5" />
      {/* 5 Distinct Imperial Claws (五爪金龙) */}
      {/* Claw 1 (Thumb Opposing Claw) */}
      <path
        d="M 30,40 Q 14,48 6,60 Q 15,54 26,46"
        fill="#FFF5C0"
        stroke="#B37D14"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Claw 2 */}
      <path
        d="M 33,42 Q 26,60 24,76 Q 32,62 37,45"
        fill="#FFF5C0"
        stroke="#B37D14"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Claw 3 (Center Longest Talon) */}
      <path
        d="M 36,41 Q 40,62 44,80 Q 46,60 40,42"
        fill="#FFF5C0"
        stroke="#B37D14"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Claw 4 */}
      <path
        d="M 38,39 Q 52,54 60,68 Q 56,50 41,37"
        fill="#FFF5C0"
        stroke="#B37D14"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Claw 5 (Outer Talon) */}
      <path
        d="M 39,35 Q 56,40 68,48 Q 58,34 40,32"
        fill="#FFF5C0"
        stroke="#B37D14"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </g>
  );

  // Helper renderer for Intricate Oriental Dragon Head (龙头: 鹿角, 龙须, 火焰鬃毛, 龙睛)
  const renderMajesticDragonHead = (x: number, y: number, scale = 1, rotateDeg = -8) => (
    <g transform={`translate(${x}, ${y}) rotate(${rotateDeg}) scale(${scale})`}>
      {/* 1. Flowing Flame Mane Behind Head (Bờm lửa nhiều tầng uy vũ) */}
      <g opacity="0.96">
        <path
          d="M -18,-15 C -55,-38 -95,-32 -128,-8 C -98,-12 -68,-5 -42,10 C -82,2 -118,16 -142,42 C -106,32 -72,30 -38,32 C -74,38 -102,58 -118,86 C -84,68 -52,58 -22,48 Z"
          fill="url(#cinnabarDragonGrad)"
          stroke="url(#imperialGoldBeam)"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M -12,-24 C -48,-52 -88,-54 -118,-36 C -88,-34 -58,-22 -32,-6"
          fill="none"
          stroke="url(#imperialGoldBeam)"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>

      {/* 2. Branched Imperial Stag Antlers (Sừng hươu 鹿角 hoàng gia) */}
      <g>
        {/* Back Antler */}
        <path
          d="M -16,-24 C -36,-58 -68,-82 -108,-90 M -54,-62 C -72,-82 -90,-82 -110,-76 M -38,-44 C -54,-62 -72,-58 -88,-52"
          fill="none"
          stroke="#D4AF37"
          strokeWidth="5.2"
          strokeLinecap="round"
        />
        {/* Fore Antler (Bright Metallic Gold) */}
        <path
          d="M -6,-22 C -24,-60 -58,-88 -102,-98 M -44,-66 C -64,-88 -84,-88 -104,-82 M -28,-46 C -48,-66 -66,-64 -84,-58 M -18,-32 C -32,-48 -46,-46 -60,-40"
          fill="none"
          stroke="#FFF3B8"
          strokeWidth="5.5"
          strokeLinecap="round"
        />
      </g>

      {/* 3. Lower Jaw & Beard Flames (Hàm dưới & Râu cằm rồng) */}
      <path
        d="M -12,18 C 8,24 28,34 44,44 C 34,54 14,56 -6,46 C -16,58 -32,68 -48,72 C -34,54 -26,38 -20,24 Z"
        fill="url(#cinnabarDragonGrad)"
        stroke="url(#imperialGoldBeam)"
        strokeWidth="2.2"
      />
      {/* Lower Teeth & Canine Fang */}
      <polygon points="34,38 39,27 43,40" fill="#FFFDF5" stroke="#B37D14" strokeWidth="0.8" />
      <polygon points="22,34 26,25 30,36" fill="#FFFDF5" />
      <polygon points="10,30 14,22 18,32" fill="#FFFDF5" />
      {/* Crimson Dragon Tongue */}
      <path
        d="M 16,24 C 36,24 54,18 68,10 C 52,26 34,32 16,28 Z"
        fill="#FF5252"
      />

      {/* 4. Sculpted Upper Cranium, Snout & Fierce Jaws (Đầu & Mõm rồng chạm nổi) */}
      <path
        d="M -28,12 C -32,-12 -14,-32 10,-30 C 28,-28 42,-14 64,-10 C 78,-8 86,2 80,12 C 72,20 50,20 30,16 C 12,14 -8,18 -28,12 Z"
        fill="url(#cinnabarDragonGrad)"
        stroke="url(#imperialGoldBeam)"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      {/* Golden Nasal Bridge & Snout Scroll (Sống mũi &如意鼻) */}
      <path
        d="M 8,-22 C 28,-20 48,-12 72,-8 C 78,-7 80,0 74,4 C 66,8 56,2 62,-3"
        fill="none"
        stroke="url(#imperialGoldBeam)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Upper Sharp Fangs */}
      <polygon points="62,14 66,27 71,14" fill="#FFFFFF" stroke="#B37D14" strokeWidth="0.9" />
      <polygon points="48,14 51,23 55,14" fill="#FFFDF5" />
      <polygon points="35,13 38,21 42,13" fill="#FFFDF5" />

      {/* 5. Expressive Glowing Dragon Eye & Flame Brow (Mắt rồng sáng có hồn) */}
      {/* Raised Golden Eyebrow Ridge */}
      <path
        d="M -6,-16 C 6,-28 24,-26 34,-14 C 24,-18 10,-18 -2,-10 Z"
        fill="url(#imperialGoldBeam)"
      />
      {/* Sclera & Golden Iris */}
      <ellipse cx="14" cy="-8" rx="8.5" ry="6.5" fill="#FFF6C4" stroke="#4A0503" strokeWidth="1.6" />
      <circle cx="15.5" cy="-8" r="4.2" fill="#E65100" />
      <circle cx="16" cy="-8" r="2.3" fill="#1B0302" />
      {/* Bright Dual Catchlights (Ánh mắt long lanh) */}
      <circle cx="13.5" cy="-10" r="1.8" fill="#FFFFFF" />
      <circle cx="17.5" cy="-6.5" r="0.9" fill="#FFFFFF" />

      {/* 6. Long Flowing Dragon Whiskers (Râu rồng 龙须 uốn lượn) */}
      <path
        d="M 66,-2 C 98,-14 134,8 148,42 C 160,72 138,108 108,100 C 86,94 82,70 98,60"
        fill="none"
        stroke="#FFF8D6"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M 58,6 C 88,4 116,28 122,58 C 128,84 108,106 86,96"
        fill="none"
        stroke="url(#imperialGoldBeam)"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.9"
      />
    </g>
  );

  // Helper renderer for Auspicious Golden Clouds (Tường Vân 祥云 mạ vàng)
  const renderAuspiciousCloud = (
    key: string,
    x: number,
    y: number,
    scale = 1,
    flipX = false,
    className = 'halora-cloud-drift-slow'
  ) => (
    <g
      key={key}
      transform={`translate(${x}, ${y}) scale(${flipX ? -scale : scale}, ${scale})`}
    >
      <g className={className}>
        <path
          d="M -55,12 C -72,12 -82,-2 -70,-15 C -62,-24 -46,-22 -40,-14 C -34,-34 -8,-42 12,-28 C 22,-38 44,-36 52,-20 C 68,-22 80,-8 74,6 C 68,18 50,20 32,18 L -48,18 C -65,18 -78,28 -68,38"
          fill="url(#cloudGoldFill)"
          stroke="url(#imperialGoldBeam)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        {/* Inner Ruyi Spiral Scroll (Vân đầu Như Ý) */}
        <path
          d="M -36,4 C -46,-4 -38,-16 -26,-12 C -18,-9 -20,2 -28,2 M 6,-4 C 18,-14 34,-8 30,4 C 27,11 16,10 16,3"
          fill="none"
          stroke="#FFF3B8"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.85"
        />
      </g>
    </g>
  );

  // Helper renderer for Layered Dragon Body with Individual Overlapping Scales (龙鳞) & Dorsal Fins
  const renderScaledDragonBody = (
    nodes: ReturnType<typeof generateDragonSpineNodes>,
    showFourClaws = true
  ) => {
    const spinePathD = nodes
      .map((n, idx) => `${idx === 0 ? 'M' : 'L'} ${n.x} ${n.y}`)
      .join(' ');

    const headNode = nodes[0];
    const tailNode = nodes[nodes.length - 1];

    return (
      <g>
        {/* 1. Deep Ambient Body Shadow */}
        <path
          d={spinePathD}
          fill="none"
          stroke="rgba(35, 4, 2, 0.72)"
          strokeWidth={nodes[8]?.radius ? nodes[8].radius * 2.35 : 44}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 2. Golden Ventral Belly Trim (Viền bụng rồng ánh kim) */}
        <path
          d={spinePathD}
          fill="none"
          stroke="url(#imperialGoldBeam)"
          strokeWidth={nodes[8]?.radius ? nodes[8].radius * 2.05 : 38}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 3. Dorsal Spine Sharp Fins (Vây lưng sắc nét dọc sống lưng) */}
        {nodes.map((node, idx) => {
          if (idx === 0 || idx >= nodes.length - 2) return null;
          return (
            <g
              key={`fin-${node.index}`}
              transform={`translate(${node.x}, ${node.y}) rotate(${node.angleDeg})`}
            >
              <path
                d={`M -4,${-node.radius * 0.78} Q -2,${-node.radius - node.finHeight} 7,${
                  -node.radius - node.finHeight * 0.85
                } Q 4,${-node.radius * 0.85} 4,${-node.radius * 0.72} Z`}
                fill="url(#imperialGoldBeam)"
                stroke="#FFF5C0"
                strokeWidth="0.9"
              />
            </g>
          );
        })}

        {/* 4. Individual Overlapping Dragon Scales (Vảy rồng 龙鳞 xếp lớp tinh tế từ đuôi lên đầu) */}
        {[...nodes].reverse().map((node) => {
          const r = node.radius;
          return (
            <g
              key={`scale-ring-${node.index}`}
              transform={`translate(${node.x}, ${node.y}) rotate(${node.angleDeg})`}
            >
              {/* Base Cinnabar Segment */}
              <ellipse
                cx="0"
                cy="0"
                rx={r * 1.15}
                ry={r * 0.92}
                fill="url(#cinnabarDragonGrad)"
                stroke="#7A0C08"
                strokeWidth="1"
              />
              {/* 3 Overlapping Fish-Scale / Crescent Plates per segment */}
              <path
                d={`M ${-r * 0.35},${-r * 0.72} Q ${r * 0.65},${-r * 0.38} ${-r * 0.35},0 Z`}
                fill="url(#cinnabarScaleHighlight)"
                stroke="#FFE082"
                strokeWidth="1.15"
              />
              <path
                d={`M ${-r * 0.55},${-r * 0.32} Q ${r * 0.55},0 ${-r * 0.55},${r * 0.32} Z`}
                fill="url(#cinnabarDragonGrad)"
                stroke="#FFF3B8"
                strokeWidth="1.25"
              />
              <path
                d={`M ${-r * 0.35},0 Q ${r * 0.65},${r * 0.38} ${-r * 0.35},${r * 0.72} Z`}
                fill="url(#cinnabarScaleHighlight)"
                stroke="#ECC869"
                strokeWidth="1.1"
              />
              {/* Golden Ventral Belly Plate (Đốt bụng vàng kim) */}
              <path
                d={`M ${-r * 0.45},${r * 0.62} Q 0,${r * 0.96} ${r * 0.45},${r * 0.62}`}
                fill="none"
                stroke="#FFF3B8"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </g>
          );
        })}

        {/* 5. Four 5-Clawed Imperial Limbs (Tứ chi Ngũ Trảo Kim Long - 五爪金龙) */}
        {showFourClaws ? (
          <>
            {/* Front-Upper Right Limb reaching for the Luminous Pearl */}
            {renderFiveClawedLimb('claw-fr', 82, -162, -48, 0.95, false)}
            {/* Front-Left Limb */}
            {renderFiveClawedLimb('claw-fl', -172, -45, 22, 0.92, false)}
            {/* Rear-Right Limb */}
            {renderFiveClawedLimb('claw-rr', 178, 65, -18, 0.88, true)}
            {/* Rear-Lower Limb */}
            {renderFiveClawedLimb('claw-rl', -55, 192, 15, 0.86, false)}
          </>
        ) : (
          <>
            {/* In Harmony mode, 2 front 5-clawed limbs reaching for the Pearl */}
            {renderFiveClawedLimb('harmony-claw-l', -88, -135, -28, 0.85, false)}
            {renderFiveClawedLimb('harmony-claw-r', 105, -130, -45, 0.85, true)}
          </>
        )}

        {/* 6. Ornate Multi-Plume Flame Tail (Đuôi rồng bốc lửa hoàng kim) */}
        <g
          transform={`translate(${tailNode.x}, ${tailNode.y}) rotate(${tailNode.angleDeg})`}
        >
          <path
            d="M 0,0 C 26,-24 58,-22 78,-4 C 52,-4 34,4 18,12 C 46,12 72,28 84,52 C 54,36 32,26 10,18 C 28,36 38,62 32,84 C 16,58 6,36 -4,14 Z"
            fill="url(#cinnabarDragonGrad)"
            stroke="url(#imperialGoldBeam)"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </g>

        {/* 7. Majestic Oriental Dragon Head */}
        {renderMajesticDragonHead(headNode.x - 10, headNode.y - 8, 1.08, -14)}
      </g>
    );
  };

  // Helper renderer for Lush Emerald Bamboo Grove (Rừng Trúc Xanh 翠竹 & Lá trúc bay)
  const renderEmeraldBambooGrove = (opacity = 1) => (
    <g opacity={opacity}>
      {bambooStalks.map((stalk, sIdx) => (
        <g
          key={stalk.id}
          transform={`translate(${stalk.baseX}, ${stalk.baseY}) rotate(${stalk.leanDeg})`}
        >
          <g className={sIdx % 2 === 0 ? 'halora-bamboo-sway' : 'halora-bamboo-sway-alt'}>
            {stalk.segments.map((seg, idx) => (
              <g key={`${stalk.id}-seg-${idx}`}>
                {/* Bamboo Culm Internode (Thân đốt trúc xanh ngọc) */}
                <path
                  d={`M ${-seg.width * 0.5},${seg.y1} L ${-seg.width * 0.46},${seg.y2} L ${
                    seg.width * 0.46
                  },${seg.y2} L ${seg.width * 0.5},${seg.y1} Z`}
                  fill="url(#bambooCulmGrad)"
                  stroke="#123824"
                  strokeWidth="1"
                />
                {/* Glossy Vertical Highlight along Bamboo Stalk */}
                <line
                  x1={-seg.width * 0.18}
                  y1={seg.y1 - 2}
                  x2={-seg.width * 0.16}
                  y2={seg.y2 + 2}
                  stroke="#A7F3D0"
                  strokeWidth="1.6"
                  opacity="0.55"
                />
                {/* Bamboo Node Ring (Mắt / Đốt trúc) */}
                <ellipse
                  cx="0"
                  cy={seg.y2}
                  rx={seg.width * 0.62}
                  ry="3.2"
                  fill="#D4AF37"
                  stroke="#163A26"
                  strokeWidth="1.1"
                />

                {/* Left Bamboo Leaf Spray (Chùm lá trúc bên trái) */}
                {seg.hasLeafClusterLeft && (
                  <g transform={`translate(${-seg.width * 0.45}, ${seg.y2})`}>
                    <path
                      d="M 0,0 Q -22,-14 -45,-22"
                      fill="none"
                      stroke="#34D399"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M -14,-9 Q -42,-26 -68,-16 Q -42,-4 -14,-9 Z"
                      fill="url(#bambooLeafGrad)"
                      stroke="#064E3B"
                      strokeWidth="0.8"
                    />
                    <path
                      d="M -26,-15 Q -58,-12 -78,6 Q -46,6 -26,-15 Z"
                      fill="url(#bambooLeafGrad)"
                      stroke="#064E3B"
                      strokeWidth="0.8"
                    />
                    <path
                      d="M -36,-18 Q -64,-36 -86,-28 Q -58,-12 -36,-18 Z"
                      fill="#6EE7B7"
                      opacity="0.9"
                    />
                  </g>
                )}

                {/* Right Bamboo Leaf Spray (Chùm lá trúc bên phải) */}
                {seg.hasLeafClusterRight && (
                  <g transform={`translate(${seg.width * 0.45}, ${seg.y2})`}>
                    <path
                      d="M 0,0 Q 22,-14 45,-22"
                      fill="none"
                      stroke="#34D399"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 14,-9 Q 42,-26 68,-16 Q 42,-4 14,-9 Z"
                      fill="url(#bambooLeafGrad)"
                      stroke="#064E3B"
                      strokeWidth="0.8"
                    />
                    <path
                      d="M 26,-15 Q 58,-12 78,6 Q 46,6 26,-15 Z"
                      fill="url(#bambooLeafGrad)"
                      stroke="#064E3B"
                      strokeWidth="0.8"
                    />
                    <path
                      d="M 36,-18 Q 64,-36 86,-28 Q 58,-12 36,-18 Z"
                      fill="#6EE7B7"
                      opacity="0.9"
                    />
                  </g>
                )}
              </g>
            ))}
          </g>
        </g>
      ))}

      {/* Gently Drifting Bamboo Leaves in the Breeze (Lá trúc bay nhẹ trong gió) */}
      <g transform="translate(-145, -165)">
        <g className="halora-leaf-drift-1">
          <path
            d="M 0,0 Q 18,-10 38,-4 Q 18,8 0,0 Z"
            fill="url(#bambooLeafGrad)"
            stroke="#A7F3D0"
            strokeWidth="0.7"
          />
        </g>
      </g>
      <g transform="translate(115, -185)">
        <g className="halora-leaf-drift-2">
          <path
            d="M 0,0 Q -20,-12 -42,-4 Q -20,8 0,0 Z"
            fill="url(#bambooLeafGrad)"
            stroke="#A7F3D0"
            strokeWidth="0.7"
          />
        </g>
      </g>
      <g transform="translate(-45, -210)">
        <g className="halora-leaf-drift-3">
          <path
            d="M 0,0 Q 16,-8 32,-2 Q 16,6 0,0 Z"
            fill="#6EE7B7"
            opacity="0.85"
          />
        </g>
      </g>
    </g>
  );

  // Helper renderer for Scholar Panda Bin Bin (Gấu Trúc Trạng Nguyên Bin Bin - 国宝熊猫彬彬)
  const renderScholarPandaBinBin = (x: number, y: number, scale = 1) => (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <g className="halora-panda-breathe">
      {/* Warm Jade & Golden Lotus Pedestal Cushion */}
      <ellipse
        cx="0"
        cy="132"
        rx="118"
        ry="26"
        fill="url(#imperialGoldBeam)"
        opacity="0.28"
      />
      <ellipse
        cx="0"
        cy="126"
        rx="96"
        ry="18"
        fill="#10281E"
        stroke="url(#imperialGoldBeam)"
        strokeWidth="2.5"
      />

      {/* Young Bamboo Shoots (Măng trúc non bên cạnh) */}
      <g transform="translate(-102, 98)">
        <path
          d="M -12,26 L 0,-14 L 12,26 Z"
          fill="url(#bambooLeafGrad)"
          stroke="#D4AF37"
          strokeWidth="1.4"
        />
        <path d="M -8,14 L 6,2 M -5,4 L 4,-4" stroke="#064E3B" strokeWidth="1.2" />
      </g>
      <g transform="translate(106, 102) scale(0.85)">
        <path
          d="M -12,26 L 0,-14 L 12,26 Z"
          fill="url(#bambooLeafGrad)"
          stroke="#D4AF37"
          strokeWidth="1.4"
        />
      </g>

      {/* Panda Seated Legs & Paws */}
      <g>
        {/* Left Leg */}
        <ellipse
          cx="-54"
          cy="106"
          rx="32"
          ry="24"
          transform="rotate(-12 -54 106)"
          fill="url(#pandaBlackFurGrad)"
          stroke="#0A0F0D"
          strokeWidth="2"
        />
        {/* Left Paw Pads */}
        <ellipse cx="-58" cy="108" rx="12" ry="9" fill="#374151" />
        <circle cx="-66" cy="96" r="4" fill="#4B5563" />
        <circle cx="-56" cy="93" r="4" fill="#4B5563" />
        <circle cx="-46" cy="96" r="4" fill="#4B5563" />

        {/* Right Leg */}
        <ellipse
          cx="54"
          cy="106"
          rx="32"
          ry="24"
          transform="rotate(12 54 106)"
          fill="url(#pandaBlackFurGrad)"
          stroke="#0A0F0D"
          strokeWidth="2"
        />
        <ellipse cx="58" cy="108" rx="12" ry="9" fill="#374151" />
        <circle cx="46" cy="96" r="4" fill="#4B5563" />
        <circle cx="56" cy="93" r="4" fill="#4B5563" />
        <circle cx="66" cy="96" r="4" fill="#4B5563" />
      </g>

      {/* Plump Panda Torso & Scholar Silk Vest Trim (Thân gấu trúc tròn trịa & Áo gấm Trạng Nguyên) */}
      <ellipse
        cx="0"
        cy="62"
        rx="74"
        ry="64"
        fill="url(#pandaCreamFurGrad)"
        stroke="#D4AF37"
        strokeWidth="2.2"
      />
      {/* Black Shoulder Band */}
      <path
        d="M -68,36 C -42,12 42,12 68,36 C 74,54 68,66 54,60 C 26,38 -26,38 -54,60 C -68,66 -74,54 -68,36 Z"
        fill="url(#pandaBlackFurGrad)"
      />
      {/* Imperial Cinnabar & Gold Silk Collar (Cổ áo Trạng Nguyên thêu kim tuyến) */}
      <path
        d="M -38,22 Q 0,46 38,22 L 26,52 Q 0,66 -26,52 Z"
        fill="url(#cinnabarSealGrad)"
        stroke="url(#imperialGoldBeam)"
        strokeWidth="2"
      />
      <circle cx="0" cy="46" r="6" fill="url(#imperialGoldBeam)" />

      {/* Left Waving Arm Holding Fresh Green Bamboo Branch (Tay trái vẫy cành trúc xanh) */}
      <g className="halora-panda-wave">
        <ellipse
          cx="-74"
          cy="34"
          rx="28"
          ry="18"
          transform="rotate(-32 -74 34)"
          fill="url(#pandaBlackFurGrad)"
          stroke="#111827"
          strokeWidth="1.8"
        />
        {/* Bamboo Branch Held by Panda */}
        <g transform="translate(-94, 16) rotate(-18)">
          <path
            d="M 0,42 L 0,-56"
            stroke="#10B981"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <line x1="-4" y1="-10" x2="4" y2="-10" stroke="#D4AF37" strokeWidth="2" />
          <line x1="-4" y1="-34" x2="4" y2="-34" stroke="#D4AF37" strokeWidth="2" />
          <path
            d="M 0,-28 Q -24,-42 -42,-34 Q -22,-18 0,-28 Z"
            fill="url(#bambooLeafGrad)"
            stroke="#064E3B"
            strokeWidth="0.9"
          />
          <path
            d="M 0,-44 Q 24,-58 44,-48 Q 22,-32 0,-44 Z"
            fill="url(#bambooLeafGrad)"
            stroke="#064E3B"
            strokeWidth="0.9"
          />
          <path
            d="M 0,-54 Q -16,-74 -32,-68 Q -18,-50 0,-54 Z"
            fill="#6EE7B7"
          />
        </g>
      </g>

      {/* Right Arm Holding Imperial Calligraphy Scroll (Tay phải cầm cuộn thư pháp "彬彬") */}
      <g>
        <ellipse
          cx="72"
          cy="44"
          rx="26"
          ry="18"
          transform="rotate(24 72 44)"
          fill="url(#pandaBlackFurGrad)"
          stroke="#111827"
          strokeWidth="1.8"
        />
        {/* Imperial Jade & Gold Scroll (Cuộn thư pháp Hán ngữ) */}
        <g transform="translate(82, 42) rotate(14)">
          <rect
            x="-22"
            y="-34"
            width="44"
            height="68"
            rx="4"
            fill="#FAF3E0"
            stroke="url(#imperialGoldBeam)"
            strokeWidth="2.4"
          />
          {/* Top & Bottom Scroll Rollers */}
          <rect x="-27" y="-38" width="54" height="7" rx="3.5" fill="url(#cinnabarSealGrad)" stroke="#D4AF37" strokeWidth="1.2" />
          <rect x="-27" y="31" width="54" height="7" rx="3.5" fill="url(#cinnabarSealGrad)" stroke="#D4AF37" strokeWidth="1.2" />
          <text
            x="0"
            y="-6"
            textAnchor="middle"
            fill="#1E3227"
            fontSize="16"
            fontWeight="900"
            fontFamily="'Noto Serif SC', 'Songti SC', serif"
          >
            篤學
          </text>
          <text
            x="0"
            y="18"
            textAnchor="middle"
            fill="#B82017"
            fontSize="15"
            fontWeight="900"
            fontFamily="'Noto Serif SC', 'Songti SC', serif"
          >
            彬彬
          </text>
        </g>
      </g>

      {/* Rounded Panda Head & Ears (Đầu gấu trúc tròn bầu bĩnh đáng yêu) */}
      <g transform="translate(0, -34)">
        {/* Round Black Ears */}
        <circle cx="-54" cy="-48" r="24" fill="url(#pandaBlackFurGrad)" stroke="#090D0B" strokeWidth="2" />
        <circle cx="-54" cy="-48" r="12" fill="#374151" opacity="0.6" />
        <circle cx="54" cy="-48" r="24" fill="url(#pandaBlackFurGrad)" stroke="#090D0B" strokeWidth="2" />
        <circle cx="54" cy="-48" r="12" fill="#374151" opacity="0.6" />

        {/* Main Plush Cream Head */}
        <ellipse
          cx="0"
          cy="0"
          rx="72"
          ry="62"
          fill="url(#pandaCreamFurGrad)"
          stroke="#E2D5B5"
          strokeWidth="2"
        />

        {/* Rosy Cheeks (Má hồng phúng phính) */}
        <ellipse cx="-42" cy="16" rx="14" ry="8.5" fill="#FB7185" opacity="0.55" />
        <ellipse cx="42" cy="16" rx="14" ry="8.5" fill="#FB7185" opacity="0.55" />

        {/* Iconic Dark Eye Patches & Glossy Blinking Eyes (Đôi mắt đen láy có hồn & chớp mắt) */}
        <g className="halora-panda-blink">
          {/* Left Eye Patch */}
          <ellipse
            cx="-27"
            cy="-4"
            rx="20"
            ry="16"
            transform="rotate(-14 -27 -4)"
            fill="url(#pandaBlackFurGrad)"
          />
          {/* Left Glossy Eye */}
          <circle cx="-25" cy="-5" r="9.5" fill="#FFFFFF" />
          <circle cx="-24" cy="-5" r="7.2" fill="#1E1B18" />
          <circle cx="-26.5" cy="-8" r="3.2" fill="#FFFFFF" />
          <circle cx="-21.5" cy="-2.5" r="1.5" fill="#FFFFFF" />

          {/* Right Eye Patch */}
          <ellipse
            cx="27"
            cy="-4"
            rx="20"
            ry="16"
            transform="rotate(14 27 -4)"
            fill="url(#pandaBlackFurGrad)"
          />
          {/* Right Glossy Eye */}
          <circle cx="25" cy="-5" r="9.5" fill="#FFFFFF" />
          <circle cx="24" cy="-5" r="7.2" fill="#1E1B18" />
          <circle cx="21.5" cy="-8" r="3.2" fill="#FFFFFF" />
          <circle cx="26.5" cy="-2.5" r="1.5" fill="#FFFFFF" />
        </g>

        {/* Cute Snout, Nose & Joyful Smile */}
        <ellipse cx="0" cy="14" rx="18" ry="13" fill="#FFFFFF" />
        <path
          d="M -9,8 C -9,4 9,4 9,8 C 9,13 4,16 0,16 C -4,16 -9,13 -9,8 Z"
          fill="#1F2937"
        />
        <ellipse cx="-2.5" cy="7.5" rx="3" ry="1.3" fill="#9CA3AF" opacity="0.7" />
        {/* Happy Smiling Mouth */}
        <path
          d="M -12,20 Q -6,27 0,20 Q 6,27 12,20"
          fill="none"
          stroke="#1F2937"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M -5,23 Q 0,30 5,23 Z"
          fill="#F43F5E"
        />

        {/* Imperial Scholar Hat (Mũ Trạng Nguyên 状元帽 Chu Sa & Vàng Kim) */}
        <g transform="translate(0, -58)">
          {/* Side Wing Fins (Cánh chuồn mũ Trạng Nguyên) */}
          <path
            d="M -42,4 C -68,0 -88,-6 -92,-14 C -86,-22 -64,-18 -40,-8 Z"
            fill="url(#cinnabarSealGrad)"
            stroke="url(#imperialGoldBeam)"
            strokeWidth="2"
          />
          <path
            d="M 42,4 C 68,0 88,-6 92,-14 C 86,-22 64,-18 40,-8 Z"
            fill="url(#cinnabarSealGrad)"
            stroke="url(#imperialGoldBeam)"
            strokeWidth="2"
          />
          {/* Scholar Crown Dome */}
          <path
            d="M -42,10 L -36,-18 C -36,-30 36,-30 36,-18 L 42,10 Z"
            fill="url(#cinnabarSealGrad)"
            stroke="url(#imperialGoldBeam)"
            strokeWidth="2.4"
          />
          {/* Front Brim */}
          <rect
            x="-46"
            y="4"
            width="92"
            height="11"
            rx="5.5"
            fill="#1E3227"
            stroke="url(#imperialGoldBeam)"
            strokeWidth="2.2"
          />
          {/* Central Luminous Jade Emblem on Scholar Hat */}
          <circle
            cx="0"
            cy="-6"
            r="9"
            fill="url(#azureDragonGrad)"
            stroke="#FFF3B8"
            strokeWidth="2"
          />
          <circle cx="-2.5" cy="-8.5" r="2.5" fill="#FFFFFF" opacity="0.85" />
          {/* Top Golden Finial */}
          <circle cx="0" cy="-29" r="5" fill="url(#imperialGoldBeam)" />
        </g>
      </g>
      </g>
    </g>
  );

  const currentThemeMeta =
    activeMode === 'custom'
      ? {
          id: 'custom' as const,
          badgeIcon: '🖼️',
          label: 'Linh Vật Riêng',
          chineseTitle: '自定义徽章',
          subtitle: 'Huy hiệu tùy chỉnh của lớp học',
          accentHex: '#D4AF37',
        }
      : HERO_MASCOT_THEMES[activeMode];

  return (
    <div
      className="halora-visual-stage"
      data-testid="eastern-dragon-scene"
      data-mascot-mode={activeMode}
      aria-label={`Nguyệt Môn Hoàng Gia — ${currentThemeMeta.label}`}
    >
      <div className="halora-visual-media-wrap">
        {/* Particle Canvas */}
        <canvas ref={canvasRef} className="halora-dragon-canvas" aria-hidden="true" />

        {/* Master Imperial SVG Scene */}
        <svg
          viewBox="0 0 1920 1084"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
          aria-hidden="true"
        >
          <defs>
            {/* 1. Deep Jade Background Gradient */}
            <radialGradient id="imperialJadeGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1F3E2D" />
              <stop offset="65%" stopColor="#15291E" />
              <stop offset="100%" stopColor="#0C1811" />
            </radialGradient>

            {/* 2. Imperial Gold Gradients */}
            <linearGradient id="imperialGoldBeam" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF6D6" />
              <stop offset="28%" stopColor="#F0CE73" />
              <stop offset="55%" stopColor="#D4AF37" />
              <stop offset="82%" stopColor="#A67E22" />
              <stop offset="100%" stopColor="#694E10" />
            </linearGradient>

            <linearGradient id="imperialGoldHorizontal" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9C7924" />
              <stop offset="30%" stopColor="#FDEAA8" />
              <stop offset="50%" stopColor="#D4AF37" />
              <stop offset="70%" stopColor="#FDEAA8" />
              <stop offset="100%" stopColor="#9C7924" />
            </linearGradient>

            {/* 3. Cinnabar Vermilion Dragon & Scale Gradients */}
            <linearGradient id="cinnabarDragonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF6B5E" />
              <stop offset="35%" stopColor="#E02B22" />
              <stop offset="75%" stopColor="#B0150E" />
              <stop offset="100%" stopColor="#750A06" />
            </linearGradient>

            <linearGradient id="cinnabarScaleHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#C61A12" />
              <stop offset="65%" stopColor="#F44336" />
              <stop offset="100%" stopColor="#FFD54F" />
            </linearGradient>

            {/* 4. Azure Emerald Jade Gradient */}
            <linearGradient id="azureDragonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#74E5D4" />
              <stop offset="35%" stopColor="#22B8A0" />
              <stop offset="70%" stopColor="#107C6B" />
              <stop offset="100%" stopColor="#094A40" />
            </linearGradient>

            {/* 5. Bamboo Culm & Leaf Gradients (翠竹) */}
            <linearGradient id="bambooCulmGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#155E3F" />
              <stop offset="40%" stopColor="#34D399" />
              <stop offset="75%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#064E3B" />
            </linearGradient>

            <linearGradient id="bambooLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A7F3D0" />
              <stop offset="45%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            {/* 6. Scholar Panda Gradients (国宝熊猫) */}
            <radialGradient id="pandaCreamFurGrad" cx="45%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="70%" stopColor="#F9F6EE" />
              <stop offset="100%" stopColor="#E6DEC8" />
            </radialGradient>

            <radialGradient id="pandaBlackFurGrad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="55%" stopColor="#181D24" />
              <stop offset="100%" stopColor="#090C10" />
            </radialGradient>

            {/* 7. Auspicious Cloud Fill */}
            <linearGradient id="cloudGoldFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 244, 200, 0.32)" />
              <stop offset="100%" stopColor="rgba(212, 175, 55, 0.08)" />
            </linearGradient>

            {/* 8. Cinnabar Seal Stone Gradient */}
            <linearGradient id="cinnabarSealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#DC3226" />
              <stop offset="50%" stopColor="#B82017" />
              <stop offset="100%" stopColor="#7E100A" />
            </linearGradient>

            {/* 9. Flaming Luminous Pearl Gradients (龙戏珠) */}
            <radialGradient id="flamingPearlCore" cx="38%" cy="38%" r="62%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="28%" stopColor="#FFF7C2" />
              <stop offset="58%" stopColor="#FFC125" />
              <stop offset="85%" stopColor="#E64119" />
              <stop offset="100%" stopColor="#8A1305" />
            </radialGradient>

            <radialGradient id="pearlAuraGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255, 238, 160, 0.92)" />
              <stop offset="42%" stopColor="rgba(212, 175, 55, 0.45)" />
              <stop offset="80%" stopColor="rgba(212, 175, 55, 0.1)" />
              <stop offset="100%" stopColor="rgba(212, 175, 55, 0)" />
            </radialGradient>

            {/* 10. Imperial Brocade Lattice Grid Pattern */}
            <pattern id="brocadeLattice" width="28" height="28" patternUnits="userSpaceOnUse">
              <path
                d="M 14,0 L 28,14 L 14,28 L 0,14 Z"
                fill="none"
                stroke="#D4AF37"
                strokeWidth="0.8"
                opacity="0.14"
              />
              <circle cx="14" cy="14" r="1.5" fill="#D4AF37" opacity="0.18" />
            </pattern>

            {/* 11. Filters for 3D Emboss & Shimmer */}
            <filter id="goldEmboss3D" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000000" floodOpacity="0.75" />
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#D4AF37" floodOpacity="0.4" />
            </filter>

            <filter id="cinnabarSealShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="rgba(70, 8, 5, 0.6)" />
            </filter>

            {/* Circular Moon Gate Clip Path */}
            <clipPath id="moonGateClip">
              <circle cx="975" cy="535" r="338" />
            </clipPath>
          </defs>

          {/* MAIN IMPERIAL MEDALLION GROUP */}
          <g transform="translate(0, 0)">
            {/* Back Ambient Halo Ring */}
            <circle
              cx="975"
              cy="535"
              r="386"
              fill="none"
              stroke="#D4AF37"
              strokeWidth="1.6"
              opacity="0.28"
              strokeDasharray="5 8"
            />

            {/* Outermost Ring: Rotating Chinese Fretwork / Meander Border (Hồi Văn) */}
            <g className="halora-fretwork-rotating">
              <circle
                cx="975"
                cy="535"
                r="368"
                fill="none"
                stroke="url(#imperialGoldBeam)"
                strokeWidth="20"
                opacity="0.78"
              />
              {meanderSegments.map((angle, idx) => (
                <g key={idx} transform={`rotate(${angle} 975 535)`}>
                  <path
                    d="M 975,158 L 980,158 L 980,172 L 970,172 L 970,163 L 975,163"
                    fill="none"
                    stroke="#2D1C05"
                    strokeWidth="1.8"
                    strokeLinecap="square"
                  />
                  <rect
                    x="973"
                    y="174"
                    width="4"
                    height="4"
                    fill="#FFF0B3"
                    opacity="0.82"
                  />
                </g>
              ))}
            </g>

            {/* Inner Ring Separator Rim */}
            <circle
              cx="975"
              cy="535"
              r="354"
              fill="none"
              stroke="url(#imperialGoldHorizontal)"
              strokeWidth="4"
              filter="drop-shadow(0 0 6px rgba(212, 175, 55, 0.5))"
            />

            {/* INTERIOR CIRCULAR MOON GATE WINDOW */}
            <g clipPath="url(#moonGateClip)">
              {/* Deep Jade Gradient Ground */}
              <circle cx="975" cy="535" r="340" fill="url(#imperialJadeGrad)" />

              {/* Brocade Lattice Overlay */}
              <rect
                x="635"
                y="195"
                width="680"
                height="680"
                fill="url(#brocadeLattice)"
              />

              {/* Inner Center Radiance Glow */}
              <circle
                cx="975"
                cy="535"
                r="245"
                fill="url(#pearlAuraGlow)"
                opacity="0.36"
              />

              {/* Base Engravings: Chinese Water Waves (Sóng Thủy Ba / Hải Thủy Giang Nhai) */}
              <g transform="translate(975, 535)" opacity="0.38">
                <path
                  d="M -340,240 C -260,200 -180,260 -100,210 C -20,170 60,250 140,200 C 220,160 280,230 340,240 L 340,340 L -340,340 Z"
                  fill="#0B1A12"
                  stroke="#D4AF37"
                  strokeWidth="1.6"
                />
                <path
                  d="M -340,270 C -270,245 -200,285 -130,250 C -50,220 30,280 110,240 C 190,210 260,265 340,270 L 340,340 L -340,340 Z"
                  fill="#08140E"
                  stroke="#ECC869"
                  strokeWidth="1.2"
                />
                <path
                  d="M -50,340 L 0,235 L 50,340 Z"
                  fill="#0E2319"
                  stroke="#D4AF37"
                  strokeWidth="1.8"
                />
              </g>

              {/* ========================================================
                  MODE 1: CHU SA THẦN LONG (中华神龙 · 龙戏珠)
                  ======================================================== */}
              {activeMode === 'dragon' && (
                <g className="halora-dragon-levitating">
                  <g transform="translate(975, 535)">
                    {/* Golden Auspicious Clouds (Tường Vân 祥云) */}
                    {renderAuspiciousCloud('dragon-cloud-1', -185, -150, 0.82, false, 'halora-cloud-drift-slow')}
                    {renderAuspiciousCloud('dragon-cloud-2', 190, -135, 0.78, true, 'halora-cloud-drift-fast')}
                    {renderAuspiciousCloud('dragon-cloud-3', -195, 135, 0.75, false, 'halora-cloud-drift-fast')}
                    {renderAuspiciousCloud('dragon-cloud-4', 185, 155, 0.8, true, 'halora-cloud-drift-slow')}

                    {/* Layered Scaled Dragon Body with 4 Five-Clawed Limbs & Head */}
                    {renderScaledDragonBody(fullDragonNodes, true)}

                    {/* Inner Radiant Pearl of Wisdom (Long Hí Châu - 龙戏珠) chased by the Dragon's Jaws & Claws */}
                    <g transform="translate(18, -110)">
                      <g className="halora-pearl-glowing">
                        <circle cx="0" cy="0" r="38" fill="url(#pearlAuraGlow)" />
                        <path
                          d="M 0,-30 C -11,-17 -24,-8 -27,6 C -30,20 -16,32 0,32 C 16,32 30,20 27,6 C 24,-8 11,-17 0,-30 Z"
                          fill="none"
                          stroke="url(#imperialGoldBeam)"
                          strokeWidth="2.5"
                          opacity="0.9"
                        />
                        <circle
                          cx="0"
                          cy="0"
                          r="18"
                          fill="url(#flamingPearlCore)"
                          stroke="#FFFDF0"
                          strokeWidth="2.2"
                          filter="drop-shadow(0 0 12px rgba(255, 190, 60, 0.95))"
                        />
                        <circle cx="-5" cy="-5" r="4.5" fill="#FFFFFF" opacity="0.9" />
                      </g>
                    </g>
                  </g>

                  {/* Central 3D Embossed Metallic Gold Calligraphy ("龍" / "龙") */}
                  {showCalligraphyOnDragon && (
                    <g transform="translate(975, 545)" filter="url(#goldEmboss3D)">
                      <text
                        x="0"
                        y="36"
                        textAnchor="middle"
                        fill="none"
                        stroke="#593E0A"
                        strokeWidth="8"
                        strokeLinejoin="round"
                        fontFamily="'Noto Serif SC', 'Songti SC', serif"
                        fontSize="104"
                        fontWeight="900"
                      >
                        {characterForm === 'traditional' ? '龍' : '龙'}
                      </text>
                      <text
                        x="0"
                        y="34"
                        textAnchor="middle"
                        fill="url(#imperialGoldBeam)"
                        stroke="#FFEBB5"
                        strokeWidth="2.2"
                        strokeLinejoin="round"
                        fontFamily="'Noto Serif SC', 'Songti SC', serif"
                        fontSize="104"
                        fontWeight="900"
                      >
                        {characterForm === 'traditional' ? '龍' : '龙'}
                      </text>
                    </g>
                  )}
                </g>
              )}

              {/* ========================================================
                  MODE 2: GẤU TRÚC BIN BIN & RỪNG TRÚC XANH (国宝熊猫 & 翠竹)
                  ======================================================== */}
              {activeMode === 'panda' && (
                <g transform="translate(975, 535)">
                  {/* Golden Auspicious Clouds behind Bamboo Grove */}
                  {renderAuspiciousCloud('panda-cloud-l', -155, -165, 0.78, false, 'halora-cloud-drift-slow')}
                  {renderAuspiciousCloud('panda-cloud-r', 155, -160, 0.78, true, 'halora-cloud-drift-fast')}

                  {/* Multi-node Emerald Bamboo Stalks & Drifting Leaves */}
                  {renderEmeraldBambooGrove(1)}

                  {/* Adorable Scholar Panda Bin Bin in Center Foreground */}
                  {renderScholarPandaBinBin(0, 56, 1.12)}
                </g>
              )}

              {/* ========================================================
                  MODE 3: LONG TRÚC SONG HÀNH (龙竹呈祥 · KẾT HỢP HÀI HÒA)
                  ======================================================== */}
              {activeMode === 'harmony' && (
                <g transform="translate(975, 535)">
                  {/* 1. Swaying Emerald Bamboo Grove framing Left & Right */}
                  {renderEmeraldBambooGrove(0.92)}

                  {/* 2. Golden Auspicious Clouds (Tường Vân 祥云) */}
                  {renderAuspiciousCloud('harm-cloud-l', -170, -165, 0.74, false, 'halora-cloud-drift-slow')}
                  {renderAuspiciousCloud('harm-cloud-r', 175, -155, 0.74, true, 'halora-cloud-drift-fast')}

                  {/* 3. Soaring Cinnabar & Gold Dragon in Upper Heaven Arc */}
                  <g transform="translate(0, -36) scale(0.88)">
                    <g className="halora-dragon-levitating">
                      {renderScaledDragonBody(upperDragonNodes, false)}
                    </g>
                  </g>

                  {/* 4. Scholar Panda Bin Bin in Lower Foreground */}
                  {renderScholarPandaBinBin(0, 92, 0.92)}
                </g>
              )}

              {/* ========================================================
                  MODE 4: CUSTOM UPLOADED EMBLEM IMAGE
                  ======================================================== */}
              {activeMode === 'custom' && customImage && (
                <g className="halora-dragon-levitating">
                  <image
                    href={customImage}
                    x="635"
                    y="195"
                    width="680"
                    height="680"
                    preserveAspectRatio="xMidYMid slice"
                    style={{
                      mixBlendMode:
                        customBlendMode === 'screen'
                          ? 'screen'
                          : customBlendMode === 'overlay'
                          ? 'overlay'
                          : 'normal',
                    }}
                  />
                  <circle
                    cx="975"
                    cy="535"
                    r="330"
                    fill="none"
                    stroke="url(#imperialGoldBeam)"
                    strokeWidth="3"
                    opacity="0.6"
                  />
                </g>
              )}
            </g>

            {/* Inner Golden Rim Frame */}
            <circle
              cx="975"
              cy="535"
              r="340"
              fill="none"
              stroke="url(#imperialGoldBeam)"
              strokeWidth="6"
              filter="drop-shadow(0 0 8px rgba(212, 175, 55, 0.6))"
            />

            {/* ========================================================
                FLAMING LUMINOUS PEARL (MINH CHÂU TỎA SÁNG - 龙戏珠 AT ZENITH)
                ======================================================== */}
            <g transform="translate(975, 195)">
              <g className="halora-pearl-glowing">
                <circle cx="0" cy="0" r="46" fill="url(#pearlAuraGlow)" />
                <path
                  d="M 0,-38 C -14,-22 -30,-10 -34,8 C -38,26 -20,40 0,40 C 20,40 38,26 34,8 C 30,-10 14,-22 0,-38 Z"
                  fill="none"
                  stroke="url(#imperialGoldBeam)"
                  strokeWidth="3.2"
                  opacity="0.88"
                />
                <path
                  d="M -18,-24 C -30,-8 -34,15 -18,28 M 18,-24 C 30,-8 34,15 18,28"
                  fill="none"
                  stroke="#FF8A80"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
                <circle
                  cx="0"
                  cy="0"
                  r="23"
                  fill="url(#flamingPearlCore)"
                  stroke="#FFFDF0"
                  strokeWidth="2.5"
                  filter="drop-shadow(0 0 14px rgba(255, 180, 50, 0.92))"
                />
                <circle cx="-6" cy="-6" r="5.5" fill="#FFFFFF" opacity="0.88" />
              </g>
            </g>

            {/* ========================================================
                CLASSICAL CINNABAR SEALS (ẤN TRIỆN CHU SA CỔ ĐIỂN)
                ======================================================== */}
            {/* Top-Left Archaic Seal: "龍" or "竹" */}
            <g
              transform="translate(685, 290)"
              className="halora-cinnabar-seal-top"
              filter="url(#cinnabarSealShadow)"
            >
              <rect
                x="0"
                y="0"
                width="68"
                height="68"
                rx="6"
                fill="url(#cinnabarSealGrad)"
                stroke="#FAF3E8"
                strokeWidth="2.2"
              />
              <rect
                x="5"
                y="5"
                width="58"
                height="58"
                rx="3"
                fill="none"
                stroke="#FFF0E6"
                strokeWidth="1.6"
                opacity="0.9"
              />
              <text
                x="34"
                y="48"
                textAnchor="middle"
                fill="#FFFDF7"
                fontSize="36"
                fontWeight="700"
                fontFamily="'Noto Serif SC', 'Songti SC', serif"
              >
                {activeMode === 'panda' ? '竹' : characterForm === 'traditional' ? '龍' : '龙'}
              </text>
            </g>

            {/* Bottom-Right Teacher Seal: "阮文受" (NGUYỄN VĂN THỤ) */}
            <g
              transform="translate(1205, 680)"
              className="halora-cinnabar-seal-bottom"
              filter="url(#cinnabarSealShadow)"
            >
              <rect
                x="0"
                y="0"
                width="84"
                height="118"
                rx="8"
                fill="url(#cinnabarSealGrad)"
                stroke="#FAF3E8"
                strokeWidth="2.2"
              />
              <rect
                x="6"
                y="6"
                width="72"
                height="106"
                rx="4"
                fill="none"
                stroke="#F4E8D6"
                strokeWidth="1.8"
                opacity="0.9"
              />
              <text
                x="42"
                y="38"
                textAnchor="middle"
                fill="#FAF3E8"
                fontSize="25"
                fontWeight="700"
                fontFamily="'Noto Serif SC', 'Songti SC', serif"
                letterSpacing="2"
              >
                阮
              </text>
              <text
                x="42"
                y="71"
                textAnchor="middle"
                fill="#FAF3E8"
                fontSize="25"
                fontWeight="700"
                fontFamily="'Noto Serif SC', 'Songti SC', serif"
                letterSpacing="2"
              >
                文
              </text>
              <text
                x="42"
                y="103"
                textAnchor="middle"
                fill="#FAF3E8"
                fontSize="25"
                fontWeight="700"
                fontFamily="'Noto Serif SC', 'Songti SC', serif"
                letterSpacing="2"
              >
                受
              </text>
            </g>
          </g>
        </svg>

        {/* Mascot style customization is controlled via the Top Navbar Theme Switcher to avoid duplicate bottom floating bars */}
      </div>

      {/* ========================================================
          MODAL: "TÙY CHỈNH LINH VẬT & NGUYỆT MÔN HOÀNG GIA"
          ======================================================== */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cài đặt Nguyệt Môn Hoàng Gia & Linh Vật"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto animate-fade-in"
        >
          <div className="relative w-full max-w-xl rounded-3xl bg-[#14231A] border border-[#D4AF37]/40 shadow-2xl overflow-hidden text-[#F2E8D2] flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-[#D4AF37]/20 flex items-center justify-between bg-gradient-to-r from-[#172B20] to-[#0E1A13]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#ECC869]">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#FFF4D0] font-['Noto_Serif_SC']">
                    Biểu Tượng Nghệ Thuật Trung Hoa
                  </h3>
                  <p className="text-xs text-[#A8BFAE]">
                    Chuyển đổi Thần Long, Gấu Trúc Bin Bin hoặc tải huy hiệu riêng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#A8BFAE] hover:text-white transition-colors"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#ECC869] mb-3">
                  1. Chọn Chủ Đề Biểu Tượng Văn Hóa (3 Chế Độ)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {CYCLE_MASCOT_ORDER.map((modeKey) => {
                    const meta = HERO_MASCOT_THEMES[modeKey];
                    const isSelected = activeMode === modeKey;
                    return (
                      <button
                        key={modeKey}
                        type="button"
                        onClick={() => handleSelectMode(modeKey)}
                        className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#D4AF37]/20 border-[#ECC869] ring-2 ring-[#ECC869]/30 shadow-md'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xl">{meta.badgeIcon}</span>
                          {isSelected && <Check className="w-4 h-4 text-[#ECC869]" />}
                        </div>
                        <div className="font-semibold text-xs text-[#FFF4D0]">{meta.label}</div>
                        <div className="text-xs font-['Noto_Serif_SC'] text-[#ECC869]">
                          {meta.chineseTitle}
                        </div>
                        <div className="text-xs text-[#A8BFAE] leading-relaxed">
                          {meta.subtitle}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Mascot Upload */}
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#ECC869]">
                    2. Hoặc Tải Ảnh Linh Vật Riêng (Logo / Huy hiệu trường)
                  </label>
                  {customImage && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomImage(null);
                        handleSelectMode('dragon');
                      }}
                      className="text-xs text-[#FA5B50] hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Xóa ảnh riêng
                    </button>
                  )}
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                    activeMode === 'custom' && customImage
                      ? 'border-[#ECC869] bg-[#D4AF37]/10'
                      : 'border-white/20 hover:border-[#D4AF37]/60 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {customImage ? (
                    <div className="flex items-center justify-center gap-4">
                      <img
                        src={customImage}
                        alt="Linh vật đã tải"
                        className="w-14 h-14 rounded-full object-cover border-2 border-[#ECC869] shadow-md"
                      />
                      <div className="text-left">
                        <div className="text-xs font-semibold text-[#FFF4D0]">
                          Đã nạp ảnh linh vật tùy chỉnh
                        </div>
                        <div className="text-xs text-[#A8BFAE]">
                          Bấm để chọn file khác (PNG, JPG, SVG)
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#ECC869]">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-semibold text-[#FFF4D0]">
                        Bấm để tải ảnh linh vật lên
                      </div>
                      <div className="text-xs text-[#A8BFAE]">
                        Tự động cắt lồng vào khung Nguyệt Môn tròn chuẩn cung đình
                      </div>
                    </div>
                  )}
                </div>

                {customImage && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 text-xs">
                    <span className="text-[#A8BFAE] text-xs">Chế độ hòa trộn:</span>
                    <button
                      type="button"
                      onClick={() => setCustomBlendMode('normal')}
                      className={`px-2.5 py-1 rounded-lg ${
                        customBlendMode === 'normal'
                          ? 'bg-[#ECC869] text-[#14231A] font-bold'
                          : 'bg-white/10 text-[#F2E8D2]'
                      }`}
                    >
                      Bình thường
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomBlendMode('screen')}
                      className={`px-2.5 py-1 rounded-lg ${
                        customBlendMode === 'screen'
                          ? 'bg-[#ECC869] text-[#14231A] font-bold'
                          : 'bg-white/10 text-[#F2E8D2]'
                      }`}
                    >
                      Ánh kim phát sáng
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomBlendMode('overlay')}
                      className={`px-2.5 py-1 rounded-lg ${
                        customBlendMode === 'overlay'
                          ? 'bg-[#ECC869] text-[#14231A] font-bold'
                          : 'bg-white/10 text-[#F2E8D2]'
                      }`}
                    >
                      Lồng gấm cung đình
                    </button>
                  </div>
                )}
              </div>

              {/* Calligraphy Overlay Controls */}
              <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-semibold text-[#FFF4D0]">
                    Đại tự thư pháp trung tâm
                  </div>
                  <div className="text-xs text-[#A8BFAE]">
                    Chữ Hán 3D ánh kim đúc nổi ở tâm Nguyệt Môn
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-xl bg-white/10 p-1 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setCharacterForm('traditional')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        characterForm === 'traditional'
                          ? 'bg-[#ECC869] text-[#14231A]'
                          : 'text-[#A8BFAE] hover:text-white'
                      }`}
                    >
                      Phồn thể (龍)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCharacterForm('simplified')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        characterForm === 'simplified'
                          ? 'bg-[#ECC869] text-[#14231A]'
                          : 'text-[#A8BFAE] hover:text-white'
                      }`}
                    >
                      Giản thể (龙)
                    </button>
                  </div>

                  {activeMode === 'dragon' && (
                    <button
                      type="button"
                      onClick={() => setShowCalligraphyOnDragon((v) => !v)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 ${
                        showCalligraphyOnDragon
                          ? 'bg-[#D4AF37]/20 border-[#ECC869] text-[#FFF4D0]'
                          : 'bg-white/5 border-white/10 text-[#A8BFAE]'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {showCalligraphyOnDragon ? 'Hiện chữ 龍' : 'Ẩn chữ 龍'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-[#D4AF37]/20 bg-[#0E1A13] flex items-center justify-between">
              <span className="text-xs text-[#A8BFAE]">
                {currentThemeMeta.chineseTitle} · HANU × 阮文受
              </span>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#ECC869] to-[#D4AF37] hover:from-[#FDEAA8] hover:to-[#ECC869] text-[#16261E] font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Hoàn tất &amp; Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
