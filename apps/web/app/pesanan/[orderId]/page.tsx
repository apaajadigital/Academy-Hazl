import { redirect } from "next/navigation";

/**
 * Legacy standalone order-detail route (BL-84).
 *
 * The real page now lives at /dashboard/pesanan/[orderId] so it renders inside
 * the dashboard shell (sidebar + header). This route is kept as a redirect
 * because old links are still in the wild — payment success/pending pages and
 * transactional emails point here.
 */
export default async function OrderDetailRedirectPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  redirect(`/dashboard/pesanan/${orderId}`);
}
