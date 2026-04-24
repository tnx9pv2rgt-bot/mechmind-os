'use client';

import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import {
  Sun,
  Moon,
  Monitor,
  Check,
  RotateCcw,
  Palette,
  Type,
  Layout,
  Accessibility,
  PanelLeft,
  Maximize2,
  AlignCenter,
  Sparkles,
  ZapOff,
  Zap,
  Eye,
  PanelLeftClose,
  PanelLeftOpen,
  MousePointer,
} from 'lucide-react';
import {
  useThemeStore,
  COLOR_PRESETS,
  FONT_OPTIONS,
  type FontFamily,
  type FontSize,
  type Density,
  type BorderRadius,
  type SidebarBehavior,
  type SidebarTheme,
  type ContentWidth,
  type AnimationLevel,
  type ContrastLevel,
} from '@/stores/theme-store';
import { cn } from '@/lib/utils';

// ─── Animations ──────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

// ─── Option Button ───────────────────────────────────────────────────────────

function OptionButton({ selected, onClick, children, className }: { selected: boolean; onClick: () => void; children: React.ReactNode; className?: string }): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px]',
        selected
          ? 'bg-apple-dark dark:bg-[var(--surface-secondary)] text-[var(--text-on-brand)] dark:text-[var(--text-primary)] shadow-md'
          : 'bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-active)]',
        className
      )}
    >
      {children}
      {selected && <Check className="h-4 w-4 ml-auto" />}
    </button>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AppearancePage(): React.JSX.Element {
  const store = useThemeStore();

  return (
    <div>
      {/* Header */}
      <header className="">
        <div className="px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]">Aspetto</h1>
            <p className="text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1">
              Personalizza colori, font, layout e accessibilita
            </p>
          </div>
          <AppleButton
            variant="ghost"
            icon={<RotateCcw className="h-4 w-4" />}
            onClick={store.resetToDefaults}
          >
            Ripristina
          </AppleButton>
        </div>
      </header>

      <motion.div
        className="p-8 max-w-3xl mx-auto space-y-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* 1. Modalita */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] flex items-center justify-center">
                  <Sun className="h-4.5 w-4.5 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]" />
                </div>
                <h3 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Modalita</h3>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              <div className="grid grid-cols-1 gap-3">
                <OptionButton selected={true} onClick={() => {}}>
                  <Moon className="h-4 w-4" /> Scuro (modalita unica)
                </OptionButton>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* 2. Colore primario */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] flex items-center justify-center">
                  <Palette className="h-4.5 w-4.5 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]" />
                </div>
                <h3 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Colore primario</h3>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-3 mb-4">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => store.setPrimaryColor(preset.value)}
                    className={cn(
                      'w-10 h-10 rounded-full transition-all duration-200 flex items-center justify-center',
                      store.primaryColor === preset.value
                        ? 'ring-2 ring-offset-2 ring-offset-[var(--surface-elevated)] scale-110'
                        : 'hover:scale-110'
                    )}
                    style={{ backgroundColor: preset.value, '--tw-ring-color': preset.value } as React.CSSProperties}
                    title={preset.name}
                  >
                    {store.primaryColor === preset.value && (
                      <Check className="h-4 w-4 text-[var(--text-on-brand)] drop-shadow-md" />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <label className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Personalizzato:</label>
                <div className="flex items-center gap-2 bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] rounded-xl px-3 py-2">
                  <input
                    type="color"
                    value={store.primaryColor}
                    onChange={(e) => store.setPrimaryColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={store.primaryColor}
                    onChange={(e) => {
                      if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                        store.setPrimaryColor(e.target.value);
                      }
                    }}
                    className="w-20 bg-transparent text-sm font-mono text-[var(--text-primary)] dark:text-[var(--text-primary)] outline-none"
                    maxLength={7}
                  />
                </div>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* 3. Font */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] flex items-center justify-center">
                  <Type className="h-4.5 w-4.5 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]" />
                </div>
                <h3 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Tipografia</h3>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-2 block">Font</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {FONT_OPTIONS.map((font) => (
                      <OptionButton
                        key={font.value}
                        selected={store.fontFamily === font.value}
                        onClick={() => store.setFontFamily(font.value as FontFamily)}
                      >
                        <span style={{ fontFamily: font.css }}>{font.label}</span>
                      </OptionButton>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-2 block">Dimensione testo</label>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { value: 'small', label: 'Piccolo', size: 'text-xs' },
                      { value: 'medium', label: 'Medio', size: 'text-sm' },
                      { value: 'large', label: 'Grande', size: 'text-base' },
                    ] as const).map((opt) => (
                      <OptionButton
                        key={opt.value}
                        selected={store.fontSize === opt.value}
                        onClick={() => store.setFontSize(opt.value as FontSize)}
                      >
                        <span className={opt.size}>Aa</span> {opt.label}
                      </OptionButton>
                    ))}
                  </div>
                </div>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* 4. Densita interfaccia */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] flex items-center justify-center">
                  <Layout className="h-4.5 w-4.5 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]" />
                </div>
                <h3 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Densita</h3>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: 'compact', label: 'Compatta' },
                  { value: 'normal', label: 'Normale' },
                  { value: 'spacious', label: 'Spaziosa' },
                ] as const).map((opt) => (
                  <OptionButton
                    key={opt.value}
                    selected={store.density === opt.value}
                    onClick={() => store.setDensity(opt.value as Density)}
                  >
                    {opt.label}
                  </OptionButton>
                ))}
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* 5. Raggio bordi */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] flex items-center justify-center">
                  <Layout className="h-4.5 w-4.5 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]" />
                </div>
                <h3 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Raggio bordi</h3>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              <div className="grid grid-cols-5 gap-3">
                {([
                  { value: 'none', label: 'Netto', radius: '0px' },
                  { value: 'small', label: 'Leggero', radius: '4px' },
                  { value: 'medium', label: 'Medio', radius: '8px' },
                  { value: 'large', label: 'Arrotondato', radius: '12px' },
                  { value: 'pill', label: 'Pill', radius: '20px' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => store.setBorderRadius(opt.value as BorderRadius)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 transition-all duration-200 min-h-[44px] rounded-xl',
                      store.borderRadius === opt.value
                        ? 'bg-apple-dark dark:bg-[var(--surface-secondary)] text-[var(--text-on-brand)] dark:text-[var(--text-primary)]'
                        : 'bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-active)]'
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-7 border-2',
                        store.borderRadius === opt.value
                          ? 'border-[var(--border-default)] dark:border-apple-dark'
                          : 'border-[var(--text-tertiary)]/30'
                      )}
                      style={{ borderRadius: opt.radius }}
                    />
                    <span className="text-footnote font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* 6. Sidebar */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] flex items-center justify-center">
                  <PanelLeft className="h-4.5 w-4.5 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]" />
                </div>
                <h3 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Sidebar</h3>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              <div className="space-y-4">
                {/* Behavior */}
                <div>
                  <label className="text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-2 block">Comportamento</label>
                  <div className="grid grid-cols-3 gap-3">
                    <OptionButton
                      selected={store.sidebarBehavior === 'expanded'}
                      onClick={() => store.setSidebarBehavior('expanded' as SidebarBehavior)}
                    >
                      <PanelLeftOpen className="h-4 w-4" /> Espansa
                    </OptionButton>
                    <OptionButton
                      selected={store.sidebarBehavior === 'collapsed'}
                      onClick={() => store.setSidebarBehavior('collapsed' as SidebarBehavior)}
                    >
                      <PanelLeftClose className="h-4 w-4" /> Solo icone
                    </OptionButton>
                    <OptionButton
                      selected={store.sidebarBehavior === 'auto'}
                      onClick={() => store.setSidebarBehavior('auto' as SidebarBehavior)}
                    >
                      <MousePointer className="h-4 w-4" /> Auto (hover)
                    </OptionButton>
                  </div>
                  <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-2">
                    {store.sidebarBehavior === 'auto'
                      ? 'La sidebar si nasconde e appare al passaggio del mouse sul bordo sinistro.'
                      : store.sidebarBehavior === 'collapsed'
                        ? 'La sidebar mostra solo le icone per massimizzare lo spazio.'
                        : 'La sidebar resta sempre visibile con testo e icone.'}
                  </p>
                </div>

                {/* Theme */}
                <div>
                  <label className="text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-2 block">Tema sidebar</label>
                  <div className="grid grid-cols-3 gap-3">
                    <OptionButton
                      selected={store.sidebarTheme === 'follow'}
                      onClick={() => store.setSidebarTheme('follow' as SidebarTheme)}
                    >
                      <Monitor className="h-4 w-4" /> Segue tema
                    </OptionButton>
                    <OptionButton
                      selected={store.sidebarTheme === 'dark'}
                      onClick={() => store.setSidebarTheme('dark' as SidebarTheme)}
                    >
                      <Moon className="h-4 w-4" /> Sempre scura
                    </OptionButton>
                    <OptionButton
                      selected={store.sidebarTheme === 'light'}
                      onClick={() => store.setSidebarTheme('light' as SidebarTheme)}
                    >
                      <Sun className="h-4 w-4" /> Sempre chiara
                    </OptionButton>
                  </div>
                </div>

                {/* Sidebar color */}
                <div>
                  <label className="text-footnote font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-2 block">Colore sidebar</label>
                  <div className="flex items-center gap-3">
                    {['#171717', '#1e293b', '#1e1b4b', '#14532d', '#7f1d1d', '#44403c'].map((color) => (
                      <button
                        key={color}
                        onClick={() => store.setSidebarColor(color)}
                        className={cn(
                          'w-10 h-10 rounded-full transition-all duration-200 flex items-center justify-center',
                          store.sidebarColor === color && 'ring-2 ring-offset-2 ring-offset-[var(--surface-elevated)] scale-110'
                        )}
                        style={{ backgroundColor: color }}
                      >
                        {store.sidebarColor === color && <Check className="h-4 w-4 text-[var(--text-on-brand)]" />}
                      </button>
                    ))}
                    <input
                      type="color"
                      value={store.sidebarColor}
                      onChange={(e) => store.setSidebarColor(e.target.value)}
                      className="w-10 h-10 rounded-full cursor-pointer border-2 border-[var(--border-default)]/20 dark:border-[var(--border-default)] bg-transparent"
                    />
                  </div>
                </div>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* 7. Larghezza contenuto */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] flex items-center justify-center">
                  <Maximize2 className="h-4.5 w-4.5 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]" />
                </div>
                <h3 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Larghezza contenuto</h3>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              <div className="grid grid-cols-2 gap-3">
                <OptionButton
                  selected={store.contentWidth === 'full'}
                  onClick={() => store.setContentWidth('full' as ContentWidth)}
                >
                  <Maximize2 className="h-4 w-4" /> Piena
                </OptionButton>
                <OptionButton
                  selected={store.contentWidth === 'centered'}
                  onClick={() => store.setContentWidth('centered' as ContentWidth)}
                >
                  <AlignCenter className="h-4 w-4" /> Centrata
                </OptionButton>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* 8. Animazioni */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] flex items-center justify-center">
                  <Sparkles className="h-4.5 w-4.5 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]" />
                </div>
                <h3 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Animazioni</h3>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              <div className="grid grid-cols-3 gap-3">
                <OptionButton
                  selected={store.animations === 'full'}
                  onClick={() => store.setAnimations('full' as AnimationLevel)}
                >
                  <Sparkles className="h-4 w-4" /> Attive
                </OptionButton>
                <OptionButton
                  selected={store.animations === 'reduced'}
                  onClick={() => store.setAnimations('reduced' as AnimationLevel)}
                >
                  <Zap className="h-4 w-4" /> Ridotte
                </OptionButton>
                <OptionButton
                  selected={store.animations === 'none'}
                  onClick={() => store.setAnimations('none' as AnimationLevel)}
                >
                  <ZapOff className="h-4 w-4" /> Disattivate
                </OptionButton>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* 9. Contrasto */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] flex items-center justify-center">
                  <Accessibility className="h-4.5 w-4.5 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]" />
                </div>
                <h3 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Accessibilita</h3>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              <div className="grid grid-cols-2 gap-3">
                <OptionButton
                  selected={store.contrast === 'normal'}
                  onClick={() => store.setContrast('normal' as ContrastLevel)}
                >
                  <Eye className="h-4 w-4" /> Contrasto normale
                </OptionButton>
                <OptionButton
                  selected={store.contrast === 'high'}
                  onClick={() => store.setContrast('high' as ContrastLevel)}
                >
                  <Eye className="h-4 w-4" /> Alto contrasto
                </OptionButton>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Anteprima */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h3 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Anteprima</h3>
            </AppleCardHeader>
            <AppleCardContent>
              <div className="flex items-center gap-4">
                <button
                  className="px-5 py-2.5 rounded-full text-sm font-medium text-[var(--text-on-brand)] min-h-[44px]"
                  style={{ backgroundColor: store.primaryColor }}
                >
                  Bottone primario
                </button>
                <button
                  className="px-5 py-2.5 rounded-full text-sm font-medium border-2 min-h-[44px]"
                  style={{ borderColor: store.primaryColor, color: store.primaryColor }}
                >
                  Bottone secondario
                </button>
                <span className="text-body font-medium" style={{ color: store.primaryColor }}>
                  Link di esempio
                </span>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
