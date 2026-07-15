"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, RefreshCw, Loader2, ArrowLeftRight, ImagePlus } from "lucide-react";

type ImageConvertWorkspaceProps = {
  mode?: "convert" | "to-pdf";
  initialFiles?: File[];
  onCancel?: () => void;
};

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|bmp|tiff?|avif|heic|heif)$/i;

// Some browsers/OSes don't tag less common formats with a MIME type at all
// (e.g. dragging a .heic file on Windows can report type === ""), so fall
// back to the extension instead of silently dropping the file.
function isImageFile(f: File) {
  return f.type.startsWith("image/") || IMAGE_EXTENSIONS.test(f.name);
}

export default function ImageConvertWorkspace({ mode = "convert", initialFiles, onCancel }: ImageConvertWorkspaceProps) {
  const [files, setFiles] = useState<File[]>(() => (initialFiles || []).filter(isImageFile));
  const [toFmt, setToFmt] = useState(mode === "to-pdf" ? "pdf" : "png");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoConvertedRef = useRef(false);

  // Explicit extensions alongside the MIME wildcard — some browsers/OSes
  // mis-tag less common formats (webp, heic, bmp) and would otherwise
  // filter them out of the picker even though sharp can read them fine.
  const accept = "image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.avif,.heic,.heif";
  const multi = mode === "to-pdf";

  const handleFiles = (fList: FileList | File[]) => {
    setFiles(Array.from(fList).filter(isImageFile));
    setStatus("idle");
    setError("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const convert = useCallback(async () => {
    if (!files.length) return;
    setStatus("loading");
    setError("");
    try {
      if (mode === "to-pdf") {
        const form = new FormData();
        files.forEach((f) => form.append("files", f));
        const res = await fetch(`/api/images-to-pdf`, { method: "POST", body: form });
        if (!res.ok) throw new Error((await res.json()).detail || "Lỗi");
        const skipped = res.headers.get("X-Skipped-Files");
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "converted.pdf";
        a.click();
        if (skipped) {
          setError(`Đã bỏ qua ${decodeURIComponent(skipped)} vì file lỗi hoặc không đúng định dạng ảnh. Các ảnh còn lại đã được gộp thành công.`);
        }
      } else {
        for (const f of files) {
          const form = new FormData();
          form.append("file", f);
          form.append("to_format", toFmt);
          const res = await fetch(`/api/convert-image`, { method: "POST", body: form });
          if (!res.ok) throw new Error((await res.json()).detail || "Lỗi");
          const blob = await res.blob();
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = f.name.replace(/\.\w+$/, "") + "." + toFmt;
          a.click();
        }
      }
      setStatus("done");
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, mode, toFmt]);

  // Auto-combine as soon as images land (drag-drop or initialFiles) — no
  // extra click needed for the to-pdf flow.
  useEffect(() => {
    if (mode === "to-pdf" && files.length > 0 && status === "idle" && !autoConvertedRef.current) {
      autoConvertedRef.current = true;
      convert();
    }
    if (files.length === 0) autoConvertedRef.current = false;
  }, [mode, files, status, convert]);

  const title = mode === "to-pdf" ? "Hình ảnh → PDF" : "Chuyển đổi định dạng ảnh";

  if (files.length === 0) {
    return (
      <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>{title}</h2>
        <div
          className={`dropzone ${dragging ? "active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{ cursor: "pointer" }}
        >
          <input ref={inputRef} type="file" accept={accept} multiple={multi} hidden onChange={(e) => e.target.files && handleFiles(e.target.files)} />
          <ImagePlus className="dropzone-icon" size={60} />
          <button className="dropzone-btn">
            <Upload size={14} style={{ marginRight: 6 }} /> Chọn ảnh
          </button>
          <div className="dropzone-hint">{mode === "to-pdf" ? "hoặc kéo thả nhiều ảnh vào đây — tự động gộp thành PDF" : "hoặc kéo thả ảnh vào đây"}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>{title}</h2>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <button className="btn btn-outline" onClick={() => inputRef.current?.click()}>
          <Upload size={14} style={{ marginRight: 6 }} /> Chọn ảnh
        </button>
        <input ref={inputRef} type="file" accept={accept} multiple={multi} hidden onChange={(e) => e.target.files && handleFiles(e.target.files)} />
        <span style={{ fontSize: 13, color: "#4a5568" }}>{files.length} file đã chọn</span>
      </div>

      {mode === "convert" && (
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13 }}>
            Chuyển sang:&nbsp;
            <select value={toFmt} onChange={(e) => setToFmt(e.target.value)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
              <option value="png">PNG</option>
              <option value="jpg">JPG</option>
              <option value="webp">WEBP</option>
            </select>
          </label>
        </div>
      )}

      {files.length > 0 && (
        <div style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {files.map((f) => (
            <div key={f.name} style={{ fontSize: 12, background: "#edf2f7", padding: "4px 10px", borderRadius: 20, color: "#4a5568" }}>
              {f.name}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-primary" onClick={convert} disabled={!files.length || status === "loading"}>
          {status === "loading" ? (
            <>
              <Loader2 size={14} className="spin" /> Đang xử lý...
            </>
          ) : (
            <>
              <ArrowLeftRight size={14} /> Chuyển đổi & Tải về
            </>
          )}
        </button>
        <button className="btn btn-outline" onClick={onCancel}>
          <RefreshCw size={14} style={{ marginRight: 6 }} /> Chọn lại
        </button>
      </div>

      {status === "done" && <p style={{ color: "#38a169", marginTop: 12, fontSize: 13 }}>✓ Đã tải về thành công!</p>}
      {error && <p style={{ color: "#e53e3e", marginTop: 12, fontSize: 13 }}>{error}</p>}
    </div>
  );
}
