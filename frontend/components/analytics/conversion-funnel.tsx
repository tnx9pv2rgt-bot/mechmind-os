'use client';

import { ResponsiveFunnel } from '@nivo/funnel';
import useSWR from 'swr';
import { GlassCard } from './glass-card';
import { NIVO_DARK_THEME, MECHMIND_PALETTE } from '@/lib/charts/palette';

interface FunnelStage {
  id: string;
  value: number;
  label: string;
  [key: string]: string | number;
}

function buildFunnelData(stats: Record<string, number> | undefined): FunnelStage[] {
  if (!stats) {
    // Deterministic fallback
    return [
      { id: 'preventivi', value: 120, label: 'Preventivi creati' },
      { id: 'inviati', value: 98, label: 'Inviati al cliente' },
      { id: 'approvati', value: 72, label: 'Approvati' },
      { id: 'odl', value: 68, label: 'OdL avviati' },
      { id: 'completati', value: 62, label: 'Completati' },
      { id: 'fatturati', value: 60, label: 'Fatturati' },
      { id: 'pagati', value: 55, label: 'Pagati' },
    ];
  }
  return [
    { id: 'preventivi', value: stats.created || 0, label: 'Preventivi creati' },
    { id: 'inviati', value: stats.sent || 0, label: 'Inviati al cliente' },
    { id: 'approvati', value: stats.accepted || 0, label: 'Approvati' },
    { id: 'odl', value: stats.converted || 0, label: 'OdL avviati' },
    { id: 'completati', value: stats.completed || 0, label: 'Completati' },
    { id: 'fatturati', value: stats.invoiced || 0, label: 'Fatturati' },
    { id: 'pagati', value: stats.paid || 0, label: 'Pagati' },
  ];
}

export function ConversionFunnel(): React.ReactElement {
  const { data: funnelStats } = useSWR('/api/analytics/financial?type=funnel');
  const stages = buildFunnelData(funnelStats?.data);

  return (
    <GlassCard title="Pipeline Conversione" subtitle="Dal preventivo al pagamento">
      <div className="h-[380px] sm:h-[430px]">
        <ResponsiveFunnel
          data={stages}
          theme={NIVO_DARK_THEME}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          colors={[...MECHMIND_PALETTE.categorical]}
          borderWidth={0}
          labelColor={{ from: 'color', modifiers: [['brighter', 3]] }}
          beforeSeparatorLength={14}
          beforeSeparatorOffset={8}
          afterSeparatorLength={14}
          afterSeparatorOffset={8}
          currentPartSizeExtension={10}
          currentBorderWidth={3}
          motionConfig="gentle"
          enableLabel={true}
          valueFormat=">-.0f"
        />
      </div>
      <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2">
        {stages.slice(0, -1).map((stage, i) => {
          const next = stages[i + 1];
          const rate = stage.value > 0 ? ((next.value / stage.value) * 100).toFixed(0) : '0';
          return (
            <div key={stage.id} className="text-center">
              <p className="text-[10px] text-[var(--text-tertiary)] truncate">{stage.label.split(' ')[0]}</p>
              <p className="text-sm font-semibold text-[#34d399]">{rate}%</p>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
