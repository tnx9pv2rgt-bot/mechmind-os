'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Wifi, 
  WifiOff,
  RefreshCw,
  Gauge,
  Thermometer,
  Zap,
  Disc,
  Wind,
  TrendingUp,
  TrendingDown,
  Minus,
  Car,
  Brain
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { cn } from '@/lib/utils'
import type { VehicleHealthScore, OBDDataPoint, PredictiveAlert, OBDConnectionStatus } from '@/types/obd'

interface HealthDashboardProps {
  vehicleId: string
  connectionStatus: OBDConnectionStatus
  healthScore: VehicleHealthScore
  liveData: OBDDataPoint[]
  alerts: PredictiveAlert[]
  historicalData?: { timestamp: Date; score: number }[]
  onConnect: () => void
  onDisconnect: () => void
  onRefresh: () => void
}

export function HealthDashboard({
  vehicleId,
  connectionStatus,
  healthScore,
  liveData,
  alerts,
  historicalData = [],
  onConnect,
  onDisconnect,
  onRefresh
}: HealthDashboardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-600'
    if (score >= 60) return 'bg-yellow-600'
    if (score >= 40) return 'bg-orange-600'
    return 'bg-red-600'
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-5 w-5 text-green-600" />
      case 'degrading': return <TrendingDown className="h-5 w-5 text-red-600" />
      default: return <Minus className="h-5 w-5 text-gray-400" />
    }
  }

  const getLiveValue = (pidCode: string) => {
    return liveData.find(d => d.pid === pidCode)?.value
  }

  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high')

  return (
    <div className="space-y-6">
      {/* Connection Status Bar */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-3 h-3 rounded-full animate-pulse",
            connectionStatus === 'connected' ? "bg-green-500" :
            connectionStatus === 'connecting' ? "bg-yellow-500" :
            "bg-red-500"
          )} />
          <span className="font-medium">
            {connectionStatus === 'connected' ? 'OBD-II Connesso' :
             connectionStatus === 'connecting' ? 'Connessione in corso...' :
             'OBD-II Disconnesso'}
          </span>
          {connectionStatus === 'connected' && (
            <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
              <Wifi className="h-3 w-3 mr-1" />
              Live
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {connectionStatus === 'connected' ? (
            <>
              <Button size="sm" variant="outline" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Aggiorna
              </Button>
              <Button size="sm" variant="outline" onClick={onDisconnect}>
                <WifiOff className="h-4 w-4 mr-2" />
                Disconnetti
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={onConnect}>
              <Wifi className="h-4 w-4 mr-2" />
              Connetti OBD
            </Button>
          )}
        </div>
      </div>

      {/* Main Health Score */}
      <div className="grid grid-cols-12 gap-6">
        {/* Overall Score */}
        <Card className="col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Health Score Generale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-6">
              <div className="relative">
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${(healthScore.overall / 100) * 440} 440`}
                    className={cn("transition-all duration-1000", getScoreColor(healthScore.overall))}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn("text-4xl font-bold", getScoreColor(healthScore.overall))}>
                    {healthScore.overall}
                  </span>
                  <span className="text-sm text-gray-500">/ 100</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2">
              {getTrendIcon(healthScore.trend)}
              <span className="text-sm text-gray-600">
                {healthScore.trend === 'improving' ? 'In miglioramento' :
                 healthScore.trend === 'degrading' ? 'In peggioramento' : 'Stabile'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Component Scores */}
        <Card className="col-span-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Punteggi per Componente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'engine', label: 'Motore', icon: Gauge, value: healthScore.engine },
                { key: 'transmission', label: 'Trasmissione', icon: Car, value: healthScore.transmission },
                { key: 'electrical', label: 'Elettrico', icon: Zap, value: healthScore.electrical },
                { key: 'brakes', label: 'Freni', icon: Disc, value: healthScore.brakes },
                { key: 'cooling', label: 'Raffreddamento', icon: Thermometer, value: healthScore.cooling },
                { key: 'exhaust', label: 'Scarico', icon: Wind, value: healthScore.exhaust },
              ].map(({ key, label, icon: Icon, value }) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{label}</span>
                    </div>
                    <span className={cn("text-sm font-medium", getScoreColor(value))}>
                      {value}
                    </span>
                  </div>
                  <Progress value={value} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Data & Alerts */}
      <Tabs defaultValue="live" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="live">Dati Live</TabsTrigger>
          <TabsTrigger value="alerts">
            Alert Predittivi
            {criticalAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">{criticalAlerts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="trend">Andamento</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-4">
          <div className="grid grid-cols-4 gap-4">
            {[
              { pid: '010C', label: 'RPM Motore', icon: Gauge, color: 'text-blue-600' },
              { pid: '010D', label: 'Velocità', icon: Car, color: 'text-green-600' },
              { pid: '0105', label: 'Temp. Refrigerante', icon: Thermometer, color: 'text-orange-600' },
              { pid: '0111', label: 'Farfalla', icon: Activity, color: 'text-purple-600' },
              { pid: '0104', label: 'Carico Motore', icon: Activity, color: 'text-red-600' },
              { pid: '0110', label: 'Flusso Aria', icon: Wind, color: 'text-cyan-600' },
              { pid: '0142', label: 'Voltaggio', icon: Zap, color: 'text-yellow-600' },
              { pid: '012F', label: 'Carburante', icon: Gauge, color: 'text-indigo-600' },
            ].map(({ pid, label, icon: Icon, color }) => {
              const value = getLiveValue(pid)
              return (
                <Card key={pid}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Icon className={cn("h-5 w-5", color)} />
                      {connectionStatus === 'connected' && value !== undefined ? (
                        <span className="text-2xl font-bold">{Math.round(value)}</span>
                      ) : (
                        <span className="text-2xl font-bold text-gray-300">--</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">{label}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-green-800">Nessun Problema Previsto</h3>
                  <p className="text-green-600 mt-2">
                    I modelli ML non hanno rilevato anomalie nei dati OBD
                  </p>
                </CardContent>
              </Card>
            ) : (
              alerts.map(alert => (
                <Card 
                  key={alert.id} 
                  className={cn(
                    "border-l-4",
                    alert.severity === 'critical' ? "border-l-red-500 bg-red-50" :
                    alert.severity === 'high' ? "border-l-orange-500 bg-orange-50" :
                    alert.severity === 'medium' ? "border-l-yellow-500 bg-yellow-50" :
                    "border-l-blue-500 bg-blue-50"
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Brain className="h-5 w-5 text-purple-600" />
                        <CardTitle className="text-lg">{alert.component}</CardTitle>
                        <Badge variant={
                          alert.severity === 'critical' ? 'destructive' :
                          alert.severity === 'high' ? 'default' :
                          'secondary'
                        }>
                          {alert.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-500">
                        Confidenza: {Math.round(alert.confidence * 100)}%
                      </span>
                    </div>
                    <CardDescription>{alert.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Probabilità guasto:</span>
                        <p className="font-medium">{Math.round(alert.probability * 100)}%</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Stima costo:</span>
                        <p className="font-medium">€{alert.estimatedRepairCost.min} - €{alert.estimatedRepairCost.max}</p>
                      </div>
                      {alert.predictedFailureMileage && (
                        <div>
                          <span className="text-gray-500">Previsto tra:</span>
                          <p className="font-medium">{alert.predictedFailureMileage.toLocaleString()} km</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 p-3 bg-white rounded border">
                      <span className="text-sm font-medium">Azione consigliata:</span>
                      <p className="text-sm text-gray-600 mt-1">{alert.recommendedAction}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="trend" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Andamento Health Score (30 giorni)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData.length > 0 ? historicalData : [
                    { timestamp: new Date(Date.now() - 30 * 86400000), score: 85 },
                    { timestamp: new Date(Date.now() - 20 * 86400000), score: 82 },
                    { timestamp: new Date(Date.now() - 10 * 86400000), score: 78 },
                    { timestamp: new Date(), score: healthScore.overall },
                  ].map(d => ({ ...d, date: d.timestamp.toLocaleDateString('it-IT') }))}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(val) => new Date(val).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      formatter={(val: number) => [`Score: ${val}`, 'Health']}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('it-IT')}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#3b82f6" 
                      fillOpacity={1} 
                      fill="url(#colorScore)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
