import { useEffect, useId, useState } from "react";
import { cn } from "@/src/lib/utils";
import { apiJson, jsonInit, suratCategorySuggestions, type Surat, type SuratDirection } from "@/src/lib/korwil";
import { Field, Modal, TextArea, TextInput } from "./ui";

interface FormValue {
  direction: SuratDirection;
  letterNumber: string;
  letterDate: string;
  subject: string;
  counterparty: string;
  category: string;
  notes: string;
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function SuratForm({
  initial,
  defaultDirection = "KELUAR",
  onClose,
  onSaved,
}: {
  initial?: Surat;
  defaultDirection?: SuratDirection;
  onClose: () => void;
  onSaved: (saved: Surat) => void;
}) {
  const [value, setValue] = useState<FormValue>(() => ({
    direction: initial?.direction ?? defaultDirection,
    letterNumber: initial?.letterNumber ?? "",
    letterDate: initial?.letterDate ?? todayIso(),
    subject: initial?.subject ?? "",
    counterparty: initial?.counterparty ?? "",
    category: initial?.category ?? "",
    notes: initial?.notes ?? "",
  }));
  const [suggestion, setSuggestion] = useState("");
  const [saving, setSaving] = useState(false);
  const categoryListId = useId();

  const set = <K extends keyof FormValue>(key: K, v: FormValue[K]) => setValue((prev) => ({ ...prev, [key]: v }));

  // Next outgoing number for the letter's year, e.g. 03/JKI-OEM/XI/2026. Only offered for new outgoing letters.
  useEffect(() => {
    if (initial || value.direction !== "KELUAR" || !value.letterDate) {
      setSuggestion("");
      return;
    }
    apiJson<{ letterNumber: string }>(`/api/korwil/surat/next-number?date=${value.letterDate}`)
      .then((r) => setSuggestion(r.letterNumber))
      .catch(() => setSuggestion(""));
  }, [initial, value.direction, value.letterDate]);

  const canSave = value.letterNumber.trim() && value.subject.trim() && value.letterDate;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const saved = initial
        ? await apiJson<Surat>(`/api/korwil/surat/${initial.id}`, jsonInit("PATCH", value))
        : await apiJson<Surat>("/api/korwil/surat", jsonInit("POST", value));
      onSaved(saved);
    } catch (error) {
      window.alert((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const isMasuk = value.direction === "MASUK";

  return (
    <Modal
      title={initial ? "Edit Surat" : "Tambah Surat"}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-outline-variant hover:bg-slate-50" disabled={saving}>Batal</button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:brightness-110 disabled:opacity-50" disabled={saving || !canSave}>
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </>
      }
    >
      <div className="space-y-4 pb-2">
        <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-slate-100">
          {(["KELUAR", "MASUK"] as const).map((dir) => (
            <button
              key={dir}
              type="button"
              onClick={() => set("direction", dir)}
              className={cn(
                "py-2 rounded-md text-sm font-semibold transition-colors",
                value.direction === dir ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              {dir === "KELUAR" ? "Surat Keluar" : "Surat Masuk"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Tanggal Surat" required>
            <TextInput type="date" value={value.letterDate} onChange={(e) => set("letterDate", e.target.value)} />
          </Field>
          <Field label="No Surat" required>
            <TextInput
              value={value.letterNumber}
              onChange={(e) => set("letterNumber", e.target.value)}
              placeholder={isMasuk ? "mis. 007/SK-PN/SJKI/X/2026" : "mis. 01/JKI-OEM/XI/2026"}
            />
          </Field>
        </div>
        {suggestion && value.letterNumber !== suggestion && (
          <p className="text-xs text-on-surface-variant -mt-2">
            Nomor berikutnya:{" "}
            <button type="button" onClick={() => set("letterNumber", suggestion)} className="font-semibold text-primary hover:underline">
              {suggestion}
            </button>{" "}
            (klik untuk memakai)
          </p>
        )}

        <Field label="Perihal" required>
          <TextInput value={value.subject} onChange={(e) => set("subject", e.target.value)} placeholder="mis. Surat Keterangan Cuti Tahunan" />
        </Field>

        <Field label={isMasuk ? "Dari (Pengirim)" : "Kepada (Tujuan)"}>
          <TextInput
            value={value.counterparty}
            onChange={(e) => set("counterparty", e.target.value)}
            placeholder={isMasuk ? "mis. Badan Pengurus Sinode JKI" : "mis. Pimpinan Sinode JKI"}
          />
        </Field>

        <Field label="Kategori" hint="Pilih dari daftar atau ketik sendiri.">
          <TextInput list={categoryListId} value={value.category} onChange={(e) => set("category", e.target.value)} />
          <datalist id={categoryListId}>
            {suratCategorySuggestions.map((c) => <option key={c} value={c} />)}
          </datalist>
        </Field>

        <Field label="Catatan">
          <TextArea value={value.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>

        <p className="text-xs text-on-surface-variant">
          Foto atau scan surat diunggah di halaman detail setelah data disimpan.
        </p>
      </div>
    </Modal>
  );
}
