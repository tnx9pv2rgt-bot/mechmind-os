'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Scan,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  Eye,
  EyeOff,
  ChevronRight,
  Info,
  Gauge,
  CircleDollarSign,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  DamageAnalysisResult,
  DamageArea,
  DamageType,
  TireWearResult,
  RepairCostEstimate,
  AIService,
} from '@/lib/services/aiService';

// ==================== Type Definitions ====================

interface DamageAnalyzerProps {
  imageUrl: string;
  analysisResult?: DamageAnalysisResult;
  onAnalyze: (imageBase64: string) => Promise<DamageAnalysisResult>;
  isTirePhoto?: boolean;
  onTireAnalyze?: (imageBase64: string) => Promise<TireWearResult>;
  className?: string;
}

interface AIAnalysisResult extends DamageAnalysisResult {
  tireAnalysis?: TireWearResult;
  costEstimate?: RepairCostEstimate;
}

// ==================== Constants ====================

const DAMAGE_TYPE_COLORS: Record<
  DamageType,
  { bg: string; border: string; text: string; label: string }
> = {
  dent: {
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500',
    text: 'text-yellow-600',
    label: 'Ammaccatura',
  },
  scratch: {
    bg: 'bg-orange-500/20',
    border: 'border-orange-500',
    text: 'text-orange-600',
    label: 'Graffio',
  },
  rust: {
    bg: 'bg-red-500/20',
    border: 'border-red-500',
    text: 'text-red-600',
    label: 'Ruggine',
  },
  crack: {
    bg: 'bg-purple-500/20',
    border: 'border-purple-500',
    text: 'text-purple-600',
    label: 'Crepa',
  },
};

const SEVERITY_CONFIG = {
  minor: { label: 'Minore', color: 'bg-green-500', textColor: 'text-green-700' },
  moderate: { label: 'Moderata', color: 'bg-yellow-500', textColor: 'text-yellow-700' },
  severe: { label: 'Grave', color: 'bg-red-500', textColor: 'text-red-700' },
};

const TIRE_CONDITION_COLORS = {
  excellent: 'bg-green-500',
  good: 'bg-green-400',
  fair: 'bg-yellow-500',
  poor: 'bg-orange-500',
  critical: 'bg-red-500',
};

// ==================== Helper Functions ====================

