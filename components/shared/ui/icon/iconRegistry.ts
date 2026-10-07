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
  Activity, Apple, ArchiveRestore, ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUp, ArrowUpDown, Award,
  Backpack, BadgeCheck, Banknote, Barcode, Battery, BatteryCharging, Bell, BellOff, Bold, BookOpen, Bot, Briefcase,
  Bug, Building2, Cable, Calculator, Calendar, CalendarCheck, CalendarClock, CalendarRange, CalendarX, Camera,
  ChartColumn, ChartGantt, ChartLine, ChartPie, ChartSpline, Check, ChefHat, ChevronDown, ChevronLeft, ChevronRight,
  ChevronUp, ChevronsDownUp, ChevronsUpDown, CircleAlert, CircleCheck, CircleDollarSign, CircleHelp, CircleMinus,
  CirclePlus, CircleX, ClipboardList, ClipboardPaste, Clock, Cloud, CloudDownload, CloudUpload, Code, Coffee, Coins,
  Columns2, Compass, Contact, Copy, CornerDownLeft, Cpu, CreditCard, Crown, Database, Download, Droplets,
  EllipsisVertical, ExternalLink, Eye, EyeOff, Factory, Fan, FastForward, FileCheck, FileKey2, FilePlus, FileScan,
  FileSpreadsheet, FileText, Film, Filter, Flame, Flashlight, FlashlightOff, FolderOpen, GalleryHorizontalEnd,
  Gamepad2, Gift, Glasses, Globe, GripVertical, HardDrive, Hash, Headphones, History, House, Image, ImageDown,
  Images, Inbox, Info, Italic, Key, Keyboard, Laptop, Layers, LayoutDashboard, LayoutGrid, LayoutTemplate, Lightbulb,
  Link, List, LoaderCircle, Lock, LogIn, LogOut, Mail, MapPin, Maximize2, Medal, Megaphone, MemoryStick, Menu,
  MessageCircle, Mic, Minimize2, Minus, MousePointer2, MousePointerClick, Package, PackageX, Paintbrush, Palette,
  PanelRightClose, Pause, Pencil, Percent, Phone, Play, PlugZap, Plus, Printer, QrCode, Radio, Receipt, RefreshCw,
  Repeat, Rocket, RotateCcw, Router, Save, ScanLine, Search, SearchX, Send, Server, Settings, Share, Share2, Shield,
  ShieldAlert, ShieldCheck, ShoppingBag, Sigma, Signal, SlidersHorizontal, Smartphone, SmartphoneNfc, Smile,
  Sparkles, Speaker, Square, SquareCheck, SquarePlay, SquarePlus, Star, Store, SwitchCamera, Swords, Table2, Tablet,
  Tag, Target, Terminal, ThermometerSnowflake, Ticket, Tornado, Trash2, TrendingDown, TrendingUp, TriangleAlert,
  Trophy, Truck, Tv, Type, Underline, Upload, User, UserCheck, UserCog, UserMinus, UserPlus, UserX, Users, Wallet,
  Warehouse, Watch, Waves, Webcam, Wifi, Wind, Wrench, X, Zap,
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
  takePhoto: Camera,                 // CHỤP ảnh bằng máy ảnh thiết bị (quét giấy tờ/mã) — khác exportImage dù cùng hình
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
  iosShare: Share,                   // CHỈ để mô tả nút Chia sẻ của Safari iOS (hướng dẫn cài app)
  iosAddToHome: SquarePlus,          // CHỈ để mô tả "Thêm vào MH chính" của Safari iOS

  // ── Sắp xếp / mở rộng ───────────────────────────────────────────────────────────────────
  sort: ArrowUpDown,
  swap: ArrowLeftRight,               // so sánh / đổi chiều
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
  dateRange: CalendarRange,          // khoảng ngày / luỹ kế
  notification: Bell,
  notificationOff: BellOff,
  announcement: Megaphone,           // thông báo hệ thống (admin soạn)
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
  quick: Zap,                        // tự động / chạy nhanh (Auto Sync realtime)
  gift: Gift,                        // thưởng nóng / quà
  font: Type,                        // chọn phông chữ
  product: Package,
  store: Store,                      // siêu thị
  department: Building2,             // bộ phận / kho
  phone: Smartphone,
  call: Phone,                       // gọi điện cho khách
  user: User,
  users: Users,
  userCheck: UserCheck,
  userAdd: UserPlus,
  userSettings: UserCog,
  message: MessageCircle,
  mail: Mail,

  // ── Mũi tên (hướng thuần, không mang nghĩa sắp xếp/xu hướng) ───────────────────────────────
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  expandAll: ChevronsUpDown,         // mở rộng tất cả nhóm
  collapseAll: ChevronsDownUp,       // thu gọn tất cả nhóm
  fastForward: FastForward,

  // ── Bổ sung chức năng (2026-10-06, lớp chuyển tiếp từ components/common/Icon.tsx) ─────────
  dashboard: LayoutDashboard,
  template: LayoutTemplate,
  table: Table2,
  columns: Columns2,
  gantt: ChartGantt,
  total: Sigma,                      // tổng cộng
  compete: Swords,                   // thi đua / đối đầu
  restore: ArchiveRestore,
  calendarCheck: CalendarCheck,
  calendarOff: CalendarX,
  fileCheck: FileCheck,
  fileKey: FileKey2,
  fileScan: FileScan,
  receipt: Receipt,
  cash: Banknote,
  card: CreditCard,                  // trả góp / thẻ
  shopping: ShoppingBag,
  productOff: PackageX,
  delivery: Truck,
  warehouse: Warehouse,
  location: MapPin,
  contact: Contact,
  userRemove: UserMinus,
  userReject: UserX,
  calculator: Calculator,
  code: Code,
  bug: Bug,
  server: Server,
  rocket: Rocket,
  compass: Compass,
  pointer: MousePointer2,
  palette: Palette,
  paintbrush: Paintbrush,
  gallery: GalleryHorizontalEnd,
  video: SquarePlay,
  film: Film,
  flame: Flame,
  briefcase: Briefcase,
  web: Globe,                        // trang web / tra cứu online
  apiKey: Key,                       // khoá API
  cloud: Cloud,                      // lưu trên cloud
  localStorage: HardDrive,           // lưu trên máy
  panelClose: PanelRightClose,       // đóng thanh bên
  click: MousePointerClick,          // hướng dẫn thao tác bấm

  // ── Bổ sung Giai đoạn 5 (In Sticker, Phân Ca, Bot LINE) ───────────────────────────────────
  fileAdd: FilePlus,                 // thêm tệp / tạo mới từ tệp
  switchCamera: SwitchCamera,        // đổi camera trước/sau khi quét
  image: Image,                      // ảnh (chọn/đính kèm ảnh)
  imageDownload: ImageDown,          // tải ảnh về
  barcode: Barcode,
  textBold: Bold,
  textItalic: Italic,
  textUnderline: Underline,
  guide: BookOpen,                   // hướng dẫn sử dụng
  coins: Coins,                      // điểm / xu / mệnh giá
  enter: CornerDownLeft,             // xác nhận bằng phím Enter
  flashOn: Flashlight,               // bật đèn flash khi quét
  flashOff: FlashlightOff,
  folder: FolderOpen,
  repeat: Repeat,                    // lặp lại theo lịch
  tools: Wrench,
  bot: Bot,
  coupon: Ticket,                    // mã coupon / PMH
  command: Terminal,                 // cú pháp lệnh bot
  // Mô phỏng thanh trạng thái/khung chat iPhone (IPhoneChatPreview) — chỉ để vẽ khung xem trước
  wifi: Wifi,
  batteryLevel: Battery,
  mic: Mic,
  emoji: Smile,

  // ── Ngành hàng / đồ vật (icon minh hoạ nhóm sản phẩm ở Phân tích, Report BI) ────────────────
  laptop: Laptop,
  tablet: Tablet,
  tv: Tv,
  watch: Watch,
  headphones: Headphones,
  speaker: Speaker,
  keyboard: Keyboard,
  webcam: Webcam,
  cpu: Cpu,
  memory: MemoryStick,
  router: Router,
  simCard: Signal,
  phoneNfc: SmartphoneNfc,
  accessory: Cable,
  battery: BatteryCharging,
  appliance: PlugZap,                // gia dụng điện nhỏ (máy xay…)
  kitchen: ChefHat,
  cooling: ThermometerSnowflake,     // điện lạnh
  fan: Fan,
  wind: Wind,
  waves: Waves,
  tornado: Tornado,
  water: Droplets,                   // lọc nước
  coffee: Coffee,
  apple: Apple,
  glasses: Glasses,
  backpack: Backpack,
  gamepad: Gamepad2,
  factory: Factory,

  // ── Thương hiệu (SVG tự vẽ duy nhất được giữ — lucide không có logo thương hiệu) ──────────
  lineBrand: LineIcon,
} as const satisfies Record<string, IconComponent>;

export type IconName = keyof typeof ICON_REGISTRY;

/** Icon thương hiệu dùng `fill`, không có nét — AppIcon không truyền strokeWidth cho chúng. */
export const FILLED_BRAND_ICONS: ReadonlySet<IconName> = new Set<IconName>(['lineBrand']);
