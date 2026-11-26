import { useEffect, useId, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, FileText, LayoutTemplate, Save, Settings } from "lucide-react";
import { apiJson, jsonInit, suratCategorySuggestions, type Surat } from "@/src/lib/korwil";
import type { LetterContent, Letterhead, LetterMeta } from "@/src/lib/letter";
import { findPlaceholders, letterTemplates, type LetterTemplate } from "@/src/lib/letterTemplates";
import { LetterBlocksEditor } from "@/src/components/korwil/LetterBlocksEditor";
import { LetterPreview } from "@/src/components/korwil/LetterPreview";
import { Field, TextArea, TextInput } from "@/src/components/korwil/ui";

interface MetaState extends LetterMeta {
  category: string;
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-outline-variant/30 shadow-sm">
      <div className="px-5 py-3 border-b border-outline-variant/10 flex items-center justify-between">
        <h3 className="text-sm font-bold text-on-surface">{title}</h3>
        {action}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  );
}

function TemplatePicker({ onPick, onCancel }: { onPick: (t: LetterTemplate) => void; onCancel?: () => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {letterTemplates.map((t) => (
          <button
            key={t.key}
            onClick={() => onPick(t)}
            className="text-left bg-white rounded-xl border border-outline-variant/30 shadow-sm p-5 hover:border-primary hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary"><FileText className="w-5 h-5" /></div>
              <p className="font-semibold text-on-surface">{t.name}</p>
            </div>
            <p className="text-sm text-on-surface-variant">{t.description}</p>
          </button>
        ))}
      </div>
      {onCancel && (
        <button onClick={onCancel} className="text-sm text-primary hover:underline">Batal, kembali ke surat</button>
      )}
    </div>
  );
}

