import React from 'react';
import { Home, Layers, FileArchive, Scissors, FileText, Image as ImageIcon, Languages, ScanText, PenTool, Signature } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  const menuItems = [
    { id: 'home', icon: <Home size={20} />, label: 'Trang Chủ', path: '/' },
    { id: 'merge', icon: <Layers size={20} />, label: 'Gộp PDF', path: '/tool/merge' },
    { id: 'compress', icon: <FileArchive size={20} />, label: 'Nén PDF', path: '/tool/compress' },
    { id: 'split', icon: <Scissors size={20} />, label: 'Cắt PDF', path: '/tool/split' },
    { id: 'pdf-to-word', icon: <FileText size={20} />, label: 'PDF sang Word', path: '/tool/pdf-to-word' },
    { id: 'pdf-to-image', icon: <ImageIcon size={20} />, label: 'PDF sang Hình ảnh', path: '/tool/pdf-to-image' },
    { id: 'translate', icon: <Languages size={20} />, label: 'Dịch PDF', path: '/tool/translate' },
    { id: 'read', icon: <ScanText size={20} />, label: 'Đọc PDF', path: '/tool/read' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <span style={{ color: '#0062ff' }}>S</span>P
      </div>
      <div className="sidebar-menu">
        {menuItems.map(item => (
          <Link to={item.path} key={item.id} className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}>
            <div className="icon">{item.icon}</div>
            <div className="label">{item.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
