'use client';

/**
 * Form Analytics Dashboard
 * 
 * Dashboard in tempo reale per monitorare performance del form
 */

import React, { useEffect, useState, useCallback } from 'react';
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
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useFunnelMetrics } from '../../hooks/useFormFunnel';
import { heatmapTracker } from '../../lib/analytics/heatmap';
import { abTesting } from '../../lib/analytics/abTesting';
import { errorTracker } from '../../lib/analytics/errorTracking';

// Tipi
interface RealTimeMetrics {
  activeUsers: number;
  todayConversions: number;
  todayStarts: number;
  conversionRate: number;
  avgCompletionTime: number;
  topDropOffStep: { step: number; rate: number } | null;
  commonErrors: Array<{ field: string; count: number }>;
  stepStats: Array<{
    step: number;
    visitors: number;
    completions: number;
    avgTime: number;
  }>;
  hourlyData: Array<{
    hour: string;
    starts: number;
    completions: number;
  }>;
}

interface ABTestResult {
  experimentId: string;
  name: string;
  variantResults: Array<{
    variant: string;
    visitors: number;
    conversions: number;
    conversionRate: number;
  }>;
}

// Colori per i grafici
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
const ERROR_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

export function FormAnalyticsDashboard({ formId = 'default-form' }: { formId?: string }) {
  const { metrics: historicalMetrics } = useFunnelMetrics(formId);
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [abTests, setAbTests] = useState<ABTestResult[]>([]);
  const [heatmapData, setHeatmapData] = useState<{ points: any[]; fieldData: any[] } | null>(null);
  const [selectedView, setSelectedView] = useState<'overview' | 'funnel' | 'heatmap' | 'abtests' | 'errors'>('overview');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Aggiorna metriche in tempo reale
  const updateMetrics = useCallback(() => {
    // Simulazione dati real-time (in produzione verrebbero da WebSocket/API)
    const mockActiveUsers = Math.floor(Math.random() * 50) + 10;
    const todayStarts = historicalMetrics.totalSessions + mockActiveUsers;
    const todayCompletions = historicalMetrics.completedSessions + Math.floor(mockActiveUsers * 0.3);
    
    // Genera dati orari
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      starts: Math.floor(Math.random() * 100) + 20,
      completions: Math.floor(Math.random() * 30) + 5,
    }));

    // Genera stat step
    const stepStats = [
      { step: 0, visitors: todayStarts, completions: Math.floor(todayStarts * 0.85), avgTime: 45000 },
      { step: 1, visitors: Math.floor(todayStarts * 0.85), completions: Math.floor(todayStarts * 0.70), avgTime: 60000 },
      { step: 2, visitors: Math.floor(todayStarts * 0.70), completions: Math.floor(todayStarts * 0.55), avgTime: 45000 },
      { step: 3, visitors: Math.floor(todayStarts * 0.55), completions: todayCompletions, avgTime: 30000 },
    ];

    // Trova step con più abbandoni
    let maxDropOff = 0;
    let topDropOffStep = null;
    
    for (let i = 0; i < stepStats.length - 1; i++) {
      const dropOff = ((stepStats[i].visitors - stepStats[i + 1].visitors) / stepStats[i].visitors) * 100;
      if (dropOff > maxDropOff) {
        maxDropOff = dropOff;
        topDropOffStep = { step: i, rate: dropOff };
      }
    }

    setRealTimeMetrics({
      activeUsers: mockActiveUsers,
      todayConversions: todayCompletions,
      todayStarts: todayStarts,
      conversionRate: todayStarts > 0 ? (todayCompletions / todayStarts) * 100 : 0,
      avgCompletionTime: historicalMetrics.avgCompletionTime / 1000,
      topDropOffStep,
      commonErrors: [
        { field: 'email', count: 45 },
        { field: 'vatNumber', count: 32 },
        { field: 'password', count: 28 },
        { field: 'phone', count: 15 },
      ],
      stepStats,
      hourlyData,
    });

    setLastUpdate(new Date());
  }, [historicalMetrics]);

  // Carica dati A/B testing
  const loadABTests = useCallback(() => {
    const experiments = abTesting.getActiveExperiments();
    const results: ABTestResult[] = experiments.map((exp) => ({
      experimentId: exp.id,
      name: exp.name,
      variantResults: abTesting.calculateResults(exp.id)?.variantResults.map(v => ({
        variant: v.variant,
        visitors: v.visitors,
        conversions: v.conversions,
        conversionRate: v.conversionRate,
      })) || exp.variants.map(v => ({
        variant: v.id,
        visitors: 0,
        conversions: 0,
        conversionRate: 0,
      })),
    }));
    setAbTests(results);
  }, []);

  // Carica heatmap data
  const loadHeatmapData = useCallback(() => {
    const data = heatmapTracker.getHeatmapData();
    const fieldData = heatmapTracker.getFieldAnalytics();
    
    setHeatmapData({
      points: data.points.slice(-100),
      fieldData,
    });
  }, []);

  // Effetti
  useEffect(() => {
    updateMetrics();
    loadABTests();
    loadHeatmapData();

    // Aggiorna ogni 10 secondi
    const interval = setInterval(() => {
      updateMetrics();
      loadABTests();
      loadHeatmapData();
    }, 10000);

    return () => clearInterval(interval);
  }, [updateMetrics, loadABTests, loadHeatmapData]);

  // Render componenti
  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Active Users */}
      <MetricCard
        title="Utenti Attivi"
        value={realTimeMetrics?.activeUsers || 0}
        subtitle="Sul form ora"
        trend="+12%"
        trendUp={true}
        color="blue"
      />

      {/* Conversion Rate */}
      <MetricCard
        title="Conversion Rate"
        value={`${(realTimeMetrics?.conversionRate || 0).toFixed(1)}%`}
        subtitle="Oggi"
        trend="-2%"
        trendUp={false}
        color="green"
      />

      {/* Avg Completion Time */}
      <MetricCard
        title="Tempo Medio"
        value={`${(realTimeMetrics?.avgCompletionTime || 0).toFixed(0)}s`}
        subtitle="Per completamento"
        trend="-5s"
        trendUp={true}
        color="purple"
      />

      {/* Top Drop-off */}
      <MetricCard
        title="Abbandono Maggiore"
        value={`Step ${realTimeMetrics?.topDropOffStep?.step || 0}`}
        subtitle={`${(realTimeMetrics?.topDropOffStep?.rate || 0).toFixed(1)}% abbandono`}
        trend="Attenzione"
        trendUp={false}
        color="red"
      />

      {/* Grafico Orario */}
      <div className="col-span-full lg:col-span-2 bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">Attività Oraria</h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={realTimeMetrics?.hourlyData || []}>
            <defs>
              <linearGradient id="colorStarts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorCompletions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="starts" stroke="#8884d8" fillOpacity={1} fill="url(#colorStarts)" />
            <Area type="monotone" dataKey="completions" stroke="#82ca9d" fillOpacity={1} fill="url(#colorCompletions)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Device Breakdown */}
      <div className="col-span-full lg:col-span-2 bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">Dispositivi</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={Object.entries(historicalMetrics.deviceBreakdown).map(([name, value]) => ({ name, value }))}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {Object.entries(historicalMetrics.deviceBreakdown).map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderFunnel = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">Funnel di Conversione</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={realTimeMetrics?.stepStats || []} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="step" type="category" tickFormatter={(value) => `Step ${value}`} />
            <Tooltip />
            <Legend />
            <Bar dataKey="visitors" fill="#8884d8" name="Visitatori" />
            <Bar dataKey="completions" fill="#82ca9d" name="Completamenti" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Step Metrics */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">Metriche per Step</h3>
          <div className="space-y-3">
            {realTimeMetrics?.stepStats.map((step) => (
              <div key={step.step} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">Step {step.step}</span>
                  <p className="text-sm text-gray-500">
                    {(step.avgTime / 1000).toFixed(1)}s avg
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-semibold">
                    {((step.completions / step.visitors) * 100).toFixed(1)}%
                  </span>
                  <p className="text-sm text-gray-500">completamento</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Entry Points */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">Fonti di Traffico</h3>
          <div className="space-y-3">
            {Object.entries(historicalMetrics.entryPointBreakdown)
              .sort(([,a], [,b]) => b - a)
              .map(([source, count]) => (
                <div key={source} className="flex items-center justify-between">
                  <span className="capitalize">{source}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 rounded-full h-2"
                        style={{
                          width: `${(count / historicalMetrics.totalSessions) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderHeatmap = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">Heatmap Interazioni</h3>
        <div className="relative h-64 bg-gray-100 rounded overflow-hidden">
          {heatmapData?.points.map((point, index) => (
            <div
              key={index}
              className="absolute w-3 h-3 rounded-full opacity-50"
              style={{
                left: `${(point.x / window.innerWidth) * 100}%`,
                top: `${(point.y / window.innerHeight) * 100}%`,
                backgroundColor: point.type === 'click' ? '#ef4444' : 
                                 point.type === 'focus' ? '#3b82f6' : '#22c55e',
              }}
              title={`${point.type} at ${point.x},${point.y}`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Field Analytics */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">Analytics Campi</h3>
          <div className="space-y-3">
            {heatmapData?.fieldData.slice(0, 5).map((field) => (
              <div key={field.fieldName} className="p-3 bg-gray-50 rounded">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{field.fieldName}</span>
                  <span className="text-sm text-gray-500">
                    {(field.focusTime / 1000).toFixed(1)}s
                  </span>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-blue-500">{field.clicks} clicks</span>
                  <span className="text-green-500">{field.hovers} hovers</span>
                  {field.errors > 0 && (
                    <span className="text-red-500">{field.errors} errors</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll Depth */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">Scroll Depth</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={[
              { depth: '0%', users: 100 },
              { depth: '25%', users: 85 },
              { depth: '50%', users: 70 },
              { depth: '75%', users: 55 },
              { depth: '100%', users: 40 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="depth" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="users" stroke="#8884d8" fill="#8884d8" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderABTests = () => (
    <div className="space-y-6">
      {abTests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Nessun test A/B attivo</p>
        </div>
      ) : (
        abTests.map((test) => (
          <div key={test.experimentId} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{test.name}</h3>
              <span className="text-sm text-gray-500">{test.experimentId}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {test.variantResults.map((variant) => (
                <div
                  key={variant.variant}
                  className={`p-4 rounded-lg border-2 ${
                    variant.conversionRate === Math.max(...test.variantResults.map(v => v.conversionRate))
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium capitalize">{variant.variant}</span>
                    {variant.conversionRate === Math.max(...test.variantResults.map(v => v.conversionRate)) && (
                      <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">WINNER</span>
                    )}
                  </div>
                  <div className="text-2xl font-bold">
                    {variant.conversionRate.toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-500">
                    {variant.visitors} visitatori · {variant.conversions} conversioni
                  </div>
                </div>
              ))}
            </div>

            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={test.variantResults}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="variant" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="conversionRate" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))
      )}
    </div>
  );

  const renderErrors = () => {
    const performanceMetrics = errorTracker.getPerformanceMetrics();
    const errorCount = errorTracker.getErrorCount();

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {performanceMetrics.lcp ? `${performanceMetrics.lcp.toFixed(0)}ms` : 'N/A'}
            </div>
            <div className="text-sm text-gray-500">LCP</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {performanceMetrics.fid ? `${performanceMetrics.fid.toFixed(0)}ms` : 'N/A'}
            </div>
            <div className="text-sm text-gray-500">FID</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {performanceMetrics.cls ? performanceMetrics.cls.toFixed(3) : 'N/A'}
            </div>
            <div className="text-sm text-gray-500">CLS</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{errorCount}</div>
            <div className="text-sm text-gray-500">Errori Totali</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">Errori per Campo</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={realTimeMetrics?.commonErrors || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="field" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count">
                {(realTimeMetrics?.commonErrors || []).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={ERROR_COLORS[index % ERROR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold">Form Analytics Dashboard</h1>
            <p className="text-gray-500">
              Ultimo aggiornamento: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          
          {/* Navigation */}
          <div className="flex gap-2 flex-wrap">
            {(['overview', 'funnel', 'heatmap', 'abtests', 'errors'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setSelectedView(view)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedView === view
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {view === 'overview' && 'Panoramica'}
                {view === 'funnel' && 'Funnel'}
                {view === 'heatmap' && 'Heatmap'}
                {view === 'abtests' && 'A/B Tests'}
                {view === 'errors' && 'Errori'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {selectedView === 'overview' && renderOverview()}
        {selectedView === 'funnel' && renderFunnel()}
        {selectedView === 'heatmap' && renderHeatmap()}
        {selectedView === 'abtests' && renderABTests()}
        {selectedView === 'errors' && renderErrors()}
      </div>
    </div>
  );
}

// Componente Metric Card
function MetricCard({
  title,
  value,
  subtitle,
  trend,
  trendUp,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  trend: string;
  trendUp: boolean;
  color: 'blue' | 'green' | 'purple' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    red: 'bg-red-50 border-red-200',
  };

  return (
    <div className={`rounded-lg shadow p-4 border ${colorClasses[color]}`}>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <p className="text-sm text-gray-500">{subtitle}</p>
      <div className={`mt-2 text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
        {trend}
      </div>
    </div>
  );
}

export default FormAnalyticsDashboard;
