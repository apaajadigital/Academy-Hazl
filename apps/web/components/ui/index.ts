// Hazl Academy UI kit — presentational, light-only, token-driven components.
// Built with CVA + cn() on top of the design tokens and legacy .btn/.card/.badge
// classes in app/globals.css. Consumed by redesign waves; no data fetching here.

export { Button, type ButtonProps } from "./Button";
export { Input, type InputProps } from "./Input";
export { PasswordInput, type PasswordInputProps } from "./PasswordInput";
export { Textarea, type TextareaProps } from "./Textarea";
export { Select, type SelectProps } from "./Select";
export { Badge, type BadgeProps } from "./Badge";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  type CardProps,
} from "./Card";
export { Modal, ModalTrigger, ModalClose, ModalContent, type ModalContentProps } from "./Modal";
export { Table, TableContainer, THead, TBody, TR, TH, TD } from "./Table";
export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  type TabsProps,
  type TabsTriggerProps,
  type TabsContentProps,
} from "./Tabs";
export { Pagination, type PaginationProps } from "./Pagination";
export { Skeleton } from "./Skeleton";
export { Avatar, type AvatarProps } from "./Avatar";
export { StatCard, type StatCardProps } from "./StatCard";

// Dashboard standardization primitives (Jul 2026)
export { EmptyState } from "./EmptyState";
export { PageHeader } from "./PageHeader";
export { FilterBar } from "./FilterBar";
export { QuickActionCard } from "./QuickActionCard";
export { TableActionButton } from "./TableActionButton";
export { ProgressBar } from "./ProgressBar";
export { DashboardLoading, DashboardError } from "./DashboardState";
