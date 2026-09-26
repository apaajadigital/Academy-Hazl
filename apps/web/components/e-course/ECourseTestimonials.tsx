import Link from "next/link";
import { ArrowRight, MessagesSquare } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Pre-launch member-stories placeholder (TASK-052 / BL-24). Real, moderated,
 * consenting member stories replace this (TASK-095) — never fabricated names.
 */
export function ECourseTestimonials() {
  return (
    <Section>
      <EmptyState
        icon={MessagesSquare}
        title="Cerita member segera hadir"
        description="Mulai belajar hari ini — kisah suksesmu bisa jadi yang pertama tampil di sini."
        action={
          <Link href="/daftar" className="btn btn-primary">
            Mulai Belajar
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        }
      />
    </Section>
  );
}
