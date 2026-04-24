"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { Car, Clock, AlertCircle, CheckCircle2, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";

interface CarCountData {
  day: string;
  inService: number;
  waiting: number;
  ready: number;
  completed: number;
}

interface CarCountChartProps {
  dateRange: "today" | "week" | "month" | "custom";
  locationId?: string;
}

// Generate realistic car count data
function generateCarCountData(range: string): CarCountData[] {
  const data: CarCountData[] = [];
  const days = range === "today" ? 8 : range === "week" ? 7 : 30;

  const dayNames = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

  for (let i = 0; i < days; i++) {
    const date =
      range === "today"
        ? `${8 + i}:00`
        : dayNames[new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).getDay()];

    // Base values with realistic patterns
    const isWeekend = date === "Dom" || date === "Sab";
    const baseValue = isWeekend ? 3 : 8;

    data.push({
      day: date,
      inService: Math.max(0, Math.round(baseValue + Math.random() * 6)),
      waiting: Math.max(0, Math.round(2 + Math.random() * 4)),
      ready: Math.max(0, Math.round(1 + Math.random() * 3)),
      completed: Math.max(0, Math.round(baseValue * 1.5 + Math.random() * 5)),
    });
  }
  return data;
}

const statusConfig = {
  inService: {
    label: "In Servizio",
    color: "#3b82f6",
    icon: Car,
    bg: "bg-[var(--status-info)]",
  },
  waiting: {
    label: "In Attesa",
    color: "#f97316",
    icon: Hourglass,
    bg: "bg-[var(--status-warning)]",
  },
  ready: {
    label: "Pronti",
    color: "#22c55e",
    icon: CheckCircle2,
    bg: "bg-[var(--status-success)]",
  },
  completed: {
    label: "Completati",
    color: "#6b7280",
    icon: CheckCircle2,
    bg: "bg-[var(--surface-secondary)]0",
  },
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: keyof CarCountData; value: number; color: string }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);

    return (
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] p-3 shadow-lg dark:border-[var(--border-default)] dark:bg-[var(--surface-primary)]">
        <p className="mb-2 text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
          {label}
        </p>
        <div className="space-y-1">
          {payload.map((entry, index) => {
            const key = entry.dataKey as keyof typeof statusConfig;
            const config = statusConfig[key];
            if (!config || entry.value === undefined) return null;
            const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(0) : "0";

            return (
              <div key={index} className="flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                    {config.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    {entry.value}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)]">({percentage}%)</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 border-t border-[var(--border-default)] pt-2 dark:border-[var(--border-default)]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Totale</span>
            <span className="font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{total}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export function CarCountChart({ dateRange }: CarCountChartProps) {
  const [data] = useState(() => generateCarCountData(dateRange));
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  // Calculate totals and peak
  const totals = useMemo(() => {
    return data.reduce(
      (acc, day) => ({
        inService: acc.inService + day.inService,
        waiting: acc.waiting + day.waiting,
        ready: acc.ready + day.ready,
        completed: acc.completed + day.completed,
      }),
      { inService: 0, waiting: 0, ready: 0, completed: 0 }
    );
  }, [data]);

  const peakHour = useMemo(() => {
    return data.reduce(
      (max, day) => {
        const dayTotal = day.inService + day.waiting + day.ready + day.completed;
        return dayTotal > max.total ? { day: day.day, total: dayTotal } : max;
      },
      { day: "", total: 0 }
    );
  }, [data]);

  const currentTotal = totals.inService + totals.waiting + totals.ready;
  const avgDaily = Math.round(currentTotal / data.length);

  return (
    <div className="workshop-card">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            Flusso Veicoli
          </h3>
          <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Breakdown per stato giornaliero
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-[var(--status-warning)]/5 px-3 py-2 dark:bg-[var(--status-warning)]/40/20">
          <Clock className="h-4 w-4 text-[var(--status-warning)]" />
          <span className="text-sm text-[var(--status-warning)]">
            <strong>Picco:</strong> {peakHour.day} ({peakHour.total} veicoli)
          </span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(statusConfig).map(([key, config]) => {
          const value = totals[key as keyof typeof totals];
          const Icon = config.icon;
          return (
            <div
              key={key}
              className="flex items-center gap-3 rounded-lg bg-[var(--surface-secondary)] p-3 dark:bg-[var(--surface-primary)]/50"
            >
              <div className={cn("rounded-lg p-2", config.bg)}>
                <Icon className="h-4 w-4 text-[var(--text-on-brand)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                  {config.label}
                </p>
                <p className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  {value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Peak Alert */}
      {peakHour.total > 20 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-[var(--status-warning)]/10 p-3 text-sm text-[var(--status-warning)] dark:bg-[var(--status-warning)]/20 dark:text-[var(--status-warning)]">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>
            Picco di attività rilevato {dateRange === "today" ? "alle" : "il"}{" "}
            <strong>{peakHour.day}</strong> con {peakHour.total} veicoli. Considera
            di aggiungere risorse.
          </span>
        </div>
      )}

      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            onMouseMove={(state) => {
              if (state.activeLabel) {
                setHoveredBar(state.activeLabel as string);
              }
            }}
            onMouseLeave={() => setHoveredBar(null)}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              className="dark:stroke-gray-700"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: "1rem" }}
              formatter={(value) => (
                <span className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                  {value}
                </span>
              )}
            />
            <ReferenceLine
              y={avgDaily}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              label={{
                value: `Media: ${avgDaily}`,
                position: "right",
                fill: "#6b7280",
                fontSize: 11,
              }}
            />
            <Bar
              dataKey="inService"
              name="In Servizio"
              stackId="a"
              fill={statusConfig.inService.color}
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="waiting"
              name="In Attesa"
              stackId="a"
              fill={statusConfig.waiting.color}
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="ready"
              name="Pronti"
              stackId="a"
              fill={statusConfig.ready.color}
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="completed"
              name="Completati"
              stackId="a"
              fill={statusConfig.completed.color}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Insight */}
      <div className="mt-4 rounded-lg bg-[var(--status-info-subtle)] p-3 text-sm text-[var(--status-info)] dark:bg-[var(--status-info-subtle)] dark:text-[var(--status-info)]">
        <div className="flex items-start gap-2">
          <Car className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">Analisi Flusso</p>
            <p className="mt-1 text-[var(--status-info)] dark:text-[var(--status-info)]">
              Media di {avgDaily} veicoli/giorno. I weekend mostrano un calo del{" "}
              {Math.round((1 - (data.filter((d) => d.day === "Sab" || d.day === "Dom")
                .reduce((acc, d) => acc + d.inService + d.waiting + d.ready, 0) /
                (2 * avgDaily))) * 100)}%
              rispetto alla media settimanale.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CarCountChart;
