import { getValidToken } from "@/lib/auth/token";

/**
 * Download a file from a PROTECTED API endpoint. A plain `<a href>` cannot send
 * the Authorization header, so those downloads 401'd (certificate PDF, LMS report
 * CSV). This fetches the file with the bearer token and triggers a browser
 * download from the resulting blob. Redirects to /masuk when no valid session.
 *
 * @returns true on success, false if the user must re-authenticate.
 * @throws Error on a non-OK response (caller can show a message).
 */
export async function downloadProtected(url: string, filename: string): Promise<boolean> {
  const token = await getValidToken();
  if (!token) {
    window.location.href = "/masuk";
    return false;
  }
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Gagal mengunduh berkas (${res.status}).`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
  return true;
}
