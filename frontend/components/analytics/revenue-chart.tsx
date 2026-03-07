"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface RevenueData {
  date: string;
  current: number;
  previous: number;
  target: number;
}

interface RevenueChartProps {
  dateRange: "today" | "week" | "month" | "custom";
  locationId?: string;
}

// Generate realistic mock data
function generateRevenueData(range: string): RevenueData[] {
  const data: RevenueData[] = [];
  const days = range === "today" ? 24 : range === "week" ? 7 : 30;
  const baseRevenue = range === "today" ? 150 : 2500;

  for (let i = 0; i < days; i++) {
    const date =
      range === "today"
        ? `${i}:00`
        : new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toLocaleDateString(
            "it-IT",
            { day: "2-digit", month: "short" }
          );

    // Add some realistic variation
    const randomFactor = 0.7 + Math.random() * 0.6;
    const dayOfWeekFactor = i % 7 === 0 || i % 7 === 6 ? 0.6 : 1; // Weekends are slower
    const trendFactor = 1 + i * 0.01; // Slight upward trend

    data.push({
      date,
      current: Math.round(baseRevenue * randomFactor * dayOfWeekFactor * trendFactor),
      previous: Math.round(baseRevenue * randomFactor * dayOfWeekFactor * 0.9),
      target: Math.round(baseRevenue * 1.1),
    });
  }
  return data;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <p className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
          {label}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-400">
              {entry.name}:
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export function RevenueChart({ dateRange, locationId }: RevenueChartProps) {
  const [data] = useState(() => generateRevenueData(dateRange));
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const toggleSeries = (dataKey: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(dataKey)) {
        next.delete(dataKey);
      } else {
        next.add(dataKey);
      }
      return next;
    });
  };

  // Calculate metrics
  const totalCurrent = data.reduce((sum, d) => sum + d.current, 0);
  const totalPrevious = data.reduce((sum, d) => sum + d.previous, 0);
  const totalTarget = data.reduce((sum, d) => sum + d.target, 0);
  const percentChange = ((totalCurrent - totalPrevious) / totalPrevious) * 100;
  const targetAchievement = (totalCurrent / totalTarget) * 100;

  const avgDaily = totalCurrent / data.length;
  const maxDaily = Math.max(...data.map((d) => d.current));

  return (
    <div className="workshop-card">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Trend Fatturato
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Confronto periodo attuale vs precedente
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalCurrent)}
            </p>
            <div
              className={cn(
                "flex items-center justify-end gap-1 text-sm",
                percentChange >= 0 ? "text-status-ready" : "text-status-urgent"
              )}
            >
              {percentChange >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{Math.abs(percentChange).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">Media Giornaliera</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatCurrency(avgDaily)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">Picco Giornaliero</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatCurrency(maxDaily)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">Budget</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {targetAchievement.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">Periodo</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {dateRange === "today"
              ? "Oggi"
              : dateRange === "week"
              ? "7 giorni"
              : dateRange === "month"
              ? "30 giorni"
              : "Personalizzato"}
          </p>
        </div>
      </div>

      {/* Legend Toggle */}
      <div className="mb-4 flex flex-wrap gap-3">
        {[
          { key: "current", label: "Periodo Attuale", color: "#0284c7" },
          { key: "previous", label: "Periodo Precedente", color: "#94a3b8" },
          { key: "target", label: "Obiettivo", color: "#f97316" },
        ].map((series) => (
          <button
            key={series.key}
            onClick={() => toggleSeries(series.key)}
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-all",
              hiddenSeries.has(series.key)
                ? "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            )}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: hiddenSeries.has(series.key)
                  ? "#9ca3af"
                  : series.color,
              }}
            />
            {series.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              className="dark:stroke-gray-700"
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `€${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            {!hiddenSeries.has("previous") && (
              <Line
                type="monotone"
                dataKey="previous"
                name="Periodo Precedente"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}
            {!hiddenSeries.has("target") && (
              <Line
                type="monotone"
                dataKey="target"
                name="Obiettivo"
                stroke="#f97316"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
              />
            )}
            {!hiddenSeries.has("current") && (
              <>
                <Area
                  type="monotone"
                  dataKey="current"
                  fill="url(#currentGradient)"
                  stroke="none"
                />
                <Line
                  type="monotone"
                  dataKey="current"
                  name="Periodo Attuale"
                  stroke="#0284c7"
                  strokeWidth={3}
                  dot={{ fill: "#0284c7", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default RevenueChart;
