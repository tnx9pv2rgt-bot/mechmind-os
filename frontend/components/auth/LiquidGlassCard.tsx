'use client';

import React from 'react';
import styles from '@/app/auth/auth.module.css';

/**
 * Props per il componente LiquidGlassCard
 */
interface LiquidGlassCardProps {
  /** Contenuto della card */
  children: React.ReactNode;
  /** Classe CSS aggiuntiva */
  className?: string;
  /** Variante del tema (light o dark) */
  variant?: 'light' | 'dark';
  /** Intensità del blur (default: 40px) */
  blur?: 'sm' | 'md' | 'lg' | 'xl' | '3xl';
  /** Padding interno */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** Ombra della card */
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Bordo visibile */
  bordered?: boolean;
  /** Effetto hover */
  hover?: boolean;
  /** Callback al click */
  onClick?: () => void;
  /** Ruolo ARIA */
  role?: string;
  /** Attributo aria-label */
  ariaLabel?: string;
}

/**
 * Mappa dei valori di blur
 */
const blurMap: Record<string, string> = {
  sm: '4px',
  md: '12px',
  lg: '24px',
  xl: '32px',
  '3xl': '40px',
};

/**
 * Mappa dei valori di padding
 */
const paddingMap: Record<string, string> = {
  none: '0',
  sm: '1rem',
  md: '1.5rem',
  lg: '2rem',
  xl: '2.5rem',
};

/**
 * LiquidGlassCard Component
 * 
 * Componente card riutilizzabile con effetto vetro liquido (Liquid Glass).
 * Utilizza backdrop-filter per creare l'effetto di sfocatura dello sfondo.
 * 
 * @example
 * ```tsx
 * // Card base
 * <LiquidGlassCard>
 *   <h1>Titolo</h1>
 *   <p>Contenuto</p>
 * </LiquidGlassCard>
 * 
 * // Card con tema scuro e padding grande
 * <LiquidGlassCard variant="dark" padding="xl">
 *   <p>Contenuto in tema scuro</p>
 * </LiquidGlassCard>
 * 
 * // Card cliccabile con hover effect
 * <LiquidGlassCard hover onClick={handleClick}>
 *   <p>Click me</p>
 * </LiquidGlassCard>
 * ```
 */
export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  children,
  className = '',
  variant = 'light',
  blur = '3xl',
  padding = 'xl',
  shadow = '2xl',
  bordered = true,
  hover = false,
  onClick,
  role,
  ariaLabel,
}) => {
  // Costruzione delle classi dinamiche
  const baseClasses = [
    styles.liquidGlass,
    variant === 'dark' ? styles.liquidGlassDark : '',
    className,
  ].filter(Boolean).join(' ');

  // Stili inline per proprietà dinamiche
  const inlineStyles: React.CSSProperties = {
    backdropFilter: `blur(${blurMap[blur]}) saturate(180%)`,
    WebkitBackdropFilter: `blur(${blurMap[blur]}) saturate(180%)`,
    padding: paddingMap[padding],
    cursor: onClick ? 'pointer' : undefined,
    transition: hover || onClick ? 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)' : undefined,
  };

  // Handler per il click
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  // Handler per la tastiera
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={baseClasses}
      style={inlineStyles}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={role || (onClick ? 'button' : undefined)}
      aria-label={ariaLabel}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
};

/**
 * LiquidGlassCardAnimated
 * Versione con animazione di entrata
 */
export const LiquidGlassCardAnimated: React.FC<LiquidGlassCardProps> = (props) => {
  const { className = '', ...rest } = props;
  
  return (
    <LiquidGlassCard
      {...rest}
      className={`${className} ${styles.authCard}`.trim()}
    />
  );
};

/**
 * AuthCard
 * Card preconfigurata per l'autenticazione
 */
export const AuthCard: React.FC<Omit<LiquidGlassCardProps, 'padding' | 'shadow'>> = (props) => (
  <LiquidGlassCard
    {...props}
    padding="xl"
    shadow="2xl"
    blur="3xl"
    className={`${props.className || ''} ${styles.authCard}`.trim()}
  />
);

export default LiquidGlassCard;
