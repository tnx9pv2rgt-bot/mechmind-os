"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Star,
  Clock,
  TrendingUp,
  Award,
  Wrench,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface MechanicData {
  id: string;
  name: string;
  ordersCompleted: number;
  revenue: number;
  avgTime: number; // in minutes
  rating: number;
  efficiency: number; // percentage
  utilization: number; // percentage
}

interface MechanicPerformanceProps {
  dateRange: "today" | "week" | "month" | "custom";
  locationId?: string;
}

// Mock mechanic data
const mockMechanics: MechanicData[] = [
  {
    id: "M001",
    name: "Marco Rossi",
    ordersCompleted: 45,
    revenue: 14580,
    avgTime: 95,
    rating: 4.9,
    efficiency: 94,
    utilization: 92,
  },
  {
    id: "M002",
    name: "Giuseppe Bianchi",
    ordersCompleted: 38,
    revenue: 12160,
    avgTime: 110,
    rating: 4.7,
    efficiency: 88,
    utilization: 85,
  },
  {
    id: "M003",
    name: "Antonio Verdi",
    ordersCompleted: 42,
    revenue: 13230,
    avgTime: 105,
    rating: 4.8,
    efficiency: 91,
    utilization: 89,
  },
  {
    id: "M004",
    name: "Francesco Neri",
    ordersCompleted: 35,
    revenue: 10850,
    avgTime: 120,
    rating: 4.5,
    efficiency: 82,
    utilization: 78,
  },
  {
    id: "M005",
    name: "Luca Ferrari",
    ordersCompleted: 48,
    revenue: 15840,
    avgTime: 88,
    rating: 4.9,
    efficiency: 96,
    utilization: 95,
  },
  {
    id: "M006",
    name: "Paolo Romano",
    ordersCompleted: 31,
    revenue: 9760,
    avgTime: 125,
    rating: 4.6,
    efficiency: 79,
    utilization: 75,
  },
];

