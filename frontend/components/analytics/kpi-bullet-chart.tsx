'use client';

import { ResponsiveBullet } from '@nivo/bullet';
import useSWR from 'swr';
import { GlassCard } from './glass-card';
import { NIVO_DARK_THEME, MECHMIND_PALETTE } from '@/lib/charts/palette';

interface DashboardStats {
  averageRepairOrder?: number;
  carCount?: number;
  billedHours?: number;
  npsScore?: number;
  profitMargin?: number;
}

interface DashboardResponse {
  stats?: DashboardStats;
}

interface BulletDatum {
  id: string;
  ranges: number[];
  measures: number[];
  markers: number[];
}

const FALLBACK_KPIS: BulletDatum[] = [
  {
    id: 'ARO (\u20AC)',
    ranges: [0, 200, 400, 600],
    measures: [420],
    markers: [380],
  },
  {
    id: 'Car Count',
    ranges: [0, 10, 20, 30],
    measures: [22],
    markers: [25],
  },
  {
    id: 'Ore Fatturate',
    ranges: [0, 40, 80, 120],
    measures: [92],
    markers: [100],
  },
  {
    id: 'NPS Score',
    ranges: [0, 30, 60, 100],
    measures: [78],
    markers: [70],
  },
  {
    id: 'Profitto %',
    ranges: [0, 25, 50, 75],
    measures: [58],
    markers: [55],
  },
];

function buildKpisFromStats(stats: DashboardStats): BulletDatum[] {
  return [
    {
      id: 'ARO (\u20AC)',
      ranges: [0, 200, 400, 600],
      measures: [stats.averageRepairOrder ?? 420],
      markers: [380],
    },
    {
      id: 'Car Count',
      ranges: [0, 10, 20, 30],
      measures: [stats.carCount ?? 22],
      markers: [25],
    },
    {
      id: 'Ore Fatturate',
      ranges: [0, 40, 80, 120],
      measures: [stats.billedHours ?? 92],
      markers: [100],
    },
    {
      id: 'NPS Score',
      ranges: [0, 30, 60, 100],
      measures: [stats.npsScore ?? 78],
      markers: [70],
    },
    {
      id: 'Profitto %',
      ranges: [0, 25, 50, 75],
      measures: [stats.profitMargin ?? 58],
      markers: [55],
    },
  ];
}

const fetcher = (url: string): Promise<DashboardResponse> =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error(`Errore ${res.status}`);
    return res.json();
  });

export function KpiBulletChart(): React.ReactElement {
  const { data: apiData } = useSWR<DashboardResponse>(
    '/api/dashboard',
    fetcher,
    { revalidateOnFocus: false, errorRetryCount: 1 },
  );

  const kpis = apiData?.stats
    ? buildKpisFromStats(apiData.stats)
    : FALLBACK_KPIS;

  return (
    <GlassCard
      title="KPI Officina"
      subtitle="Attuale vs obiettivo per metrica chiave"
    >
      <div className="h-[350px] sm:h-[400px]">
        <ResponsiveBullet
          data={kpis}
          theme={NIVO_DARK_THEME}
          spacing={36}
          titleAlign="start"
          titleOffsetX={-100}
          rangeColors={['#3a3a3a', '#4a4a4a', '#5a5a5a', '#6a6a6a']}
          measureColors={[MECHMIND_PALETTE.accent.blue]}
          markerColors={[MECHMIND_PALETTE.accent.amber]}
          measureSize={0.4}
          markerSize={0.8}
          motionConfig="gentle"
          margin={{ top: 10, right: 30, bottom: 40, left: 120 }}
          tooltip={({ v0, v1, color }) => (
            <div
              style={{
                background: 'var(--surface-elevated)',
                color: '#ffffff',
                padding: '8px 12px',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  backgroundColor: color,
                  display: 'inline-block',
                }}
              />
              <span>
                {v0} — {v1}
              </span>
            </div>
          )}
        />
      </div>

      {/* Legenda */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-5 border-t border-[var(--border-default)]/10 pt-3">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-6 rounded-sm"
            style={{ backgroundColor: MECHMIND_PALETTE.accent.blue }}
          />
          <span className="text-xs text-[var(--text-secondary)]">Attuale</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-4 w-0.5 rounded-full"
            style={{ backgroundColor: MECHMIND_PALETTE.accent.amber }}
          />
          <span className="text-xs text-[var(--text-secondary)]">Obiettivo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-6 rounded-sm"
            style={{
              background: 'linear-gradient(to right, #3a3a3a, #5a5a5a, #6a6a6a)',
            }}
          />
          <span className="text-xs text-[var(--text-secondary)]">Range</span>
        </div>
      </div>
    </GlassCard>
  );
}
