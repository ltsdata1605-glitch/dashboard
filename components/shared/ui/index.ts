/**
 * YCX Dashboard — Shared UI Component Library
 * Barrel export for all UI primitives
 */

// Core utilities
export { cn, onActivateKey } from './utils';

// Existing components
export { Select } from './Select';
export type { SelectProps } from './Select';
export { Input } from './Input';
export type { InputProps } from './Input';
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';
export { ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogProps, ConfirmVariant } from './ConfirmDialog';

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
