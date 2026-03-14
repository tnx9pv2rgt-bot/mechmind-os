/**
 * MSW Browser Worker — starts only in demo mode.
 */
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
