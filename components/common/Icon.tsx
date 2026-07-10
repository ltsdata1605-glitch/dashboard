import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity, AlertCircle, AlertTriangle, Apple, ArchiveRestore, ArrowRight, Award, Backpack, BarChart2, BarChart3,
  BarChartHorizontal, BatteryCharging, Bell, BellOff, Box, Briefcase, Bug, Cable, Calculator, Calendar,
  CalendarClock, CalendarDays, Camera, Check, CheckCircle, CheckCircle2, CheckSquare, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsDownUp, ChevronsUpDown, CircleDollarSign, ClipboardList, ClipboardPaste, Clock, CloudDownload, Code, Coffee, Columns,
  Columns2, Contact, Copy, Cpu, CreditCard, Crown, Database, DollarSign, Download, DownloadCloud,
  Droplets, Edit3, ExternalLink, Eye, EyeOff, Factory, Fan, FastForward, FileCheck, FileKey2,
  FileSpreadsheet, FileText, FileUp, Film, Filter, Flame, GalleryHorizontalEnd, Gamepad2, GanttChartSquare, Glasses,
  GripHorizontal, GripVertical, Headphones, History, Images, Inbox, Info, Keyboard, Laptop, Layers,
  LayoutDashboard, LayoutGrid, LayoutList, LayoutTemplate, Link, List, Loader2, LogOut, MapPin, Maximize2,
  Medal, Megaphone, MemoryStick, MessageCircle, Minimize2, MousePointer2, Package, PackageX, Paintbrush, Palette,
  Pencil, Percent, PieChart, Play, PlugZap, Plus, PlusCircle, Printer, Receipt, RefreshCcw,
  RefreshCw, Rocket, RotateCcw, Router, Save, ScanLine, Search, SearchX, Settings, Settings2,
  Share2, Sheet, Shield, ShieldCheck, ShoppingBag, Sigma, Signal, Smartphone, SmartphoneNfc, Sparkles,
  Speaker, Square, Star, Swords, Table, Table2, Tablet, Tag, Target, ThermometerSnowflake,
  Tornado, Trash2, TrendingUp, Trophy, Truck, Tv, Type, Upload, User, UserCheck,
  UserCog, UserMinus, UserRoundCheck, UserRoundX, Users, UsersRound, WalletCards, Warehouse, Watch, Waves,
  Wind, X, Zap,
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
  'activity': Activity, 'alert-circle': AlertCircle, 'alert-triangle': AlertTriangle,
  'apple': Apple, 'archive-restore': ArchiveRestore, 'arrow-right': ArrowRight,
  'award': Award, 'backpack': Backpack, 'bar-chart-2': BarChart2,
  'bar-chart-3': BarChart3, 'bar-chart-horizontal': BarChartHorizontal, 'battery-charging': BatteryCharging,
  'bell': Bell, 'bell-off': BellOff, 'blender': PlugZap,
  'box': Box, 'briefcase': Briefcase, 'bug': Bug,
  'cable': Cable, 'calculator': Calculator, 'calendar': Calendar,
  'calendar-clock': CalendarClock, 'calendar-days': CalendarDays, 'camera': Camera,
  'check': Check, 'check-circle': CheckCircle, 'check-circle-2': CheckCircle2,
  'check-square': CheckSquare, 'chevron-down': ChevronDown, 'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight, 'chevrons-down-up': ChevronsDownUp, 'chevrons-up-down': ChevronsUpDown,
  'circle-dollar-sign': CircleDollarSign, 'clipboard-list': ClipboardList, 'clipboard-paste': ClipboardPaste,
  'clock': Clock, 'cloud-download': CloudDownload, 'code': Code,
  'coffee': Coffee, 'columns': Columns, 'columns-2': Columns2,
  'contact': Contact, 'copy': Copy, 'cpu': Cpu,
  'credit-card': CreditCard, 'crown': Crown, 'database': Database,
  'dollar-sign': DollarSign, 'download': Download, 'download-cloud': DownloadCloud,
  'droplets': Droplets, 'edit-3': Edit3, 'external-link': ExternalLink,
  'eye': Eye, 'eye-off': EyeOff, 'factory': Factory,
  'fan': Fan, 'fast-forward': FastForward, 'file-check': FileCheck,
  'file-key-2': FileKey2, 'file-spreadsheet': FileSpreadsheet, 'file-text': FileText,
  'file-up': FileUp, 'film': Film, 'filter': Filter,
  'flame': Flame, 'gallery-horizontal-end': GalleryHorizontalEnd, 'gamepad-2': Gamepad2,
  'gantt-chart-square': GanttChartSquare, 'glasses': Glasses, 'grip-horizontal': GripHorizontal,
  'grip-vertical': GripVertical, 'headphones': Headphones, 'history': History,
  'images': Images, 'inbox': Inbox, 'info': Info,
  'keyboard': Keyboard, 'laptop': Laptop, 'layers': Layers,
  'layout-dashboard': LayoutDashboard, 'layout-grid': LayoutGrid, 'layout-list': LayoutList,
  'layout-template': LayoutTemplate, 'link': Link, 'list': List,
  'loader-2': Loader2, 'log-out': LogOut, 'map-pin': MapPin,
  'maximize-2': Maximize2, 'medal': Medal, 'megaphone': Megaphone,
  'memory-stick': MemoryStick, 'message-circle': MessageCircle, 'minimize-2': Minimize2,
  'mouse-pointer-2': MousePointer2, 'package': Package, 'package-x': PackageX,
  'paintbrush': Paintbrush, 'palette': Palette, 'pencil': Pencil,
  'percent': Percent, 'pie-chart': PieChart, 'play': Play,
  'plug-zap': PlugZap, 'plus': Plus, 'plus-circle': PlusCircle,
  'printer': Printer, 'receipt': Receipt, 'refresh-ccw': RefreshCcw,
  'refresh-cw': RefreshCw, 'rocket': Rocket, 'rotate-ccw': RotateCcw,
  'router': Router, 'save': Save, 'scan-line': ScanLine,
  'search': Search, 'search-x': SearchX, 'settings': Settings,
  'settings-2': Settings2, 'share-2': Share2, 'sheet': Sheet,
  'shield': Shield, 'shield-check': ShieldCheck, 'shopping-bag': ShoppingBag,
  'sigma': Sigma, 'signal': Signal, 'smartphone': Smartphone,
  'smartphone-nfc': SmartphoneNfc, 'sparkles': Sparkles, 'speaker': Speaker,
  'square': Square, 'star': Star, 'swords': Swords,
  'table': Table, 'table-2': Table2, 'tablet': Tablet,
  'tag': Tag, 'target': Target, 'thermometer-snowflake': ThermometerSnowflake,
  'tornado': Tornado, 'trash-2': Trash2, 'trending-up': TrendingUp,
  'trophy': Trophy, 'truck': Truck, 'tv': Tv,
  'type': Type, 'upload': Upload, 'user': User,
  'user-check': UserCheck, 'user-cog': UserCog, 'user-minus': UserMinus,
  'user-round-check': UserRoundCheck, 'user-round-x': UserRoundX, 'users': Users,
  'users-round': UsersRound, 'wallet-cards': WalletCards, 'warehouse': Warehouse,
  'watch': Watch, 'waves': Waves, 'wind': Wind,
  'x': X, 'zap': Zap,
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
