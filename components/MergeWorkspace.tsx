"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  RotateCcw,
  RotateCw,
  ChevronDown,
  Grid,
  List as ListIcon,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
} from "lucide-react";
import PdfRenderer from "./PdfRenderer";
import MergeResult from "./MergeResult";

type FileItem = {
  id: string;
  file: File;
  name: string;
  extension: string;
  selected: boolean;
  rotation: number;
  pages: number;
};

type PageItem = {
  id: string;
  fileId: string;
  fileIndex: number;
  fileObj: File;
  fileName: string;
  extension: string;
  pageNum: number;
  selected: boolean;
  rotation: number;
};

const buildPageList = (files: FileItem[]): PageItem[] =>
  files.flatMap((f, fileIndex) =>
    Array.from({ length: Math.max(f.pages, 1) }, (_, i) => ({
      id: `page-${f.id}-${i + 1}`,
      fileId: f.id,
      fileIndex,
      fileObj: f.file,
      fileName: f.name,
      extension: f.extension,
      pageNum: i + 1,
      selected: true,
      rotation: f.rotation,
    }))
  );

type MergeWorkspaceProps = {
  initialFiles: File[];
  onCancel?: () => void;
};

export default function MergeWorkspace({ initialFiles, onCancel }: MergeWorkspaceProps) {
  const [viewMode, setViewMode] = useState<"files" | "pages">("files");
  const [files, setFiles] = useState<FileItem[]>(
    initialFiles.map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      file,
      name: file.name.replace(/\.[^/.]+$/, ""),
      extension: file.name.split(".").pop() || "pdf",
      selected: false,
      rotation: 0,
      pages: 1,
    }))
  );
  const [pages, setPages] = useState<PageItem[]>([]);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [mergeResult, setMergeResult] = useState<{ blob: Blob; name: string } | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const enterPageView = () => {
    setPages(buildPageList(files));
    setViewMode("pages");
  };

  const enterFileView = () => setViewMode("files");

  useEffect(() => {
    const onOver = (e: DragEvent) => {
      e.preventDefault();
      setIsGlobalDragging(true);
    };
    const onLeave = (e: DragEvent) => {
      e.preventDefault();
      if (e.clientX === 0 && e.clientY === 0) setIsGlobalDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsGlobalDragging(false);
      if (e.dataTransfer?.files?.length) {
        const pdfs = Array.from(e.dataTransfer.files).filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
        if (pdfs.length) addRawFiles(pdfs);
      }
    };
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [insertAfterIdx, setInsertAfterIdx] = useState<number | null>(null);

  const addRawFiles = (rawFiles: File[], afterIdx?: number) => {
    const newItems = rawFiles.map((file, i) => ({
      id: `file-${Date.now()}-${i}`,
      file,
      name: file.name.replace(/\.[^/.]+$/, ""),
      extension: file.name.split(".").pop() || "pdf",
      selected: false,
      rotation: 0,
      pages: 1,
    }));
    setFiles((prev) => {
      if (afterIdx != null && afterIdx >= 0 && afterIdx < prev.length) {
        const arr = [...prev];
        arr.splice(afterIdx + 1, 0, ...newItems);
        return arr;
      }
      return [...prev, ...newItems];
    });
    setInsertAfterIdx(null);
    if (viewMode === "pages") setViewMode("files");
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addRawFiles(Array.from(e.target.files), insertAfterIdx ?? undefined);
    e.target.value = "";
    setInsertAfterIdx(null);
  };

  const handleNameChange = (id: string, newName: string) =>
    setFiles((fs) => fs.map((f) => (f.id === id ? { ...f, name: newName } : f)));

  const toggleSelectFile = (id: string) =>
    setFiles((fs) => fs.map((f) => (f.id === id ? { ...f, selected: !f.selected } : f)));

  const selectAllFiles = () => {
    const all = files.every((f) => f.selected);
    setFiles((fs) => fs.map((f) => ({ ...f, selected: !all })));
  };

  const removeSelectedFiles = () => setFiles((fs) => fs.filter((f) => !f.selected));

  const deleteFile = (id: string) => {
    setFiles((fs) => fs.filter((f) => f.id !== id));
    if (previewFile?.id === id) setPreviewFile(null);
  };

  const rotateFile = (id: string, angle = 90) => {
    setFiles((fs) =>
      fs.map((f) => {
        if (f.id !== id) return f;
        const newRot = (f.rotation + angle + 360) % 360;
        if (previewFile?.id === id) setPreviewFile((pf) => (pf ? { ...pf, rotation: newRot } : pf));
        return { ...f, rotation: newRot };
      })
    );
  };

  const updatePages = (id: string, count: number) => {
    setFiles((fs) => fs.map((f) => (f.id === id ? { ...f, pages: count } : f)));
    if (previewFile?.id === id) setPreviewFile((pf) => (pf ? { ...pf, pages: count } : pf));
  };

  const toggleSelectPage = (id: string) =>
    setPages((ps) => ps.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)));

  const selectAllPages = () => {
    const all = pages.every((p) => p.selected);
    setPages((ps) => ps.map((p) => ({ ...p, selected: !all })));
  };

  const deletePageItem = (id: string) => setPages((ps) => ps.filter((p) => p.id !== id));

  const rotatePageItem = (id: string, angle = 90) =>
    setPages((ps) => ps.map((p) => (p.id === id ? { ...p, rotation: (p.rotation + angle + 360) % 360 } : p)));

  function makeCardHandlers<T extends { id: string }>(setItems: React.Dispatch<React.SetStateAction<T[]>>) {
    return {
      onDragStart: (e: React.DragEvent, id: string) => {
        setDraggedId(id);
        e.dataTransfer.effectAllowed = "move";
      },
      onDragOver: (e: React.DragEvent) => e.preventDefault(),
      onDrop: (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedId || draggedId === targetId) return;
        setItems((prev) => {
          const arr = [...prev];
          const from = arr.findIndex((x) => x.id === draggedId);
          const to = arr.findIndex((x) => x.id === targetId);
          const [item] = arr.splice(from, 1);
          arr.splice(to, 0, item);
          return arr;
        });
        setDraggedId(null);
      },
    };
  }

  const fileCardHandlers = makeCardHandlers<FileItem>(setFiles);
  const pageCardHandlers = makeCardHandlers<PageItem>(setPages);

  const handleMerge = async () => {
    setMergeError(null);

    if (viewMode === "files") {
      if (files.length < 2) {
        setMergeError("Cần ít nhất 2 file để gộp.");
        return;
      }
    } else {
      const selected = pages.filter((p) => p.selected);
      if (selected.length < 1) {
        setMergeError("Chưa chọn trang nào.");
        return;
      }
    }

    setIsMerging(true);
    try {
      let blob: Blob;

      if (viewMode === "files") {
        const formData = new FormData();
        files.forEach((f) => formData.append("files", f.file, f.name + "." + f.extension));
        formData.append("rotations", JSON.stringify(files.map((f) => f.rotation || 0)));
        formData.append("output_name", files[0]?.name || "merged");
        const res = await fetch(`/api/merge`, { method: "POST", body: formData });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: "Lỗi không xác định" }));
          throw new Error(err.detail);
        }
        blob = await res.blob();
      } else {
        const selectedPages = pages.filter((p) => p.selected);
        const uniqueFileIds = [...new Set(selectedPages.map((p) => p.fileId))];
        const uniqueFiles = uniqueFileIds.map((id) => files.find((f) => f.id === id)).filter(Boolean) as FileItem[];
        const fileIdToIdx = Object.fromEntries(uniqueFiles.map((f, i) => [f.id, i]));

        const manifest = selectedPages.map((p) => ({
          file_index: fileIdToIdx[p.fileId],
          page: p.pageNum,
          rotation: p.rotation || 0,
        }));

        const formData = new FormData();
        uniqueFiles.forEach((f) => formData.append("files", f.file, f.name + "." + f.extension));
        formData.append("manifest", JSON.stringify(manifest));
        formData.append("output_name", uniqueFiles[0]?.name || "merged");

        const res = await fetch(`/api/merge-pages`, { method: "POST", body: formData });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: "Lỗi không xác định" }));
          throw new Error(err.detail);
        }
        blob = await res.blob();
      }

      const defaultName =
        (viewMode === "files" ? files[0]?.name : pages.find((p) => p.selected)?.fileName) || "merged";
      setMergeResult({ blob, name: defaultName });
    } catch (err) {
      setMergeError(`Gộp thất bại: ${(err as Error).message}`);
    } finally {
      setIsMerging(false);
    }
  };

  if (mergeResult) {
    return (
      <MergeResult
        blob={mergeResult.blob}
        initialName={mergeResult.name}
        onRestart={() => {
          setMergeResult(null);
          setFiles([]);
          onCancel?.();
        }}
      />
    );
  }

  const selectedCount = viewMode === "files" ? files.filter((f) => f.selected).length : pages.filter((p) => p.selected).length;

  const toolbar = (
    <div className="workspace-toolbar">
      <div className="toolbar-left">
        <button className={`toolbar-btn ${viewMode === "files" ? "toolbar-btn-active" : ""}`} onClick={enterFileView}>
          <Grid size={15} style={{ marginRight: 5 }} /> Các file
        </button>
        <button className={`toolbar-btn ${viewMode === "pages" ? "toolbar-btn-active" : ""}`} onClick={enterPageView} title="Xem và sắp xếp từng trang">
          <ListIcon size={15} style={{ marginRight: 5 }} /> Trang
        </button>
        <div className="toolbar-divider" />
        <button className="toolbar-btn" onClick={() => { setInsertAfterIdx(null); document.getElementById("add-more-input")?.click(); }}>
          <Plus size={15} style={{ marginRight: 4 }} /> Thêm <ChevronDown size={13} />
        </button>
        <input id="add-more-input" type="file" multiple hidden accept=".pdf" onChange={handleFileInput} />
        <div className="toolbar-divider" />
        <button
          className="toolbar-icon-btn"
          title="Xoay ngược"
          onClick={() => {
            if (viewMode === "files") files.filter((f) => f.selected).forEach((f) => rotateFile(f.id, 270));
            else pages.filter((p) => p.selected).forEach((p) => rotatePageItem(p.id, 270));
          }}
        >
          <RotateCcw size={15} />
        </button>
        <button
          className="toolbar-icon-btn"
          title="Xoay xuôi"
          onClick={() => {
            if (viewMode === "files") files.filter((f) => f.selected).forEach((f) => rotateFile(f.id, 90));
            else pages.filter((p) => p.selected).forEach((p) => rotatePageItem(p.id, 90));
          }}
        >
          <RotateCw size={15} />
        </button>
        <button
          className="toolbar-icon-btn"
          title="Xóa"
          disabled={selectedCount === 0}
          onClick={() => {
            if (viewMode === "files") removeSelectedFiles();
            else setPages((ps) => ps.filter((p) => !p.selected));
          }}
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="toolbar-right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {mergeError && <span style={{ color: "#e53e3e", fontSize: 13 }}>{mergeError}</span>}
        <button className="btn btn-outline" onClick={onCancel} style={{ fontSize: 14 }}>
          Hủy
        </button>
        <button
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 148, justifyContent: "center" }}
          onClick={handleMerge}
          disabled={isMerging || (viewMode === "files" && files.length < 2)}
        >
          {isMerging ? (
            <>
              <Loader2 size={15} className="spin" /> Đang gộp...
            </>
          ) : (
            <>
              <Download size={15} /> Hoàn thành
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="workspace-container">
      {isGlobalDragging && (
        <div className="global-dragging-overlay">
          <div className="overlay-message">
            <Plus size={44} style={{ marginBottom: 12 }} />
            Thả file vào đây để thêm vào danh sách gộp
          </div>
        </div>
      )}

      {toolbar}

      {viewMode === "files" ? (
        <div className="workspace-sub-toolbar">
          <label className="select-all-label">
            <input type="checkbox" checked={files.length > 0 && files.every((f) => f.selected)} onChange={selectAllFiles} />
            <span>Chọn tất cả ({files.length} file)</span>
          </label>
          <div className="sub-toolbar-actions">
            <button className="toolbar-icon-btn active">
              <Grid size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div className="workspace-sub-toolbar">
          <label className="select-all-label">
            <input type="checkbox" checked={pages.length > 0 && pages.every((p) => p.selected)} onChange={selectAllPages} />
            <span>Đã chọn {pages.filter((p) => p.selected).length} trang</span>
          </label>
        </div>
      )}

      {viewMode === "files" && (
        <div className="workspace-grid">
          {files.map((f, fileIdx) => (
            <div key={f.id} style={{ display: "contents" }}>
              <div
                className={`file-card ${f.selected ? "selected" : ""}`}
                draggable
                onDragStart={(e) => fileCardHandlers.onDragStart(e, f.id)}
                onDragOver={fileCardHandlers.onDragOver}
                onDrop={(e) => fileCardHandlers.onDrop(e, f.id)}
              >
                <input type="checkbox" className="file-checkbox" checked={f.selected} onChange={() => toggleSelectFile(f.id)} />
                <div className="file-preview">
                  <div className="card-hover-overlay">
                    <button
                      className="overlay-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewFile(f);
                        setPreviewPage(1);
                      }}
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      className="overlay-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        rotateFile(f.id, 90);
                      }}
                    >
                      <RotateCw size={13} />
                    </button>
                    <button
                      className="overlay-btn delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFile(f.id);
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="file-preview-content">
                    <PdfRenderer file={f.file} pageNum={1} width={110} rotation={f.rotation} onDocumentLoad={(count) => updatePages(f.id, count)} />
                  </div>
                </div>
                <div className="file-info">
                  <input type="text" className="file-name-input" value={f.name} onChange={(e) => handleNameChange(f.id, e.target.value)} />
                  <div className="file-pages">{f.pages} trang</div>
                </div>
              </div>
              <div
                className="insert-plus"
                title="Thêm file vào đây"
                onClick={() => {
                  setInsertAfterIdx(fileIdx);
                  document.getElementById("add-more-input")?.click();
                }}
              >
                <Plus size={13} />
              </div>
            </div>
          ))}
          <div className="add-more-card" onClick={() => document.getElementById("add-more-input")?.click()}>
            <div className="add-icon">
              <Plus size={20} />
            </div>
            <div>
              Thêm file PDF
            </div>
          </div>
        </div>
      )}

      {viewMode === "pages" && (
        <div className="workspace-grid pages-grid">
          {pages.map((p) => (
            <div
              key={p.id}
              className={`page-card ${p.selected ? "" : "page-deselected"}`}
              draggable
              onDragStart={(e) => pageCardHandlers.onDragStart(e, p.id)}
              onDragOver={pageCardHandlers.onDragOver}
              onDrop={(e) => pageCardHandlers.onDrop(e, p.id)}
            >
              <input type="checkbox" className="file-checkbox" checked={p.selected} onChange={() => toggleSelectPage(p.id)} />
              <div className="file-preview">
                <div className="card-hover-overlay">
                  <button
                    className="overlay-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      rotatePageItem(p.id, 90);
                    }}
                  >
                    <RotateCw size={13} />
                  </button>
                  <button
                    className="overlay-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePageItem(p.id);
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="file-preview-content">
                  <PdfRenderer file={p.fileObj} pageNum={p.pageNum} width={110} rotation={p.rotation} />
                </div>
              </div>
              <div className="file-info">
                <div className="page-source-name" title={p.fileName}>
                  {p.fileName}
                </div>
                <div className="page-num-badge">{p.pageNum}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewFile && (
        <div className="preview-modal-overlay" onClick={() => setPreviewFile(null)}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <h3 style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80%" }}>
                {previewFile.name}.{previewFile.extension}
              </h3>
              <button className="close-btn" onClick={() => setPreviewFile(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="preview-modal-body">
              <div className="pdf-view-wrapper">
                <PdfRenderer
                  file={previewFile.file}
                  pageNum={previewPage}
                  width={500}
                  rotation={previewFile.rotation}
                  onDocumentLoad={(count) => updatePages(previewFile.id, count)}
                />
              </div>
            </div>
            <div className="preview-modal-footer">
              <div className="preview-pager-controls">
                <button className="pager-btn" disabled={previewPage <= 1} onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft size={15} />
                </button>
                <span className="pager-text">
                  {previewPage} / {previewFile.pages}
                </span>
                <button className="pager-btn" disabled={previewPage >= previewFile.pages} onClick={() => setPreviewPage((p) => Math.min(previewFile.pages, p + 1))}>
                  <ChevronRight size={15} />
                </button>
                <div className="pager-divider" />
                <button className="pager-icon-btn" onClick={() => rotateFile(previewFile.id, 270)}>
                  <RotateCcw size={15} />
                </button>
                <button className="pager-icon-btn" onClick={() => rotateFile(previewFile.id, 90)}>
                  <RotateCw size={15} />
                </button>
                <button className="pager-icon-btn text-danger" onClick={() => deleteFile(previewFile.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
