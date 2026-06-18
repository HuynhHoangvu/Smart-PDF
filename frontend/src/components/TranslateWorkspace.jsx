import React, { useState, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  Upload, ChevronLeft, ChevronRight, Download, Loader2,
  Languages, FileText, AlertCircle, CheckCircle2, RefreshCw,
  ZoomIn, ZoomOut, Tag
} from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const API_URL = 'http://localhost:8000';

// ── Document type badge colours ───────────────────────────────────────────────
const DOC_TYPE_COLORS = {
  employment:        { bg: '#ebf8ff', text: '#2b6cb0', label: '📋 Hợp đồng lao động' },
  marriage_cert:     { bg: '#fff5f7', text: '#97266d', label: '💍 Giấy kết hôn' },
  school_transcript: { bg: '#f0fff4', text: '#276749', label: '🎓 Học bạ / Bảng điểm' },
  birth_cert:        { bg: '#fffbeb', text: '#92400e', label: '👶 Giấy khai sinh' },
  power_of_attorney: { bg: '#f5f3ff', text: '#5b21b6', label: '✍️ Giấy ủy quyền' },
  consular:          { bg: '#ecfdf5', text: '#065f46', label: '🛂 Hộ chiếu / Visa' },
  general:           { bg: '#f7fafc', text: '#4a5568', label: '📄 Tài liệu pháp lý' },
};

