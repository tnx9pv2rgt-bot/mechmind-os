'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Target,
  Calendar,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Star,
  Zap,
  DollarSign,
  Users,
  Clock
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'

interface Location {
  id: string
  name: string
  city: string
}

interface LocationMetrics {
  revenue: { today: number; week: number; month: number }
  carCount: { inService: number; waiting: number; ready: number }
  aro: number
  satisfaction: number
  utilization: number
  orders: number
  trend: 'up' | 'down' | 'neutral'
}

interface PerformanceMetricsProps {
  locations: Location[]
  metrics: Record<string, LocationMetrics>
}

// Mock data for charts
const revenueTrendData = [
  { month: 'Gen', 'Milano Centro': 52000, 'Roma Nord': 68000, 'Torino Est': 42000, 'Napoli Sud': 31000 },
  { month: 'Feb', 'Milano Centro': 55000, 'Roma Nord': 70000, 'Torino Est': 44000, 'Napoli Sud': 30000 },
  { month: 'Mar', 'Milano Centro': 58000, 'Roma Nord': 72000, 'Torino Est': 46000, 'Napoli Sud': 33000 },
  { month: 'Apr', 'Milano Centro': 54000, 'Roma Nord': 69000, 'Torino Est': 43000, 'Napoli Sud': 32000 },
  { month: 'Mag', 'Milano Centro': 60000, 'Roma Nord': 75000, 'Torino Est': 48000, 'Napoli Sud': 34000 },
  { month: 'Giu', 'Milano Centro': 58400, 'Roma Nord': 72300, 'Torino Est': 45600, 'Napoli Sud': 32400 },
]

const orderVolumeData = [
  { name: 'Milano Centro', orders: 142, fill: '#3b82f6' },
  { name: 'Roma Nord', orders: 198, fill: '#22c55e' },
  { name: 'Torino Est', orders: 115, fill: '#f97316' },
  { name: 'Napoli Sud', orders: 89, fill: 'var(--status-error)' },
]

const satisfactionData = [
  { name: 'Milano Centro', value: 4.7, fill: '#3b82f6' },
  { name: 'Roma Nord', value: 4.5, fill: '#22c55e' },
  { name: 'Torino Est', value: 4.8, fill: '#f97316' },
  { name: 'Napoli Sud', value: 4.3, fill: 'var(--status-error)' },
]

const efficiencyData = [
  { subject: 'Utilizzo', 'Milano Centro': 85, 'Roma Nord': 92, 'Torino Est': 78, 'Napoli Sud': 65, fullMark: 100 },
  { subject: 'Soddisfazione', 'Milano Centro': 94, 'Roma Nord': 90, 'Torino Est': 96, 'Napoli Sud': 86, fullMark: 100 },
  { subject: 'Efficienza', 'Milano Centro': 88, 'Roma Nord': 91, 'Torino Est': 82, 'Napoli Sud': 74, fullMark: 100 },
  { subject: 'Velocità', 'Milano Centro': 82, 'Roma Nord': 85, 'Torino Est': 80, 'Napoli Sud': 72, fullMark: 100 },
  { subject: 'Qualità', 'Milano Centro': 90, 'Roma Nord': 88, 'Torino Est': 92, 'Napoli Sud': 84, fullMark: 100 },
  { subject: 'Puntualità', 'Milano Centro': 87, 'Roma Nord': 89, 'Torino Est': 85, 'Napoli Sud': 78, fullMark: 100 },
]

const kpiCards = [
  {
    title: 'Fatturato Totale',
    value: 208700,
    change: '+12.5%',
    trend: 'up',
    icon: DollarSign,
    color: 'bg-[var(--status-success-subtle)] text-[var(--status-success)] dark:bg-[var(--status-success)]/40/30 dark:text-[var(--status-success)]'
  },
  {
    title: 'Ordini Totali',
    value: 544,
    change: '+8.3%',
    trend: 'up',
    icon: BarChart3,
    color: 'bg-[var(--status-info-subtle)] text-[var(--status-info)] dark:bg-[var(--status-info)]/40/30 dark:text-[var(--status-info)]'
  },
  {
    title: 'ARO Medio',
    value: 384,
    change: '-2.1%',
    trend: 'down',
    icon: Target,
    color: 'bg-[var(--status-warning)]/10 text-[var(--status-warning)] dark:bg-[var(--status-warning)]/40/30 dark:text-[var(--status-warning)]'
  },
  {
    title: 'Soddisfazione Media',
    value: 4.58,
    change: '+0.2',
    trend: 'up',
    icon: Star,
    color: 'bg-[var(--brand)]/10 text-[var(--brand)] dark:bg-[var(--brand)]/40/30 dark:text-[var(--brand)]'
  },
]

const COLORS = ['#3b82f6', '#22c55e', '#f97316', 'var(--status-error)']

