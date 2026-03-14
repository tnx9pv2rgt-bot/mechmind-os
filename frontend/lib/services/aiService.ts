/**
 * AI Service - Automated Vehicle Damage Detection
 * Servizio di analisi ML per il rilevamento automatico dei danni ai veicoli
 * Utilizza TensorFlow.js e AWS Rekognition
 */

import { generateId } from '@/lib/utils';

// ==================== Configuration & Constants ====================

/** Confidence thresholds for damage detection */
export const CONFIDENCE_THRESHOLDS = {
  /** Minimum confidence to consider a detection valid */
  MINIMUM: 0.5,
  /** High confidence threshold */
  HIGH: 0.85,
  /** Medium confidence threshold */
  MEDIUM: 0.7,
  /** Low confidence threshold */
  LOW: 0.5,
} as const;

/** Severity levels based on confidence and damage extent */
const SEVERITY_CONFIG = {
  minor: { maxCost: 200, label: 'Minore' },
  moderate: { maxCost: 800, label: 'Moderata' },
  severe: { maxCost: 3000, label: 'Grave' },
} as const;

/** Repair cost estimates by damage type (base cost in EUR) */
const REPAIR_COSTS: Record<DamageType, { base: number; factor: number }> = {
  dent: { base: 150, factor: 1.2 },
  scratch: { base: 80, factor: 0.8 },
  rust: { base: 200, factor: 1.5 },
  crack: { base: 300, factor: 2.0 },
};

// ==================== Type Definitions ====================

/** Types of vehicle damage detectable by the AI */
export type DamageType = 'dent' | 'scratch' | 'rust' | 'crack';

/** Severity levels for damage assessment */
export type SeverityLevel = 'minor' | 'moderate' | 'severe';

/** Bounding box for damage location [x, y, width, height] */
export type BoundingBox = [number, number, number, number];

/** Single detected damage area */
export interface DamageArea {
  /** Unique identifier for this damage area */
  id: string;
  /** Type of damage detected */
  type: DamageType;
  /** Confidence score 0-1 */
  confidence: number;
  /** Bounding box coordinates [x, y, width, height] */
  bbox: BoundingBox;
  /** Severity assessment */
  severity: SeverityLevel;
  /** Estimated area size in pixels */
  area?: number;
  /** Optional description */
  description?: string;
}

/** Result from single image damage analysis */
export interface DamageAnalysisResult {
  /** Whether any damage was detected */
  damageDetected: boolean;
  /** Array of detected damage areas */
  damageAreas: DamageArea[];
  /** Overall confidence score */
  overallConfidence: number;
  /** Processing timestamp */
  timestamp: string;
  /** Image metadata */
  metadata?: {
    width: number;
    height: number;
    format: string;
  };
  /** Analysis method used */
  method: 'tensorflow' | 'aws-rekognition' | 'mock';
}

/** Tire wear analysis result for a single tire section */
export interface TireSectionWear {
  /** Section identifier (inner, middle, outer) */
  section: 'inner' | 'middle' | 'outer';
  /** Wear percentage 0-100 */
  wearPercent: number;
  /** Tread depth in mm (estimated) */
  treadDepthMm?: number;
  /** Confidence in measurement */
  confidence: number;
}

/** Complete tire wear analysis result */
export interface TireWearResult {
  /** Whether tire wear was successfully analyzed */
  analyzed: boolean;
  /** Wear data by section */
  sections: TireSectionWear[];
  /** Average wear percentage */
  averageWearPercent: number;
  /** Overall tire condition rating */
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  /** Recommendation */
  recommendation: string;
  /** Timestamp */
  timestamp: string;
}

/** Cost breakdown for a single damage item */
export interface CostBreakdownItem {
  damageId: string;
  type: DamageType;
  severity: SeverityLevel;
  estimatedCost: number;
  details: string;
}

/** Repair cost estimation result */
export interface RepairCostEstimate {
  /** Total estimated cost */
  totalCost: number;
  /** Currency code */
  currency: 'EUR';
  /** Breakdown by damage area */
  breakdown: CostBreakdownItem[];
  /** Cost range (min-max) for uncertainty */
  costRange: {
    min: number;
    max: number;
  };
  /** Additional notes */
  notes?: string[];
  /** Confidence in estimate */
  estimateConfidence: number;
}

