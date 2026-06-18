import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Download, ChevronLeft, ChevronRight, RefreshCw, ChevronDown, Share2, Printer, Trash2, CheckCircle2, Edit2 } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const MergeResult = ({ blob, initialName = 'merged', onRestart }) => {
  const [fileName, setFileName] = useState(initialName);
  const [editingName, setEditingName] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(null);
  // Create stable object URL once
  const [objectUrl] = useState(() => URL.createObjectURL(blob));

  const fileSizeMB = (blob.size / 1024 / 1024).toFixed(1);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName.endsWith('.pdf') ? fileName : fileName + '.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="merge-result-container">
      {/* ── Left: PDF Viewer ── */}
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

        {/* Page indicator top */}
        <div className="result-page-label">Trang {currentPage}</div>

        {/* Bottom pager */}
        {numPages && (
          <div className="result-bottom-pager">
            <button className="pager-btn" disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
              <ChevronLeft size={16} />
            </button>
            <span className="pager-text">{currentPage} / {numPages}</span>
            <button className="pager-btn" disabled={currentPage >= numPages}
              onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ── Right: Actions Panel ── */}
      <div className="result-actions-panel">
        {/* Done header */}
        <div className="result-done-header">
          <CheckCircle2 size={28} className="result-done-icon" />
          <span className="result-done-text">Đã xong</span>
        </div>

        {/* File info + name edit */}
        <div className="result-file-info">
          {editingName ? (
            <div className="result-name-edit-row">
              <input
                autoFocus
                type="text"
                className="result-name-input"
                value={fileName}
                onChange={e => setFileName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
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
            {fileSizeMB} MB · {numPages ? `${numPages} trang` : '…'}
          </div>
        </div>

        {/* Primary download */}
        <button className="btn btn-primary result-download-btn" onClick={handleDownload}>
          <Download size={16} /> Tải file xuống
        </button>

        {/* Export as */}
        <button className="btn btn-outline result-export-btn">
          <span>Xuất dưới dạng</span>
          <ChevronDown size={14} />
        </button>

        {/* Action icons row */}
        <div className="result-icon-row">
          <button className="result-icon-btn" title="Chia sẻ"><Share2 size={18} /></button>
          <button className="result-icon-btn" title="In"><Printer size={18} /></button>
          <button className="result-icon-btn danger" title="Xóa"><Trash2 size={18} /></button>
        </div>

        <div className="result-divider" />

        {/* Restart */}
        <button className="btn btn-outline result-restart-btn" onClick={onRestart}>
          <RefreshCw size={15} /> Bắt đầu lại
        </button>
      </div>
    </div>
  );
};

export default MergeResult;
