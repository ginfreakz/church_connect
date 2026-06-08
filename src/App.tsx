import type { ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Jemaat from "./pages/Jemaat";
import Keuangan from "./pages/Keuangan";
import Laporan from "./pages/Laporan";
import { Pelayanan } from "./pages/Pelayanan";
import { Kalender } from "./pages/Kalender";

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
          <Route path="/pelayanan" element={<Pelayanan />} />
          <Route path="/kalender" element={<Kalender />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
