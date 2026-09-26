import { issueCertificate } from "../../services/certificate/certificateService.js";
import type { CertificateJob } from "../types.js";

/** Issue a course certificate (PDF generation is slow → queued). Leaf processor. */
export async function processCertificate(job: CertificateJob): Promise<void> {
  await issueCertificate(job.userId, job.courseId);
}
