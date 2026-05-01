/**
 * MechMind OS - AI Diagnostic Assistant Service
 *
 * Analyzes DTC codes and symptoms using AI, logs decisions
 * for EU AI Act compliance, and generates estimates from diagnoses.
 */

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/services/prisma.service';
import { AiDecisionLog, Prisma } from '@prisma/client';
import { VehicleInfoDto, DtcDiagnosisResult, RecommendedRepair } from './dto/analyze-dtc.dto';
import { SymptomDiagnosisResult } from './dto/analyze-symptoms.dto';

interface AiProviderResponse {
  content: string;
  model: string;
  processingTimeMs: number;
}

@Injectable()
export class AiDiagnosticService {
  private readonly logger = new Logger(AiDiagnosticService.name);
  private readonly aiProvider: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.aiProvider = this.config.get<string>('AI_PROVIDER', 'mock');
  }

  /**
   * Analyze DTC codes using AI and return structured diagnosis.
   */
  async analyzeDtcCodes(
    tenantId: string,
    codes: string[],
    vehicleInfo: VehicleInfoDto,
  ): Promise<DtcDiagnosisResult> {
    const prompt = this.buildDtcPrompt(codes, vehicleInfo);
    const aiResponse = await this.callAiProvider(prompt, tenantId);

    const parsed = this.parseDtcResponse(aiResponse.content, codes, vehicleInfo);

    // Log to AiDecisionLog for EU AI Act compliance
    const decisionLog = await this.prisma.aiDecisionLog.create({
      data: {
        tenantId,
        featureName: 'DIAGNOSTIC_ASSISTANT',
        modelUsed: aiResponse.model,
        inputSummary: `DTC codes: ${codes.join(', ')} | Vehicle: ${vehicleInfo.make} ${vehicleInfo.model} ${vehicleInfo.year}`,
        outputSummary: `Diagnosis: ${parsed.diagnosis} | Severity: ${parsed.severity} | Repairs: ${parsed.recommendedRepairs.length}`,
        confidence: new Prisma.Decimal(parsed.confidence),
        entityType: 'diagnostic',
        processingTimeMs: aiResponse.processingTimeMs,
      },
    });

    return {
      ...parsed,
      diagnosisId: decisionLog.id,
      modelUsed: aiResponse.model,
    };
  }

  /**
   * Analyze natural language symptoms using AI.
   */
  async analyzeSymptoms(
    tenantId: string,
    symptoms: string,
    vehicleInfo: VehicleInfoDto,
  ): Promise<SymptomDiagnosisResult> {
    const prompt = this.buildSymptomsPrompt(symptoms, vehicleInfo);

    const aiResponse = await this.callAiProvider(prompt, tenantId);

    const parsed = this.parseSymptomsResponse(aiResponse.content, symptoms, vehicleInfo);

    // Log to AiDecisionLog for EU AI Act compliance
    const decisionLog = await this.prisma.aiDecisionLog.create({
      data: {
        tenantId,
        featureName: 'DIAGNOSTIC_ASSISTANT',
        modelUsed: aiResponse.model,
        inputSummary: `Symptoms: "${symptoms.substring(0, 200)}" | Vehicle: ${vehicleInfo.make} ${vehicleInfo.model} ${vehicleInfo.year}`,
        outputSummary: `Diagnosis: ${parsed.diagnosis} | Causes: ${parsed.probableCauses.length} | DTC suggestions: ${parsed.suggestedDtcCodes.length}`,
        confidence: new Prisma.Decimal(parsed.confidence),
        entityType: 'diagnostic',
        processingTimeMs: aiResponse.processingTimeMs,
      },
    });

    return {
      ...parsed,
      diagnosisId: decisionLog.id,
      modelUsed: aiResponse.model,
    };
  }

  /**
   * Get diagnostic history for a vehicle.
   */
  async getDiagnosticHistory(
    tenantId: string,
    vehicleId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<AiDecisionLog[]> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, tenantId },
    });

    if (!vehicle) {
      throw new NotFoundException(`Veicolo ${vehicleId} non trovato`);
    }

    return this.prisma.aiDecisionLog.findMany({
      where: {
        tenantId,
        featureName: 'DIAGNOSTIC_ASSISTANT',
        inputSummary: {
          contains: `${vehicle.make} ${vehicle.model}`,
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  /**
   * Auto-generate an estimate from an AI diagnosis.
   */
  async createEstimateFromDiagnosis(
    tenantId: string,
    diagnosisId: string,
  ): Promise<{ estimateId: string; totalCents: number; lineCount: number }> {
    const diagnosis = await this.prisma.aiDecisionLog.findFirst({
      where: { id: diagnosisId, tenantId, featureName: 'DIAGNOSTIC_ASSISTANT' },
    });

    if (!diagnosis) {
      throw new NotFoundException(`Diagnosi IA ${diagnosisId} non trovata`);
    }

    // Parse the output to extract repair recommendations
    const repairs = this.extractRepairsFromOutput(diagnosis.outputSummary);

    // Generate estimate number
    const year = new Date().getFullYear();
    const count = await this.prisma.estimate.count({
      where: { tenantId },
    });
    const estimateNumber = `EST-${year}-${String(count + 1).padStart(4, '0')}`;

    // Calculate totals
    const vatRate = new Prisma.Decimal(22);
    let subtotalCents = new Prisma.Decimal(0);
    const lines: Array<{
      type: 'LABOR' | 'PART';
      description: string;
      quantity: number;
      unitPriceCents: Prisma.Decimal;
      totalCents: Prisma.Decimal;
      vatRate: Prisma.Decimal;
      position: number;
      tier: 'STANDARD';
    }> = [];

    for (let i = 0; i < repairs.length; i++) {
      // eslint-disable-next-line security/detect-object-injection
      const repair = repairs[i];
      // Parts line
      if (repair.estimatedPartsCents > 0) {
        const partTotal = new Prisma.Decimal(repair.estimatedPartsCents);
        lines.push({
          type: 'PART',
          description: `Ricambi: ${repair.description}`,
          quantity: 1,
          unitPriceCents: partTotal,
          totalCents: partTotal,
          vatRate,
          position: i * 2,
          tier: 'STANDARD',
        });
        subtotalCents = subtotalCents.add(partTotal);
      }
      // Labor line
      if (repair.estimatedLaborHours > 0) {
        const laborRateCents = new Prisma.Decimal(5000); // 50 EUR/h default
        const laborTotal = laborRateCents.mul(repair.estimatedLaborHours);
        lines.push({
          type: 'LABOR',
          description: `Manodopera: ${repair.description}`,
          quantity: 1,
          unitPriceCents: laborTotal,
          totalCents: laborTotal,
          vatRate,
          position: i * 2 + 1,
          tier: 'STANDARD',
        });
        subtotalCents = subtotalCents.add(laborTotal);
      }
    }

    const vatCents = subtotalCents.mul(vatRate).div(100);
    const totalCents = subtotalCents.add(vatCents);

    // Create estimate with lines in a transaction
    const estimate = await this.prisma.$transaction(async tx => {
      const est = await tx.estimate.create({
        data: {
          tenantId,
          estimateNumber,
          customerId: '', // Will need to be linked by the user
          createdBy: 'ai-diagnostic-assistant',
          status: 'DRAFT',
          subtotalCents,
          vatCents,
          totalCents,
          discountCents: new Prisma.Decimal(0),
          lines: {
            create: lines,
          },
        },
        include: { lines: true },
      });
      return est;
    });

    return {
      estimateId: estimate.id,
      totalCents: Number(totalCents),
      lineCount: lines.length,
    };
  }

  /**
   * Call the configured AI provider (mock in dev, real in production).
   */
  private async callAiProvider(prompt: string, _tenantId: string): Promise<AiProviderResponse> {
    const startTime = Date.now();

    if (this.aiProvider === 'mock') {
      return this.getMockResponse(prompt, startTime);
    }

    // Production: call configured provider
    // Extensible for OpenAI, Anthropic, etc.
    const apiKey = this.config.get<string>('AI_API_KEY');
    if (!apiKey) {
      this.logger.warn('AI_API_KEY non configurata, utilizzo modalita mock');
      return this.getMockResponse(prompt, startTime);
    }

    // Default to OpenAI-compatible API
    const apiUrl = this.config.get<string>(
      'AI_API_URL',
      'https://api.openai.com/v1/chat/completions',
    );
    const modelName = this.config.get<string>('AI_MODEL', 'gpt-4');

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'system',
              content:
                'Sei un esperto diagnostico automobilistico. Rispondi sempre in JSON strutturato.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        this.logger.error(`AI provider error: ${response.status} ${response.statusText}`);
        return this.getMockResponse(prompt, startTime);
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
        model: string;
      };

      return {
        content: data.choices[0]?.message?.content ?? '{}',
        model: data.model ?? modelName,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`AI provider call failed: ${error}`);
      return this.getMockResponse(prompt, startTime);
    }
  }

  private getMockResponse(prompt: string, startTime: number): AiProviderResponse {
    const isDtc = prompt.includes('DTC');

    if (isDtc) {
      return {
        content: JSON.stringify({
          diagnosis: 'Misfire multiplo con problemi catalizzatore',
          severity: 'HIGH',
          probableCause:
            'Candele usurate o bobine difettose causano misfire, che a sua volta danneggia il catalizzatore',
          recommendedRepairs: [
            {
              description: 'Sostituzione candele di accensione',
              estimatedPartsCents: 8000,
              estimatedLaborHours: 1,
              priority: 'HIGH',
            },
            {
              description: 'Verifica e sostituzione bobine accensione',
              estimatedPartsCents: 15000,
              estimatedLaborHours: 1.5,
              priority: 'HIGH',
            },
            {
              description: 'Diagnosi catalizzatore',
              estimatedPartsCents: 0,
              estimatedLaborHours: 0.5,
              priority: 'MEDIUM',
            },
          ],
          additionalTests: [
            'Test compressione cilindri',
            'Analisi gas di scarico',
            'Verifica sensori O2',
          ],
          confidence: 0.82,
        }),
        model: 'mock-diagnostic-v1',
        processingTimeMs: Date.now() - startTime,
      };
    }

    return {
      content: JSON.stringify({
        diagnosis: 'Possibile problema al sistema di alimentazione o accensione',
        severity: 'MEDIUM',
        probableCauses: ['Filtro aria intasato', 'Iniettori sporchi', 'Sensore MAF difettoso'],
        suggestedDtcCodes: ['P0171', 'P0174', 'P0101'],
        recommendedActions: [
          // eslint-disable-next-line sonarjs/no-duplicate-string
          'Scansione OBD-II completa',
          'Verifica filtro aria',
          'Pulizia iniettori',
          'Test sensore MAF',
        ],
        confidence: 0.68,
      }),
      model: 'mock-diagnostic-v1',
      processingTimeMs: Date.now() - startTime,
    };
  }

  private buildDtcPrompt(codes: string[], vehicleInfo: VehicleInfoDto): string {
    // eslint-disable-next-line sonarjs/no-nested-template-literals
    return `Analizza i seguenti codici DTC per un ${vehicleInfo.make} ${vehicleInfo.model} ${vehicleInfo.year}${vehicleInfo.mileage ? ` con ${vehicleInfo.mileage} km` : ''}:

Codici DTC: ${codes.join(', ')}

Rispondi in JSON con: diagnosis, severity (CRITICAL/HIGH/MEDIUM/LOW), probableCause, recommendedRepairs (array con description, estimatedPartsCents, estimatedLaborHours, priority), additionalTests (array di stringhe), confidence (0-1).`;
  }

  private buildSymptomsPrompt(symptoms: string, vehicleInfo: VehicleInfoDto): string {
    // eslint-disable-next-line sonarjs/no-nested-template-literals
    return `Analizza i seguenti sintomi per un ${vehicleInfo.make} ${vehicleInfo.model} ${vehicleInfo.year}${vehicleInfo.mileage ? ` con ${vehicleInfo.mileage} km` : ''}:

Sintomi riportati dal cliente: "${symptoms}"

Rispondi in JSON con: diagnosis, severity (CRITICAL/HIGH/MEDIUM/LOW), probableCauses (array), suggestedDtcCodes (array), recommendedActions (array), confidence (0-1).`;
  }

  private parseDtcResponse(
    content: string,
    codes: string[],
    vehicleInfo: VehicleInfoDto,
  ): Omit<DtcDiagnosisResult, 'diagnosisId' | 'modelUsed'> {
    try {
      const parsed = JSON.parse(content) as {
        diagnosis?: string;
        severity?: string;
        probableCause?: string;
        recommendedRepairs?: RecommendedRepair[];
        additionalTests?: string[];
        confidence?: number;
      };
      return {
        diagnosis: parsed.diagnosis ?? `Analisi codici DTC: ${codes.join(', ')}`,
        severity: this.validateSeverity(parsed.severity),
        probableCause: parsed.probableCause ?? 'Causa da determinare con ulteriori test',
        recommendedRepairs: Array.isArray(parsed.recommendedRepairs)
          ? parsed.recommendedRepairs
          : [],
        additionalTests: Array.isArray(parsed.additionalTests) ? parsed.additionalTests : [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      };
    } catch {
      this.logger.warn('Failed to parse AI DTC response, returning defaults');
      return {
        diagnosis: `Analisi codici DTC: ${codes.join(', ')} per ${vehicleInfo.make} ${vehicleInfo.model}`,
        severity: 'MEDIUM',
        probableCause: 'Risposta AI non parsabile - revisione manuale necessaria',
        recommendedRepairs: [],
        additionalTests: ['Scansione OBD-II completa', 'Ispezione visiva'],
        confidence: 0.3,
      };
    }
  }

  private parseSymptomsResponse(
    content: string,
    symptoms: string,
    vehicleInfo: VehicleInfoDto,
  ): Omit<SymptomDiagnosisResult, 'diagnosisId' | 'modelUsed'> {
    try {
      const parsed = JSON.parse(content) as {
        diagnosis?: string;
        severity?: string;
        probableCauses?: string[];
        suggestedDtcCodes?: string[];
        recommendedActions?: string[];
        confidence?: number;
      };
      return {
        diagnosis: parsed.diagnosis ?? 'Analisi sintomi completata',
        severity: this.validateSeverity(parsed.severity),
        probableCauses: Array.isArray(parsed.probableCauses) ? parsed.probableCauses : [],
        suggestedDtcCodes: Array.isArray(parsed.suggestedDtcCodes) ? parsed.suggestedDtcCodes : [],
        recommendedActions: Array.isArray(parsed.recommendedActions)
          ? parsed.recommendedActions
          : [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      };
    } catch {
      this.logger.warn('Failed to parse AI symptoms response, returning defaults');
      return {
        diagnosis: `Analisi sintomi per ${vehicleInfo.make} ${vehicleInfo.model}`,
        severity: 'MEDIUM',
        probableCauses: ['Causa da determinare con diagnosi strumentale'],
        suggestedDtcCodes: [],
        recommendedActions: ['Scansione OBD-II completa', 'Ispezione visiva'],
        confidence: 0.3,
      };
    }
  }

  private validateSeverity(severity: string | undefined): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    const valid = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
    if (severity && valid.includes(severity as (typeof valid)[number])) {
      return severity as (typeof valid)[number];
    }
    return 'MEDIUM';
  }

  private extractRepairsFromOutput(outputSummary: string): RecommendedRepair[] {
    // The output summary is a condensed string; return a default repair line
    // In a real scenario this would parse the stored AI response
    // eslint-disable-next-line sonarjs/prefer-regexp-exec
    const repairCount = outputSummary.match(/Repairs: (\d+)/);
    const count = repairCount ? parseInt(repairCount[1], 10) : 1;

    const repairs: RecommendedRepair[] = [];
    for (let i = 0; i < count; i++) {
      repairs.push({
        description: `Riparazione consigliata ${i + 1} (da diagnosi IA)`,
        estimatedPartsCents: 5000,
        estimatedLaborHours: 1,
        priority: 'MEDIUM',
      });
    }
    return repairs;
  }
}
