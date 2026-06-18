import { useState } from 'react';
import { Download, RefreshCw, CheckCircle2, Edit2, FileText, ExternalLink } from 'lucide-react';

const WordResult = ({ blob, initialName = 'converted', onRestart }) => {
  const [fileName, setFileName] = useState(initialName);
  const [editingName, setEditingName] = useState(false);
  const [objectUrl] = useState(() => URL.createObjectURL(blob));

  const fileSizeMB = (blob.size / 1024 / 1024).toFixed(2);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName.endsWith('.docx') ? fileName : `${fileName}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleOpenFile = () => {
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="merge-result-container">
      <div className="result-pdf-viewer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: 560,
            minHeight: 640,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 14,
            padding: 28,
            textAlign: 'left',
            boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <FileText size={28} color="#2563eb" />
            <h3 style={{ margin: 0, fontSize: 22 }}>Đã chuyển đổi sang Word</h3>
          </div>
          <p style={{ color: '#374151', marginBottom: 10 }}>
            File DOCX đã sẵn sàng để chỉnh sửa trực tiếp trong Microsoft Word hoặc Google Docs.
          </p>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Mẹo: bấm <strong>Tải file xuống</strong> rồi mở file để chỉnh sửa nội dung.
          </p>
        </div>
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
                onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
              />
              <span className="result-ext">.docx</span>
            </div>
          ) : (
            <div className="result-name-display" onClick={() => setEditingName(true)} title="Nhấn để đổi tên">
              <span className="result-name-text">{fileName}.docx</span>
              <Edit2 size={14} className="result-edit-icon" />
            </div>
          )}
          <div className="result-meta">{fileSizeMB} MB · Word Document</div>
        </div>

        <button className="btn btn-primary result-download-btn" onClick={handleDownload}>
          <Download size={16} /> Tải file xuống
        </button>

        <button className="btn btn-outline result-export-btn" onClick={handleOpenFile}>
          <ExternalLink size={15} /> Mở file
        </button>

        <div className="result-divider" />

        <button className="btn btn-outline result-restart-btn" onClick={onRestart}>
          <RefreshCw size={15} /> Bắt đầu lại
        </button>
      </div>
    </div>
  );
};

export default WordResult;