/** Input data for maintenance prediction */
export interface InspectionData {
  /** Vehicle age in years */
  vehicleAge: number;
  /** Total kilometers driven */
  totalKm: number;
  /** Previous maintenance issues */
  previousIssues: string[];
  /** Last service date */
  lastServiceDate?: string;
  /** Vehicle make and model */
  vehicleModel?: string;
  /** Engine type */
  engineType?: 'petrol' | 'diesel' | 'electric' | 'hybrid';
  /** Driving conditions */
  drivingConditions?: 'city' | 'highway' | 'mixed' | 'offroad';
  /** Current damage areas (from analysis) */
  currentDamage?: DamageArea[];
}

/** Predicted maintenance issue */
export interface PredictedIssue {
  /** Issue identifier */
  id: string;
  /** Component or system affected */
  component: string;
  /** Description of predicted issue */
  description: string;
  /** Probability 0-1 */
  probability: number;
  /** Estimated time until issue occurs (days) */
  estimatedTimeframeDays: number;
  /** Estimated repair cost */
  estimatedCost: number;
  /** Recommended action */
  recommendedAction: string;
}

/** Maintenance prediction result */
export interface MaintenancePrediction {
  /** List of predicted issues */
  predictedIssues: PredictedIssue[];
  /** Overall urgency score 1-10 */
  urgencyScore: number;
  /** Urgency label */
  urgencyLabel: 'low' | 'medium' | 'high' | 'critical';
  /** Recommended service date */
  recommendedServiceDate?: string;
  /** General maintenance tips */
  maintenanceTips: string[];
  /** Model confidence */
  confidence: number;
}

/** Options for batch processing */
export interface BatchAnalysisOptions {
  /** Maximum concurrent analyses */
  maxConcurrency?: number;
  /** Timeout per image in ms */
  timeoutMs?: number;
  /** Whether to continue on individual errors */
  continueOnError?: boolean;
}

/** Result of batch analysis */
export interface BatchAnalysisResult {
  /** Results by image index */
  results: (DamageAnalysisResult | { error: string; index: number })[];
  /** Summary statistics */
  summary: {
    total: number;
    successful: number;
    failed: number;
    damageDetected: number;
  };
  /** Processing time */
  processingTimeMs: number;
}

/** Service configuration options */
export interface AIServiceConfig {
  /** TensorFlow model URL/path */
  tfModelPath?: string;
  /** AWS Rekognition settings */
  awsConfig?: {
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
  /** Use mock implementation */
  useMock?: boolean;
  /** Confidence threshold override */
  confidenceThreshold?: number;
}

// ==================== Error Classes ====================

export class AIAnalysisError extends Error {
  constructor(
    message: string,
    public code: 'MODEL_LOAD_ERROR' | 'INFERENCE_ERROR' | 'INVALID_IMAGE' | 'TIMEOUT' | 'AWS_ERROR',
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AIAnalysisError';
  }
}

// ==================== Main Service Class ====================

export class AIService {
  private config: AIServiceConfig;
  private tfModel: unknown | null = null;
  private isInitialized = false;

  constructor(config: AIServiceConfig = {}) {
    this.config = {
      useMock: true, // Default to mock for development
      confidenceThreshold: CONFIDENCE_THRESHOLDS.MINIMUM,
      ...config,
    };
  }

