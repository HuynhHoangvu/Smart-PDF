"use client";

import { useState, useRef } from "react";
import { Trash2, RotateCw, Scissors, Download, Loader2, Eye, X, ChevronLeft, ChevronRight, Undo2 } from "lucide-react";
import PdfRenderer from "./PdfRenderer";
import MergeResult from "./MergeResult";

type PageItem = {
  id: string;
  pageNum: number;
  kept: boolean;
  checked: boolean;
  rotation: number;
};

type SplitWorkspaceProps = {
  initialFiles: File[];
  onCancel?: () => void;
};

export default function SplitWorkspace({ initialFiles, onCancel }: SplitWorkspaceProps) {
  const [file] = useState<File | null>(initialFiles?.[0] || null);
  const [fileUrl] = useState<string | null>(() => (file ? URL.createObjectURL(file) : null));
  const [pages, setPages] = useState<PageItem[]>([]);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [previewPage, setPreviewPage] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const lastClickedRef = useRef<number | null>(null);
  const draggedIdRef = useRef<string | null>(null);

  const onDocumentLoad = (count: number) => {
    if (numPages) return;
    setNumPages(count);
    setPages(
      Array.from({ length: count }, (_, i) => ({
        id: `page-${i + 1}`,
        pageNum: i + 1,
        kept: true,
        checked: false,
        rotation: 0,
      }))
    );
  };

  const deletePage = (id?: string) => setPages((ps) => ps.map((p) => (p.id === id ? { ...p, kept: false, checked: false } : p)));

  const restorePage = (id?: string) => setPages((ps) => ps.map((p) => (p.id === id ? { ...p, kept: true } : p)));

  const rotatePage = (id: string | undefined, angle = 90) =>
    setPages((ps) => ps.map((p) => (p.id === id ? { ...p, rotation: (p.rotation + angle + 360) % 360 } : p)));

  const toggleCheckPage = (id: string, event?: MouseEvent) => {
    const clickedPage = pages.find((p) => p.id === id);
    if (event?.shiftKey && lastClickedRef.current != null && clickedPage) {
      const [lo, hi] = [lastClickedRef.current, clickedPage.pageNum].sort((a, b) => a - b);
      setPages((ps) => ps.map((p) => (p.pageNum >= lo && p.pageNum <= hi ? { ...p, checked: true } : p)));
    } else {
      setPages((ps) => ps.map((p) => (p.id === id ? { ...p, checked: !p.checked } : p)));
    }
    if (clickedPage) lastClickedRef.current = clickedPage.pageNum;
  };

  const checkedCount = pages.filter((p) => p.checked).length;
  const allChecked = pages.length > 0 && pages.every((p) => p.checked);
  const toggleCheckAll = () => setPages((ps) => ps.map((p) => ({ ...p, checked: !allChecked })));

  const deleteChecked = () => setPages((ps) => ps.map((p) => (p.checked ? { ...p, kept: false, checked: false } : p)));

  const keptCount = pages.filter((p) => p.kept).length;
  const removedCount = pages.length - keptCount;

  const onCardDragStart = (e: React.DragEvent, id: string) => {
    draggedIdRef.current = id;
    e.dataTransfer.effectAllowed = "move";
  };
  const onCardDragOver = (e: React.DragEvent) => e.preventDefault();
  const onCardDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const draggedId = draggedIdRef.current;
    if (!draggedId || draggedId === targetId) return;
    setPages((prev) => {
      const arr = [...prev];
      const from = arr.findIndex((x) => x.id === draggedId);
      const to = arr.findIndex((x) => x.id === targetId);
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
    draggedIdRef.current = null;
  };

  const deleteRange = () => {
    const from = parseInt(rangeFrom, 10);
    const to = parseInt(rangeTo, 10);
    if (!from || !to || from < 1 || to < 1) {
      setError("Vui lòng nhập số trang hợp lệ");
      return;
    }
    const [lo, hi] = from <= to ? [from, to] : [to, from];
    setError("");
    setPages((ps) => ps.map((p) => (p.pageNum >= lo && p.pageNum <= hi ? { ...p, kept: false, checked: false } : p)));
    setRangeFrom("");
    setRangeTo("");
  };

  const handleExport = async () => {
    setError("");
    const kept = pages.filter((p) => p.kept);
    if (kept.length < 1 || !file) {
      setError("Bạn đã xóa hết trang, cần giữ lại ít nhất 1 trang.");
      return;
    }

    setIsExporting(true);
    try {
      const manifest = kept.map((p) => ({ file_index: 0, page: p.pageNum, rotation: p.rotation || 0 }));
      const formData = new FormData();
      formData.append("files", file, file.name);
      formData.append("manifest", JSON.stringify(manifest));
      const base = file.name.replace(/\.pdf$/i, "");
      formData.append("output_name", base);

      const res = await fetch(`/api/merge-pages`, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Lỗi không xác định" }));
        throw new Error(err.detail);
      }
      const blob = await res.blob();
      setResult({ blob, name: `${base}_cat` });
    } catch (e) {
      setError(`Cắt PDF thất bại: ${(e as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (result) {
    return (
      <MergeResult
        blob={result.blob}
        initialName={result.name}
        onRestart={() => {
          setResult(null);
          onCancel?.();
        }}
      />
    );
  }

  if (!file) return null;

  const previewPageItem = pages.find((p) => p.pageNum === previewPage);

  return (
    <div className="workspace-container">
      <div className="workspace-toolbar">
        <div className="toolbar-left">
          <Scissors size={16} style={{ marginRight: 6 }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>{file.name}</span>
          {numPages && (
            <span style={{ fontSize: 13, color: "#718096", marginLeft: 10 }}>
              Giữ {keptCount}/{numPages} trang{removedCount > 0 ? ` · đã xóa ${removedCount}` : ""}
            </span>
          )}
          <div className="toolbar-divider" />
          <button className="toolbar-icon-btn" title="Xóa các trang đã chọn" disabled={checkedCount === 0} onClick={deleteChecked}>
            <Trash2 size={15} />
          </button>
        </div>
        <div className="toolbar-right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {error && <span style={{ color: "#e53e3e", fontSize: 13 }}>{error}</span>}
          <button className="btn btn-outline" onClick={onCancel} style={{ fontSize: 14 }}>
            Hủy
          </button>
          <button
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 148, justifyContent: "center" }}
            onClick={handleExport}
            disabled={isExporting || keptCount === 0}
          >
            {isExporting ? (
              <>
                <Loader2 size={15} className="spin" /> Đang cắt...
              </>
            ) : (
              <>
                <Download size={15} /> Hoàn thành
              </>
            )}
          </button>
        </div>
      </div>

      <div className="workspace-sub-toolbar" style={{ flexWrap: "wrap", gap: 12 }}>
        <label className="select-all-label">
          <input type="checkbox" checked={allChecked} onChange={toggleCheckAll} />
          <span>{checkedCount > 0 ? `Đã chọn ${checkedCount} trang` : "Giữ Shift khi chọn để chọn nhiều trang liên tiếp · Kéo thẻ trang để đổi vị trí"}</span>
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#4a5568" }}>
          <span>Xóa từ trang</span>
          <input
            type="number"
            min="1"
            max={numPages || 9999}
            value={rangeFrom}
            onChange={(e) => setRangeFrom(e.target.value)}
            style={{ width: 56, padding: "4px 6px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13 }}
          />
          <span>đến</span>
          <input
            type="number"
            min="1"
            max={numPages || 9999}
            value={rangeTo}
            onChange={(e) => setRangeTo(e.target.value)}
            style={{ width: 56, padding: "4px 6px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13 }}
          />
          <button className="btn btn-outline" style={{ fontSize: 12, padding: "4px 10px" }} onClick={deleteRange} disabled={!rangeFrom || !rangeTo}>
            <Trash2 size={12} style={{ marginRight: 4 }} /> Xóa
          </button>
        </div>
      </div>

      <div className="workspace-grid pages-grid">
        {pages.length === 0 && (
          <div style={{ padding: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "absolute", visibility: "hidden", pointerEvents: "none" }}>
              <PdfRenderer file={fileUrl!} pageNum={1} width={100} onDocumentLoad={onDocumentLoad} />
            </div>
            <Loader2 size={16} className="spin" />
            <span style={{ fontSize: 13, color: "#718096" }}>Đang tải trang PDF...</span>
          </div>
        )}
        {pages.map((p) => (
          <div
            key={p.id}
            className={`page-card ${p.kept ? "" : "page-deselected"} ${p.checked ? "page-marked" : ""}`}
            draggable
            onDragStart={(e) => onCardDragStart(e, p.id)}
            onDragOver={onCardDragOver}
            onDrop={(e) => onCardDrop(e, p.id)}
          >
            <input
              type="checkbox"
              className="file-checkbox"
              checked={p.checked}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => toggleCheckPage(p.id, e.nativeEvent as unknown as MouseEvent)}
            />
            <div className="file-preview">
              <div className="card-hover-overlay">
                <button
                  className="overlay-btn"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    setPreviewPage(p.pageNum);
                  }}
                >
                  <Eye size={13} />
                </button>
                {p.kept ? (
                  <button className="overlay-btn delete" onMouseDown={(e) => e.stopPropagation()} onClick={() => deletePage(p.id)}>
                    <Trash2 size={13} />
                  </button>
                ) : (
                  <button className="overlay-btn" title="Khôi phục trang" onMouseDown={(e) => e.stopPropagation()} onClick={() => restorePage(p.id)}>
                    <Undo2 size={13} />
                  </button>
                )}
              </div>
              <div className="file-preview-content">
                <PdfRenderer file={fileUrl!} pageNum={p.pageNum} width={110} rotation={p.rotation} />
              </div>
            </div>
            <div className="file-info">
              <div className="page-num-badge">{p.pageNum}</div>
              {!p.kept && <div style={{ fontSize: 11, color: "#e53e3e" }}>Đã xóa</div>}
            </div>
          </div>
        ))}
      </div>

      {previewPage && (
        <div className="preview-modal-overlay" onClick={() => setPreviewPage(null)}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <h3>
                {file.name} — Trang {previewPage}
              </h3>
              <button className="close-btn" onClick={() => setPreviewPage(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="preview-modal-body">
              <div className="pdf-view-wrapper">
                <PdfRenderer file={fileUrl!} pageNum={previewPage} width={500} rotation={previewPageItem?.rotation || 0} />
              </div>
            </div>
            <div className="preview-modal-footer">
              <div className="preview-pager-controls">
                <button className="pager-btn" disabled={previewPage <= 1} onClick={() => setPreviewPage((pn) => Math.max(1, (pn || 1) - 1))}>
                  <ChevronLeft size={15} />
                </button>
                <span className="pager-text">
                  {previewPage} / {numPages}
                </span>
                <button className="pager-btn" disabled={previewPage >= (numPages || 0)} onClick={() => setPreviewPage((pn) => Math.min(numPages || 1, (pn || 1) + 1))}>
                  <ChevronRight size={15} />
                </button>
                <div className="pager-divider" />
                <button className="pager-icon-btn" onClick={() => rotatePage(previewPageItem?.id, 90)}>
                  <RotateCw size={15} />
                </button>
                {previewPageItem?.kept ? (
                  <button
                    className="pager-icon-btn text-danger"
                    onClick={() => {
                      deletePage(previewPageItem?.id);
                      setPreviewPage(null);
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                ) : (
                  <button className="pager-icon-btn" onClick={() => restorePage(previewPageItem?.id)}>
                    <Undo2 size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
