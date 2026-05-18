/**
 * Build-time constants injected via Vite `define` (see vite.config.ts).
 *
 * These are string-replaced at build time, not runtime variables — referencing
 * them outside a `JSON.stringify`'d define will produce a literal token that
 * crashes the bundle. Treat them like `process.env.NODE_ENV`.
 */
declare const __TERMS_LAST_UPDATED_ISO__: string;
/** ISO-8601 timestamp of the Vite build, injected at build time. */
declare const __BUILD_TIME_ISO__: string;

/**
 * Ambient type declaration for html2pdf.js, which ships no bundled TS types.
 * Covers the chained-builder API used in the backlink-value-estimator tool.
 */
declare module "html2pdf.js" {
  interface Html2PdfOptions {
    margin?: number | [number, number] | [number, number, number, number];
    filename?: string;
    image?: { type?: string; quality?: number };
    html2canvas?: Record<string, unknown>;
    jsPDF?: {
      unit?: string;
      format?: string | [number, number];
      orientation?: "portrait" | "landscape";
      compress?: boolean;
    };
    pagebreak?: Record<string, unknown>;
    enableLinks?: boolean;
  }

  interface Html2PdfChain {
    from(element: HTMLElement | string): this;
    set(options: Html2PdfOptions): this;
    save(): Promise<void>;
    output(type: string, options?: Record<string, unknown>): Promise<Blob | string>;
    toPdf(): this;
    get(type: string): Promise<unknown>;
  }

  interface Html2PdfFactory {
    (): Html2PdfChain;
    (element: HTMLElement | string, options?: Html2PdfOptions): Html2PdfChain;
  }

  const html2pdf: Html2PdfFactory;
  export default html2pdf;
}
