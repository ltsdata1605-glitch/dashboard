/**
 * YCX Dashboard — Shared UI Component Library
 * Barrel export for all UI primitives
 */

// Core utilities
export { cn, onActivateKey } from './utils';

// Icon dùng chung (chuẩn hoá icon 2026-10-02) — gọi theo TÊN CHỨC NĂNG, size theo token
export { AppIcon, ICON_REGISTRY, ICON_SIZES, ICON_STROKE_WIDTH, ICON_TEXT_GAP_CLASS, LineIcon } from './icon';
export type { AppIconProps, IconName, IconSize } from './icon';

// Toast dùng chung (KE_HOACH_GIAO_DIEN_APPLE.md GĐ1) — nơi DUY NHẤT gọi react-hot-toast
export { toast, AppToaster, TOAST_DURATION } from './toast';
export type { ToastKind, ToastAction, ToastOptions, ActionToastOptions } from './toast';

// Thanh tiến trình mảnh cho việc tính lại ngầm (GĐ2 2026-10-11) — thay lớp chờ phủ kín màn khi không cần chặn thao tác
export { BusyBar } from './BusyBar';
export type { BusyBarProps } from './BusyBar';

// Phông Google nạp theo nhu cầu (GĐ2 2026-10-11) — index.html không còn thẻ CSS phông chặn hiển thị
export { napPhongGoogle, laPhongGoogle, tenHoPhong, urlPhongGoogle, PHONG_GOOGLE } from './googleFonts';

// LỚP APPLE (GĐ3 2026-10-11 — KE_HOACH_GIAO_DIEN_APPLE.md mục 3): công tắc, dải thông báo, danh sách nhóm, menu "⋯",
// khai báo hành động của trang cho khung app, hiệu ứng vào/ra không cần motion
export { Switch } from './Switch';
export type { SwitchProps } from './Switch';
export { Banner } from './Banner';
export type { BannerProps, BannerTone } from './Banner';
export { ListGroup, ListRow } from './ListGroup';
export type { ListGroupProps, ListRowProps, ListIconTone } from './ListGroup';
export { ActionMenu } from './ActionMenu';
export type { ActionMenuItem, ActionMenuProps } from './ActionMenu';
export { CapsuleBar } from './CapsuleBar';
export type { CapsuleBarProps, CapsuleItem } from './CapsuleBar';
export { TopBarActions, TopBarGroup, TopBarButton, TopBarLink, TopBarDivider } from './TopBarActions';
export type { TopBarActionsProps, TopBarGroupProps, TopBarButtonProps, TopBarLinkProps } from './TopBarActions';
export { PageActionsProvider, usePageActions, useCurrentPageActions } from './PageActions';
export type { PageActionsConfig, PagePrimaryAction } from './PageActions';
export { usePresence } from './usePresence';
export { useModalBehavior } from './useModalBehavior';

// Existing components
export { Overlay } from './Overlay';
export type { OverlayProps, OverlayKind } from './Overlay';
export { Select } from './Select';
export type { SelectProps } from './Select';
export { Input } from './Input';
export type { InputProps } from './Input';
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';
export { ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogProps, ConfirmVariant, ConfirmExtraAction } from './ConfirmDialog';

// New Design System components
export { Badge } from './Badge';
export type { BadgeProps, BadgeVariant, BadgeSize } from './Badge';

export { Card, CardHeader, CardBody, CardFooter } from './Card';
export type { CardProps, CardHeaderProps } from './Card';

export { Skeleton, SkeletonCard, SkeletonTable, SkeletonChart } from './Skeleton';
export type { SkeletonProps } from './Skeleton';

export { Tabs } from './Tabs';
export type { TabsProps, TabItem } from './Tabs';

export { Tooltip } from './Tooltip';
export type { TooltipProps } from './Tooltip';

export { DataTable } from './DataTable';
export type { DataTableProps, DataTableColumn, SortDirection } from './DataTable';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { StatCard } from './StatCard';
export type { StatCardProps, TrendDirection } from './StatCard';

export { ProgressBar } from './ProgressBar';
export type { ProgressBarProps } from './ProgressBar';

export { Dropdown, DropdownButton } from './Dropdown';
export type { DropdownProps, DropdownItem, DropdownButtonProps } from './Dropdown';

export { MultiSelectDropdown } from './MultiSelectDropdown';
export type { MultiSelectDropdownProps, MultiSelectDropdownOption } from './MultiSelectDropdown';
// GĐ8 (2026-10-13): gom từ components/common — chọn nhiều trong DANH SÁCH CHUỖI (lọc kho, ngành hàng…: có ô tìm, "Tất cả",
// đếm). MultiSelectDropdown ở trên là bản tuỳ chọn có key/nhóm (Report BI). Chọn một có ô tìm: SearchableSelect.
export { StringMultiSelect } from './StringMultiSelect';
export type { StringMultiSelectProps } from './StringMultiSelect';
export { default as SearchableSelect } from './SearchableSelect';
export { default as ErrorBoundary } from './ErrorBoundary';

// Section-level patterns (Design upgrade — DESIGN_SYSTEM_MODERN.md)
export { SectionCard } from './SectionCard';
export { SectionHeader } from './SectionHeader';
export { KpiCard } from './KpiCard';
export type { KpiCardProps } from './KpiCard';

export { FeatureLandingLayout } from './FeatureLandingLayout';
export type { FeatureLandingLayoutProps } from './FeatureLandingLayout';