type SortField = keyof MechanicData;
type SortDirection = "asc" | "desc";

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: MechanicData }>;
}) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] p-3 shadow-lg dark:border-[var(--border-default)] dark:bg-[var(--surface-primary)]">
        <p className="mb-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
          {data.name}
        </p>
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Ordini</span>
            <span className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              {data.ordersCompleted}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Fatturato</span>
            <span className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              {formatCurrency(data.revenue)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Tempo medio</span>
            <span className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              {data.avgTime} min
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Rating</span>
            <span className="flex items-center gap-1 font-medium text-[var(--status-warning)]">
              <Star className="h-3.5 w-3.5 fill-current" />
              {data.rating}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Efficienza</span>
            <span className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              {data.efficiency}%
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export function MechanicPerformance({ dateRange }: MechanicPerformanceProps) {
  const [mechanics] = useState<MechanicData[]>(mockMechanics);
  const [sortField, setSortField] = useState<SortField>("revenue");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

  const sortedMechanics = useMemo(() => {
    return [...mechanics].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      const multiplier = sortDirection === "asc" ? 1 : -1;
      return multiplier * ((aValue as number) - (bValue as number));
    });
  }, [mechanics, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const topPerformer = useMemo(() => {
    return mechanics.reduce((top, m) =>
      m.efficiency > top.efficiency ? m : top
    );
  }, [mechanics]);

  const avgEfficiency = useMemo(() => {
    return mechanics.reduce((sum, m) => sum + m.efficiency, 0) / mechanics.length;
  }, [mechanics]);

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--status-warning-subtle)] text-[var(--status-warning)]">
            <Award className="h-3.5 w-3.5" />
          </div>
        );
      case 1:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
            2
          </div>
        );
      case 2:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--status-warning)]/10 text-[var(--status-warning)]">
            3
          </div>
        );
      default:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-[var(--text-tertiary)]">
            {index + 1}
          </div>
        );
    }
  };

  const getBarColor = (efficiency: number) => {
    if (efficiency >= 90) return "#22c55e";
    if (efficiency >= 80) return "#3b82f6";
    if (efficiency >= 70) return "#f97316";
    return "var(--status-error)";
  };

  return (
    <div className="workshop-card">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            Performance Meccanici
          </h3>
          <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Analisi efficienza e produttività
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex rounded-lg bg-[var(--surface-secondary)] p-1 dark:bg-[var(--surface-primary)]">
            <button
              onClick={() => setViewMode("chart")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                viewMode === "chart"
                  ? "bg-[var(--surface-secondary)] text-[var(--text-primary)] shadow-sm dark:bg-[var(--border-default)] dark:text-[var(--text-on-brand)]"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] dark:text-[var(--text-secondary)]"
              )}
            >
              Grafico
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                viewMode === "table"
                  ? "bg-[var(--surface-secondary)] text-[var(--text-primary)] shadow-sm dark:bg-[var(--border-default)] dark:text-[var(--text-on-brand)]"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] dark:text-[var(--text-secondary)]"
              )}
            >
              Tabella
            </button>
          </div>
        </div>
      </div>

      {/* Top Performer Banner */}
      <div className="mb-6 rounded-lg bg-gradient-to-r from-[var(--status-warning)]/5 to-[var(--status-warning)]/5 p-4 dark:from-[var(--status-warning)]/40/20 dark:to-[var(--status-warning)]/40/20">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-[var(--status-warning)]/20 p-3 dark:bg-[var(--status-warning)]">
            <Award className="h-6 w-6 text-[var(--status-warning)] dark:text-[var(--status-warning)]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--status-warning)] dark:text-[var(--status-warning)]">
              Top Performer del Periodo
            </p>
            <p className="text-lg font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              {topPerformer.name}
            </p>
            <div className="mt-1 flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-[var(--status-success)] dark:text-[var(--status-success)]">
                <TrendingUp className="h-3.5 w-3.5" />
                {topPerformer.efficiency}% efficienza
              </span>
              <span className="flex items-center gap-1 text-[var(--status-warning)] dark:text-[var(--status-warning)]">
                <Star className="h-3.5 w-3.5 fill-current" />
                {topPerformer.rating} rating
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-[var(--status-info-subtle)] p-3 dark:bg-[var(--status-info-subtle)]">
          <p className="text-xs text-[var(--status-info)] dark:text-[var(--status-info)]">Media Efficienza</p>
          <p className="text-lg font-semibold text-[var(--status-info)] dark:text-[var(--status-info)]">
            {avgEfficiency.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-lg bg-[var(--status-success-subtle)] p-3 dark:bg-[var(--status-success-subtle)]">
          <p className="text-xs text-[var(--status-success)] dark:text-[var(--status-success)]">Ordini Totali</p>
          <p className="text-lg font-semibold text-[var(--status-success)] dark:text-[var(--status-success)]">
            {mechanics.reduce((sum, m) => sum + m.ordersCompleted, 0)}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--brand)]/5 p-3 dark:bg-[var(--brand)]/40/20">
          <p className="text-xs text-[var(--brand)] dark:text-[var(--brand)]">Rating Medio</p>
          <p className="text-lg font-semibold text-[var(--brand)] dark:text-[var(--brand)]">
            {(mechanics.reduce((sum, m) => sum + m.rating, 0) / mechanics.length).toFixed(1)}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--surface-secondary)] p-3 dark:bg-[var(--surface-primary)]">
          <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Tempo Medio</p>
          <p className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            {Math.round(mechanics.reduce((sum, m) => sum + m.avgTime, 0) / mechanics.length)}m
          </p>
        </div>
      </div>

      {viewMode === "chart" ? (
        <>
          {/* Chart */}
          <div className="mb-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedMechanics}
                layout="vertical"
                margin={{ left: 80 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                  className="dark:stroke-gray-700"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#374151", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={75}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="efficiency" name="Efficienza %" radius={[0, 4, 4, 0]}>
                  {sortedMechanics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.efficiency)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart Legend */}
          <div className="mb-4 flex flex-wrap items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[var(--status-success-subtle)]0" />
              <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Eccellente (≥90%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[var(--status-info-subtle)]0" />
              <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Buono (80-89%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[var(--status-warning)]/50" />
              <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Sufficiente (70-79%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[var(--status-error-subtle)]0" />
              <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Da Migliorare (&lt;70%)</span>
            </div>
          </div>
        </>
      ) : (
        /* Table View */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] dark:border-[var(--border-default)]">
                <th className="pb-3 pl-2 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  Rank
                </th>
                <th
                  className="cursor-pointer pb-3 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    Meccanico
                    {sortField === "name" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ))}
                  </div>
                </th>
                <th
                  className="cursor-pointer pb-3 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]"
                  onClick={() => handleSort("ordersCompleted")}
                >
                  <div className="flex items-center gap-1">
                    Ordini
                    {sortField === "ordersCompleted" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ))}
                  </div>
                </th>
                <th
                  className="cursor-pointer pb-3 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]"
                  onClick={() => handleSort("revenue")}
                >
                  <div className="flex items-center gap-1">
                    Fatturato
                    {sortField === "revenue" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ))}
                  </div>
                </th>
                <th
                  className="cursor-pointer pb-3 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]"
                  onClick={() => handleSort("avgTime")}
                >
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Tempo
                    {sortField === "avgTime" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ))}
                  </div>
                </th>
                <th
                  className="cursor-pointer pb-3 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]"
                  onClick={() => handleSort("rating")}
                >
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5" />
                    Rating
                    {sortField === "rating" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ))}
                  </div>
                </th>
                <th
                  className="cursor-pointer pb-3 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]"
                  onClick={() => handleSort("efficiency")}
                >
                  <div className="flex items-center gap-1">
                    Eff.
                    {sortField === "efficiency" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ))}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedMechanics.map((mechanic, index) => (
                <tr
                  key={mechanic.id}
                  className="border-b border-[var(--border-default)] transition-colors hover:bg-[var(--surface-secondary)] dark:border-[var(--border-strong)] dark:hover:bg-[var(--surface-hover)]/50"
                >
                  <td className="py-3 pl-2">{getRankBadge(index)}</td>
                  <td className="py-3 font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    {mechanic.name}
                  </td>
                  <td className="py-3 text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                    {mechanic.ordersCompleted}
                  </td>
                  <td className="py-3 font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    {formatCurrency(mechanic.revenue)}
                  </td>
                  <td className="py-3 text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                    {mechanic.avgTime}m
                  </td>
                  <td className="py-3">
                    <span className="flex items-center gap-1 font-medium text-[var(--status-warning)]">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {mechanic.rating}
                    </span>
                  </td>
                  <td className="py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        mechanic.efficiency >= 90
                          ? "bg-[var(--status-success-subtle)] text-[var(--status-success)] dark:bg-[var(--status-success)]/40/30 dark:text-[var(--status-success)]"
                          : mechanic.efficiency >= 80
                          ? "bg-[var(--status-info-subtle)] text-[var(--status-info)] dark:bg-[var(--status-info)]/40/30 dark:text-[var(--status-info)]"
                          : mechanic.efficiency >= 70
                          ? "bg-[var(--status-warning)]/10 text-[var(--status-warning)] dark:bg-[var(--status-warning)]/40/30 dark:text-[var(--status-warning)]"
                          : "bg-[var(--status-error-subtle)] text-[var(--status-error)] dark:bg-[var(--status-error)]/40/30 dark:text-[var(--status-error)]"
                      )}
                    >
                      {mechanic.efficiency}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default MechanicPerformance;
