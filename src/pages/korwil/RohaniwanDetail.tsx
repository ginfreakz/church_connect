import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { apiJson, formatDateId, genderLabel, initialsOf, jabatanLabel, jabatanShort, type Rohaniwan } from "@/src/lib/korwil";
import { RohaniwanForm } from "@/src/components/korwil/RohaniwanForm";
import { AttachmentPanel } from "@/src/components/korwil/AttachmentPanel";
import { ConfirmDialog, ExpiryBadge, InfoRow, SectionCard } from "@/src/components/korwil/ui";

function ExpiryValue({ date }: { date: string | null }) {
  if (!date) return <>-</>;
  return (
    <span className="inline-flex items-center gap-2 flex-wrap">
      {formatDateId(date)} <ExpiryBadge date={date} />
    </span>
  );
}

export default function RohaniwanDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Rohaniwan | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () =>
    apiJson<Rohaniwan>(`/api/korwil/rohaniwan/${id}`)
      .then(setItem)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const backHref = item?.isGembala ? "/korwil/gembala" : "/korwil/pendeta";
  const backLabel = item?.isGembala ? "Data Gembala Jemaat" : "Data Pdm. & Pdt.";

  const handleDelete = async () => {
    setBusy(true);
    try {
      await apiJson(`/api/korwil/rohaniwan/${id}`, { method: "DELETE" });
      navigate(backHref);
    } catch (e) {
      window.alert((e as Error).message);
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-4">
        <Link to="/korwil/pendeta" className="inline-flex items-center gap-2 text-sm text-primary"><ArrowLeft className="w-4 h-4" /> Kembali</Link>
        <p className="text-on-surface-variant">{error}</p>
      </div>
    );
  }

  if (!item) return <p className="text-on-surface-variant">Memuat data...</p>;

  const birth = [item.birthPlace, item.birthDate ? formatDateId(item.birthDate) : ""].filter(Boolean).join(", ");

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 max-w-5xl">
      <Link to={backHref} className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
        <ArrowLeft className="w-4 h-4" /> {backLabel}
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg bg-primary/10 text-primary">
            {initialsOf(item.name)}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
              {item.isGembala ? "Gembala Jemaat" : "Rohaniwan"} · {item.id}
            </p>
            <h2 className="font-headline-md text-on-surface">{jabatanShort[item.jabatan]} {item.name}</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(true)} className="px-4 py-2 rounded-lg border border-outline-variant bg-white hover:bg-slate-50 flex items-center gap-2 text-sm font-semibold">
            <Pencil className="w-4 h-4" /> Edit
          </button>
          <button onClick={() => setConfirmDelete(true)} className="px-4 py-2 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 flex items-center gap-2 text-sm font-semibold">
            <Trash2 className="w-4 h-4" /> Hapus
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <SectionCard title="Kartu & Jabatan">
          <dl>
            <InfoRow label="NIR">{item.nir}</InfoRow>
            <InfoRow label="Masa Berlaku NIR"><ExpiryValue date={item.nirExpiry} /></InfoRow>
            <InfoRow label="Kartu Kependetaan">{item.cardNumber}</InfoRow>
            <InfoRow label="Masa Berlaku Kartu"><ExpiryValue date={item.cardExpiry} /></InfoRow>
            <InfoRow label="Jabatan">{jabatanLabel[item.jabatan]}</InfoRow>
            <InfoRow label="Gereja/Lembaga">{item.churchName}</InfoRow>
            {item.isGembala && (
              <>
                <InfoRow label="Gereja Lokal">
                  {item.gerejaLokalId && item.gerejaLokalName ? (
                    <Link to={`/korwil/gereja-lokal/${item.gerejaLokalId}`} className="text-primary hover:underline">{item.gerejaLokalName}</Link>
                  ) : null}
                </InfoRow>
                <InfoRow label="Alamat Gereja">{item.churchAddress}</InfoRow>
              </>
            )}
          </dl>
        </SectionCard>

        <SectionCard title="Data Pribadi">
          <dl>
            <InfoRow label="Nama Lengkap">{item.name}</InfoRow>
            <InfoRow label="Tempat/Tgl Lahir">{birth}</InfoRow>
            <InfoRow label="Jenis Kelamin">{item.gender ? genderLabel[item.gender] : ""}</InfoRow>
            <InfoRow label="Kewarganegaraan">{item.nationality}</InfoRow>
            <InfoRow label="No HP">{item.phone}</InfoRow>
            <InfoRow label="Alamat Lengkap">{item.address}</InfoRow>
            <InfoRow label="Catatan">{item.notes}</InfoRow>
          </dl>
        </SectionCard>
      </div>

      <AttachmentPanel ownerType="ROHANIWAN" ownerId={item.id} />

      {editing && (
        <RohaniwanForm
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
          message={`Hapus data ${jabatanShort[item.jabatan]} ${item.name} beserta semua lampirannya? Tindakan ini tidak dapat dibatalkan.`}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </motion.div>
  );
}
