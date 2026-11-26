import type { LetterContent } from "./letter";

export type Jabatan = "PDM" | "PDT";
export type Gender = "" | "LAKI_LAKI" | "PEREMPUAN";
export type OwnerType = "GEREJA_LOKAL" | "ROHANIWAN" | "SURAT";
export type SuratDirection = "MASUK" | "KELUAR";

export interface GerejaLokal {
  id: string;
  name: string;
  worshipAddress: string;
  secretariat: string;
  serviceSchedule: string;
  notes: string;
  lampiranCount: number;
  gembala: Array<{ id: string; name: string; jabatan: Jabatan }>;
}

export interface Rohaniwan {
  id: string;
  name: string;
  jabatan: Jabatan;
  isGembala: boolean;
  gerejaLokalId: string | null;
  gerejaLokalName: string | null;
  nir: string;
  nirExpiry: string | null;
  cardNumber: string;
  cardExpiry: string | null;
  address: string;
  phone: string;
  birthPlace: string;
  birthDate: string | null;
  gender: Gender;
  nationality: string;
  churchName: string;
  churchAddress: string;
  notes: string;
  lampiranCount: number;
}

export interface Surat {
  id: string;
  direction: SuratDirection;
  letterNumber: string;
  letterDate: string;
  subject: string;
  counterparty: string;
  category: string;
  notes: string;
  /** Set when the letter was written with the letter generator. */
  content: LetterContent | null;
  lampiranCount: number;
}

export const directionLabel: Record<SuratDirection, string> = {
  MASUK: "Surat Masuk",
  KELUAR: "Surat Keluar",
};

export const suratCategorySuggestions = [
  "Surat Keterangan",
  "Surat Keputusan (SK)",
  "Mutasi & Perubahan Data",
  "Permohonan",
  "Undangan",
  "Pemberitahuan",
];

export interface Lampiran {
  id: number;
  label: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  url: string;
}

export const jabatanLabel: Record<Jabatan, string> = {
  PDM: "Pendeta Muda (Pdm.)",
  PDT: "Pendeta (Pdt.)",
};

export const jabatanShort: Record<Jabatan, string> = {
  PDM: "Pdm.",
  PDT: "Pdt.",
};

export const genderLabel: Record<Gender, string> = {
  "": "-",
  LAKI_LAKI: "Laki-laki",
  PEREMPUAN: "Perempuan",
};

export const DEFAULT_LEMBAGA = "Jemaat Kristen Indonesia (JKI)";

// Suggested labels per section; users can still type anything.
export const lampiranSuggestions: Record<OwnerType, string[]> = {
  GEREJA_LOKAL: [
    "SK Penetapan Gereja Lokal",
    "Surat Keterangan Tanda Lapor",
    "Foto Gedung Gereja",
  ],
  ROHANIWAN: [
    "Scan Kartu NIR",
    "Scan Kartu Kependetaan",
    "SK Pengangkatan Gembala",
    "SK Penahbisan",
    "Sertifikat Penahbisan",
    "KTP",
    "Pas Foto",
  ],
  SURAT: [
    "Scan Surat",
    "Lampiran Surat",
  ],
};

export const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "NA";

export const formatDateId = (value: string | null) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(value));
};

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export type ExpiryStatus = "none" | "ok" | "soon" | "expired";

const SOON_DAYS = 90;

export const expiryStatus = (value: string | null): ExpiryStatus => {
  if (!value) return "none";
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = (new Date(value).getTime() - todayUtc) / 86_400_000;
  if (diffDays < 0) return "expired";
  if (diffDays <= SOON_DAYS) return "soon";
  return "ok";
};

const severity: Record<ExpiryStatus, number> = { none: 0, ok: 1, soon: 2, expired: 3 };

export const worstExpiry = (...values: Array<string | null>): ExpiryStatus =>
  values.map(expiryStatus).reduce((worst, s) => (severity[s] > severity[worst] ? s : worst), "none" as ExpiryStatus);

export const expiryBadge: Record<ExpiryStatus, { label: string; className: string }> = {
  none: { label: "Belum diisi", className: "bg-slate-50 text-slate-500 border-slate-200" },
  ok: { label: "Berlaku", className: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  soon: { label: "Segera berakhir", className: "bg-amber-50 text-amber-700 border-amber-200" },
  expired: { label: "Kedaluwarsa", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

export async function apiJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { message?: string }).message || "Terjadi kesalahan");
  }
  return payload as T;
}

export const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/** Downloads a file from the API; throws with the server's message on failure. */
export async function downloadFile(url: string, fallbackName: string) {
  const response = await fetch(url);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error((payload as { message?: string }).message || "Gagal mengunduh file");
  }
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const name = match ? decodeURIComponent(match[1]) : fallbackName;
  const blobUrl = URL.createObjectURL(await response.blob());
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
}
