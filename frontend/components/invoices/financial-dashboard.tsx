'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
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
  BarChart3,
  RefreshCw,
  Loader2,
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

interface FinancialApiResponse {
  metrics?: FinancialMetrics
  revenueData?: RevenueData[]
  paymentMethods?: PaymentMethodData[]
  outstandingReceivables?: OutstandingReceivable[]
  taxSummary?: TaxSummary[]
  data?: FinancialApiResponse
}

// Colors
const COLORS = ['#0ea5e9', 'var(--status-success)', 'var(--status-warning)', 'var(--status-error)', 'var(--brand)']

async function financialFetcher(url: string): Promise<FinancialApiResponse> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Errore ${res.status}`)
  const json: FinancialApiResponse = await res.json()
  return json.data ?? json
}

// Stat Card Component
function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  description,
  isLoading,
}: {
  title: string
  value: string
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon: React.ElementType
  description?: string
  isLoading?: boolean
}): React.ReactElement {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">{title}</p>
            {isLoading ? (
              <div className="mt-2 h-8 w-24 animate-pulse rounded bg-[var(--border-default)] dark:bg-[var(--border-default)]" />
            ) : (
              <p className="mt-2 text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{value}</p>
            )}
            {!isLoading && change && (
              <div className={`mt-2 flex items-center gap-1 text-sm ${
                changeType === 'positive' ? 'text-[var(--status-success)] dark:text-[var(--status-success)]' :
                changeType === 'negative' ? 'text-[var(--status-error)] dark:text-[var(--status-error)]' :
                'text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'
              }`}>
                {changeType === 'positive' ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : changeType === 'negative' ? (
                  <ArrowDownRight className="h-4 w-4" />
                ) : null}
                {change}
              </div>
            )}
            {!isLoading && description && (
              <p className="mt-1 text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">{description}</p>
            )}
          </div>
          <div className="rounded-lg bg-[var(--brand)]/10 p-3 dark:bg-[var(--brand)]/40/30">
            <Icon className="h-5 w-5 text-[var(--brand)] dark:text-brand-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Chart Tooltip Component
interface ChartTooltipEntry {
  name: string
  value: number
  color: string
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: ChartTooltipEntry[]; label?: string }): React.ReactElement | null {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] p-3 shadow-lg dark:border-[var(--border-default)] dark:bg-[var(--surface-primary)]">
        <p className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{label}</p>
        {payload.map((entry: ChartTooltipEntry, index: number) => (
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
function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: PaymentMethodData }> }): React.ReactElement | null {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] p-3 shadow-lg dark:border-[var(--border-default)] dark:bg-[var(--surface-primary)]">
        <p className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{data.name}</p>
        <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
          {formatCurrency(data.value)} ({data.count} transazioni)
        </p>
      </div>
    )
  }
  return null
}

function EmptyChart({ message }: { message: string }): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <BarChart3 className="h-12 w-12 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-4" />
      <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">{message}</p>
    </div>
  )
}

export function FinancialDashboard(): React.ReactElement {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly')
  const [chartType, setChartType] = useState<'revenue' | 'profit'>('revenue')

  const { data: apiData, error, isLoading, mutate } = useSWR<FinancialApiResponse>(
    `/api/analytics/financial?period=${period}`,
    financialFetcher,
    { revalidateOnFocus: false }
  )

  const metrics = apiData?.metrics ?? null
  const revenueData = apiData?.revenueData ?? []
  const paymentMethods = apiData?.paymentMethods ?? []
  const outstandingReceivables = apiData?.outstandingReceivables ?? []
  const taxSummary = apiData?.taxSummary ?? []

  const totalOutstanding = outstandingReceivables.reduce((sum, item) => sum + item.amount, 0)

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-[var(--status-error)]/30 dark:border-[var(--status-error)]">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-[var(--status-error)] mb-4" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-2">
              Errore nel caricamento dei dati finanziari
            </h3>
            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)] mb-4">
              Impossibile comunicare con il server. Verifica la connessione e riprova.
            </p>
            <Button variant="outline" onClick={() => mutate()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Riprova
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            Dashboard Finanziario
          </h2>
          <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Panoramica dei ricavi, pagamenti e performance
          </p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as 'daily' | 'weekly' | 'monthly')}>
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
          value={metrics ? formatCurrency(metrics.totalRevenue) : '--'}
          changeType={metrics ? 'positive' : 'neutral'}
          icon={TrendingUp}
          description="vs periodo precedente"
          isLoading={isLoading}
        />
        <StatCard
          title="Profitto Netto"
          value={metrics ? formatCurrency(metrics.netProfit) : '--'}
          change={metrics ? `${metrics.profitMargin}% margine` : undefined}
          changeType={metrics ? 'positive' : 'neutral'}
          icon={DollarSign}
          isLoading={isLoading}
        />
        <StatCard
          title="Tempo Medio Pagamento"
          value={metrics ? `${metrics.averagePaymentTime} giorni` : '--'}
          icon={Clock}
          isLoading={isLoading}
        />
        <StatCard
          title="Crediti da Incassare"
          value={metrics ? formatCurrency(totalOutstanding) : '--'}
          icon={AlertCircle}
          changeType={totalOutstanding > 0 ? 'negative' : 'neutral'}
          description={outstandingReceivables.length > 0 ? `${outstandingReceivables.length} fatture scadute` : undefined}
          isLoading={isLoading}
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
              <Tabs value={chartType} onValueChange={(v) => setChartType(v as 'revenue' | 'profit')}>
                <TabsList>
                  <TabsTrigger value="revenue">Ricavi</TabsTrigger>
                  <TabsTrigger value="profit">Profitto</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
              </div>
            ) : revenueData.length === 0 ? (
              <EmptyChart message="Dati non ancora disponibili per il periodo selezionato" />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'revenue' ? (
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--status-error)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--status-error)" stopOpacity={0}/>
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
                        tickFormatter={(value) => `\u20AC${value / 1000}k`}
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
                        stroke="var(--status-error)"
                        fillOpacity={1}
                        fill="url(#colorExpenses)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        stroke="#9ca3af"
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="#9ca3af"
                        tickFormatter={(value) => `\u20AC${value / 1000}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="profit" name="Profitto" fill="var(--status-success)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
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
            {isLoading ? (
              <div className="h-[200px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
              </div>
            ) : paymentMethods.length === 0 ? (
              <EmptyChart message="Dati non ancora disponibili" />
            ) : (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethods}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {paymentMethods.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {paymentMethods.map((method, index) => (
                    <div key={method.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">{method.name}</span>
                      </div>
                      <span className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                        {formatCurrency(method.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
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
              {!isLoading && outstandingReceivables.length > 0 && (
                <div className="text-right">
                  <p className="text-lg font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    {formatCurrency(totalOutstanding)}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">{outstandingReceivables.length} fatture</p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-[var(--border-default)] dark:bg-[var(--border-default)]" />
                ))}
              </div>
            ) : outstandingReceivables.length === 0 ? (
              <EmptyChart message="Nessun credito da incassare" />
            ) : (
              <div className="space-y-3">
                {outstandingReceivables.map((item) => (
                  <div
                    key={item.invoiceNumber}
                    className="flex items-center justify-between rounded-lg border border-[var(--border-default)] p-3 dark:border-[var(--border-default)]"
                  >
                    <div>
                      <p className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                        {item.customerName}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">{item.invoiceNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                        {formatCurrency(item.amount)}
                      </p>
                      <p className={`text-xs ${
                        item.daysOverdue > 14
                          ? 'text-[var(--status-error)] dark:text-[var(--status-error)]'
                          : item.daysOverdue > 7
                            ? 'text-[var(--status-warning)] dark:text-[var(--status-warning)]'
                            : 'text-[var(--status-warning)] dark:text-[var(--status-warning)]'
                      }`}>
                        {item.daysOverdue} giorni scaduti
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-lg bg-[var(--border-default)] dark:bg-[var(--border-default)]" />
                ))}
              </div>
            ) : taxSummary.length === 0 ? (
              <EmptyChart message="Dati IVA non ancora disponibili" />
            ) : (
              <>
                <div className="space-y-4">
                  {taxSummary.map((tax) => (
                    <div
                      key={tax.period}
                      className="rounded-lg border border-[var(--border-default)] p-4 dark:border-[var(--border-default)]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                          {tax.period}
                        </span>
                        <span className="text-sm text-[var(--text-tertiary)]">{tax.vatRate}% IVA</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-[var(--text-tertiary)]">Imponibile</p>
                          <p className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                            {formatCurrency(tax.taxableAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--text-tertiary)]">IVA</p>
                          <p className="font-medium text-[var(--brand)]">
                            {formatCurrency(tax.vatAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg bg-[var(--surface-secondary)] p-4 dark:bg-[var(--surface-primary)]">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Totale IVA dovuta</span>
                    <span className="text-lg font-bold text-[var(--brand)]">
                      {formatCurrency(taxSummary.reduce((sum, t) => sum + t.vatAmount, 0))}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
