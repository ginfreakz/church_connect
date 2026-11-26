import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { CalendarDays, ChevronRight, FilePen, Inbox, Mail, Paperclip, Plus, Search, Send, Settings } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { apiJson, formatDateId, type Surat, type SuratDirection } from "@/src/lib/korwil";
import { SuratForm } from "@/src/components/korwil/SuratForm";
import { Pagination, usePaged } from "@/src/components/korwil/ui";

const filterOptions = ["Semua", "Surat Keluar", "Surat Masuk"] as const;
type FilterOption = (typeof filterOptions)[number];

export function DirectionBadge({ direction }: { direction: SuratDirection }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap",
        direction === "KELUAR" ? "bg-sky-50 text-sky-700 border-sky-100" : "bg-emerald-50 text-emerald-700 border-emerald-100",
      )}
    >
      {direction === "KELUAR" ? <Send className="w-3 h-3" /> : <Inbox className="w-3 h-3" />}
      {direction === "KELUAR" ? "Keluar" : "Masuk"}
    </span>
  );
}

export default function SuratList() {
  const navigate = useNavigate();
  const [data, setData] = useState<Surat[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterOption>("Semua");
  const [year, setYear] = useState("Semua Tahun");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    apiJson<Surat[]>("/api/korwil/surat")
      .then(setData)
      .catch((error) => window.alert(error.message))
      .finally(() => setLoading(false));
  }, []);

  const years = useMemo(
    () => Array.from(new Set(data.map((s) => s.letterDate.slice(0, 4)))).sort().reverse(),
    [data],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return data
      .filter((item) => {
        if (filter === "Surat Keluar") return item.direction === "KELUAR";
        if (filter === "Surat Masuk") return item.direction === "MASUK";
        return true;
      })
      .filter((item) => year === "Semua Tahun" || item.letterDate.startsWith(year))
      .filter((item) =>
        item.letterNumber.toLowerCase().includes(q)
        || item.subject.toLowerCase().includes(q)
        || item.counterparty.toLowerCase().includes(q)
        || item.category.toLowerCase().includes(q),
      );
  }, [data, query, filter, year]);

  const paged = usePaged(filtered, 10, `${query}|${filter}|${year}`);

  const thisYear = String(new Date().getFullYear());
  const stats = [
    { label: "Total Surat", value: data.length, icon: Mail, bg: "bg-sky-50", color: "text-sky-700" },
    { label: "Surat Keluar", value: data.filter((s) => s.direction === "KELUAR").length, icon: Send, bg: "bg-indigo-50", color: "text-indigo-700" },
    { label: "Surat Masuk", value: data.filter((s) => s.direction === "MASUK").length, icon: Inbox, bg: "bg-emerald-50", color: "text-emerald-700" },
    { label: `Tahun ${thisYear}`, value: data.filter((s) => s.letterDate.startsWith(thisYear)).length, icon: CalendarDays, bg: "bg-purple-50", color: "text-purple-700" },
  ];

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Arsip JKI Korwil Jabar · 04</p>
          <h2 className="font-headline-md text-on-surface mb-1">Surat Menyurat</h2>
          <p className="font-body-md text-on-surface-variant">Buat surat keluar dari aplikasi, atau catat surat masuk/keluar beserta foto/scan suratnya.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/korwil/surat/kop-surat" className="px-4 py-2.5 rounded-lg border border-outline-variant bg-white hover:bg-slate-50 flex items-center gap-2 font-label-lg" title="Pengaturan kop surat">
            <Settings className="w-5 h-5" />
            Kop Surat
          </Link>
          <button onClick={() => setAdding(true)} className="px-4 py-2.5 rounded-lg border border-outline-variant bg-white hover:bg-slate-50 flex items-center gap-2 font-label-lg">
            <Plus className="w-5 h-5" />
            Catat Surat
          </button>
          <Link to="/korwil/surat/buat" className="bg-primary text-on-primary px-6 py-2.5 rounded-lg flex items-center gap-2 font-label-lg shadow-sm hover:brightness-110 active:scale-95 transition-all">
            <FilePen className="w-5 h-5" />
            Buat Surat
          </Link>
        </div>
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
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="bg-white border border-outline-variant rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option>Semua Tahun</option>
              {years.map((y) => <option key={y}>{y}</option>)}
            </select>
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari no surat, perihal, kepada/dari"
                className="w-full bg-white border border-outline-variant rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-outline-variant/10">
                <th className="px-6 py-4 font-label-lg text-on-surface-variant">Tanggal</th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant">No Surat</th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant">Perihal</th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant">Kepada / Dari</th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant">Jenis</th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant text-center">Lampiran</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {paged.pageItems.map((item) => (
                <tr key={item.id} onClick={() => navigate(`/korwil/surat/${item.id}`)} className="hover:bg-primary/5 transition-colors cursor-pointer">
                  <td className="px-6 py-5 font-body-md whitespace-nowrap">{formatDateId(item.letterDate)}</td>
                  <td className="px-6 py-5 font-body-md whitespace-nowrap">{item.letterNumber}</td>
                  <td className="px-6 py-5">
                    <p className="font-label-lg text-on-surface font-semibold flex items-center gap-1.5">
                      {item.content && <span title="Dibuat di aplikasi"><FilePen className="w-3.5 h-3.5 text-primary shrink-0" /></span>}
                      {item.subject}
                    </p>
                    {item.category && <p className="text-xs text-on-surface-variant mt-0.5">{item.category}</p>}
                  </td>
                  <td className="px-6 py-5 font-body-md text-on-surface-variant">{item.counterparty || "-"}</td>
                  <td className="px-6 py-5"><DirectionBadge direction={item.direction} /></td>
                  <td className="px-6 py-5 text-center">
                    <span className={cn("inline-flex items-center gap-1 text-sm", item.lampiranCount || item.content ? "text-on-surface-variant" : "text-amber-600 font-semibold")}>
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
                    {data.length === 0 ? "Belum ada surat. Klik \"Buat Surat\" atau \"Catat Surat\" untuk memulai." : "Tidak ada surat yang cocok."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination {...paged} count={paged.pageItems.length} unit="surat" />
      </div>

      {adding && (
        <SuratForm
          defaultDirection={filter === "Surat Masuk" ? "MASUK" : "KELUAR"}
          onClose={() => setAdding(false)}
          onSaved={(saved) => navigate(`/korwil/surat/${saved.id}`)}
        />
      )}
    </motion.div>
  );
}
