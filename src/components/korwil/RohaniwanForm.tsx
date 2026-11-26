import { useEffect, useState, type ReactNode } from "react";
import {
  apiJson,
  DEFAULT_LEMBAGA,
  jsonInit,
  type Gender,
  type GerejaLokal,
  type Jabatan,
  type Rohaniwan,
} from "@/src/lib/korwil";
import { Field, Modal, Select, TextArea, TextInput } from "./ui";

interface FormValue {
  name: string;
  jabatan: Jabatan;
  isGembala: boolean;
  gerejaLokalId: string;
  nir: string;
  nirExpiry: string;
  cardNumber: string;
  cardExpiry: string;
  address: string;
  phone: string;
  birthPlace: string;
  birthDate: string;
  gender: Gender;
  nationality: string;
  churchName: string;
  churchAddress: string;
  notes: string;
}

const toFormValue = (item: Rohaniwan | undefined, defaultGembala: boolean): FormValue => ({
  name: item?.name ?? "",
  jabatan: item?.jabatan ?? "PDM",
  isGembala: item?.isGembala ?? defaultGembala,
  gerejaLokalId: item?.gerejaLokalId ?? "",
  nir: item?.nir ?? "",
  nirExpiry: item?.nirExpiry ?? "",
  cardNumber: item?.cardNumber ?? "",
  cardExpiry: item?.cardExpiry ?? "",
  address: item?.address ?? "",
  phone: item?.phone ?? "",
  birthPlace: item?.birthPlace ?? "",
  birthDate: item?.birthDate ?? "",
  gender: item?.gender ?? "",
  nationality: item?.nationality ?? "Indonesia",
  churchName: item?.churchName ?? DEFAULT_LEMBAGA,
  churchAddress: item?.churchAddress ?? "",
  notes: item?.notes ?? "",
});

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-xs font-bold uppercase tracking-widest text-primary mb-3">{title}</legend>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </fieldset>
  );
}

export function RohaniwanForm({
  initial,
  defaultGembala = false,
  onClose,
  onSaved,
}: {
  initial?: Rohaniwan;
  defaultGembala?: boolean;
  onClose: () => void;
  onSaved: (saved: Rohaniwan) => void;
}) {
  const [value, setValue] = useState<FormValue>(() => toFormValue(initial, defaultGembala));
  const [gerejaList, setGerejaList] = useState<GerejaLokal[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiJson<GerejaLokal[]>("/api/korwil/gereja-lokal").then(setGerejaList).catch(() => setGerejaList([]));
  }, []);

  const set = <K extends keyof FormValue>(key: K, v: FormValue[K]) => setValue((prev) => ({ ...prev, [key]: v }));
  const bind = (key: keyof FormValue) => ({
    value: value[key] as string,
    onChange: (event: { target: { value: string } }) => set(key, event.target.value as never),
  });

  const handleGerejaChange = (id: string) => {
    const gereja = gerejaList.find((g) => g.id === id);
    setValue((prev) => ({
      ...prev,
      gerejaLokalId: id,
      churchAddress: prev.churchAddress || gereja?.worshipAddress || "",
    }));
  };

  const canSave = value.name.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const body = {
        ...value,
        gerejaLokalId: value.isGembala ? value.gerejaLokalId : "",
      };
      const saved = initial
        ? await apiJson<Rohaniwan>(`/api/korwil/rohaniwan/${initial.id}`, jsonInit("PATCH", body))
        : await apiJson<Rohaniwan>("/api/korwil/rohaniwan", jsonInit("POST", body));
      onSaved(saved);
    } catch (error) {
      window.alert((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      wide
      title={initial ? "Edit Data Rohaniwan" : value.isGembala ? "Tambah Gembala Jemaat" : "Tambah Pendeta"}
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
      <div className="space-y-8 pb-2">
        <Group title="Jabatan">
          <Field label="Jabatan">
            <Select value={value.jabatan} onChange={(e) => set("jabatan", e.target.value as Jabatan)}>
              <option value="PDM">Pendeta Muda (Pdm.)</option>
              <option value="PDT">Pendeta (Pdt.)</option>
            </Select>
          </Field>
          <label className="flex items-start gap-3 md:mt-7 cursor-pointer">
            <input
              type="checkbox"
              checked={value.isGembala}
              onChange={(e) => set("isGembala", e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[var(--color-primary)]"
            />
            <span>
              <span className="block text-sm font-semibold">Gembala Jemaat</span>
              <span className="block text-xs text-on-surface-variant">Centang bila menggembalakan gereja lokal.</span>
            </span>
          </label>
        </Group>

        <Group title="Identitas">
          <Field label="Nama Lengkap" required className="md:col-span-2">
            <TextInput {...bind("name")} placeholder="Tanpa gelar Pdm./Pdt." autoFocus={!initial} />
          </Field>
          <Field label="Tempat Lahir">
            <TextInput {...bind("birthPlace")} />
          </Field>
          <Field label="Tanggal Lahir">
            <TextInput type="date" {...bind("birthDate")} />
          </Field>
          <Field label="Jenis Kelamin">
            <Select value={value.gender} onChange={(e) => set("gender", e.target.value as Gender)}>
              <option value="">- Pilih -</option>
              <option value="LAKI_LAKI">Laki-laki</option>
              <option value="PEREMPUAN">Perempuan</option>
            </Select>
          </Field>
          <Field label="Kewarganegaraan">
            <TextInput {...bind("nationality")} />
          </Field>
          <Field label="No HP">
            <TextInput type="tel" {...bind("phone")} />
          </Field>
          <Field label="Alamat Lengkap" className="md:col-span-2">
            <TextArea {...bind("address")} />
          </Field>
        </Group>

        <Group title="Kartu & Dokumen">
          <Field label="NIR" hint="Nomor Induk Rohaniwan, mis. KRK.xxxx-x.xxxx.xx">
            <TextInput {...bind("nir")} />
          </Field>
          <Field label="Masa Berlaku NIR">
            <TextInput type="date" {...bind("nirExpiry")} />
          </Field>
          <Field label="No Kartu Kependetaan" hint="mis. 1548/PTBS/Pdm/VIII/2025">
            <TextInput {...bind("cardNumber")} />
          </Field>
          <Field label="Masa Berlaku Kartu Kependetaan">
            <TextInput type="date" {...bind("cardExpiry")} />
          </Field>
        </Group>

        <Group title="Gereja">
          <Field label="Gereja/Lembaga" className="md:col-span-2">
            <TextInput {...bind("churchName")} />
          </Field>
          {value.isGembala && (
            <>
              <Field label="Gereja Lokal yang Digembalakan" hint={gerejaList.length === 0 ? "Belum ada data di menu 01 Gereja Lokal." : undefined}>
                <Select value={value.gerejaLokalId} onChange={(e) => handleGerejaChange(e.target.value)}>
                  <option value="">- Pilih gereja lokal -</option>
                  {gerejaList.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </Select>
              </Field>
              <Field label="Alamat Gereja">
                <TextArea {...bind("churchAddress")} />
              </Field>
            </>
          )}
          <Field label="Catatan" className="md:col-span-2">
            <TextArea {...bind("notes")} />
          </Field>
        </Group>

        <p className="text-xs text-on-surface-variant">
          Scan kartu, SK Pengangkatan Gembala, serta SK & Sertifikat Penahbisan diunggah di halaman detail setelah data disimpan.
        </p>
      </div>
    </Modal>
  );
}
