import type { ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Jemaat from "./pages/Jemaat";
import Keuangan from "./pages/Keuangan";
import Laporan from "./pages/Laporan";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const authRaw = localStorage.getItem("church-connect-auth");
  if (!authRaw) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/jemaat" element={<Jemaat />} />
          <Route path="/keuangan" element={<Keuangan />} />
          <Route path="/laporan" element={<Laporan />} />
          <Route path="/pelayanan" element={<div className="p-8"><h2 className="font-headline-md">Halaman Pelayanan (Segera Hadir)</h2></div>} />
          <Route path="/kalender" element={<div className="p-8"><h2 className="font-headline-md">Halaman Kalender (Segera Hadir)</h2></div>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
