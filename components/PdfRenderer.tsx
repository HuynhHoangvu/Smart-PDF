"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Use CDN URL matching the exact pdfjs version bundled with react-pdf to avoid version mismatch
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type PdfRendererProps = {
  file: File | Blob | string;
  pageNum?: number;
  scale?: number;
  onDocumentLoad?: (numPages: number) => void;
  rotation?: number;
  width?: number;
};

export default function PdfRenderer({
  file,
  pageNum = 1,
  scale = 1.0,
  onDocumentLoad,
  rotation = 0,
  width,
}: PdfRendererProps) {
  const [, setNumPages] = useState<number | null>(null);
  // The page's own /Rotate value (e.g. a scanned doc saved sideways). The
  // backend adds the user's rotation on top of this, so the preview must
  // combine them the same way — otherwise clicking "rotate" can look like
  // it does nothing (or the wrong turn) while the exported file rotates
  // from a different starting point.
  const [nativeRotation, setNativeRotation] = useState(0);

  const onLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    if (onDocumentLoad) onDocumentLoad(numPages);
  };

  const onPageLoadSuccess = (page: { rotate: number }) => {
    setNativeRotation(page.rotate || 0);
  };

  const onLoadError = (err: Error) => {
    console.error("react-pdf load error:", err);
  };

  return (
    <Document
      file={file}
      onLoadSuccess={onLoadSuccess}
      onLoadError={onLoadError}
      loading={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: width || 120,
            height: Math.round((width || 120) * 1.41),
            background: "#f1f5f9",
            borderRadius: 4,
          }}
        >
          <div className="pdf-loading-dots">
            <span /><span /><span />
          </div>
        </div>
      }
      error={
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#e53e3e",
            fontSize: 12,
            textAlign: "center",
            width: width || 120,
            height: Math.round((width || 120) * 1.41),
            gap: 6,
          }}
        >
          <span style={{ fontSize: 22 }}>⚠️</span>
          Không thể tải PDF
        </div>
      }
    >
      <Page
        pageNumber={pageNum}
        scale={scale}
        rotate={(nativeRotation + rotation) % 360}
        width={width}
        onLoadSuccess={onPageLoadSuccess}
        renderAnnotationLayer={false}
        renderTextLayer={false}
      />
    </Document>
  );
}
