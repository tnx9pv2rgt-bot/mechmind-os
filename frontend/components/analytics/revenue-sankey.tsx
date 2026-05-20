'use client';

import { ResponsiveSankey } from '@nivo/sankey';
import { GlassCard } from './glass-card';
import { NIVO_DARK_THEME, MECHMIND_PALETTE } from '@/lib/charts/palette';

interface SankeyNode {
  id: string;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

const SANKEY_DATA: SankeyData = {
  nodes: [
    // Canali di acquisizione
    { id: 'Portale Online' },
    { id: 'Chiamate' },
    { id: 'Walk-in' },
    { id: 'Flotta' },
    // Tipi di servizio
    { id: 'Manutenzione' },
    { id: 'Riparazione' },
    { id: 'Tagliando' },
    { id: 'Gomme' },
    // Flussi di ricavo
    { id: 'Manodopera' },
    { id: 'Ricambi' },
    { id: 'Servizi Extra' },
  ],
  links: [
    // Portale Online → Servizi
    { source: 'Portale Online', target: 'Manutenzione', value: 4200 },
    { source: 'Portale Online', target: 'Tagliando', value: 3800 },
    { source: 'Portale Online', target: 'Gomme', value: 1500 },
    { source: 'Portale Online', target: 'Riparazione', value: 900 },

    // Chiamate → Servizi
    { source: 'Chiamate', target: 'Riparazione', value: 5100 },
    { source: 'Chiamate', target: 'Manutenzione', value: 3200 },
    { source: 'Chiamate', target: 'Tagliando', value: 2400 },
    { source: 'Chiamate', target: 'Gomme', value: 800 },

    // Walk-in → Servizi
    { source: 'Walk-in', target: 'Riparazione', value: 4600 },
    { source: 'Walk-in', target: 'Gomme', value: 2200 },
    { source: 'Walk-in', target: 'Manutenzione', value: 1800 },
    { source: 'Walk-in', target: 'Tagliando', value: 1100 },

    // Flotta → Servizi
    { source: 'Flotta', target: 'Manutenzione', value: 6800 },
    { source: 'Flotta', target: 'Tagliando', value: 4500 },
    { source: 'Flotta', target: 'Gomme', value: 3200 },
    { source: 'Flotta', target: 'Riparazione', value: 2100 },

    // Manutenzione → Ricavi
    { source: 'Manutenzione', target: 'Manodopera', value: 7200 },
    { source: 'Manutenzione', target: 'Ricambi', value: 6800 },
    { source: 'Manutenzione', target: 'Servizi Extra', value: 2000 },

    // Riparazione → Ricavi
    { source: 'Riparazione', target: 'Manodopera', value: 5800 },
    { source: 'Riparazione', target: 'Ricambi', value: 5400 },
    { source: 'Riparazione', target: 'Servizi Extra', value: 1500 },

    // Tagliando → Ricavi
    { source: 'Tagliando', target: 'Manodopera', value: 4800 },
    { source: 'Tagliando', target: 'Ricambi', value: 5200 },
    { source: 'Tagliando', target: 'Servizi Extra', value: 1800 },

    // Gomme → Ricavi
    { source: 'Gomme', target: 'Manodopera', value: 2400 },
    { source: 'Gomme', target: 'Ricambi', value: 4200 },
    { source: 'Gomme', target: 'Servizi Extra', value: 1100 },
  ],
};

export function RevenueSankey(): React.ReactElement {
  return (
    <GlassCard
      title="Flusso Ricavi"
      subtitle="Dal canale di acquisizione al tipo di ricavo"
    >
      <div className="h-[400px] sm:h-[500px]">
        <ResponsiveSankey
          data={SANKEY_DATA}
          theme={NIVO_DARK_THEME}
          colors={[...MECHMIND_PALETTE.categorical]}
          margin={{ top: 20, right: 140, bottom: 20, left: 140 }}
          nodeThickness={18}
          nodeSpacing={16}
          nodeOpacity={1}
          nodeHoverOpacity={1}
          nodeHoverOthersOpacity={0.35}
          nodeBorderWidth={0}
          nodeBorderRadius={3}
          linkOpacity={0.3}
          linkHoverOpacity={0.6}
          linkHoverOthersOpacity={0.1}
          linkContract={3}
          enableLinkGradient={true}
          labelPosition="outside"
          labelOrientation="horizontal"
          labelPadding={12}
          labelTextColor="#b4b4b4"
          motionConfig="gentle"
        />
      </div>
    </GlassCard>
  );
}
