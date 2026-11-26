import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Download, FilePen, FileText, Pencil, Printer, Trash2 } from "lucide-react";
import { apiJson, directionLabel, downloadFile, formatDateId, type Lampiran, type Surat } from "@/src/lib/korwil";
import { LetterPreview } from "@/src/components/korwil/LetterPreview";
import { SuratForm } from "@/src/components/korwil/SuratForm";
import { AttachmentPanel } from "@/src/components/korwil/AttachmentPanel";
import { ConfirmDialog, InfoRow, SectionCard } from "@/src/components/korwil/ui";
import { DirectionBadge } from "./SuratList";

// Must match what the server can put in the PDF (server/surat.ts).
const PDF_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);

export default function SuratDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Surat | null>(null);
  const [files, setFiles] = useState<Lampiran[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = () =>
    apiJson<Surat>(`/api/korwil/surat/${id}`)
      .then(setItem)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDelete = async () => {
    setBusy(true);
    try {
      await apiJson(`/api/korwil/surat/${id}`, { method: "DELETE" });
      navigate("/korwil/surat");
    } catch (e) {
      window.alert((e as Error).message);
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-4">
        <Link to="/korwil/surat" className="inline-flex items-center gap-2 text-sm text-primary"><ArrowLeft className="w-4 h-4" /> Kembali</Link>
        <p className="text-on-surface-variant">{error}</p>
      </div>
    );
  }

  if (!item) return <p className="text-on-surface-variant">Memuat data...</p>;

  const pdfPages = files.filter((f) => PDF_TYPES.has(f.mimeType));
  const notInPdf = files.filter((f) => !PDF_TYPES.has(f.mimeType));
  const pdfUrl = `/api/korwil/surat/${item.id}/pdf`;
  const printUrl = `/api/korwil/surat/${item.id}/letter.html?print=1`;

  const downloadLetter = async () => {
    setDownloading(true);
    try {
      await downloadFile(`/api/korwil/surat/${item.id}/letter.pdf?download=1`, `${item.letterNumber}.pdf`);
    } catch (e) {
      if (window.confirm(`${(e as Error).message}

Buka halaman cetak sebagai gantinya?`)) window.open(printUrl, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 max-w-5xl">
      <Link to="/korwil/surat" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
        <ArrowLeft className="w-4 h-4" /> Surat Menyurat
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1 flex items-center gap-2">
            {directionLabel[item.direction]} · {item.letterNumber}
          </p>
          <h2 className="font-headline-md text-on-surface">{item.subject}</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          {item.content && (
            <button
              onClick={downloadLetter}
              disabled={downloading}
              className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:brightness-110 flex items-center gap-2 text-sm font-semibold shadow-sm disabled:opacity-60"
            >
              <Download className="w-4 h-4" /> {downloading ? "Membuat PDF..." : "Unduh Surat (PDF)"}
            </button>
          )}
          {item.content ? (
            pdfPages.length > 0 && (
              <a href={`${pdfUrl}?download=1`} className="px-4 py-2 rounded-lg border border-outline-variant bg-white hover:bg-slate-50 flex items-center gap-2 text-sm font-semibold">
                <Download className="w-4 h-4" /> Unduh Scan (PDF)
              </a>
            )
          ) : pdfPages.length > 0 ? (
            <>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-lg border border-outline-variant bg-white hover:bg-slate-50 flex items-center gap-2 text-sm font-semibold"
              >
                <FileText className="w-4 h-4" /> Lihat PDF
              </a>
              <a href={`${pdfUrl}?download=1`} className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:brightness-110 flex items-center gap-2 text-sm font-semibold shadow-sm">
                <Download className="w-4 h-4" /> Unduh PDF
              </a>
            </>
          ) : (
            <span className="px-4 py-2 rounded-lg bg-slate-100 text-on-surface-variant flex items-center gap-2 text-sm font-semibold cursor-not-allowed" title="Unggah foto atau scan surat terlebih dahulu">
              <Download className="w-4 h-4" /> Unduh PDF
            </span>
          )}
          <button onClick={() => setEditing(true)} className="px-4 py-2 rounded-lg border border-outline-variant bg-white hover:bg-slate-50 flex items-center gap-2 text-sm font-semibold">
            <Pencil className="w-4 h-4" /> Edit
          </button>
          <button onClick={() => setConfirmDelete(true)} className="px-4 py-2 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 flex items-center gap-2 text-sm font-semibold">
            <Trash2 className="w-4 h-4" /> Hapus
          </button>
        </div>
      </div>

      <SectionCard title="Data Surat">
        <dl>
          <InfoRow label="Jenis"><DirectionBadge direction={item.direction} /></InfoRow>
          <InfoRow label="No Surat">{item.letterNumber}</InfoRow>
          <InfoRow label="Tanggal Surat">{formatDateId(item.letterDate)}</InfoRow>
          <InfoRow label="Perihal">{item.subject}</InfoRow>
          <InfoRow label={item.direction === "MASUK" ? "Dari" : "Kepada"}>{item.counterparty}</InfoRow>
          <InfoRow label="Kategori">{item.category}</InfoRow>
          <InfoRow label="Catatan">{item.notes}</InfoRow>
        </dl>
      </SectionCard>

      {item.content && (
        <SectionCard
          title="Isi Surat"
          action={
            <div className="flex gap-2">
              <a href={printUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg border border-outline-variant bg-white hover:bg-slate-50 flex items-center gap-2 text-sm font-semibold">
                <Printer className="w-4 h-4" /> Cetak
              </a>
              <Link to={`/korwil/surat/${item.id}/tulis`} className="px-3 py-1.5 rounded-lg border border-outline-variant bg-white hover:bg-slate-50 flex items-center gap-2 text-sm font-semibold">
                <FilePen className="w-4 h-4" /> Edit Isi Surat
              </Link>
            </div>
          }
        >
          <div className="max-w-3xl mx-auto">
            <LetterPreview
              meta={{ letterNumber: item.letterNumber, letterDate: item.letterDate, subject: item.subject, counterparty: item.counterparty }}
              content={item.content}
            />
          </div>
        </SectionCard>
      )}

      <AttachmentPanel
        ownerType="SURAT"
        ownerId={item.id}
        oldestFirst
        onChange={setFiles}
        hint={
          <div className="text-xs text-on-surface-variant space-y-1">
            <p>
              {item.content
                ? "Setelah dicetak dan ditandatangani basah, unggah foto/scan surat di sini sebagai arsip. "
                : ""}
              Foto (JPG/PNG) dan PDF digabung menjadi satu PDF sesuai urutan nomor di bawah. Unggah halaman surat berurutan, mulai dari halaman 1.
            </p>
            {notInPdf.length > 0 && (
              <p className="text-amber-700">
                Tidak ikut dalam PDF: {notInPdf.map((f) => f.originalName).join(", ")}
              </p>
            )}
          </div>
        }
      />

      {editing && (
        <SuratForm
          initial={item}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            load();
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          danger
          busy={busy}
          message={`Hapus surat ${item.letterNumber} beserta semua lampirannya? Tindakan ini tidak dapat dibatalkan.`}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </motion.div>
  );
}