  /**
   * Initialize the AI service and load models
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (!this.config.useMock) {
        // In real implementation, load TensorFlow.js model
        // this.tfModel = await tf.loadLayersModel(this.config.tfModelPath!);
        console.info('[AIService] Loading TensorFlow.js model...');
      }

      this.isInitialized = true;
      console.info('[AIService] Service initialized successfully');
    } catch (error) {
      throw new AIAnalysisError('Failed to initialize AI service', 'MODEL_LOAD_ERROR', {
        error: String(error),
      });
    }
  }

  // ==================== Core Analysis Methods ====================

  /**
   * Analyze a single image for vehicle damage
   * Analizza una singola immagine per rilevare danni al veicolo
   *
   * @param imageBase64 - Base64 encoded image
   * @returns Damage analysis result
   */
  async analyzeDamage(imageBase64: string): Promise<DamageAnalysisResult> {
    await this.ensureInitialized();

    try {
      // Validate image
      if (!this.isValidBase64Image(imageBase64)) {
        throw new AIAnalysisError('Invalid image format', 'INVALID_IMAGE');
      }

      if (this.config.useMock) {
        return this.mockAnalyzeDamage(imageBase64);
      }

      // Real implementation would use TensorFlow.js or AWS Rekognition
      return await this.performRealDamageAnalysis(imageBase64);
    } catch (error) {
      if (error instanceof AIAnalysisError) throw error;

      throw new AIAnalysisError('Damage analysis failed', 'INFERENCE_ERROR', {
        error: String(error),
      });
    }
  }

  /**
   * Analyze tire wear from image
   * Analizza l'usura delle gomme da immagine
   *
   * @param imageBase64 - Base64 encoded tire image
   * @returns Tire wear analysis
   */
  async analyzeTireWear(imageBase64: string): Promise<TireWearResult> {
    await this.ensureInitialized();

    try {
      if (!this.isValidBase64Image(imageBase64)) {
        throw new AIAnalysisError('Invalid image format', 'INVALID_IMAGE');
      }

      if (this.config.useMock) {
        return this.mockAnalyzeTireWear(imageBase64);
      }

      return await this.performRealTireAnalysis(imageBase64);
    } catch (error) {
      if (error instanceof AIAnalysisError) throw error;

      throw new AIAnalysisError('Tire wear analysis failed', 'INFERENCE_ERROR', {
        error: String(error),
      });
    }
  }

  /**
   * Estimate repair costs based on detected damage
   * Stima i costi di riparazione basati sui danni rilevati
   *
   * @param damageAreas - Detected damage areas
   * @returns Cost estimate
   */
  estimateRepairCost(damageAreas: DamageArea[]): RepairCostEstimate {
    if (!damageAreas.length) {
      return {
        totalCost: 0,
        currency: 'EUR',
        breakdown: [],
        costRange: { min: 0, max: 0 },
        estimateConfidence: 1,
        notes: ['Nessun danno rilevato'],
      };
    }

    const breakdown: CostBreakdownItem[] = [];
    let totalMin = 0;
    let totalMax = 0;

    for (const damage of damageAreas) {
      const costConfig = REPAIR_COSTS[damage.type];
      const severityMultiplier = this.getSeverityMultiplier(damage.severity);
      const confidenceFactor = damage.confidence;

      // Base cost calculation
      const baseEstimate = costConfig.base * costConfig.factor * severityMultiplier;

      // Adjust based on confidence
      const estimatedCost = Math.round(baseEstimate * confidenceFactor);

      // Cost range based on uncertainty
      const minCost = Math.round(estimatedCost * 0.8);
      const maxCost = Math.round(estimatedCost * 1.3);

      totalMin += minCost;
      totalMax += maxCost;

      breakdown.push({
        damageId: damage.id,
        type: damage.type,
        severity: damage.severity,
        estimatedCost,
        details: this.generateCostDetail(damage, estimatedCost),
      });
    }

    // Calculate overall confidence
    const avgConfidence =
      damageAreas.reduce((sum, d) => sum + d.confidence, 0) / damageAreas.length;

    return {
      totalCost: Math.round((totalMin + totalMax) / 2),
      currency: 'EUR',
      breakdown,
      costRange: { min: totalMin, max: totalMax },
      estimateConfidence: avgConfidence,
      notes: this.generateCostNotes(damageAreas),
    };
  }

  /**
   * Predict maintenance needs based on inspection data
   * Predice le necessità di manutenzione basate sui dati di ispezione
   *
   * @param inspectionData - Vehicle inspection data
   * @returns Maintenance predictions
   */
  async predictMaintenance(inspectionData: InspectionData): Promise<MaintenancePrediction> {
    await this.ensureInitialized();

    if (this.config.useMock) {
      return this.mockPredictMaintenance(inspectionData);
    }

    return this.performRealMaintenancePrediction(inspectionData);
  }

