"use client";

import {
  Layers,
  FileArchive,
  Scissors,
  FileText,
  Image as ImageIcon,
  Languages,
} from "lucide-react";
import { useRouter } from "next/navigation";

const tools = [
  { id: "merge", title: "Gộp", icon: <Layers size={20} />, color: "#8b5cf6" },
  { id: "compress", title: "Nén", icon: <FileArchive size={20} />, color: "#ef4444" },
  { id: "split", title: "Cắt", icon: <Scissors size={20} />, color: "#8b5cf6" },
  { id: "pdf-to-word", title: "PDF sang Word", icon: <FileText size={20} />, color: "#3b82f6" },
  { id: "pdf-to-image", title: "PDF sang Hình ảnh", icon: <ImageIcon size={20} />, color: "#f59e0b" },
  { id: "translate", title: "Dịch", icon: <Languages size={20} />, color: "#3b82f6" },
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
            <div className="tool-icon" style={{ backgroundColor: tool.color }}>
              {tool.icon}
            </div>
            <div className="tool-title">{tool.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
