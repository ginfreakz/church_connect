import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, TrendingUp, Wallet, RefreshCw, UserPlus, ReceiptText } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

interface Stats {
  totalJemaat: number;
  pemasukan: number;
  pengeluaran: number;
  growth: string;
}

interface JemaatItem {
  id: string;
  name: string;
  status: string;
}

interface TransactionItem {
  date: string;
  type: string;
  category: string;
  amount: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [jemaatTerbaru, setJemaatTerbaru] = useState<JemaatItem[]>([]);
  const [transaksiTerbaru, setTransaksiTerbaru] = useState<TransactionItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val).replace("Rp", "Rp ");
  };

  const loadDashboardData = async () => {
    setIsRefreshing(true);
    try {
      const [statsRes, jemaatRes, txRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/jemaat"),
        fetch("/api/transactions"),
      ]);

      const [statsPayload, jemaatPayload, txPayload] = await Promise.all([
        statsRes.json(),
        jemaatRes.json(),
        txRes.json(),
      ]);

      setStats(statsPayload);
      setJemaatTerbaru((jemaatPayload || []).slice(0, 5));
      setTransaksiTerbaru((txPayload || []).slice(0, 5));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const overviewCards = [
    { label: "Total Jemaat", value: stats?.totalJemaat || 0, unit: "Jiwa", icon: Users, color: "text-primary", bg: "bg-primary/10", accent: stats?.growth || "Live" },
    { label: "Total Pemasukan", value: stats ? formatCurrency(stats.pemasukan) : "Rp 0", unit: "", icon: TrendingUp, color: "text-secondary", bg: "bg-secondary/10", accent: "Live" },
    { label: "Total Pengeluaran", value: stats ? formatCurrency(stats.pengeluaran) : "Rp 0", unit: "", icon: Wallet, color: "text-error", bg: "bg-error/10", accent: "Live" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface mb-1">Dashboard Ringkasan</h2>
          <p className="font-body-md text-on-surface-variant">Ringkasan fitur aktif dan data terbaru sistem.</p>
        </div>
        <button
          onClick={loadDashboardData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-slate-50"
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          {isRefreshing ? "Menyegarkan..." : "Refresh Data"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {overviewCards.map((card, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-3 rounded-lg", card.bg, card.color)}>
                <card.icon className="w-6 h-6" />
              </div>
              <span className={cn("font-label-sm px-2.5 py-1 rounded-full", card.bg, card.color)}>{card.accent}</span>
            </div>
            <h3 className="font-label-lg text-on-surface-variant mb-1">{card.label}</h3>
            <p className="font-headline-lg text-on-surface tracking-tight">
              {card.value} {card.unit && <span className="text-body-md font-normal text-on-surface-variant">{card.unit}</span>}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-title-lg text-on-surface">Jemaat Terbaru</h3>
            <Link to="/jemaat" className="text-primary text-sm font-semibold hover:underline">Lihat Semua</Link>
          </div>
          <div className="space-y-3">
            {jemaatTerbaru.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50/60 border border-slate-100">
                <div>
                  <p className="font-semibold text-on-surface">{item.name}</p>
                  <p className="text-xs text-on-surface-variant">ID: {item.id}</p>
                </div>
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-bold",
                  item.status === "Aktif" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700",
                )}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-title-lg text-on-surface">Transaksi Terbaru</h3>
            <Link to="/keuangan" className="text-primary text-sm font-semibold hover:underline">Lihat Semua</Link>
          </div>
          <div className="space-y-3">
            {transaksiTerbaru.map((item, idx) => (
              <div key={`${item.date}-${item.category}-${idx}`} className="flex items-center justify-between p-3 rounded-lg bg-slate-50/60 border border-slate-100">
                <div>
                  <p className="font-semibold text-on-surface">{item.category}</p>
                  <p className="text-xs text-on-surface-variant">{item.date}</p>
                </div>
                <p className={cn("text-sm font-bold", item.amount >= 0 ? "text-emerald-700" : "text-rose-700")}>
                  {formatCurrency(item.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/jemaat" className="bg-surface-container-low p-4 rounded-lg border border-outline-variant/20 hover:bg-surface-container transition-colors flex items-center gap-3">
          <UserPlus className="w-5 h-5 text-primary" />
          <span className="font-semibold text-on-surface">Kelola Jemaat</span>
        </Link>
        <Link to="/keuangan" className="bg-surface-container-low p-4 rounded-lg border border-outline-variant/20 hover:bg-surface-container transition-colors flex items-center gap-3">
          <ReceiptText className="w-5 h-5 text-secondary" />
          <span className="font-semibold text-on-surface">Kelola Keuangan</span>
        </Link>
        <Link to="/laporan" className="bg-surface-container-low p-4 rounded-lg border border-outline-variant/20 hover:bg-surface-container transition-colors flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-tertiary" />
          <span className="font-semibold text-on-surface">Lihat Laporan</span>
        </Link>
      </div>
    </motion.div>
  );
}