  /**
   * Batch analyze multiple photos in parallel
   * Analizza multiple foto in parallelo
   *
   * @param photos - Array of base64 encoded images
   * @param options - Batch processing options
   * @returns Batch analysis results
   */
  async batchAnalyzePhotos(
    photos: string[],
    options: BatchAnalysisOptions = {}
  ): Promise<BatchAnalysisResult> {
    await this.ensureInitialized();

    const { maxConcurrency = 4, timeoutMs = 30000, continueOnError = true } = options;

    const startTime = Date.now();
    const results: (DamageAnalysisResult | { error: string; index: number })[] = [];
    let successful = 0;
    let failed = 0;
    let damageDetected = 0;

    // Process in chunks to limit concurrency
    for (let i = 0; i < photos.length; i += maxConcurrency) {
      const chunk = photos.slice(i, i + maxConcurrency);
      const chunkPromises = chunk.map(async (photo, chunkIndex) => {
        const index = i + chunkIndex;

        try {
          const result = await Promise.race([
            this.analyzeDamage(photo),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), timeoutMs)
            ),
          ]);

          successful++;
          if (result.damageDetected) damageDetected++;
          return { index, result };
        } catch (error) {
          failed++;
          if (!continueOnError) throw error;
          return {
            index,
            result: { error: String(error), index } as unknown as DamageAnalysisResult,
          };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);

      // Store results in correct order
      for (const { index, result } of chunkResults) {
        results[index] = result;
      }
    }

    return {
      results,
      summary: {
        total: photos.length,
        successful,
        failed,
        damageDetected,
      },
      processingTimeMs: Date.now() - startTime,
    };
  }

  // ==================== Private Helper Methods ====================

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private isValidBase64Image(base64: string): boolean {
    // Basic validation - check if it's a valid base64 string
    const base64Regex = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;
    return base64Regex.test(base64) || /^[A-Za-z0-9+/=]+$/.test(base64);
  }

  private getSeverityMultiplier(severity: SeverityLevel): number {
    const multipliers = { minor: 0.7, moderate: 1.0, severe: 1.5 };
    return multipliers[severity];
  }

  private generateCostDetail(damage: DamageArea, cost: number): string {
    const typeLabels: Record<DamageType, string> = {
      dent: 'Ammaccatura',
      scratch: 'Graffio',
      rust: 'Ruggine',
      crack: 'Crepa',
    };

    return `${typeLabels[damage.type]} ${damage.severity}: stima €${cost}`;
  }

  private generateCostNotes(damageAreas: DamageArea[]): string[] {
    const notes: string[] = [];

    const rustCount = damageAreas.filter(d => d.type === 'rust').length;
    const crackCount = damageAreas.filter(d => d.type === 'crack').length;

    if (rustCount > 0) {
      notes.push(`Rilevata ruggine in ${rustCount} area/e - consigliato intervento tempestivo`);
    }

    if (crackCount > 0) {
      notes.push(`Rilevate ${crackCount} crepe/e - potrebbero richiedere sostituzione parti`);
    }

    const highSeverity = damageAreas.filter(d => d.severity === 'severe').length;
    if (highSeverity > 0) {
      notes.push(`${highSeverity} danno/i di gravità elevata rilevato/i`);
    }

    return notes;
  }

  // ==================== Mock Implementations ====================

