"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { UploadCloud, ChevronDown } from "lucide-react";

import PdfToWordWorkspace from "@/components/PdfToWordWorkspace";
import PdfImageWorkspace from "@/components/PdfImageWorkspace";
import WordToPdfWorkspace from "@/components/WordToPdfWorkspace";
import ImageConvertWorkspace from "@/components/ImageConvertWorkspace";
import CompressWorkspace from "@/components/CompressWorkspace";

// react-pdf touches browser-only globals (DOMMatrix) at module-eval time, so
// any component that renders PDF thumbnails must be excluded from SSR.
const MergeWorkspace = dynamic(() => import("@/components/MergeWorkspace"), { ssr: false });
const SplitWorkspace = dynamic(() => import("@/components/SplitWorkspace"), { ssr: false });
const TranslateWorkspace = dynamic(() => import("@/components/TranslateWorkspace"), { ssr: false });

const toolConfig: Record<string, { title: string; formats: string[] }> = {
  merge: { title: "Gộp PDF", formats: ["PDF", "Ảnh"] },
  compress: { title: "Nén PDF", formats: ["PDF"] },
  split: { title: "Cắt PDF", formats: ["PDF"] },
  "pdf-to-word": { title: "PDF sang Word", formats: ["PDF"] },
  "pdf-to-image": { title: "PDF sang Hình ảnh", formats: ["PDF"] },
  "image-to-pdf": { title: "Hình ảnh sang PDF", formats: ["Ảnh"] },
  "convert-image": { title: "Chuyển đổi ảnh", formats: ["Ảnh"] },
  translate: { title: "Dịch PDF", formats: ["PDF", "DOCX"] },
  "word-to-pdf": { title: "Word sang PDF", formats: ["DOCX"] },
  read: { title: "Đọc PDF", formats: ["PDF"] },
};

// UX hint only (not a security boundary — the server still validates real
// file content) so the OS file picker pre-filters to what each tool expects.
const toolAccept: Record<string, string> = {
  merge: ".pdf,application/pdf,image/*",
  compress: ".pdf,application/pdf",
  split: ".pdf,application/pdf",
  "pdf-to-word": ".pdf,application/pdf",
  "pdf-to-image": ".pdf,application/pdf",
  "image-to-pdf": "image/*",
  "convert-image": "image/*",
  translate: ".pdf,application/pdf",
  "word-to-pdf": ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export default function ToolPage() {
  const params = useParams();
  const toolId = params.toolId as string;
  const [isDragActive, setIsDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const config = toolConfig[toolId] || { title: "Công cụ", formats: ["PDF"] };

  useEffect(() => {
    if (files.length > 0) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragActive(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (e.clientX === 0 && e.clientY === 0) {
        setIsDragActive(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragActive(false);
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        setFiles(Array.from(e.dataTransfer.files));
      }
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [files.length]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
    }
  };

  return (
    <div
      className={
        files.length > 0 && (toolId === "merge" || toolId === "split" || toolId === "pdf-to-image" || toolId === "image-to-pdf")
          ? "merge-workspace-wrapper"
          : "tool-workspace"
      }
    >
      {toolId === "translate" ? (
        <TranslateWorkspace />
      ) : toolId === "pdf-to-word" ? (
        <PdfToWordWorkspace />
      ) : files.length === 0 ? (
        <div className={`dropzone ${isDragActive ? "active" : ""}`} onClick={() => document.getElementById("file-upload")?.click()}>
          <UploadCloud className="dropzone-icon" size={60} />
          <button className="dropzone-btn">
            Chọn file <ChevronDown size={18} style={{ marginLeft: "5px" }} />
          </button>
          <input
            type="file"
            id="file-upload"
            multiple
            accept={toolAccept[toolId]}
            style={{ display: "none" }}
            onChange={onFileChange}
          />
          <div className="dropzone-hint">Thêm các file PDF, hình ảnh, Word, Excel, và PowerPoint</div>
          <div className="dropzone-formats">
            Các định dạng được hỗ trợ:
            {config.formats.map((f) => (
              <span key={f} className="format-badge ml-1" style={{ backgroundColor: "#fee2e2", color: "#ef4444" }}>
                {f}
              </span>
            ))}
          </div>
        </div>
      ) : toolId === "merge" ? (
        <MergeWorkspace initialFiles={files} onCancel={() => setFiles([])} />
      ) : toolId === "split" ? (
        <SplitWorkspace initialFiles={files} onCancel={() => setFiles([])} />
      ) : toolId === "compress" ? (
        <CompressWorkspace initialFiles={files} onCancel={() => setFiles([])} />
      ) : toolId === "word-to-pdf" ? (
        <WordToPdfWorkspace initialFiles={files} onCancel={() => setFiles([])} />
      ) : toolId === "pdf-to-image" || toolId === "image-to-pdf" ? (
        <PdfImageWorkspace
          initialMode={toolId === "image-to-pdf" ? "image-to-pdf" : "pdf-to-image"}
          initialFiles={files}
          onCancel={() => setFiles([])}
        />
      ) : toolId === "convert-image" ? (
        <ImageConvertWorkspace mode="convert" initialFiles={files} onCancel={() => setFiles([])} />
      ) : (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
          <h3>Đã chọn {files.length} file</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {files.map((f) => (
              <li key={f.name}>
                {f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)
              </li>
            ))}
          </ul>
          <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "center" }}>
            <button className="btn btn-primary">Xử lý ngay ({config.title})</button>
            <button className="btn btn-outline" onClick={() => setFiles([])}>
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
