/**
 * Form Analytics Dashboard
 * Dashboard in tempo reale con design glassmorphism
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  useRealtimeAnalytics,
  useFormAnalytics,
  type UseFormAnalyticsOptions,
  type AnalyticsMetrics,
} from '../../hooks/useFormAnalytics';

// ============================================
// TYPES
// ============================================

export interface DashboardProps {
  formId: string;
  visible?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showHeatmap?: boolean;
  showFunnel?: boolean;
  showABTest?: boolean;
  showPerformance?: boolean;
}

export interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}

export interface FunnelChartProps {
  data: AnalyticsMetrics['funnelData'];
}

// ============================================
// UTILITY COMPONENTS
// ============================================

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  trend,
  trendValue,
  color = 'blue',
}) => {
  const colorClasses = {
    blue: 'bg-[var(--status-info-subtle)]0/10 text-[var(--status-info)] border-[var(--status-info)]/30',
    green: 'bg-[var(--status-success-subtle)]0/10 text-[var(--status-success)] border-[var(--status-success)]/30',
    red: 'bg-[var(--status-error-subtle)]0/10 text-[var(--status-error)] border-[var(--status-error)]/30',
    yellow: 'bg-[var(--status-warning)]/100/10 text-[var(--status-warning)] border-[var(--status-warning)]/30',
    purple: 'bg-[var(--brand)]/50/10 text-[var(--brand)] border-[var(--brand)]/20',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  return (
    <div className={`p-3 rounded-xl border ${colorClasses[color]} backdrop-blur-sm`}>
      <div className='text-xs font-medium opacity-70 mb-1'>{label}</div>
      <div className='flex items-baseline gap-2'>
        <span className='text-lg font-bold'>{value}</span>
        {trend && (
          <span
            className={`text-xs ${trend === 'up' ? 'text-[var(--status-success)]' : trend === 'down' ? 'text-[var(--status-error)]' : 'text-[var(--text-secondary)]'}`}
          >
            {trendIcons[trend]} {trendValue}
          </span>
        )}
      </div>
    </div>
  );
};

const FunnelChart: React.FC<FunnelChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className='text-center py-4 text-sm text-[var(--text-tertiary)]'>Nessun dato funnel disponibile</div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.started));

  return (
    <div className='space-y-2 mt-3'>
      {data.map((step, index) => {
        const width = maxValue > 0 ? (step.started / maxValue) * 100 : 0;
        const completionRate =
          step.started > 0 ? Math.round((step.completed / step.started) * 100) : 0;

        return (
          <div key={index} className='relative'>
            <div className='flex items-center justify-between text-xs mb-1'>
              <span className='font-medium text-[var(--text-secondary)]'>
                {step.stepName || `Step ${step.step}`}
              </span>
              <span className='text-[var(--text-secondary)]'>
                {step.completed}/{step.started} ({completionRate}%)
              </span>
            </div>
            <div className='h-2 bg-[var(--border-default)] rounded-full overflow-hidden'>
              <div
                className='h-full bg-gradient-to-r from-[var(--status-info)] to-[var(--brand)] rounded-full transition-all duration-500'
                style={{ width: `${width}%` }}
              />
            </div>
            {step.dropOff > 0 && (
              <div className='text-xs text-[var(--status-error)] mt-0.5'>-{step.dropOff} abbandoni</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const ErrorList: React.FC<{ errors: AnalyticsMetrics['errors'] }> = ({ errors }) => {
  if (!errors || errors.length === 0) {
    return <div className='text-center py-2 text-xs text-[var(--status-success)]'>✓ Nessun errore rilevato</div>;
  }

  // Sort by count desc
  const sortedErrors = [...errors].sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className='space-y-1 mt-2'>
      {sortedErrors.map((error, index) => (
        <div
          key={index}
          className='flex items-center justify-between text-xs p-2 bg-[var(--status-error-subtle)] rounded-lg'
        >
          <span className='font-medium text-[var(--status-error)]'>{error.field}</span>
          <span className='bg-[var(--status-error)]/20 text-[var(--status-error)] px-2 py-0.5 rounded-full'>{error.count}</span>
        </div>
      ))}
    </div>
  );
};

const HeatmapPreview: React.FC<{ formId: string }> = ({ formId }) => {
  const [isCapturing, setIsCapturing] = useState(false);

  return (
    <div className='mt-3'>
      <div className='flex items-center justify-between mb-2'>
        <span className='text-xs font-medium text-[var(--text-secondary)]'>Heatmap</span>
        <button
          onClick={() => setIsCapturing(!isCapturing)}
          className={`text-xs px-2 py-1 rounded-full transition-colors ${
            isCapturing ? 'bg-[var(--status-error-subtle)]0 text-[var(--text-on-brand)]' : 'bg-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--border-strong)]'
          }`}
        >
          {isCapturing ? 'Stop' : 'Start'}
        </button>
      </div>
      <div className='h-20 bg-[var(--surface-secondary)] rounded-lg flex items-center justify-center'>
        {isCapturing ? (
          <div className='flex items-center gap-2 text-xs text-[var(--text-secondary)]'>
            <span className='w-2 h-2 bg-[var(--status-error-subtle)]0 rounded-full animate-pulse' />
            Recording clicks...
          </div>
        ) : (
          <span className='text-xs text-[var(--text-tertiary)]'>Click start to capture</span>
        )}
      </div>
    </div>
  );
};

const ABTestPanel: React.FC<{
  variant: 'A' | 'B' | null;
  onForceVariant?: (v: 'A' | 'B') => void;
}> = ({ variant, onForceVariant }) => {
  return (
    <div className='mt-3'>
      <div className='text-xs font-medium text-[var(--text-secondary)] mb-2'>A/B Test</div>
      <div className='flex gap-2'>
        <button
          onClick={() => onForceVariant?.('A')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
            variant === 'A'
              ? 'bg-[var(--status-info-subtle)]0 text-[var(--text-on-brand)]'
              : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]'
          }`}
        >
          Variant A
        </button>
        <button
          onClick={() => onForceVariant?.('B')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
            variant === 'B'
              ? 'bg-[var(--brand)]/50 text-[var(--text-on-brand)]'
              : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]'
          }`}
        >
          Variant B
        </button>
      </div>
      {variant && (
        <div className='mt-2 text-center text-xs text-[var(--text-tertiary)]'>
          Active: <span className='font-medium text-[var(--text-secondary)]'>{variant}</span>
        </div>
      )}
    </div>
  );
};

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

export const FormAnalyticsDashboard: React.FC<DashboardProps> = ({
  formId,
  visible = true,
  position = 'bottom-right',
  showHeatmap = true,
  showFunnel = true,
  showABTest = false,
  showPerformance = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(visible);
  const metrics = useRealtimeAnalytics({ formId, enabled: isVisible });

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className={`fixed ${positionClasses[position]} w-10 h-10 bg-[var(--status-info-subtle)]0 text-[var(--text-on-brand)] rounded-full shadow-lg flex items-center justify-center hover:bg-[var(--status-info)] transition-all z-50`}
        title='Show Analytics'
        aria-label='Mostra analytics'
      >
        <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
          />
        </svg>
      </button>
    );
  }

  return (
    <div
      data-analytics-dashboard
      className={`fixed ${positionClasses[position]} z-50 transition-all duration-300`}
    >
      {/* Compact Mode */}
      {!isExpanded ? (
        <div
          className='bg-[var(--surface-secondary)] backdrop-blur-3xl rounded-2xl shadow-2xl p-4 cursor-pointer hover:bg-[var(--surface-secondary)]/90 transition-all'
          onClick={() => setIsExpanded(true)}
          style={{ width: '280px' }}
        >
          <div className='flex items-center justify-between mb-3'>
            <h4 className='font-semibold text-[var(--text-primary)] flex items-center gap-2'>
              <svg
                className='w-4 h-4 text-[var(--status-info)]'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                />
              </svg>
              Form Analytics
            </h4>
            <div className='flex items-center gap-1'>
              <span className='w-2 h-2 bg-[var(--status-success-subtle)]0 rounded-full animate-pulse' />
              <button
                onClick={e => {
                  e.stopPropagation();
                  setIsVisible(false);
                }}
                className='text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] ml-2'
                aria-label='Chiudi analytics'
              >
                ×
              </button>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-2'>
            <MetricCard label='Attivi' value={metrics.activeUsers} color='blue' />
            <MetricCard
              label='Completamento'
              value={`${Math.round(metrics.completionRate)}%`}
              trend={metrics.completionRate > 50 ? 'up' : 'down'}
              color='green'
            />
            <MetricCard
              label='Tempo Medio'
              value={`${Math.round(metrics.avgTime)}s`}
              color='purple'
            />
            <MetricCard
              label='Drop-off'
              value={metrics.dropOffStep ? `Step ${metrics.dropOffStep}` : 'Nessuno'}
              color={metrics.dropOffStep ? 'red' : 'green'}
            />
          </div>

          <div className='mt-3 text-center text-xs text-[var(--text-tertiary)]'>Clicca per espandere</div>
        </div>
      ) : (
        /* Expanded Mode */
        <div
          className='bg-[var(--surface-secondary)] backdrop-blur-3xl rounded-2xl shadow-2xl overflow-hidden transition-all'
          style={{ width: '360px', maxHeight: '600px' }}
        >
          {/* Header */}
          <div className='p-4 border-b border-[var(--border-default)]/50 flex items-center justify-between'>
            <h4 className='font-semibold text-[var(--text-primary)] flex items-center gap-2'>
              <svg
                className='w-5 h-5 text-[var(--status-info)]'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                />
              </svg>
              Form Analytics
              <span className='text-xs font-normal text-[var(--text-tertiary)] ml-2'>#{formId}</span>
            </h4>
            <div className='flex items-center gap-2'>
              <button
                onClick={() => setIsExpanded(false)}
                className='text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] p-1'
                title='Minimize'
                aria-label='Riduci pannello'
              >
                <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M19 9l-7 7-7-7'
                  />
                </svg>
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className='text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] p-1'
                title='Chiudi'
                aria-label='Chiudi'
              >
                ×
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className='p-4 overflow-y-auto' style={{ maxHeight: '520px' }}>
            {/* Main Metrics Grid */}
            <div className='grid grid-cols-2 gap-3 mb-4'>
              <MetricCard
                label='Utenti Attivi'
                value={metrics.activeUsers}
                trend='up'
                trendValue='+12%'
                color='blue'
              />
              <MetricCard
                label='Tasso Completamento'
                value={`${Math.round(metrics.completionRate)}%`}
                trend={metrics.completionRate > 50 ? 'up' : 'down'}
                trendValue={metrics.completionRate > 50 ? '+5%' : '-3%'}
                color='green'
              />
              <MetricCard
                label='Tempo Medio'
                value={`${Math.round(metrics.avgTime)}s`}
                color='purple'
              />
              <MetricCard
                label='Abbandoni'
                value={metrics.dropOffStep ? `Step ${metrics.dropOffStep}` : '0'}
                color={metrics.dropOffStep ? 'red' : 'green'}
              />
            </div>

            {/* Funnel Visualization */}
            {showFunnel && (
              <div className='mb-4 p-3 bg-[var(--surface-secondary)] rounded-xl'>
                <h5 className='text-xs font-semibold text-[var(--text-secondary)] mb-2 flex items-center gap-2'>
                  <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z'
                    />
                  </svg>
                  Funnel Conversione
                </h5>
                <FunnelChart data={metrics.funnelData} />
              </div>
            )}

            {/* Errors Section */}
            <div className='mb-4 p-3 bg-[var(--surface-secondary)] rounded-xl'>
              <h5 className='text-xs font-semibold text-[var(--text-secondary)] mb-2 flex items-center gap-2'>
                <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                  />
                </svg>
                Errori Campi
              </h5>
              <ErrorList errors={metrics.errors} />
            </div>

            {/* Heatmap Section */}
            {showHeatmap && <HeatmapPreview formId={formId} />}

            {/* A/B Test Section */}
            {showABTest && (
              <div className='mt-4 p-3 bg-[var(--surface-secondary)] rounded-xl'>
                <ABTestPanel variant={null} />
              </div>
            )}

            {/* Performance Section */}
            {showPerformance && (
              <div className='mt-4 p-3 bg-[var(--surface-secondary)] rounded-xl'>
                <h5 className='text-xs font-semibold text-[var(--text-secondary)] mb-2 flex items-center gap-2'>
                  <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M13 10V3L4 14h7v7l9-11h-7z'
                    />
                  </svg>
                  Performance
                </h5>
                <div className='grid grid-cols-2 gap-2 text-xs'>
                  <div className='p-2 bg-[var(--surface-secondary)] rounded-lg'>
                    <span className='text-[var(--text-secondary)]'>Load Time</span>
                    <div className='font-medium'>1.2s</div>
                  </div>
                  <div className='p-2 bg-[var(--surface-secondary)] rounded-lg'>
                    <span className='text-[var(--text-secondary)]'>API Latency</span>
                    <div className='font-medium'>245ms</div>
                  </div>
                </div>
              </div>
            )}

            {/* Debug Actions */}
            <div className='mt-4 pt-3 border-t border-[var(--border-default)]/50 flex gap-2'>
              <button
                onClick={() => {
                  /* debug action */
                }}
                className='flex-1 py-2 px-3 bg-[var(--surface-secondary)] hover:bg-[var(--border-default)] rounded-lg text-xs font-medium text-[var(--text-secondary)] transition-colors'
              >
                Esporta Dati
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('form_analytics_session_id');
                  window.location.reload();
                }}
                className='flex-1 py-2 px-3 bg-[var(--surface-secondary)] hover:bg-[var(--border-default)] rounded-lg text-xs font-medium text-[var(--text-secondary)] transition-colors'
              >
                Reset Sessione
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// ADMIN DASHBOARD (Full Size)
// ============================================

