/**
 * InspectionForm - Multi-step Vehicle Inspection Form
 *
 * A comprehensive 7-step form for vehicle inspections including:
 * 1. Header Info (Vehicle, Type, Inspector, Location)
 * 2. Exterior Inspection (Photos, 360° video, Damage annotation)
 * 3. Interior Inspection (Photos, Odometer, Infotainment)
 * 4. Sensory Inspection (Humidity, Odors, Mold risk - NEW)
 * 5. Engine & Mechanical (Fluids, Belts, Battery)
 * 6. Tires & Suspension (Tire wear, Pressure, Suspension)
 * 7. Electronics & OBD (Error codes, Electronics check)
 *
 * @module components/inspections/InspectionForm
 * @version 1.0.0
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useForm, FormProvider, useWatch, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Car,
  Camera,
  Video,
  Gauge,
  Droplets,
  Wrench,
  Circle,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  MapPin,
  Search,
  User,
  Thermometer,
  Wind,
  AlertTriangle,
  CheckCircle,
  Upload,
  X,
  RotateCw,
  Battery,
  Zap,
  Activity,
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

// Services & Types
import {
  calculateMoldRisk,
  MoldRiskLevel,
  SmokeIntensity,
  BlockageSeverity,
  FilterCondition,
  type OdorData,
  type MoistureData,
  type ACData,
} from '@/lib/services/sensoryService';

// =============================================================================
// Enums & Constants
// =============================================================================

export enum InspectionType {
  PRE_PURCHASE = 'PRE_PURCHASE',
  PERIODIC = 'PERIODIC',
  PRE_SALE = 'PRE_SALE',
  ACCIDENT = 'ACCIDENT',
  WARRANTY = 'WARRANTY',
}

export enum InspectionStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

const INSPECTION_TYPE_LABELS: Record<InspectionType, string> = {
  [InspectionType.PRE_PURCHASE]: 'Pre-acquisto',
  [InspectionType.PERIODIC]: 'Periodica',
  [InspectionType.PRE_SALE]: 'Pre-vendita',
  [InspectionType.ACCIDENT]: 'Incidente',
  [InspectionType.WARRANTY]: 'Garanzia',
};

const STEP_LABELS = [
  'Informazioni',
  'Esterno',
  'Interno',
  'Sensoriale',
  'Motore',
  'Pneumatici e Sospensioni',
  'Elettronica',
];

// =============================================================================
// Zod Schemas
// =============================================================================

const photoSchema = z.object({
  id: z.string(),
  url: z.string(),
  file: z.instanceof(File).optional(),
  description: z.string().optional(),
  aiDetectedDamage: z.boolean().optional(),
  damageDescription: z.string().optional(),
});

const damageAnnotationSchema = z.object({
  id: z.string(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  text: z.string(),
  color: z.string(),
  severity: z.enum(['minor', 'moderate', 'severe']),
});

const headerInfoSchema = z.object({
  vehicleId: z.string().min(1, 'Veicolo obbligatorio'),
  vehicleSearchQuery: z.string().optional(),
  inspectionType: z.nativeEnum(InspectionType),
  inspectorId: z.string().min(1, 'Ispettore obbligatorio'),
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    address: z.string().optional(),
  }),
});

const exteriorInspectionSchema = z.object({
  photos: z.array(photoSchema).max(20, 'Maximum 20 photos allowed'),
  walkaroundVideoUrl: z.string().optional(),
  annotations: z.array(damageAnnotationSchema),
  hasDamage: z.boolean(),
  damageDescription: z.string().max(1000).optional(),
});

const interiorInspectionSchema = z.object({
  photos: z.array(photoSchema).max(10),
  odometerReading: z.number().min(0, 'Odometer must be positive'),
  infotainmentWorking: z.boolean(),
  infotainmentNotes: z.string().max(500).optional(),
  seatCondition: z.enum(['excellent', 'good', 'fair', 'poor']),
  dashboardCondition: z.enum(['excellent', 'good', 'fair', 'poor']),
});

const sensoryInspectionSchema = z.object({
  humidity: z.number().min(0).max(100),
  odors: z.object({
    smokeDetected: z.boolean(),
    smokeIntensity: z.number().min(1).max(10).optional(),
    petSmell: z.boolean(),
    moldDetected: z.boolean(),
    mustySmell: z.boolean(),
  }),
  acDrainTestPassed: z.boolean(),
  acBlockage: z.nativeEnum(BlockageSeverity),
  filterCondition: z.nativeEnum(FilterCondition),
  notes: z.string().max(1000).optional(),
});

const engineMechanicalSchema = z.object({
  fluidLevels: z.object({
    engineOil: z.enum(['full', 'ok', 'low', 'empty']),
    coolant: z.enum(['full', 'ok', 'low', 'empty']),
    brakeFluid: z.enum(['full', 'ok', 'low', 'empty']),
    powerSteering: z.enum(['full', 'ok', 'low', 'empty']),
    transmission: z.enum(['full', 'ok', 'low', 'empty']),
  }),
  beltCondition: z.enum(['excellent', 'good', 'fair', 'poor', 'needs_replacement']),
  beltTension: z.enum(['proper', 'loose', 'too_tight']),
  batteryTestResult: z.object({
    voltage: z.number().min(0).max(20),
    coldCrankingAmps: z.number().min(0),
    health: z.enum(['excellent', 'good', 'fair', 'poor', 'replace']),
  }),
  engineNotes: z.string().max(1000).optional(),
});

const tireSchema = z.object({
  treadDepth: z.number().min(0).max(20),
  pressure: z.number().min(0).max(100),
  condition: z.enum(['excellent', 'good', 'fair', 'poor', 'replace']),
  aiWearAnalysis: z
    .object({
      wearPattern: z.enum(['even', 'inner_wear', 'outer_wear', 'cupping', 'flat_spots']),
      estimatedRemainingLife: z.number().min(0).max(100),
      recommendation: z.string(),
    })
    .optional(),
  photos: z.array(photoSchema),
});

const tiresSuspensionSchema = z.object({
  tires: z.object({
    frontLeft: tireSchema,
    frontRight: tireSchema,
    rearLeft: tireSchema,
    rearRight: tireSchema,
    spare: tireSchema.optional(),
  }),
  suspension: z.object({
    frontShocks: z.enum(['excellent', 'good', 'fair', 'poor', 'leaking']),
    rearShocks: z.enum(['excellent', 'good', 'fair', 'poor', 'leaking']),
    springs: z.enum(['excellent', 'good', 'fair', 'poor', 'broken']),
    alignment: z.enum(['good', 'slight_pull', 'needs_alignment']),
  }),
});

const electronicsOBDSchema = z.object({
  obdCodes: z.array(
    z.object({
      code: z.string(),
      description: z.string(),
      severity: z.enum(['info', 'minor', 'major', 'critical']),
    })
  ),
  electronicsCheck: z.object({
    lightsWorking: z.boolean(),
    windowsWorking: z.boolean(),
    locksWorking: z.boolean(),
    acWorking: z.boolean(),
    heatedSeatsWorking: z.boolean().optional(),
    sunroofWorking: z.boolean().optional(),
  }),
  obdNotes: z.string().max(1000).optional(),
});

const inspectionFormSchema = z.object({
  header: headerInfoSchema,
  exterior: exteriorInspectionSchema,
  interior: interiorInspectionSchema,
  sensory: sensoryInspectionSchema,
  engine: engineMechanicalSchema,
  tiresSuspension: tiresSuspensionSchema,
  electronics: electronicsOBDSchema,
  status: z.nativeEnum(InspectionStatus).default(InspectionStatus.DRAFT),
});

export type InspectionFormData = z.infer<typeof inspectionFormSchema>;
export type Photo = z.infer<typeof photoSchema>;
export type DamageAnnotation = z.infer<typeof damageAnnotationSchema>;

// =============================================================================
// Default Values
// =============================================================================

const defaultFormValues = {
  status: InspectionStatus.DRAFT,
  header: {
    location: {},
  },
  exterior: {
    photos: [],
    annotations: [],
    hasDamage: false,
  },
  interior: {
    photos: [],
    infotainmentWorking: true,
    seatCondition: 'good',
    dashboardCondition: 'good',
  },
  sensory: {
    humidity: 45,
    odors: {
      smokeDetected: false,
      petSmell: false,
      moldDetected: false,
      mustySmell: false,
    },
    acDrainTestPassed: true,
    acBlockage: BlockageSeverity.NONE,
    filterCondition: FilterCondition.GOOD,
  },
  engine: {
    fluidLevels: {
      engineOil: 'ok',
      coolant: 'ok',
      brakeFluid: 'ok',
      powerSteering: 'ok',
      transmission: 'ok',
    },
    beltCondition: 'good',
    beltTension: 'proper',
    batteryTestResult: {
      voltage: 12.6,
      coldCrankingAmps: 600,
      health: 'good',
    },
  },
  tiresSuspension: {
    tires: {
      frontLeft: { treadDepth: 6, pressure: 32, condition: 'good', photos: [] },
      frontRight: { treadDepth: 6, pressure: 32, condition: 'good', photos: [] },
      rearLeft: { treadDepth: 6, pressure: 32, condition: 'good', photos: [] },
      rearRight: { treadDepth: 6, pressure: 32, condition: 'good', photos: [] },
    },
    suspension: {
      frontShocks: 'good',
      rearShocks: 'good',
      springs: 'good',
      alignment: 'good',
    },
  },
  electronics: {
    obdCodes: [],
    electronicsCheck: {
      lightsWorking: true,
      windowsWorking: true,
      locksWorking: true,
      acWorking: true,
      heatedSeatsWorking: true,
      sunroofWorking: true,
    },
  },
};

// =============================================================================
// Props Interface
// =============================================================================

export interface InspectionFormProps {
  initialData?: Partial<InspectionFormData>;
  onSubmit: (data: InspectionFormData) => Promise<void>;
  onSaveDraft: (data: InspectionFormData) => Promise<void>;
  vehicles: Array<{
    id: string;
    vin: string;
    plate: string;
    make: string;
    model: string;
    year: number;
  }>;
  inspectors: Array<{ id: string; name: string; role: string }>;
  isLoading?: boolean;
  className?: string;
}

// =============================================================================
// Main Component
// =============================================================================

export function InspectionForm({
  initialData,
  onSubmit,
  onSaveDraft,
  vehicles,
  inspectors,
  isLoading = false,
  className,
}: InspectionFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [moldRiskLevel, setMoldRiskLevel] = useState<MoldRiskLevel>(MoldRiskLevel.LOW);

  const form = useForm<InspectionFormData>({
    resolver: zodResolver(inspectionFormSchema),
    defaultValues: { ...defaultFormValues, ...initialData } as InspectionFormData,
    mode: 'onChange',
  });

  // Watch sensory data for mold risk calculation
  const sensoryData = useWatch({
    control: form.control,
    name: 'sensory',
  });

  // Calculate mold risk whenever sensory data changes
  useEffect(() => {
    if (sensoryData) {
      const moisture: MoistureData = {
        interiorHumidity: sensoryData.humidity,
        carpetMoisture: [],
        doorPanelMoisture: [],
      };
      const odors: OdorData = {
        smokeDetected: sensoryData.odors.smokeDetected,
        smokeIntensity: sensoryData.odors.smokeDetected
          ? SmokeIntensity.MODERATE
          : SmokeIntensity.NONE,
        petSmellDetected: sensoryData.odors.petSmell,
        moldDetected: sensoryData.odors.moldDetected,
        mustyDetected: sensoryData.odors.mustySmell,
      };
      const risk = calculateMoldRisk({ moisture, odors });
      setMoldRiskLevel(risk);
    }
  }, [sensoryData]);

  const totalSteps = 7;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = async () => {
    const isValid = await form.trigger(
      getStepFields(currentStep) as Parameters<typeof form.trigger>[0]
    );
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSaveDraft = async () => {
    const data = form.getValues();
    await onSaveDraft(data);
  };

  const handleSubmit = async (data: InspectionFormData) => {
    await onSubmit({ ...data, status: InspectionStatus.COMPLETED });
  };

  const captureLocation = useCallback(async () => {
    setIsCapturingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      form.setValue('header.location.latitude', position.coords.latitude);
      form.setValue('header.location.longitude', position.coords.longitude);
      // In a real app, you'd reverse geocode here
      form.setValue(
        'header.location.address',
        `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
      );
    } catch (error) {
      console.error('Failed to capture location:', error);
    } finally {
      setIsCapturingLocation(false);
    }
  }, [form]);

  return (
    <FormProvider {...form}>
      <div className={className}>
        {/* Progress Header */}
        <div className='mb-8 space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-title-2 font-semibold text-white'>Ispezione Veicolo</h1>
              <p className='text-body text-[var(--text-tertiary)]'>
                Passo {currentStep} di {totalSteps}: {STEP_LABELS[currentStep - 1]}
              </p>
            </div>
            <Badge variant={moldRiskLevel === MoldRiskLevel.HIGH ? 'destructive' : 'secondary'}>
              Bozza
            </Badge>
          </div>
          <Progress value={progress} className='h-2' />
          <div className='flex justify-between text-sm text-[var(--text-tertiary)]'>
            {STEP_LABELS.map((label, index) => (
              <span
                key={label}
                className={`hidden sm:block ${
                  index + 1 === currentStep
                    ? 'font-medium text-white'
                    : index + 1 < currentStep
                      ? 'text-white'
                      : ''
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
            {/* Step 1: Header Info */}
            {currentStep === 1 && (
              <StepHeaderInfo
                vehicles={vehicles}
                inspectors={inspectors}
                captureLocation={captureLocation}
                isCapturingLocation={isCapturingLocation}
              />
            )}

            {/* Step 2: Exterior Inspection */}
            {currentStep === 2 && (
              <StepExteriorInspection
                isRecordingVideo={isRecordingVideo}
                setIsRecordingVideo={setIsRecordingVideo}
              />
            )}

            {/* Step 3: Interior Inspection */}
            {currentStep === 3 && <StepInteriorInspection />}

            {/* Step 4: Sensory Inspection */}
            {currentStep === 4 && <StepSensoryInspection moldRiskLevel={moldRiskLevel} />}

            {/* Step 5: Engine & Mechanical */}
            {currentStep === 5 && <StepEngineMechanical />}

            {/* Step 6: Tires & Suspension */}
            {currentStep === 6 && <StepTiresSuspension />}

            {/* Step 7: Electronics & OBD */}
            {currentStep === 7 && <StepElectronicsOBD />}

            {/* Navigation Buttons */}
            <div className='flex items-center justify-between pt-6 border-t border-[var(--border-strong)]'>
              <Button
                type='button'
                onClick={handleSaveDraft}
                disabled={isLoading}
                className='gap-2 rounded-full h-[52px] border border-[var(--border-strong)] bg-transparent text-white hover:bg-white/5'
              >
                <Save className='h-4 w-4' />
                Salva Bozza
              </Button>

              <div className='flex gap-3'>
                {currentStep > 1 && (
                  <Button
                    type='button'
                    onClick={handleBack}
                    disabled={isLoading}
                    className='gap-2 rounded-full h-[52px] border border-[var(--border-strong)] bg-transparent text-white hover:bg-white/5'
                  >
                    <ChevronLeft className='h-4 w-4' />
                    Indietro
                  </Button>
                )}

                {currentStep < totalSteps ? (
                  <Button
                    type='button'
                    onClick={handleNext}
                    disabled={isLoading}
                    className='gap-2 rounded-full h-[52px] bg-white text-[var(--text-primary)] hover:bg-[var(--surface-active)]'
                  >
                    Avanti
                    <ChevronRight className='h-4 w-4' />
                  </Button>
                ) : (
                  <Button
                    type='submit'
                    disabled={isLoading}
                    className='gap-2 rounded-full h-[52px] bg-white text-[var(--text-primary)] hover:bg-[var(--surface-active)]'
                  >
                    <Send className='h-4 w-4' />
                    Invia Ispezione
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </div>
    </FormProvider>
  );
}

// =============================================================================
// Step Components
// =============================================================================

function StepHeaderInfo({
  vehicles,
  inspectors,
  captureLocation,
  isCapturingLocation,
}: {
  vehicles: InspectionFormProps['vehicles'];
  inspectors: InspectionFormProps['inspectors'];
  captureLocation: () => Promise<void>;
  isCapturingLocation: boolean;
}) {
  const form = useFormContext<InspectionFormData>();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVehicles = vehicles.filter(
    v =>
      v.vin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${v.make} ${v.model}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Car className='h-5 w-5 text-white' />
            Selezione Veicolo
          </CardTitle>
          <CardDescription>Cerca per VIN, targa o nome veicolo</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='relative'>
            <Search className='absolute left-3 top-3 h-4 w-4 text-[var(--text-tertiary)]' />
            <Input
              placeholder='Cerca VIN o targa...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='pl-10'
            />
          </div>

          <FormField
            control={form.control}
            name='header.vehicleId'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Seleziona Veicolo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Seleziona un veicolo' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredVehicles.map(vehicle => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.year} {vehicle.make} {vehicle.model} - {vehicle.plate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Activity className='h-5 w-5 text-white' />
            Dettagli Ispezione
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <FormField
            control={form.control}
            name='header.inspectionType'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo Ispezione</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Seleziona tipo ispezione' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(INSPECTION_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='header.inspectorId'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ispettore</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Assegna ispettore' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {inspectors.map(inspector => (
                      <SelectItem key={inspector.id} value={inspector.id}>
                        <div className='flex items-center gap-2'>
                          <User className='h-4 w-4' />
                          {inspector.name} - {inspector.role}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <MapPin className='h-5 w-5 text-white' />
            Posizione
          </CardTitle>
          <CardDescription>Le coordinate GPS vengono acquisite automaticamente</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Button
            type='button'
            variant='outline'
            onClick={captureLocation}
            disabled={isCapturingLocation}
            className='gap-2'
          >
            {isCapturingLocation ? (
              <RotateCw className='h-4 w-4 animate-spin' />
            ) : (
              <MapPin className='h-4 w-4' />
            )}
            {isCapturingLocation ? 'Acquisizione...' : 'Acquisisci Posizione'}
          </Button>

          {form.watch('header.location.address') && (
            <div className='p-3 bg-[var(--surface-tertiary)] rounded-2xl text-sm'>
              <p className='font-medium'>Posizione acquisita:</p>
              <p className='text-[var(--text-tertiary)]'>{form.watch('header.location.address')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StepExteriorInspection({
  isRecordingVideo,
  setIsRecordingVideo,
}: {
  isRecordingVideo: boolean;
  setIsRecordingVideo: (value: boolean) => void;
}) {
  const form = useFormContext<InspectionFormData>();
  const [previewImages, setPreviewImages] = useState<string[]>([]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPhoto: Photo = {
          id: Math.random().toString(36).substring(7),
          url: reader.result as string,
          file,
          aiDetectedDamage: false,
        };
        const currentPhotos = form.getValues('exterior.photos') || [];
        form.setValue('exterior.photos', [...currentPhotos, newPhoto]);
        setPreviewImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    const currentPhotos = form.getValues('exterior.photos') || [];
    form.setValue(
      'exterior.photos',
      currentPhotos.filter((_, i) => i !== index)
    );
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Camera className='h-5 w-5 text-white' />
            Documentazione Fotografica
          </CardTitle>
          <CardDescription>
            Carica foto dell&apos;esterno. Il rilevamento danni AI analizzer&agrave;
            automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='border-2 border-dashed border-[var(--border-strong)] rounded-2xl p-8 text-center hover:border-white/30 transition-colors'>
            <Upload className='h-8 w-8 mx-auto mb-4 text-[var(--text-tertiary)]' />
            <p className='text-sm text-[var(--text-tertiary)] mb-2'>Trascina le foto o clicca per sfogliare</p>
            <Input
              type='file'
              accept='image/*'
              multiple
              onChange={handlePhotoUpload}
              className='hidden'
              id='photo-upload'
            />
            <Button type='button' variant='outline' asChild>
              <label htmlFor='photo-upload'>Seleziona Foto</label>
            </Button>
          </div>

          {previewImages.length > 0 && (
            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
              {previewImages.map((src, index) => (
                <div key={index} className='relative group'>
                  <img
                    src={src}
                    alt={`Anteprima ${index + 1}`}
                    className='w-full h-32 object-cover rounded-lg'
                  />
                  <button
                    type='button'
                    onClick={() => removePhoto(index)}
                    className='absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity'
                  >
                    <X className='h-4 w-4' />
                  </button>
                  {form.watch('exterior.photos')[index]?.aiDetectedDamage && (
                    <Badge className='absolute bottom-2 left-2 bg-orange-500'>
                      Danno Rilevato da AI
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Video className='h-5 w-5 text-white' />
            Video 360° Walkaround
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            type='button'
            variant={isRecordingVideo ? 'destructive' : 'outline'}
            onClick={() => setIsRecordingVideo(!isRecordingVideo)}
            className='gap-2'
          >
            <Video className='h-4 w-4' />
            {isRecordingVideo ? 'Ferma Registrazione' : 'Avvia Registrazione 360°'}
          </Button>
          {isRecordingVideo && (
            <div className='mt-4 p-4 bg-red-50 rounded-lg border border-red-200'>
              <p className='text-sm text-red-600 flex items-center gap-2'>
                <div className='w-2 h-2 bg-red-500 rounded-full animate-pulse' />
                Registrazione in corso... Cammina lentamente intorno al veicolo.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Valutazione Danni</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <FormField
            control={form.control}
            name='exterior.hasDamage'
            render={({ field }) => (
              <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className='space-y-1 leading-none'>
                  <FormLabel>Danno Rilevato</FormLabel>
                  <FormDescription>
                    Seleziona se sono stati trovati danni esterni durante l&apos;ispezione
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {form.watch('exterior.hasDamage') && (
            <FormField
              control={form.control}
              name='exterior.damageDescription'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione Danno</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Descrivi la posizione del danno, la gravit&agrave; e le riparazioni consigliate...'
                      className='min-h-[100px]'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StepInteriorInspection() {
  const form = useFormContext<InspectionFormData>();

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Gauge className='h-5 w-5 text-white' />
            Lettura Contachilometri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name='interior.odometerReading'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chilometraggio Attuale (km)</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    placeholder='es. 45000'
                    {...field}
                    onChange={e => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Condizioni Interne</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <FormField
            control={form.control}
            name='interior.seatCondition'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Condizione Sedili</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='excellent'>Eccellente</SelectItem>
                    <SelectItem value='good'>Buono</SelectItem>
                    <SelectItem value='fair'>Discreto - Usura visibile</SelectItem>
                    <SelectItem value='poor'>Scarso - Richiede attenzione</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='interior.dashboardCondition'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Condizione Cruscotto</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='excellent'>Eccellente</SelectItem>
                    <SelectItem value='good'>Buono</SelectItem>
                    <SelectItem value='fair'>Discreto - Usura visibile</SelectItem>
                    <SelectItem value='poor'>Scarso - Richiede attenzione</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sistema Infotainment</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <FormField
            control={form.control}
            name='interior.infotainmentWorking'
            render={({ field }) => (
              <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className='space-y-1 leading-none'>
                  <FormLabel>Sistema Infotainment Funzionante</FormLabel>
                </div>
              </FormItem>
            )}
          />

          {!form.watch('interior.infotainmentWorking') && (
            <FormField
              control={form.control}
              name='interior.infotainmentNotes'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione Problema</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Descrivi i problemi del sistema infotainment...'
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StepSensoryInspection({ moldRiskLevel }: { moldRiskLevel: MoldRiskLevel }) {
  const form = useFormContext<InspectionFormData>();
  const smokeDetected = form.watch('sensory.odors.smokeDetected');

  const moldRiskColors: Record<MoldRiskLevel, string> = {
    [MoldRiskLevel.LOW]: 'bg-green-600 text-white',
    [MoldRiskLevel.MEDIUM]: 'bg-orange-500 text-white',
    [MoldRiskLevel.HIGH]: 'bg-red-600 text-white',
  };

  const moldRiskMessages: Record<MoldRiskLevel, string> = {
    [MoldRiskLevel.LOW]: 'Rischio basso - Nessun intervento immediato necessario',
    [MoldRiskLevel.MEDIUM]:
      'Rischio medio - Monitorare le condizioni e considerare misure preventive',
    [MoldRiskLevel.HIGH]:
      'Rischio alto - Attenzione immediata raccomandata. Condizioni potenziali per crescita muffa',
  };

  return (
    <div className='space-y-6'>
      {/* Mold Risk Alert */}
      <div
        className={`p-4 rounded-xl ${moldRiskColors[moldRiskLevel]} transition-colors duration-300`}
      >
        <div className='flex items-start gap-3'>
          <AlertTriangle className='h-5 w-5 mt-0.5' />
          <div>
            <h3 className='font-semibold'>Valutazione Rischio Muffa: {moldRiskLevel}</h3>
            <p className='text-sm opacity-90'>{moldRiskMessages[moldRiskLevel]}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Droplets className='h-5 w-5 text-white' />
            Misurazione Umidit&agrave;
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <FormField
            control={form.control}
            name='sensory.humidity'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Umidit&agrave; Interna: {field.value}%</FormLabel>
                <FormControl>
                  <Slider
                    value={[field.value]}
                    onValueChange={value => field.onChange(value[0])}
                    min={0}
                    max={100}
                    step={1}
                  />
                </FormControl>
                <div className='flex justify-between text-sm text-[var(--text-tertiary)]'>
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
                <FormDescription>
                  Intervallo consigliato: 30-50%. Oltre il 70% indica alto rischio muffa.
                </FormDescription>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Wind className='h-5 w-5 text-white' />
            Rilevamento Odori
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <FormField
            control={form.control}
            name='sensory.odors.smokeDetected'
            render={({ field }) => (
              <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className='space-y-1 leading-none'>
                  <FormLabel>Fumo Rilevato</FormLabel>
                </div>
              </FormItem>
            )}
          />

          {smokeDetected && (
            <FormField
              control={form.control}
              name='sensory.odors.smokeIntensity'
              render={({ field }) => (
                <FormItem className='ml-6 p-4 bg-[var(--surface-tertiary)] rounded-2xl'>
                  <FormLabel>Intensit&agrave; Fumo (1-10)</FormLabel>
                  <FormControl>
                    <Slider
                      value={[field.value || 1]}
                      onValueChange={value => field.onChange(value[0])}
                      min={1}
                      max={10}
                      step={1}
                    />
                  </FormControl>
                  <div className='text-center text-sm font-medium'>
                    Livello: {field.value || 1}/10
                  </div>
                </FormItem>
              )}
            />
          )}

          <Separator />

          <FormField
            control={form.control}
            name='sensory.odors.petSmell'
            render={({ field }) => (
              <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className='space-y-1 leading-none'>
                  <FormLabel>Odore Animali Rilevato</FormLabel>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='sensory.odors.moldDetected'
            render={({ field }) => (
              <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className='space-y-1 leading-none'>
                  <FormLabel>Odore Muffa/Umidit&agrave;</FormLabel>
                  <FormDescription>
                    Odore caratteristico di muffa, terroso, che indica potenziale presenza di muffa
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='sensory.odors.mustySmell'
            render={({ field }) => (
              <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className='space-y-1 leading-none'>
                  <FormLabel>Odore di Stantio Generale</FormLabel>
                  <FormDescription>
                    Odore stantio e umido che potrebbe indicare problemi di umidit&agrave;
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Thermometer className='h-5 w-5 text-white' />
            Sistema AC
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <FormField
            control={form.control}
            name='sensory.acDrainTestPassed'
            render={({ field }) => (
              <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className='space-y-1 leading-none'>
                  <FormLabel>Test Scarico AC Superato</FormLabel>
                  <FormDescription>
                    L&apos;acqua scarica correttamente dal sistema AC in funzione
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='sensory.acBlockage'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gravit&agrave; Ostruzione Scarico</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={BlockageSeverity.NONE}>Nessuna Ostruzione</SelectItem>
                    <SelectItem value={BlockageSeverity.MINOR}>Lieve</SelectItem>
                    <SelectItem value={BlockageSeverity.MODERATE}>Moderata</SelectItem>
                    <SelectItem value={BlockageSeverity.SEVERE}>Grave</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='sensory.filterCondition'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Condizione Filtro Abitacolo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={FilterCondition.GOOD}>Buono</SelectItem>
                    <SelectItem value={FilterCondition.FAIR}>Discreto</SelectItem>
                    <SelectItem value={FilterCondition.POOR}>Scarso</SelectItem>
                    <SelectItem value={FilterCondition.REPLACEMENT_NEEDED}>
                      Sostituzione Necessaria
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='sensory.notes'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note Aggiuntive</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder='Ulteriori osservazioni su odori o umidit&agrave;...'
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StepEngineMechanical() {
  const form = useFormContext<InspectionFormData>();

  const fluidLevels = [
    { key: 'engineOil', label: 'Olio Motore' },
    { key: 'coolant', label: 'Liquido Raffreddamento' },
    { key: 'brakeFluid', label: 'Liquido Freni' },
    { key: 'powerSteering', label: 'Servosterzo' },
    { key: 'transmission', label: 'Trasmissione' },
  ] as const;

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Droplets className='h-5 w-5 text-white' />
            Livelli Fluidi
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {fluidLevels.map(({ key, label }) => (
            <FormField
              key={key}
              control={form.control}
              name={`engine.fluidLevels.${key}` as const}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='full'>Pieno</SelectItem>
                      <SelectItem value='ok'>OK</SelectItem>
                      <SelectItem value='low'>Basso - Rabbocco necessario</SelectItem>
                      <SelectItem value='empty'>Vuoto - Attenzione immediata</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Wrench className='h-5 w-5 text-white' />
            Condizione Cinghie
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <FormField
            control={form.control}
            name='engine.beltCondition'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Condizione Visiva Cinghia</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='excellent'>Eccellente - Come nuova</SelectItem>
                    <SelectItem value='good'>Buona - Usura minima</SelectItem>
                    <SelectItem value='fair'>Discreta - Alcune crepe</SelectItem>
                    <SelectItem value='poor'>Scarsa - Usura significativa</SelectItem>
                    <SelectItem value='needs_replacement'>Sostituzione Necessaria</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='engine.beltTension'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tensione Cinghia</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='proper'>Corretta</SelectItem>
                    <SelectItem value='loose'>Troppo Lenta</SelectItem>
                    <SelectItem value='too_tight'>Troppo Tesa</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Battery className='h-5 w-5 text-white' />
            Test Batteria
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <FormField
            control={form.control}
            name='engine.batteryTestResult.voltage'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tensione Batteria (V)</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    step='0.1'
                    {...field}
                    onChange={e => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormDescription>Normale: 12.4-12.9V a motore spento</FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='engine.batteryTestResult.coldCrankingAmps'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cold Cranking Amps (CCA)</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    {...field}
                    onChange={e => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='engine.batteryTestResult.health'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Salute Batteria</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='excellent'>Eccellente (&gt;90%)</SelectItem>
                    <SelectItem value='good'>Buona (70-90%)</SelectItem>
                    <SelectItem value='fair'>Discreta (50-70%)</SelectItem>
                    <SelectItem value='poor'>Scarsa (30-50%)</SelectItem>
                    <SelectItem value='replace'>Da Sostituire (&lt;30%)</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='engine.engineNotes'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note Aggiuntive Motore</FormLabel>
                <FormControl>
                  <Textarea placeholder='Ulteriori osservazioni sul motore...' {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StepTiresSuspension() {
  const form = useFormContext<InspectionFormData>();

  const tirePositions = [
    { key: 'frontLeft', label: 'Anteriore Sinistro' },
    { key: 'frontRight', label: 'Anteriore Destro' },
    { key: 'rearLeft', label: 'Posteriore Sinistro' },
    { key: 'rearRight', label: 'Posteriore Destro' },
  ] as const;

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Circle className='h-5 w-5 text-white' />
            Ispezione Pneumatici
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          {tirePositions.map(({ key, label }) => (
            <div key={key} className='p-4 bg-[var(--surface-tertiary)] rounded-2xl space-y-4'>
              <h4 className='font-medium'>Pneumatico {label}</h4>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                <FormField
                  control={form.control}
                  name={`tiresSuspension.tires.${key}.treadDepth` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profondit&agrave; Battistrada (mm)</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          step='0.1'
                          {...field}
                          onChange={e => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`tiresSuspension.tires.${key}.pressure` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pressione (PSI)</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          {...field}
                          onChange={e => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`tiresSuspension.tires.${key}.condition` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condizione</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='excellent'>Eccellente</SelectItem>
                          <SelectItem value='good'>Buono</SelectItem>
                          <SelectItem value='fair'>Discreto</SelectItem>
                          <SelectItem value='poor'>Scarso</SelectItem>
                          <SelectItem value='replace'>Da Sostituire</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Activity className='h-5 w-5 text-white' />
            Controllo Sospensioni
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <FormField
            control={form.control}
            name='tiresSuspension.suspension.frontShocks'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ammortizzatori Anteriori</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='excellent'>Eccellente</SelectItem>
                    <SelectItem value='good'>Buono</SelectItem>
                    <SelectItem value='fair'>Discreto</SelectItem>
                    <SelectItem value='poor'>Scarso</SelectItem>
                    <SelectItem value='leaking'>Perdita - Da Sostituire</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='tiresSuspension.suspension.rearShocks'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ammortizzatori Posteriori</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='excellent'>Eccellente</SelectItem>
                    <SelectItem value='good'>Buono</SelectItem>
                    <SelectItem value='fair'>Discreto</SelectItem>
                    <SelectItem value='poor'>Scarso</SelectItem>
                    <SelectItem value='leaking'>Perdita - Da Sostituire</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='tiresSuspension.suspension.springs'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Molle</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='excellent'>Excellent</SelectItem>
                    <SelectItem value='good'>Good</SelectItem>
                    <SelectItem value='fair'>Fair</SelectItem>
                    <SelectItem value='poor'>Poor</SelectItem>
                    <SelectItem value='broken'>Rotte - Da Sostituire</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='tiresSuspension.suspension.alignment'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Allineamento Ruote</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='good'>Buono - Nessuna deviazione</SelectItem>
                    <SelectItem value='slight_pull'>Leggera Deviazione</SelectItem>
                    <SelectItem value='needs_alignment'>Allineamento Necessario</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StepElectronicsOBD() {
  const form = useFormContext<InspectionFormData>();
  const [newObdCode, setNewObdCode] = useState('');
  const [newObdDescription, setNewObdDescription] = useState('');
  const [newObdSeverity, setNewObdSeverity] = useState<'info' | 'minor' | 'major' | 'critical'>(
    'info'
  );

  const addObdCode = () => {
    if (!newObdCode) return;
    const currentCodes = form.getValues('electronics.obdCodes') || [];
    form.setValue('electronics.obdCodes', [
      ...currentCodes,
      {
        code: newObdCode,
        description: newObdDescription,
        severity: newObdSeverity,
      },
    ]);
    setNewObdCode('');
    setNewObdDescription('');
    setNewObdSeverity('info');
  };

  const removeObdCode = (index: number) => {
    const currentCodes = form.getValues('electronics.obdCodes') || [];
    form.setValue(
      'electronics.obdCodes',
      currentCodes.filter((_, i) => i !== index)
    );
  };

  const obdCodes = form.watch('electronics.obdCodes') || [];

  const severityColors = {
    info: 'bg-blue-100 text-blue-800',
    minor: 'bg-yellow-100 text-yellow-800',
    major: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Cpu className='h-5 w-5 text-white' />
            Codici Diagnostici OBD-II
          </CardTitle>
          <CardDescription>
            Scansiona e registra eventuali codici errore dalla porta OBD-II
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Add new OBD code */}
          <div className='p-4 bg-[var(--surface-tertiary)] rounded-2xl space-y-3'>
            <div className='grid grid-cols-2 gap-3'>
              <Input
                placeholder='Codice (es. P0301)'
                value={newObdCode}
                onChange={e => setNewObdCode(e.target.value)}
              />
              <Select
                value={newObdSeverity}
                onValueChange={v => setNewObdSeverity(v as typeof newObdSeverity)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Gravit&agrave;' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='info'>Info</SelectItem>
                  <SelectItem value='minor'>Lieve</SelectItem>
                  <SelectItem value='major'>Grave</SelectItem>
                  <SelectItem value='critical'>Critico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder='Descrizione (es. Mancata accensione cilindro 1)'
              value={newObdDescription}
              onChange={e => setNewObdDescription(e.target.value)}
            />
            <Button type='button' onClick={addObdCode} variant='outline' className='w-full'>
              Aggiungi Codice OBD
            </Button>
          </div>

          {/* List of OBD codes */}
          {obdCodes.length > 0 ? (
            <div className='space-y-2'>
              {obdCodes.map((code, index) => (
                <div
                  key={index}
                  className='flex items-center justify-between p-3 bg-[var(--surface-elevated)] border border-[var(--border-strong)] rounded-2xl'
                >
                  <div className='flex items-center gap-3'>
                    <Badge className={severityColors[code.severity]}>
                      {code.severity.toUpperCase()}
                    </Badge>
                    <div>
                      <span className='font-mono font-medium'>{code.code}</span>
                      <p className='text-sm text-[var(--text-tertiary)]'>{code.description}</p>
                    </div>
                  </div>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={() => removeObdCode(index)}
                    aria-label='Rimuovi codice OBD'
                  >
                    <X className='h-4 w-4' />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className='text-center py-8 text-[var(--text-tertiary)]'>
              <CheckCircle className='h-8 w-8 mx-auto mb-2 text-green-400' />
              <p>Nessun codice OBD registrato</p>
              <p className='text-sm'>I sistemi del veicolo sembrano funzionare normalmente</p>
            </div>
          )}

          <FormField
            control={form.control}
            name='electronics.obdNotes'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note Aggiuntive OBD</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder='Ulteriori osservazioni dalla scansione OBD...'
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Zap className='h-5 w-5 text-white' />
            Controllo Elettronica
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <FormField
            control={form.control}
            name='electronics.electronicsCheck.lightsWorking'
            render={({ field }) => (
              <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className='space-y-1 leading-none'>
                  <FormLabel>Tutte le Luci Funzionanti</FormLabel>
                  <FormDescription>Fari, luci posteriori, frecce, luci freno</FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='electronics.electronicsCheck.windowsWorking'
            render={({ field }) => (
              <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className='space-y-1 leading-none'>
                  <FormLabel>Alzacristalli Funzionanti</FormLabel>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='electronics.electronicsCheck.locksWorking'
            render={({ field }) => (
              <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className='space-y-1 leading-none'>
                  <FormLabel>Chiusure Centralizzate Funzionanti</FormLabel>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='electronics.electronicsCheck.acWorking'
            render={({ field }) => (
              <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className='space-y-1 leading-none'>
                  <FormLabel>Climatizzazione Funzionante</FormLabel>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='electronics.electronicsCheck.heatedSeatsWorking'
            render={({ field }) => (
              <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className='space-y-1 leading-none'>
                  <FormLabel>Sedili Riscaldati Funzionanti</FormLabel>
                  <FormDescription>Se presenti</FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='electronics.electronicsCheck.sunroofWorking'
            render={({ field }) => (
              <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className='space-y-1 leading-none'>
                  <FormLabel>Tetto Apribile Funzionante</FormLabel>
                  <FormDescription>Se presente</FormDescription>
                </div>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

function getStepFields(step: number): string[] {
  switch (step) {
    case 1:
      return ['header.vehicleId', 'header.inspectionType', 'header.inspectorId'];
    case 2:
      return ['exterior.photos', 'exterior.hasDamage'];
    case 3:
      return ['interior.odometerReading'];
    case 4:
      return ['sensory.humidity'];
    case 5:
      return ['engine.fluidLevels', 'engine.batteryTestResult'];
    case 6:
      return ['tiresSuspension.tires'];
    case 7:
      return ['electronics.electronicsCheck'];
    default:
      return [];
  }
}

// =============================================================================
// Exports
// =============================================================================

export default InspectionForm;
export { inspectionFormSchema, defaultFormValues };
