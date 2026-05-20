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
  Wrench,
  Clock,
  BarChart2,
  Table2,
  Printer,
  BellRing,
  ListFilter,
  Layers,
} from 'lucide-react';
import {
  useThemeStore,
  COLOR_PRESETS,
  FONT_OPTIONS,
  CHART_PALETTES,
  STATUS_LABELS,
  type ThemeMode,
  type ThemePreset,
  type FontFamily,
  type FontSize,
  type Density,
  type TableDensity,
  type BorderRadius,
  type SidebarBehavior,
  type SidebarTheme,
  type ContentWidth,
  type AnimationLevel,
  type ContrastLevel,
  type ToastPosition,
  type DateFormat,
  type TimeFormat,
  type DecimalSeparator,
  type ChartPalette,
  type StatusColors,
} from '@/stores/theme-store';
import { NAV_GROUPS } from '@/components/layout/sidebar';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
};

function OptionButton({
  selected,
  onClick,
  children,
  className,
  disabled,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}): React.ReactElement {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed',
        selected
          ? 'bg-apple-dark dark:bg-[var(--surface-secondary)] text-[var(--text-on-brand)] dark:text-[var(--text-primary)] shadow-md'
          : 'bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-active)]',
        className
      )}
    >
      {children}
      {selected && <Check className='h-4 w-4 ml-auto shrink-0' />}
    </button>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <motion.div variants={itemVariants}>
      <AppleCard hover={false}>
        <AppleCardHeader>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] flex items-center justify-center shrink-0'>
              {icon}
            </div>
            <h3 className='text-title-2 font-semibold text-[var(--text-primary)]'>{title}</h3>
          </div>
        </AppleCardHeader>
        <AppleCardContent>{children}</AppleCardContent>
      </AppleCard>
    </motion.div>
  );
}

const ICON_CLS = 'h-4 w-4 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]';

const PROTECTED_HREFS = new Set([
  '/dashboard',
  '/dashboard/settings/appearance',
  '/dashboard/settings',
]);

const TOAST_POSITIONS: { value: ToastPosition; label: string; x: string; y: string }[] = [
  { value: 'top-left', label: 'Alto sinistra', x: 'left-1', y: 'top-1' },
  { value: 'top-center', label: 'Alto centro', x: 'left-1/2 -translate-x-1/2', y: 'top-1' },
  { value: 'top-right', label: 'Alto destra', x: 'right-1', y: 'top-1' },
  { value: 'bottom-left', label: 'Basso sinistra', x: 'left-1', y: 'bottom-1' },
  { value: 'bottom-center', label: 'Basso centro', x: 'left-1/2 -translate-x-1/2', y: 'bottom-1' },
  { value: 'bottom-right', label: 'Basso destra', x: 'right-1', y: 'bottom-1' },
];

const PRESET_INFO: Record<
  Exclude<ThemePreset, 'custom'>,
  { label: string; desc: string; color: string }
> = {
  officina: { label: 'Officina', desc: 'Scuro, compatto, alto contrasto', color: '#ef4444' },
  ufficio: { label: 'Ufficio', desc: 'Chiaro, normale, pulito', color: '#2e95ff' },
  manager: { label: 'Manager', desc: 'Sistema, spazioso, centrato', color: '#8b5cf6' },
};

const STATUS_ORDER: (keyof StatusColors)[] = [
  'nuovo',
  'in_lavorazione',
  'attesa_ricambi',
  'completato',
  'annullato',
  'urgente',
];