export function PerformanceMetrics({ locations, metrics }: PerformanceMetricsProps) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [selectedMetric, setSelectedMetric] = useState<'all' | 'revenue' | 'orders' | 'satisfaction'>('all')

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi, index) => (
          <div key={index} className="workshop-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">{kpi.title}</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-1">
                  {kpi.title.includes('Fatturato') ? formatCurrency(kpi.value) : 
                   kpi.title.includes('Soddisfazione') ? kpi.value.toFixed(2) : 
                   kpi.value.toLocaleString('it-IT')}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {kpi.trend === 'up' ? (
                    <ArrowUpRight className="h-4 w-4 text-[var(--status-success)]" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-[var(--status-error)]" />
                  )}
                  <span className={cn(
                    'text-sm font-medium',
                    kpi.trend === 'up' ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'
                  )}>
                    {kpi.change}
                  </span>
                  <span className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">vs mese scorso</span>
                </div>
              </div>
              <div className={cn('h-12 w-12 rounded-lg flex items-center justify-center', kpi.color)}>
                <kpi.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-default)] p-1">
          {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize',
                timeRange === range
                  ? 'bg-brand-600 text-[var(--text-on-brand)]'
                  : 'text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)]'
              )}
            >
              {range === 'week' ? 'Settimana' : 
               range === 'month' ? 'Mese' : 
               range === 'quarter' ? 'Trimestre' : 'Anno'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filtri
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Esporta Report
          </Button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Trend Chart */}
        <div className="workshop-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[var(--brand)]" />
              Andamento Fatturato
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-[var(--status-info-subtle)]0" />
              <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Milano</span>
              <span className="w-3 h-3 rounded-full bg-[var(--status-success-subtle)]0 ml-2" />
              <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Roma</span>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9ca3af"
                  fontSize={12}
                  tickFormatter={(value) => `€${value / 1000}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Line type="monotone" dataKey="Milano Centro" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Roma Nord" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Torino Est" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Napoli Sud" stroke="var(--status-error)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Volume Chart */}
        <div className="workshop-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[var(--brand)]" />
              Volume Ordini per Sede
            </h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderVolumeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="#9ca3af"
                  fontSize={12}
                  width={100}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="orders" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Satisfaction Chart */}
        <div className="workshop-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
              <Star className="h-5 w-5 text-[var(--brand)]" />
              Soddisfazione Clienti
            </h3>
          </div>
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={satisfactionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {satisfactionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Efficiency Radar Chart */}
        <div className="workshop-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
              <Zap className="h-5 w-5 text-[var(--brand)]" />
              Analisi Efficienza
            </h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={efficiencyData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <Radar name="Milano Centro" dataKey="Milano Centro" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                <Radar name="Roma Nord" dataKey="Roma Nord" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} />
                <Radar name="Torino Est" dataKey="Torino Est" stroke="#f97316" fill="#f97316" fillOpacity={0.1} />
                <Legend />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Location Rankings */}
      <div className="workshop-card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[var(--brand)]" />
            Classifica Performance Sedi
          </h3>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Esporta
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] border-b border-[var(--border-default)] dark:border-[var(--border-default)]">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Pos.</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Sede</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Fatturato</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Ordini</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">ARO</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Utilizzo</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Rating</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)] dark:divide-gray-700">
              {locations
                .map(loc => ({
                  ...loc,
                  ...metrics[loc.id],
                  score: Math.round((metrics[loc.id].satisfaction * 20 + metrics[loc.id].utilization) / 2)
                }))
                .sort((a, b) => b.score - a.score)
                .map((loc, index) => (
                  <tr key={loc.id} className="hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)]/50">
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold',
                        index === 0 ? 'bg-[var(--status-warning-subtle)] text-[var(--status-warning)]' :
                        index === 1 ? 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]' :
                        index === 2 ? 'bg-[var(--status-warning)]/10 text-[var(--status-warning)]' :
                        'text-[var(--text-secondary)]'
                      )}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{loc.name}</p>
                        <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">{loc.city}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                      {formatCurrency(loc.revenue.month)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">{loc.orders}</td>
                    <td className="px-4 py-3 text-right text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">{formatCurrency(loc.aro)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        'font-medium',
                        loc.utilization >= 80 ? 'text-[var(--status-success)]' :
                        loc.utilization >= 60 ? 'text-[var(--status-warning)]' : 'text-[var(--status-error)]'
                      )}>
                        {loc.utilization}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Star className="h-4 w-4 text-[var(--status-warning)] fill-yellow-500" />
                        <span className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{loc.satisfaction}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'inline-flex items-center justify-center w-12 h-8 rounded-lg text-sm font-bold',
                        loc.score >= 85 ? 'bg-[var(--status-success-subtle)] text-[var(--status-success)]' :
                        loc.score >= 70 ? 'bg-[var(--status-info-subtle)] text-[var(--status-info)]' :
                        loc.score >= 60 ? 'bg-[var(--status-warning-subtle)] text-[var(--status-warning)]' :
                        'bg-[var(--status-error-subtle)] text-[var(--status-error)]'
                      )}>
                        {loc.score}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
