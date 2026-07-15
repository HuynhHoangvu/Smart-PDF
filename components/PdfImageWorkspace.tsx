"use client";

import { useState } from "react";
import { FileText, Image as ImageIcon } from "lucide-react";
import PdfToImageWorkspace from "./PdfToImageWorkspace";
import ImageConvertWorkspace from "./ImageConvertWorkspace";

type PdfImageWorkspaceProps = {
  initialMode?: "pdf-to-image" | "image-to-pdf";
  initialFiles?: File[];
  onCancel?: () => void;
};

export default function PdfImageWorkspace({ initialMode = "pdf-to-image", initialFiles, onCancel }: PdfImageWorkspaceProps) {
  const [mode, setMode] = useState<"pdf-to-image" | "image-to-pdf">(initialMode);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "20px 0 0" }}>
        <button
          className={`btn ${mode === "pdf-to-image" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setMode("pdf-to-image")}
        >
          <FileText size={14} style={{ marginRight: 6 }} /> PDF → Hình ảnh
        </button>
        <button
          className={`btn ${mode === "image-to-pdf" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setMode("image-to-pdf")}
        >
          <ImageIcon size={14} style={{ marginRight: 6 }} /> Hình ảnh → PDF
        </button>
      </div>

      {mode === "pdf-to-image" ? (
        <PdfToImageWorkspace initialFiles={initialMode === "pdf-to-image" ? initialFiles : undefined} onCancel={onCancel} />
      ) : (
        <ImageConvertWorkspace mode="to-pdf" initialFiles={initialMode === "image-to-pdf" ? initialFiles : undefined} onCancel={onCancel} />
      )}
    </div>
  );
}
