import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { AlertTriangle, ChevronRight, Paperclip, Plus, Search, UserRound, Users } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { apiJson, initialsOf, jabatanShort, worstExpiry, type Rohaniwan } from "@/src/lib/korwil";
import { RohaniwanForm } from "@/src/components/korwil/RohaniwanForm";
import { ExpiryBadge, Pagination, usePaged } from "@/src/components/korwil/ui";

type Mode = "gembala" | "pendeta";

const copy: Record<Mode, { kicker: string; title: string; subtitle: string; add: string }> = {
  gembala: {
    kicker: "Arsip JKI Korwil Jabar · 02",
    title: "Data Gembala Jemaat",
    subtitle: "Gembala jemaat beserta kartu NIR, kartu kependetaan, dan SK Pengangkatan Gembala.",
    add: "Tambah Gembala",
  },
  pendeta: {
    kicker: "Arsip JKI Korwil Jabar · 03",
    title: "Data Pendeta Muda (Pdm.) & Pendeta (Pdt.)",
    subtitle: "Seluruh Pdm. dan Pdt. beserta kartu NIR, kartu kependetaan, serta SK & Sertifikat Penahbisan.",
    add: "Tambah Pendeta",
  },
};

const filterOptions = ["Semua", "Pdm.", "Pdt.", "Perlu Perpanjangan"] as const;
type FilterOption = (typeof filterOptions)[number];

const needsRenewal = (item: Rohaniwan) => {
  const status = worstExpiry(item.nirExpiry, item.cardExpiry);
  return status === "soon" || status === "expired";
};

export default function RohaniwanList({ mode }: { mode: Mode }) {
  const navigate = useNavigate();
  const [data, setData] = useState<Rohaniwan[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterOption>("Semua");
  const [adding, setAdding] = useState(false);
  const text = copy[mode];

  useEffect(() => {
    setLoading(true);
    setFilter("Semua");
    setQuery("");
    apiJson<Rohaniwan[]>(`/api/korwil/rohaniwan${mode === "gembala" ? "?gembala=1" : ""}`)
      .then(setData)
      .catch((error) => window.alert(error.message))
      .finally(() => setLoading(false));
  }, [mode]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return data
      .filter((item) => {
        if (filter === "Pdm.") return item.jabatan === "PDM";
        if (filter === "Pdt.") return item.jabatan === "PDT";
        if (filter === "Perlu Perpanjangan") return needsRenewal(item);
        return true;
      })
      .filter((item) =>
        item.name.toLowerCase().includes(q)
        || item.nir.toLowerCase().includes(q)
        || item.cardNumber.toLowerCase().includes(q)
        || (item.gerejaLokalName ?? "").toLowerCase().includes(q)
        || item.phone.includes(q),
      );
  }, [data, query, filter]);

  const paged = usePaged(filtered, 10, `${query}|${filter}|${mode}`);

  const stats = [
    { label: mode === "gembala" ? "Total Gembala" : "Total Rohaniwan", value: data.length, icon: Users, bg: "bg-sky-50", color: "text-sky-700" },
    { label: "Pendeta Muda (Pdm.)", value: data.filter((d) => d.jabatan === "PDM").length, icon: UserRound, bg: "bg-emerald-50", color: "text-emerald-700" },
    { label: "Pendeta (Pdt.)", value: data.filter((d) => d.jabatan === "PDT").length, icon: UserRound, bg: "bg-purple-50", color: "text-purple-700" },
    { label: "Perlu Perpanjangan", value: data.filter(needsRenewal).length, icon: AlertTriangle, bg: "bg-amber-50", color: "text-amber-700" },
  ];

  return (
    <motion.div key={mode} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">{text.kicker}</p>
          <h2 className="font-headline-md text-on-surface mb-1">{text.title}</h2>
          <p className="font-body-md text-on-surface-variant">{text.subtitle}</p>
        </div>
        <button onClick={() => setAdding(true)} className="bg-primary text-on-primary px-6 py-2.5 rounded-lg flex items-center gap-2 font-label-lg shadow-sm hover:brightness-110 active:scale-95 transition-all">
          <Plus className="w-5 h-5" />
          {text.add}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
        <div className="p-6 border-b border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/30">
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {filterOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={cn(
                  "px-4 py-1.5 rounded-full font-label-sm transition-all whitespace-nowrap",
                  filter === opt ? "bg-primary text-on-primary shadow-sm" : "bg-white border border-outline-variant text-on-surface-variant hover:bg-slate-50",
                )}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama, NIR, no kartu, gereja"
              className="w-full bg-white border border-outline-variant rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-outline-variant/10">
                <th className="px-6 py-4 font-label-lg text-on-surface-variant">Nama</th>
                {mode === "gembala"
                  ? <th className="px-6 py-4 font-label-lg text-on-surface-variant">Gereja Lokal</th>
                  : <th className="px-6 py-4 font-label-lg text-on-surface-variant">Kartu Kependetaan</th>}
                <th className="px-6 py-4 font-label-lg text-on-surface-variant">NIR</th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant">No HP</th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant">Masa Berlaku</th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant text-center">Lampiran</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {paged.pageItems.map((item) => (
                <tr key={item.id} onClick={() => navigate(`/korwil/rohaniwan/${item.id}`)} className="hover:bg-primary/5 transition-colors cursor-pointer">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-primary/10 text-primary shrink-0">
                        {initialsOf(item.name)}
                      </div>
                      <div>
                        <p className="font-label-lg text-on-surface font-semibold">
                          {jabatanShort[item.jabatan]} {item.name}
                          {mode === "pendeta" && item.isGembala && (
                            <span className="ml-2 align-middle px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-100">GEMBALA</span>
                          )}
                        </p>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-0.5">ID: {item.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-body-md">
                    {mode === "gembala" ? (item.gerejaLokalName || "-") : (item.cardNumber || "-")}
                  </td>
                  <td className="px-6 py-5 font-body-md whitespace-nowrap">{item.nir || "-"}</td>
                  <td className="px-6 py-5 font-body-md whitespace-nowrap">{item.phone || "-"}</td>
                  <td className="px-6 py-5">
                    <ExpiryBadge status={worstExpiry(item.nirExpiry, item.cardExpiry)} />
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
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                    {data.length === 0 ? `Belum ada data. Klik "${text.add}" untuk memulai.` : "Tidak ada data yang cocok."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination {...paged} count={paged.pageItems.length} unit="orang" />
      </div>

      {adding && (
        <RohaniwanForm
          defaultGembala={mode === "gembala"}
          onClose={() => setAdding(false)}
          onSaved={(saved) => navigate(`/korwil/rohaniwan/${saved.id}`)}
        />
      )}
    </motion.div>
  );
}
