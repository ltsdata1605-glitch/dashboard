import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity, AlertCircle, AlertTriangle, Apple, ArchiveRestore, AreaChart, ArrowDown, ArrowRight, ArrowUp, Award, Backpack, Banknote,
  BarChart2, BarChart3, BarChartHorizontal, BatteryCharging, Bell, BellOff, Box, Briefcase, Bug, Cable,
  Calculator, Calendar, CalendarClock, CalendarDays, CalendarCheck, CalendarX, Camera, Check, CheckCircle, CheckCircle2, CheckSquare, ChefHat,
  ChevronDown, ChevronLeft, ChevronRight, ChevronsDownUp, ChevronsUpDown, CircleDollarSign, ClipboardList, ClipboardPaste, Clock, CloudDownload,
  Code, Coffee, Columns, Columns2, Compass, Contact, Copy, Cpu, CreditCard, Crown, Database,
  DollarSign, Download, DownloadCloud, Droplet, Droplets, Edit3, ExternalLink, Eye, EyeOff, Factory,
  Fan, FastForward, FileCheck, FileKey2, FileScan, FileSpreadsheet, FileText, FileUp, Film, Filter,
  Flame, GalleryHorizontalEnd, Gamepad2, GanttChartSquare, Glasses, Grid, GripHorizontal, GripVertical, Headphones, HelpCircle, History, Images,
  Inbox, Info, Keyboard, Laptop, Layers, Layout, LayoutDashboard, LayoutGrid, LayoutList, LayoutTemplate, Lightbulb,
  LineChart, Link, List, ListTodo, Loader2, Lock, LogOut, MapPin, Maximize2, Medal, Megaphone, MemoryStick, MessageCircle, MoreVertical,
  Minimize2, MousePointer2, Package, PackageX, Paintbrush, Palette, Pencil, Percent, PieChart, Play,
  PlaySquare, PlugZap, Plus, PlusCircle, Printer, Receipt, RefreshCcw, RefreshCw, Rocket, RotateCcw,
  Router, Save, ScanLine, Search, SearchX, Server, Settings, Settings2, Share2, Sheet,
  Shield, ShieldCheck, ShoppingBag, Sigma, Signal, SlidersHorizontal, Smartphone, SmartphoneNfc, Sparkles, Speaker, Square,
  Star, Swords, Table, Table2, Tablet, Tag, Target, ThermometerSnowflake, Tornado, Trash2,
  TrendingUp, Trophy, Truck, Tv, Type, Upload, UploadCloud, User, UserCheck, UserCog,
  UserMinus, UserRoundCheck, UserRoundX, Users, UsersRound, Wallet, WalletCards, Warehouse, Watch, Waves,
  Webcam, Wind, X, Zap,
} from 'lucide-react';

interface IconProps {
  name: string;
  className?: string;
  size?: number;
}

/**
 * LINE Brand Icon (CC0 / Simple Icons path)
 * Chuẩn nhận diện thương hiệu LINE: bong bóng chat bo góc đặc trưng với chữ "LINE".
 */
