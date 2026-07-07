import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle, AlertTriangle, ArchiveRestore, ArrowRight, Award, BarChart2, Bell, BellOff,
  Briefcase, Bug, Calculator, Calendar, CalendarClock, CalendarDays, Camera, Check, CheckCircle,
  CheckCircle2, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, ChevronsDownUp, ChevronsUpDown,
  CircleDollarSign, ClipboardList, ClipboardPaste, Clock, CloudDownload, Code, Columns, Columns2,
  Contact, Copy, Cpu, Database, Download, DownloadCloud, Edit3, ExternalLink, Eye, EyeOff, FileCheck,
  FileSpreadsheet, FileText, FileUp, Filter, GalleryHorizontalEnd, GanttChartSquare, Glasses,
  GripHorizontal, GripVertical, History, Images, Inbox, Info, Layers, LayoutDashboard, LayoutList,
  LayoutTemplate, Link, List, Loader2, LogOut, MapPin, Maximize2, Megaphone, MessageCircle, Minimize2,
  Package, Paintbrush, Palette, Pencil, Percent, PieChart, Play, Plus, PlusCircle, RefreshCcw,
  RefreshCw, RotateCcw, Save, ScanLine, Search, SearchX, Settings, Settings2, Share2, Sheet, Shield,
  ShieldCheck, Sigma, Sparkles, Square, Table, Table2, Tag, Target, Trash2, Trophy, Truck, Type,
  Upload, User, UserCheck, UserMinus, Users, UsersRound, Warehouse, X, Zap,
} from 'lucide-react';

interface IconProps {
  name: string;
  className?: string;
  size?: number;
}

// Map tường minh thay vì `import * as LucideIcons` — wildcard namespace import khiến Rollup
// không tree-shake được, kéo theo toàn bộ ~1600 icon của lucide-react vào bundle (~900kB /
// 168kB gzip đo được thực tế) dù chỉ dùng vài chục icon qua tên chuỗi. Thêm icon mới: thêm
// import ở trên VÀ thêm dòng vào map bên dưới (đúng key kebab-case dùng trong `name`).
const ICON_MAP: Record<string, LucideIcon> = {
  'alert-circle': AlertCircle, 'alert-triangle': AlertTriangle, 'archive-restore': ArchiveRestore,
  'arrow-right': ArrowRight, 'award': Award, 'bar-chart-2': BarChart2, 'bell': Bell, 'bell-off': BellOff,
  'briefcase': Briefcase, 'bug': Bug, 'calculator': Calculator, 'calendar': Calendar,
  'calendar-clock': CalendarClock, 'calendar-days': CalendarDays, 'camera': Camera, 'check': Check,
  'check-circle': CheckCircle, 'check-circle-2': CheckCircle2, 'check-square': CheckSquare,
  'chevron-down': ChevronDown, 'chevron-left': ChevronLeft, 'chevron-right': ChevronRight,
  'chevrons-down-up': ChevronsDownUp, 'chevrons-up-down': ChevronsUpDown,
  'circle-dollar-sign': CircleDollarSign, 'clipboard-list': ClipboardList,
  'clipboard-paste': ClipboardPaste, 'clock': Clock, 'cloud-download': CloudDownload, 'code': Code,
  'columns': Columns, 'columns-2': Columns2, 'contact': Contact, 'copy': Copy, 'cpu': Cpu,
  'database': Database, 'download': Download, 'download-cloud': DownloadCloud, 'edit-3': Edit3,
  'external-link': ExternalLink, 'eye': Eye, 'eye-off': EyeOff, 'file-check': FileCheck,
  'file-spreadsheet': FileSpreadsheet, 'file-text': FileText, 'file-up': FileUp, 'filter': Filter,
  'gallery-horizontal-end': GalleryHorizontalEnd, 'gantt-chart-square': GanttChartSquare,
  'glasses': Glasses, 'grip-horizontal': GripHorizontal, 'grip-vertical': GripVertical,
  'history': History, 'images': Images, 'inbox': Inbox, 'info': Info, 'layers': Layers,
  'layout-dashboard': LayoutDashboard, 'layout-list': LayoutList, 'layout-template': LayoutTemplate,
  'link': Link, 'list': List, 'loader-2': Loader2, 'log-out': LogOut, 'map-pin': MapPin,
  'maximize-2': Maximize2, 'megaphone': Megaphone, 'message-circle': MessageCircle,
  'minimize-2': Minimize2, 'package': Package, 'paintbrush': Paintbrush, 'palette': Palette,
  'pencil': Pencil, 'percent': Percent, 'pie-chart': PieChart, 'play': Play, 'plus': Plus,
  'plus-circle': PlusCircle, 'refresh-ccw': RefreshCcw, 'refresh-cw': RefreshCw,
  'rotate-ccw': RotateCcw, 'save': Save, 'scan-line': ScanLine, 'search': Search,
  'search-x': SearchX, 'settings': Settings, 'settings-2': Settings2, 'share-2': Share2,
  'sheet': Sheet, 'shield': Shield, 'shield-check': ShieldCheck, 'sigma': Sigma,
  'sparkles': Sparkles, 'square': Square, 'table': Table, 'table-2': Table2, 'tag': Tag,
  'target': Target, 'trash-2': Trash2, 'trophy': Trophy, 'truck': Truck, 'type': Type,
  'upload': Upload, 'user': User, 'user-check': UserCheck, 'user-minus': UserMinus,
  'users': Users, 'users-round': UsersRound, 'warehouse': Warehouse, 'x': X, 'zap': Zap,
};

/**
 * A wrapper component for Lucide icons that uses the lucide-react library.
 * This replaces the previous approach of using global lucide.createIcons().
 */
export const Icon: React.FC<IconProps> = ({ name, className = '', size = 5 }) => {
  const IconComponent = ICON_MAP[name];

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in ICON_MAP (components/common/Icon.tsx) — thêm import + entry map nếu đây là icon mới.`);
    return <span className={`inline-block w-${size} h-${size} bg-slate-200 rounded-sm ${className}`} />;
  }

  // Tailwind w-X and h-X classes don't work well with dynamic values if not safelisted.
  // We use inline styles for the size to ensure it works reliably.
  const sizeInPx = size * 4; // Tailwind 1 unit = 4px

  return (
    <IconComponent
      className={className}
      style={{ width: `${sizeInPx}px`, height: `${sizeInPx}px` }}
    />
  );
};
