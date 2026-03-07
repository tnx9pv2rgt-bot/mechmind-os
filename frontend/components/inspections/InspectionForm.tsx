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

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useForm, FormProvider, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
} from 'lucide-react'

// UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

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
} from '@/lib/services/sensoryService'

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
  [InspectionType.PRE_PURCHASE]: 'Pre-purchase',
  [InspectionType.PERIODIC]: 'Periodic',
  [InspectionType.PRE_SALE]: 'Pre-sale',
  [InspectionType.ACCIDENT]: 'Accident',
  [InspectionType.WARRANTY]: 'Warranty',
}

const STEP_LABELS = [
  'Header Info',
  'Exterior',
  'Interior',
  'Sensory',
  'Engine',
  'Tires & Suspension',
  'Electronics',
]

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
})

const damageAnnotationSchema = z.object({
  id: z.string(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  text: z.string(),
  color: z.string(),
  severity: z.enum(['minor', 'moderate', 'severe']),
})

const headerInfoSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  vehicleSearchQuery: z.string().optional(),
  inspectionType: z.nativeEnum(InspectionType),
  inspectorId: z.string().min(1, 'Inspector is required'),
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    address: z.string().optional(),
  }),
})

const exteriorInspectionSchema = z.object({
  photos: z.array(photoSchema).max(20, 'Maximum 20 photos allowed'),
  walkaroundVideoUrl: z.string().optional(),
  annotations: z.array(damageAnnotationSchema),
  hasDamage: z.boolean(),
  damageDescription: z.string().max(1000).optional(),
})

const interiorInspectionSchema = z.object({
  photos: z.array(photoSchema).max(10),
  odometerReading: z.number().min(0, 'Odometer must be positive'),
  infotainmentWorking: z.boolean(),
  infotainmentNotes: z.string().max(500).optional(),
  seatCondition: z.enum(['excellent', 'good', 'fair', 'poor']),
  dashboardCondition: z.enum(['excellent', 'good', 'fair', 'poor']),
})

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
})

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
})

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
})

function tireSchema() {
  return z.object({
    treadDepth: z.number().min(0).max(20),
    pressure: z.number().min(0).max(100),
    condition: z.enum(['excellent', 'good', 'fair', 'poor', 'replace']),
    aiWearAnalysis: z.object({
      wearPattern: z.enum(['even', 'inner_wear', 'outer_wear', 'cupping', 'flat_spots']),
      estimatedRemainingLife: z.number().min(0).max(100),
      recommendation: z.string(),
    }).optional(),
    photos: z.array(photoSchema),
  })
}

const electronicsOBDSchema = z.object({
  obdCodes: z.array(z.object({
    code: z.string(),
    description: z.string(),
    severity: z.enum(['info', 'minor', 'major', 'critical']),
  })),
  electronicsCheck: z.object({
    lightsWorking: z.boolean(),
    windowsWorking: z.boolean(),
    locksWorking: z.boolean(),
    acWorking: z.boolean(),
    heatedSeatsWorking: z.boolean().optional(),
    sunroofWorking: z.boolean().optional(),
  }),
  obdNotes: z.string().max(1000).optional(),
})

const inspectionFormSchema = z.object({
  header: headerInfoSchema,
  exterior: exteriorInspectionSchema,
  interior: interiorInspectionSchema,
  sensory: sensoryInspectionSchema,
  engine: engineMechanicalSchema,
  tiresSuspension: tiresSuspensionSchema,
  electronics: electronicsOBDSchema,
  status: z.nativeEnum(InspectionStatus).default(InspectionStatus.DRAFT),
})

export type InspectionFormData = z.infer<typeof inspectionFormSchema>
export type Photo = z.infer<typeof photoSchema>
export type DamageAnnotation = z.infer<typeof damageAnnotationSchema>

// =============================================================================
// Default Values
// =============================================================================

const defaultFormValues: Partial<InspectionFormData> = {
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
}

// =============================================================================
// Props Interface
// =============================================================================

