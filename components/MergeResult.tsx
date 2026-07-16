"use client";

import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  Download,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ChevronDown,
  Printer,
  Trash2,
  CheckCircle2,
  Edit2,
  Loader2,
} from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

type MergeResultProps = {
  blob: Blob;
  initialName?: string;
  onRestart: () => void;
};

export default function MergeResult({ blob, initialName = "merged", onRestart }: MergeResultProps) {
  const [fileName, setFileName] = useState(initialName);
  const [editingName, setEditingName] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [objectUrl] = useState(() => URL.createObjectURL(blob));
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node))
        setShowExportMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fileSizeMB = (blob.size / 1024 / 1024).toFixed(1);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName.endsWith(".pdf") ? fileName : fileName + ".pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleExportDocx = async () => {
    setShowExportMenu(false);
    setExportingDocx(true);
    setExportError("");
    try {
      const formData = new FormData();
      formData.append("file", blob, (fileName || "merged") + ".pdf");
      const res = await fetch(`/api/pdf-to-word`, { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || "Chuyển đổi thất bại");
      const docxBlob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(docxBlob);
      a.download = (fileName || "merged") + ".docx";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setExportError("Xuất DOCX thất bại: " + (err as Error).message);
    } finally {
      setExportingDocx(false);
    }
  };

  return (
    <div className="merge-result-container">
      <div className="result-pdf-viewer">
        <div className="result-pdf-scroll">
          <Document
            file={objectUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={<div className="result-pdf-loading">Đang tải tài liệu...</div>}
          >
            <Page pageNumber={currentPage} width={560} renderTextLayer={false} renderAnnotationLayer={false} />
          </Document>
        </div>

        <div className="result-page-label">Trang {currentPage}</div>

        {numPages && (
          <div className="result-bottom-pager">
            <button
              className="pager-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="pager-text">
              {currentPage} / {numPages}
            </span>
            <button
              className="pager-btn"
              disabled={currentPage >= numPages}
              onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="result-actions-panel">
        <div className="result-done-header">
          <CheckCircle2 size={28} className="result-done-icon" />
          <span className="result-done-text">Đã xong</span>
        </div>

        <div className="result-file-info">
          {editingName ? (
            <div className="result-name-edit-row">
              <input
                autoFocus
                type="text"
                className="result-name-input"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
              />
              <span className="result-ext">.pdf</span>
            </div>
          ) : (
            <div className="result-name-display" onClick={() => setEditingName(true)} title="Nhấn để đổi tên">
              <span className="result-name-text">{fileName}.pdf</span>
              <Edit2 size={14} className="result-edit-icon" />
            </div>
          )}
          <div className="result-meta">
            {fileSizeMB} MB · {numPages ? `${numPages} trang` : "…"}
          </div>
          {exportError && (
            <div style={{ color: "#e53e3e", fontSize: 13, marginTop: 6 }}>{exportError}</div>
          )}
        </div>

        <button className="btn btn-primary result-download-btn" onClick={handleDownload}>
          <Download size={16} /> Tải file xuống
        </button>

        <div style={{ position: "relative" }} ref={exportMenuRef}>
          <button
            className="btn btn-outline result-export-btn"
            onClick={() => setShowExportMenu((v) => !v)}
            disabled={exportingDocx}
          >
            {exportingDocx ? (
              <>
                <Loader2 size={14} className="spin" /> Đang xuất...
              </>
            ) : (
              <>
                <span>Xuất dưới dạng</span>
                <ChevronDown size={14} />
              </>
            )}
          </button>
          {showExportMenu && (
            <div
              style={{
                position: "absolute",
                top: "110%",
                left: 0,
                right: 0,
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
                zIndex: 100,
                overflow: "hidden",
              }}
            >
              <button
                onClick={handleDownload}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "10px 16px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  color: "#1e293b",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <span style={{ fontSize: 18 }}>📄</span> PDF (.pdf)
              </button>
              <button
                onClick={handleExportDocx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "10px 16px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  color: "#1e293b",
                  textAlign: "left",
                  borderTop: "1px solid #f1f5f9",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <span style={{ fontSize: 18 }}>📝</span> Word (.docx)
              </button>
            </div>
          )}
        </div>

        <div className="result-icon-row">
          <button
            className="result-icon-btn"
            title="In"
            onClick={() => {
              const w = window.open(objectUrl);
              w?.addEventListener("load", () => w.print());
            }}
          >
            <Printer size={18} />
          </button>
          <button className="result-icon-btn danger" title="Xóa" onClick={onRestart}>
            <Trash2 size={18} />
          </button>
        </div>

        <div className="result-divider" />

        <button className="btn btn-outline result-restart-btn" onClick={onRestart}>
          <RefreshCw size={15} /> Bắt đầu lại
        </button>
      </div>
    </div>
  );
}
