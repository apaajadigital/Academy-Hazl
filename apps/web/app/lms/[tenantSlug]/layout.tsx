import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import PortalSidebar from "@/components/lms/PortalSidebar";
import { API_BASE } from "@/lib/api/base";

type TenantBranding = {
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  isActive: boolean;
  trialEndsAt: string | null;
  planType: string;
};

async function fetchBranding(tenantSlug: string): Promise<TenantBranding | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/lms/public/${tenantSlug}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.data ?? null;
  } catch {
    return null;
  }
}

export default async function LmsPortalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await fetchBranding(tenantSlug);
  const primary = tenant?.primaryColor ?? "#0077A8";

  const trialExpired =
    tenant?.planType === "trial" &&
    tenant.trialEndsAt != null &&
    new Date(tenant.trialEndsAt) < new Date();

  return (
    <>
      <style>{`
        .lms-primary { color: ${primary}; }
        .lms-primary-bg { background-color: ${primary}; }
        .lms-primary-border { border-color: ${primary}; }
        .lms-primary-ring:focus { outline: 2px solid ${primary}; outline-offset: 2px; }
        .lms-progress-bar { background-color: ${primary}; }
      `}</style>

      {trialExpired && (
        <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2.5 text-center text-sm font-medium text-white">
          <AlertTriangle size={15} className="flex-shrink-0" aria-hidden="true" />
          <span>Masa trial <strong>{tenant?.name}</strong> telah berakhir. Hubungi admin untuk melanjutkan akses.</span>
        </div>
      )}

      {tenant && !tenant.isActive && !trialExpired && (
        <div className="flex items-center justify-center gap-2 bg-red-600 px-4 py-2.5 text-center text-sm font-medium text-white">
          <AlertTriangle size={15} className="flex-shrink-0" aria-hidden="true" />
          <span>Workspace <strong>{tenant.name}</strong> sedang tidak aktif. Hubungi admin Jago Akademi.</span>
        </div>
      )}

      {/* The portal rail lives here, not in page.tsx, so every sub-route under
          /lms/[tenantSlug] gets the same navigation and it survives client-side
          navigation instead of remounting per page. Branding comes from the
          server fetch above — no client waterfall before the logo paints. */}
      <div className="flex min-h-screen bg-surface-page">
        <PortalSidebar
          slug={tenantSlug}
          name={tenant?.name ?? null}
          logoUrl={tenant?.logoUrl ?? null}
          primaryColor={primary}
        />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
}
