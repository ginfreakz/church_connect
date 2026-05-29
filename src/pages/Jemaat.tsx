import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Filter, Download, ChevronLeft, ChevronRight, Users, Pencil, Trash2, X } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

interface Jemaat {
  id: string;
  name: string;
  address: string;
  phone: string;
  status: string;
  initials: string;
}

interface EditForm {
  id: string;
  name: string;
  address: string;
  phone: string;
  status: string;
}

interface ConfirmState {
  mode: "edit" | "delete";
  target: Jemaat;
}

export default function Jemaat() {
  const [data, setData] = useState<Jemaat[]>([]);
  const [filter, setFilter] = useState("Semua Jemaat");
  const [sortBy, setSortBy] = useState("Nama A-Z");
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editing, setEditing] = useState<EditForm | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pageSize = 5;

  const loadData = async () => {
    const response = await fetch("/api/jemaat");
    const payload = await response.json();
    setData(payload);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, sortBy, query]);

  const activeCount = data.filter((item) => item.status === "Aktif").length;
  const inactiveCount = data.filter((item) => item.status === "Tidak Aktif").length;

  const stats = [
    { label: "Total Jemaat", value: String(data.length), growth: "Live", bg: "bg-sky-50", color: "text-sky-700" },
    { label: "Aktif", value: String(activeCount), growth: "+", bg: "bg-emerald-50", color: "text-emerald-700" },
    { label: "Tidak Aktif", value: String(inactiveCount), growth: "-", bg: "bg-rose-50", color: "text-rose-700" },
    { label: "Pelayan Aktif", value: String(Math.max(0, Math.round(activeCount * 0.3))), growth: "Estimasi", bg: "bg-purple-50", color: "text-purple-700" },
  ];

  const filterOptions = ["Semua Jemaat", "Aktif", "Tidak Aktif"];

  const filteredData = useMemo(() => {
    return data
      .filter((item) => {
        if (filter === "Aktif") return item.status === "Aktif";
        if (filter === "Tidak Aktif") return item.status === "Tidak Aktif";
        return true;
      })
      .filter((item) => {
        const normalized = query.toLowerCase();
        return (
          item.name.toLowerCase().includes(normalized)
          || item.address.toLowerCase().includes(normalized)
          || item.id.toLowerCase().includes(normalized)
        );
      })
      .sort((a, b) => {
        if (sortBy === "Terbaru") {
          return b.id.localeCompare(a.id);
        }
        return a.name.localeCompare(b.name);
      });
  }, [data, filter, query, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = filteredData.slice((safePage - 1) * pageSize, safePage * pageSize);

  const pageNumbers = useMemo(() => {
    const windowSize = 5;
    let start = Math.max(1, safePage - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    const pages: number[] = [];
    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }
    return pages;
  }, [safePage, totalPages]);

  const handleAddJemaat = async () => {
    const name = window.prompt("Nama jemaat baru:");
    if (!name) return;
    const address = window.prompt("Alamat:");
    if (!address) return;
    const phone = window.prompt("No HP:");
    if (!phone) return;
    const statusInput = window.prompt("Status (Aktif/Tidak Aktif)", "Aktif") || "Aktif";

    const response = await fetch("/api/jemaat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, address, phone, status: statusInput }),
    });

    if (!response.ok) {
      window.alert("Gagal menambah jemaat");
      return;
    }

    await loadData();
  };

  const handleDeleteJemaat = async (id: string) => {
    const response = await fetch(`/api/jemaat/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      window.alert("Gagal menghapus jemaat");
      return;
    }

    await loadData();
  };

  const handleEditJemaat = async (payload: EditForm) => {
    const response = await fetch(`/api/jemaat/${payload.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: payload.name,
        address: payload.address,
        phone: payload.phone,
        status: payload.status,
      }),
    });

    if (!response.ok) {
      window.alert("Gagal memperbarui jemaat");
      return;
    }

    await loadData();
  };

  const handleConfirmAction = async () => {
    if (!confirmState) return;
    setIsSubmitting(true);

    try {
      if (confirmState.mode === "delete") {
        await handleDeleteJemaat(confirmState.target.id);
      }

      if (confirmState.mode === "edit" && editing) {
        await handleEditJemaat(editing);
      }
    } finally {
      setIsSubmitting(false);
      setConfirmState(null);
      setEditing(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface mb-1">Data Jemaat</h2>
          <p className="font-body-md text-on-surface-variant">Kelola data seluruh anggota jemaat dan riwayat pelayanan mereka.</p>
        </div>
        <button onClick={handleAddJemaat} className="bg-primary text-on-primary px-6 py-2.5 rounded-lg flex items-center gap-2 font-label-lg shadow-sm hover:brightness-110 active:scale-95 transition-all">
          <Plus className="w-5 h-5" />
          Tambah Jemaat
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-2 rounded-lg", stat.bg, stat.color)}>
                <Users className="w-5 h-5" />
              </div>
              <span className="text-emerald-600 text-xs font-bold">{stat.growth}</span>
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
                  filter === opt
                    ? "bg-primary text-on-primary shadow-sm"
                    : "bg-white border border-outline-variant text-on-surface-variant hover:bg-slate-50",
                )}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama, alamat, ID"
                className="w-full bg-white border border-outline-variant rounded-lg py-2 pl-10 pr-8 text-sm focus:ring-2 focus:ring-primary/20 appearance-none outline-none"
              />
            </div>
            <div className="relative flex-1 md:w-64">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="w-full bg-white border border-outline-variant rounded-lg py-2 pl-10 pr-8 text-sm focus:ring-2 focus:ring-primary/20 appearance-none outline-none">
                <option>Nama A-Z</option>
                <option>Terbaru</option>
              </select>
            </div>
            <button className="p-2 border border-outline-variant rounded-lg text-outline hover:bg-slate-50 transition-colors">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-outline-variant/10">
                <th className="px-6 py-4 font-label-lg text-on-surface-variant">Nama</th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant">Alamat</th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant">No HP</th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant">Status</th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {paginatedData.map((jm) => (
                <tr key={jm.id} className="hover:bg-primary/5 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm", "bg-primary/10 text-primary")}>
                        {jm.initials}
                      </div>
                      <div>
                        <p className="font-label-lg text-on-surface font-semibold">{jm.name}</p>
                        <p className="text-[10px] text-on-surface-variant leading-none uppercase tracking-widest mt-0.5">ID: {jm.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-body-md text-on-surface-variant max-w-xs truncate">{jm.address}</p>
                  </td>
                  <td className="px-6 py-5 font-body-md">{jm.phone}</td>
                  <td className="px-6 py-5">
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full font-label-sm text-[11px] border shadow-sm",
                        jm.status === "Aktif" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-100",
                      )}
                    >
                      {jm.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditing({
                          id: jm.id,
                          name: jm.name,
                          address: jm.address,
                          phone: jm.phone,
                          status: jm.status,
                        })}
                        className="p-2 text-outline hover:text-primary transition-colors"
                        title="Edit data jemaat"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmState({ mode: "delete", target: jm })}
                        className="p-2 text-outline hover:text-error transition-colors"
                        title="Hapus jemaat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-outline-variant/10 flex justify-between items-center bg-slate-50/50">
          <p className="text-xs text-on-surface-variant">
            Menampilkan {(safePage - 1) * pageSize + (paginatedData.length ? 1 : 0)}-{(safePage - 1) * pageSize + paginatedData.length} dari {filteredData.length} jemaat
          </p>
          <div className="flex items-center gap-2">
            <button
              className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors"
              disabled={safePage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {pageNumbers.map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  "w-8 h-8 rounded text-xs transition-colors",
                  page === safePage ? "bg-primary text-on-primary font-bold shadow-sm" : "hover:bg-slate-200",
                )}
              >
                {page}
              </button>
            ))}
            <button
              className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-xl border border-outline-variant/30 shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-title-lg text-on-surface">Edit Jemaat</h3>
              <button onClick={() => setEditing(null)} className="p-1 rounded hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Nama</label>
                <input
                  value={editing.name}
                  onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                  className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Alamat</label>
                <input
                  value={editing.address}
                  onChange={(event) => setEditing({ ...editing, address: event.target.value })}
                  className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">No HP</label>
                <input
                  value={editing.phone}
                  onChange={(event) => setEditing({ ...editing, phone: event.target.value })}
                  className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Status</label>
                <select
                  value={editing.status}
                  onChange={(event) => setEditing({ ...editing, status: event.target.value })}
                  className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option>Aktif</option>
                  <option>Tidak Aktif</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border border-outline-variant hover:bg-slate-50">Batal</button>
              <button
                onClick={() => setConfirmState({
                  mode: "edit",
                  target: {
                    id: editing.id,
                    name: editing.name,
                    address: editing.address,
                    phone: editing.phone,
                    status: editing.status,
                    initials: "",
                  },
                })}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:brightness-110"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmState && (
        <div className="fixed inset-0 bg-black/40 z-[80] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl border border-outline-variant/30 shadow-xl p-6">
            <h3 className="font-title-lg text-on-surface mb-2">Konfirmasi</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              {confirmState.mode === "delete"
                ? `Hapus data jemaat ${confirmState.target.name}? Tindakan ini tidak dapat dibatalkan.`
                : `Simpan perubahan data jemaat ${confirmState.target.name}?`}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmState(null)} className="px-4 py-2 rounded-lg border border-outline-variant hover:bg-slate-50" disabled={isSubmitting}>Batal</button>
              <button onClick={handleConfirmAction} className={cn("px-4 py-2 rounded-lg text-white", confirmState.mode === "delete" ? "bg-rose-600 hover:bg-rose-700" : "bg-primary hover:brightness-110")} disabled={isSubmitting}>
                {isSubmitting ? "Memproses..." : "Ya, Lanjutkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
