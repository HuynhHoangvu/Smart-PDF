"use client";

import { useId, useState } from "react";
import { UploadCloud, ChevronDown } from "lucide-react";

type FileDropzoneProps = {
  accept: string;
  multiple?: boolean;
  formats: string[];
  hint?: string;
  onFiles: (files: File[]) => void;
};

/**
 * Shared "pick or drop a file" screen used by every tool workspace's empty
 * state — one dropzone implementation instead of each workspace re-rolling
 * its own, so picking a file is always exactly one step.
 */
export default function FileDropzone({ accept, multiple = false, formats, hint, onFiles }: FileDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputId = useId();

  return (
    <div
      className={`dropzone ${isDragActive ? "active" : ""}`}
      onClick={() => document.getElementById(inputId)?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragActive(true);
      }}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragActive(false);
        if (e.dataTransfer.files?.length) onFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <UploadCloud className="dropzone-icon" size={60} />
      <button className="dropzone-btn" type="button">
        Chọn file <ChevronDown size={18} style={{ marginLeft: 5 }} />
      </button>
      <input
        type="file"
        id={inputId}
        multiple={multiple}
        accept={accept}
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files?.length) onFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
      {hint && <div className="dropzone-hint">{hint}</div>}
      <div className="dropzone-formats">
        Các định dạng được hỗ trợ:
        {formats.map((f) => (
          <span key={f} className="format-badge ml-1" style={{ backgroundColor: "var(--accent-pink-soft)", color: "var(--accent-pink)" }}>
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}
