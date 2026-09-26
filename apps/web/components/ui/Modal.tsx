"use client";

import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Dialog root — controlled via `open`/`onOpenChange` or uncontrolled via `ModalTrigger`. */
export const Modal = Dialog.Root;
/** Element that opens the modal (use `asChild` to wrap your own control). */
export const ModalTrigger = Dialog.Trigger;
/** Any element that closes the modal (use `asChild`). */
export const ModalClose = Dialog.Close;

export type ModalContentProps = Omit<ComponentPropsWithoutRef<typeof Dialog.Content>, "title"> & {
  /** Header title (rendered as the accessible Dialog title). */
  title?: ReactNode;
  /** Supporting line under the title (accessible description). */
  description?: ReactNode;
  /** Hide the default top-right close button. */
  hideClose?: boolean;
  /** Footer content, typically action buttons. */
  footer?: ReactNode;
};

/** Overlay + centered panel with header (title/description/close), body, and footer. */
export const ModalContent = forwardRef<HTMLDivElement, ModalContentProps>(function ModalContent(
  { title, description, hideClose = false, footer, className, children, ...props },
  ref,
) {
  const showHeader = Boolean(title) || Boolean(description) || !hideClose;
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" />
      <Dialog.Content
        ref={ref}
        // Silence Radix's missing-description warning only when we have none.
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "fixed left-1/2 top-1/2 z-[100] flex max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-solid border-border-default bg-surface-card shadow-[var(--shadow-e4)] focus:outline-none",
          className,
        )}
        {...props}
      >
        {/* Radix requires a Title for a11y; render a hidden one when none is shown. */}
        {!title && <Dialog.Title className="sr-only">Dialog</Dialog.Title>}

        {showHeader && (
          <div className="flex items-start justify-between gap-4 border-b border-solid border-border-default px-6 py-4">
            <div className="min-w-0 space-y-1">
              {title && (
                <Dialog.Title className="font-display text-lg font-bold text-text-primary">
                  {title}
                </Dialog.Title>
              )}
              {description && (
                <Dialog.Description className="text-sm text-text-secondary">
                  {description}
                </Dialog.Description>
              )}
            </div>
            {!hideClose && (
              <Dialog.Close
                aria-label="Tutup"
                className="-mr-1.5 shrink-0 rounded-full p-1.5 text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-primary"
              >
                <X size={20} />
              </Dialog.Close>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-solid border-border-default bg-surface-sunken px-6 py-4">
            {footer}
          </div>
        )}
      </Dialog.Content>
    </Dialog.Portal>
  );
});
