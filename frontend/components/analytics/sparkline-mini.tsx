'use client';

import { useMemo } from 'react';

interface SparklineMiniProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  showDot?: boolean;
  showArea?: boolean;
}

function buildSmoothPath(points: [number, number][]): string {
  if (points.length < 2) return '';

  let d = `M ${points[0][0]},${points[0][1]}`;

  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cpx = (curr[0] + next[0]) / 2;
    d += ` C ${cpx},${curr[1]} ${cpx},${next[1]} ${next[0]},${next[1]}`;
  }

  return d;
}

export function SparklineMini({
  data,
  color = '#60a5fa',
  width = 100,
  height = 32,
  showDot = false,
  showArea = false,
}: SparklineMiniProps): React.ReactElement {
  const gradientId = useMemo(
    () => `sparkline-grad-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  const { path, areaPath, lastPoint } = useMemo(() => {
    if (data.length < 2) {
      return { path: '', areaPath: '', lastPoint: [0, 0] as [number, number] };
    }

    const padding = 2;
    const effectiveWidth = width - padding * 2;
    const effectiveHeight = height - padding * 2;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points: [number, number][] = data.map((v, i) => [
      padding + (i / (data.length - 1)) * effectiveWidth,
      padding + effectiveHeight - ((v - min) / range) * effectiveHeight,
    ]);

    const linePath = buildSmoothPath(points);

    let area = '';
    if (showArea && linePath) {
      const lastX = points[points.length - 1][0];
      const firstX = points[0][0];
      area = `${linePath} L ${lastX},${height} L ${firstX},${height} Z`;
    }

    return {
      path: linePath,
      areaPath: area,
      lastPoint: points[points.length - 1],
    };
  }, [data, width, height, showArea]);

  if (data.length < 2) {
    return <svg width={width} height={height} aria-hidden="true" />;
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="inline-block"
    >
      {showArea && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} />
        </>
      )}

      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {showDot && (
        <>
          <circle
            cx={lastPoint[0]}
            cy={lastPoint[1]}
            r={3}
            fill={color}
          />
          <circle
            cx={lastPoint[0]}
            cy={lastPoint[1]}
            r={5}
            fill={color}
            opacity={0.3}
          >
            <animate
              attributeName="r"
              values="3;7;3"
              dur="2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.3;0;0.3"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
        </>
      )}
    </svg>
  );
}
