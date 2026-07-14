"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Upload, Download, Loader2, Languages, FileText, AlertCircle, RefreshCw, ZoomIn, ZoomOut, Tag } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

type TranslatedPageData = {
  page_num: number;
  translated_html?: string;
  is_group_lead?: boolean;
  group_pages?: number[];
  blocks?: Block[];
};

type Block = {
  type?: string;
  translated?: string;
  original?: string;
  is_heading?: boolean;
  is_bold?: boolean;
  align?: string;
  font_size?: number;
  margin_top?: number;
  margin_bottom?: number;
  borderless?: boolean;
  col_widths?: string[];
  translated_cells?: string[][];
};

type TranslationResult = {
  original_filename: string;
  total_pages: number;
  mode: string;
  pages: TranslatedPageData[];
  translator?: string;
  doc_type_label?: string;
};

function Dropzone({ onFiles }: { onFiles: (f: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type === "application/pdf");
    if (files.length) onFiles(files[0]);
  };

  return (
    <div
      className={`translate-dropzone ${dragging ? "dragging" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept=".pdf" hidden onChange={(e) => e.target.files?.[0] && onFiles(e.target.files[0])} />
      <div className="translate-dropzone-icon">
        <Languages size={48} strokeWidth={1.5} />
      </div>
      <h2 className="translate-dropzone-title">Dịch tài liệu PDF</h2>
      <p className="translate-dropzone-sub">Hỗ trợ: Hợp đồng lao động · Học bạ · Giấy kết hôn · Giấy khai sinh · Giấy ủy quyền · Hộ chiếu/Visa</p>
      <button className="btn btn-primary translate-upload-btn">
        <Upload size={16} /> Chọn file PDF
      </button>
      <p className="translate-dropzone-hint">hoặc kéo thả file vào đây · Không giới hạn kích thước</p>
    </div>
  );
}

function HtmlTranslatedPage({
  html,
  pageNum,
  onHtmlEdit,
  registerPageRef,
}: {
  html: string;
  pageNum: number;
  onHtmlEdit: (pageNum: number, html: string) => void;
  registerPageRef: (pageNum: number, el: HTMLDivElement | null) => void;
}) {
  return (
    <div className="translated-page-shell" data-page-number={pageNum}>
      <div className="translated-page-label">Trang {pageNum}</div>
      <div
        ref={(el) => registerPageRef(pageNum, el)}
        className="translated-page-content translated-page-content-editable"
        contentEditable={true}
        suppressContentEditableWarning={true}
        style={{ fontFamily: '"Times New Roman", Times, serif', color: "#1a202c" }}
        onBlur={(e) => onHtmlEdit(pageNum, e.currentTarget.innerHTML)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

function TranslatedPage({
  pageData,
  pageNum,
  onBlockEdit,
}: {
  pageData: TranslatedPageData;
  pageNum: number;
  onBlockEdit: (pageNum: number, blockIdx: number, newText: string, rIdx?: number, cIdx?: number) => void;
}) {
  return (
    <div className="translated-page-content" style={{ fontFamily: '"Times New Roman", Times, serif', color: "#1a202c" }}>
      {(pageData.blocks || []).map((block, i) => {
        if (block.type === "table") {
          const borderless = block.borderless;
          const borderStyle = borderless ? "none" : "1px solid #a0aec0";
          const cellFontSize = block.font_size ? `${block.font_size}pt` : "12pt";
          const colWidths = block.col_widths || null;
          return (
            <div key={i} className="translated-table-wrapper" style={{ margin: borderless ? "3px 0" : "8px 0", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", border: borderStyle }}>
                <tbody>
                  {(block.translated_cells || []).map((row, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: borderless ? "none" : "1px solid #a0aec0" }}>
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          contentEditable={true}
                          suppressContentEditableWarning={true}
                          onBlur={(e) => onBlockEdit(pageNum, i, e.currentTarget.innerText, rIdx, cIdx)}
                          style={{
                            border: borderStyle,
                            padding: borderless ? "1px 6px 1px 0" : "5px 8px",
                            fontSize: cellFontSize,
                            verticalAlign: "top",
                            outline: "none",
                            background: "#fff",
                            whiteSpace: "pre-wrap",
                            lineHeight: "1.5",
                            width: colWidths ? colWidths[cIdx] : undefined,
                          }}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        const isHeading = block.is_heading;
        const align = (block.align as React.CSSProperties["textAlign"]) || "left";
        const isBold = block.is_bold;
        const fontSize = block.font_size ? `${block.font_size}pt` : isHeading ? "13pt" : "12pt";
        const marginBottom = block.margin_bottom !== undefined ? `${block.margin_bottom}px` : isHeading ? "8px" : "4px";
        const marginTop = block.margin_top !== undefined ? `${block.margin_top}px` : "0px";
        const lineHeight = block.font_size && block.font_size >= 16 ? "1.3" : "1.6";

        return (
          <div
            key={i}
            className={`translated-block ${isHeading ? "translated-heading" : "translated-para"}`}
            contentEditable={true}
            suppressContentEditableWarning={true}
            onBlur={(e) => onBlockEdit(pageNum, i, e.currentTarget.innerText)}
            style={{
              fontSize,
              fontWeight: isHeading || isBold ? "bold" : "normal",
              textAlign: align,
              marginTop,
              marginBottom,
              lineHeight,
              whiteSpace: "pre-wrap",
              outline: "none",
              padding: "1px 2px",
              borderRadius: "3px",
              borderBottom: "1px dashed transparent",
              transition: "background-color 0.15s ease",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderBottom = "1px dashed #3182ce";
              e.currentTarget.style.backgroundColor = "#f7fafc";
            }}
            onBlurCapture={(e) => {
              e.currentTarget.style.borderBottom = "1px dashed transparent";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            {block.translated}
          </div>
        );
      })}
    </div>
  );
}

export default function TranslateWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [pdfNumPages, setPdfNumPages] = useState<number | null>(null);
  const [pdfScale, setPdfScale] = useState(1.0);
  const [progress, setProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(480);
  const translatedPageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setContainerWidth(Math.floor(entries[0].contentRect.width - 32));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const fetchTranslation = async (f: File) => {
    setStatus("loading");
    setErrorMsg("");
    setProgress(0);
    setLoadingStep("Đang khởi tạo dịch...");

    let currentProgress = 0;
    const interval = setInterval(() => {
      const remaining = 99 - currentProgress;
      const increment = Math.max(0.1, remaining * 0.04);
      currentProgress = Math.min(99, currentProgress + increment);

      const displayProgress = Math.floor(currentProgress);
      setProgress(displayProgress);

      if (displayProgress < 25) {
        setLoadingStep("Đang đọc cấu trúc file PDF...");
      } else if (displayProgress < 50) {
        setLoadingStep("Đang phân tích bảng biểu và căn lề tự động...");
      } else if (displayProgress < 75) {
        setLoadingStep("Đang đối chiếu biểu mẫu dịch chuyên dụng...");
      } else if (displayProgress < 90) {
        setLoadingStep("Đang áp dụng từ điển thuật ngữ Lãnh sự...");
      } else {
        setLoadingStep("Đang hoàn thiện bố cục và đóng gói file Word...");
      }
    }, 250);

    try {
      const formData = new FormData();
      formData.append("file", f);

      const res = await fetch(`/api/translate-pdf/html`, { method: "POST", body: formData });
      clearInterval(interval);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Lỗi không xác định" }));
        throw new Error(err.detail);
      }
      const data = await res.json();
      setProgress(100);
      setLoadingStep("Hoàn thành!");

      setTimeout(() => {
        setResult({ ...data, mode: "html" });
        setStatus("done");
      }, 400);
    } catch (err) {
      clearInterval(interval);
      setErrorMsg((err as Error).message);
      setStatus("error");
    }
  };

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setObjectUrl(URL.createObjectURL(f));
    setResult(null);
    fetchTranslation(f);
  }, []);

  const handleReset = () => {
    setFile(null);
    setObjectUrl(null);
    setResult(null);
    setStatus("idle");
    setErrorMsg("");
  };

  const downloadTranslation = () => {
    if (!result) return;
    const htmlMode = result.mode === "html";
    let text = `BILINGUAL TRANSLATION — ${result.original_filename}\n`;
    if (!htmlMode) {
      text += `Document type: ${result.doc_type_label}  |  Translator: ${(result.translator || "gemini").toUpperCase()}\n`;
    }
    text += "=".repeat(70) + "\n\n";
    result.pages.forEach((page) => {
      text += `--- Page ${page.page_num} ---\n\n`;
      if (htmlMode) {
        const tmp = document.createElement("div");
        const el = translatedPageRefs.current[page.page_num];
        tmp.innerHTML = el ? el.innerHTML : page.translated_html || "";
        text += (tmp.textContent || "") + "\n\n";
      } else {
        page.blocks?.forEach((b) => {
          if (b.type === "table") {
            text += `[TABLE]\n`;
            (b.translated_cells || []).forEach((row, ri) => {
              text += `  Row ${ri + 1}: ${row.join(" | ")}\n`;
            });
            text += "\n";
          } else {
            text += `[VI] ${b.original}\n`;
            text += `[EN] ${b.translated}\n\n`;
          }
        });
      }
    });
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (file?.name?.replace(/\.pdf$/i, "") || "translation") + "_bilingual.txt";
    a.click();
  };

  const handleBlockEdit = (pageNum: number, blockIdx: number, newText: string, rIdx?: number, cIdx?: number) => {
    if (!result) return;
    setResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: prev.pages.map((p) => {
          if (p.page_num !== pageNum) return p;
          const blocks = (p.blocks || []).map((b, i) => {
            if (i !== blockIdx) return b;
            if (b.type === "table" && rIdx !== undefined && cIdx !== undefined && b.translated_cells) {
              return {
                ...b,
                translated_cells: b.translated_cells.map((row, ri) =>
                  ri === rIdx ? row.map((cell, ci) => (ci === cIdx ? newText : cell)) : row
                ),
              };
            }
            return { ...b, translated: newText };
          });
          return { ...p, blocks };
        }),
      };
    });
  };

  const registerPageRef = (pageNum: number, el: HTMLDivElement | null) => {
    if (!el) {
      delete translatedPageRefs.current[pageNum];
      return;
    }
    translatedPageRefs.current[pageNum] = el;
  };

  const handleHtmlEdit = (pageNum: number, newHtml: string) => {
    setResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: prev.pages.map((p) => (p.page_num === pageNum ? { ...p, translated_html: newHtml } : p)),
      };
    });
  };

  const applyEditorCommand = (command: string, value: string | null = null) => {
    document.execCommand(command, false, value ?? undefined);
  };

  const applyLineHeight = (lineHeight: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    let node: Node | null = selection.anchorNode;
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    if (!node) return;

    const el = node as HTMLElement;
    const editableRoot = el.closest(".translated-page-content-editable");
    if (!editableRoot) return;

    const block = (el.closest("p, div, li, td, th, h1, h2, h3, h4, h5, h6") as HTMLElement) || el;
    if (block && editableRoot.contains(block)) {
      block.style.lineHeight = lineHeight;
    }
  };

  const mergeRefsIntoResult = (): TranslationResult => ({
    ...result!,
    pages: result!.pages.map((p) => {
      const el = translatedPageRefs.current[p.page_num];
      return el ? { ...p, translated_html: el.innerHTML } : p;
    }),
  });

  const downloadPdf = async () => {
    if (!result) return;
    try {
      const mergedResult = mergeRefsIntoResult();
      const res = await fetch(`/api/translate-pdf/download-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: mergedResult }),
      });
      if (!res.ok) throw new Error("Không thể tạo file PDF");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = (result.original_filename?.replace(/\.pdf$/i, "") || "translation") + "_translated.pdf";
      a.click();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const downloadDocx = async () => {
    if (!result) return;
    try {
      const mergedResult = mergeRefsIntoResult();

      const res = await fetch(`/api/translate-pdf/download-edited-docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: mergedResult }),
      });
      if (!res.ok) throw new Error("Không thể tải file Word");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = (result.original_filename?.replace(/\.pdf$/i, "") || "translation") + "_translated.docx";
      a.click();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  if (status === "idle") return <Dropzone onFiles={handleFile} />;

  if (status === "loading") {
    const cuteTips = [
      "☕ Hệ thống đang pha một ly tiếng Anh thật mượt cho bạn...",
      "🧠 AI đang cân từng dấu chấm phẩy để bản dịch đẹp hơn...",
      "✨ Chỉnh bố cục để file nhìn chuyên nghiệp như bản công chứng...",
      "🎯 Sắp xong rồi, chuẩn bị tải về nhé!",
    ];
    const tipIndex = Math.min(cuteTips.length - 1, Math.floor(progress / 25));

    return (
      <div className="translate-loading-stage">
        <div className="translate-loading-glow translate-loading-glow-1" />
        <div className="translate-loading-glow translate-loading-glow-2" />

        <div className="translate-loading-card">
          <div className="translate-loading-head">
            <div className="translate-loading-spinner-wrap">
              <Loader2 size={32} className="spin" />
            </div>
            <div>
              <h3 className="translate-loading-title">Đang dịch tài liệu cho bạn ✨</h3>
              <p className="translate-loading-file">{file?.name}</p>
            </div>
          </div>

          <div className="translate-loading-progress-wrap">
            <div className="translate-loading-progress-meta">
              <span>{loadingStep}</span>
              <span>{progress}%</span>
            </div>
            <div className="translate-loading-progress-bar">
              <div className="translate-loading-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <p className="translate-loading-tip">{cuteTips[tipIndex]}</p>

          <div className="translate-loading-skeleton-grid">
            <div className="translate-loading-skeleton-page">
              <div className="translate-loading-skeleton-title">📄 Bản gốc</div>
              <div className="skeleton-line w-90" />
              <div className="skeleton-line w-70" />
              <div className="skeleton-line w-85" />
              <div className="skeleton-line w-60" />
              <div className="skeleton-line w-80" />
            </div>
            <div className="translate-loading-skeleton-page">
              <div className="translate-loading-skeleton-title">🌐 Bản dịch</div>
              <div className="skeleton-line w-80" />
              <div className="skeleton-line w-65" />
              <div className="skeleton-line w-90" />
              <div className="skeleton-line w-70" />
              <div className="skeleton-line w-85" />
            </div>
          </div>

          <div className="translate-loading-bottom">
            <div className="translate-loading-mini-cards">
              <div className="loading-mini-card">
                <div className="loading-mini-emoji">🧩</div>
                <div>
                  <div className="loading-mini-title">Giữ nguyên bố cục</div>
                  <div className="loading-mini-sub">Canh lề · khoảng cách · bảng biểu</div>
                </div>
              </div>
              <div className="loading-mini-card">
                <div className="loading-mini-emoji">📚</div>
                <div>
                  <div className="loading-mini-title">Thuật ngữ chuyên ngành</div>
                  <div className="loading-mini-sub">Ưu tiên văn phong hồ sơ pháp lý</div>
                </div>
              </div>
              <div className="loading-mini-card">
                <div className="loading-mini-emoji">🛡️</div>
                <div>
                  <div className="loading-mini-title">Xử lý an toàn</div>
                  <div className="loading-mini-sub">Tài liệu của bạn đang được xử lý cục bộ</div>
                </div>
              </div>
            </div>

            <div className="translate-loading-fun-strip">
              <span className="fun-dot" />
              <span className="fun-text">Gần xong rồi… chuẩn bị nhận bản dịch đẹp lung linh ✨</span>
              <span className="fun-dot" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="translate-status-screen">
        <AlertCircle size={48} color="#e53e3e" />
        <h3 style={{ color: "#e53e3e" }}>Dịch thất bại</h3>
        <p>{errorMsg}</p>
        <button className="btn btn-outline" onClick={handleReset} style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <RefreshCw size={15} /> Thử lại
        </button>
      </div>
    );
  }

  if (!result) return null;

  const isHtmlMode = result.mode === "html";

  return (
    <div className="translate-result-container">
      <div className="translate-result-topbar">
        <div className="translate-topbar-left">
          <span className="translate-filename">{result.original_filename}</span>
          <span className="translate-meta">
            {result.total_pages} trang · {isHtmlMode ? "🟣 Gemini HTML" : result.translator === "deepl" ? "🔵 DeepL" : "🟢 Google Translate"}
          </span>
        </div>
        <div className="translate-topbar-right">
          <div className="translate-zoom-controls">
            <button className="toolbar-icon-btn" onClick={() => setPdfScale((s) => Math.max(0.5, s - 0.2))} title="Thu nhỏ">
              <ZoomOut size={15} />
            </button>
            <span style={{ fontSize: 12, minWidth: 40, textAlign: "center" }}>{Math.round(pdfScale * 100)}%</span>
            <button className="toolbar-icon-btn" onClick={() => setPdfScale((s) => Math.min(2.5, s + 0.2))} title="Phóng to">
              <ZoomIn size={15} />
            </button>
          </div>
          <button className="btn btn-outline" style={{ fontSize: 13, padding: "6px 14px", display: "flex", gap: 6 }} onClick={handleReset}>
            <RefreshCw size={14} /> Dịch file khác
          </button>
        </div>
      </div>

      <div className="translate-panels">
        <div className="translate-panel-col translate-panel-col-left" ref={containerRef}>
          <div className="translate-col-header">
            <FileText size={14} /> Bản gốc (Tiếng Việt)
          </div>
          <div className="translate-col-scroll">
            <Document file={objectUrl} onLoadSuccess={({ numPages }) => setPdfNumPages(numPages)}>
              {Array.from({ length: pdfNumPages || 0 }, (_, idx) => (
                <div key={idx + 1} className="translate-original-page-block">
                  <div className="translate-page-label">Trang {idx + 1}</div>
                  <Page pageNumber={idx + 1} scale={pdfScale} width={Math.min(560, containerWidth)} renderTextLayer={false} renderAnnotationLayer={false} />
                </div>
              ))}
            </Document>
          </div>
        </div>

        <div className="translate-panel-col translate-panel-col-right">
          <div className="translate-col-header">
            <Languages size={14} /> Bản dịch (English)
          </div>
          <div className="translate-col-scroll">
            {(result.pages || [])
              .filter((p) => p.is_group_lead !== false)
              .map((page) => (
                <div key={page.page_num} className="translate-translated-block">
                  <div className="translate-page-label">
                    Trang {page.group_pages && page.group_pages.length > 1 ? `${page.group_pages[0]}–${page.group_pages[page.group_pages.length - 1]}` : page.page_num}
                  </div>
                  {isHtmlMode ? (
                    <HtmlTranslatedPage html={page.translated_html || ""} pageNum={page.page_num} onHtmlEdit={handleHtmlEdit} registerPageRef={registerPageRef} />
                  ) : (
                    <div className="translated-page-shell">
                      <TranslatedPage pageData={page} pageNum={page.page_num} onBlockEdit={handleBlockEdit} />
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="translate-pager translate-editor-toolbar">
        <button className="btn btn-outline" onClick={() => applyEditorCommand("bold")}>
          <Tag size={14} style={{ marginRight: 6 }} /> Tô đậm
        </button>
        <button className="btn btn-outline" onClick={() => applyLineHeight("1.3")}>
          Giãn dòng 1.3
        </button>
        <button className="btn btn-outline" onClick={() => applyLineHeight("1.5")}>
          Giãn dòng 1.5
        </button>
        <button className="btn btn-outline" onClick={() => applyLineHeight("1.8")}>
          Giãn dòng 1.8
        </button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-primary" style={{ fontSize: 13, padding: "6px 14px", display: "flex", gap: 6 }} onClick={downloadDocx}>
            <Download size={14} /> Tải DOCX
          </button>
          <button className="btn btn-primary" style={{ fontSize: 13, padding: "6px 14px", display: "flex", gap: 6, background: "#38a169", borderColor: "#38a169" }} onClick={downloadPdf}>
            <Download size={14} /> Tải PDF
          </button>
          <button className="btn btn-outline" style={{ fontSize: 13, padding: "6px 14px", display: "flex", gap: 6 }} onClick={downloadTranslation}>
            <Download size={14} /> Tải .txt
          </button>
        </div>
      </div>
    </div>
  );
}