export interface InspectionFormProps {
  initialData?: Partial<InspectionFormData>
  onSubmit: (data: InspectionFormData) => Promise<void>
  onSaveDraft: (data: InspectionFormData) => Promise<void>
  vehicles: Array<{ id: string; vin: string; plate: string; make: string; model: string; year: number }>
  inspectors: Array<{ id: string; name: string; role: string }>
  isLoading?: boolean
  className?: string
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
  const [currentStep, setCurrentStep] = useState(1)
  const [isCapturingLocation, setIsCapturingLocation] = useState(false)
  const [isRecordingVideo, setIsRecordingVideo] = useState(false)
  const [moldRiskLevel, setMoldRiskLevel] = useState<MoldRiskLevel>(MoldRiskLevel.LOW)

  const form = useForm<InspectionFormData>({
    resolver: zodResolver(inspectionFormSchema),
    defaultValues: { ...defaultFormValues, ...initialData } as InspectionFormData,
    mode: 'onChange',
  })

  // Watch sensory data for mold risk calculation
  const sensoryData = useWatch({
    control: form.control,
    name: 'sensory',
  })

  // Calculate mold risk whenever sensory data changes
  useEffect(() => {
    if (sensoryData) {
      const moisture: MoistureData = {
        interiorHumidity: sensoryData.humidity,
        carpetMoisture: [],
        doorPanelMoisture: [],
      }
      const odors: OdorData = {
        smokeDetected: sensoryData.odors.smokeDetected,
        smokeIntensity: sensoryData.odors.smokeDetected 
          ? SmokeIntensity.MODERATE 
          : SmokeIntensity.NONE,
        petSmellDetected: sensoryData.odors.petSmell,
        moldDetected: sensoryData.odors.moldDetected,
        mustyDetected: sensoryData.odors.mustySmell,
      }
      const risk = calculateMoldRisk({ moisture, odors })
      setMoldRiskLevel(risk)
    }
  }, [sensoryData])

  const totalSteps = 7
  const progress = (currentStep / totalSteps) * 100

