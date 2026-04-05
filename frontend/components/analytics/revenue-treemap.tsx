'use client';

import { ResponsiveTreeMap } from '@nivo/treemap';
import useSWR from 'swr';
import { GlassCard } from './glass-card';
import { NIVO_DARK_THEME, MECHMIND_PALETTE } from '@/lib/charts/palette';

interface TreemapNode {
  name: string;
  color?: string;
  children?: TreemapNode[];
  value?: number;
}

interface BreakdownResponse {
  tree?: TreemapNode;
}

const FALLBACK_DATA: TreemapNode = {
  name: 'Fatturato',
  children: [
    {
      name: 'Manodopera',
      color: '#60a5fa',
      children: [
        { name: 'Riparazione Motore', value: 42000 },
        { name: 'Impianto Frenante', value: 28500 },
        { name: 'Sospensioni', value: 18200 },
        { name: 'Elettronica', value: 15800 },
        { name: 'Tagliando', value: 35600 },
        { name: 'Revisione', value: 12400 },
      ],
    },
    {
      name: 'Ricambi',
      color: '#34d399',
      children: [
        { name: 'OEM', value: 48000 },
        { name: 'Aftermarket', value: 32000 },
        { name: 'Pneumatici', value: 22000 },
        { name: 'Lubrificanti', value: 8500 },
      ],
    },
    {
      name: 'Servizi',
      color: '#a78bfa',
      children: [
        { name: 'Diagnosi', value: 14000 },
        { name: 'Carrozzeria', value: 25000 },
        { name: 'Lucidatura', value: 6500 },
      ],
    },
    {
      name: 'Flotta',
      color: '#fbbf24',
      children: [
        { name: 'Contratti', value: 55000 },
        { name: 'Interventi Spot', value: 18000 },
      ],
    },
  ],
};

const CATEGORY_COLORS: Record<string, string> = {
  Manodopera: '#60a5fa',
  Ricambi: '#34d399',
  Servizi: '#a78bfa',
  Flotta: '#fbbf24',
};

function getNodeColor(node: { id: string; pathComponents: string[] }): string {
  // pathComponents[1] is the category (Manodopera, Ricambi, etc.)
  const category = node.pathComponents[1];
  if (category && CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category];
  }
  // Root-level category nodes
  if (CATEGORY_COLORS[node.id]) {
    return CATEGORY_COLORS[node.id];
  }
  return MECHMIND_PALETTE.accent.blue;
}

const fetcher = (url: string): Promise<BreakdownResponse> =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error(`Errore ${res.status}`);
    return res.json();
  });

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function RevenueTreemap(): React.ReactElement {
  const { data: apiData } = useSWR<BreakdownResponse>(
    '/api/analytics/financial?type=breakdown',
    fetcher,
    { revalidateOnFocus: false, errorRetryCount: 1 },
  );

  const treeData = apiData?.tree ?? FALLBACK_DATA;

  const total = FALLBACK_DATA.children?.reduce((sum, cat) => {
    const catTotal = cat.children?.reduce((s, item) => s + (item.value ?? 0), 0) ?? 0;
    return sum + catTotal;
  }, 0) ?? 0;

  return (
    <GlassCard
      title="Composizione Fatturato"
      subtitle={`Totale: ${formatCurrency(total)}`}
    >
      {/* Legend */}
      <div className="mb-3 flex flex-wrap gap-3">
        {Object.entries(CATEGORY_COLORS).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-[var(--text-secondary)]">{label}</span>
          </div>
        ))}
      </div>

      <div className="h-[400px] sm:h-[500px]">
        <ResponsiveTreeMap
          data={treeData}
          identity="name"
          value="value"
          theme={NIVO_DARK_THEME}
          innerPadding={3}
          outerPadding={3}
          borderWidth={2}
          borderColor={{ from: 'color', modifiers: [['darker', 0.6]] }}
          nodeOpacity={0.85}
          labelSkipSize={40}
          label={(node) => `${node.id}`}
          labelTextColor={{ from: 'color', modifiers: [['brighter', 2.5]] }}
          parentLabelTextColor={{ from: 'color', modifiers: [['brighter', 2]] }}
          parentLabelSize={14}
          colors={getNodeColor}
          motionConfig="gentle"
          tooltip={({ node }) => (
            <div
              style={{
                background: 'var(--surface-elevated)',
                color: '#ffffff',
                padding: '8px 12px',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                fontSize: 13,
              }}
            >
              <strong>{node.id}</strong>
              <br />
              <span style={{ color: '#b4b4b4' }}>
                {formatCurrency(node.value)}
              </span>
            </div>
          )}
        />
      </div>
    </GlassCard>
  );
}
