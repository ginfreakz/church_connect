import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Church, ChevronRight, Paperclip, Plus, Search, UserCheck } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { apiJson, jabatanShort, type GerejaLokal } from "@/src/lib/korwil";
import { GerejaLokalForm } from "@/src/components/korwil/GerejaLokalForm";
import { Pagination, usePaged } from "@/src/components/korwil/ui";

export default function GerejaLokalList() {
  const navigate = useNavigate();
  const [data, setData] = useState<GerejaLokal[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    apiJson<GerejaLokal[]>("/api/korwil/gereja-lokal")
      .then(setData)
      .catch((error) => window.alert(error.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return data.filter((item) =>
      item.name.toLowerCase().includes(q)
      || item.worshipAddress.toLowerCase().includes(q)
      || item.id.toLowerCase().includes(q)
      || item.gembala.some((g) => g.name.toLowerCase().includes(q)),
    );
  }, [data, query]);

  const paged = usePaged(filtered, 10, query);

  const stats = [
    { label: "Total Gereja Lokal", value: data.length, icon: Church, bg: "bg-sky-50", color: "text-sky-700" },
    { label: "Sudah Ada Gembala", value: data.filter((g) => g.gembala.length > 0).length, icon: UserCheck, bg: "bg-emerald-50", color: "text-emerald-700" },
    { label: "Total Lampiran", value: data.reduce((sum, g) => sum + g.lampiranCount, 0), icon: Paperclip, bg: "bg-purple-50", color: "text-purple-700" },
  ];

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Arsip JKI Korwil Jabar · 01</p>
          <h2 className="font-headline-md text-on-surface mb-1">Data Gereja Lokal</h2>
          <p className="font-body-md text-on-surface-variant">Data gereja lokal beserta SK Penetapan dan Surat Keterangan Tanda Lapor.</p>
        </div>
        <button onClick={() => setAdding(true)} className="bg-primary text-on-primary px-6 py-2.5 rounded-lg flex items-center gap-2 font-label-lg shadow-sm hover:brightness-110 active:scale-95 transition-all">
          <Plus className="w-5 h-5" />
          Tambah Gereja Lokal
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm">
            <div className={cn("p-2 rounded-lg w-fit mb-4", stat.bg, stat.color)}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="font-label-sm text-on-surface-variant uppercase tracking-widest">{stat.label}</p>
            <h3 className="font-headline-md mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10 flex justify-end bg-slate-50/30">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama gereja, alamat, gembala"
              className="w-full bg-white border border-outline-variant rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-outline-variant/10">
                <th className="px-6 py-4 font-label-lg text-on-surface-variant">Nama Gereja</th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant">Alamat Lokasi Ibadah</th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant">Gembala</th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant text-center">Lampiran</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {paged.pageItems.map((item) => (
                <tr key={item.id} onClick={() => navigate(`/korwil/gereja-lokal/${item.id}`)} className="hover:bg-primary/5 transition-colors cursor-pointer">
                  <td className="px-6 py-5">
                    <p className="font-label-lg text-on-surface font-semibold">{item.name}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-0.5">ID: {item.id}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-body-md text-on-surface-variant max-w-xs truncate">{item.worshipAddress}</p>
                  </td>
                  <td className="px-6 py-5 font-body-md">
                    {item.gembala.length
                      ? item.gembala.map((g) => `${jabatanShort[g.jabatan]} ${g.name}`).join(", ")
                      : <span className="text-on-surface-variant">-</span>}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="inline-flex items-center gap-1 text-sm text-on-surface-variant">
                      <Paperclip className="w-3.5 h-3.5" /> {item.lampiranCount}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right text-outline">
                    <ChevronRight className="w-5 h-5 inline" />
                  </td>
                </tr>
              ))}
              {!loading && paged.pageItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                    {data.length === 0 ? "Belum ada data gereja lokal. Klik \"Tambah Gereja Lokal\" untuk memulai." : "Tidak ada data yang cocok dengan pencarian."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination {...paged} count={paged.pageItems.length} unit="gereja" />
      </div>

      {adding && (
        <GerejaLokalForm
          onClose={() => setAdding(false)}
          onSaved={(saved) => navigate(`/korwil/gereja-lokal/${saved.id}`)}
        />
      )}
    </motion.div>
  );
}
