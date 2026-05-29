import { useEffect, useState } from "react";
import { Users, TrendingUp, Wallet, ArrowUpRight, Calendar, ChevronRight, Activity, Zap, BookOpen, Layers, MessageSquare, Plus } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

interface Stats {
  totalJemaat: number;
  pemasukan: number;
  pengeluaran: number;
  growth: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then(res => res.json())
      .then(setStats);
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val).replace("Rp", "Rp ");
  };

  const overviewCards = [
    { label: "Total Jemaat", value: stats?.totalJemaat || 0, unit: "Jiwa", icon: Users, color: "text-primary", bg: "bg-primary/10", accent: "+12% Bulan ini" },
    { label: "Total Pemasukan", value: stats ? formatCurrency(stats.pemasukan) : "Rp 0", unit: "", icon: TrendingUp, color: "text-secondary", bg: "bg-secondary/10", accent: "Periode: Maret" },
    { label: "Total Pengeluaran", value: stats ? formatCurrency(stats.pengeluaran) : "Rp 0", unit: "", icon: Wallet, color: "text-error", bg: "bg-error/10", accent: "Sesuai Anggaran" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h2 className="font-headline-md text-on-surface mb-1">Dashboard Ringkasan</h2>
        <p className="font-body-md text-on-surface-variant">Selamat datang kembali, Admin Pusat. Berikut adalah ikhtisar pelayanan pekan ini.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {overviewCards.map((card, i) => (
          <div 
            key={i}
            className="bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-3 rounded-lg", card.bg, card.color)}>
                <card.icon className="w-6 h-6" />
              </div>
              <span className={cn("font-label-sm px-2.5 py-1 rounded-full", card.bg, card.color)}>
                {card.accent}
              </span>
            </div>
            <h3 className="font-label-lg text-on-surface-variant mb-1">{card.label}</h3>
            <p className="font-headline-lg text-on-surface tracking-tight">
              {card.value} {card.unit && <span className="text-body-md font-normal text-on-surface-variant">{card.unit}</span>}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agenda */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-title-lg text-on-surface">Agenda Mendatang</h3>
              <p className="font-body-md text-on-surface-variant">Jadwal kegiatan gereja dalam 7 hari ke depan</p>
            </div>
            <button className="text-label-lg text-primary hover:underline font-semibold">Lihat Kalender</button>
          </div>
          
          <div className="space-y-4">
            {[
              { date: "22", month: "Okt", title: "Kebaktian Minggu", time: "09:00 - 11:00 • Ruang Utama", color: "bg-primary/10 text-primary" },
              { date: "24", month: "Okt", title: "Rapat Diaken", time: "19:00 - 21:00 • Ruang Konsistori", color: "bg-secondary/10 text-secondary" },
              { date: "26", month: "Okt", title: "Pemahaman Alkitab", time: "18:30 - 20:00 • Aula Serbaguna", color: "bg-tertiary/10 text-tertiary" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-surface-container-low border border-outline-variant/20 hover:border-primary/30 transition-all cursor-pointer group">
                <div className={cn("w-12 h-12 flex flex-col items-center justify-center rounded-lg font-bold", item.color)}>
                  <span className="text-[14px] leading-none">{item.date}</span>
                  <span className="text-[10px] uppercase">{item.month}</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-label-lg text-on-surface">{item.title}</h4>
                  <p className="text-body-md text-on-surface-variant">{item.time}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-outline group-hover:text-primary transition-colors" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-xl border border-outline-variant/30 shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-title-lg text-on-surface">Aktivitas Terkini</h3>
          </div>
          <div className="flex-1 divide-y divide-slate-100">
            {[
              { name: "Budi Santoso", action: "terdaftar sebagai jemaat baru.", time: "2 jam yang lalu", icon: Activity, color: "text-secondary", bg: "bg-secondary/10" },
              { name: "Diaken", action: "memperbarui jadwal pelayanan musik.", time: "5 jam yang lalu", icon: Zap, color: "text-primary", bg: "bg-primary/10" },
              { name: "Admin", action: "Laporan Keuangan Minggu III telah diunggah.", time: "Kemarin, 16:45", icon: BookOpen, color: "text-tertiary", bg: "bg-tertiary/10" },
              { name: "Rapat Ibadah", action: "Pencocokan jadwal Paskah dilakukan.", time: "Kemarin, 10:20", icon: Calendar, color: "text-primary", bg: "bg-primary/10" },
            ].map((item, i) => (
              <div key={i} className="p-4 flex gap-4 hover:bg-slate-50 transition-all">
                <div className={cn("w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center", item.bg, item.color)}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-body-md text-on-surface"><span className="font-bold">{item.name}</span> {item.action}</p>
                  <p className="text-label-sm text-on-surface-variant mt-1 italic">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="p-4 bg-slate-50 text-center font-label-lg text-primary hover:underline border-t border-slate-100 transition-colors">
            Lihat Semua Aktivitas
          </button>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Cetak Kartu", sub: "Identitas Jemaat", icon: Activity, color: "text-primary" },
          { label: "Materi Khotbah", sub: "Arsip Mingguan", icon: BookOpen, color: "text-secondary" },
          { label: "Inventaris", sub: "Manajemen Aset", icon: Layers, color: "text-tertiary" },
          { label: "Warta Jemaat", sub: "Pengumuman Baru", icon: MessageSquare, color: "text-error" },
        ].map((link, i) => (
          <div key={i} className="bg-surface-container-low p-4 rounded-lg flex items-center gap-4 hover:bg-surface-container transition-all cursor-pointer group border border-outline-variant/10">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-all">
              <link.icon className={cn("w-6 h-6", link.color)} />
            </div>
            <div>
              <h4 className="font-label-lg text-on-surface">{link.label}</h4>
              <p className="text-label-sm text-on-surface-variant">{link.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50">
        <Plus className="w-6 h-6" />
      </button>
    </motion.div>
  );
}
