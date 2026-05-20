'use client';

import { ResponsiveHeatMap } from '@nivo/heatmap';
import useSWR from 'swr';
import { GlassCard } from './glass-card';
import { NIVO_DARK_THEME } from '@/lib/charts/palette';

interface HeatmapCell {
  x: string;
  y: number;
}

interface HeatmapSerie {
  id: string;
  data: HeatmapCell[];
}

const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

function generateFromBookings(bookings: Array<{ scheduledDate: string; scheduledTime?: string }> | undefined): HeatmapSerie[] {
  const matrix: Record<string, Record<string, number>> = {};
  DAYS.forEach(d => {
    matrix[d] = {};
    HOURS.forEach(h => { matrix[d][h] = 0; });
  });

  if (bookings && Array.isArray(bookings)) {
    bookings.forEach(b => {
      const date = new Date(b.scheduledDate);
      const dayIndex = date.getDay(); // 0=Sun, 1=Mon...6=Sat
      if (dayIndex === 0) return; // skip Sunday
      const dayName = DAYS[dayIndex - 1];
      const hour = b.scheduledTime ? b.scheduledTime.slice(0, 5) : null;
      if (hour && matrix[dayName] && matrix[dayName][hour] !== undefined) {
        matrix[dayName][hour]++;
      }
    });
  }

  return DAYS.map(day => ({
    id: day,
    data: HOURS.map(hour => ({ x: hour, y: matrix[day][hour] })),
  }));
}

// Deterministic fallback data when no API data available
function generateFallbackData(): HeatmapSerie[] {
  return DAYS.map((day, di) => ({
    id: day,
    data: HOURS.map((hour, hi) => ({
      x: hour,
      y: Math.max(0, Math.round(
        5 + 4 * Math.sin((di + 1) * 0.9 + hi * 0.4) + 2 * Math.cos(hi * 0.7 + di * 0.3)
      )),
    })),
  }));
}

export function WorkloadHeatmap(): React.ReactElement {
  const { data: bookingsData } = useSWR('/api/bookings?limit=500&period=month');

  const heatmapData = bookingsData?.data
    ? generateFromBookings(bookingsData.data)
    : generateFallbackData();

  const maxValue = Math.max(...heatmapData.flatMap(s => s.data.map(d => d.y)), 1);

  return (
    <GlassCard title="Carico di Lavoro" subtitle="Densità appuntamenti per giorno e fascia oraria">
      <div className="h-[300px] sm:h-[380px]">
        <ResponsiveHeatMap
          data={heatmapData}
          theme={NIVO_DARK_THEME}
          margin={{ top: 30, right: 30, bottom: 10, left: 50 }}
          valueFormat=">-.0f"
          axisTop={{
            tickSize: 0,
            tickPadding: 8,
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
          }}
          colors={{
            type: 'sequential',
            scheme: 'blues',
            minValue: 0,
            maxValue: maxValue,
          }}
          emptyColor="#3a3a3a"
          borderColor={{ from: 'color', modifiers: [['darker', 0.6]] }}
          borderWidth={2}
          borderRadius={4}
          labelTextColor={{ from: 'color', modifiers: [['brighter', 2.5]] }}
          animate={true}
          motionConfig="gentle"
          hoverTarget="cell"
        />
      </div>
    </GlassCard>
  );
}
