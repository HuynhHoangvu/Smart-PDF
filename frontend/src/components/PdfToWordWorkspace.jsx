import React, { useState, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  Upload, ChevronLeft, ChevronRight, Download, Loader2,
  FileText, AlertCircle, RefreshCw, ZoomIn, ZoomOut
} from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Dropzone ──────────────────────────────────────────────────────────────────
const Dropzone = ({ onFiles }) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (files.length) onFiles(files[0]);
  };

  return (
    <div
      className={`translate-dropzone ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        maxWidth: 600,
        margin: '60px auto',
        padding: '50px 30px',
        background: '#fff',
        border: '2px dashed #cbd5e0',
        borderRadius: 14,
        textAlign: 'center',
        cursor: 'pointer',
        boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        hidden
        onChange={e => e.target.files?.[0] && onFiles(e.target.files[0])}
      />
      <div className="translate-dropzone-icon" style={{ color: '#0062ff' }}>
        <FileText size={48} strokeWidth={1.5} />
      </div>
      <h2 className="translate-dropzone-title">Chuyển đổi PDF sang Word</h2>
      <p className="translate-dropzone-sub">
        Nhận diện bảng biểu, căn lề và hỗ trợ OCR cho tài liệu quét hình ảnh. 
        Cho phép chỉnh sửa nội dung trực tiếp trước khi tải xuống.
      </p>
      <button className="btn btn-primary translate-upload-btn" style={{ background: '#0062ff' }}>
        <Upload size={16} /> Chọn file PDF
      </button>
      <p className="translate-dropzone-hint">hoặc kéo thả file vào đây · Không giới hạn dung lượng</p>
    </div>
  );
};

// ── Editable Block Page Renderer ──────────────────────────────────────────────
const EditablePage = ({ pageData, onBlockEdit }) => (
  <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '13pt', color: '#1a202c', textAlign: 'left' }}>
    {pageData.blocks.map((block, i) => {
      if (block.type === 'table') {
        return (
          <div key={i} className="translated-table-wrapper" style={{ margin: '16px 0', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e0' }}>
              <tbody>
                {block.cells.map((row, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: '1px solid #cbd5e0' }}>
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        onBlur={(e) => {
                          onBlockEdit(i, e.target.innerText, rIdx, cIdx);
                        }}
                        style={{ border: '1px solid #cbd5e0', padding: '6px 10px', fontSize: '13pt', verticalAlign: 'top', outline: 'none', background: '#fff' }}
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
      const align = block.align || 'left';
      const isBold = block.is_bold;
      
      // Replicate left margins in the HTML preview
      const bbox = block.bbox;
      let paddingLeft = '6px';
      if (align === 'left' && bbox && bbox[0] > 90) {
        const indentPx = Math.max(0, (bbox[0] - 72) * 1.2);
        paddingLeft = `${indentPx + 6}px`;
      }
      
      return (
        <div
          key={i}
          contentEditable={true}
          suppressContentEditableWarning={true}
          onBlur={(e) => {
            onBlockEdit(i, e.target.innerText);
          }}
          style={{
            fontSize: isHeading ? '14pt' : '13pt',
            fontWeight: (isHeading || isBold) ? 'bold' : 'normal',
            textAlign: align,
            marginBottom: '6px',
            lineHeight: '1.3',
            whiteSpace: 'pre-wrap',
            outline: 'none',
            paddingTop: '4px',
            paddingBottom: '4px',
            paddingRight: '6px',
            paddingLeft: paddingLeft,
            borderRadius: '4px',
            transition: 'background-color 0.15s ease'
          }}
          onFocus={(e) => {
            e.target.style.backgroundColor = '#f0f7ff';
            e.target.style.outline = '1px dashed #0062ff';
          }}
          onBlurCapture={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.outline = 'none';
          }}
        >
          {block.text}
        </div>
      );
    })}
  </div>
);


// ── Main Component ────────────────────────────────────────────────────────────
const PdfToWordWorkspace = () => {
  const [file, setFile] = useState(null);
  const [objectUrl, setObjectUrl] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfNumPages, setPdfNumPages] = useState(null);
  const [pdfScale, setPdfScale] = useState(1.0);
  const [progress, setProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState('');

  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(480);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setContainerWidth(Math.floor(entries[0].contentRect.width - 32));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [file, status]);

  const fetchParsedDoc = async (f) => {
    setStatus('loading');
    setErrorMsg('');
    setProgress(0);
    setLoadingStep('Đang bắt đầu chuyển đổi...');

    let currentProgress = 0;
    const interval = setInterval(() => {
      if (currentProgress < 25) {
        currentProgress += Math.floor(Math.random() * 5) + 3;
      } else if (currentProgress < 70) {
        currentProgress += Math.floor(Math.random() * 3) + 1;
      } else if (currentProgress < 98) {
        currentProgress += 1;
      }
      
      if (currentProgress > 98) currentProgress = 98;
      setProgress(currentProgress);

      if (currentProgress < 20) {
        setLoadingStep('Đang phân tích cấu trúc file PDF...');
      } else if (currentProgress < 50) {
        setLoadingStep('Đang nhận diện bảng biểu và biểu đồ...');
      } else if (currentProgress < 80) {
        setLoadingStep('Đang trích xuất nội dung văn bản (OCR nếu cần)...');
      } else {
        setLoadingStep('Đang tạo bản xem trước tài liệu có thể chỉnh sửa...');
      }
    }, 150);

    try {
      const formData = new FormData();
      formData.append('file', f);
      
      const res = await fetch(`${API_URL}/api/pdf-to-word/parse`, { method: 'POST', body: formData });
      clearInterval(interval);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Lỗi chuyển đổi không xác định' }));
        throw new Error(err.detail);
      }
      const data = await res.json();
      setProgress(100);
      setLoadingStep('Hoàn thành!');
      
      setTimeout(() => {
        setResult(data);
        setStatus('done');
      }, 400);
    } catch (err) {
      clearInterval(interval);
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const handleFile = useCallback(async (f) => {
    setFile(f);
    setObjectUrl(URL.createObjectURL(f));
    setCurrentPage(1);
    setResult(null);
    await fetchParsedDoc(f);
  }, []);

  const handleReset = () => {
    setFile(null);
    setObjectUrl(null);
    setResult(null);
    setStatus('idle');
    setErrorMsg('');
    setCurrentPage(1);
  };

  const handleBlockEdit = (blockIdx, newText, rIdx = null, cIdx = null) => {
    if (!result) return;
    setResult(prev => {
      const nextResult = JSON.parse(JSON.stringify(prev));
      const page = nextResult.pages.find(p => p.page_num === currentPage);
      if (page) {
        const block = page.blocks[blockIdx];
        if (block) {
          if (block.type === 'table' && rIdx !== null && cIdx !== null) {
            block.cells[rIdx][cIdx] = newText;
          } else {
            block.text = newText;
          }
        }
      }
      return nextResult;
    });
  };

  const downloadDocx = async () => {
    if (!result) return;
    try {
      const res = await fetch(`${API_URL}/api/pdf-to-word/download-edited`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blocks_data: result,
          original_filename: result.original_filename
        }),
      });
      if (!res.ok) throw new Error('Không thể tải file Word');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (result.original_filename?.replace(/\.pdf$/i, '') || 'document') + '.docx';
      a.click();
    } catch (err) {
      alert(err.message);
    }
  };

  // ── Idle: show Dropzone ──────────────────────────────────────────────────
  if (status === 'idle') return <Dropzone onFiles={handleFile} />;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="translate-status-screen" style={{ maxWidth: 500, margin: '100px auto', padding: 30, background: '#fff', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center' }}>
        <div className="translate-spinner" style={{ marginBottom: 20 }}>
          <Loader2 size={40} className="spin" style={{ color: '#0062ff', animation: 'spin 1.5s linear infinite' }} />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: '#2d3748', marginBottom: 8 }}>Đang xử lý tài liệu PDF...</h3>
        <p style={{ fontSize: 14, color: '#718096', wordBreak: 'break-all', marginBottom: 24 }}>{file?.name}</p>
        
        {/* Progress Bar */}
        <div style={{ width: '100%', height: 10, background: '#edf2f7', borderRadius: 5, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #0062ff, #00c6ff)', transition: 'width 0.2s ease-out', borderRadius: 5 }} />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#4a5568', fontWeight: 500 }}>
          <span>{loadingStep}</span>
          <span>{progress}%</span>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="translate-status-screen">
        <AlertCircle size={48} color="#e53e3e" />
        <h3 style={{ color: '#e53e3e' }}>Chuyển đổi thất bại</h3>
        <p>{errorMsg}</p>
        <button className="btn btn-outline" onClick={handleReset} style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <RefreshCw size={15} /> Thử lại
        </button>
      </div>
    );
  }

  // ── Result side-by-side editing workspace ─────────────────────────────────
  const currentPageData = result.pages.find(p => p.page_num === currentPage);
  const totalPages = result.pages.length;

  return (
    <div className="translate-result-container">
      {/* ── Top Bar ── */}
      <div className="translate-result-topbar">
        <div className="translate-topbar-left">
          <span className="translate-filename" title={result.original_filename}>{result.original_filename}</span>
          <span className="translate-meta">
            {totalPages} trang · Chỉnh sửa trực tiếp
          </span>
        </div>
        
        <div className="translate-topbar-right">
          <div className="translate-zoom-controls">
            <button className="toolbar-icon-btn" onClick={() => setPdfScale(s => Math.max(0.5, s - 0.2))} title="Thu nhỏ">
              <ZoomOut size={15} />
            </button>
            <span style={{ fontSize: 12, minWidth: 40, textAlign: 'center' }}>{Math.round(pdfScale * 100)}%</span>
            <button className="toolbar-icon-btn" onClick={() => setPdfScale(s => Math.min(2.5, s + 0.2))} title="Phóng to">
              <ZoomIn size={15} />
            </button>
          </div>
          
          <button className="btn btn-primary" style={{ fontSize: 13, padding: '6px 14px', display: 'flex', gap: 6, background: '#0062ff' }} onClick={downloadDocx}>
            <Download size={14} /> Tải file Word (DOCX)
          </button>
          
          <button className="btn btn-outline" style={{ fontSize: 13, padding: '6px 14px', display: 'flex', gap: 6 }} onClick={handleReset}>
            <RefreshCw size={14} /> Chuyển file khác
          </button>
        </div>
      </div>

      {/* ── Side-by-side Panels ── */}
      <div className="translate-panels">
        {/* Left Pane: Original PDF Viewer */}
        <div className="translate-panel translate-panel-left">
          <div className="translate-panel-header">
            <FileText size={14} style={{ color: '#0062ff' }} /> PDF GỐC
          </div>
          <div className="translate-panel-scroll" ref={containerRef}>
            <Document
              file={objectUrl}
              onLoadSuccess={({ numPages }) => setPdfNumPages(numPages)}
            >
              <Page
                pageNumber={currentPage}
                scale={pdfScale}
                width={containerWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          </div>
        </div>

        {/* Right Pane: Editable Word Blocks */}
        <div className="translate-panel translate-panel-right">
          <div className="translate-panel-header">
            <FileText size={14} style={{ color: '#16a34a' }} /> FILE WORD CHỈNH SỬA
          </div>
          <div className="translate-panel-scroll">
            {currentPageData ? (
              <div
                style={{
                  width: '100%',
                  maxWidth: '640px',
                  background: '#ffffff',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '30px 40px',
                  minHeight: '800px',
                  boxSizing: 'border-box'
                }}
              >
                <EditablePage pageData={currentPageData} onBlockEdit={handleBlockEdit} />
              </div>
            ) : (
              <p style={{ color: '#a0aec0', padding: 20 }}>Không có nội dung cho trang này.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Pager ── */}
      <div className="translate-pager">
        <button className="pager-btn" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
          <ChevronLeft size={16} />
        </button>
        <span className="pager-text">{currentPage} / {totalPages}</span>
        <button className="pager-btn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default PdfToWordWorkspace;
