import { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg" | "xl";
}

const SIZES = {
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
} as const;

/** Focus-trapped dialog. Escape closes; focus returns to the opener. */
export function Modal({ open, title, onClose, children, footer, size = "md" }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    dialogRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-brown-900/30 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`w-full ${SIZES[size]} max-h-[90vh] overflow-y-auto rounded-xl border border-brand-border bg-white p-6 shadow-warm`}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="mb-3 font-display text-xl text-brand-brown-900">{title}</h2>
        <div className="text-sm text-brand-brown-700">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
