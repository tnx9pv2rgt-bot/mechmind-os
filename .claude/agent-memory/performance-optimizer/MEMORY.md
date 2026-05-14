# performance-optimizer — memoria persistente

## Budget Web Vitals
- LCP <2.5s, INP <200ms, CLS <0.1, TTI <3.5s

## Bundle budget
- Home initial <100KB, modulo <250KB, total page <500KB

## Backend p95 budget
- Read endpoint <300ms
- Write endpoint <500ms (booking creation può essere <1s)
- Invoice generation <2s

## Optimizations già applicate
_(append qui con prima/dopo)_

## Hot paths del repo
- /booking flow (advisory lock + serializable)
- /invoice generation (PDF + FatturaPA XML)
