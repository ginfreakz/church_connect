import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, HelpCircle, Settings } from "lucide-react";

export function TopBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; title: string; subtitle: string; href: string }>>([]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (!response.ok) {
          setResults([]);
          return;
        }
        const payload = await response.json();
        setResults(payload.results || []);
      } catch {
        setResults([]);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [query]);

  return (
    <header className="fixed top-0 right-0 left-64 h-16 bg-white/80 backdrop-blur-md border-b border-outline-variant/30 px-6 flex justify-between items-center z-40 shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input
            className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm font-body-md focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            placeholder="Cari transaksi, jemaat, atau laporan..."
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {results.length > 0 && (
            <div className="absolute top-12 left-0 right-0 rounded-xl border border-outline-variant/30 bg-white shadow-lg p-2 max-h-80 overflow-auto">
              {results.map((item) => (
                <button
                  key={`${item.href}-${item.id}`}
                  onClick={() => {
                    navigate(item.href);
                    setQuery("");
                    setResults([]);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50"
                >
                  <p className="text-sm font-semibold text-on-surface">{item.title}</p>
                  <p className="text-xs text-on-surface-variant">{item.subtitle}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-all active:scale-95">
          <Bell className="w-5 h-5" />
        </button>
        <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-all active:scale-95">
          <HelpCircle className="w-5 h-5" />
        </button>
        <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-all active:scale-95">
          <Settings className="w-5 h-5" />
        </button>
        
        <div className="h-8 w-[1px] bg-outline-variant/30 mx-2"></div>
        
        <div className="flex items-center gap-3 pl-2 group cursor-pointer">
          <div className="text-right hidden lg:block">
            <p className="text-xs font-bold text-on-surface leading-tight">Admin Pusat</p>
            <p className="text-[10px] text-primary uppercase font-bold tracking-widest leading-tight mt-0.5">Administrator</p>
          </div>
          <img
            alt="Admin"
            className="w-9 h-9 rounded-full border-2 border-white shadow-sm object-cover"
            src="https://picsum.photos/seed/admin/200/200"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </header>
  );
}
