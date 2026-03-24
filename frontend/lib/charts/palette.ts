export const MECHMIND_PALETTE = {
  bg: { page: '#1a1a1a', card: '#2f2f2f', elevated: '#383838', overlay: 'rgba(26,26,26,0.8)' },
  text: { primary: '#ffffff', secondary: '#b4b4b4', tertiary: '#888888', muted: '#666666' },
  border: { default: '#4e4e4e', subtle: '#3a3a3a', glass: 'rgba(255,255,255,0.1)' },
  accent: {
    blue: '#60a5fa',
    green: '#34d399',
    amber: '#fbbf24',
    red: '#f87171',
    purple: '#a78bfa',
    cyan: '#22d3ee',
  },
  glow: { subtle: 'rgba(255,255,255,0.03)', medium: 'rgba(255,255,255,0.06)', strong: 'rgba(255,255,255,0.1)' },
  sequential: ['#1e3a5f', '#2563eb', '#60a5fa', '#34d399', '#6ee7b7'],
  categorical: ['#60a5fa', '#fbbf24', '#a78bfa', '#34d399', '#f87171', '#22d3ee'],
  diverging: ['#2563eb', '#60a5fa', '#888888', '#fbbf24', '#f59e0b'],
} as const;

export const NIVO_DARK_THEME = {
  background: 'transparent',
  text: { fontSize: 12, fill: MECHMIND_PALETTE.text.secondary },
  axis: {
    domain: { line: { stroke: MECHMIND_PALETTE.border.default, strokeWidth: 1 } },
    legend: { text: { fontSize: 12, fill: MECHMIND_PALETTE.text.secondary } },
    ticks: {
      line: { stroke: MECHMIND_PALETTE.border.default, strokeWidth: 1 },
      text: { fontSize: 11, fill: MECHMIND_PALETTE.text.tertiary },
    },
  },
  grid: { line: { stroke: MECHMIND_PALETTE.border.subtle, strokeWidth: 1 } },
  legends: { text: { fontSize: 11, fill: MECHMIND_PALETTE.text.secondary } },
  tooltip: {
    container: {
      background: MECHMIND_PALETTE.bg.card,
      color: MECHMIND_PALETTE.text.primary,
      fontSize: 13,
      borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      border: `1px solid ${MECHMIND_PALETTE.border.glass}`,
    },
  },
  labels: { text: { fontSize: 12, fill: MECHMIND_PALETTE.text.primary } },
} as const;
