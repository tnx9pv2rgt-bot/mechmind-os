/**
 * Inspections Components
 * Digital Vehicle Inspection (DVI) - Apple Design 2026
 */

// Main multi-step inspection form
export { InspectionForm } from './InspectionForm'
export type { InspectionFormProps, InspectionFormData, Photo, DamageAnnotation } from './InspectionForm'
export { inspectionFormSchema, defaultFormValues, InspectionType, InspectionStatus } from './InspectionForm'

export { InspectionDialog, InspectionDialogCompact, useInspectionDialog } from './inspection-dialog'
export {
  InspectionFormSchema,
  defaultInspectionFormValues,
  createDefaultChecklistItem,
  INSPECTION_TYPE_LABELS,
  ITEM_STATUS_LABELS,
  CATEGORY_LABELS,
} from './inspection-form-schema'
export type {
  InspectionFormData as LegacyInspectionFormData,
  InspectionItemStatusType,
  InspectionTypeType,
} from './inspection-form-schema'

// Existing components
export { PhotoAnnotator } from './photo-annotator'
export { InspectionReport } from './inspection-report'
export { BlockchainVerification } from './BlockchainVerification'
export { DamageAnalyzer } from './DamageAnalyzer'
export { VideoRecorder } from './VideoRecorder'
export { SensorySection, getDefaultSensoryFormData } from './SensorySection'
export type { SensoryFormData, SensorySectionProps } from './SensorySection'

// Offline sync indicator
export { OfflineIndicator, FixedOfflineIndicator } from './OfflineIndicator'
export type { OfflineIndicatorProps } from './OfflineIndicator'
