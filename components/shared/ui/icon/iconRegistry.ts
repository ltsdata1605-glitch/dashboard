/**
 * REGISTRY ICON — map TÊN CHỨC NĂNG → icon (chuẩn hoá icon Giai đoạn 0, 2026-10-02).
 *
 * Quy tắc:
 * - Đây là NƠI DUY NHẤT trong dự án được `import … from 'lucide-react'`. Code ở mọi khu vực gọi
 *   `<AppIcon name="exportImage" />` theo chức năng, không gọi theo hình. Muốn đổi icon của một
 *   chức năng → sửa đúng 1 dòng ở đây, toàn dự án đổi theo. (`scripts/lint-ratchet.cjs` đếm
 *   `iconDirectImport` theo file — chỉ được giảm.)
 * - Một chức năng = một icon. Hai chức năng khác nhau thì đặt hai tên dù đôi khi trùng hình
 *   (vd `refresh` "tải lại dữ liệu" ≠ `reset` "đặt lại về mặc định") — người đọc mã biết ý định,
 *   và sau này tách hình không phải đi tìm từng chỗ.
 * - Import TƯỜNG MINH từng icon, cấm `import * as` — wildcard làm Rollup không tree-shake được
 *   (đã đo: kéo ~1600 icon, ~168kB gzip vào bundle; xem chú thích cũ ở components/common/Icon.tsx).
 * - Tên lucide dùng bản MỚI (`CircleCheck`, `TriangleAlert`, `LoaderCircle`, `ChartColumn`…), không
 *   dùng bí danh cũ (`CheckCircle2`, `AlertTriangle`, `Loader2`, `BarChart3`) — bí danh có thể bị
 *   lucide bỏ ở bản lớn sau.
 *
 * Bảng mapping đầy đủ kèm lý do chọn: DESIGN_SYSTEM.md mục "Icon".
 */
import type React from 'react';
import {
  Activity, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpDown, Award, BadgeCheck, Bell, BellOff, Bot,
  Building2, Calculator, Calendar, CalendarClock, Camera, ChartColumn, ChartLine, ChartPie, ChartSpline, Check,
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleAlert, CircleCheck, CircleDollarSign, CircleHelp,
  CircleMinus, CirclePlus, CircleX, ClipboardList, ClipboardPaste, Clock, CloudDownload, CloudUpload, Copy, Crown,
  Database, Download, EllipsisVertical, ExternalLink, Eye, EyeOff, FileSpreadsheet, FileText, Filter, GripVertical,
  Hash, History, House, Images, Inbox, Info, LayoutGrid, Layers, Lightbulb, Link, List, LoaderCircle, Lock, LogIn,
  LogOut, Mail, Maximize2, Medal, Menu, MessageCircle, Minimize2, Minus, Package, Pause, Pencil, Percent, Play, Plus,
  Printer, QrCode, Radio, RefreshCw, RotateCcw, Save, ScanLine, Search, SearchX, Send, Settings, Share2, Shield,
  ShieldAlert, ShieldCheck, SlidersHorizontal, Smartphone, Sparkles, Square, SquareCheck, Star, Store, Tag, Target,
  Ticket, Trash2, TrendingDown, TrendingUp, TriangleAlert, Trophy, Upload, User, UserCheck, UserCog, UserPlus, Users,
  Wallet, Wrench, X, Zap,
} from 'lucide-react';
import { LineIcon } from './brandIcons';

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string }>;

