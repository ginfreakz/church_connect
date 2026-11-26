import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  Building2, 
  ChevronDown,
  FolderArchive,
  LayoutDashboard, 
  Users, 
  Wallet, 
  BarChart3, 
  HeartHandshake, 
  Calendar,
  HelpCircle,
  LogOut
} from "lucide-react";
import { cn } from "@/src/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Ringkasan", href: "/dashboard" },
  { icon: Users, label: "Jemaat", href: "/jemaat" },
  { icon: Wallet, label: "Keuangan", href: "/keuangan" },
  { icon: BarChart3, label: "Laporan", href: "/laporan" },
  { icon: HeartHandshake, label: "Pelayanan", href: "/pelayanan" },
  { icon: Calendar, label: "Kalender", href: "/kalender" },
];

const korwilItems = [
  { number: "01", label: "Gereja Lokal", href: "/korwil/gereja-lokal" },
  { number: "02", label: "Gembala Jemaat", href: "/korwil/gembala" },
  { number: "03", label: "Pdm. & Pdt.", href: "/korwil/pendeta" },
  { number: "04", label: "Surat Menyurat", href: "/korwil/surat" },
];

function KorwilNavGroup() {
  const { pathname } = useLocation();
  const inKorwil = pathname.startsWith("/korwil");
  const [open, setOpen] = useState(inKorwil);

  useEffect(() => {
    if (inKorwil) setOpen(true);
  }, [inKorwil]);

  return (
    <div>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "w-full flex items-center gap-3 py-3 px-4 rounded-lg transition-all duration-200 font-label-lg",
          inKorwil ? "text-primary font-semibold" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
        )}
        aria-expanded={open}
      >
        <FolderArchive className="w-5 h-5" />
        <span className="flex-1 text-left">Korwil Jabar</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="ml-6 pl-3 border-l border-outline-variant/40 flex flex-col gap-0.5 mt-0.5 mb-1">
          {korwilItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) => cn(
                "flex items-center gap-2 py-2 px-3 rounded-lg transition-all duration-200 text-sm",
                isActive
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
              )}
            >
              <span className="text-[10px] font-bold tabular-nums opacity-60">{item.number}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const navigate = useNavigate();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 border-r border-outline-variant/30 bg-surface-container-low flex flex-col p-4 gap-2 z-50">
      <div className="px-4 py-6 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-headline-md text-sky-900 leading-tight !text-lg">JKI Obed Edom Ministry</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-tight mt-0.5">Sistem Manajemen Pelayanan</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto min-h-0">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) => cn(
              "flex items-center gap-3 py-3 px-4 rounded-lg transition-all duration-200 group font-label-lg",
              isActive 
                ? "bg-primary/10 text-primary font-semibold" 
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <KorwilNavGroup />
      </nav>

      <div className="mt-auto pt-4 border-t border-outline-variant/20 flex flex-col gap-1">
        <NavLink
          to="/bantuan"
          className={({ isActive }) => cn(
            "flex items-center gap-3 py-3 px-4 rounded-lg transition-all duration-200 font-label-lg",
            isActive ? "text-primary font-semibold" : "text-on-surface-variant hover:bg-surface-container-high"
          )}
        >
          <HelpCircle className="w-5 h-5" />
          <span>Bantuan</span>
        </NavLink>
        <button
          onClick={() => {
            localStorage.removeItem("church-connect-auth");
            navigate("/");
          }}
          className="flex items-center gap-3 py-3 px-4 rounded-lg text-error hover:bg-error-container/20 transition-all duration-200 font-label-lg w-full text-left"
        >
          <LogOut className="w-5 h-5" />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
