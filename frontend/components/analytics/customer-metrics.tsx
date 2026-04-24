"use client";

import { useState, useMemo } from "react";
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
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  Users,
  UserPlus,
  UserMinus,
  TrendingUp,
  TrendingDown,
  Heart,
  Repeat,
  Crown,
  Package,
  AlertTriangle,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface CustomerData {
  date: string;
  newCustomers: number;
  returningCustomers: number;
  totalCustomers: number;
  churnedCustomers: number;
}

interface CLVData {
  segment: string;
  customers: number;
  avgCLV: number;
  totalRevenue: number;
  color: string;
}

interface CustomerMetricsProps {
  dateRange: "today" | "week" | "month" | "custom";
  locationId?: string;
}

function generateCustomerData(range: string): CustomerData[] {
  const data: CustomerData[] = [];
  const days = range === "today" ? 24 : range === "week" ? 7 : 30;

  let totalCustomers = 1200;

  for (let i = 0; i < days; i++) {
    const date =
      range === "today"
        ? `${i}:00`
        : new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toLocaleDateString(
            "it-IT",
            { day: "2-digit", month: "short" }
          );

    const newCustomers = Math.round(2 + Math.random() * 5);
    const returningCustomers = Math.round(8 + Math.random() * 12);
    const churnedCustomers = Math.round(Math.random() * 2);

    totalCustomers += newCustomers - churnedCustomers;

    data.push({
      date,
      newCustomers,
      returningCustomers,
      totalCustomers,
      churnedCustomers,
    });
  }
  return data;
}

