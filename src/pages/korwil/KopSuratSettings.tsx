import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, ImagePlus, Save, Trash2 } from "lucide-react";
import { apiJson, jsonInit } from "@/src/lib/korwil";
import type { Letterhead } from "@/src/lib/letter";
import { letterTemplates } from "@/src/lib/letterTemplates";
import { LetterPreview } from "@/src/components/korwil/LetterPreview";
import { Field, TextInput } from "@/src/components/korwil/ui";

type ImageKey = "logoLeft" | "logoRight" | "signature" | "stamp";

const imageSlots: Array<{ key: ImageKey; label: string; hint: string }> = [
  { key: "logoLeft", label: "Logo Kiri", hint: "Logo gereja lokal" },
  { key: "logoRight", label: "Logo Kanan", hint: "Logo Sinode JKI" },
  { key: "signature", label: "Tanda Tangan", hint: "Scan tanda tangan di kertas putih" },
  { key: "stamp", label: "Stempel", hint: "Scan stempel gereja" },
];

// Shrinks the picture so the settings stay small; keeps PNG (transparency) as PNG.
function readImage(file: File, maxSide = 700): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca gambar"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("File bukan gambar yang didukung"));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(file.type === "image/png" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.9));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function ImageSlot({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-lg border border-outline-variant/40 p-3 flex flex-col gap-2">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-on-surface-variant">{hint}</p>
      </div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="h-24 rounded-md bg-slate-50 border border-dashed border-outline-variant/60 flex items-center justify-center overflow-hidden hover:border-primary"
      >
        {value ? <img src={value} alt={label} className="max-h-full max-w-full object-contain" /> : <ImagePlus className="w-6 h-6 text-outline" />}
      </button>
      <div className="flex gap-2">
        <button type="button" onClick={() => input.current?.click()} className="flex-1 text-xs font-semibold text-primary hover:underline text-left">
          {value ? "Ganti" : "Pilih gambar"}
        </button>
        {value && (
          <button type="button" onClick={() => onChange("")} className="text-xs text-error hover:underline flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5" /> Hapus
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            onChange(await readImage(file));
          } catch (error) {
            window.alert((error as Error).message);
          }
        }}
      />
    </div>
  );
}

export default function KopSuratSettings() {
  const [value, setValue] = useState<Letterhead | null>(null);
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiJson<Letterhead>("/api/korwil/kop-surat").then((lh) => {
      setValue(lh);
      setSaved(JSON.stringify(lh));
    }).catch((e) => window.alert(e.message));
  }, []);

  if (!value) return <p className="text-on-surface-variant">Memuat...</p>;

  const set = (key: keyof Letterhead) => (e: { target: { value: string } }) => setValue({ ...value, [key]: e.target.value });
  const dirty = JSON.stringify(value) !== saved;
  const sample = letterTemplates[0].build(value);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await apiJson<Letterhead>("/api/korwil/kop-surat", jsonInit("PUT", value));
      setValue(result);
      setSaved(JSON.stringify(result));
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <Link to="/korwil/surat" className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-2">
            <ArrowLeft className="w-4 h-4" /> Surat Menyurat
          </Link>
          <h2 className="font-headline-md text-on-surface">Pengaturan Kop Surat</h2>
          <p className="font-body-md text-on-surface-variant">Dipakai di semua surat yang dibuat dari aplikasi.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="px-5 py-2 rounded-lg bg-primary text-on-primary hover:brightness-110 flex items-center gap-2 text-sm font-semibold shadow-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? "Menyimpan..." : dirty ? "Simpan Pengaturan" : "Tersimpan"}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,540px)_minmax(0,1fr)] gap-6 items-start">
        <div className="space-y-5">
          <section className="bg-white rounded-xl border border-outline-variant/30 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-bold">Kop</h3>
            <Field label="Baris Nama 1"><TextInput value={value.orgLine1} onChange={set("orgLine1")} /></Field>
            <Field label="Baris Nama 2"><TextInput value={value.orgLine2} onChange={set("orgLine2")} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Email"><TextInput value={value.email} onChange={set("email")} /></Field>
              <Field label="Telepon"><TextInput value={value.phone} onChange={set("phone")} /></Field>
            </div>
            <Field label="Sekretariat"><TextInput value={value.secretariat} onChange={set("secretariat")} /></Field>
            <Field label="Baris Legalitas" hint="Akte notaris / SK Dirjen Bimas"><TextInput value={value.legalLine} onChange={set("legalLine")} /></Field>
          </section>

          <section className="bg-white rounded-xl border border-outline-variant/30 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-bold">Penutup Surat</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Kota" hint='Mis. "Bandung, 1 Juli 2026"'><TextInput value={value.city} onChange={set("city")} /></Field>
              <Field label="Kode Nomor Surat" hint="Mis. 01/JKI-OEM/XI/2026"><TextInput value={value.letterCode} onChange={set("letterCode")} /></Field>
            </div>
            <Field label='Nama Gereja di bawah "Hormat kami,"'><TextInput value={value.signOffChurch} onChange={set("signOffChurch")} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Penanda Tangan (default)"><TextInput value={value.signerName} onChange={set("signerName")} /></Field>
              <Field label="Jabatan (default)"><TextInput value={value.signerTitle} onChange={set("signerTitle")} /></Field>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-outline-variant/30 shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-bold">Gambar</h3>
            <p className="text-xs text-on-surface-variant">
              Gunakan PNG berlatar transparan, atau foto/scan berlatar putih (warna putih otomatis tembus pandang di surat).
            </p>
            <div className="grid grid-cols-2 gap-3">
              {imageSlots.map((slot) => (
                <ImageSlot
                  key={slot.key}
                  label={slot.label}
                  hint={slot.hint}
                  value={value[slot.key]}
                  onChange={(v) => setValue({ ...value, [slot.key]: v })}
                />
              ))}
            </div>
          </section>
        </div>

        <div className="xl:sticky xl:top-20 space-y-2">
          <p className="text-xs text-on-surface-variant">Contoh surat dengan pengaturan ini:</p>
          <LetterPreview
            letterhead={value}
            meta={{ letterNumber: `01/${value.letterCode}/XI/2026`, letterDate: new Date().toISOString().slice(0, 10), subject: sample.subject, counterparty: sample.counterparty }}
            content={sample.content}
          />
        </div>
      </div>
    </motion.div>
  );
}