export default function AppearancePage(): React.JSX.Element {
  const store = useThemeStore();

  return (
    <div>
      <header>
        <div className='px-8 py-5 flex items-center justify-between'>
          <div>
            <h1 className='text-headline text-[var(--text-primary)]'>Aspetto</h1>
            <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1'>
              Personalizza colori, font, layout e accessibilita
            </p>
          </div>
          <AppleButton
            variant='ghost'
            icon={<RotateCcw className='h-4 w-4' />}
            onClick={store.resetToDefaults}
          >
            Ripristina
          </AppleButton>
        </div>
      </header>

      <motion.div
        className='p-8 max-w-3xl mx-auto space-y-6'
        initial='hidden'
        animate='visible'
        variants={containerVariants}
      >
        {/* ── 0. Preset ── */}
        <motion.div variants={itemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <div className='flex items-center gap-3'>
                <div className='w-9 h-9 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] flex items-center justify-center'>
                  <Layers className={ICON_CLS} />
                </div>
                <h3 className='text-title-2 font-semibold text-[var(--text-primary)]'>Preset</h3>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              <div className='grid grid-cols-3 gap-3'>
                {(
                  Object.entries(PRESET_INFO) as [
                    Exclude<ThemePreset, 'custom'>,
                    (typeof PRESET_INFO)[keyof typeof PRESET_INFO],
                  ][]
                ).map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => store.applyPreset(key)}
                    className={cn(
                      'flex flex-col items-start gap-2 p-4 rounded-xl text-left transition-all duration-200 min-h-[44px] border-2',
                      store.preset === key
                        ? 'border-[var(--color-primary)] bg-[var(--surface-secondary)] shadow-md'
                        : 'border-transparent bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-active)]'
                    )}
                  >
                    <div className='w-5 h-5 rounded-full' style={{ backgroundColor: info.color }} />
                    <div>
                      <p className='text-sm font-semibold text-[var(--text-primary)]'>
                        {info.label}
                      </p>
                      <p className='text-xs text-[var(--text-tertiary)] mt-0.5'>{info.desc}</p>
                    </div>
                    {store.preset === key && (
                      <Check className='h-4 w-4 ml-auto text-[var(--color-primary)] self-end' />
                    )}
                  </button>
                ))}
              </div>
              {store.preset === 'custom' && (
                <p className='text-xs text-[var(--text-tertiary)] mt-3'>
                  Configurazione personalizzata — modifica le opzioni sotto
                </p>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* ── 1. Modalita ── */}
        <SectionCard icon={<Sun className={ICON_CLS} />} title='Modalita'>
          <div className='grid grid-cols-3 gap-3'>
            {(
              [
                { value: 'light' as ThemeMode, label: 'Chiaro', Icon: Sun },
                { value: 'dark' as ThemeMode, label: 'Scuro', Icon: Moon },
                { value: 'system' as ThemeMode, label: 'Sistema', Icon: Monitor },
              ] as const
            ).map(({ value, label, Icon }) => (
              <OptionButton
                key={value}
                selected={store.theme === value}
                onClick={() => store.setTheme(value)}
              >
                <Icon className='h-4 w-4' /> {label}
              </OptionButton>
            ))}
          </div>
        </SectionCard>

        {/* ── 2. Colore primario ── */}
        <SectionCard icon={<Palette className={ICON_CLS} />} title='Colore primario'>
          <div className='grid grid-cols-6 sm:grid-cols-12 gap-3 mb-4'>
            {COLOR_PRESETS.map(preset => (
              <button
                key={preset.value}
                onClick={() => store.setPrimaryColor(preset.value)}
                className={cn(
                  'w-10 h-10 rounded-full transition-all duration-200 flex items-center justify-center',
                  store.primaryColor === preset.value
                    ? 'ring-2 ring-offset-2 ring-offset-[var(--surface-elevated)] scale-110'
                    : 'hover:scale-110'
                )}
                style={
                  {
                    backgroundColor: preset.value,
                    '--tw-ring-color': preset.value,
                  } as React.CSSProperties
                }
                title={preset.name}
              >
                {store.primaryColor === preset.value && (
                  <Check className='h-4 w-4 text-white drop-shadow-md' />
                )}
              </button>
            ))}
          </div>
          <div className='flex items-center gap-3'>
            <label className='text-footnote text-[var(--text-tertiary)]'>Personalizzato:</label>
            <div className='flex items-center gap-2 bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] rounded-xl px-3 py-2'>
              <input
                type='color'
                value={store.primaryColor}
                onChange={e => store.setPrimaryColor(e.target.value)}
                className='w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent'
              />
              <input
                type='text'
                value={store.primaryColor}
                onChange={e => {
                  if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                    store.setPrimaryColor(e.target.value);
                  }
                }}
                className='w-20 bg-transparent text-sm font-mono text-[var(--text-primary)] outline-none'
                maxLength={7}
              />
            </div>
          </div>
        </SectionCard>

        {/* ── 3. Tipografia ── */}
        <SectionCard icon={<Type className={ICON_CLS} />} title='Tipografia'>
          <div className='space-y-4'>
            <div>
              <label className='text-footnote font-medium text-[var(--text-tertiary)] mb-2 block'>
                Font
              </label>
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
                {FONT_OPTIONS.map(font => (
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
              <label className='text-footnote font-medium text-[var(--text-tertiary)] mb-2 block'>
                Dimensione testo
              </label>
              <div className='grid grid-cols-3 gap-3'>
                {(
                  [
                    { value: 'small', label: 'Piccolo', cls: 'text-xs' },
                    { value: 'medium', label: 'Medio', cls: 'text-sm' },
                    { value: 'large', label: 'Grande', cls: 'text-base' },
                  ] as const
                ).map(opt => (
                  <OptionButton
                    key={opt.value}
                    selected={store.fontSize === opt.value}
                    onClick={() => store.setFontSize(opt.value as FontSize)}
                  >
                    <span className={opt.cls}>Aa</span> {opt.label}
                  </OptionButton>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── 4. Densita pagina ── */}
        <SectionCard icon={<Layout className={ICON_CLS} />} title='Densita pagina'>
          <div className='grid grid-cols-3 gap-3'>
            {(
              [
                { value: 'compact', label: 'Compatta' },
                { value: 'normal', label: 'Normale' },
                { value: 'spacious', label: 'Spaziosa' },
              ] as const
            ).map(opt => (
              <OptionButton
                key={opt.value}
                selected={store.density === opt.value}
                onClick={() => store.setDensity(opt.value as Density)}
              >
                {opt.label}
              </OptionButton>
            ))}
          </div>
        </SectionCard>

        {/* ── 5. Densita tabelle ── */}
        <SectionCard icon={<Table2 className={ICON_CLS} />} title='Densita tabelle'>
          <div className='grid grid-cols-3 gap-3'>
            {(
              [
                { value: 'compact', label: 'Compatta', rows: [1, 2, 3, 4, 5] },
                { value: 'normal', label: 'Normale', rows: [1, 2, 3] },
                { value: 'spacious', label: 'Spaziosa', rows: [1, 2] },
              ] as const
            ).map(opt => (
              <button
                key={opt.value}
                onClick={() => store.setTableDensity(opt.value as TableDensity)}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 min-h-[44px]',
                  store.tableDensity === opt.value
                    ? 'bg-apple-dark dark:bg-[var(--surface-secondary)] text-[var(--text-on-brand)] dark:text-[var(--text-primary)] shadow-md'
                    : 'bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-active)]'
                )}
              >
                <div className='w-full space-y-0.5'>
                  {opt.rows.map(r => (
                    <div
                      key={r}
                      className={cn(
                        'w-full rounded-sm',
                        store.tableDensity === opt.value
                          ? 'bg-[var(--text-on-brand)]/30 dark:bg-[var(--text-primary)]/20'
                          : 'bg-[var(--text-tertiary)]/20'
                      )}
                      style={{
                        height:
                          opt.value === 'compact' ? '4px' : opt.value === 'normal' ? '6px' : '9px',
                      }}
                    />
                  ))}
                </div>
                <span className='text-xs font-medium'>{opt.label}</span>
              </button>
            ))}
          </div>
          <p className='text-xs text-[var(--text-tertiary)] mt-2'>
            Indipendente dalla densita pagina — controlla altezza righe negli elenchi OdL, clienti,
            ricambi.
          </p>
        </SectionCard>

        {/* ── 6. Raggio bordi ── */}
        <SectionCard icon={<Layout className={ICON_CLS} />} title='Raggio bordi'>
          <div className='grid grid-cols-5 gap-3'>
            {(
              [
                { value: 'none', label: 'Netto', radius: '0px' },
                { value: 'small', label: 'Leggero', radius: '4px' },
                { value: 'medium', label: 'Medio', radius: '8px' },
                { value: 'large', label: 'Arrotondato', radius: '12px' },
                { value: 'pill', label: 'Pill', radius: '20px' },
              ] as const
            ).map(opt => (
              <button
                key={opt.value}
                onClick={() => store.setBorderRadius(opt.value as BorderRadius)}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 min-h-[44px]',
                  store.borderRadius === opt.value
                    ? 'bg-apple-dark dark:bg-[var(--surface-secondary)] text-[var(--text-on-brand)] dark:text-[var(--text-primary)] shadow-md'
                    : 'bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-active)]'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-7 border-2',
                    store.borderRadius === opt.value
                      ? 'border-[var(--text-on-brand)]/50 dark:border-[var(--text-primary)]/50'
                      : 'border-[var(--text-tertiary)]/30'
                  )}
                  style={{ borderRadius: opt.radius }}
                />
                <span className='text-footnote font-medium'>{opt.label}</span>
              </button>
            ))}
          </div>
        </SectionCard>

        {/* ── 7. Larghezza contenuto ── */}
        <SectionCard icon={<Maximize2 className={ICON_CLS} />} title='Larghezza contenuto'>
          <div className='grid grid-cols-2 gap-3'>
            <OptionButton
              selected={store.contentWidth === 'full'}
              onClick={() => store.setContentWidth('full' as ContentWidth)}
            >
              <Maximize2 className='h-4 w-4' /> Piena
            </OptionButton>
            <OptionButton
              selected={store.contentWidth === 'centered'}
              onClick={() => store.setContentWidth('centered' as ContentWidth)}
            >
              <AlignCenter className='h-4 w-4' /> Centrata (max 1200px)
            </OptionButton>
          </div>
        </SectionCard>

        {/* ── 8. Sidebar ── */}
        <SectionCard icon={<PanelLeft className={ICON_CLS} />} title='Sidebar'>
          <div className='space-y-4'>
            <div>
              <label className='text-footnote font-medium text-[var(--text-tertiary)] mb-2 block'>
                Comportamento
              </label>
              <div className='grid grid-cols-3 gap-3'>
                <OptionButton
                  selected={store.sidebarBehavior === 'expanded'}
                  onClick={() => store.setSidebarBehavior('expanded' as SidebarBehavior)}
                >
                  <PanelLeftOpen className='h-4 w-4' /> Espansa
                </OptionButton>
                <OptionButton
                  selected={store.sidebarBehavior === 'collapsed'}
                  onClick={() => store.setSidebarBehavior('collapsed' as SidebarBehavior)}
                >
                  <PanelLeftClose className='h-4 w-4' /> Solo icone
                </OptionButton>
                <OptionButton
                  selected={store.sidebarBehavior === 'auto'}
                  onClick={() => store.setSidebarBehavior('auto' as SidebarBehavior)}
                >
                  <MousePointer className='h-4 w-4' /> Auto (hover)
                </OptionButton>
              </div>
            </div>
            <div>
              <label className='text-footnote font-medium text-[var(--text-tertiary)] mb-2 block'>
                Tema sidebar
              </label>
              <div className='grid grid-cols-3 gap-3'>
                <OptionButton
                  selected={store.sidebarTheme === 'follow'}
                  onClick={() => store.setSidebarTheme('follow' as SidebarTheme)}
                >
                  <Monitor className='h-4 w-4' /> Segue tema
                </OptionButton>
                <OptionButton
                  selected={store.sidebarTheme === 'dark'}
                  onClick={() => store.setSidebarTheme('dark' as SidebarTheme)}
                >
                  <Moon className='h-4 w-4' /> Sempre scura
                </OptionButton>
                <OptionButton
                  selected={store.sidebarTheme === 'light'}
                  onClick={() => store.setSidebarTheme('light' as SidebarTheme)}
                >
                  <Sun className='h-4 w-4' /> Sempre chiara
                </OptionButton>
              </div>
            </div>
            <div>
              <label className='text-footnote font-medium text-[var(--text-tertiary)] mb-2 block'>
                Colore sidebar
              </label>
              <div className='flex items-center gap-3 flex-wrap'>
                {['#171717', '#1e293b', '#1e1b4b', '#14532d', '#7f1d1d', '#44403c'].map(color => (
                  <button
                    key={color}
                    onClick={() => store.setSidebarColor(color)}
                    className={cn(
                      'w-10 h-10 rounded-full transition-all duration-200 flex items-center justify-center',
                      store.sidebarColor === color &&
                        'ring-2 ring-offset-2 ring-offset-[var(--surface-elevated)] scale-110'
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {store.sidebarColor === color && <Check className='h-4 w-4 text-white' />}
                  </button>
                ))}
                <input
                  type='color'
                  value={store.sidebarColor}
                  onChange={e => store.setSidebarColor(e.target.value)}
                  className='w-10 h-10 rounded-full cursor-pointer border-2 border-[var(--border-default)]/20 bg-transparent'
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── 9. Animazioni ── */}
        <SectionCard icon={<Sparkles className={ICON_CLS} />} title='Animazioni'>
          <div className='grid grid-cols-3 gap-3'>
            <OptionButton
              selected={store.animations === 'full'}
              onClick={() => store.setAnimations('full' as AnimationLevel)}
            >
              <Sparkles className='h-4 w-4' /> Attive
            </OptionButton>
            <OptionButton
              selected={store.animations === 'reduced'}
              onClick={() => store.setAnimations('reduced' as AnimationLevel)}
            >
              <Zap className='h-4 w-4' /> Ridotte
            </OptionButton>
            <OptionButton
              selected={store.animations === 'none'}
              onClick={() => store.setAnimations('none' as AnimationLevel)}
            >
              <ZapOff className='h-4 w-4' /> Disattivate
            </OptionButton>
          </div>
        </SectionCard>

        {/* ── 10. Colori stato OdL ── */}
        <SectionCard icon={<Wrench className={ICON_CLS} />} title='Colori stato Ordini di Lavoro'>
          <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
            {STATUS_ORDER.map(key => (
              <div key={key} className='flex flex-col gap-1.5'>
                <label className='text-xs font-medium text-[var(--text-tertiary)]'>
                  {STATUS_LABELS[key]}
                </label>
                <div className='flex items-center gap-2 bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] rounded-xl px-3 py-2 min-h-[44px]'>
                  <input
                    type='color'
                    value={store.statusColors[key]}
                    onChange={e => store.setStatusColor(key, e.target.value)}
                    className='w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent'
                  />
                  <div
                    className='flex-1 px-2 py-1 rounded-lg text-xs font-medium text-white text-center truncate'
                    style={{ backgroundColor: store.statusColors[key] }}
                  >
                    {STATUS_LABELS[key]}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              STATUS_ORDER.forEach(key => {
                const defaults: Record<keyof StatusColors, string> = {
                  nuovo: '#3b82f6',
                  in_lavorazione: '#f97316',
                  attesa_ricambi: '#eab308',
                  completato: '#22c55e',
                  annullato: '#6b7280',
                  urgente: '#ef4444',
                };
                store.setStatusColor(key, defaults[key]);
              });
            }}
            className='mt-3 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] underline'
          >
            Ripristina colori predefiniti
          </button>
        </SectionCard>

        {/* ── 11. Formato data e ora ── */}
        <SectionCard icon={<Clock className={ICON_CLS} />} title='Formato data e ora'>
          <div className='space-y-4'>
            <div>
              <label className='text-footnote font-medium text-[var(--text-tertiary)] mb-2 block'>
                Formato data
              </label>
              <div className='grid grid-cols-3 gap-3'>
                {(
                  [
                    { value: 'DD/MM/YYYY', example: '10/05/2026' },
                    { value: 'MM/DD/YYYY', example: '05/10/2026' },
                    { value: 'YYYY-MM-DD', example: '2026-05-10' },
                  ] as const
                ).map(opt => (
                  <OptionButton
                    key={opt.value}
                    selected={store.dateFormat === opt.value}
                    onClick={() => store.setDateFormat(opt.value as DateFormat)}
                  >
                    <span className='font-mono text-xs'>{opt.example}</span>
                  </OptionButton>
                ))}
              </div>
            </div>
            <div>
              <label className='text-footnote font-medium text-[var(--text-tertiary)] mb-2 block'>
                Formato ora
              </label>
              <div className='grid grid-cols-2 gap-3'>
                {(
                  [
                    { value: '24h', example: '14:30' },
                    { value: '12h', example: '2:30 PM' },
                  ] as const
                ).map(opt => (
                  <OptionButton
                    key={opt.value}
                    selected={store.timeFormat === opt.value}
                    onClick={() => store.setTimeFormat(opt.value as TimeFormat)}
                  >
                    <span className='font-mono text-sm'>{opt.example}</span>
                  </OptionButton>
                ))}
              </div>
            </div>
            <div>
              <label className='text-footnote font-medium text-[var(--text-tertiary)] mb-2 block'>
                Separatore decimale
              </label>
              <div className='grid grid-cols-2 gap-3'>
                {(
                  [
                    { value: 'comma', example: '1.234,56 €', label: 'Virgola (IT)' },
                    { value: 'dot', example: '1,234.56 €', label: 'Punto (EN)' },
                  ] as const
                ).map(opt => (
                  <OptionButton
                    key={opt.value}
                    selected={store.decimalSeparator === opt.value}
                    onClick={() => store.setDecimalSeparator(opt.value as DecimalSeparator)}
                  >
                    <span className='font-mono text-xs'>{opt.example}</span>
                  </OptionButton>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── 12. Posizione notifiche ── */}
        <SectionCard icon={<BellRing className={ICON_CLS} />} title='Posizione notifiche'>
          <div className='grid grid-cols-3 gap-3'>
            {TOAST_POSITIONS.map(pos => (
              <button
                key={pos.value}
                onClick={() => store.setToastPosition(pos.value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 min-h-[44px]',
                  store.toastPosition === pos.value
                    ? 'bg-apple-dark dark:bg-[var(--surface-secondary)] text-[var(--text-on-brand)] dark:text-[var(--text-primary)] shadow-md'
                    : 'bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-active)]'
                )}
              >
                {/* Mini screen preview */}
                <div className='relative w-12 h-8 rounded border border-current/20 bg-current/5'>
                  <div
                    className={cn('absolute w-4 h-1.5 rounded-sm bg-current/40', pos.x, pos.y)}
                  />
                </div>
                <span className='text-xs font-medium text-center leading-tight'>{pos.label}</span>
              </button>
            ))}
          </div>
        </SectionCard>

        {/* ── 13. Palette grafici ── */}
        <SectionCard icon={<BarChart2 className={ICON_CLS} />} title='Palette grafici'>
          <div className='space-y-2'>
            {(
              Object.entries(CHART_PALETTES) as [ChartPalette, { name: string; colors: string[] }][]
            ).map(([key, palette]) => (
              <button
                key={key}
                onClick={() => store.setChartPalette(key)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 min-h-[44px]',
                  store.chartPalette === key
                    ? 'bg-apple-dark dark:bg-[var(--surface-secondary)] text-[var(--text-on-brand)] dark:text-[var(--text-primary)] shadow-md'
                    : 'bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-active)]'
                )}
              >
                <span className='text-sm font-medium w-32 text-left'>{palette.name}</span>
                <div className='flex gap-1.5 flex-1'>
                  {key === 'brand'
                    ? [
                        store.primaryColor,
                        '#10a37f',
                        '#8b5cf6',
                        '#f97316',
                        '#ec4899',
                        '#06b6d4',
                      ].map((c, i) => (
                        <div
                          key={i}
                          className='w-5 h-5 rounded-full'
                          style={{ backgroundColor: c }}
                        />
                      ))
                    : palette.colors.map((c, i) => (
                        <div
                          key={i}
                          className='w-5 h-5 rounded-full'
                          style={{ backgroundColor: c }}
                        />
                      ))}
                </div>
                {store.chartPalette === key && <Check className='h-4 w-4 shrink-0' />}
              </button>
            ))}
          </div>
        </SectionCard>

        {/* ── 14. Voci sidebar ── */}
        <SectionCard icon={<ListFilter className={ICON_CLS} />} title='Voci menu visibili'>
          <div className='space-y-4'>
            {NAV_GROUPS.map(group => (
              <div key={group.label}>
                <label className='text-footnote font-medium text-[var(--text-tertiary)] mb-2 block uppercase tracking-wider text-[11px]'>
                  {group.label}
                </label>
                <div className='space-y-1'>
                  {group.items.map(item => {
                    const isProtected = PROTECTED_HREFS.has(item.href);
                    const isHidden = store.hiddenNavItems.includes(item.href);
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.href}
                        onClick={() => !isProtected && store.toggleNavItem(item.href)}
                        disabled={isProtected}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 min-h-[44px]',
                          isProtected
                            ? 'opacity-50 cursor-not-allowed bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)]/30'
                            : isHidden
                              ? 'bg-[var(--surface-secondary)]/20 dark:bg-[var(--surface-hover)]/20 text-[var(--text-tertiary)]'
                              : 'bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-active)]'
                        )}
                      >
                        <Icon className='h-4 w-4 shrink-0' />
                        <span
                          className={cn('flex-1 text-left', isHidden && 'line-through opacity-50')}
                        >
                          {item.name}
                        </span>
                        <div
                          className={cn(
                            'w-8 h-4.5 rounded-full transition-all duration-200 relative flex-shrink-0',
                            isProtected
                              ? 'bg-[var(--surface-secondary)]'
                              : isHidden
                                ? 'bg-[var(--text-tertiary)]/30'
                                : 'bg-[var(--color-primary)]'
                          )}
                        >
                          <div
                            className={cn(
                              'absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-all duration-200',
                              isHidden ? 'left-0.5' : 'left-4'
                            )}
                          />
                        </div>
                        {isProtected && (
                          <span className='text-xs text-[var(--text-tertiary)] ml-1'>protetta</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── 15. Accessibilita ── */}
        <SectionCard icon={<Accessibility className={ICON_CLS} />} title='Accessibilita'>
          <div className='grid grid-cols-2 gap-3'>
            <OptionButton
              selected={store.contrast === 'normal'}
              onClick={() => store.setContrast('normal' as ContrastLevel)}
            >
              <Eye className='h-4 w-4' /> Contrasto normale
            </OptionButton>
            <OptionButton
              selected={store.contrast === 'high'}
              onClick={() => store.setContrast('high' as ContrastLevel)}
            >
              <Eye className='h-4 w-4' /> Alto contrasto
            </OptionButton>
          </div>
        </SectionCard>

        {/* ── 16. Stampa ── */}
        <SectionCard icon={<Printer className={ICON_CLS} />} title='Stampa e PDF'>
          <div className='flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)]'>
            <div className='w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5'>
              <Check className='h-4 w-4 text-green-500' />
            </div>
            <div>
              <p className='text-sm font-medium text-[var(--text-primary)]'>
                Ottimizzato automaticamente
              </p>
              <p className='text-xs text-[var(--text-tertiary)] mt-1'>
                Quando stampi o esporti in PDF, il gestionale passa automaticamente a tema chiaro,
                nasconde la sidebar e ottimizza i margini. Nessuna configurazione necessaria.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* ── 17. Anteprima ── */}
        <motion.div variants={itemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h3 className='text-title-2 font-semibold text-[var(--text-primary)]'>Anteprima</h3>
            </AppleCardHeader>
            <AppleCardContent>
              <div className='space-y-4'>
                {/* Buttons */}
                <div className='flex items-center gap-3 flex-wrap'>
                  <button
                    className='px-5 py-2.5 rounded-full text-sm font-medium text-white min-h-[44px]'
                    style={{ backgroundColor: store.primaryColor }}
                  >
                    Bottone primario
                  </button>
                  <button
                    className='px-5 py-2.5 rounded-full text-sm font-medium border-2 min-h-[44px]'
                    style={{ borderColor: store.primaryColor, color: store.primaryColor }}
                  >
                    Secondario
                  </button>
                  <span className='text-body font-medium' style={{ color: store.primaryColor }}>
                    Link esempio
                  </span>
                </div>

                {/* Status badges */}
                <div className='flex items-center gap-2 flex-wrap'>
                  {STATUS_ORDER.map(key => (
                    <span
                      key={key}
                      className='px-2.5 py-1 rounded-full text-xs font-medium text-white'
                      style={{ backgroundColor: store.statusColors[key] }}
                    >
                      {STATUS_LABELS[key]}
                    </span>
                  ))}
                </div>

                {/* Fake table row */}
                <div
                  className='rounded-xl overflow-hidden border border-[var(--border-default)]/20'
                  style={{ fontSize: 'var(--table-font-size)' }}
                >
                  {['OdL #2451', 'OdL #2450', 'OdL #2449'].map((label, i) => (
                    <div
                      key={label}
                      className={cn(
                        'flex items-center justify-between px-4 border-b border-[var(--border-default)]/10 last:border-0',
                        i % 2 === 0 ? 'bg-[var(--surface-secondary)]/30' : 'bg-transparent'
                      )}
                      style={{ height: 'var(--table-row-height)' }}
                    >
                      <span className='font-medium text-[var(--text-primary)]'>{label}</span>
                      <span
                        className='px-2 py-0.5 rounded-full text-xs font-medium text-white'
                        style={{
                          backgroundColor: [
                            store.statusColors.in_lavorazione,
                            store.statusColors.attesa_ricambi,
                            store.statusColors.completato,
                          ][i],
                        }}
                      >
                        {['In lavorazione', 'Attesa ricambi', 'Completato'][i]}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Fake input */}
                <div className='flex items-center gap-2 px-4 py-3 rounded-xl border border-[var(--border-default)]/30 bg-[var(--surface-secondary)]/30 text-sm text-[var(--text-secondary)]'>
                  Cerca ordini, clienti, veicoli...
                </div>

                {/* Chart palette swatch */}
                <div className='flex items-center gap-2'>
                  <span className='text-xs text-[var(--text-tertiary)]'>Grafici:</span>
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div
                      key={i}
                      className='h-6 flex-1 rounded-sm'
                      style={{ backgroundColor: `var(--chart-${i})` }}
                    />
                  ))}
                </div>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
