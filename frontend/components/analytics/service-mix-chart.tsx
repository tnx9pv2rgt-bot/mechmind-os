"use client";

import { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Sector,
} from "recharts";
import {
  Wrench,
  Zap,
  Car,
  CircleDot,
  Settings,
  TrendingUp,
  Percent,
  DollarSign,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface ServiceData {
  name: string;
  value: number;
  revenue: number;
  count: number;
  color: string;
  icon: React.ElementType;
}

interface ServiceMixChartProps {
  dateRange: "today" | "week" | "month" | "custom";
  locationId?: string;
}

// Service type configuration
const serviceConfig = {
  tagliando: {
    label: "Tagliando",
    color: "#0284c7", // brand-600
    icon: Settings,
  },
  meccanica: {
    label: "Meccanica",
    color: "#22c55e", // status-ready
    icon: Wrench,
  },
  elettronica: {
    label: "Elettronica",
    color: "#8b5cf6", // purple
    icon: Zap,
  },
  carrozzeria: {
    label: "Carrozzeria",
    color: "#f97316", // status-warning
    icon: Car,
  },
  gomme: {
    label: "Gomme",
    color: "#eab308", // status-pending
    icon: CircleDot,
  },
};

function generateServiceData(): ServiceData[] {
  const data: ServiceData[] = [
    {
      name: "tagliando",
      value: 35,
      revenue: 15840,
      count: 45,
      color: serviceConfig.tagliando.color,
      icon: serviceConfig.tagliando.icon,
    },
    {
      name: "meccanica",
      value: 28,
      revenue: 12650,
      count: 32,
      color: serviceConfig.meccanica.color,
      icon: serviceConfig.meccanica.icon,
    },
    {
      name: "elettronica",
      value: 15,
      revenue: 6800,
      count: 18,
      color: serviceConfig.elettronica.color,
      icon: serviceConfig.elettronica.icon,
    },
    {
      name: "carrozzeria",
      value: 12,
      revenue: 5400,
      count: 12,
      color: serviceConfig.carrozzeria.color,
      icon: serviceConfig.carrozzeria.icon,
    },
    {
      name: "gomme",
      value: 10,
      revenue: 4590,
      count: 28,
      color: serviceConfig.gomme.color,
      icon: serviceConfig.gomme.icon,
    },
  ];
  return data;
}

// Active shape for hover effect
const renderActiveShape = (props: {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
  payload: ServiceData;
  percent: number;
  value: number;
}) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
  } = props;

  return (
    <g>
      <text
        x={cx}
        y={cy - 10}
        dy={8}
        textAnchor="middle"
        fill="#374151"
        className="text-sm font-semibold dark:fill-gray-200"
      >
        {serviceConfig[payload.name as keyof typeof serviceConfig]?.label || payload.name}
      </text>
      <text
        x={cx}
        y={cy + 15}
        dy={8}
        textAnchor="middle"
        fill="#6b7280"
        className="text-xs dark:fill-gray-400"
      >
        {formatCurrency(payload.revenue)}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 16}
        fill={fill}
      />
    </g>
  );
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ServiceData }>;
}) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const config = serviceConfig[data.name as keyof typeof serviceConfig];
    const Icon = config?.icon || Wrench;

    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-2 mb-2">
          <div className="rounded-lg p-1.5" style={{ backgroundColor: data.color + "20" }}>
            <Icon className="h-4 w-4" style={{ color: data.color }} />
          </div>
          <p className="font-medium text-gray-900 dark:text-white">{config?.label}</p>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-500 dark:text-gray-400">Fatturato</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(data.revenue)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-500 dark:text-gray-400">Ordini</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {data.count}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-500 dark:text-gray-400">ARO medio</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(data.revenue / data.count)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-500 dark:text-gray-400">Quota</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {data.value}%
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export function ServiceMixChart({ dateRange }: ServiceMixChartProps) {
  const [data] = useState(() => generateServiceData());
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"percent" | "revenue">("percent");

  const totalRevenue = useMemo(
    () => data.reduce((sum, d) => sum + d.revenue, 0),
    [data]
  );
  const totalOrders = useMemo(() => data.reduce((sum, d) => sum + d.count, 0), [data]);

  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };

  return (
    <div className="workshop-card">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Mix Servizi
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Distribuzione per tipo di intervento
          </p>
        </div>
        <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          <button
            onClick={() => setViewMode("percent")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              viewMode === "percent"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            )}
          >
            <Percent className="h-3.5 w-3.5" />
            %
          </button>
          <button
            onClick={() => setViewMode("revenue")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              viewMode === "revenue"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            )}
          >
            <DollarSign className="h-3.5 w-3.5" />
            €
          </button>
        </div>
      </div>

      {/* Total Summary */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-brand-50 p-4 dark:bg-brand-900/20">
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">Fatturato Totale</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-brand-700 dark:text-brand-300">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Wrench className="h-4 w-4" />
            <span className="text-sm font-medium">Ordini Totali</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {totalOrders}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pie Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape as ((props: unknown) => React.JSX.Element)}
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey={viewMode === "percent" ? "value" : "revenue"}
                onMouseEnter={onPieEnter}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke={"#fff"}
                    strokeWidth={2}
                    className="transition-all duration-200"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend / Detail List */}
        <div className="space-y-3">
          {data.map((item, index) => {
            const config = serviceConfig[item.name as keyof typeof serviceConfig];
            const Icon = config?.icon || Wrench;
            const isActive = activeIndex === index;

            return (
              <button
                key={item.name}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  "w-full rounded-lg p-3 text-left transition-all",
                  isActive
                    ? "bg-gray-100 shadow-sm dark:bg-gray-800"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="rounded-lg p-2"
                    style={{ backgroundColor: item.color + "15" }}
                  >
                    <Icon className="h-4 w-4" style={{ color: item.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {config?.label}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: item.color }}>
                        {item.value}%
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        {item.count} ordini
                      </span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {formatCurrency(item.revenue)}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${item.value}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Insights */}
      <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
        <div className="flex items-start gap-3">
          <TrendingUp className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">Analisi Mix Servizi</p>
            <p className="mt-1 text-blue-700 dark:text-blue-300">
              I tagliandi rappresentano il {data[0].value}% del fatturato con un
              ARO medio di {formatCurrency(data[0].revenue / data[0].count)}.
              Considera di promuovere servizi aggiuntivi durante i tagliandi per
              aumentare il valore medio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ServiceMixChart;
