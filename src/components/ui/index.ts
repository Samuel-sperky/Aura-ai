// The shared UI kit. Import from here, not from the individual files:
//
//   import { Button, Panel, PanelBody, Table } from "@/components/ui";
//
// Nothing in a page may re-implement one of these. If a variant is missing, the
// component gains a prop — a page never grows its own button or panel styling.

export { cx } from "./cx";

export { Button } from "./Button";
export type { ButtonProps, ButtonSize, ButtonVariant } from "./Button";

export { Field, FieldRow } from "./Field";
export type { FieldProps, FieldRowProps } from "./Field";

export { Input, Textarea } from "./Input";
export type { InputProps, TextareaProps } from "./Input";

export { Select } from "./Select";
export type { SelectOption, SelectProps } from "./Select";

export { Panel, PanelHead, PanelBody, PanelFoot } from "./Panel";
export type { PanelProps, PanelHeadProps, PanelBodyProps } from "./Panel";

export { StatCard } from "./StatCard";
export type { StatCardProps } from "./StatCard";

export { DeltaPill, deltaDirection } from "./DeltaPill";
export type { DeltaDirection, DeltaPillProps } from "./DeltaPill";

export { Badge } from "./Badge";
export type { BadgeProps, Tone } from "./Badge";

export { Pill } from "./Pill";
export type { PillProps } from "./Pill";

export { Chip } from "./Chip";
export type { ChipProps } from "./Chip";

export { Segmented } from "./Segmented";
export type { SegmentedOption, SegmentedProps } from "./Segmented";

export { Tabs } from "./Tabs";
export type { TabItem, TabsProps } from "./Tabs";

export { Table } from "./Table";
export type { SortDir, TableColumn, TableProps, TableSort } from "./Table";

export { Modal } from "./Modal";
export type { ModalProps } from "./Modal";

export { Drawer } from "./Drawer";
export type { DrawerProps } from "./Drawer";

export { ToastProvider, useToast } from "./Toast";
export type { ToastApi, ToastOptions, ToastTone } from "./Toast";

export { Skeleton, SkeletonText } from "./Skeleton";
export type { SkeletonProps, SkeletonTextProps } from "./Skeleton";

export { Spinner } from "./Spinner";
export type { SpinnerProps } from "./Spinner";

export { ProgressBar, healthTone } from "./ProgressBar";
export type { ProgressBarProps, ProgressTone } from "./ProgressBar";

export { BarList } from "./BarList";
export type { BarListItem, BarListProps } from "./BarList";

export { Avatar, initialsOf } from "./Avatar";
export type { AvatarProps } from "./Avatar";

export { Tooltip, tooltipProps } from "./Tooltip";
export type { TooltipProps } from "./Tooltip";

export {
  FilterChip,
  FilterToolbar,
  Toolbar,
  ToolbarSearch,
  ToolbarSpacer,
} from "./Toolbar";
export type {
  FilterChipDescriptor,
  FilterChipProps,
  FilterToolbarProps,
  ToolbarProps,
  ToolbarSearchProps,
} from "./Toolbar";

export { PageHeader } from "./PageHeader";
export type { PageHeaderProps } from "./PageHeader";

export { Pagination } from "./Pagination";
export type { PaginationProps } from "./Pagination";

export { ConfirmDialog } from "./ConfirmDialog";
export type { ConfirmDialogProps } from "./ConfirmDialog";

export { useFocusTrap } from "./useFocusTrap";
export type { FocusTrapOptions } from "./useFocusTrap";