export default function LetterEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [letterhead, setLetterhead] = useState<Letterhead | null>(null);
  const [meta, setMeta] = useState<MetaState | null>(null);
  const [content, setContent] = useState<LetterContent | null>(null);
  const [picking, setPicking] = useState(!isEdit);
  const [suggestion, setSuggestion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const categoryListId = useId();

  useEffect(() => {
    const load = async () => {
      try {
        const lh = await apiJson<Letterhead>("/api/korwil/kop-surat");
        setLetterhead(lh);
        if (id) {
          const surat = await apiJson<Surat>(`/api/korwil/surat/${id}`);
          setMeta({
            letterNumber: surat.letterNumber,
            letterDate: surat.letterDate,
            subject: surat.subject,
            counterparty: surat.counterparty,
            category: surat.category,
          });
          // An archived letter can be turned into a generated one: start it from the blank template.
          setContent(surat.content ?? letterTemplates[letterTemplates.length - 1].build(lh).content);
        }
      } catch (e) {
        setError((e as Error).message);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    if (isEdit || !meta?.letterDate) {
      setSuggestion("");
      return;
    }
    apiJson<{ letterNumber: string }>(`/api/korwil/surat/next-number?date=${meta.letterDate}`)
      .then((r) => setSuggestion(r.letterNumber))
      .catch(() => setSuggestion(""));
  }, [isEdit, meta?.letterDate]);

  const applyTemplate = (template: LetterTemplate) => {
    if (!letterhead) return;
    const draft = template.build(letterhead);
    setMeta((prev) => ({
      letterNumber: prev?.letterNumber ?? "",
      letterDate: prev?.letterDate ?? todayIso(),
      subject: draft.subject,
      counterparty: draft.counterparty,
      category: draft.category,
    }));
    setContent(draft.content);
    setPicking(false);
  };

  // Fill the suggested number once for a new letter.
  useEffect(() => {
    if (!isEdit && suggestion && meta && !meta.letterNumber) setMeta({ ...meta, letterNumber: suggestion });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion]);

  const handleSave = async () => {
    if (!meta || !content) return;
    if (!meta.letterNumber.trim() || !meta.subject.trim() || !meta.letterDate) {
      window.alert("No surat, tanggal, dan perihal wajib diisi.");
      return;
    }
    const placeholders = findPlaceholders({ subject: meta.subject, counterparty: meta.counterparty, content });
    if (placeholders.length && !window.confirm(`Masih ada isian yang belum diganti:\n${[...new Set(placeholders)].join("\n")}\n\nTetap simpan?`)) {
      return;
    }
    setSaving(true);
    try {
      const body = { ...meta, direction: "KELUAR", content };
      const saved = isEdit
        ? await apiJson<Surat>(`/api/korwil/surat/${id}`, jsonInit("PATCH", body))
        : await apiJson<Surat>("/api/korwil/surat", jsonInit("POST", body));
      navigate(`/korwil/surat/${saved.id}`);
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const backHref = isEdit ? `/korwil/surat/${id}` : "/korwil/surat";

  if (error) {
    return (
      <div className="space-y-4">
        <Link to={backHref} className="inline-flex items-center gap-2 text-sm text-primary"><ArrowLeft className="w-4 h-4" /> Kembali</Link>
        <p className="text-on-surface-variant">{error}</p>
      </div>
    );
  }
  if (!letterhead || (isEdit && (!meta || !content))) return <p className="text-on-surface-variant">Memuat...</p>;

  const header = (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
      <div>
        <Link to={backHref} className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-2">
          <ArrowLeft className="w-4 h-4" /> {isEdit ? "Kembali ke surat" : "Surat Menyurat"}
        </Link>
        <h2 className="font-headline-md text-on-surface">{isEdit ? "Edit Isi Surat" : "Buat Surat"}</h2>
        <p className="font-body-md text-on-surface-variant">
          {picking ? "Pilih template untuk memulai. Semua isi bisa diubah setelahnya." : "Isi di kiri, hasil surat tampil di kanan sama persis dengan PDF."}
        </p>
      </div>
      {!picking && (
        <div className="flex gap-2">
          <Link to={backHref} className="px-4 py-2 rounded-lg border border-outline-variant bg-white hover:bg-slate-50 text-sm font-semibold">Batal</Link>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg bg-primary text-on-primary hover:brightness-110 flex items-center gap-2 text-sm font-semibold shadow-sm">
            <Save className="w-4 h-4" /> {saving ? "Menyimpan..." : "Simpan Surat"}
          </button>
        </div>
      )}
    </div>
  );

  if (picking || !meta || !content) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 max-w-4xl">
        {header}
        <TemplatePicker onPick={applyTemplate} onCancel={content ? () => setPicking(false) : undefined} />
      </motion.div>
    );
  }

  const setM = <K extends keyof MetaState>(key: K, value: MetaState[K]) => setMeta({ ...meta, [key]: value });
  const setC = <K extends keyof LetterContent>(key: K, value: LetterContent[K]) => setContent({ ...content, [key]: value });
  const hasSignatureImages = Boolean(letterhead.signature || letterhead.stamp);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
      {header}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,540px)_minmax(0,1fr)] gap-6 items-start">
        <div className="space-y-5">
          <Card
            title="Data Surat"
            action={
              <button
                onClick={() => {
                  if (window.confirm("Ganti template? Isi surat saat ini akan diganti.")) setPicking(true);
                }}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <LayoutTemplate className="w-3.5 h-3.5" /> Ganti template
              </button>
            }
          >
            <div className="grid grid-cols-2 gap-4">
              <Field label="Tanggal Surat" required>
                <TextInput type="date" value={meta.letterDate} onChange={(e) => setM("letterDate", e.target.value)} />
              </Field>
              <Field label="Lampiran">
                <TextInput value={content.attachmentNote} onChange={(e) => setC("attachmentNote", e.target.value)} placeholder="mis. 1 berkas atau -" />
              </Field>
            </div>
            <Field label="No Surat" required>
              <TextInput value={meta.letterNumber} onChange={(e) => setM("letterNumber", e.target.value)} placeholder={`mis. 01/${letterhead.letterCode}/XI/2026`} />
            </Field>
            {suggestion && meta.letterNumber !== suggestion && (
              <p className="text-xs text-on-surface-variant -mt-2">
                Nomor berikutnya:{" "}
                <button type="button" onClick={() => setM("letterNumber", suggestion)} className="font-semibold text-primary hover:underline">{suggestion}</button>
              </p>
            )}
            <Field label="Perihal" required>
              <TextInput value={meta.subject} onChange={(e) => setM("subject", e.target.value)} />
            </Field>
            <Field label="Kategori">
              <TextInput list={categoryListId} value={meta.category} onChange={(e) => setM("category", e.target.value)} />
              <datalist id={categoryListId}>
                {suratCategorySuggestions.map((c) => <option key={c} value={c} />)}
              </datalist>
            </Field>
          </Card>

          <Card title="Kepada Yth.">
            <Field label="Penerima">
              <TextInput value={meta.counterparty} onChange={(e) => setM("counterparty", e.target.value)} placeholder="mis. Pimpinan Sinode JKI" />
            </Field>
            <Field label="Baris berikutnya" hint="mis. alamat, atau cukup Di Tempat">
              <TextArea value={content.addressLines} onChange={(e) => setC("addressLines", e.target.value)} />
            </Field>
          </Card>

          <Card title="Isi Surat">
            <LetterBlocksEditor blocks={content.blocks} onChange={(blocks) => setC("blocks", blocks)} />
          </Card>

          <Card title="Penutup & Tanda Tangan">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nama Penanda Tangan">
                <TextInput value={content.signerName} onChange={(e) => setC("signerName", e.target.value)} />
              </Field>
              <Field label="Jabatan">
                <TextInput value={content.signerTitle} onChange={(e) => setC("signerTitle", e.target.value)} />
              </Field>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={content.useSignature}
                onChange={(e) => setC("useSignature", e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[var(--color-primary)]"
              />
              <span>
                <span className="block text-sm font-semibold">Sertakan tanda tangan & stempel digital</span>
                <span className="block text-xs text-on-surface-variant">
                  Matikan bila surat akan ditandatangani & distempel basah setelah dicetak.
                </span>
              </span>
            </label>
            {!hasSignatureImages && (
              <p className="text-xs text-amber-700 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5" />
                Gambar tanda tangan & stempel belum diunggah.{" "}
                <Link to="/korwil/surat/kop-surat" className="font-semibold underline">Atur di Kop Surat</Link>
              </p>
            )}
          </Card>
        </div>

        <div className="xl:sticky xl:top-20">
          <LetterPreview meta={meta} content={content} />
        </div>
      </div>
    </motion.div>
  );
}
