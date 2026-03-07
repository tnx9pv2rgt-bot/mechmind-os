'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  CreditCard,
  Wallet,
  Receipt,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  Smartphone,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// Types
export interface RevenueData {
  date: string
  revenue: number
  expenses: number
  profit: number
}

export interface PaymentMethodData {
  name: string
  value: number
  count: number
}

export interface OutstandingReceivable {
  customerName: string
  amount: number
  daysOverdue: number
  invoiceNumber: string
}

export interface TaxSummary {
  period: string
  taxableAmount: number
  vatAmount: number
  vatRate: number
}

export interface FinancialMetrics {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  profitMargin: number
  averagePaymentTime: number
  outstandingReceivables: number
  outstandingCount: number
}

// Mock data - Revenue
const mockRevenueData: RevenueData[] = [
  { date: '2024-01', revenue: 15400, expenses: 8200, profit: 7200 },
  { date: '2024-02', revenue: 18200, expenses: 9100, profit: 9100 },
  { date: '2024-03', revenue: 22100, expenses: 10500, profit: 11600 },
  { date: '2024-04', revenue: 19800, expenses: 9800, profit: 10000 },
  { date: '2024-05', revenue: 24500, expenses: 11200, profit: 13300 },
  { date: '2024-06', revenue: 26800, expenses: 12100, profit: 14700 },
]

// Mock data - Weekly
const mockWeeklyData: RevenueData[] = [
  { date: 'Lun', revenue: 3200, expenses: 1500, profit: 1700 },
  { date: 'Mar', revenue: 4100, expenses: 1800, profit: 2300 },
  { date: 'Mer', revenue: 3800, expenses: 1600, profit: 2200 },
  { date: 'Gio', revenue: 4500, expenses: 2100, profit: 2400 },
  { date: 'Ven', revenue: 5200, expenses: 2300, profit: 2900 },
  { date: 'Sab', revenue: 2800, expenses: 1200, profit: 1600 },
]

// Mock data - Daily
const mockDailyData: RevenueData[] = [
  { date: '08:00', revenue: 0, expenses: 0, profit: 0 },
  { date: '10:00', revenue: 450, expenses: 0, profit: 450 },
  { date: '12:00', revenue: 1200, expenses: 0, profit: 1200 },
  { date: '14:00', revenue: 2100, expenses: 0, profit: 2100 },
  { date: '16:00', revenue: 3200, expenses: 0, profit: 3200 },
  { date: '18:00', revenue: 4500, expenses: 0, profit: 4500 },
]

// Mock data - Payment methods
const mockPaymentMethods: PaymentMethodData[] = [
  { name: 'Carta di credito', value: 12850, count: 45 },
  { name: 'Bonifico', value: 18500, count: 32 },
  { name: 'Contanti', value: 4200, count: 28 },
  { name: 'POS', value: 9800, count: 22 },
  { name: 'Satispay', value: 1500, count: 8 },
]

// Mock data - Outstanding receivables
const mockOutstandingReceivables: OutstandingReceivable[] = [
  { customerName: 'Giuseppe Verdi', amount: 1250, daysOverdue: 15, invoiceNumber: 'INV-2024-003' },
  { customerName: 'Ferrari Auto Srl', amount: 3200, daysOverdue: 5, invoiceNumber: 'INV-2024-008' },
  { customerName: 'Rossi Trasporti', amount: 890, daysOverdue: 22, invoiceNumber: 'INV-2024-012' },
  { customerName: 'Bianchi Service', amount: 2100, daysOverdue: 8, invoiceNumber: 'INV-2024-015' },
]

// Mock data - Tax summary
const mockTaxSummary: TaxSummary[] = [
  { period: 'Gennaio 2024', taxableAmount: 12622, vatAmount: 2778, vatRate: 22 },
  { period: 'Febbraio 2024', taxableAmount: 14918, vatAmount: 3282, vatRate: 22 },
  { period: 'Marzo 2024', taxableAmount: 18115, vatAmount: 3985, vatRate: 22 },
]

// Mock metrics
const mockMetrics: FinancialMetrics = {
  totalRevenue: 126800,
  totalExpenses: 60900,
  netProfit: 65900,
  profitMargin: 52,
  averagePaymentTime: 8.5,
  outstandingReceivables: 7440,
  outstandingCount: 4,
}

// Colors
const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

// Stat Card Component
function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  description,
}: {
  title: string
  value: string
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon: React.ElementType
  description?: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            {change && (
              <div className={`mt-2 flex items-center gap-1 text-sm ${
                changeType === 'positive' ? 'text-green-600 dark:text-green-400' :
                changeType === 'negative' ? 'text-red-600 dark:text-red-400' :
                'text-gray-600 dark:text-gray-400'
              }`}>
                {changeType === 'positive' ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : changeType === 'negative' ? (
                  <ArrowDownRight className="h-4 w-4" />
                ) : null}
                {change}
              </div>
            )}
            {description && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
            )}
          </div>
          <div className="rounded-lg bg-brand-100 p-3 dark:bg-brand-900/30">
            <Icon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Chart Tooltip Component
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