  private mockAnalyzeDamage(imageBase64: string): DamageAnalysisResult {
    // Simulate processing delay
    const seed = imageBase64.length % 10;

    // Mock detection logic based on image characteristics
    const damageAreas: DamageArea[] = [];

    if (seed > 3) {
      damageAreas.push({
        id: generateId(),
        type: 'scratch',
        confidence: 0.7 + seed * 0.02,
        bbox: [100, 150, 200, 50],
        severity: seed > 6 ? 'moderate' : 'minor',
        area: 10000,
        description: 'Graffio superficiale sulla carrozzeria',
      });
    }

    if (seed > 6) {
      damageAreas.push({
        id: generateId(),
        type: 'dent',
        confidence: 0.8 + seed * 0.01,
        bbox: [300, 200, 150, 150],
        severity: 'moderate',
        area: 22500,
        description: 'Ammaccatura sul parafango',
      });
    }

    if (seed === 9) {
      damageAreas.push({
        id: generateId(),
        type: 'rust',
        confidence: 0.85,
        bbox: [50, 300, 100, 80],
        severity: 'minor',
        area: 8000,
        description: 'Ruggine superficiale',
      });
    }

    return {
      damageDetected: damageAreas.length > 0,
      damageAreas,
      overallConfidence:
        damageAreas.length > 0
          ? damageAreas.reduce((sum, d) => sum + d.confidence, 0) / damageAreas.length
          : 0,
      timestamp: new Date().toISOString(),
      metadata: {
        width: 1920,
        height: 1080,
        format: 'jpeg',
      },
      method: 'mock',
    };
  }

  private mockAnalyzeTireWear(imageBase64: string): TireWearResult {
    const seed = imageBase64.length % 20;

    // Simulate wear pattern
    const innerWear = Math.min(100, 10 + seed * 3);
    const middleWear = Math.min(100, 8 + seed * 2.5);
    const outerWear = Math.min(100, 12 + seed * 3.5);

    const averageWear = (innerWear + middleWear + outerWear) / 3;

    let condition: TireWearResult['condition'];
    let recommendation: string;

    if (averageWear < 20) {
      condition = 'excellent';
      recommendation = 'Pneumatico in ottime condizioni';
    } else if (averageWear < 40) {
      condition = 'good';
      recommendation = 'Pneumatico in buone condizioni, monitorare usura';
    } else if (averageWear < 60) {
      condition = 'fair';
      recommendation = 'Usura moderata, consigliato controllo periodico';
    } else if (averageWear < 80) {
      condition = 'poor';
      recommendation = 'Usura elevata, pianificare sostituzione';
    } else {
      condition = 'critical';
      recommendation = 'SOSTITUZIONE IMMEDIATA NECESSARIA';
    }

    return {
      analyzed: true,
      sections: [
        {
          section: 'inner',
          wearPercent: Math.round(innerWear),
          treadDepthMm: Math.max(0, 8 - innerWear / 10),
          confidence: 0.85,
        },
        {
          section: 'middle',
          wearPercent: Math.round(middleWear),
          treadDepthMm: Math.max(0, 8 - middleWear / 10),
          confidence: 0.9,
        },
        {
          section: 'outer',
          wearPercent: Math.round(outerWear),
          treadDepthMm: Math.max(0, 8 - outerWear / 10),
          confidence: 0.85,
        },
      ],
      averageWearPercent: Math.round(averageWear),
      condition,
      recommendation,
      timestamp: new Date().toISOString(),
    };
  }

