"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import { Target, TrendingUp, TrendingDown, Info, Settings } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface AROData {
  date: string;
  aro: number;
  target: number;
  lastYear: number;
}

interface AROChartProps {
  dateRange: "today" | "week" | "month" | "custom";
  locationId?: string;
}

function generateAROData(range: string): AROData[] {
  const data: AROData[] = [];
  const days = range === "today" ? 24 : range === "week" ? 7 : 30;
  const baseARO = 275;
  const targetARO = 300;

  for (let i = 0; i < days; i++) {
    const date =
      range === "today"
        ? `${i}:00`
        : new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toLocaleDateString(
            "it-IT",
            { day: "2-digit", month: "short" }
          );

    // Add realistic variation and trend
    const randomVariation = (Math.random() - 0.5) * 60;
    const trendImprovement = i * 0.5; // Slight improvement trend
    const dayOfWeekEffect =
      i % 7 === 0 || i % 7 === 6 ? -20 : 10; // Lower on weekends, higher mid-week

    data.push({
      date,
      aro: Math.round(baseARO + randomVariation + trendImprovement + dayOfWeekEffect),
      target: targetARO,
      lastYear: baseARO - 25,
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
  payload?: Array<{ dataKey: keyof AROData; value: number; color: string }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    const aroValue = payload.find((p) => p.dataKey === "aro")?.value || 0;
    const targetValue = payload.find((p) => p.dataKey === "target")?.value || 0;
    const gap = aroValue - targetValue;

    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <p className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
          {label}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600 dark:text-gray-400">
                {entry.dataKey === "aro"
                  ? "ARO"
                  : entry.dataKey === "target"
                  ? "Obiettivo"
                  : "Anno Scorso"}
              </span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
        {gap !== 0 && (
          <div className="mt-2 border-t border-gray-200 pt-2 dark:border-gray-700">
            <div
              className={cn(
                "flex items-center justify-between text-sm",
                gap >= 0 ? "text-status-ready" : "text-status-urgent"
              )}
            >
              <span>Gap obiettivo</span>
              <span className="font-semibold">
                {gap >= 0 ? "+" : ""}
                {formatCurrency(gap)}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
}

export function AROChart({ dateRange }: AROChartProps) {
  const [data] = useState(() => generateAROData(dateRange));
  const [targetARO, setTargetARO] = useState(300);
  const [showTarget, setShowTarget] = useState(true);
  const [showLastYear, setShowLastYear] = useState(true);

  // Calculate metrics
  const metrics = useMemo(() => {
    const currentARO = data.reduce((sum, d) => sum + d.aro, 0) / data.length;
    const lastYearARO = data[0]?.lastYear || 0;
    const yoyChange = ((currentARO - lastYearARO) / lastYearARO) * 100;
    const targetAchievement = (currentARO / targetARO) * 100;
    const daysAboveTarget = data.filter((d) => d.aro >= targetARO).length;
    const maxARO = Math.max(...data.map((d) => d.aro));
    const minARO = Math.min(...data.map((d) => d.aro));

    return {
      currentARO,
      yoyChange,
      targetAchievement,
      daysAboveTarget,
      maxARO,
      minARO,
    };
  }, [data, targetARO]);

  // Trend analysis
  const trend = useMemo(() => {
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.aro, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.aro, 0) / secondHalf.length;
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    return {
      direction: change >= 0 ? ("up" as const) : ("down" as const),
      change: Math.abs(change),
    };
  }, [data]);

  return (
    <div className="workshop-card">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Average Repair Order (ARO)
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Trend ARO con analisi obiettivi
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(metrics.currentARO)}
            </p>
            <div
              className={cn(
                "flex items-center justify-end gap-1 text-sm",
                metrics.yoyChange >= 0 ? "text-status-ready" : "text-status-urgent"
              )}
            >
              {metrics.yoyChange >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{Math.abs(metrics.yoyChange).toFixed(1)}% vs anno scorso</span>
            </div>
          </div>
        </div>
      </div>

      {/* Target Setting */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-brand-600" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Obiettivo ARO:
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="200"
            max="500"
            value={targetARO}
            onChange={(e) => setTargetARO(Number(e.target.value))}
            className="h-2 w-32 cursor-pointer appearance-none rounded-lg bg-gray-200 accent-brand-600 dark:bg-gray-700"
          />
          <span className="w-20 text-sm font-semibold text-gray-900 dark:text-white">
            {formatCurrency(targetARO)}
          </span>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setShowTarget(!showTarget)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              showTarget
                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
            )}
          >
            <span
              className={cn("h-2 w-2 rounded-full", showTarget && "bg-orange-500")}
            />
            Obiettivo
          </button>
          <button
            onClick={() => setShowLastYear(!showLastYear)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              showLastYear
                ? "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300"
                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
            )}
          >
            <span
              className={cn("h-2 w-2 rounded-full", showLastYear && "bg-gray-400")}
            />
            Anno Scorso
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
          <p className="text-xs text-green-600 dark:text-green-400">Raggiungimento</p>
          <p
            className={cn(
              "text-lg font-semibold",
              metrics.targetAchievement >= 100
                ? "text-status-ready"
                : "text-status-urgent"
            )}
          >
            {metrics.targetAchievement.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
          <p className="text-xs text-blue-600 dark:text-blue-400">Giorni sopra target</p>
          <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">
            {metrics.daysAboveTarget}/{data.length}
          </p>
        </div>
        <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
          <p className="text-xs text-purple-600 dark:text-purple-400">ARO Massimo</p>
          <p className="text-lg font-semibold text-purple-700 dark:text-purple-300">
            {formatCurrency(metrics.maxARO)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">ARO Minimo</p>
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            {formatCurrency(metrics.minARO)}
          </p>
        </div>
      </div>

      {/* Trend Analysis Banner */}
      <div
        className={cn(
          "mb-4 flex items-center gap-3 rounded-lg p-3",
          trend.direction === "up"
            ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200"
            : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200"
        )}
      >
        {trend.direction === "up" ? (
          <TrendingUp className="h-5 w-5" />
        ) : (
          <TrendingDown className="h-5 w-5" />
        )}
        <div>
          <p className="font-medium">
            Trend {trend.direction === "up" ? "positivo" : "negativo"} rilevato
          </p>
          <p className="text-sm opacity-80">
            ARO in {trend.direction === "up" ? "crescita" : "calo"} del{" "}
            {trend.change.toFixed(1)}% nella seconda metà del periodo
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="aroGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              className="dark:stroke-gray-700"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `€${value}`}
              domain={[200, "auto"]}
            />
            <Tooltip content={<CustomTooltip />} />
            {showLastYear && (
              <Line
                type="monotone"
                dataKey="lastYear"
                name="Anno Scorso"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
            {showTarget && (
              <ReferenceLine
                y={targetARO}
                stroke="#f97316"
                strokeDasharray="3 3"
                strokeWidth={2}
                label={{
                  value: `Target: ${formatCurrency(targetARO)}`,
                  position: "right",
                  fill: "#f97316",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="aro"
              fill="url(#aroGradient)"
              stroke="none"
            />
            <Line
              type="monotone"
              dataKey="aro"
              name="ARO"
              stroke="#0284c7"
              strokeWidth={3}
              dot={{ fill: "#0284c7", strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">Analisi ARO</p>
            <p className="mt-1 text-blue-700 dark:text-blue-300">
              {metrics.targetAchievement >= 100
                ? `Ottimo! Stai superando l'obiettivo del ${(
                    metrics.targetAchievement - 100
                  ).toFixed(1)}%. Considera di alzare il target.`
                : `Attenzione: sei al ${metrics.targetAchievement.toFixed(
                    1
                  )}% dell'obiettivo. Focus su upselling e servizi aggiuntivi.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AROChart;