export const ICON_REGISTRY = {
  // ── Điều hướng chính (thanh trái, thanh dưới, tab) ─────────────────────────────────────────
  navAnalysis: ChartSpline,          // Phân tích YCX — đường xu hướng (khác cột của BI)
  navReportBi: ChartColumn,          // Report BI — biểu đồ cột
  navReports: FileText,              // Báo cáo
  navRewardCheck: BadgeCheck,        // Check thưởng — "đã kiểm" (tiền thưởng là `money`)
  navTools: Wrench,                  // Khác / Công cụ
  navStickerPrint: Printer,          // In Sticker
  navShiftSchedule: Calendar,        // Phân ca
  navLineBot: Bot,                   // Bot LINE
  navCoupon: Ticket,                 // Rút gọn Coupon
  navTax: Calculator,                // Tính thuế
  navPriceCompare: ArrowUpDown,      // So sánh giá ĐT
  navPermissions: Settings,          // Phân quyền
  navHelp: CircleHelp,               // Giới thiệu / Trợ giúp
  home: House,

  // ── Hành động ───────────────────────────────────────────────────────────────────────────
  search: Search,
  searchEmpty: SearchX,              // không tìm thấy kết quả
  filter: Filter,
  viewOptions: SlidersHorizontal,    // tuỳ chỉnh hiển thị/cột (khác `settings` cấu hình hệ thống)
  exportImage: Camera,               // XUẤT 1 ẢNH — chủ dự án chốt "CHUẨN" (2026-10-02)
  exportBatch: Images,               // xuất ảnh HÀNG LOẠT
  download: Download,                // tải file xuống (Excel, JSON…)
  upload: Upload,                    // nhập/tải file lên từ máy
  cloudUpload: CloudUpload,          // đồng bộ lên cloud
  cloudDownload: CloudDownload,      // kéo dữ liệu từ cloud về
  share: Share2,
  print: Printer,
  refresh: RefreshCw,                // tải lại dữ liệu
  reset: RotateCcw,                  // đặt lại về mặc định / hoàn tác
  add: Plus,
  addCircle: CirclePlus,             // tăng số lượng (cặp với `removeCircle`)
  removeCircle: CircleMinus,
  minus: Minus,
  edit: Pencil,
  delete: Trash2,
  copy: Copy,
  paste: ClipboardPaste,
  save: Save,
  close: X,
  back: ArrowLeft,
  next: ArrowRight,
  settings: Settings,
  more: EllipsisVertical,
  menu: Menu,
  externalLink: ExternalLink,
  link: Link,
  login: LogIn,
  logout: LogOut,
  expand: Maximize2,
  collapse: Minimize2,
  dragHandle: GripVertical,
  play: Play,
  pause: Pause,
  send: Send,
  scan: ScanLine,
  qrCode: QrCode,
  show: Eye,
  hide: EyeOff,
  lock: Lock,
  history: History,

  // ── Sắp xếp / mở rộng ───────────────────────────────────────────────────────────────────
  sort: ArrowUpDown,
  sortAsc: ArrowUp,
  sortDesc: ArrowDown,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,

  // ── Chế độ xem ──────────────────────────────────────────────────────────────────────────
  viewGrid: LayoutGrid,              // xem theo nhóm/bộ phận
  viewList: List,                    // xem danh sách
  layers: Layers,

  // ── Trạng thái ──────────────────────────────────────────────────────────────────────────
  success: CircleCheck,
  error: CircleX,
  warning: TriangleAlert,
  alert: CircleAlert,                // lưu ý trung tính (không nghiêm trọng như `warning`)
  info: Info,
  help: CircleHelp,
  loading: LoaderCircle,             // luôn đi kèm `spin`
  check: Check,
  checkboxOn: SquareCheck,
  checkboxOff: Square,
  live: Radio,                       // chế độ Realtime / trực tiếp
  clock: Clock,                      // thời gian / cùng kỳ
  schedule: CalendarClock,           // hẹn giờ, lịch tự động
  calendar: Calendar,
  notification: Bell,
  notificationOff: BellOff,
  empty: Inbox,                      // empty state chung
  security: Shield,
  securityOk: ShieldCheck,
  securityAlert: ShieldAlert,

  // ── Nghiệp vụ / dữ liệu ─────────────────────────────────────────────────────────────────
  analysis: ChartSpline,
  chartBar: ChartColumn,
  chartLine: ChartLine,
  chartPie: ChartPie,                // cơ cấu / tỷ trọng
  activity: Activity,
  report: FileText,
  checklist: ClipboardList,
  spreadsheet: FileSpreadsheet,
  database: Database,
  rewardCheck: BadgeCheck,
  money: CircleDollarSign,           // tiền / thưởng
  wallet: Wallet,
  percent: Percent,
  hash: Hash,
  tag: Tag,
  target: Target,
  trendUp: TrendingUp,
  trendDown: TrendingDown,
  trophy: Trophy,
  medal: Medal,
  award: Award,
  crown: Crown,
  star: Star,
  sparkles: Sparkles,                // AI / gợi ý tự động
  idea: Lightbulb,
  quick: Zap,
  product: Package,
  store: Store,                      // siêu thị
  department: Building2,             // bộ phận / kho
  phone: Smartphone,
  user: User,
  users: Users,
  userCheck: UserCheck,
  userAdd: UserPlus,
  userSettings: UserCog,
  message: MessageCircle,
  mail: Mail,

  // ── Thương hiệu (SVG tự vẽ duy nhất được giữ — lucide không có logo thương hiệu) ──────────
  lineBrand: LineIcon,
} as const satisfies Record<string, IconComponent>;

export type IconName = keyof typeof ICON_REGISTRY;

/** Icon thương hiệu dùng `fill`, không có nét — AppIcon không truyền strokeWidth cho chúng. */
export const FILLED_BRAND_ICONS: ReadonlySet<IconName> = new Set<IconName>(['lineBrand']);
