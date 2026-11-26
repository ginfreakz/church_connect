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
import GerejaLokalList from "./pages/korwil/GerejaLokalList";
import GerejaLokalDetail from "./pages/korwil/GerejaLokalDetail";
import RohaniwanList from "./pages/korwil/RohaniwanList";
import RohaniwanDetail from "./pages/korwil/RohaniwanDetail";
import SuratList from "./pages/korwil/SuratList";
import SuratDetail from "./pages/korwil/SuratDetail";
import LetterEditor from "./pages/korwil/LetterEditor";
import KopSuratSettings from "./pages/korwil/KopSuratSettings";

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
          <Route path="/korwil" element={<Navigate to="/korwil/gereja-lokal" replace />} />
          <Route path="/korwil/gereja-lokal" element={<GerejaLokalList />} />
          <Route path="/korwil/gereja-lokal/:id" element={<GerejaLokalDetail />} />
          <Route path="/korwil/gembala" element={<RohaniwanList mode="gembala" />} />
          <Route path="/korwil/pendeta" element={<RohaniwanList mode="pendeta" />} />
          <Route path="/korwil/rohaniwan/:id" element={<RohaniwanDetail />} />
          <Route path="/korwil/surat" element={<SuratList />} />
          <Route path="/korwil/surat/:id" element={<SuratDetail />} />
          <Route path="/korwil/surat/buat" element={<LetterEditor />} />
          <Route path="/korwil/surat/:id/tulis" element={<LetterEditor />} />
          <Route path="/korwil/surat/kop-surat" element={<KopSuratSettings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
