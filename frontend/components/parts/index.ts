/**
 * Parts Components
 * Inventory Management - Apple Design 2026
 */

export { PartForm } from './part-form'
export { PartDialog, PartDialogCompact, usePartDialog } from './part-dialog'
export {
  PartFormSchema,
  defaultPartFormValues,
  CATEGORY_LABELS,
  STOCK_STATUS_LABELS,
  calculateStockStatus,
  calculateMargin,
  formatPartCode,
} from './part-form-schema'
export type {
  PartFormData,
  PartCategoryType,
  StockStatusType,
} from './part-form-schema'

// Re-export anche i componenti esistenti
export { PartsSearch } from './parts-search'
