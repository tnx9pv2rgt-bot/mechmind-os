'use client';

import React from 'react';

/**
 * Props per il componente AnimatedBackground
 */
interface AnimatedBackgroundProps {
  /** Variante colore del gradiente */
  variant?: 'default' | 'cool' | 'warm' | 'purple' | 'minimal';
  /** Intensità dell'animazione */
  intensity?: 'low' | 'medium' | 'high';
  /** Velocità dell'animazione (in secondi) */
  speed?: number;
  /** Classe CSS aggiuntiva */
  className?: string;
  /** Contenuto sopra il background */
  children?: React.ReactNode;
  /** Opacità dei blob */
  opacity?: number;
}

/**
 * Configurazioni dei colori per ogni variante
 */
const colorVariants = {
  default: {
    blob1: { from: '#007AFF', to: '#5856D6' },
    blob2: { from: '#AF52DE', to: '#FF2D55' },
    blob3: { from: '#5AC8FA', to: '#007AFF' },
    background: 'linear-gradient(135deg, #F5F7FA 0%, #E4E8EC 100%)',
  },
  cool: {
    blob1: { from: '#007AFF', to: '#34C759' },
    blob2: { from: '#5AC8FA', to: '#007AFF' },
    blob3: { from: '#5856D6', to: '#AF52DE' },
    background: 'linear-gradient(135deg, #E8F4F8 0%, #D4E5ED 100%)',
  },
  warm: {
    blob1: { from: '#FF9500', to: '#FF2D55' },
    blob2: { from: '#FFCC00', to: '#FF9500' },
    blob3: { from: '#FF2D55', to: '#AF52DE' },
    background: 'linear-gradient(135deg, #FFF5F0 0%, #FFE8E0 100%)',
  },
  purple: {
    blob1: { from: '#5856D6', to: '#AF52DE' },
    blob2: { from: '#AF52DE', to: '#FF2D55' },
    blob3: { from: '#007AFF', to: '#5856D6' },
    background: 'linear-gradient(135deg, #F3F0FF 0%, #E8E0FF 100%)',
  },
  minimal: {
    blob1: { from: 'rgba(0, 122, 255, 0.3)', to: 'rgba(88, 86, 214, 0.3)' },
    blob2: { from: 'rgba(175, 82, 222, 0.2)', to: 'rgba(255, 45, 85, 0.2)' },
    blob3: { from: 'rgba(90, 200, 250, 0.25)', to: 'rgba(0, 122, 255, 0.25)' },
    background: 'linear-gradient(135deg, #FAFBFC 0%, #F0F1F2 100%)',
  },
};

/**
 * Dimensioni dei blob per intensità
 */
const intensitySizes = {
  low: { blob1: '600px', blob2: '500px', blob3: '450px' },
  medium: { blob1: '800px', blob2: '700px', blob3: '600px' },
  high: { blob1: '1000px', blob2: '900px', blob3: '800px' },
};

/**
 * AnimatedBackground Component
 * 
 * Background animato stile Apple con gradiente mesh e blob colors.
 * Crea un effetto visivo moderno e dinamico per le pagine di autenticazione.
 * 
 * @example
 * ```tsx
 * // Background default
 * <AnimatedBackground>
 *   <LoginForm />
 * </AnimatedBackground>
 * 
 * // Variante warm con velocità personalizzata
 * <AnimatedBackground variant="warm" speed={25}>
 *   <SignUpForm />
 * </AnimatedBackground>
 * 
 * // Solo background senza contenuto
 * <AnimatedBackground variant="purple" intensity="high" />
 * ```
 */
export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  variant = 'default',
  intensity = 'medium',
  speed = 20,
  className = '',
  children,
  opacity = 0.6,
}) => {
  const colors = colorVariants[variant];
  const sizes = intensitySizes[intensity];
  const animationDuration = `${speed}s`;

  // Stili base per il container
  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    overflow: 'hidden',
    zIndex: -1,
    background: colors.background,
  };

  // Stili base per i blob
  const blobBaseStyle: React.CSSProperties = {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(80px)',
    opacity: opacity,
    mixBlendMode: 'multiply',
  };

  return (
    <>
      {/* Background Layer */}
      <div className={className} style={containerStyle} aria-hidden="true">
        {/* Blob 1 - Grande, movimento lento */}
        <div
          style={{
            ...blobBaseStyle,
            width: sizes.blob1,
            height: sizes.blob1,
            background: `linear-gradient(135deg, ${colors.blob1.from}, ${colors.blob1.to})`,
            top: '-20%',
            left: '-10%',
            animation: `blobFloat1 ${animationDuration} ease-in-out infinite`,
          }}
        />
        
        {/* Blob 2 - Medio, movimento medio */}
        <div
          style={{
            ...blobBaseStyle,
            width: sizes.blob2,
            height: sizes.blob2,
            background: `linear-gradient(225deg, ${colors.blob2.from}, ${colors.blob2.to})`,
            top: '40%',
            right: '-15%',
            animation: `blobFloat2 ${animationDuration} ease-in-out infinite`,
            animationDelay: '-7s',
          }}
        />
        
        {/* Blob 3 - Piccolo, movimento veloce */}
        <div
          style={{
            ...blobBaseStyle,
            width: sizes.blob3,
            height: sizes.blob3,
            background: `linear-gradient(45deg, ${colors.blob3.from}, ${colors.blob3.to})`,
            bottom: '-10%',
            left: '20%',
            animation: `blobFloat3 ${animationDuration} ease-in-out infinite`,
            animationDelay: '-14s',
          }}
        />

        {/* Overlay per migliorare leggibilità */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(255,255,255,0.1) 100%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Global Styles per le animazioni */}
      <style jsx global>{`
        @keyframes blobFloat1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(5%, 5%) scale(1.05);
          }
          50% {
            transform: translate(10%, -5%) scale(0.95);
          }
          75% {
            transform: translate(-5%, 10%) scale(1.02);
          }
        }

        @keyframes blobFloat2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(-8%, 8%) scale(1.08);
          }
          50% {
            transform: translate(-15%, -8%) scale(0.92);
          }
          75% {
            transform: translate(5%, -12%) scale(1.05);
          }
        }

        @keyframes blobFloat3 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(12%, -8%) scale(0.95);
          }
          50% {
            transform: translate(-8%, 12%) scale(1.1);
          }
          75% {
            transform: translate(-12%, -5%) scale(0.98);
          }
        }
      `}</style>

      {/* Children wrapper */}
      {children && (
        <div style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      )}
    </>
  );
};

/**
 * AuthBackground
 * Versione preconfigurata per le pagine di autenticazione
 */
export const AuthBackground: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AnimatedBackground
    variant="default"
    intensity="medium"
    speed={25}
    opacity={0.5}
  >
    {children}
  </AnimatedBackground>
);

/**
 * MinimalBackground
 * Versione minimale con colori meno intensi
 */
export const MinimalBackground: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AnimatedBackground
    variant="minimal"
    intensity="low"
    speed={30}
    opacity={0.4}
  >
    {children}
  </AnimatedBackground>
);

export default AnimatedBackground;
