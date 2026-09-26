import Link from "next/link";
import { ChevronRight } from "lucide-react";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-text-muted">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight size={14} className="flex-none text-[var(--border-strong)]" aria-hidden="true" />
            )}
            {item.href && !isLast ? (
              <Link href={item.href} className="transition-colors hover:text-accent">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "font-semibold text-text-secondary" : ""}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