  private mockPredictMaintenance(inspectionData: InspectionData): MaintenancePrediction {
    const predictedIssues: PredictedIssue[] = [];
    const { vehicleAge, totalKm, previousIssues } = inspectionData;

    // Simple rule-based predictions
    if (vehicleAge > 5 || totalKm > 100000) {
      predictedIssues.push({
        id: generateId(),
        component: 'Freni',
        description: 'Usura pastiglie freni probabile',
        probability: Math.min(0.9, vehicleAge / 10 + totalKm / 200000),
        estimatedTimeframeDays: 90,
        estimatedCost: 250,
        recommendedAction: 'Verifica spessore pastiglie e dischi',
      });
    }

    if (totalKm > 80000) {
      predictedIssues.push({
        id: generateId(),
        component: 'Cinghia distribuzione',
        description: 'Sostituzione cinghia distribuzione consigliata',
        probability: 0.75,
        estimatedTimeframeDays: 180,
        estimatedCost: 450,
        recommendedAction: 'Pianificare sostituzione cinghia distribuzione',
      });
    }

    if (vehicleAge > 3) {
      predictedIssues.push({
        id: generateId(),
        component: 'Batteria',
        description: 'Degradazione batteria attesa',
        probability: Math.min(0.8, vehicleAge / 8),
        estimatedTimeframeDays: 365,
        estimatedCost: 150,
        recommendedAction: 'Test batteria al prossimo tagliando',
      });
    }

    // Add issues based on previous history
    if (previousIssues.includes('olio_perdita')) {
      predictedIssues.push({
        id: generateId(),
        component: 'Guarnizioni',
        description: 'Recidiva perdita olio possibile',
        probability: 0.6,
        estimatedTimeframeDays: 120,
        estimatedCost: 200,
        recommendedAction: 'Monitorare livello olio settimanalmente',
      });
    }

    // Calculate urgency score
    const avgProbability =
      predictedIssues.length > 0
        ? predictedIssues.reduce((sum, i) => sum + i.probability, 0) / predictedIssues.length
        : 0;
    const urgencyScore = Math.round(avgProbability * 10);

    const urgencyLabel: MaintenancePrediction['urgencyLabel'] =
      urgencyScore <= 3
        ? 'low'
        : urgencyScore <= 6
          ? 'medium'
          : urgencyScore <= 8
            ? 'high'
            : 'critical';

    return {
      predictedIssues,
      urgencyScore,
      urgencyLabel,
      recommendedServiceDate:
        urgencyScore > 5
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : undefined,
      maintenanceTips: [
        'Verificare regolarmente i livelli dei fluidi',
        'Controllare la pressione degli pneumatici mensilmente',
        'Pianificare tagliandi periodici secondo il manuale',
      ],
      confidence: 0.75,
    };
  }

  // ==================== Real Implementation Placeholders ====================

  private async performRealDamageAnalysis(imageBase64: string): Promise<DamageAnalysisResult> {
    // Placeholder for TensorFlow.js or AWS Rekognition integration
    // This would:
    // 1. Preprocess the image
    // 2. Run inference with loaded model
    // 3. Post-process results
    // 4. Return structured damage data

    throw new AIAnalysisError('Real ML analysis not yet implemented', 'INFERENCE_ERROR', {
      message: 'Use useMock: true for development',
    });
  }

  private async performRealTireAnalysis(imageBase64: string): Promise<TireWearResult> {
    // Placeholder for tire wear analysis using computer vision
    // Would measure tread depth patterns and calculate wear

    throw new AIAnalysisError('Real tire analysis not yet implemented', 'INFERENCE_ERROR', {
      message: 'Use useMock: true for development',
    });
  }

  private async performRealMaintenancePrediction(
    inspectionData: InspectionData
  ): Promise<MaintenancePrediction> {
    // Placeholder for ML model prediction
    // Would use trained model to predict maintenance needs

    throw new AIAnalysisError(
      'Real maintenance prediction not yet implemented',
      'INFERENCE_ERROR',
      { message: 'Use useMock: true for development' }
    );
  }
}

// ==================== Convenience Functions ====================

let defaultService: AIService | null = null;

/**
 * Get or create the default AI service instance
 */
export function getAIService(config?: AIServiceConfig): AIService {
  if (!defaultService) {
    defaultService = new AIService(config);
  }
  return defaultService;
}

/**
 * Analyze damage in a single image (convenience function)
 */
export async function analyzeDamage(imageBase64: string): Promise<DamageAnalysisResult> {
  return getAIService().analyzeDamage(imageBase64);
}

/**
 * Analyze tire wear (convenience function)
 */
export async function analyzeTireWear(imageBase64: string): Promise<TireWearResult> {
  return getAIService().analyzeTireWear(imageBase64);
}

/**
 * Estimate repair costs (convenience function)
 */
export function estimateRepairCost(damageAreas: DamageArea[]): RepairCostEstimate {
  return getAIService().estimateRepairCost(damageAreas);
}

/**
 * Predict maintenance needs (convenience function)
 */
export async function predictMaintenance(
  inspectionData: InspectionData
): Promise<MaintenancePrediction> {
  return getAIService().predictMaintenance(inspectionData);
}

/**
 * Batch analyze multiple photos (convenience function)
 */
export async function batchAnalyzePhotos(
  photos: string[],
  options?: BatchAnalysisOptions
): Promise<BatchAnalysisResult> {
  return getAIService().batchAnalyzePhotos(photos, options);
}