  const handleNext = async () => {
    const isValid = await form.trigger(getStepFields(currentStep))
    if (isValid && currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleSaveDraft = async () => {
    const data = form.getValues()
    await onSaveDraft(data)
  }

  const handleSubmit = async (data: InspectionFormData) => {
    await onSubmit({ ...data, status: InspectionStatus.COMPLETED })
  }

  const captureLocation = useCallback(async () => {
    setIsCapturingLocation(true)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      })
      form.setValue('header.location.latitude', position.coords.latitude)
      form.setValue('header.location.longitude', position.coords.longitude)
      // In a real app, you'd reverse geocode here
      form.setValue('header.location.address', `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`)
    } catch (error) {
      console.error('Failed to capture location:', error)
    } finally {
      setIsCapturingLocation(false)
    }
  }, [form])

  return (
    <FormProvider {...form}>
      <div className={className}>
        {/* Progress Header */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-title-2 font-semibold text-apple-dark">Vehicle Inspection</h1>
              <p className="text-body text-apple-gray">
                Step {currentStep} of {totalSteps}: {STEP_LABELS[currentStep - 1]}
              </p>
            </div>
            <Badge variant={moldRiskLevel === MoldRiskLevel.HIGH ? 'destructive' : 'secondary'}>
              Draft
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm text-apple-gray">
            {STEP_LABELS.map((label, index) => (
              <span
                key={label}
                className={`hidden sm:block ${
                  index + 1 === currentStep
                    ? 'font-medium text-apple-blue'
                    : index + 1 < currentStep
                    ? 'text-apple-green'
                    : ''
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
            {currentStep === 4 && (
              <StepSensoryInspection moldRiskLevel={moldRiskLevel} />
            )}

            {/* Step 5: Engine & Mechanical */}
            {currentStep === 5 && <StepEngineMechanical />}

            {/* Step 6: Tires & Suspension */}
            {currentStep === 6 && <StepTiresSuspension />}

            {/* Step 7: Electronics & OBD */}
            {currentStep === 7 && <StepElectronicsOBD />}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isLoading}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save Draft
              </Button>

              <div className="flex gap-3">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                )}

                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={isLoading}
                    className="gap-2 bg-apple-blue hover:bg-apple-blue-hover"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="gap-2 bg-apple-green hover:bg-green-600"
                  >
                    <Send className="h-4 w-4" />
                    Submit Inspection
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </div>
    </FormProvider>
  )
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
  vehicles: InspectionFormProps['vehicles']
  inspectors: InspectionFormProps['inspectors']
  captureLocation: () => Promise<void>
  isCapturingLocation: boolean
}) {
  const form = useFormContext<InspectionFormData>()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.vin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${v.make} ${v.model}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-apple-blue" />
            Vehicle Selection
          </CardTitle>
          <CardDescription>Search by VIN, license plate, or vehicle name</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-apple-gray" />
            <Input
              placeholder="Search VIN or plate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <FormField
            control={form.control}
            name="header.vehicleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Vehicle</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a vehicle" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredVehicles.map((vehicle) => (
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
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-apple-blue" />
            Inspection Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="header.inspectionType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inspection Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select inspection type" />
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
            name="header.inspectorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inspector</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Assign inspector" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {inspectors.map((inspector) => (
                      <SelectItem key={inspector.id} value={inspector.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
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
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-apple-blue" />
            Location
          </CardTitle>
          <CardDescription>GPS coordinates are captured automatically</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            onClick={captureLocation}
            disabled={isCapturingLocation}
            className="gap-2"
          >
            {isCapturingLocation ? (
              <RotateCw className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            {isCapturingLocation ? 'Capturing...' : 'Capture Location'}
          </Button>

          {form.watch('header.location.address') && (
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <p className="font-medium">Location captured:</p>
              <p className="text-apple-gray">{form.watch('header.location.address')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StepExteriorInspection({
  isRecordingVideo,
  setIsRecordingVideo,
}: {
  isRecordingVideo: boolean
  setIsRecordingVideo: (value: boolean) => void
}) {
  const form = useFormContext<InspectionFormData>()
  const [previewImages, setPreviewImages] = useState<string[]>([])

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const newPhoto: Photo = {
          id: Math.random().toString(36).substring(7),
          url: reader.result as string,
          file,
          aiDetectedDamage: false,
        }
        const currentPhotos = form.getValues('exterior.photos') || []
        form.setValue('exterior.photos', [...currentPhotos, newPhoto])
        setPreviewImages((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (index: number) => {
    const currentPhotos = form.getValues('exterior.photos') || []
    form.setValue(
      'exterior.photos',
      currentPhotos.filter((_, i) => i !== index)
    )
    setPreviewImages((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-apple-blue" />
            Photo Documentation
          </CardTitle>
          <CardDescription>Upload exterior photos. AI damage detection will analyze automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-apple-blue transition-colors">
            <Upload className="h-8 w-8 mx-auto mb-4 text-apple-gray" />
            <p className="text-sm text-apple-gray mb-2">Drag & drop photos or click to browse</p>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
              id="photo-upload"
            />
            <Button type="button" variant="outline" asChild>
              <label htmlFor="photo-upload">Select Photos</label>
            </Button>
          </div>

          {previewImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {previewImages.map((src, index) => (
                <div key={index} className="relative group">
                  <img
                    src={src}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {form.watch('exterior.photos')[index]?.aiDetectedDamage && (
                    <Badge className="absolute bottom-2 left-2 bg-apple-orange">
                      AI Damage Detected
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
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-apple-blue" />
            360° Walkaround Video
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant={isRecordingVideo ? 'destructive' : 'outline'}
            onClick={() => setIsRecordingVideo(!isRecordingVideo)}
            className="gap-2"
          >
            <Video className="h-4 w-4" />
            {isRecordingVideo ? 'Stop Recording' : 'Start 360° Recording'}
          </Button>
          {isRecordingVideo && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-600 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Recording in progress... Walk around the vehicle slowly.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Damage Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="exterior.hasDamage"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Damage Detected</FormLabel>
                  <FormDescription>
                    Check if any exterior damage was found during inspection
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {form.watch('exterior.hasDamage') && (
            <FormField
              control={form.control}
              name="exterior.damageDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Damage Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the damage location, severity, and recommended repairs..."
                      className="min-h-[100px]"
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
  )
}

function StepInteriorInspection() {
  const form = useFormContext<InspectionFormData>()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-apple-blue" />
            Odometer Reading
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="interior.odometerReading"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Mileage (km)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 45000"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
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
          <CardTitle>Interior Condition</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="interior.seatCondition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Seat Condition</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair - Some wear</SelectItem>
                    <SelectItem value="poor">Poor - Needs attention</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="interior.dashboardCondition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dashboard Condition</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair - Some wear</SelectItem>
                    <SelectItem value="poor">Poor - Needs attention</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Infotainment System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="interior.infotainmentWorking"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Infotainment System Functional</FormLabel>
                </div>
              </FormItem>
            )}
          />

          {!form.watch('interior.infotainmentWorking') && (
            <FormField
              control={form.control}
              name="interior.infotainmentNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the infotainment issues..."
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
  )
}

function StepSensoryInspection({ moldRiskLevel }: { moldRiskLevel: MoldRiskLevel }) {
  const form = useFormContext<InspectionFormData>()
  const smokeDetected = form.watch('sensory.odors.smokeDetected')

  const moldRiskColors: Record<MoldRiskLevel, string> = {
    [MoldRiskLevel.LOW]: 'bg-apple-green text-white',
    [MoldRiskLevel.MEDIUM]: 'bg-apple-orange text-white',
    [MoldRiskLevel.HIGH]: 'bg-apple-red text-white',
  }

  const moldRiskMessages: Record<MoldRiskLevel, string> = {
    [MoldRiskLevel.LOW]: 'Low risk - No immediate action required',
    [MoldRiskLevel.MEDIUM]: 'Medium risk - Monitor conditions and consider preventive measures',
    [MoldRiskLevel.HIGH]: 'High risk - Immediate attention recommended. Potential mold growth conditions present',
  }

  return (
    <div className="space-y-6">
      {/* Mold Risk Alert */}
      <div className={`p-4 rounded-xl ${moldRiskColors[moldRiskLevel]} transition-colors duration-300`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 mt-0.5" />
          <div>
            <h3 className="font-semibold">Mold Risk Assessment: {moldRiskLevel}</h3>
            <p className="text-sm opacity-90">{moldRiskMessages[moldRiskLevel]}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-apple-blue" />
            Humidity Measurement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="sensory.humidity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Interior Humidity: {field.value}%</FormLabel>
                <FormControl>
                  <Slider
                    value={[field.value]}
                    onValueChange={(value) => field.onChange(value[0])}
                    min={0}
                    max={100}
                    step={1}
                  />
                </FormControl>
                <div className="flex justify-between text-sm text-apple-gray">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
                <FormDescription>
                  Recommended range: 30-50%. Above 70% indicates high mold risk.
                </FormDescription>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wind className="h-5 w-5 text-apple-blue" />
            Odor Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="sensory.odors.smokeDetected"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Smoke Detected</FormLabel>
                </div>
              </FormItem>
            )}
          />

          {smokeDetected && (
            <FormField
              control={form.control}
              name="sensory.odors.smokeIntensity"
              render={({ field }) => (
                <FormItem className="ml-6 p-4 bg-gray-50 rounded-lg">
                  <FormLabel>Smoke Intensity (1-10)</FormLabel>
                  <FormControl>
                    <Slider
                      value={[field.value || 1]}
                      onValueChange={(value) => field.onChange(value[0])}
                      min={1}
                      max={10}
                      step={1}
                    />
                  </FormControl>
                  <div className="text-center text-sm font-medium">
                    Level: {field.value || 1}/10
                  </div>
                </FormItem>
              )}
            />
          )}

          <Separator />

          <FormField
            control={form.control}
            name="sensory.odors.petSmell"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Pet Smell Detected</FormLabel>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sensory.odors.moldDetected"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Mold/Mildew Smell</FormLabel>
                  <FormDescription>
                    Distinctive musty, earthy odor indicating potential mold
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sensory.odors.mustySmell"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>General Musty Smell</FormLabel>
                  <FormDescription>
                    Stale, damp odor that may indicate moisture issues
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-apple-blue" />
            AC System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="sensory.acDrainTestPassed"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>AC Drain Test Passed</FormLabel>
                  <FormDescription>
                    Water drains properly from AC system when running
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sensory.acBlockage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Drain Blockage Severity</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={BlockageSeverity.NONE}>No Blockage</SelectItem>
                    <SelectItem value={BlockageSeverity.MINOR}>Minor</SelectItem>
                    <SelectItem value={BlockageSeverity.MODERATE}>Moderate</SelectItem>
                    <SelectItem value={BlockageSeverity.SEVERE}>Severe</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sensory.filterCondition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cabin Filter Condition</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={FilterCondition.GOOD}>Good</SelectItem>
                    <SelectItem value={FilterCondition.FAIR}>Fair</SelectItem>
                    <SelectItem value={FilterCondition.POOR}>Poor</SelectItem>
                    <SelectItem value={FilterCondition.REPLACEMENT_NEEDED}>Replacement Needed</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sensory.notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any additional observations about odors or moisture..."
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function StepEngineMechanical() {
  const form = useFormContext<InspectionFormData>()

  const fluidLevels = [
    { key: 'engineOil', label: 'Engine Oil' },
    { key: 'coolant', label: 'Coolant' },
    { key: 'brakeFluid', label: 'Brake Fluid' },
    { key: 'powerSteering', label: 'Power Steering' },
    { key: 'transmission', label: 'Transmission' },
  ] as const

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-apple-blue" />
            Fluid Levels
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                      <SelectItem value="full">Full</SelectItem>
                      <SelectItem value="ok">OK</SelectItem>
                      <SelectItem value="low">Low - Top up needed</SelectItem>
                      <SelectItem value="empty">Empty - Immediate attention</SelectItem>
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
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-apple-blue" />
            Belt Condition
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="engine.beltCondition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Belt Visual Condition</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent - Like new</SelectItem>
                    <SelectItem value="good">Good - Minor wear</SelectItem>
                    <SelectItem value="fair">Fair - Some cracking</SelectItem>
                    <SelectItem value="poor">Poor - Significant wear</SelectItem>
                    <SelectItem value="needs_replacement">Needs Replacement</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="engine.beltTension"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Belt Tension</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="proper">Proper</SelectItem>
                    <SelectItem value="loose">Too Loose</SelectItem>
                    <SelectItem value="too_tight">Too Tight</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Battery className="h-5 w-5 text-apple-blue" />
            Battery Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="engine.batteryTestResult.voltage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Battery Voltage (V)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormDescription>Normal: 12.4-12.9V when engine off</FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="engine.batteryTestResult.coldCrankingAmps"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cold Cranking Amps (CCA)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="engine.batteryTestResult.health"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Battery Health</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent (&gt;90%)</SelectItem>
                    <SelectItem value="good">Good (70-90%)</SelectItem>
                    <SelectItem value="fair">Fair (50-70%)</SelectItem>
                    <SelectItem value="poor">Poor (30-50%)</SelectItem>
                    <SelectItem value="replace">Replace (&lt;30%)</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="engine.engineNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Engine Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any additional observations about the engine..."
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function StepTiresSuspension() {
  const form = useFormContext<InspectionFormData>()

  const tirePositions = [
    { key: 'frontLeft', label: 'Front Left' },
    { key: 'frontRight', label: 'Front Right' },
    { key: 'rearLeft', label: 'Rear Left' },
    { key: 'rearRight', label: 'Rear Right' },
  ] as const

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Circle className="h-5 w-5 text-apple-blue" />
            Tire Inspection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {tirePositions.map(({ key, label }) => (
            <div key={key} className="p-4 bg-gray-50 rounded-lg space-y-4">
              <h4 className="font-medium">{label} Tire</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name={`tiresSuspension.tires.${key}.treadDepth` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tread Depth (mm)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
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
                      <FormLabel>Pressure (PSI)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
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
                      <FormLabel>Condition</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="poor">Poor</SelectItem>
                          <SelectItem value="replace">Replace</SelectItem>
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
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-apple-blue" />
            Suspension Check
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="tiresSuspension.suspension.frontShocks"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Front Shock Absorbers</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                    <SelectItem value="leaking">Leaking - Replace</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tiresSuspension.suspension.rearShocks"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rear Shock Absorbers</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                    <SelectItem value="leaking">Leaking - Replace</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tiresSuspension.suspension.springs"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Springs</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                    <SelectItem value="broken">Broken - Replace</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tiresSuspension.suspension.alignment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Wheel Alignment</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="good">Good - No pull</SelectItem>
                    <SelectItem value="slight_pull">Slight Pull</SelectItem>
                    <SelectItem value="needs_alignment">Needs Alignment</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function StepElectronicsOBD() {
  const form = useFormContext<InspectionFormData>()
  const [newObdCode, setNewObdCode] = useState('')
  const [newObdDescription, setNewObdDescription] = useState('')
  const [newObdSeverity, setNewObdSeverity] = useState<'info' | 'minor' | 'major' | 'critical'>('info')

  const addObdCode = () => {
    if (!newObdCode) return
    const currentCodes = form.getValues('electronics.obdCodes') || []
    form.setValue('electronics.obdCodes', [
      ...currentCodes,
      {
        code: newObdCode,
        description: newObdDescription,
        severity: newObdSeverity,
      },
    ])
    setNewObdCode('')
    setNewObdDescription('')
    setNewObdSeverity('info')
  }

  const removeObdCode = (index: number) => {
    const currentCodes = form.getValues('electronics.obdCodes') || []
    form.setValue(
      'electronics.obdCodes',
      currentCodes.filter((_, i) => i !== index)
    )
  }

  const obdCodes = form.watch('electronics.obdCodes') || []

  const severityColors = {
    info: 'bg-blue-100 text-blue-800',
    minor: 'bg-yellow-100 text-yellow-800',
    major: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-apple-blue" />
            OBD-II Diagnostic Codes
          </CardTitle>
          <CardDescription>Scan and record any error codes from the OBD-II port</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new OBD code */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Code (e.g., P0301)"
                value={newObdCode}
                onChange={(e) => setNewObdCode(e.target.value)}
              />
              <Select
                value={newObdSeverity}
                onValueChange={(v) => setNewObdSeverity(v as typeof newObdSeverity)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Description (e.g., Cylinder 1 Misfire Detected)"
              value={newObdDescription}
              onChange={(e) => setNewObdDescription(e.target.value)}
            />
            <Button type="button" onClick={addObdCode} variant="outline" className="w-full">
              Add OBD Code
            </Button>
          </div>

          {/* List of OBD codes */}
          {obdCodes.length > 0 ? (
            <div className="space-y-2">
              {obdCodes.map((code, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge className={severityColors[code.severity]}>
                      {code.severity.toUpperCase()}
                    </Badge>
                    <div>
                      <span className="font-mono font-medium">{code.code}</span>
                      <p className="text-sm text-apple-gray">{code.description}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeObdCode(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-apple-gray">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-apple-green" />
              <p>No OBD codes recorded</p>
              <p className="text-sm">Vehicle systems appear to be functioning normally</p>
            </div>
          )}

          <FormField
            control={form.control}
            name="electronics.obdNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional OBD Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any additional observations from the OBD scan..."
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
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-apple-blue" />
            Electronics Check
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="electronics.electronicsCheck.lightsWorking"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>All Lights Working</FormLabel>
                  <FormDescription>Headlights, taillights, turn signals, brake lights</FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="electronics.electronicsCheck.windowsWorking"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Power Windows Working</FormLabel>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="electronics.electronicsCheck.locksWorking"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Power Locks Working</FormLabel>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="electronics.electronicsCheck.acWorking"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Climate Control Working</FormLabel>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="electronics.electronicsCheck.heatedSeatsWorking"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Heated Seats Working</FormLabel>
                  <FormDescription>If equipped</FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="electronics.electronicsCheck.sunroofWorking"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Sunroof/Moonroof Working</FormLabel>
                  <FormDescription>If equipped</FormDescription>
                </div>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// Helper Functions
// =============================================================================

function getStepFields(step: number): string[] {
  switch (step) {
    case 1:
      return ['header.vehicleId', 'header.inspectionType', 'header.inspectorId']
    case 2:
      return ['exterior.photos', 'exterior.hasDamage']
    case 3:
      return ['interior.odometerReading']
    case 4:
      return ['sensory.humidity']
    case 5:
      return ['engine.fluidLevels', 'engine.batteryTestResult']
    case 6:
      return ['tiresSuspension.tires']
    case 7:
      return ['electronics.electronicsCheck']
    default:
      return []
  }
}

// =============================================================================
// Exports
// =============================================================================

export default InspectionForm
export { inspectionFormSchema, defaultFormValues }
export type { InspectionFormData, Photo, DamageAnnotation }
