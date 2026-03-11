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
    fillColor(color: string): this;
    strokeColor(color: string): this;
    text(text: string, options?: Record<string, unknown>): this;
    text(text: string, x?: number, y?: number, options?: Record<string, unknown>): this;
    moveDown(lines?: number): this;
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    stroke(color?: string): this;
    rect(x: number, y: number, w: number, h: number): this;
    fill(color?: string): this;
    circle(x: number, y: number, radius: number): this;
    image(src: string | Buffer, options?: Record<string, unknown>): this;
    image(src: string | Buffer, x?: number, y?: number, options?: Record<string, unknown>): this;
    addPage(options?: PDFDocumentOptions): this;
    save(): this;
    restore(): this;
    end(): void;
    x: number;
    y: number;
    page: { width: number; height: number };
  }

  export default PDFDocument;
}
