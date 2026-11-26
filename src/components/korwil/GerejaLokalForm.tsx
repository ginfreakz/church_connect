import { useState } from "react";
import { apiJson, jsonInit, type GerejaLokal } from "@/src/lib/korwil";
import { Field, Modal, TextArea, TextInput } from "./ui";

interface FormValue {
  name: string;
  worshipAddress: string;
  secretariat: string;
  serviceSchedule: string;
  notes: string;
}

const emptyValue: FormValue = { name: "", worshipAddress: "", secretariat: "", serviceSchedule: "", notes: "" };

export function GerejaLokalForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: GerejaLokal;
  onClose: () => void;
  onSaved: (saved: GerejaLokal) => void;
}) {
  const [value, setValue] = useState<FormValue>(initial ? {
    name: initial.name,
    worshipAddress: initial.worshipAddress,
    secretariat: initial.secretariat,
    serviceSchedule: initial.serviceSchedule,
    notes: initial.notes,
  } : emptyValue);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof FormValue) => (event: { target: { value: string } }) =>
    setValue((prev) => ({ ...prev, [key]: event.target.value }));

  const canSave = value.name.trim() && value.worshipAddress.trim();

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const saved = initial
        ? await apiJson<GerejaLokal>(`/api/korwil/gereja-lokal/${initial.id}`, jsonInit("PATCH", value))
        : await apiJson<GerejaLokal>("/api/korwil/gereja-lokal", jsonInit("POST", value));
      onSaved(saved);
    } catch (error) {
      window.alert((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={initial ? "Edit Gereja Lokal" : "Tambah Gereja Lokal"}
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
      <div className="space-y-4">
        <Field label="Nama Gereja Lokal" required>
          <TextInput value={value.name} onChange={set("name")} placeholder="mis. JKI Obed Edom Ministry" autoFocus />
        </Field>
        <Field label="Alamat Lokasi Ibadah" required>
          <TextArea value={value.worshipAddress} onChange={set("worshipAddress")} />
        </Field>
        <Field label="Sekretariat Gereja" hint="Alamat sekretariat, bila berbeda dari lokasi ibadah.">
          <TextArea value={value.secretariat} onChange={set("secretariat")} />
        </Field>
        <Field label="Jam Ibadah">
          <TextArea value={value.serviceSchedule} onChange={set("serviceSchedule")} placeholder={"mis. Minggu 09.00 WIB\nRabu 19.00 WIB (Doa)"} />
        </Field>
        <Field label="Catatan">
          <TextArea value={value.notes} onChange={set("notes")} />
        </Field>
        <p className="text-xs text-on-surface-variant pb-2">
          SK Penetapan Gereja Lokal dan Surat Keterangan Tanda Lapor diunggah di halaman detail setelah data disimpan.
        </p>
      </div>
    </Modal>
  );
}
