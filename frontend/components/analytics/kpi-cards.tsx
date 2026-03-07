"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  Wrench,
  Users,
  Star,
  Clock,
  FileCheck,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface KPIData {
  totalRevenue: number;
  revenueChange: number;
  activeOrders: number;
  ordersChange: number;
  aro: number;
  aroChange: number;
  customerSatisfaction: number;
  satisfactionChange: number;
  mechanicUtilization: number;
  utilizationChange: number;
  conversionRate: number;
  conversionChange: number;
}

const mockKPIData: KPIData = {
  totalRevenue: 45280,
  revenueChange: 12.5,
  activeOrders: 28,
  ordersChange: 8.3,
  aro: 285,
  aroChange: -3.2,
  customerSatisfaction: 4.7,
  satisfactionChange: 2.1,
  mechanicUtilization: 87,
  utilizationChange: 5.4,
  conversionRate: 76,
  conversionChange: 4.2,
};

interface KPICardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  color: string;
  suffix?: string;
  isLoading?: boolean;
}

function KPICard({
  title,
  value,
  change,
  icon: Icon,
  color,
  suffix = "",
  isLoading = false,
}: KPICardProps) {
  const isPositive = change >= 0;

  return (
    <div className="workshop-card relative overflow-hidden">
      {/* Real-time indicator pulse */}
      <div className="absolute right-3 top-3">
        <div className="relative flex h-2 w-2">
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              color.replace("bg-", "bg-").replace("600", "400")
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-2 w-2 rounded-full",
              color.replace("600", "500")
            )}
          />
        </div>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {isLoading ? (
                <span className="inline-block h-8 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              ) : (
                value
              )}
            </p>
            {suffix && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {suffix}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1">
            {isLoading ? (
              <span className="inline-block h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            ) : (
              <>
                <span
                  className={cn(
                    "flex items-center text-sm font-medium",
                    isPositive
                      ? "text-status-ready"
                      : "text-status-urgent"
                  )}
                >
                  {isPositive ? (
                    <ArrowUpRight className="mr-0.5 h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="mr-0.5 h-3.5 w-3.5" />
                  )}
                  {Math.abs(change).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  vs periodo precedente
                </span>
              </>
            )}
          </div>
        </div>
        <div
          className={cn(
            "rounded-xl p-3 shadow-sm transition-transform hover:scale-105",
            color
          )}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>

      {/* Mini sparkline placeholder */}
      <div className="mt-4 flex items-end gap-0.5 h-8">
        {[40, 65, 45, 80, 55, 70, 85, 60, 75, 90].map((h, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-t transition-all duration-500",
              isPositive ? "bg-status-ready/20" : "bg-status-urgent/20"
            )}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function KPICards() {
  const [data, setData] = useState<KPIData>(mockKPIData);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly update one metric slightly to simulate real-time data
      setData((prev) => {
        const metrics: (keyof KPIData)[] = [
          "totalRevenue",
          "activeOrders",
          "aro",
          "customerSatisfaction",
          "mechanicUtilization",
          "conversionRate",
        ];
        const randomMetric = metrics[Math.floor(Math.random() * metrics.length)];
        const variation = (Math.random() - 0.5) * 0.02; // ±1%

        return {
          ...prev,
          [randomMetric]:
            typeof prev[randomMetric] === "number"
              ? (prev[randomMetric] as number) * (1 + variation)
              : prev[randomMetric],
        };
      });
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const refreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setLastUpdate(new Date());
    }, 800);
  };

  const cards = [
    {
      title: "Fatturato Totale",
      value: formatCurrency(data.totalRevenue),
      change: data.revenueChange,
      icon: TrendingUp,
      color: "bg-status-ready",
    },
    {
      title: "Ordini Attivi",
      value: data.activeOrders.toString(),
      change: data.ordersChange,
      icon: Wrench,
      color: "bg-status-info",
    },
    {
      title: "ARO Medio",
      value: formatCurrency(data.aro),
      change: data.aroChange,
      icon: Activity,
      color: "bg-brand-600",
    },
    {
      title: "Soddisfazione Clienti",
      value: data.customerSatisfaction.toFixed(1),
      change: data.satisfactionChange,
      icon: Star,
      color: "bg-yellow-500",
      suffix: "/5",
    },
    {
      title: "Utilizzo Meccanici",
      value: Math.round(data.mechanicUtilization).toString(),
      change: data.utilizationChange,
      icon: Clock,
      color: "bg-purple-600",
      suffix: "%",
    },
    {
      title: "Conversione Preventivi",
      value: Math.round(data.conversionRate).toString(),
      change: data.conversionChange,
      icon: FileCheck,
      color: "bg-orange-500",
      suffix: "%",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            KPI in Tempo Reale
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ultimo aggiornamento: {lastUpdate.toLocaleTimeString("it-IT")}
          </p>
        </div>
        <button
          onClick={refreshData}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <Activity
            className={cn(
              "h-4 w-4",
              isLoading && "animate-spin"
            )}
          />
          {isLoading ? "Aggiornamento..." : "Aggiorna"}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <KPICard
            key={card.title}
            {...card}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}

export default KPICards;
