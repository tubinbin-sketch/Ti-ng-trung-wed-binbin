import React from 'react';
import { Check, Lock, LucideIcon } from 'lucide-react';
import { TeacherThemePreset } from '../../data/chineseData';

export interface NavItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  onSelect: () => void;
  testId?: string;
  locked?: boolean;
  badge?: number | string;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

/* -------------------------------------------------------------------------- */
/* Brand                                                                       */
/* -------------------------------------------------------------------------- */
export function BrandMark({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2.5 rounded-xl cursor-pointer"
      aria-label="HANU HSK — về trang tổng quan"
    >
      <span className="app-seal" aria-hidden="true">
        汉
      </span>
      <span className="leading-tight text-left">
        <span className="block text-[15px] font-semibold text-ink">HANU HSK</span>
        <span className="block text-xs text-ink-subtle font-hanzi">阮文受 · 汉语课堂</span>
      </span>
    </button>
  );
}

export function initialsOf(name: string): string {
  const clean = name.replace(/\s*\(.*?\)\s*/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'HV';
  const last = parts[parts.length - 1];
  return last.slice(0, 2).toUpperCase();
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-grid place-items-center shrink-0 rounded-full bg-primary-soft text-primary font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initialsOf(name)}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Desktop sidebar                                                             */
/* -------------------------------------------------------------------------- */
export function AppSidebar({
  sections,
  activeId,
  onHome,
  footer,
}: {
  sections: NavSection[];
  activeId: string;
  onHome: () => void;
  footer: React.ReactNode;
}) {
  return (
    <aside
      data-testid="app-sidebar"
      className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-border bg-surface"
      aria-label="Điều hướng chính"
    >
      <div className="h-16 px-5 flex items-center shrink-0">
        <BrandMark onClick={onHome} />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-6" aria-label="Mục chính">
        {sections.map((section) => (
          <div key={section.id}>
            {section.label && (
              <div className="px-3 pb-1.5 text-xs font-medium text-ink-subtle">{section.label}</div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === activeId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      data-testid={item.testId}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={item.onSelect}
                      className="app-nav-link cursor-pointer"
                    >
                      <Icon aria-hidden="true" />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {item.locked && (
                        <Lock className="!w-3.5 !h-3.5 text-ink-subtle" aria-label="Cần đăng nhập giáo viên" />
                      )}
                      {item.badge !== undefined && !item.locked && (
                        <span className="min-w-6 px-1.5 py-0.5 rounded-md bg-surface-2 text-ink-muted text-xs font-medium tabular-nums text-center">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-3">{footer}</div>
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/* Mobile bottom tab bar                                                       */
/* -------------------------------------------------------------------------- */
export function AppTabBar({ items, activeId }: { items: NavItem[]; activeId: string }) {
  return (
    <nav
      data-testid="app-tabbar"
      aria-label="Điều hướng nhanh"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-surface/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeId;
          return (
            <li key={item.id}>
              <button
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={item.onSelect}
                className="app-tabbar-link w-full cursor-pointer"
              >
                <Icon aria-hidden="true" />
                <span className="truncate max-w-full px-1">{item.shortLabel || item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* Theme picker (used inside the user menu)                                    */
/* -------------------------------------------------------------------------- */
export function ThemePicker({
  themes,
  selectedId,
  onSelect,
}: {
  themes: TeacherThemePreset[];
  selectedId: string;
  onSelect: (theme: TeacherThemePreset) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Giao diện" data-testid="theme-switcher" className="flex items-center gap-2">
      {themes.map((t) => {
        const isSelected = t.id === selectedId;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            title={`${t.name} — ${t.subtitle}`}
            aria-label={t.name}
            onClick={() => onSelect(t)}
            className={`relative w-8 h-8 rounded-full grid place-items-center cursor-pointer transition-shadow ${
              isSelected ? 'ring-2 ring-offset-2 ring-offset-surface ring-ink' : 'ring-1 ring-border-strong'
            }`}
            style={{
              background: `linear-gradient(135deg, ${t.bgSurface} 0 50%, ${t.accentColor} 50% 100%)`,
            }}
          >
            {isSelected && (
              <Check
                className="w-3.5 h-3.5"
                style={{ color: t.id === 'moon-night' ? '#ECEEF1' : '#15181D' }}
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