const clvData: CLVData[] = [
  {
    segment: "VIP",
    customers: 45,
    avgCLV: 4500,
    totalRevenue: 202500,
    color: "var(--brand)", // purple
  },
  {
    segment: "Fedeli",
    customers: 180,
    avgCLV: 2800,
    totalRevenue: 504000,
    color: "#0284c7", // brand
  },
  {
    segment: "Occasionali",
    customers: 420,
    avgCLV: 850,
    totalRevenue: 357000,
    color: "#22c55e", // green
  },
  {
    segment: "Nuovi",
    customers: 120,
    avgCLV: 320,
    totalRevenue: 38400,
    color: "#f97316", // orange
  },
  {
    segment: "Dormienti",
    customers: 85,
    avgCLV: 150,
    totalRevenue: 12750,
    color: "#94a3b8", // gray
  },
];

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: keyof CustomerData; value: number; color: string }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] p-3 shadow-lg dark:border-[var(--border-default)] dark:bg-[var(--surface-primary)]">
        <p className="mb-2 text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
          {label}
        </p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                  {entry.dataKey === "newCustomers"
                    ? "Nuovi"
                    : entry.dataKey === "returningCustomers"
                    ? "Recurrenti"
                    : entry.dataKey === "totalCustomers"
                    ? "Totale"
                    : "Churn"}
                </span>
              </div>
              <span className="font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export function CustomerMetrics({ dateRange }: CustomerMetricsProps) {
  const [data] = useState(() => generateCustomerData(dateRange));
  const [activeTab, setActiveTab] = useState<"acquisition" | "clv" | "churn">("acquisition");

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalNew = data.reduce((sum, d) => sum + d.newCustomers, 0);
    const totalReturning = data.reduce((sum, d) => sum + d.returningCustomers, 0);
    const totalChurned = data.reduce((sum, d) => sum + d.churnedCustomers, 0);
    const currentTotal = data[data.length - 1]?.totalCustomers || 0;
    const previousTotal = data[0]?.totalCustomers || 0;
    const growthRate = ((currentTotal - previousTotal) / previousTotal) * 100;
    const churnRate = (totalChurned / currentTotal) * 100;
    const retentionRate = 100 - churnRate;

    return {
      totalNew,
      totalReturning,
      totalChurned,
      currentTotal,
      growthRate,
      churnRate,
      retentionRate,
    };
  }, [data]);

  const repeatRate = useMemo(() => {
    return (metrics.totalReturning / (metrics.totalNew + metrics.totalReturning)) * 100;
  }, [metrics]);

  return (
    <div className="workshop-card">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            Metriche Clienti
          </h3>
          <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Analisi acquisizione, retention e lifetime value
          </p>
        </div>
        <div className="flex rounded-lg bg-[var(--surface-secondary)] p-1 dark:bg-[var(--surface-primary)]">
          {[
            { key: "acquisition", label: "Acquisizione" },
            { key: "clv", label: "CLV" },
            { key: "churn", label: "Churn" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                activeTab === tab.key
                  ? "bg-[var(--surface-secondary)] text-[var(--text-primary)] shadow-sm dark:bg-[var(--border-default)] dark:text-[var(--text-on-brand)]"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] dark:text-[var(--text-secondary)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-[var(--status-info-subtle)] p-3 dark:bg-[var(--status-info-subtle)]">
          <div className="flex items-center gap-2 text-[var(--status-info)] dark:text-[var(--status-info)]">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">Clienti Totali</span>
          </div>
          <p className="mt-1 text-xl font-bold text-[var(--status-info)] dark:text-[var(--status-info)]">
            {metrics.currentTotal}
          </p>
          <div
            className={cn(
              "mt-1 flex items-center gap-1 text-xs",
              metrics.growthRate >= 0 ? "text-[var(--status-success)]" : "text-[var(--status-error)]"
            )}
          >
            {metrics.growthRate >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(metrics.growthRate).toFixed(1)}%
          </div>
        </div>
        <div className="rounded-lg bg-[var(--status-success-subtle)] p-3 dark:bg-[var(--status-success-subtle)]">
          <div className="flex items-center gap-2 text-[var(--status-success)] dark:text-[var(--status-success)]">
            <Repeat className="h-4 w-4" />
            <span className="text-xs font-medium">Tasso Recurrenti</span>
          </div>
          <p className="mt-1 text-xl font-bold text-[var(--status-success)] dark:text-[var(--status-success)]">
            {repeatRate.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-[var(--status-success)] dark:text-[var(--status-success)]">
            {metrics.totalReturning} clienti
          </p>
        </div>
        <div className="rounded-lg bg-[var(--status-warning)]/5 p-3 dark:bg-[var(--status-warning)]/40/20">
          <div className="flex items-center gap-2 text-[var(--status-warning)] dark:text-[var(--status-warning)]">
            <UserPlus className="h-4 w-4" />
            <span className="text-xs font-medium">Nuovi Clienti</span>
          </div>
          <p className="mt-1 text-xl font-bold text-[var(--status-warning)] dark:text-[var(--status-warning)]">
            {metrics.totalNew}
          </p>
          <p className="mt-1 text-xs text-[var(--status-warning)] dark:text-[var(--status-warning)]">
            nel periodo
          </p>
        </div>
        <div className="rounded-lg bg-[var(--status-error-subtle)] p-3 dark:bg-[var(--status-error-subtle)]">
          <div className="flex items-center gap-2 text-[var(--status-error)] dark:text-[var(--status-error)]">
            <UserMinus className="h-4 w-4" />
            <span className="text-xs font-medium">Churn Rate</span>
          </div>
          <p className="mt-1 text-xl font-bold text-[var(--status-error)] dark:text-[var(--status-error)]">
            {metrics.churnRate.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-[var(--status-error)] dark:text-[var(--status-error)]">
            {metrics.totalChurned} persi
          </p>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "acquisition" && (
        <>
          <div className="mb-4">
            <h4 className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              Nuovi vs Recurrenti
            </h4>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
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
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: "1rem" }}
                  formatter={(value) => (
                    <span className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                      {value === "newCustomers"
                        ? "Nuovi Clienti"
                        : "Clienti Recurrenti"}
                    </span>
                  )}
                />
                <Bar
                  dataKey="newCustomers"
                  name="newCustomers"
                  fill="#f97316"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="returningCustomers"
                  name="returningCustomers"
                  stroke="#0284c7"
                  strokeWidth={3}
                  dot={{ fill: "#0284c7", strokeWidth: 2, r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Acquisition Insight */}
          <div className="mt-4 rounded-lg bg-[var(--status-info-subtle)] p-3 text-sm text-[var(--status-info)] dark:bg-[var(--status-info-subtle)] dark:text-[var(--status-info)]">
            <div className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-medium">Trend Acquisizione</p>
                <p className="mt-1 text-[var(--status-info)] dark:text-[var(--status-info)]">
                  Rapporto recurrenti/nuovi di {(metrics.totalReturning / metrics.totalNew).toFixed(1)}:1.
                  {" "}
                  {repeatRate > 70
                    ? "Eccellente retention! Focus su acquisizione nuovi clienti."
                    : "Migliorare il tasso di retention con programma fedeltà."}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "clv" && (
        <>
          <div className="mb-4">
            <h4 className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              Customer Lifetime Value per Segmento
            </h4>
          </div>

          {/* CLV Segments Grid */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {clvData.map((segment) => {
              const Icon =
                segment.segment === "VIP"
                  ? Crown
                  : segment.segment === "Fedeli"
                  ? Heart
                  : segment.segment === "Occasionali"
                  ? Package
                  : segment.segment === "Nuovi"
                  ? UserPlus
                  : AlertTriangle;

              return (
                <div
                  key={segment.segment}
                  className="rounded-lg border p-3 transition-colors hover:shadow-sm dark:border-[var(--border-default)]"
                  style={{ borderColor: segment.color + "40" }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="rounded-lg p-1.5"
                      style={{ backgroundColor: segment.color + "15" }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: segment.color }} />
                    </div>
                    <span className="text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                      {segment.segment}
                    </span>
                  </div>
                  <p className="mt-2 text-lg font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    {formatCurrency(segment.avgCLV)}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                    {segment.customers} clienti
                  </p>
                </div>
              );
            })}
          </div>

          {/* CLV Bar Chart */}
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clvData} layout="vertical" margin={{ left: 60 }}>
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
                  tickFormatter={(value) => `€${value}`}
                />
                <YAxis
                  type="category"
                  dataKey="segment"
                  tick={{ fill: "#374151", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as CLVData;
                      return (
                        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] p-3 shadow-lg dark:border-[var(--border-default)] dark:bg-[var(--surface-primary)]">
                          <p className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                            {data.segment}
                          </p>
                          <div className="mt-2 space-y-1 text-sm">
                            <div className="flex justify-between gap-4">
                              <span className="text-[var(--text-tertiary)]">CLV Medio:</span>
                              <span className="font-medium">
                                {formatCurrency(data.avgCLV)}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-[var(--text-tertiary)]">Clienti:</span>
                              <span className="font-medium">{data.customers}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-[var(--text-tertiary)]">Fatturato:</span>
                              <span className="font-medium">
                                {formatCurrency(data.totalRevenue)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="avgCLV" radius={[0, 4, 4, 0]}>
                  {clvData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* CLV Insight */}
          <div className="mt-4 rounded-lg bg-[var(--brand)]/5 p-3 text-sm text-[var(--brand)] dark:bg-[var(--brand)]/40/20 dark:text-[var(--brand)]">
            <div className="flex items-start gap-2">
              <Crown className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-medium">Analisi CLV</p>
                <p className="mt-1 text-[var(--brand)] dark:text-[var(--brand)]">
                  I clienti VIP (top {((45 / metrics.currentTotal) * 100).toFixed(1)}%) generano{" "}
                  {((202500 / (202500 + 504000 + 357000 + 38400 + 12750)) * 100).toFixed(1)}%
                  del fatturato totale. Investire nel programma fedeltà per spostare
                  clienti verso segmenti superiori.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "churn" && (
        <>
          <div className="mb-4">
            <h4 className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              Analisi Churn e Retention
            </h4>
          </div>

          {/* Churn Metrics */}
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-[var(--status-error)]/30 bg-[var(--status-error-subtle)] p-4 text-center dark:border-[var(--status-error)] dark:bg-[var(--status-error-subtle)]">
              <p className="text-3xl font-bold text-[var(--status-error)] dark:text-[var(--status-error)]">
                {metrics.churnRate.toFixed(1)}%
              </p>
              <p className="text-sm text-[var(--status-error)] dark:text-[var(--status-error)]">Churn Rate</p>
              <p className="mt-1 text-xs text-[var(--status-error)] dark:text-[var(--status-error)]">
                {metrics.totalChurned} clienti persi
              </p>
            </div>
            <div className="rounded-lg border border-[var(--status-success)]/30 bg-[var(--status-success-subtle)] p-4 text-center dark:border-[var(--status-success)] dark:bg-[var(--status-success-subtle)]">
              <p className="text-3xl font-bold text-[var(--status-success)] dark:text-[var(--status-success)]">
                {metrics.retentionRate.toFixed(1)}%
              </p>
              <p className="text-sm text-[var(--status-success)] dark:text-[var(--status-success)]">Retention Rate</p>
              <p className="mt-1 text-xs text-[var(--status-success)] dark:text-[var(--status-success)]">
                Clienti retained
              </p>
            </div>
            <div className="rounded-lg border border-[var(--status-info)]/30 bg-[var(--status-info-subtle)] p-4 text-center dark:border-[var(--status-info)] dark:bg-[var(--status-info-subtle)]">
              <p className="text-3xl font-bold text-[var(--status-info)] dark:text-[var(--status-info)]">
                {metrics.totalNew > 0
                  ? ((metrics.totalNew - metrics.totalChurned) / metrics.totalNew * 100).toFixed(1)
                  : 0}%
              </p>
              <p className="text-sm text-[var(--status-info)] dark:text-[var(--status-info)]">Net Growth</p>
              <p className="mt-1 text-xs text-[var(--status-info)] dark:text-[var(--status-info)]">
                Nuovi - Churn
              </p>
            </div>
          </div>

          {/* Churn Trend Chart */}
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
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
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="churnedCustomers"
                  name="Churn"
                  stroke="var(--status-error)"
                  strokeWidth={2}
                  dot={{ fill: "var(--status-error)", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Churn Alert */}
          {metrics.churnRate > 5 && (
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-[var(--status-warning)]/10 p-3 text-sm text-[var(--status-warning)] dark:bg-[var(--status-warning)]/20 dark:text-[var(--status-warning)]">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Churn Rate Elevato</p>
                <p className="mt-1 text-[var(--status-warning)] dark:text-[var(--status-warning)]">
                  Il churn rate del {metrics.churnRate.toFixed(1)}% è superiore al benchmark
                  del settore (3-5%). Considera un programma di win-back per i clienti
                  dormienti.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CustomerMetrics;
