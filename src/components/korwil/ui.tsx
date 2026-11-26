import { useEffect, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { expiryBadge, expiryStatus, type ExpiryStatus } from "@/src/lib/korwil";

export const inputClass =
  "w-full bg-white border border-outline-variant rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-slate-50";

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4">
      <div className={cn("w-full bg-white rounded-xl border border-outline-variant/30 shadow-xl flex flex-col max-h-[90vh]", wide ? "max-w-3xl" : "max-w-xl")}>
        <div className="flex items-center justify-between p-6 pb-4">
          <h3 className="font-title-lg text-on-surface">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100" aria-label="Tutup">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 overflow-y-auto">{children}</div>
        {footer && <div className="p-6 pt-4 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  message,
  danger,
  busy,
  onCancel,
  onConfirm,
}: {
  message: string;
  danger?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[80] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-outline-variant/30 shadow-xl p-6">
        <h3 className="font-title-lg text-on-surface mb-2">Konfirmasi</h3>
        <p className="text-sm text-on-surface-variant mb-6">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-outline-variant hover:bg-slate-50" disabled={busy}>
            Batal
          </button>
          <button
            onClick={onConfirm}
            className={cn("px-4 py-2 rounded-lg text-white", danger ? "bg-rose-600 hover:bg-rose-700" : "bg-primary hover:brightness-110")}
            disabled={busy}
          >
            {busy ? "Memproses..." : "Ya, Lanjutkan"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, hint, required, className, children }: { label: string; hint?: string; required?: boolean; className?: string; children: ReactNode }) {
  return (
    <label className={cn("block", className)}>
      <span className="block text-sm font-semibold mb-1">
        {label}
        {required && <span className="text-error"> *</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-on-surface-variant mt-1">{hint}</span>}
    </label>
  );
}

export const TextInput = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={cn(inputClass, props.className)} />
);

export const TextArea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea rows={2} {...props} className={cn(inputClass, "resize-y", props.className)} />
);

export const Select = (props: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className={cn(inputClass, "appearance-none", props.className)} />
);

export function ExpiryBadge({ date, status }: { date?: string | null; status?: ExpiryStatus }) {
  const badge = expiryBadge[status ?? expiryStatus(date ?? null)];
  return (
    <span className={cn("inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap", badge.className)}>
      {badge.label}
    </span>
  );
}

// Label / value pair for detail pages.
export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-4 py-2.5 border-b border-outline-variant/10 last:border-0">
      <dt className="text-sm text-on-surface-variant">{label}</dt>
      <dd className="text-sm text-on-surface font-medium whitespace-pre-line break-words">{children || "-"}</dd>
    </div>
  );
}

export function SectionCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-outline-variant/30 shadow-sm">
      <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between gap-4">
        <h3 className="font-title-lg text-on-surface text-base font-semibold">{title}</h3>
        {action}
      </div>
      <div className="px-6 py-4">{children}</div>
    </section>
  );
}

export function usePaged<T>(items: T[], pageSize: number, resetKey: unknown) {
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [resetKey]);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return { page: safePage, setPage, totalPages, start, pageItems: items.slice(start, start + pageSize), total: items.length };
}

export function Pagination({ page, totalPages, start, count, total, unit, setPage }: {
  page: number;
  totalPages: number;
  start: number;
  count: number;
  total: number;
  unit: string;
  setPage: (page: number) => void;
}) {
  return (
    <div className="p-6 border-t border-outline-variant/10 flex justify-between items-center bg-slate-50/50">
      <p className="text-xs text-on-surface-variant">
        Menampilkan {total ? start + 1 : 0}-{start + count} dari {total} {unit}
      </p>
      <div className="flex items-center gap-2">
        <button className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Sebelumnya">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-xs px-2">Hal. {page} / {totalPages}</span>
        <button className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors" disabled={page >= totalPages} onClick={() => setPage(page + 1)} aria-label="Berikutnya">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