export interface AdminDashboardProps {
  formIds: string[];
  title?: string;
}

export const FormAnalyticsAdminDashboard: React.FC<AdminDashboardProps> = ({
  formIds,
  title = 'Analytics Dashboard',
}) => {
  const [selectedForm, setSelectedForm] = useState(formIds[0]);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');
  const metrics = useRealtimeAnalytics({ formId: selectedForm, enabled: true });

  return (
    <div className='w-[900px] h-[900px] bg-[var(--surface-secondary)] backdrop-blur-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col'>
      {/* Header */}
      <div className='p-6 border-b border-[var(--border-default)]/50 flex items-center justify-between'>
        <div>
          <h2 className='text-xl font-bold text-[var(--text-primary)]'>{title}</h2>
          <p className='text-sm text-[var(--text-tertiary)] mt-1'>Dashboard avanzata form analytics</p>
        </div>

        <div className='flex items-center gap-3'>
          {/* Form Selector */}
          <select
            value={selectedForm}
            onChange={e => setSelectedForm(e.target.value)}
            className='px-4 py-2 bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--status-info)]'
          >
            {formIds.map(id => (
              <option key={id} value={id}>
                Form: {id}
              </option>
            ))}
          </select>

          {/* Date Range */}
          <div className='flex bg-[var(--surface-secondary)] rounded-xl p-1'>
            {(['today', 'week', 'month'] as const).map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  dateRange === range
                    ? 'bg-[var(--surface-secondary)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {range === 'today' ? 'Oggi' : range === 'week' ? 'Settimana' : 'Mese'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className='flex-1 p-6 overflow-y-auto'>
        {/* KPI Cards */}
        <div className='grid grid-cols-4 gap-4 mb-6'>
          <div className='p-4 bg-[var(--status-info-subtle)]/50 rounded-2xl border border-[var(--status-info)]/10'>
            <div className='text-sm text-[var(--status-info)] font-medium mb-1'>Sessioni Attive</div>
            <div className='text-3xl font-bold text-[var(--status-info)]'>{metrics.activeUsers}</div>
            <div className='text-xs text-[var(--status-info)] mt-1'>+12% vs ieri</div>
          </div>

          <div className='p-4 bg-[var(--status-success-subtle)]/50 rounded-2xl border border-[var(--status-success)]/10'>
            <div className='text-sm text-[var(--status-success)] font-medium mb-1'>Conversione</div>
            <div className='text-3xl font-bold text-[var(--status-success)]'>
              {Math.round(metrics.completionRate)}%
            </div>
            <div className='text-xs text-[var(--status-success)] mt-1'>+5% vs media</div>
          </div>

          <div className='p-4 bg-[var(--brand)]/5/50 rounded-2xl border border-[var(--brand)]/10'>
            <div className='text-sm text-[var(--brand)] font-medium mb-1'>Tempo Medio</div>
            <div className='text-3xl font-bold text-[var(--brand)]'>{Math.round(metrics.avgTime)}s</div>
            <div className='text-xs text-[var(--brand)] mt-1'>-10s ottimizzazione</div>
          </div>

          <div className='p-4 bg-[var(--status-error-subtle)]/50 rounded-2xl border border-[var(--status-error)]/10'>
            <div className='text-sm text-[var(--status-error)] font-medium mb-1'>Abbandono</div>
            <div className='text-3xl font-bold text-[var(--status-error)]'>
              {metrics.dropOffStep ? `Step ${metrics.dropOffStep}` : '0%'}
            </div>
            <div className='text-xs text-[var(--status-error)] mt-1'>
              {metrics.dropOffStep ? 'Necessita attenzione' : 'Ottimo!'}
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className='grid grid-cols-2 gap-6 mb-6'>
          {/* Funnel Chart */}
          <div className='p-5 bg-[var(--surface-secondary)] rounded-2xl border border-[var(--border-default)]'>
            <h3 className='font-semibold text-[var(--text-primary)] mb-4'>Funnel di Conversione</h3>
            <FunnelChart data={metrics.funnelData} />
          </div>

          {/* Error Breakdown */}
          <div className='p-5 bg-[var(--surface-secondary)] rounded-2xl border border-[var(--border-default)]'>
            <h3 className='font-semibold text-[var(--text-primary)] mb-4'>Errori per Campo</h3>
            <ErrorList errors={metrics.errors} />
          </div>
        </div>

        {/* A/B Test Results */}
        <div className='p-5 bg-[var(--surface-secondary)] rounded-2xl border border-[var(--border-default)]'>
          <h3 className='font-semibold text-[var(--text-primary)] mb-4'>Risultati A/B Test</h3>
          <div className='grid grid-cols-2 gap-4'>
            <div className='p-4 bg-[var(--status-info-subtle)]0/10 rounded-xl border border-[var(--status-info)]/30'>
              <div className='flex items-center justify-between mb-2'>
                <span className='font-medium text-[var(--status-info)]'>Variante A</span>
                <span className='text-xs bg-[var(--status-info-subtle)]0 text-[var(--text-on-brand)] px-2 py-0.5 rounded-full'>
                  50% traffic
                </span>
              </div>
              <div className='text-2xl font-bold text-[var(--status-info)]'>3.2%</div>
              <div className='text-sm text-[var(--status-info)]'>Conversion rate</div>
            </div>
            <div className='p-4 bg-[var(--brand)]/50/10 rounded-xl border border-[var(--brand)]/20'>
              <div className='flex items-center justify-between mb-2'>
                <span className='font-medium text-[var(--brand)]'>Variante B</span>
                <span className='text-xs bg-[var(--brand)]/50 text-[var(--text-on-brand)] px-2 py-0.5 rounded-full'>
                  50% traffic
                </span>
              </div>
              <div className='text-2xl font-bold text-[var(--brand)]'>4.1%</div>
              <div className='text-sm text-[var(--brand)]'>Conversion rate</div>
            </div>
          </div>
          <div className='mt-3 p-3 bg-[var(--status-success-subtle)] rounded-lg text-sm text-[var(--status-success)]'>
            <span className='font-medium'>Winner:</span> Variante B (+28% lift)
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPACT METRICS (Mini Dashboard)
// ============================================

export const CompactFormMetrics: React.FC<{ formId: string }> = ({ formId }) => {
  const metrics = useRealtimeAnalytics({ formId, enabled: true });

  return (
    <div className='flex items-center gap-4 text-sm'>
      <div className='flex items-center gap-1.5'>
        <span className='w-2 h-2 bg-[var(--status-success-subtle)]0 rounded-full animate-pulse' />
        <span className='text-[var(--text-secondary)]'>{metrics.activeUsers} attivi</span>
      </div>
      <div className='h-4 w-px bg-[var(--border-strong)]' />
      <div className='text-[var(--text-secondary)]'>{Math.round(metrics.completionRate)}% completamento</div>
      <div className='h-4 w-px bg-[var(--border-strong)]' />
      <div className='text-[var(--text-secondary)]'>{Math.round(metrics.avgTime)}s media</div>
    </div>
  );
};

// ============================================
// EXPORTS
// ============================================

export default FormAnalyticsDashboard;