export const LineIcon: React.FC<React.SVGProps<SVGSVGElement> & { size?: number | string }> = ({
  className = '',
  style,
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={style}
    aria-hidden="true"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.477.254l2.486 3.376V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"
    />
  </svg>
);

// Map tường minh thay vì `import * as LucideIcons` — wildcard namespace import khiến Rollup
// không tree-shake được, kéo theo toàn bộ ~1600 icon của lucide-react vào bundle (~900kB /
// 168kB gzip đo được thực tế) dù chỉ dùng vài chục icon qua tên chuỗi. Thêm icon mới: thêm
// import ở trên VÀ thêm dòng vào map bên dưới (đúng key kebab-case dùng trong `name`).
const ICON_MAP: Record<string, LucideIcon | React.ComponentType<any>> = {
  'activity': Activity, 'alert-circle': AlertCircle, 'alert-triangle': AlertTriangle,
  'apple': Apple, 'archive-restore': ArchiveRestore, 'area-chart': AreaChart,
  'arrow-down': ArrowDown, 'arrow-right': ArrowRight, 'arrow-up': ArrowUp, 'award': Award, 'backpack': Backpack,
  'banknote': Banknote, 'bar-chart-2': BarChart2, 'bar-chart-3': BarChart3,
  'bar-chart-horizontal': BarChartHorizontal, 'battery-charging': BatteryCharging, 'bell': Bell,
  'bell-off': BellOff, 'blender': PlugZap, 'box': Box,
  'briefcase': Briefcase, 'bug': Bug, 'cable': Cable,
  'calculator': Calculator, 'calendar': Calendar, 'calendar-clock': CalendarClock,
  'calendar-days': CalendarDays, 'calendar-check': CalendarCheck, 'calendar-x': CalendarX, 'camera': Camera, 'check': Check,
  'check-circle': CheckCircle, 'check-circle-2': CheckCircle2, 'check-square': CheckSquare,
  'chef-hat': ChefHat, 'chevron-down': ChevronDown, 'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight, 'chevrons-down-up': ChevronsDownUp, 'chevrons-up-down': ChevronsUpDown,
  'circle-dollar-sign': CircleDollarSign, 'clipboard-list': ClipboardList, 'clipboard-paste': ClipboardPaste,
  'clock': Clock, 'cloud-download': CloudDownload, 'code': Code,
  'coffee': Coffee, 'columns': Columns, 'columns-2': Columns2, 'compass': Compass,
  'contact': Contact, 'copy': Copy, 'cpu': Cpu,
  'credit-card': CreditCard, 'crown': Crown, 'database': Database,
  'dollar-sign': DollarSign, 'download': Download, 'download-cloud': DownloadCloud,
  'droplet': Droplet, 'droplets': Droplets, 'edit-3': Edit3,
  'external-link': ExternalLink, 'eye': Eye, 'eye-off': EyeOff,
  'factory': Factory, 'fan': Fan, 'fast-forward': FastForward,
  'file-check': FileCheck, 'file-key-2': FileKey2, 'file-scan': FileScan,
  'file-spreadsheet': FileSpreadsheet, 'file-text': FileText, 'file-up': FileUp,
  'film': Film, 'filter': Filter, 'flame': Flame,
  'gallery-horizontal-end': GalleryHorizontalEnd, 'gamepad-2': Gamepad2, 'gantt-chart-square': GanttChartSquare,
  'glasses': Glasses, 'grid': Grid, 'grip-horizontal': GripHorizontal, 'grip-vertical': GripVertical,
  'headphones': Headphones, 'help-circle': HelpCircle, 'history': History, 'images': Images,
  'inbox': Inbox, 'info': Info, 'keyboard': Keyboard,
  'laptop': Laptop, 'layers': Layers, 'layout': Layout, 'layout-dashboard': LayoutDashboard,
  'layout-grid': LayoutGrid, 'layout-list': LayoutList, 'layout-template': LayoutTemplate,
  'lightbulb': Lightbulb, 'line': LineIcon, 'line-app': LineIcon, 'line-chart': LineChart, 'link': Link, 'list': List, 'list-todo': ListTodo,
  'loader-2': Loader2, 'lock': Lock, 'log-out': LogOut, 'map-pin': MapPin,
  'maximize-2': Maximize2, 'medal': Medal, 'megaphone': Megaphone,
  'memory-stick': MemoryStick, 'message-circle': MessageCircle, 'more-vertical': MoreVertical, 'minimize-2': Minimize2,
  'mouse-pointer-2': MousePointer2, 'package': Package, 'package-x': PackageX,
  'paintbrush': Paintbrush, 'palette': Palette, 'pencil': Pencil,
  'percent': Percent, 'pie-chart': PieChart, 'play': Play,
  'play-square': PlaySquare, 'plug-zap': PlugZap, 'plus': Plus,
  'plus-circle': PlusCircle, 'printer': Printer, 'receipt': Receipt,
  'refresh-ccw': RefreshCcw, 'refresh-cw': RefreshCw, 'rocket': Rocket,
  'rotate-ccw': RotateCcw, 'router': Router, 'save': Save,
  'scan-line': ScanLine, 'search': Search, 'search-x': SearchX,
  'server': Server, 'settings': Settings, 'settings-2': Settings2,
  'share-2': Share2, 'sheet': Sheet, 'shield': Shield,
  'shield-check': ShieldCheck, 'shopping-bag': ShoppingBag, 'sigma': Sigma,
  'signal': Signal, 'sim-card': Signal, 'sliders-horizontal': SlidersHorizontal, 'smartphone': Smartphone,
  'smartphone-nfc': SmartphoneNfc, 'sparkles': Sparkles, 'speaker': Speaker,
  'square': Square, 'star': Star, 'swords': Swords,
  'table': Table, 'table-2': Table2, 'tablet': Tablet,
  'tag': Tag, 'target': Target, 'thermometer-snowflake': ThermometerSnowflake,
  'tornado': Tornado, 'trash-2': Trash2, 'trending-up': TrendingUp,
  'trophy': Trophy, 'truck': Truck, 'tv': Tv,
  'type': Type, 'upload': Upload, 'upload-cloud': UploadCloud,
  'user': User, 'user-check': UserCheck, 'user-cog': UserCog,
  'user-minus': UserMinus, 'user-round-check': UserRoundCheck, 'user-round-x': UserRoundX,
  'users': Users, 'users-round': UsersRound, 'wallet': Wallet,
  'wallet-cards': WalletCards, 'warehouse': Warehouse, 'watch': Watch,
  'waves': Waves, 'webcam': Webcam, 'wind': Wind, 'x': X,
  'zap': Zap,
};

/**
 * A wrapper component for Lucide icons that uses the lucide-react library.
 * This replaces the previous approach of using global lucide.createIcons().
 */
export const Icon: React.FC<IconProps> = ({ name, className = '', size = 5 }) => {
  const IconComponent = ICON_MAP[name];

  if (!IconComponent) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`Icon "${name}" not found in ICON_MAP (components/common/Icon.tsx) — using HelpCircle fallback.`);
    }
  }

  const RenderIcon = IconComponent || HelpCircle;
  const sizeInPx = size * 4; // Tailwind 1 unit = 4px

  return (
    <RenderIcon
      className={className}
      style={{ width: `${sizeInPx}px`, height: `${sizeInPx}px` }}
    />
  );
};
