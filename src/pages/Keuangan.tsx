import { useEffect, useMemo, useState } from "react";
import { Download, Plus, Calendar, ChevronDown, TrendingUp, TrendingDown, Landmark, ChevronLeft, ChevronRight, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

interface Transaction {
  date: string;
  type: string;
  category: string;
  amount: number;
  note: string;
}

interface TransactionForm {
  date: string;
  type: string;
  category: string;
  amount: string;
  note: string;
}

interface AuthUser {
  id: number;
}

export default function Keuangan() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [typeFilter, setTypeFilter] = useState("Semua Jenis");
  const [categoryFilter, setCategoryFilter] = useState("Semua Kategori");
  const [currentPage, setCurrentPage] = useState(1);
  const [showTxModal, setShowTxModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);
  const [openingBalanceInput, setOpeningBalanceInput] = useState("");
  const [txForm, setTxForm] = useState<TransactionForm>({
    date: new Date().toISOString().slice(0, 10),
    type: "Pemasukan",
    category: "",
    amount: "",
    note: "",
  });

  const [openingBalance, setOpeningBalance] = useState<number>(0);

  const getAuthUser = (): AuthUser | null => {
    const raw = localStorage.getItem("church-connect-auth");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as AuthUser;
      if (typeof parsed.id === "number") return parsed;
      return null;
    } catch {
      return null;
    }
  };

  const loadTransactions = async (nextType = typeFilter, nextCategory = categoryFilter) => {
    const params = new URLSearchParams();
    if (nextType !== "Semua Jenis") params.set("type", nextType);
    if (nextCategory !== "Semua Kategori") params.set("category", nextCategory);

    const response = await fetch(`/api/transactions${params.toString() ? `?${params.toString()}` : ""}`);
    const payload = await response.json();
    setTransactions(payload);
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    const loadOpeningBalance = async () => {
      const user = getAuthUser();
      if (!user) return;

      const response = await fetch("/api/users/opening-balance", {
        headers: {
          "x-user-id": String(user.id),
        },
      });

      if (!response.ok) return;
      const payload = await response.json();
      setOpeningBalance(payload.openingBalance || 0);
    };

    loadOpeningBalance();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, categoryFilter, transactions.length]);

  const formatCurrency = (val: number) => {
    const absVal = Math.abs(val);
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(absVal).replace("Rp", val < 0 ? "- Rp" : "Rp ");
  };

  const totals = useMemo(() => {
    const income = transactions.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
    const expense = transactions.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const balance = openingBalance + income - expense;
    return { income, expense, balance };
  }, [transactions, openingBalance]);

  const chartData = useMemo(() => {
    return transactions.slice(0, 6).reverse().map((tx, index) => ({
      name: tx.date.split(" ")[1]?.toUpperCase() || `M${index + 1}`,
      income: tx.amount > 0 ? Math.round(tx.amount / 100000) : 0,
      expense: tx.amount < 0 ? Math.round(Math.abs(tx.amount) / 100000) : 0,
    }));
  }, [transactions]);

  const categoryOptions = useMemo(() => {
    return Array.from(new Set(transactions.map((tx) => tx.category))).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTransactions = transactions.slice((safePage - 1) * pageSize, safePage * pageSize);

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

  const handleExportTransactions = () => {
    const rows = [
      ["Tanggal", "Jenis", "Kategori", "Nominal", "Keterangan"],
      ...transactions.map((tx) => [tx.date, tx.type, tx.category, String(tx.amount), tx.note]),
    ];
    const csv = rows.map((row) => row.map((col) => `"${String(col).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "keuangan-transaksi.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateTransaction = async () => {
    if (!txForm.date || !txForm.type || !txForm.category || !txForm.amount || !txForm.note) {
      window.alert("Semua field transaksi wajib diisi.");
      return;
    }

    setIsSubmittingTx(true);
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: txForm.date,
          type: txForm.type,
          category: txForm.category,
          amount: Number(txForm.amount),
          note: txForm.note,
        }),
      });

      if (!response.ok) {
        window.alert("Gagal menambah transaksi");
        return;
      }

      setShowTxModal(false);
      setTxForm({
        date: new Date().toISOString().slice(0, 10),
        type: "Pemasukan",
        category: "",
        amount: "",
        note: "",
      });
      await loadTransactions();
    } finally {
      setIsSubmittingTx(false);
    }
  };

  const handleSaveOpeningBalance = async () => {
    const parsed = Number(openingBalanceInput);
    if (!Number.isFinite(parsed)) {
      window.alert("Saldo awal harus berupa angka.");
      return;
    }

    const user = getAuthUser();
    if (!user) {
      window.alert("Sesi user tidak ditemukan. Silakan login ulang.");
      return;
    }

    const response = await fetch("/api/users/opening-balance", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": String(user.id),
      },
      body: JSON.stringify({ openingBalance: parsed }),
    });

    if (!response.ok) {
      window.alert("Gagal menyimpan saldo awal");
      return;
    }

    const payload = await response.json();
    setOpeningBalance(payload.openingBalance || 0);
    setShowBalanceModal(false);
    setOpeningBalanceInput("");
  };

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface mb-1">Buku Kas Utama</h2>
          <p className="font-body-md text-on-surface-variant">Kelola pemasukan dan pengeluaran gereja secara transparan dan akuntabel.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExportTransactions} className="flex items-center gap-2 px-4 py-2 border border-primary text-primary font-label-lg rounded-lg hover:bg-primary/5 transition-all">
            <Download className="w-5 h-5" />
            Ekspor Transaksi CSV
          </button>
          <button
            onClick={() => setShowTxModal(true)}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-on-primary font-label-lg rounded-lg shadow-sm hover:shadow-lg hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
            Transaksi Baru
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Saldo Awal", value: openingBalance, growth: "Manual", icon: Calendar, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Total Pemasukan", value: totals.income, growth: "Live", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Total Pengeluaran", value: totals.expense, growth: "Live", icon: TrendingDown, color: "text-rose-600", bg: "bg-rose-50" },
          { label: "Saldo Kas Saat Ini", value: totals.balance, growth: "Live", icon: Landmark, color: "text-sky-600", bg: "bg-sky-50" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-3 rounded-lg", stat.bg, stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className={cn("text-xs font-bold px-2 py-1 rounded", stat.bg, stat.color)}>{stat.growth}</span>
            </div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">{stat.label}</p>
            <h3 className={cn("text-2xl font-bold tracking-tight", i === 3 ? "text-sky-700" : "text-slate-900")}>{formatCurrency(stat.value)}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10 flex flex-wrap items-center gap-4 bg-slate-50/20">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 shadow-inner">Rentang Tanggal</label>
            <div className="flex items-center bg-white px-3 py-2 rounded-lg border border-outline-variant/30 cursor-pointer hover:border-primary/40 transition-colors">
              <Calendar className="w-4 h-4 text-outline mr-2" />
              <span className="text-sm text-slate-700">Data transaksi tersimpan</span>
              <ChevronDown className="w-4 h-4 text-outline ml-auto" />
            </div>
          </div>
          <div className="w-48">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Jenis Transaksi</label>
            <select
              value={typeFilter}
              onChange={async (event) => {
                const value = event.target.value;
                setTypeFilter(value);
                await loadTransactions(value, categoryFilter);
              }}
              className="w-full bg-white border border-outline-variant/30 rounded-lg py-2 px-3 text-sm text-slate-700 focus:ring-2 focus:ring-primary/10 outline-none"
            >
              <option>Semua Jenis</option>
              <option>Pemasukan</option>
              <option>Pengeluaran</option>
            </select>
          </div>
          <div className="w-48">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Kategori</label>
            <select
              value={categoryFilter}
              onChange={async (event) => {
                const value = event.target.value;
                setCategoryFilter(value);
                await loadTransactions(typeFilter, value);
              }}
              className="w-full bg-white border border-outline-variant/30 rounded-lg py-2 px-3 text-sm text-slate-700 focus:ring-2 focus:ring-primary/10 outline-none"
            >
              <option>Semua Kategori</option>
              {categoryOptions.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              setOpeningBalanceInput(String(openingBalance));
              setShowBalanceModal(true);
            }}
            className="ml-auto px-4 py-2 rounded-lg border border-outline-variant text-slate-700 hover:bg-slate-50"
          >
            Atur Saldo Awal
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-outline-variant/20">
                <th className="px-6 py-4 font-label-lg text-slate-500 uppercase tracking-widest">Tanggal</th>
                <th className="px-6 py-4 font-label-lg text-slate-500 uppercase tracking-widest">Jenis</th>
                <th className="px-6 py-4 font-label-lg text-slate-500 uppercase tracking-widest">Kategori</th>
                <th className="px-6 py-4 font-label-lg text-slate-500 uppercase tracking-widest">Nominal</th>
                <th className="px-6 py-4 font-label-lg text-slate-500 uppercase tracking-widest">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTransactions.map((tx, i) => (
                <tr key={`${tx.date}-${tx.category}-${i}`} className="hover:bg-primary/5 transition-all group">
                  <td className="px-6 py-5 text-sm font-medium text-slate-700">{tx.date}</td>
                  <td className="px-6 py-5">
                    <span
                      className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider",
                        tx.type === "Pemasukan" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800",
                      )}
                    >
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm text-slate-700">{tx.category}</td>
                  <td className={cn("px-6 py-5 font-bold text-sm", tx.amount > 0 ? "text-emerald-600" : "text-rose-600")}>{formatCurrency(tx.amount)}</td>
                  <td className="px-6 py-5 text-sm text-slate-500 max-w-xs truncate">{tx.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-slate-50/30">
          <p className="text-sm text-slate-500">
            Menampilkan {(safePage - 1) * pageSize + (paginatedTransactions.length ? 1 : 0)}-{(safePage - 1) * pageSize + paginatedTransactions.length} dari {transactions.length} transaksi
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage === 1}
              className={cn("p-1.5 border border-outline-variant/30 rounded bg-white transition-colors shadow-sm", safePage === 1 ? "opacity-30" : "hover:bg-slate-50")}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {pageNumbers.map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  "w-8 h-8 rounded text-xs transition-colors",
                  page === safePage ? "bg-primary text-on-primary font-bold" : "bg-white border border-outline-variant/30 hover:bg-slate-50",
                )}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safePage >= totalPages}
              className={cn("p-1.5 border border-outline-variant/30 rounded bg-white transition-colors shadow-sm", safePage >= totalPages ? "opacity-30" : "hover:bg-slate-50")}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl border border-outline-variant/30 shadow-sm">
        <h4 className="font-title-lg text-slate-800 mb-8">Pemasukan vs Pengeluaran</h4>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip cursor={{ fill: "transparent" }} />
              <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} name="Pemasukan" />
              <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={16} name="Pengeluaran" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {showTxModal && (
        <div className="fixed inset-0 bg-black/40 z-[80] flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-xl border border-outline-variant/30 shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-title-lg text-on-surface">Transaksi Baru</h3>
              <button onClick={() => setShowTxModal(false)} className="p-1 rounded hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Tanggal</label>
                <input
                  type="date"
                  value={txForm.date}
                  onChange={(event) => setTxForm((prev) => ({ ...prev, date: event.target.value }))}
                  className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Jenis</label>
                <select
                  value={txForm.type}
                  onChange={(event) => setTxForm((prev) => ({ ...prev, type: event.target.value }))}
                  className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option>Pemasukan</option>
                  <option>Pengeluaran</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Kategori</label>
                <input
                  value={txForm.category}
                  onChange={(event) => setTxForm((prev) => ({ ...prev, category: event.target.value }))}
                  placeholder="Contoh: Persembahan Mingguan"
                  className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Nominal</label>
                <input
                  type="number"
                  min="0"
                  value={txForm.amount}
                  onChange={(event) => setTxForm((prev) => ({ ...prev, amount: event.target.value }))}
                  placeholder="1000000"
                  className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-1">Keterangan</label>
                <textarea
                  value={txForm.note}
                  onChange={(event) => setTxForm((prev) => ({ ...prev, note: event.target.value }))}
                  rows={3}
                  placeholder="Catatan transaksi"
                  className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowTxModal(false)} className="px-4 py-2 rounded-lg border border-outline-variant hover:bg-slate-50" disabled={isSubmittingTx}>Batal</button>
              <button onClick={handleCreateTransaction} className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:brightness-110" disabled={isSubmittingTx}>
                {isSubmittingTx ? "Menyimpan..." : "Simpan Transaksi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBalanceModal && (
        <div className="fixed inset-0 bg-black/40 z-[80] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl border border-outline-variant/30 shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-title-lg text-on-surface">Atur Saldo Awal</h3>
              <button onClick={() => setShowBalanceModal(false)} className="p-1 rounded hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Nominal Saldo Awal</label>
              <input
                type="number"
                value={openingBalanceInput}
                onChange={(event) => setOpeningBalanceInput(event.target.value)}
                className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
              <p className="text-xs text-slate-500 mt-2">Nilai ini digunakan untuk perhitungan Saldo Kas Saat Ini pada halaman Keuangan.</p>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowBalanceModal(false)} className="px-4 py-2 rounded-lg border border-outline-variant hover:bg-slate-50">Batal</button>
              <button onClick={handleSaveOpeningBalance} className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:brightness-110">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
