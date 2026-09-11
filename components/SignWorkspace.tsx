"use client";

import { useCallback, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PenLine, Upload, Trash2, Loader2, ChevronLeft, ChevronRight, Move, RefreshCw, Download } from "lucide-react";
import FileDropzone from "./FileDropzone";
import MergeResult from "./MergeResult";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const PREVIEW_WIDTH = 560;
const DEFAULT_SIG_WIDTH = 160;
const DEFAULT_SIG_HEIGHT = 70;

type PageDims = { renderedWidth: number; renderedHeight: number; pointWidth: number; pointHeight: number };
type SigRect = { page: number; x: number; y: number; width: number; height: number };
type DragState =
  | { mode: "move"; startClientX: number; startClientY: number; startRect: SigRect }
  | { mode: "resize"; startClientX: number; startClientY: number; startRect: SigRect };

// Turns a photo of "signature on white paper" into a transparent PNG so it
// doesn't paste a white box over the document — light pixels become fully
// transparent, dark ink stays opaque, with a soft ramp in between so the
// stroke edges don't look jagged.
function removeLightBackground(canvas: HTMLCanvasElement, threshold = 210, floor = 70) {
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (luminance >= threshold) {
      data[i + 3] = 0;
    } else if (luminance > floor) {
      data[i + 3] = Math.round(((threshold - luminance) / (threshold - floor)) * 255);
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

export default function SignWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageDimsRef = useRef<Map<number, PageDims>>(new Map());
  const [, forcePageDimsUpdate] = useState(0);

  const [signature, setSignature] = useState<string | null>(null);
  const [sigRect, setSigRect] = useState<SigRect | null>(null);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<"draw" | "upload">("draw");
  const [hasDrawing, setHasDrawing] = useState(false);

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Blob | null>(null);

  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const onDocumentLoad = ({ numPages: n }: { numPages: number }) => setNumPages(n);

  const onPageLoadSuccess = (page: { width: number; height: number; originalWidth: number; originalHeight: number }) => {
    pageDimsRef.current.set(currentPage, {
      renderedWidth: page.width,
      renderedHeight: page.height,
      pointWidth: page.originalWidth,
      pointHeight: page.originalHeight,
    });
    forcePageDimsUpdate((n) => n + 1);
  };

  const currentDims = pageDimsRef.current.get(currentPage);

  // ---- Draw-a-signature canvas ----
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = true;
    lastPointRef.current = getCanvasPoint(e);
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };

  const continueDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = drawCanvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const point = getCanvasPoint(e);
    const last = lastPointRef.current!;
    ctx.strokeStyle = "#1a202c";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
    setHasDrawing(true);
  };

  const stopDrawing = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearDrawing = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
  };

  const placeSignature = (dataUrl: string) => {
    setSignature(dataUrl);
    setCreating(false);
    const dims = currentDims;
    const boxWidth = DEFAULT_SIG_WIDTH;
    const boxHeight = DEFAULT_SIG_HEIGHT;
    const centerX = dims ? Math.max(0, (dims.renderedWidth - boxWidth) / 2) : 40;
    const centerY = dims ? Math.max(0, dims.renderedHeight - boxHeight - 40) : 40;
    setSigRect({ page: currentPage, x: centerX, y: centerY, width: boxWidth, height: boxHeight });
  };

  const useDrawnSignature = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas || !hasDrawing) return;
    placeSignature(canvas.toDataURL("image/png"));
  };

  // ---- Upload-a-signature (photo) ----
  const handleSignatureUpload = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      const MAX = 800;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      removeLightBackground(canvas);
      placeSignature(canvas.toDataURL("image/png"));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f);
  };

  // ---- Drag / resize the placed signature ----
  const onOverlayPointerDown = (e: React.PointerEvent, mode: "move" | "resize") => {
    if (!sigRect) return;
    e.stopPropagation();
    e.preventDefault();
    dragStateRef.current = { mode, startClientX: e.clientX, startClientY: e.clientY, startRect: sigRect };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onOverlayPointerMove = (e: React.PointerEvent) => {
    const drag = dragStateRef.current;
    if (!drag || !sigRect || !currentDims) return;
    const dx = e.clientX - drag.startClientX;
    const dy = e.clientY - drag.startClientY;
    if (drag.mode === "move") {
      const x = Math.min(Math.max(0, drag.startRect.x + dx), currentDims.renderedWidth - drag.startRect.width);
      const y = Math.min(Math.max(0, drag.startRect.y + dy), currentDims.renderedHeight - drag.startRect.height);
      setSigRect({ ...drag.startRect, x, y });
    } else {
      const width = Math.min(Math.max(30, drag.startRect.width + dx), currentDims.renderedWidth - drag.startRect.x);
      const height = Math.min(Math.max(20, drag.startRect.height + dy), currentDims.renderedHeight - drag.startRect.y);
      setSigRect({ ...drag.startRect, width, height });
    }
  };

  const onOverlayPointerUp = () => {
    dragStateRef.current = null;
  };

  const handleFinish = useCallback(async () => {
    if (!file || !signature || !sigRect) return;
    const dims = pageDimsRef.current.get(sigRect.page);
    if (!dims) return;
    setStatus("loading");
    setError("");
    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);
      const page = pdfDoc.getPage(sigRect.page - 1);
      const pngBytes = await (await fetch(signature)).arrayBuffer();
      const pngImage = await pdfDoc.embedPng(pngBytes);

      const scale = dims.pointWidth / dims.renderedWidth;
      const widthPt = sigRect.width * scale;
      const heightPt = sigRect.height * scale;
      const xPt = sigRect.x * scale;
      const yPt = page.getHeight() - sigRect.y * scale - heightPt;
      page.drawImage(pngImage, { x: xPt, y: yPt, width: widthPt, height: heightPt });

      const outBytes = await pdfDoc.save();
      const blob = new Blob([outBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResult(blob);
      setStatus("done");
    } catch (e) {
      setError(`Chèn chữ ký thất bại: ${(e as Error).message}`);
      setStatus("error");
    }
  }, [file, signature, sigRect]);

  if (result) {
    return (
      <MergeResult
        blob={result}
        initialName={file?.name.replace(/\.pdf$/i, "") || "signed"}
        onRestart={() => {
          setResult(null);
          setFile(null);
          setSignature(null);
          setSigRect(null);
          setNumPages(0);
          setCurrentPage(1);
          pageDimsRef.current.clear();
          setStatus("idle");
        }}
      />
    );
  }

  if (!file) {
    return (
      <div style={{ width: "100%", maxWidth: 800, margin: "40px auto", padding: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Ký tên PDF</h2>
        <FileDropzone
          accept=".pdf,application/pdf"
          formats={["PDF"]}
          hint="hoặc kéo thả file PDF vào đây"
          onFiles={(files) => files[0] && setFile(files[0])}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Ký tên PDF</h2>
        <div style={{ display: "flex", gap: 10 }}>
          {error && <span style={{ color: "#e53e3e", fontSize: 13, alignSelf: "center" }}>{error}</span>}
          <button className="btn btn-outline" onClick={() => setFile(null)}>
            <RefreshCw size={14} style={{ marginRight: 6 }} /> Chọn file khác
          </button>
          <button className="btn btn-primary" onClick={handleFinish} disabled={!signature || !sigRect || status === "loading"}>
            {status === "loading" ? (
              <>
                <Loader2 size={14} className="spin" /> Đang xử lý...
              </>
            ) : (
              <>
                <Download size={14} style={{ marginRight: 6 }} /> Hoàn thành
              </>
            )}
          </button>
        </div>
      </div>

      {!signature && (
        <div style={{ marginBottom: 16, display: "flex", gap: 10 }}>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <PenLine size={14} style={{ marginRight: 6 }} /> Tạo chữ ký
          </button>
        </div>
      )}

      {signature && (
        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#4a5568" }}>
          <Move size={14} /> Kéo để di chuyển, kéo góc dưới phải để đổi kích thước.
          <button
            className="btn btn-outline"
            style={{ padding: "4px 10px", fontSize: 12 }}
            onClick={() => {
              setSignature(null);
              setSigRect(null);
            }}
          >
            <Trash2 size={12} style={{ marginRight: 4 }} /> Xóa chữ ký
          </button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <button className="btn btn-outline" style={{ padding: "6px 10px" }} disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontSize: 13, color: "#4a5568" }}>
          Trang {currentPage} / {numPages || "…"}
        </span>
        <button className="btn btn-outline" style={{ padding: "6px 10px" }} disabled={currentPage >= numPages} onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}>
          <ChevronRight size={14} />
        </button>
      </div>

      <div
        ref={overlayRef}
        style={{ position: "relative", display: "inline-block", maxWidth: "100%", boxShadow: "0 2px 16px rgba(0,0,0,0.1)", touchAction: "none" }}
        onPointerMove={onOverlayPointerMove}
        onPointerUp={onOverlayPointerUp}
      >
        <Document file={file} onLoadSuccess={onDocumentLoad}>
          <Page pageNumber={currentPage} width={PREVIEW_WIDTH} onLoadSuccess={onPageLoadSuccess} renderAnnotationLayer={false} renderTextLayer={false} />
        </Document>

        {signature && sigRect && sigRect.page === currentPage && (
          <div
            style={{
              position: "absolute",
              left: sigRect.x,
              top: sigRect.y,
              width: sigRect.width,
              height: sigRect.height,
              border: "2px dashed #0062ff",
              cursor: "move",
              touchAction: "none",
            }}
            onPointerDown={(e) => onOverlayPointerDown(e, "move")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={signature} alt="Chữ ký" draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} />
            <div
              onPointerDown={(e) => onOverlayPointerDown(e, "resize")}
              style={{
                position: "absolute",
                right: -6,
                bottom: -6,
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#0062ff",
                cursor: "nwse-resize",
                touchAction: "none",
              }}
            />
          </div>
        )}
      </div>

      {creating && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={() => setCreating(false)}
        >
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 480, maxWidth: "90vw" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button className={`btn ${tab === "draw" ? "btn-primary" : "btn-outline"}`} style={{ flex: 1 }} onClick={() => setTab("draw")}>
                Vẽ chữ ký
              </button>
              <button className={`btn ${tab === "upload" ? "btn-primary" : "btn-outline"}`} style={{ flex: 1 }} onClick={() => setTab("upload")}>
                <Upload size={14} style={{ marginRight: 6 }} /> Tải ảnh lên
              </button>
            </div>

            {tab === "draw" ? (
              <>
                <canvas
                  ref={drawCanvasRef}
                  width={432}
                  height={180}
                  style={{ width: "100%", height: 180, border: "1px dashed #cbd5e0", borderRadius: 8, background: "#fff", touchAction: "none", cursor: "crosshair" }}
                  onPointerDown={startDrawing}
                  onPointerMove={continueDrawing}
                  onPointerUp={stopDrawing}
                  onPointerLeave={stopDrawing}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
                  <button className="btn btn-outline" onClick={clearDrawing}>
                    <Trash2 size={14} style={{ marginRight: 6 }} /> Xóa
                  </button>
                  <button className="btn btn-primary" onClick={useDrawnSignature} disabled={!hasDrawing}>
                    Dùng chữ ký này
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, color: "#718096", marginBottom: 12 }}>
                  Chụp/scan chữ ký viết trên giấy trắng — nền trắng sẽ tự động được xóa để chỉ còn nét ký.
                </p>
                <FileDropzone accept="image/*" formats={["PNG", "JPG"]} onFiles={handleSignatureUpload} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
