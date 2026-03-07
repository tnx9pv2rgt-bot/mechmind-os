/**
 * Realtime Hooks
 * 
 * Hook per il salvataggio real-time dei form con Supabase.
 * 
 * @example
 * ```tsx
 * import { useRealtimeSave } from '@/hooks/realtime'
 * 
 * function MyForm() {
 *   const [data, setData] = useState({ name: '' })
 *   
 *   const { saveStatus, lastSaved, forceSave } = useRealtimeSave({
 *     formId: 'my-form-123',
 *     formType: 'customer',
 *     data,
 *   })
 *   
 *   return (
 *     <>
 *       <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />
 *       <input onChange={e => setData({ name: e.target.value })} />
 *     </>
 *   )
 * }
 * ```
 */

// Main hook
export { 
  useRealtimeSave, 
  type UseRealtimeSaveOptions, 
  type UseRealtimeSaveReturn,
  type SaveStatus,
  type FormDraft,
  type ConflictData,
} from './useRealtimeSave'

// Default export
export { useRealtimeSave as default } from './useRealtimeSave'
