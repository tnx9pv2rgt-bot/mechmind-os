/**
 * Type declaration for optional pdfkit dependency.
 * pdfkit is dynamically imported at runtime only when PDF generation is needed.
 */
declare module 'pdfkit' {
  import { Readable } from 'stream';

  interface PDFDocumentOptions {
    size?: string | [number, number];
    margin?: number;
    margins?: { top: number; bottom: number; left: number; right: number };
    layout?: 'portrait' | 'landscape';
  }

  class PDFDocument extends Readable {
    constructor(options?: PDFDocumentOptions);
    fontSize(size: number): this;
    font(name: string): this;
    text(text: string, x?: number, y?: number, options?: Record<string, unknown>): this;
    moveDown(lines?: number): this;
    addPage(options?: PDFDocumentOptions): this;
    end(): void;
    x: number;
    y: number;
    page: { width: number; height: number };
  }

  export default PDFDocument;
}