// ── Dropzone ──────────────────────────────────────────────────────────────────
const Dropzone = ({ onFiles }) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (files.length) onFiles(files[0]);
  };

  return (
    <div
      className={`translate-dropzone ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept=".pdf" hidden onChange={e => e.target.files?.[0] && onFiles(e.target.files[0])} />
      <div className="translate-dropzone-icon">
        <Languages size={48} strokeWidth={1.5} />
      </div>
      <h2 className="translate-dropzone-title">Dịch tài liệu PDF</h2>
      <p className="translate-dropzone-sub">
        Hỗ trợ: Hợp đồng lao động · Học bạ · Giấy kết hôn · Giấy khai sinh · Giấy ủy quyền · Hộ chiếu/Visa
      </p>
      <button className="btn btn-primary translate-upload-btn">
        <Upload size={16} /> Chọn file PDF
      </button>
      <p className="translate-dropzone-hint">hoặc kéo thả file vào đây · Không giới hạn kích thước</p>
    </div>
  );
};

// ── Translated Block Renderer ─────────────────────────────────────────────────
const TranslatedPage = ({ pageData, onBlockEdit }) => (
  <div className="translated-page-content" style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '13pt', color: '#1a202c' }}>
    {pageData.blocks.map((block, i) => {
      if (block.type === 'table') {
        const borderless = block.borderless;
        const borderStyle = borderless ? 'none' : '1px solid #cbd5e0';
        return (
          <div key={i} className="translated-table-wrapper" style={{ margin: '16px 0', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: borderStyle }}>
              <tbody>
                {block.translated_cells.map((row, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: borderless ? 'none' : '1px solid #cbd5e0' }}>
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        onBlur={(e) => {
                          onBlockEdit(i, e.target.innerText, rIdx, cIdx);
                        }}
                        style={{ border: borderStyle, padding: '6px 10px', fontSize: '13pt', verticalAlign: 'top', outline: 'none', background: '#fff' }}
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
      let paddingLeft = '4px';
      if (align === 'left' && bbox && bbox[0] > 90) {
        const indentPx = Math.max(0, (bbox[0] - 72) * 1.2);
        paddingLeft = `${indentPx + 4}px`;
      }
      
      return (
        <div
          key={i}
          className={`translated-block ${isHeading ? 'translated-heading' : 'translated-para'}`}
          contentEditable={true}
          suppressContentEditableWarning={true}
          onBlur={(e) => {
            onBlockEdit(i, e.target.innerText);
          }}
          style={{
            fontSize: isHeading ? '14pt' : '13pt',
            fontWeight: (isHeading || isBold) ? 'bold' : 'normal',
            textAlign: align,
            marginBottom: '4px',
            lineHeight: '1.25',
            whiteSpace: 'pre-wrap',
            outline: 'none',
            paddingTop: '2px',
            paddingBottom: '2px',
            paddingRight: '4px',
            paddingLeft: paddingLeft,
            borderRadius: '4px',
            borderBottom: '1px dashed transparent',
            transition: 'background-color 0.15s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderBottom = '1px dashed #3182ce';
            e.target.style.backgroundColor = '#f7fafc';
          }}
          onBlurCapture={(e) => {
            e.target.style.borderBottom = '1px dashed transparent';
            e.target.style.backgroundColor = 'transparent';
          }}
        >
          {block.translated}
        </div>
      );
    })}
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const TranslateWorkspace = () => {
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
  const [selectedTemplate, setSelectedTemplate] = useState('auto');

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

  const fetchTranslation = async (f, temp) => {
    setStatus('loading');
    setErrorMsg('');
    setProgress(0);
    setLoadingStep('Đang khởi tạo dịch...');

    let currentProgress = 0;
    const interval = setInterval(() => {
      // Smooth asymptotic growth towards 99%
      const remaining = 99 - currentProgress;
      const increment = Math.max(0.1, remaining * 0.04);
      currentProgress = Math.min(99, currentProgress + increment);
      
      const displayProgress = Math.floor(currentProgress);
      setProgress(displayProgress);
 
      if (displayProgress < 25) {
        setLoadingStep('Đang đọc cấu trúc file PDF...');
      } else if (displayProgress < 50) {
        setLoadingStep('Đang phân tích bảng biểu và căn lề tự động...');
      } else if (displayProgress < 75) {
        setLoadingStep('Đang đối chiếu biểu mẫu dịch chuyên dụng...');
      } else if (displayProgress < 90) {
        setLoadingStep('Đang áp dụng từ điển thuật ngữ Lãnh sự...');
      } else {
        setLoadingStep('Đang hoàn thiện bố cục và đóng gói file Word...');
      }
    }, 250);

    try {
      const formData = new FormData();
      formData.append('file', f);
      formData.append('doc_type', temp);
      
      const res = await fetch(`${API_URL}/api/translate-pdf`, { method: 'POST', body: formData });
      clearInterval(interval);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Lỗi không xác định' }));
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
    setSelectedTemplate('auto');
    await fetchTranslation(f, 'auto');
  }, []);

  const handleTemplateChange = async (e) => {
    const nextTemp = e.target.value;
    setSelectedTemplate(nextTemp);
    if (file) {
      await fetchTranslation(file, nextTemp);
    }
  };

  const handleReset = () => {
    setFile(null);
    setObjectUrl(null);
    setResult(null);
    setStatus('idle');
    setErrorMsg('');
    setCurrentPage(1);
    setSelectedTemplate('auto');
  };

  const downloadTranslation = () => {
    if (!result) return;
    // Build plain-text bilingual content for download
    let text = `BILINGUAL TRANSLATION — ${result.original_filename}\n`;
    text += `Document type: ${result.doc_type_label}  |  Translator: ${result.translator.toUpperCase()}\n`;
    text += '='.repeat(70) + '\n\n';
    result.pages.forEach(page => {
      text += `--- Page ${page.page_num} ---\n\n`;
      page.blocks.forEach(b => {
        if (b.type === 'table') {
          text += `[TABLE]\n`;
          b.translated_cells.forEach((row, ri) => {
            text += `  Row ${ri + 1}: ${row.join(' | ')}\n`;
          });
          text += `\n`;
        } else {
          text += `[VI] ${b.original}\n`;
          text += `[EN] ${b.translated}\n\n`;
        }
      });
    });
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (file?.name?.replace(/\.pdf$/i, '') || 'translation') + '_bilingual.txt';
    a.click();
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
            block.translated_cells[rIdx][cIdx] = newText;
          } else {
            block.translated = newText;
          }
        }
      }
      return nextResult;
    });
  };

  const downloadDocx = async () => {
    if (!result) return;
    try {
      const res = await fetch(`${API_URL}/api/translate-pdf/download-edited-docx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ result }),
      });
      if (!res.ok) throw new Error('Không thể tải file Word');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (result.original_filename?.replace(/\.pdf$/i, '') || 'translation') + '_translated.docx';
      a.click();
    } catch (err) {
      alert(err.message);
    }
  };

  // ── Idle: show dropzone ──────────────────────────────────────────────────
  if (status === 'idle') return <Dropzone onFiles={handleFile} />;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="translate-status-screen" style={{ maxWidth: 500, margin: '100px auto', padding: 30, background: '#fff', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center' }}>
        <div className="translate-spinner" style={{ marginBottom: 20 }}>
          <Loader2 size={40} className="spin" style={{ color: '#3182ce', animation: 'spin 1.5s linear infinite' }} />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: '#2d3748', marginBottom: 8 }}>Đang dịch tài liệu...</h3>
        <p style={{ fontSize: 14, color: '#718096', wordBreak: 'break-all', marginBottom: 24 }}>{file?.name}</p>
        
        {/* Progress Bar */}
        <div style={{ width: '100%', height: 10, background: '#edf2f7', borderRadius: 5, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #3182ce, #319795)', transition: 'width 0.2s ease-out', borderRadius: 5 }} />
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
        <h3 style={{ color: '#e53e3e' }}>Dịch thất bại</h3>
        <p>{errorMsg}</p>
        <button className="btn btn-outline" onClick={handleReset} style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <RefreshCw size={15} /> Thử lại
        </button>
      </div>
    );
  }

  // ── Result: side-by-side view ────────────────────────────────────────────
  const docColor = DOC_TYPE_COLORS[result.doc_type] || DOC_TYPE_COLORS.general;
  const currentPageData = result.pages.find(p => p.page_num === currentPage);

  return (
    <div className="translate-result-container">
      {/* ── Top bar ── */}
      <div className="translate-result-topbar">
        <div className="translate-topbar-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#718096', fontWeight: 500 }}>Biểu mẫu:</span>
            <select
              value={selectedTemplate}
              onChange={handleTemplateChange}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e0',
                fontSize: 13,
                fontWeight: 600,
                background: '#fff',
                color: '#2d3748',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <option value="auto">🔍 Tự động nhận diện ({docColor.label})</option>
              <option value="birth_cert">👶 Giấy khai sinh (Birth Certificate)</option>
              <option value="marriage_cert">💍 Giấy kết hôn (Marriage Certificate)</option>
              <option value="school_transcript">🎓 Học bạ / Bảng điểm (School Report)</option>
              <option value="land_use_right">🏡 Sổ đỏ / Quyền sử dụng đất</option>
              <option value="residence_confirm">🛂 Xác nhận cư trú CT07</option>
              <option value="general">📄 Tài liệu pháp lý chung (General)</option>
            </select>
          </div>
          <span className="translate-filename">{result.original_filename}</span>
          <span className="translate-meta">
            {result.total_pages} trang · {result.translator === 'deepl' ? '🔵 DeepL' : '🟢 Google Translate'}
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
          <button className="btn btn-primary" style={{ fontSize: 13, padding: '6px 14px', display: 'flex', gap: 6 }} onClick={downloadDocx}>
            <Download size={14} /> Tải bản dịch Word (DOCX)
          </button>
          <button className="btn btn-outline" style={{ fontSize: 13, padding: '6px 14px', display: 'flex', gap: 6 }} onClick={downloadTranslation}>
            <Download size={14} /> Tải bản dịch (.txt)
          </button>
          <button className="btn btn-outline" style={{ fontSize: 13, padding: '6px 14px', display: 'flex', gap: 6 }} onClick={handleReset}>
            <RefreshCw size={14} /> Dịch file khác
          </button>
        </div>
      </div>

      {/* ── Side-by-side panels ── */}
      <div className="translate-panels">
        {/* Left: Original PDF */}
        <div className="translate-panel translate-panel-left">
          <div className="translate-panel-header">
            <FileText size={14} /> Bản gốc (Tiếng Việt)
          </div>
          <div className="translate-panel-scroll" ref={containerRef}>
            <Document
              file={objectUrl}
              onLoadSuccess={({ numPages }) => setPdfNumPages(numPages)}
            >
              <Page
                pageNumber={currentPage}
                scale={pdfScale}
                width={Math.min(595, containerWidth)}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          </div>
        </div>

        {/* Right: Translation */}
        <div className="translate-panel translate-panel-right">
          <div className="translate-panel-header">
            <Languages size={14} /> Bản dịch (English)
          </div>
          <div className="translate-panel-scroll">
            {currentPageData
              ? <TranslatedPage pageData={currentPageData} onBlockEdit={handleBlockEdit} />
              : <p style={{ color: '#a0aec0', padding: 20 }}>Không có nội dung cho trang này.</p>
            }
          </div>
        </div>
      </div>

      {/* ── Bottom pager ── */}
      <div className="translate-pager">
        <button className="pager-btn" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
          <ChevronLeft size={16} />
        </button>
        <span className="pager-text">{currentPage} / {result.total_pages}</span>
        <button className="pager-btn" disabled={currentPage >= result.total_pages} onClick={() => setCurrentPage(p => p + 1)}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default TranslateWorkspace;
