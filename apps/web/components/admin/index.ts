// Admin dashboard layout primitives (Aug 2026).
//
// Extracted from app/admin/dashboard/page.tsx, where the same panel shape had
// been hand-written three times with three different paddings, and three
// different column languages competed on one screen. These carry the layout
// contract so a new admin page cannot reintroduce arbitrary spacing.
//
// Presentational only — no data fetching, no auth, no business rules.

export { AdminPageContainer } from "./AdminPageContainer";
export { AdminMetricGrid, AdminMetricGridSkeleton } from "./AdminMetricGrid";
export { AdminPanel } from "./AdminPanel";
export { AdminPanelError, AdminPanelSkeleton } from "./AdminPanelState";

export { ImageUploadField } from "./ImageUploadField";
