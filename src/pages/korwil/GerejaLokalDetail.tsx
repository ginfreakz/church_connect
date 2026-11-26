import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { apiJson, jabatanShort, type GerejaLokal } from "@/src/lib/korwil";
import { GerejaLokalForm } from "@/src/components/korwil/GerejaLokalForm";
import { AttachmentPanel } from "@/src/components/korwil/AttachmentPanel";
import { ConfirmDialog, InfoRow, SectionCard } from "@/src/components/korwil/ui";

export default function GerejaLokalDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<GerejaLokal | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () =>
    apiJson<GerejaLokal>(`/api/korwil/gereja-lokal/${id}`)
      .then(setItem)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDelete = async () => {
    setBusy(true);
    try {
      await apiJson(`/api/korwil/gereja-lokal/${id}`, { method: "DELETE" });
      navigate("/korwil/gereja-lokal");
    } catch (e) {
      window.alert((e as Error).message);
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-4">
        <Link to="/korwil/gereja-lokal" className="inline-flex items-center gap-2 text-sm text-primary"><ArrowLeft className="w-4 h-4" /> Kembali</Link>
        <p className="text-on-surface-variant">{error}</p>
      </div>
    );
  }

  if (!item) return <p className="text-on-surface-variant">Memuat data...</p>;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 max-w-5xl">
      <Link to="/korwil/gereja-lokal" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
        <ArrowLeft className="w-4 h-4" /> Data Gereja Lokal
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Gereja Lokal · {item.id}</p>
          <h2 className="font-headline-md text-on-surface">{item.name}</h2>
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

      <SectionCard title="Data Gereja Lokal">
        <dl>
          <InfoRow label="Nama Gereja Lokal">{item.name}</InfoRow>
          <InfoRow label="Alamat Lokasi Ibadah">{item.worshipAddress}</InfoRow>
          <InfoRow label="Sekretariat Gereja">{item.secretariat}</InfoRow>
          <InfoRow label="Jam Ibadah">{item.serviceSchedule}</InfoRow>
          <InfoRow label="Gembala Jemaat">
            {item.gembala.length > 0 && (
              <span className="flex flex-col gap-1">
                {item.gembala.map((g) => (
                  <Link key={g.id} to={`/korwil/rohaniwan/${g.id}`} className="text-primary hover:underline">
                    {jabatanShort[g.jabatan]} {g.name}
                  </Link>
                ))}
              </span>
            )}
          </InfoRow>
          <InfoRow label="Catatan">{item.notes}</InfoRow>
        </dl>
      </SectionCard>

      <AttachmentPanel ownerType="GEREJA_LOKAL" ownerId={item.id} />

      {editing && (
        <GerejaLokalForm
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
          message={`Hapus gereja lokal ${item.name} beserta semua lampirannya? Tindakan ini tidak dapat dibatalkan.`}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </motion.div>
  );
}
