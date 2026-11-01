import React, { useEffect, useState } from 'react';

export interface SafeImageProps {
  src?: string;
  alt: string;
  hanzi?: string;
  pinyin?: string;
  meaning?: string;
  className?: string;
  fallbackNode?: React.ReactNode;
  onImageLoaded?: () => void;
  onImageError?: () => void;
  testId?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  hanzi = '漢',
  pinyin = '',
  meaning = '',
  className = 'w-full h-full object-cover',
  fallbackNode,
  onImageLoaded,
  onImageError,
  testId = 'vocab-active-photo-img',
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setHasError(!src);
    setIsLoaded(false);
  }, [src]);

  // Timeout fallback in case an external image hangs indefinitely
  useEffect(() => {
    if (!src || isLoaded || hasError) return;
    const timer = window.setTimeout(() => {
      if (!isLoaded) {
        setHasError(true);
        onImageError?.();
      }
    }, 6500);
    return () => window.clearTimeout(timer);
  }, [src, isLoaded, hasError, onImageError]);

  const descriptiveAlt =
    alt && alt.trim().length > 0
      ? alt
      : `Minh họa ngữ cảnh từ vựng tiếng Trung ${hanzi}${pinyin ? ` (${pinyin})` : ''}${
          meaning ? ` — nghĩa là ${meaning}` : ''
        }`;

  if (hasError || !src) {
    if (fallbackNode) {
      return <>{fallbackNode}</>;
    }
    return (
      <div
        role="img"
        aria-label={descriptiveAlt}
        data-testid="safe-image-oriental-fallback"
        className="w-full h-full min-h-[160px] from-[#14261E] via-[#1B352A] to-[#0E1B15] flex flex-col items-center justify-center p-4 text-center relative overflow-hidden select-none"
      >
        <svg
          viewBox="0 0 400 220"
          className="absolute inset-0 w-full h-full pointer-events-none opacity-35"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="inkWashGlow" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#C5B358" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#0F5243" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="200" cy="100" r="110" fill="url(#inkWashGlow)" />
          <path
            d="M0 185 Q95 140 190 175 T400 155 L400 220 L0 220 Z"
            fill="#0F5243"
            fillOpacity="0.45"
          />
          <rect
            x="10"
            y="10"
            width="380"
            height="200"
            rx="12"
            fill="none"
            stroke="#C5B358"
            strokeWidth="1.2"
            strokeOpacity="0.5"
          />
        </svg>
        <div className="relative z-10 flex flex-col items-center gap-1">
          <span className="font-hanzi-calligraphy text-4xl sm:text-5xl font-bold text-white drop-shadow">
            {hanzi}
          </span>
          {pinyin && (
            <span className="text-sm font-bold text-highlight tracking-wide">{pinyin}</span>
          )}
          {meaning && (
            <span className="text-sm font-medium text-[#E5E9D7] max-w-[260px] line-clamp-2">
              {meaning}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={descriptiveAlt}
      referrerPolicy="no-referrer"
      data-testid={testId}
      loading="eager"
      className={`${className} transition-opacity duration-300 ${
        isLoaded ? 'opacity-100' : 'opacity-0'
      }`}
      onLoad={() => {
        setIsLoaded(true);
        onImageLoaded?.();
      }}
      onError={() => {
        setHasError(true);
        onImageError?.();
      }}
    />
  );
};
