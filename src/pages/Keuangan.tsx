import { useEffect, useMemo, useState } from "react";
import { Download, Plus, Calendar, ChevronDown, MoreVertical, TrendingUp, TrendingDown, Landmark, ChevronLeft, ChevronRight } from "lucide-react";
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

export default function Keuangan() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [typeFilter, setTypeFilter] = useState("Semua Jenis");
  const [categoryFilter, setCategoryFilter] = useState("Semua Kategori");

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
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const chartData = useMemo(() => {
    return transactions.slice(0, 6).reverse().map((tx, index) => ({
      name: tx.date.split(" ")[1]?.toUpperCase() || `M${index + 1}`,
      income: tx.amount > 0 ? Math.round(tx.amount / 100000) : 0,
      expense: tx.amount < 0 ? Math.round(Math.abs(tx.amount) / 100000) : 0,
    }));
  }, [transactions]);

  const distributionData = useMemo(() => {
    const grouped = transactions.reduce<Record<string, number>>((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + Math.abs(tx.amount);
      return acc;
    }, {});

    return Object.entries(grouped)
      .slice(0, 4)
      .map(([name, value], index) => ({
        name,
        value: Math.round((value / Math.max(1, totals.income + totals.expense)) * 100),
        color: ["#0ea5e9", "#6366f1", "#10b981", "#f59e0b"][index % 4],
      }));
  }, [transactions, totals.expense, totals.income]);

  const handleCreateTransaction = async () => {
    const date = window.prompt("Tanggal transaksi (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    if (!date) return;
    const type = window.prompt("Jenis transaksi (Pemasukan/Pengeluaran):", "Pemasukan");
    if (!type) return;
    const category = window.prompt("Kategori transaksi:", "Persembahan");
    if (!category) return;
    const amountInput = window.prompt("Nominal (angka saja):", "1000000");
    if (!amountInput) return;
    const note = window.prompt("Keterangan:", "Input manual dari dashboard");
    if (!note) return;

    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        type,
        category,
        amount: Number(amountInput),
        note,
      }),
    });

    if (!response.ok) {
      window.alert("Gagal menambah transaksi");
      return;
    }

    await loadTransactions();
  };

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface mb-1">Buku Kas Utama</h2>
          <p className="font-body-md text-on-surface-variant">Kelola pemasukan dan pengeluaran gereja secara transparan dan akuntabel.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-primary text-primary font-label-lg rounded-lg hover:bg-primary/5 transition-all">
            <Download className="w-5 h-5" />
            Ekspor Laporan
          </button>
          <button onClick={handleCreateTransaction} className="flex items-center gap-2 px-6 py-2 bg-primary text-on-primary font-label-lg rounded-lg shadow-sm hover:shadow-lg hover:brightness-110 active:scale-95 transition-all">
            <Plus className="w-5 h-5" />
            Transaksi Baru
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
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
            <h3 className={cn("text-2xl font-bold tracking-tight", i === 2 ? "text-sky-700" : "text-slate-900")}>{formatCurrency(stat.value)}</h3>
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
              {Array.from(new Set(transactions.map((tx) => tx.category))).map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>
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
                <th className="px-6 py-4 font-label-lg text-slate-500 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx, i) => (
                <tr key={i} className="hover:bg-primary/5 transition-all group">
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
                  <td className="px-6 py-5 text-right">
                    <button className="p-1 text-slate-400 hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-slate-50/30">
          <p className="text-sm text-slate-500">Menampilkan {transactions.length} transaksi</p>
          <div className="flex gap-2">
            <button className={cn("p-1.5 border border-outline-variant/30 rounded bg-white hover:bg-slate-50 transition-colors shadow-sm")}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="px-3.5 py-1.5 bg-primary text-white rounded text-sm font-bold shadow-md">1</button>
            <button className="px-3.5 py-1.5 border border-outline-variant/30 bg-white rounded text-sm hover:bg-slate-50 transition-colors shadow-sm">2</button>
            <button className="px-3.5 py-1.5 border border-outline-variant/30 bg-white rounded text-sm hover:bg-slate-50 transition-colors shadow-sm">3</button>
            <button className={cn("p-1.5 border border-outline-variant/30 rounded bg-white hover:bg-slate-50 transition-colors shadow-sm")}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

        <div className="bg-white p-8 rounded-xl border border-outline-variant/30 shadow-sm flex flex-col">
          <h4 className="font-title-lg text-slate-800 mb-8">Distribusi Kategori</h4>
          <div className="flex-1 space-y-6">
            {distributionData.map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600 font-medium">{item.name}</span>
                  <span className="font-bold text-slate-800">{item.value}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className="h-full rounded-full shadow-inner"
                    style={{ backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold">Basis Perhitungan Bulanan</p>
            <button className="text-xs text-primary font-bold hover:underline">Detail Penuh</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
