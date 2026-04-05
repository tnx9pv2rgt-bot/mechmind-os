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
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <p className="mb-2 font-semibold text-gray-900 dark:text-white">
          {data.name}
        </p>
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-500 dark:text-gray-400">Ordini</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {data.ordersCompleted}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-500 dark:text-gray-400">Fatturato</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(data.revenue)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-500 dark:text-gray-400">Tempo medio</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {data.avgTime} min
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-500 dark:text-gray-400">Rating</span>
            <span className="flex items-center gap-1 font-medium text-yellow-600">
              <Star className="h-3.5 w-3.5 fill-current" />
              {data.rating}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-500 dark:text-gray-400">Efficienza</span>
            <span className="font-medium text-gray-900 dark:text-white">
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
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100 text-yellow-700">
            <Award className="h-3.5 w-3.5" />
          </div>
        );
      case 1:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-600">
            2
          </div>
        );
      case 2:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-orange-700">
            3
          </div>
        );
      default:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-50 text-gray-400">
            {index + 1}
          </div>
        );
    }
  };

  const getBarColor = (efficiency: number) => {
    if (efficiency >= 90) return "#22c55e";
    if (efficiency >= 80) return "#3b82f6";
    if (efficiency >= 70) return "#f97316";
    return "#ef4444";
  };

  return (
    <div className="workshop-card">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Performance Meccanici
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Analisi efficienza e produttività
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            <button
              onClick={() => setViewMode("chart")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                viewMode === "chart"
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              )}
            >
              Grafico
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                viewMode === "table"
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              )}
            >
              Tabella
            </button>
          </div>
        </div>
      </div>

      {/* Top Performer Banner */}
      <div className="mb-6 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 p-4 dark:from-yellow-900/20 dark:to-orange-900/20">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-800">
            <Award className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Top Performer del Periodo
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {topPerformer.name}
            </p>
            <div className="mt-1 flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-700 dark:text-green-400">
                <TrendingUp className="h-3.5 w-3.5" />
                {topPerformer.efficiency}% efficienza
              </span>
              <span className="flex items-center gap-1 text-yellow-700 dark:text-yellow-400">
                <Star className="h-3.5 w-3.5 fill-current" />
                {topPerformer.rating} rating
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
          <p className="text-xs text-blue-600 dark:text-blue-400">Media Efficienza</p>
          <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">
            {avgEfficiency.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
          <p className="text-xs text-green-600 dark:text-green-400">Ordini Totali</p>
          <p className="text-lg font-semibold text-green-700 dark:text-green-300">
            {mechanics.reduce((sum, m) => sum + m.ordersCompleted, 0)}
          </p>
        </div>
        <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
          <p className="text-xs text-purple-600 dark:text-purple-400">Rating Medio</p>
          <p className="text-lg font-semibold text-purple-700 dark:text-purple-300">
            {(mechanics.reduce((sum, m) => sum + m.rating, 0) / mechanics.length).toFixed(1)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">Tempo Medio</p>
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
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
              <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="text-gray-600 dark:text-gray-400">Eccellente (≥90%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-gray-600 dark:text-gray-400">Buono (80-89%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
              <span className="text-gray-600 dark:text-gray-400">Sufficiente (70-79%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="text-gray-600 dark:text-gray-400">Da Migliorare (&lt;70%)</span>
            </div>
          </div>
        </>
      ) : (
        /* Table View */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="pb-3 pl-2 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]">
                  Rank
                </th>
                <th
                  className="cursor-pointer pb-3 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]"
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
                  className="cursor-pointer pb-3 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]"
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
                  className="cursor-pointer pb-3 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]"
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
                  className="cursor-pointer pb-3 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]"
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
                  className="cursor-pointer pb-3 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]"
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
                  className="cursor-pointer pb-3 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]"
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
                  className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                >
                  <td className="py-3 pl-2">{getRankBadge(index)}</td>
                  <td className="py-3 font-medium text-gray-900 dark:text-white">
                    {mechanic.name}
                  </td>
                  <td className="py-3 text-gray-600 dark:text-gray-400">
                    {mechanic.ordersCompleted}
                  </td>
                  <td className="py-3 font-medium text-gray-900 dark:text-white">
                    {formatCurrency(mechanic.revenue)}
                  </td>
                  <td className="py-3 text-gray-600 dark:text-gray-400">
                    {mechanic.avgTime}m
                  </td>
                  <td className="py-3">
                    <span className="flex items-center gap-1 font-medium text-yellow-600">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {mechanic.rating}
                    </span>
                  </td>
                  <td className="py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        mechanic.efficiency >= 90
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : mechanic.efficiency >= 80
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : mechanic.efficiency >= 70
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
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
