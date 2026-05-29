import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/src/lib/utils";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("admin");
  const [email, setEmail] = useState("admin@gereja.id");
  const [password, setPassword] = useState("admin123");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("church-connect-auth")) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, role }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.message || "Login gagal");
        return;
      }

      localStorage.setItem("church-connect-auth", JSON.stringify(payload.user));
      navigate("/dashboard");
    } catch (requestError) {
      setError("Tidak dapat terhubung ke server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <main className="w-full max-w-[1100px] grid grid-cols-1 md:grid-cols-2 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/30 overflow-hidden min-h-[640px]">
        {/* Left Side */}
        <section className="hidden md:flex relative flex-col justify-between p-12 bg-primary text-on-primary">
          <div className="relative z-10 text-white">
            <div className="flex items-center gap-3 mb-6">
              <Building2 className="w-10 h-10" />
              <h1 className="font-headline-lg !text-white leading-none">JKI Taman Firdaus</h1>
            </div>
            <p className="font-title-lg text-blue-100 max-w-sm">Sistem Manajemen Pelayanan</p>
            <div className="h-1 w-12 bg-secondary-container mt-6 rounded-full"></div>
          </div>
          
          <div className="relative z-10 space-y-6">
            <blockquote className="font-body-lg text-blue-50/90 italic border-l-2 border-blue-50/30 pl-6">
              "Melayani dengan ketulusan dan mengelola dengan integritas untuk kemuliaan-Nya."
            </blockquote>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary-container"></div>
              <span className="font-label-sm text-blue-50/70 tracking-widest uppercase">Stewardship Reimagined</span>
            </div>
          </div>

          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <img
              src="https://picsum.photos/seed/church/1200/1200"
              alt="Architecture"
              className="w-full h-full object-cover grayscale"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-primary via-primary/80 to-transparent"></div>
          </div>
        </section>

        {/* Right Side */}
        <section className="flex flex-col justify-center p-8 lg:p-12 bg-white">
          <div className="max-w-sm mx-auto w-full">
            <header className="mb-10 text-center md:text-left">
              <h2 className="font-headline-md text-on-surface mb-2">Selamat Datang</h2>
              <p className="font-body-md text-on-surface-variant">Silakan masuk ke akun administrator Anda.</p>
            </header>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="font-label-lg text-on-surface-variant">Pilih Peran Akun</label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-surface-container rounded-lg border border-outline-variant/30">
                  {['admin', 'keuangan', 'jemaat'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={cn(
                        "flex flex-col items-center gap-1 py-3 rounded-md transition-all duration-200 uppercase text-[10px] font-bold",
                        role === r 
                          ? "bg-white shadow-sm text-primary border border-primary-container/10" 
                          : "text-on-surface-variant hover:bg-surface-container-highest"
                      )}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{r === 'admin' ? 'Admin' : r === 'keuangan' ? 'Keuangan' : 'Jemaat'}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-label-lg text-on-surface-variant" htmlFor="email">Alamat Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
                  <input
                    id="email"
                    className="w-full h-12 pl-12 pr-4 bg-surface-container-low border-outline-variant border rounded-lg font-body-md text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    placeholder="nama@gereja.id"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="font-label-lg text-on-surface-variant" htmlFor="password">Kata Sandi</label>
                  <button type="button" className="font-label-sm text-primary hover:underline">Lupa sandi?</button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
                  <input
                    id="password"
                    className="w-full h-12 pl-12 pr-12 bg-surface-container-low border-outline-variant border rounded-lg font-body-md text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-error font-semibold">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-primary text-on-primary rounded-lg font-label-lg flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
              >
                {isLoading ? "Memproses..." : "Masuk ke Dashboard"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <footer className="mt-12 pt-8 border-t border-outline-variant/30 text-center">
              <p className="font-body-md text-on-surface-variant">
                Belum memiliki akses? <button className="text-primary font-semibold hover:underline">Hubungi IT Support</button>
              </p>
              <div className="mt-8 flex items-center justify-center gap-4 text-outline opacity-50 grayscale">
                <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-[0.2em]">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Secured Login</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-outline"></div>
                <span className="text-[10px] uppercase font-bold tracking-[0.2em]">v2.4.0-build</span>
              </div>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
