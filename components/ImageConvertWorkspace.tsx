"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, RefreshCw, Loader2, ArrowLeftRight, ImagePlus } from "lucide-react";
import MergeResult from "./MergeResult";

type ImageConvertWorkspaceProps = {
  mode?: "convert" | "to-pdf" | "compress";
  initialFiles?: File[];
  onCancel?: () => void;
};

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|bmp|tiff?|avif|heic|heif)$/i;
const COMPRESS_LEVELS = ["medium", "extreme", "ultra"] as const;
type CompressLevel = (typeof COMPRESS_LEVELS)[number];
const LEVEL_LABEL: Record<CompressLevel, string> = { medium: "Vừa phải", extreme: "Mạnh", ultra: "Tối đa" };

type Estimate = { status: "loading" | "done" | "error"; blob?: Blob; size?: number };

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// Some browsers/OSes don't tag less common formats with a MIME type at all
// (e.g. dragging a .heic file on Windows can report type === ""), so fall
// back to the extension instead of silently dropping the file.
function isImageFile(f: File) {
  return f.type.startsWith("image/") || IMAGE_EXTENSIONS.test(f.name);
}

export default function ImageConvertWorkspace({ mode = "convert", initialFiles, onCancel }: ImageConvertWorkspaceProps) {
  const [files, setFiles] = useState<File[]>(() => (initialFiles || []).filter(isImageFile));
  const [toFmt, setToFmt] = useState(mode === "to-pdf" ? "pdf" : "png");
  const [level, setLevel] = useState<"medium" | "extreme" | "ultra">("medium");
  const [compressFmt, setCompressFmt] = useState<"auto" | "jpg" | "png" | "webp">("auto");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [pdfResult, setPdfResult] = useState<Blob | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoConvertedRef = useRef(false);
  const [estimates, setEstimates] = useState<Partial<Record<CompressLevel, Estimate>>>({});
  const estimateRunId = useRef(0);

  // Explicit extensions alongside the MIME wildcard — some browsers/OSes
  // mis-tag less common formats (webp, heic, bmp) and would otherwise
  // filter them out of the picker even though sharp can read them fine.
  const accept = "image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.avif,.heic,.heif";
  const multi = mode === "to-pdf" || mode === "compress";

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
        if (skipped) {
          setError(`Đã bỏ qua ${decodeURIComponent(skipped)} vì file lỗi hoặc không đúng định dạng ảnh. Các ảnh còn lại đã được gộp thành công.`);
        }
        setPdfResult(blob);
      } else if (mode === "compress") {
        for (const [i, f] of files.entries()) {
          // The first file was already compressed at this exact level+format
          // while the user was picking one (see the estimate effect above).
          const cached = i === 0 ? estimates[level] : undefined;
          let blob: Blob;
          if (cached?.status === "done" && cached.blob) {
            blob = cached.blob;
          } else {
            const form = new FormData();
            form.append("file", f);
            form.append("level", level);
            form.append("format", compressFmt);
            const res = await fetch(`/api/compress-image`, { method: "POST", body: form });
            if (!res.ok) throw new Error((await res.json()).detail || "Lỗi");
            blob = await res.blob();
          }
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          const ext = blob.type === "image/jpeg" ? "jpg" : blob.type === "image/webp" ? "webp" : "png";
          a.download = f.name.replace(/\.\w+$/, "") + "_compressed." + ext;
          a.click();
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
  }, [files, mode, toFmt, level, compressFmt, estimates]);

  // As soon as an image is picked (compress mode only), actually compress it
  // at all three levels in the background — real sizes beat vague labels,
  // and the result is cached so hitting "Nén & Tải về" for whichever level
  // the user settles on is instant for that first file instead of
  // re-running the same work. Based on the first file only (representative
  // even when several were selected — a full per-file matrix would be a lot
  // of extra requests for something that's just meant as a preview).
  useEffect(() => {
    if (mode !== "compress" || !files.length) return;
    const file = files[0];
    const runId = ++estimateRunId.current;
    setEstimates({});
    COMPRESS_LEVELS.forEach((lvl) => {
      setEstimates((prev) => ({ ...prev, [lvl]: { status: "loading" } }));
      (async () => {
        try {
          const form = new FormData();
          form.append("file", file);
          form.append("level", lvl);
          form.append("format", compressFmt);
          const res = await fetch(`/api/compress-image`, { method: "POST", body: form });
          if (runId !== estimateRunId.current) return;
          if (!res.ok) {
            setEstimates((prev) => ({ ...prev, [lvl]: { status: "error" } }));
            return;
          }
          const blob = await res.blob();
          if (runId !== estimateRunId.current) return;
          setEstimates((prev) => ({ ...prev, [lvl]: { status: "done", blob, size: blob.size } }));
        } catch {
          if (runId === estimateRunId.current) setEstimates((prev) => ({ ...prev, [lvl]: { status: "error" } }));
        }
      })();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, files, compressFmt]);

  // Auto-combine as soon as images land (drag-drop or initialFiles) — no
  // extra click needed for the to-pdf flow.
  useEffect(() => {
    if (mode === "to-pdf" && files.length > 0 && status === "idle" && !autoConvertedRef.current) {
      autoConvertedRef.current = true;
      convert();
    }
    if (files.length === 0) autoConvertedRef.current = false;
  }, [mode, files, status, convert]);

  const title = mode === "to-pdf" ? "Hình ảnh → PDF" : mode === "compress" ? "Nén hình ảnh" : "Chuyển đổi định dạng ảnh";

  if (pdfResult) {
    return (
      <MergeResult
        blob={pdfResult}
        initialName={files[0]?.name.replace(/\.\w+$/, "") || "converted"}
        onRestart={() => {
          setPdfResult(null);
          setFiles([]);
          setStatus("idle");
          setError("");
          onCancel?.();
        }}
      />
    );
  }

  if (files.length === 0) {
    return (
      <div style={{ width: "100%", maxWidth: 600, margin: "40px auto", padding: 24 }}>
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
          <div className="dropzone-hint">
            {mode === "to-pdf"
              ? "hoặc kéo thả nhiều ảnh vào đây — tự động gộp thành PDF"
              : mode === "compress"
                ? "hoặc kéo thả nhiều ảnh vào đây"
                : "hoặc kéo thả ảnh vào đây"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>{title}</h2>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <button className="btn btn-outline" onClick={() => inputRef.current?.click()}>
          <Upload size={14} style={{ marginRight: 6 }} /> Chọn ảnh
        </button>
        <input ref={inputRef} type="file" accept={accept} multiple={multi} hidden onChange={(e) => e.target.files && handleFiles(e.target.files)} />
        <span style={{ fontSize: 13, color: "var(--text-light)" }}>{files.length} file đã chọn</span>
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

      {mode === "compress" && (
        <div style={{ marginBottom: 20, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <label style={{ fontSize: 13 }}>
            Mức độ nén:&nbsp;
            <select value={level} onChange={(e) => setLevel(e.target.value as typeof level)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
              <option value="medium">Vừa phải (giữ chất lượng)</option>
              <option value="extreme">Mạnh</option>
              <option value="ultra">Tối đa (giảm dung lượng nhiều nhất)</option>
            </select>
          </label>
          <label style={{ fontSize: 13 }}>
            Định dạng tải về:&nbsp;
            <select value={compressFmt} onChange={(e) => setCompressFmt(e.target.value as typeof compressFmt)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
              <option value="auto">Giữ nguyên định dạng gốc</option>
              <option value="jpg">JPG</option>
              <option value="png">PNG</option>
              <option value="webp">WEBP</option>
            </select>
          </label>
        </div>
      )}

      {mode === "compress" && files.length > 0 && (
        <div style={{ marginBottom: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {COMPRESS_LEVELS.map((lvl) => {
            const e = estimates[lvl];
            const active = level === lvl;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevel(lvl)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: `1.5px solid ${active ? "#0062ff" : "#e2e8f0"}`,
                  background: active ? "#ebf3ff" : "#fff",
                  cursor: "pointer",
                  textAlign: "left",
                  minWidth: 120,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dark)" }}>{LEVEL_LABEL[lvl]}</div>
                {!e || e.status === "loading" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#a0aec0" }}>
                    <Loader2 size={10} className="spin" /> Đang tính...
                  </div>
                ) : e.status === "error" || !e.size ? (
                  <div style={{ fontSize: 11, color: "#a0aec0" }}>Không tính được</div>
                ) : (
                  <div style={{ fontSize: 11 }}>
                    <span style={{ color: "var(--text-dark)", fontWeight: 600 }}>{formatBytes(e.size)}</span>{" "}
                    <span style={{ color: files[0].size > e.size ? "#38a169" : "#a0aec0" }}>
                      ({files[0].size > e.size ? `-${Math.round(((files[0].size - e.size) / files[0].size) * 100)}%` : "không giảm"})
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {files.length > 0 && (
        <div style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {files.map((f) => (
            <div key={f.name} style={{ fontSize: 12, background: "#edf2f7", padding: "4px 10px", borderRadius: 20, color: "var(--text-light)" }}>
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
          ) : mode === "compress" ? (
            <>
              <ArrowLeftRight size={14} /> Nén & Tải về
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