// Pie Chart Tooltip
function PieTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <p className="font-medium text-gray-900 dark:text-white">{data.name}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {formatCurrency(data.value)} ({data.count} transazioni)
        </p>
      </div>
    )
  }
  return null
}

export function FinancialDashboard() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly')
  const [chartType, setChartType] = useState<'revenue' | 'profit'>('revenue')

  const currentData = useMemo(() => {
    switch (period) {
      case 'daily':
        return mockDailyData
      case 'weekly':
        return mockWeeklyData
      case 'monthly':
      default:
        return mockRevenueData
    }
  }, [period])

  const totalOutstanding = mockOutstandingReceivables.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Dashboard Finanziario
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Panoramica dei ricavi, pagamenti e performance
          </p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
          <SelectTrigger className="w-40">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Oggi</SelectItem>
            <SelectItem value="weekly">Questa settimana</SelectItem>
            <SelectItem value="monthly">Questo mese</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ricavi Totali"
          value={formatCurrency(mockMetrics.totalRevenue)}
          change="+12.5%"
          changeType="positive"
          icon={TrendingUp}
          description="vs periodo precedente"
        />
        <StatCard
          title="Profitto Netto"
          value={formatCurrency(mockMetrics.netProfit)}
          change={`${mockMetrics.profitMargin}% margine`}
          changeType="positive"
          icon={DollarSign}
        />
        <StatCard
          title="Tempo Medio Pagamento"
          value={`${mockMetrics.averagePaymentTime} giorni`}
          change="-1.2 giorni"
          changeType="positive"
          icon={Clock}
          description="Più veloce del previsto"
        />
        <StatCard
          title="Crediti da Incassare"
          value={formatCurrency(totalOutstanding)}
          count={mockOutstandingReceivables.length}
          icon={AlertCircle}
          changeType="negative"
          description={`${mockOutstandingReceivables.length} fatture scadute`}
        />
      </div>

      {/* Main Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Andamento Ricavi
                </CardTitle>
                <CardDescription>
                  Confronto ricavi, spese e profitto nel tempo
                </CardDescription>
              </div>
              <Tabs value={chartType} onValueChange={(v) => setChartType(v as any)}>
                <TabsList>
                  <TabsTrigger value="revenue">Ricavi</TabsTrigger>
                  <TabsTrigger value="profit">Profitto</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'revenue' ? (
                  <AreaChart data={currentData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                      tickFormatter={(value) => `€${value / 1000}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Ricavi"
                      stroke="#0ea5e9"
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      name="Spese"
                      stroke="#ef4444"
                      fillOpacity={1}
                      fill="url(#colorExpenses)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={currentData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                      tickFormatter={(value) => `€${value / 1000}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="profit" name="Profitto" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Metodi di Pagamento
            </CardTitle>
            <CardDescription>
              Distribuzione per metodo di pagamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockPaymentMethods}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {mockPaymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {mockPaymentMethods.map((method, index) => (
                <div key={method.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-gray-600 dark:text-gray-400">{method.name}</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(method.value)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Outstanding Receivables */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Crediti da Incassare
                </CardTitle>
                <CardDescription>
                  Fatture scadute e in attesa di pagamento
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(totalOutstanding)}
                </p>
                <p className="text-xs text-gray-500">{mockOutstandingReceivables.length} fatture</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockOutstandingReceivables.map((item) => (
                <div
                  key={item.invoiceNumber}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.customerName}
                    </p>
                    <p className="text-xs text-gray-500">{item.invoiceNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(item.amount)}
                    </p>
                    <p className={`text-xs ${
                      item.daysOverdue > 14 
                        ? 'text-red-600 dark:text-red-400' 
                        : item.daysOverdue > 7 
                          ? 'text-orange-600 dark:text-orange-400' 
                          : 'text-yellow-600 dark:text-yellow-400'
                    }`}>
                      {item.daysOverdue} giorni scaduti
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="mt-4 w-full">
              <FileText className="mr-2 h-4 w-4" />
              Vedi tutti i crediti
            </Button>
          </CardContent>
        </Card>

        {/* Tax Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Riepilogo IVA
            </CardTitle>
            <CardDescription>
              Dettaglio IVA per periodo fiscale
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockTaxSummary.map((tax) => (
                <div
                  key={tax.period}
                  className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {tax.period}
                    </span>
                    <span className="text-sm text-gray-500">{tax.vatRate}% IVA</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Imponibile</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(tax.taxableAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">IVA</p>
                      <p className="font-medium text-brand-600">
                        {formatCurrency(tax.vatAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 dark:text-white">Totale IVA dovuta</span>
                <span className="text-lg font-bold text-brand-600">
                  {formatCurrency(mockTaxSummary.reduce((sum, t) => sum + t.vatAmount, 0))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
