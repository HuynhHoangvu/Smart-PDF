"use client";

import {
  Home,
  Layers,
  FileArchive,
  Scissors,
  FileText,
  ImagePlus,
  Languages,
  FileOutput,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { id: "home", icon: <Home size={20} />, label: "Trang Chủ", path: "/" },
  { id: "merge", icon: <Layers size={20} />, label: "Gộp PDF", path: "/tool/merge" },
  { id: "compress", icon: <FileArchive size={20} />, label: "Nén PDF", path: "/tool/compress" },
  { id: "split", icon: <Scissors size={20} />, label: "Cắt PDF", path: "/tool/split" },
  { id: "pdf-to-word", icon: <FileText size={20} />, label: "PDF → Word", path: "/tool/pdf-to-word" },
  { id: "word-to-pdf", icon: <FileOutput size={20} />, label: "Word → PDF", path: "/tool/word-to-pdf" },
  { id: "pdf-to-image", icon: <ImagePlus size={20} />, label: "PDF ↔ Hình ảnh", path: "/tool/pdf-to-image", altPaths: ["/tool/image-to-pdf"] },
  { id: "translate", icon: <Languages size={20} />, label: "Dịch PDF", path: "/tool/translate" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <span style={{ color: "#0062ff" }}>S</span>P
      </div>
      <div className="sidebar-menu">
        {menuItems.map((item) => (
          <Link
            href={item.path}
            key={item.id}
            className={`sidebar-item ${pathname === item.path || item.altPaths?.includes(pathname) ? "active" : ""}`}
          >
            <div className="icon">{item.icon}</div>
            <div className="label">{item.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