function getUrgencyScore(damages: DamageArea[]): number {
  if (damages.length === 0) return 0;

  let score = 0;
  for (const damage of damages) {
    // Base score from confidence
    const baseScore = damage.confidence * 5;

    // Severity multiplier
    const severityMultiplier =
      damage.severity === 'severe' ? 2 : damage.severity === 'moderate' ? 1.5 : 1;

    // Type urgency factor
    const typeUrgency = damage.type === 'crack' ? 1.5 : damage.type === 'rust' ? 1.3 : 1;

    score += baseScore * severityMultiplier * typeUrgency;
  }

  return Math.min(10, Math.round(score / Math.max(1, damages.length)));
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

async function imageUrlToBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ==================== Components ====================

/**
 * Bounding box overlay for detected damage
 */
function DamageBoundingBox({
  damage,
  isSelected,
  showLabels,
  onClick,
  scale,
}: {
  damage: DamageArea;
  isSelected: boolean;
  showLabels: boolean;
  onClick: () => void;
  scale: number;
}) {
  const [x, y, width, height] = damage.bbox;
  const colors = DAMAGE_TYPE_COLORS[damage.type];

  return (
    <div
      className={cn(
        'absolute cursor-pointer transition-all duration-200',
        colors.border,
        isSelected ? 'ring-2 ring-white shadow-lg z-10' : 'hover:ring-2 hover:ring-white/50'
      )}
      style={{
        left: `${x * scale}%`,
        top: `${y * scale}%`,
        width: `${width * scale}%`,
        height: `${height * scale}%`,
        backgroundColor: isSelected ? 'rgba(255,255,255,0.1)' : 'transparent',
        borderWidth: isSelected ? '3px' : '2px',
        borderStyle: 'solid',
      }}
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
    >
      {showLabels && (
        <div
          className={cn(
            'absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap',
            colors.bg,
            colors.text
          )}
        >
          {DAMAGE_TYPE_COLORS[damage.type].label} • {Math.round(damage.confidence * 100)}%
        </div>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div className='absolute -top-2 -right-2 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-md'>
          <div className={cn('w-2 h-2 rounded-full', colors.border.replace('border-', 'bg-'))} />
        </div>
      )}
    </div>
  );
}

/**
 * Tire wear visualization component
 */
function TireWearVisualization({ tireAnalysis }: { tireAnalysis: TireWearResult }) {
  const maxDepth = 8; // mm

  return (
    <Card className='mt-4'>
      <CardHeader className='pb-3'>
        <CardTitle className='text-sm flex items-center gap-2'>
          <Gauge className='h-4 w-4' />
          Analisi Usura Pneumatico
        </CardTitle>
        <CardDescription>
          Condizione:{' '}
          <span
            className={cn(
              'font-medium',
              tireAnalysis.condition === 'excellent' || tireAnalysis.condition === 'good'
                ? 'text-green-600'
                : tireAnalysis.condition === 'fair'
                  ? 'text-yellow-600'
                  : 'text-red-600'
            )}
          >
            {tireAnalysis.condition === 'excellent' && 'Eccellente'}
            {tireAnalysis.condition === 'good' && 'Buona'}
            {tireAnalysis.condition === 'fair' && 'Discreta'}
            {tireAnalysis.condition === 'poor' && 'Usurato'}
            {tireAnalysis.condition === 'critical' && 'Critica'}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Tire tread visualization */}
        <div className='flex items-end gap-2 h-24 px-4'>
          {tireAnalysis.sections.map(section => {
            const height = Math.max(20, 100 - section.wearPercent);
            const depth = section.treadDepthMm ?? Math.max(0, 8 - section.wearPercent / 10);

            return (
              <div key={section.section} className='flex-1 flex flex-col items-center gap-2'>
                <div className='relative w-full h-16 bg-gray-200 rounded-t-lg overflow-hidden'>
                  <div
                    className={cn(
                      'absolute bottom-0 w-full transition-all duration-500',
                      section.wearPercent > 70
                        ? 'bg-red-500'
                        : section.wearPercent > 50
                          ? 'bg-orange-500'
                          : section.wearPercent > 30
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                    )}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <div className='text-center'>
                  <div className='text-xs font-medium capitalize'>
                    {section.section === 'inner'
                      ? 'Interno'
                      : section.section === 'middle'
                        ? 'Centro'
                        : 'Esterno'}
                  </div>
                  <div className='text-xs text-gray-500'>{section.wearPercent}% usura</div>
                  <div className='text-xs font-medium text-gray-700'>{depth.toFixed(1)}mm</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Average wear */}
        <div className='flex items-center justify-between pt-2 border-t'>
          <span className='text-sm text-gray-600'>Usura media</span>
          <span
            className={cn(
              'text-sm font-medium',
              tireAnalysis.averageWearPercent > 70
                ? 'text-red-600'
                : tireAnalysis.averageWearPercent > 50
                  ? 'text-orange-600'
                  : tireAnalysis.averageWearPercent > 30
                    ? 'text-yellow-600'
                    : 'text-green-600'
            )}
          >
            {tireAnalysis.averageWearPercent}%
          </span>
        </div>

        {/* Recommendation */}
        <div
          className={cn(
            'flex items-start gap-2 p-3 rounded-lg text-sm',
            tireAnalysis.condition === 'critical'
              ? 'bg-red-50 text-red-700'
              : tireAnalysis.condition === 'poor'
                ? 'bg-orange-50 text-orange-700'
                : 'bg-blue-50 text-blue-700'
          )}
        >
          <Info className='h-4 w-4 mt-0.5 flex-shrink-0' />
          <p>{tireAnalysis.recommendation}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Main Damage Analyzer Component
 */
export function DamageAnalyzer({
  imageUrl,
  analysisResult,
  onAnalyze,
  isTirePhoto = false,
  onTireAnalyze,
  className,
}: DamageAnalyzerProps) {
  // State
  const [result, setResult] = useState<AIAnalysisResult | undefined>(analysisResult);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDamageId, setSelectedDamageId] = useState<string | null>(null);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState([0.5]);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [imageScale, setImageScale] = useState(1);

  // Calculate image scale factor
  useEffect(() => {
    const updateScale = () => {
      if (imageContainerRef.current) {
        const rect = imageContainerRef.current.getBoundingClientRect();
        setImageScale(rect.width / 100); // percentage to pixels
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [zoom]);

  // Initial analysis
  useEffect(() => {
    if (!analysisResult && imageUrl) {
      handleAnalyze();
    }
  }, [imageUrl]);

  const handleAnalyze = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const base64 = await imageUrlToBase64(imageUrl);
      const damageResult = await onAnalyze(base64);

      const newResult: AIAnalysisResult = {
        ...damageResult,
        costEstimate: undefined,
      };

      // If tire photo, also analyze tire wear
      if (isTirePhoto && onTireAnalyze) {
        try {
          const tireResult = await onTireAnalyze(base64);
          newResult.tireAnalysis = tireResult;
        } catch (tireError) {
          console.warn('Tire analysis failed:', tireError);
        }
      }

      setResult(newResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analisi fallita');
    } finally {
      setIsLoading(false);
    }
  }, [imageUrl, onAnalyze, isTirePhoto, onTireAnalyze]);

  // Filter damages by confidence threshold
  const filteredDamages =
    result?.damageAreas.filter(d => d.confidence >= confidenceThreshold[0]) ?? [];

  // Calculate urgency score
  const urgencyScore = result ? getUrgencyScore(filteredDamages) : 0;

  // Calculate total estimated cost
  const totalCost = filteredDamages.reduce((sum, damage) => {
    const baseCosts = { dent: 150, scratch: 80, rust: 200, crack: 300 };
    const severityMultipliers = { minor: 0.7, moderate: 1, severe: 1.5 };
    return sum + baseCosts[damage.type] * severityMultipliers[damage.severity] * damage.confidence;
  }, 0);

  // Handle zoom
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  // Handle damage selection
  const handleDamageSelect = (damageId: string) => {
    setSelectedDamageId(damageId === selectedDamageId ? null : damageId);
  };

  return (
    <div className={cn('flex flex-col lg:flex-row gap-4 h-full', className)}>
      {/* Left Panel - Image with Overlays */}
      <div className='flex-1 flex flex-col min-h-[400px]'>
        <Card className='flex-1 flex flex-col overflow-hidden'>
          <CardHeader className='py-3 px-4 flex flex-row items-center justify-between space-y-0'>
            <div className='flex items-center gap-2'>
              <Scan className='h-4 w-4 text-blue-600' />
              <CardTitle className='text-base font-medium'>Analisi AI</CardTitle>
            </div>

            {/* Controls */}
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='icon'
                className='h-8 w-8'
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                aria-label='Riduci zoom'
              >
                <ZoomOut className='h-4 w-4' />
              </Button>
              <span className='text-xs text-gray-500 w-12 text-center'>
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant='outline'
                size='icon'
                className='h-8 w-8'
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                aria-label='Aumenta zoom'
              >
                <ZoomIn className='h-4 w-4' />
              </Button>

              <div className='w-px h-6 bg-gray-200 mx-1' />

              <Button
                variant='outline'
                size='sm'
                className='h-8 gap-1.5'
                onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
              >
                {showBoundingBoxes ? (
                  <Eye className='h-3.5 w-3.5' />
                ) : (
                  <EyeOff className='h-3.5 w-3.5' />
                )}
                <span className='hidden sm:inline text-xs'>
                  {showBoundingBoxes ? 'Nascondi' : 'Mostra'}
                </span>
              </Button>

              <Button
                variant='outline'
                size='sm'
                className='h-8 gap-1.5'
                onClick={handleAnalyze}
                disabled={isLoading}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
                <span className='hidden sm:inline text-xs'>Rianalizza</span>
              </Button>
            </div>
          </CardHeader>

          {/* Image Container */}
          <div ref={imageContainerRef} className='relative flex-1 bg-gray-900 overflow-auto'>
            {isLoading ? (
              <div className='absolute inset-0 flex flex-col items-center justify-center text-white'>
                <div className='w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4' />
                <p className='text-sm'>Analisi in corso...</p>
                <p className='text-xs text-gray-400 mt-1'>L&apos;AI sta rilevando i danni</p>
              </div>
            ) : error ? (
              <div className='absolute inset-0 flex flex-col items-center justify-center text-white'>
                <AlertCircle className='h-12 w-12 text-red-500 mb-4' />
                <p className='text-sm'>{error}</p>
                <Button variant='outline' size='sm' className='mt-4' onClick={handleAnalyze}>
                  Riprova
                </Button>
              </div>
            ) : (
              <div
                className='relative inline-block min-w-full min-h-full'
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                }}
              >
                <img
                  src={imageUrl}
                  alt='Vehicle inspection'
                  className='block max-w-none'
                  style={{ width: '100%', height: 'auto' }}
                />

                {/* Bounding Boxes */}
                {showBoundingBoxes && result && (
                  <div className='absolute inset-0'>
                    {filteredDamages.map(damage => (
                      <DamageBoundingBox
                        key={damage.id}
                        damage={damage}
                        isSelected={selectedDamageId === damage.id}
                        showLabels={true}
                        onClick={() => handleDamageSelect(damage.id)}
                        scale={1}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Legend */}
          <CardFooter className='py-2 px-4 bg-gray-50 border-t flex-wrap gap-4'>
            <div className='flex items-center gap-3 text-xs'>
              <span className='text-gray-500'>Legenda:</span>
              {(Object.keys(DAMAGE_TYPE_COLORS) as DamageType[]).map(type => (
                <div key={type} className='flex items-center gap-1'>
                  <div
                    className={cn('w-3 h-3 rounded border', DAMAGE_TYPE_COLORS[type].border)}
                    style={{
                      backgroundColor: DAMAGE_TYPE_COLORS[type].border.replace('border-', ''),
                    }}
                  />
                  <span className='text-gray-600'>{DAMAGE_TYPE_COLORS[type].label}</span>
                </div>
              ))}
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Right Panel - Analysis Results */}
      <div className='w-full lg:w-80 xl:w-96 flex flex-col gap-4'>
        {/* Summary Card */}
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <CheckCircle2 className='h-4 w-4 text-green-600' />
              Riepilogo Analisi
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            {isLoading ? (
              <div className='space-y-2'>
                <div className='h-4 bg-gray-200 rounded animate-pulse' />
                <div className='h-4 bg-gray-200 rounded animate-pulse w-3/4' />
              </div>
            ) : result ? (
              <>
                <div className='grid grid-cols-2 gap-3'>
                  <div className='bg-gray-50 rounded-lg p-3'>
                    <div className='text-xs text-gray-500 mb-1'>Danni rilevati</div>
                    <div className='text-2xl font-semibold text-gray-900'>
                      {filteredDamages.length}
                    </div>
                  </div>
                  <div className='bg-gray-50 rounded-lg p-3'>
                    <div className='text-xs text-gray-500 mb-1'>Confidenza media</div>
                    <div className='text-2xl font-semibold text-blue-600'>
                      {Math.round(result.overallConfidence * 100)}%
                    </div>
                  </div>
                </div>

                <div className='flex items-center justify-between py-2 border-t'>
                  <span className='text-sm text-gray-600 flex items-center gap-1.5'>
                    <CircleDollarSign className='h-4 w-4' />
                    Costo stimato
                  </span>
                  <span className='font-semibold text-gray-900'>{formatCurrency(totalCost)}</span>
                </div>

                <div className='flex items-center justify-between py-2 border-t'>
                  <span className='text-sm text-gray-600 flex items-center gap-1.5'>
                    <AlertTriangle className='h-4 w-4' />
                    Urgenza
                  </span>
                  <div className='flex items-center gap-2'>
                    <div className='flex'>
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            'w-2 h-4 rounded-sm mx-px',
                            i < urgencyScore
                              ? urgencyScore > 7
                                ? 'bg-red-500'
                                : urgencyScore > 4
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              : 'bg-gray-200'
                          )}
                        />
                      ))}
                    </div>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        urgencyScore > 7
                          ? 'text-red-600'
                          : urgencyScore > 4
                            ? 'text-yellow-600'
                            : 'text-green-600'
                      )}
                    >
                      {urgencyScore}/10
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p className='text-sm text-gray-500 text-center py-4'>Nessuna analisi disponibile</p>
            )}
          </CardContent>
        </Card>

        {/* Confidence Threshold Slider */}
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm'>Soglia di confidenza</CardTitle>
            <CardDescription>Filtra i risultati con confidenza minima</CardDescription>
          </CardHeader>
          <CardContent>
            <Slider
              value={confidenceThreshold}
              onValueChange={setConfidenceThreshold}
              min={0.3}
              max={0.95}
              step={0.05}
              disabled={isLoading}
            />
            <div className='flex justify-between mt-2'>
              <span className='text-xs text-gray-500'>30%</span>
              <span className='text-xs font-medium text-blue-600'>
                {Math.round(confidenceThreshold[0] * 100)}%
              </span>
              <span className='text-xs text-gray-500'>95%</span>
            </div>
          </CardContent>
        </Card>

        {/* Damage List */}
        <Card className='flex-1'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <AlertCircle className='h-4 w-4' />
              Dettaglio Danni
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 max-h-[300px] overflow-y-auto'>
            {isLoading ? (
              <div className='space-y-2'>
                {[1, 2, 3].map(i => (
                  <div key={i} className='h-16 bg-gray-100 rounded animate-pulse' />
                ))}
              </div>
            ) : filteredDamages.length > 0 ? (
              filteredDamages.map(damage => {
                const colors = DAMAGE_TYPE_COLORS[damage.type];
                const isSelected = selectedDamageId === damage.id;
                const estimatedCost =
                  {
                    dent: 150,
                    scratch: 80,
                    rust: 200,
                    crack: 300,
                  }[damage.type] *
                  (damage.severity === 'severe' ? 1.5 : damage.severity === 'moderate' ? 1 : 0.7) *
                  damage.confidence;

                return (
                  <button
                    key={damage.id}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-all duration-200',
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    )}
                    onClick={() => handleDamageSelect(damage.id)}
                  >
                    <div className='flex items-start justify-between gap-2'>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 mb-1'>
                          <Badge
                            variant='outline'
                            className={cn('text-xs', colors.border, colors.text)}
                          >
                            {colors.label}
                          </Badge>
                          <span
                            className={cn(
                              'text-xs px-1.5 py-0.5 rounded-full',
                              damage.severity === 'severe'
                                ? 'bg-red-100 text-red-700'
                                : damage.severity === 'moderate'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                            )}
                          >
                            {SEVERITY_CONFIG[damage.severity].label}
                          </span>
                        </div>
                        <p className='text-xs text-gray-600 truncate'>
                          {damage.description || `${colors.label} rilevata`}
                        </p>
                      </div>
                      <div className='text-right'>
                        <div className='text-sm font-medium text-gray-900'>
                          {Math.round(damage.confidence * 100)}%
                        </div>
                        <div className='text-xs text-gray-500'>{formatCurrency(estimatedCost)}</div>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : result ? (
              <div className='text-center py-6'>
                <CheckCircle2 className='h-10 w-10 text-green-500 mx-auto mb-2' />
                <p className='text-sm text-gray-600'>Nessun danno rilevato</p>
                <p className='text-xs text-gray-400 mt-1'>
                  Prova a abbassare la soglia di confidenza
                </p>
              </div>
            ) : (
              <p className='text-sm text-gray-500 text-center py-4'>
                Avvia l&apos;analisi per vedere i risultati
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tire Analysis (if applicable) */}
        {isTirePhoto && result?.tireAnalysis && (
          <TireWearVisualization tireAnalysis={result.tireAnalysis} />
        )}
      </div>
    </div>
  );
}

export default DamageAnalyzer;
