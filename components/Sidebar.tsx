"use client";

import { useEffect, useRef, useState } from "react";
import {
  Home,
  Layers,
  FileArchive,
  Scissors,
  FileText,
  Image as ImageIcon,
  ImagePlus,
  Languages,
  FileOutput,
  Grid2x2,
  ArrowLeftRight,
  PenLine,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Leaf = { id: string; icon: React.ReactNode; label: string; path: string; altPaths?: string[] };
type MenuEntry = Leaf | { id: string; icon: React.ReactNode; label: string; children: Leaf[] };

// Grouped the same way Smallpdf groups its tool rail (Sắp xếp / Nén /
// Chuyển đổi as flyout categories, single-purpose tools as direct links) —
// even though SmartPDF has far fewer tools, the same shape keeps room to
// grow each category without the rail getting wider.
const menuItems: MenuEntry[] = [
  { id: "home", icon: <Home size={20} />, label: "Trang Chủ", path: "/" },
  {
    id: "sort",
    icon: <Grid2x2 size={20} />,
    label: "Sắp xếp",
    children: [
      { id: "merge", icon: <Layers size={18} />, label: "Gộp PDF", path: "/tool/merge" },
      { id: "split", icon: <Scissors size={18} />, label: "Cắt PDF", path: "/tool/split" },
    ],
  },
  {
    id: "compress",
    icon: <FileArchive size={20} />,
    label: "Nén",
    children: [
      { id: "compress-pdf", icon: <FileArchive size={18} />, label: "Nén PDF", path: "/tool/compress" },
      { id: "compress-image", icon: <ImageIcon size={18} />, label: "Nén hình ảnh", path: "/tool/compress-image" },
    ],
  },
  {
    id: "convert",
    icon: <ArrowLeftRight size={20} />,
    label: "Chuyển đổi",
    children: [
      { id: "pdf-to-word", icon: <FileText size={18} />, label: "PDF → Word", path: "/tool/pdf-to-word" },
      { id: "word-to-pdf", icon: <FileOutput size={18} />, label: "Word → PDF", path: "/tool/word-to-pdf" },
      {
        id: "pdf-to-image",
        icon: <ImagePlus size={18} />,
        label: "PDF ↔ Hình ảnh",
        path: "/tool/pdf-to-image",
        altPaths: ["/tool/image-to-pdf"],
      },
    ],
  },
  { id: "sign", icon: <PenLine size={20} />, label: "Ký tên", path: "/tool/sign" },
  { id: "translate", icon: <Languages size={20} />, label: "Dịch PDF", path: "/tool/translate" },
];

const isLeaf = (item: MenuEntry): item is Leaf => "path" in item;

const matchesLeaf = (leaf: Leaf, pathname: string) => pathname === leaf.path || !!leaf.altPaths?.includes(pathname);

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close the drawer whenever the route changes (link click, back/forward,
  // etc.) — adjusting state during render instead of an effect, per
  // https://react.dev/learn/you-might-not-need-an-effect
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
    if (openMenu) setOpenMenu(null);
  }

  // Click outside the sidebar closes any open flyout (desktop) — on mobile
  // the flyout renders inline in the drawer instead, so this only matters
  // once the drawer itself is dismissed by the backdrop.
  useEffect(() => {
    if (!openMenu) return;
    const onClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openMenu]);

  return (
    <>
      <button
        type="button"
        className="sidebar-mobile-toggle"
        onClick={() => setMobileOpen(true)}
        aria-label="Mở menu"
      >
        <Menu size={22} />
      </button>

      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />
      )}

      <div className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`} ref={sidebarRef}>
        <div className="sidebar-logo">
          <span style={{ color: "var(--accent-pink)" }}>S</span>P
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Đóng menu"
          >
            <X size={20} />
          </button>
        </div>
        <div className="sidebar-menu">
          {menuItems.map((item) => {
            if (isLeaf(item)) {
              return (
                <Link
                  href={item.path}
                  key={item.id}
                  title={item.label}
                  className={`sidebar-item ${matchesLeaf(item, pathname) ? "active" : ""}`}
                >
                  <div className="icon">{item.icon}</div>
                  <div className="label">{item.label}</div>
                </Link>
              );
            }

            const isGroupActive = item.children.some((c) => matchesLeaf(c, pathname));
            const isOpen = openMenu === item.id;
            return (
              <div className="sidebar-item-wrap" key={item.id}>
                <button
                  type="button"
                  title={item.label}
                  className={`sidebar-item ${isGroupActive ? "active" : ""} ${isOpen ? "open" : ""}`}
                  onClick={() => setOpenMenu(isOpen ? null : item.id)}
                >
                  <div className="icon">{item.icon}</div>
                  <div className="label">
                    {item.label}
                    <ChevronRight size={12} className="sidebar-item-caret" />
                  </div>
                </button>
                {isOpen && (
                  <div className="sidebar-flyout">
                    {item.children.map((child) => (
                      <Link
                        href={child.path}
                        key={child.id}
                        className={`sidebar-flyout-item ${matchesLeaf(child, pathname) ? "active" : ""}`}
                      >
                        <div className="icon">{child.icon}</div>
                        <span>{child.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
