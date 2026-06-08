import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, TrendingUp, Wallet, RefreshCw, UserPlus, ReceiptText, Calendar, Cake, HeartHandshake } from "lucide-react";
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

interface UpcomingEvent {
  id: string;
  title: string;
  eventDate: string;
  type: string;
}

interface UpcomingBirthday {
  id: string;
  name: string;
  initials: string;
  birthDate: string;
  turningAge: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [jemaatTerbaru, setJemaatTerbaru] = useState<JemaatItem[]>([]);
  const [transaksiTerbaru, setTransaksiTerbaru] = useState<TransactionItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<UpcomingBirthday[]>([]);
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
      const [statsRes, jemaatRes, txRes, upcomingRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/jemaat"),
        fetch("/api/transactions"),
        fetch("/api/dashboard/upcoming"),
      ]);

      const [statsPayload, jemaatPayload, txPayload, upcomingPayload] = await Promise.all([
        statsRes.json(),
        jemaatRes.json(),
        txRes.json(),
        upcomingRes.json(),
      ]);

      setStats(statsPayload);
      setJemaatTerbaru((jemaatPayload || []).slice(0, 5));
      setTransaksiTerbaru((txPayload || []).slice(0, 5));
      setUpcomingEvents(upcomingPayload?.events || []);
      setUpcomingBirthdays(upcomingPayload?.birthdays || []);
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {upcomingBirthdays.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-pink-50 text-pink-700">
                  <Cake className="w-5 h-5" />
                </div>
                <h3 className="font-title-lg text-on-surface">Ulang Tahun Minggu Ini</h3>
              </div>
            </div>
            <div className="space-y-3">
              {upcomingBirthdays.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-pink-50/50 border border-pink-100">
                  <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-sm">
                    {item.initials}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-on-surface">{item.name}</p>
                    <p className="text-xs text-on-surface-variant">
                      {new Date(item.birthDate + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long" })}
                      {" "}&middot; Berusia {item.turningAge} tahun
                    </p>
                  </div>
                  <Cake className="w-5 h-5 text-pink-400" />
                </div>
              ))}
            </div>
          </div>
        )}

        {upcomingEvents.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-violet-50 text-violet-700">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="font-title-lg text-on-surface">Jadwal Mendatang</h3>
              </div>
              <Link to="/kalender" className="text-primary text-sm font-semibold hover:underline">Lihat Semua</Link>
            </div>
            <div className="space-y-3">
              {upcomingEvents.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-violet-50/50 border border-violet-100">
                  <div className="w-10 h-10 rounded-lg bg-violet-100 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-medium text-violet-600">
                      {new Date(item.eventDate + "T00:00:00").toLocaleDateString("id-ID", { month: "short" })}
                    </span>
                    <span className="text-sm font-bold text-violet-700">
                      {new Date(item.eventDate + "T00:00:00").getDate()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-on-surface">{item.title}</p>
                    <p className="text-xs text-on-surface-variant">{item.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
        <Link to="/pelayanan" className="bg-surface-container-low p-4 rounded-lg border border-outline-variant/20 hover:bg-surface-container transition-colors flex items-center gap-3">
          <HeartHandshake className="w-5 h-5 text-violet-600" />
          <span className="font-semibold text-on-surface">Kelola Pelayanan</span>
        </Link>
        <Link to="/laporan" className="bg-surface-container-low p-4 rounded-lg border border-outline-variant/20 hover:bg-surface-container transition-colors flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-tertiary" />
          <span className="font-semibold text-on-surface">Lihat Laporan</span>
        </Link>
      </div>
    </motion.div>
  );
}
