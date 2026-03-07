/**
 * Services Module - Esportazioni centralizzate
 * Moduli di servizio per funzionalità business logic
 */

// AI Service - Vehicle Damage Detection
export {
  // Main class
  AIService,
  AIAnalysisError,
  
  // Convenience functions
  getAIService,
  analyzeDamage,
  analyzeTireWear,
  estimateRepairCost,
  predictMaintenance,
  batchAnalyzePhotos,
  
  // Configuration
  CONFIDENCE_THRESHOLDS,
} from './aiService';

// Types
export type {
  // Damage Analysis
  DamageType,
  SeverityLevel,
  BoundingBox,
  DamageArea,
  DamageAnalysisResult,
  
  // Tire Analysis
  TireSectionWear,
  TireWearResult,
  
  // Cost Estimation
  CostBreakdownItem,
  RepairCostEstimate,
  
  // Maintenance Prediction
  InspectionData,
  PredictedIssue,
  MaintenancePrediction,
  
  // Batch Processing
  BatchAnalysisOptions,
  BatchAnalysisResult,
  
  // Configuration
  AIServiceConfig,
} from './aiService';

// Video Service - 360° Vehicle Walkaround
export {
  // Main functions
  uploadVideo,
  compressVideo,
  generateHLSPlaylist,
  addHotspot,
  updateHotspot,
  deleteHotspot,
  getHotspots,
  getVideoSegments,
  getSegmentByName,
  getCurrentSegment,
  extractFrame,
  generateThumbnailFromFile,
  getFFmpeg,
  terminateFFmpeg,
  formatDuration,
  validateVideoFile,
  
  // Service object
  videoService,
} from './videoService';

// Types
export type {
  // Video
  VideoMetadata,
  CompressionOptions,
  UploadProgress,
  UploadProgressCallback,
  
  // Segments
  VideoSegment,
  VehicleSegmentType,
  
  // Hotspots
  Hotspot,
  HotspotType,
  
  // HLS
  HLSPlaylist,
  HLSSegment,
  HLSQuality,
} from './videoService';

// Maintenance Service - Preventive Maintenance Module
export {
  // Core functions
  calculateNextDue,
  createMaintenanceSchedule,
  getMaintenanceScheduleById,
  updateMaintenanceSchedule,
  deleteMaintenanceSchedule,
  listMaintenanceSchedules,
  getOverdueItems,
  getUpcomingItems,
  markAsCompleted,
  checkOverdueStatus,
  createFromInspection,
  getMaintenanceSummary,
  
  // Helper functions
  getMaintenanceTypeLabel,
  getNotificationLevelLabel,
  getNotificationLevelColor,
  
  // Error classes
  MaintenanceNotFoundError,
  MaintenanceValidationError,
  VehicleNotFoundError,
} from './maintenanceService';

// Types
export type {
  // Entities
  InspectionFinding,
  CreateMaintenanceScheduleInput,
  UpdateMaintenanceScheduleInput,
  CompleteMaintenanceInput,
  NextDueCalculation,
  MaintenanceSummary,
  PaginatedMaintenance,
  MaintenanceScheduleWithVehicle,
  MaintenanceFilters,
  PaginationParams,
} from './maintenanceService';

// Warranty Service - Warranty Tracking & Claims
export {
  // Main class
  WarrantyService,
  warrantyService,
  
  // Convenience functions
  createWarranty,
  getWarranty,
  getWarrantyByVehicle,
  updateWarrantyStatus,
  updateAllWarrantyStatuses,
  fileClaim,
  reviewClaim,
  markClaimPaid,
  getExpiringWarranties,
  getClaims,
  getClaimsByWarranty,
  getClaim,
  getRemainingCoverage,
  listWarranties,
  updateWarranty,
  deleteWarranty,
  recordAlertSent,
  
  // Error classes
  WarrantyError,
  WarrantyNotFoundError,
  ClaimNotFoundError,
  InvalidWarrantyDataError,
  InvalidClaimDataError,
  
  // Enums (re-exported for convenience)
  WarrantyTypeValues,
  WarrantyStatus,
  ClaimStatus,
} from './warrantyService';

// Types
export type {
  // Enums
  WarrantyType,
  
  // Entities
  Warranty,
  WarrantyClaim,
  WarrantyWithClaims,
  
  // DTOs
  CreateWarrantyDTO,
  FileClaimDTO,
  ReviewClaimDTO,
  
  // Results
  RemainingCoverage,
} from './warrantyService';
