"use client";

import {
  Layers,
  FileArchive,
  Scissors,
  FileText,
  Image as ImageIcon,
  Languages,
  PenLine,
} from "lucide-react";
import { useRouter } from "next/navigation";

// One shared pastel-pink neumorphic chip for every icon instead of a
// different bright color per tool — see .tool-icon in globals.css.
const tools = [
  { id: "merge", title: "Gộp", icon: <Layers size={20} /> },
  { id: "compress", title: "Nén", icon: <FileArchive size={20} /> },
  { id: "split", title: "Cắt", icon: <Scissors size={20} /> },
  { id: "pdf-to-word", title: "PDF sang Word", icon: <FileText size={20} /> },
  { id: "pdf-to-image", title: "PDF sang Hình ảnh", icon: <ImageIcon size={20} /> },
  { id: "compress-image", title: "Nén hình ảnh", icon: <ImageIcon size={20} /> },
  { id: "sign", title: "Ký tên", icon: <PenLine size={20} /> },
  { id: "translate", title: "Dịch", icon: <Languages size={20} /> },
];

export default function Home() {
  const router = useRouter();

  return (
    <div className="page-container">
      <div className="section-title">Công cụ PDF thông dụng nhất</div>
      <div className="tool-grid">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className="tool-card"
            onClick={() => router.push(`/tool/${tool.id}`)}
          >
            <div className="tool-icon">{tool.icon}</div>
            <div className="tool-title">{tool.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
