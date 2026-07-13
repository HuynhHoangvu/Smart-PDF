"use client";

import {
  Layers,
  FileArchive,
  Scissors,
  FileText,
  Image as ImageIcon,
  Languages,
  ScanText,
  FileKey,
  CheckSquare,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";

const tools = [
  { id: "merge", title: "Gộp", icon: <Layers size={20} />, color: "#8b5cf6" },
  { id: "compress", title: "Nén", icon: <FileArchive size={20} />, color: "#ef4444" },
  { id: "split", title: "Cắt", icon: <Scissors size={20} />, color: "#8b5cf6" },
  { id: "pdf-to-word", title: "PDF sang Word", icon: <FileText size={20} />, color: "#3b82f6" },
  { id: "pdf-to-image", title: "PDF sang Hình ảnh", icon: <ImageIcon size={20} />, color: "#f59e0b" },
  { id: "translate", title: "Dịch", icon: <Languages size={20} />, color: "#3b82f6" },
  { id: "read", title: "Đọc PDF", icon: <ScanText size={20} />, color: "#10b981" },
  { id: "protect", title: "Bảo vệ PDF", icon: <FileKey size={20} />, color: "#ef4444" },
  { id: "sign", title: "Ký tên", icon: <CheckSquare size={20} />, color: "#ec4899" },
  { id: "edit", title: "Chỉnh sửa", icon: <Settings size={20} />, color: "#10b981" },
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
