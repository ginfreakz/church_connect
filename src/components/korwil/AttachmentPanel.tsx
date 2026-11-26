import { useEffect, useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import { Download, Eye, File as FileIcon, FileText, Image as ImageIcon, Paperclip, Pencil, Trash2, Upload, X } from "lucide-react";
import { cn } from "@/src/lib/utils";
import {
  apiJson,
  formatFileSize,
  jsonInit,
  lampiranSuggestions,
  type Lampiran,
  type OwnerType,
} from "@/src/lib/korwil";
import { ConfirmDialog, Field, Modal, SectionCard, TextInput } from "./ui";

const MAX_MB = 25;

const isImage = (item: Lampiran) => item.mimeType.startsWith("image/");
const isPdf = (item: Lampiran) => item.mimeType === "application/pdf";

function FileThumb({ item }: { item: Lampiran }) {
  if (isImage(item)) {
    return <img src={item.url} alt={item.label} className="w-full h-full object-cover" loading="lazy" />;
  }
  const Icon = isPdf(item) ? FileText : FileIcon;
  return (
    <div className={cn("w-full h-full flex flex-col items-center justify-center gap-1", isPdf(item) ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-500")}>
      <Icon className="w-8 h-8" />
      <span className="text-[10px] font-bold uppercase tracking-widest">
        {item.originalName.split(".").pop()?.slice(0, 5) || "file"}
      </span>
    </div>
  );
}

export function AttachmentPanel({
  ownerType,
  ownerId,
  oldestFirst,
  hint,
  onChange,
}: {
  ownerType: OwnerType;
  ownerId: string;
  /** Show files in upload order with page numbers (used when files are pages of one document). */
  oldestFirst?: boolean;
  hint?: ReactNode;
  onChange?: (items: Lampiran[]) => void;
}) {
  const [items, setItems] = useState<Lampiran[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<File[]>([]);
  const [label, setLabel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<Lampiran | null>(null);
  const [renaming, setRenaming] = useState<Lampiran | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<Lampiran | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const datalistId = useId();

  const load = async () => {
    try {
      const list = await apiJson<Lampiran[]>(`/api/lampiran?ownerType=${ownerType}&ownerId=${encodeURIComponent(ownerId)}`);
      const ordered = oldestFirst
        ? [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id)
        : list;
      setItems(ordered);
      onChange?.(ordered);
    } catch (error) {
      window.alert((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerType, ownerId]);

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    const tooBig = files.filter((f) => f.size > MAX_MB * 1024 * 1024);
    if (tooBig.length) {
      window.alert(`File berikut melebihi ${MAX_MB} MB dan tidak ditambahkan:\n${tooBig.map((f) => f.name).join("\n")}`);
    }
    setPending((prev) => [...prev, ...files.filter((f) => f.size <= MAX_MB * 1024 * 1024)]);
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    addFiles(event.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (pending.length === 0) return;
    setUploading(true);
    try {
      // Text fields must come before files: the server picks the folder from them.
      const form = new FormData();
      form.append("ownerType", ownerType);
      form.append("ownerId", ownerId);
      form.append("label", label);
      pending.forEach((file) => form.append("files", file));
      await apiJson<Lampiran[]>("/api/lampiran", { method: "POST", body: form });
      setPending([]);
      setLabel("");
      await load();
    } catch (error) {
      window.alert((error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleRename = async () => {
    if (!renaming || !renameValue.trim()) return;
    setBusy(true);
    try {
      await apiJson(`/api/lampiran/${renaming.id}`, jsonInit("PATCH", { label: renameValue }));
      setRenaming(null);
      await load();
    } catch (error) {
      window.alert((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiJson(`/api/lampiran/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      await load();
    } catch (error) {
      window.alert((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      title={`Lampiran (${items.length})`}
      action={
        <button
          onClick={() => fileInput.current?.click()}
          className="bg-primary text-on-primary px-4 py-2 rounded-lg flex items-center gap-2 font-label-lg text-sm shadow-sm hover:brightness-110 active:scale-95 transition-all"
        >
          <Upload className="w-4 h-4" />
          Unggah File
        </button>
      }
    >
      <input
        ref={fileInput}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <datalist id={datalistId}>
        {lampiranSuggestions[ownerType].map((s) => <option key={s} value={s} />)}
      </datalist>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "rounded-xl border-2 border-dashed p-4 transition-colors mb-6",
          dragOver ? "border-primary bg-primary/5" : "border-outline-variant/50 bg-slate-50/50",
        )}
      >
        {pending.length === 0 ? (
          <button onClick={() => fileInput.current?.click()} className="w-full py-4 flex flex-col items-center gap-1 text-on-surface-variant">
            <Paperclip className="w-6 h-6" />
            <span className="text-sm font-semibold">Klik atau seret file ke sini</span>
            <span className="text-xs">PDF, gambar, Word, Excel, dll. Maksimal {MAX_MB} MB per file.</span>
          </button>
        ) : (
          <div className="space-y-4">
            <ul className="space-y-1.5">
              {pending.map((file, index) => (
                <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 bg-white rounded-lg border border-outline-variant/30 px-3 py-2">
                  <span className="text-sm truncate">{file.name}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-on-surface-variant">{formatFileSize(file.size)}</span>
                    <button onClick={() => setPending((prev) => prev.filter((_, i) => i !== index))} className="p-1 rounded hover:bg-slate-100" aria-label="Batalkan file">
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <Field label="Keterangan" hint="Pilih dari daftar atau ketik sendiri. Kosongkan untuk memakai nama file.">
              <TextInput list={datalistId} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="mis. SK Penetapan Gereja Lokal" />
            </Field>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setPending([]); setLabel(""); }} className="px-4 py-2 rounded-lg border border-outline-variant hover:bg-white text-sm" disabled={uploading}>
                Batal
              </button>
              <button onClick={() => fileInput.current?.click()} className="px-4 py-2 rounded-lg border border-outline-variant hover:bg-white text-sm" disabled={uploading}>
                Tambah File Lain
              </button>
              <button onClick={handleUpload} className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:brightness-110 text-sm font-semibold" disabled={uploading}>
                {uploading ? "Mengunggah..." : `Unggah ${pending.length} File`}
              </button>
            </div>
          </div>
        )}
      </div>

      {hint && <div className="mb-4">{hint}</div>}

      {loading ? (
        <p className="text-sm text-on-surface-variant py-4">Memuat lampiran...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-on-surface-variant py-4 text-center">Belum ada lampiran.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item, index) => (
            <div key={item.id} className="rounded-xl border border-outline-variant/30 overflow-hidden flex flex-col bg-white hover:shadow-md transition-shadow">
              <button onClick={() => setPreview(item)} className="h-36 bg-slate-100 block relative" title="Lihat lampiran">
                <FileThumb item={item} />
                {oldestFirst && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px] font-semibold">
                    {index + 1}
                  </span>
                )}
              </button>
              <div className="p-3 flex-1 flex flex-col gap-0.5">
                <p className="text-sm font-semibold text-on-surface truncate" title={item.label}>{item.label}</p>
                <p className="text-xs text-on-surface-variant truncate" title={item.originalName}>{item.originalName}</p>
                <p className="text-[11px] text-on-surface-variant">
                  {formatFileSize(item.size)} • {new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(item.createdAt))}
                </p>
              </div>
              <div className="flex border-t border-outline-variant/20 divide-x divide-outline-variant/20">
                <button onClick={() => setPreview(item)} className="flex-1 py-2 flex items-center justify-center text-outline hover:text-primary hover:bg-slate-50" title="Lihat">
                  <Eye className="w-4 h-4" />
                </button>
                <a href={`${item.url}?download=1`} className="flex-1 py-2 flex items-center justify-center text-outline hover:text-primary hover:bg-slate-50" title="Unduh">
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => { setRenaming(item); setRenameValue(item.label); }}
                  className="flex-1 py-2 flex items-center justify-center text-outline hover:text-primary hover:bg-slate-50"
                  title="Ubah keterangan"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleting(item)} className="flex-1 py-2 flex items-center justify-center text-outline hover:text-error hover:bg-slate-50" title="Hapus">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 bg-black/70 z-[90] flex flex-col p-4" onClick={() => setPreview(null)}>
          <div className="flex items-center justify-between text-white mb-3 gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="min-w-0">
              <p className="font-semibold truncate">{preview.label}</p>
              <p className="text-xs text-white/70 truncate">{preview.originalName}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href={`${preview.url}?download=1`} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm flex items-center gap-2">
                <Download className="w-4 h-4" /> Unduh
              </a>
              <button onClick={() => setPreview(null)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20" aria-label="Tutup">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {isImage(preview) ? (
              <img src={preview.url} alt={preview.label} className="max-w-full max-h-full object-contain rounded-lg bg-white" />
            ) : isPdf(preview) ? (
              <iframe src={preview.url} title={preview.label} className="w-full h-full rounded-lg bg-white" />
            ) : (
              <div className="bg-white rounded-xl p-8 text-center max-w-sm">
                <ImageIcon className="w-10 h-10 mx-auto text-outline mb-3" />
                <p className="text-sm text-on-surface-variant mb-4">Jenis file ini tidak bisa ditampilkan langsung. Silakan unduh untuk membukanya.</p>
                <a href={`${preview.url}?download=1`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold">
                  <Download className="w-4 h-4" /> Unduh File
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {renaming && (
        <Modal
          title="Ubah Keterangan Lampiran"
          onClose={() => setRenaming(null)}
          footer={
            <>
              <button onClick={() => setRenaming(null)} className="px-4 py-2 rounded-lg border border-outline-variant hover:bg-slate-50" disabled={busy}>Batal</button>
              <button onClick={handleRename} className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:brightness-110" disabled={busy || !renameValue.trim()}>
                {busy ? "Menyimpan..." : "Simpan"}
              </button>
            </>
          }
        >
          <Field label="Keterangan" required>
            <TextInput list={datalistId} value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
          </Field>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          danger
          busy={busy}
          message={`Hapus lampiran "${deleting.label}"? File akan dihapus permanen.`}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      )}
    </SectionCard>
  );
}
