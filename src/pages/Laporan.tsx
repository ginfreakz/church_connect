import { useEffect, useMemo, useState } from "react";
import { Download, FileText, TrendingUp, Landmark } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from "recharts";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

export default function Laporan() {
  const [chartData, setChartData] = useState<Array<{ name: string; income: number; expense: number }>>([]);
  const [statusData, setStatusData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [offHistory, setOffHistory] = useState<Array<{ date: string; activity: string; attendance: string; total: string; status: string }>>([]);
  const [totalJemaat, setTotalJemaat] = useState(0);
  const [jemaatGrowthLabel, setJemaatGrowthLabel] = useState("+0%");
  const [currentBalance, setCurrentBalance] = useState(0);
  const [balanceAsOf, setBalanceAsOf] = useState("-");

  useEffect(() => {
    const rawAuth = localStorage.getItem("church-connect-auth");
    const auth = rawAuth ? JSON.parse(rawAuth) : null;

    fetch("/api/reports", {
      headers: auth?.id ? { "x-user-id": String(auth.id) } : {},
    })
      .then((res) => res.json())
      .then((payload) => {
        setChartData(payload.chartData || []);
        setStatusData(payload.statusData || []);
        setOffHistory(payload.offHistory || []);
        setTotalJemaat(payload.totalJemaat || 0);
        setJemaatGrowthLabel(payload.jemaatGrowthLabel || "+0%");
        setCurrentBalance(payload.currentBalance || 0);
        setBalanceAsOf(payload.balanceAsOf || "-");
      });
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value).replace("Rp", "Rp ");
  };

  const reportCsv = useMemo(() => {
    const rows = [
      ["Tanggal", "Kegiatan", "Kehadiran", "Total", "Status"],
      ...offHistory.map((item) => [item.date, item.activity, item.attendance, item.total, item.status]),
    ];
    return rows.map((row) => row.map((col) => `"${String(col).replace(/"/g, '""')}"`).join(",")).join("\n");
  }, [offHistory]);

  const handleExportCsv = () => {
    const blob = new Blob([reportCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "laporan-church-connect.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface mb-1">Laporan & Analitik</h2>
          <p className="font-body-md text-on-surface-variant">Ringkasan pertumbuhan jemaat dan kondisi keuangan terkini.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExportCsv} className="flex items-center gap-2 px-4 py-2 border border-outline text-on-surface font-label-lg rounded-lg hover:bg-slate-50 transition-all transition-all active:scale-95 shadow-sm">
            <Download className="w-4 h-4" />
            Export Excel
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary font-label-lg rounded-lg shadow-md hover:brightness-110 transition-all active:scale-95">
            <FileText className="w-4 h-4" />
            Cetak PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Trend Keuangan */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-outline-variant/30 rounded-xl p-8 shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <h3 className="font-title-lg text-on-surface">Trend Keuangan Bulanan</h3>
            <div className="flex gap-4">
              <span className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                <div className="w-3 h-3 rounded-full bg-primary"></div> Pemasukan
              </span>
              <span className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                <div className="w-3 h-3 rounded-full bg-secondary-container"></div> Pengeluaran
              </span>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} hide />
                <Tooltip cursor={{ fill: '#f8fafb' }} />
                <Bar dataKey="income" fill="#005e96" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="expense" fill="#8df5e4" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Jemaat */}
        <div className="col-span-12 lg:col-span-4 bg-white border border-outline-variant/30 rounded-xl p-8 shadow-sm">
          <h3 className="font-title-lg text-on-surface mb-8">Status Jemaat</h3>
          <div className="h-[220px] relative mb-10">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-on-surface">{totalJemaat}</span>
              <span className="text-[10px] font-black text-on-surface-variant tracking-[0.2em] uppercase">Total</span>
            </div>
          </div>
          <div className="space-y-4">
            {statusData.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="font-body-md text-on-surface-variant">{item.name}</span>
                </div>
                <span className="font-label-lg font-bold">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weakly Details */}
        <div className="col-span-12 bg-white border border-outline-variant/30 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-title-lg text-on-surface">Rincian Persembahan Mingguan</h3>
            <button className="text-primary font-label-lg hover:underline transition-all font-bold">Lihat Semua</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low border-b border-outline-variant/10">
                <tr>
                  <th className="px-6 py-4 font-label-lg text-on-surface-variant uppercase tracking-widest text-[11px]">Tanggal</th>
                  <th className="px-6 py-4 font-label-lg text-on-surface-variant uppercase tracking-widest text-[11px]">Kegiatan</th>
                  <th className="px-6 py-4 font-label-lg text-on-surface-variant uppercase tracking-widest text-[11px]">Kehadiran</th>
                  <th className="px-6 py-4 font-label-lg text-on-surface-variant uppercase tracking-widest text-[11px]">Total Kolekte</th>
                  <th className="px-6 py-4 font-label-lg text-on-surface-variant uppercase tracking-widest text-[11px] text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {offHistory.map((item, i) => (
                  <tr key={i} className="hover:bg-primary/5 transition-all">
                    <td className="px-6 py-5 font-body-md text-on-surface">{item.date}</td>
                    <td className="px-6 py-5 font-body-md text-on-surface">{item.activity}</td>
                    <td className="px-6 py-5 font-body-md text-on-surface">{item.attendance}</td>
                    <td className="px-6 py-5 font-label-lg text-on-surface font-bold">{item.total}</td>
                    <td className="px-6 py-5 text-right">
                      <span className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold shadow-sm",
                        item.status === "Verifikasi" 
                          ? "bg-secondary-container/30 text-on-secondary-container" 
                          : "bg-slate-100 text-slate-600"
                      )}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mini Stats */}
        <div className="col-span-12 md:col-span-6 lg:col-span-6">
          <div className="bg-primary p-6 rounded-xl shadow-lg relative overflow-hidden group h-full">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full group-hover:scale-150 transition-all duration-700"></div>
            <div className="relative z-10 flex flex-col h-full">
              <TrendingUp className="text-white/80 w-6 h-6 mb-4" />
              <h4 className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em]">Kenaikan Jemaat</h4>
              <div className="text-3xl font-black text-white mt-1">{jemaatGrowthLabel}</div>
              <p className="text-white/60 text-[11px] mt-auto pt-4">Pertumbuhan dibanding bulan lalu</p>
            </div>
          </div>
        </div>

        <div className="col-span-12 md:col-span-6 lg:col-span-6">
          <div className="bg-secondary p-6 rounded-xl shadow-lg relative overflow-hidden group h-full">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full group-hover:scale-150 transition-all duration-700"></div>
            <div className="relative z-10 flex flex-col h-full">
              <Landmark className="text-white/80 w-6 h-6 mb-4" />
              <h4 className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em]">Dana Tersedia</h4>
              <div className="text-3xl font-black text-white mt-1">{formatCurrency(currentBalance)}</div>
              <p className="text-white/60 text-[11px] mt-auto pt-4">Saldo per {balanceAsOf}</p>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
