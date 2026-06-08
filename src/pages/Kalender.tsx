import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Pencil,
  Trash2,
  Calendar,
  Clock,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  eventDate: string;
  description: string;
  type: string;
  rawType: string;
}

interface EventForm {
  id?: string;
  title: string;
  eventDate: string;
  description: string;
  type: string;
}

const defaultForm: EventForm = {
  title: "",
  eventDate: "",
  description: "",
  type: "UMUM",
};

const eventTypeOptions = [
  { value: "UMUM", label: "Umum" },
  { value: "IBADAH", label: "Ibadah" },
  { value: "RAPAT", label: "Rapat" },
  { value: "ULANG_TAHUN", label: "Ulang Tahun" },
];

const typeColors: Record<string, { bg: string; text: string; dot: string }> = {
  UMUM: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-500" },
  IBADAH: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  RAPAT: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  ULANG_TAHUN: { bg: "bg-pink-50", text: "text-pink-700", dot: "bg-pink-500" },
};

const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const monthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function Kalender() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editing, setEditing] = useState<EventForm | null>(null);
  const [confirmState, setConfirmState] = useState<{
    mode: "create" | "edit" | "delete";
    target?: CalendarEvent;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadData = async () => {
    const response = await fetch(
      `/api/events?month=${month + 1}&year=${year}`,
    );
    const payload = await response.json();
    setEvents(payload);
  };

  useEffect(() => {
    loadData();
  }, [month, year]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [year, month]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = ev.eventDate;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate.get(selectedDate) || [];
  }, [selectedDate, eventsByDate]);

  const formatDateKey = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const navigateMonth = (delta: number) => {
    setCurrentDate(new Date(year, month + delta, 1));
    setSelectedDate(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    setIsSubmitting(true);
    try {
      const isEdit = !!editing.id;
      const url = isEdit ? `/api/events/${editing.id}` : "/api/events";
      const response = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editing.title,
          eventDate: editing.eventDate,
          description: editing.description,
          type: editing.type,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        window.alert(err.message || "Gagal menyimpan acara");
        return;
      }
      setEditing(null);
      setConfirmState(null);
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (!response.ok) {
        window.alert("Gagal menghapus acara");
        return;
      }
      setConfirmState(null);
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmState) return;
    if (confirmState.mode === "delete" && confirmState.target) {
      await handleDelete(confirmState.target.id);
    } else {
      await handleSave();
    }
  };

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const upcomingEvents = useMemo(() => {
    return events
      .filter((e) => e.eventDate >= todayKey)
      .slice(0, 5);
  }, [events, todayKey]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="font-headline-lg text-on-surface">Kalender</h2>
          <p className="font-body-md text-on-surface-variant mt-1">
            Kelola jadwal dan acara gereja
          </p>
        </div>
        <button
          onClick={() =>
            setEditing({ ...defaultForm, eventDate: selectedDate || todayKey })
          }
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg font-label-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          Tambah Acara
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-outline-variant/30 shadow-sm">
          <div className="flex items-center justify-between p-6 border-b border-outline-variant/20">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 rounded-lg hover:bg-surface-container-high transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-on-surface-variant" />
            </button>
            <h3 className="font-title-lg text-on-surface">
              {monthNames[month]} {year}
            </h3>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 rounded-lg hover:bg-surface-container-high transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-on-surface-variant" />
            </button>
          </div>

          <div className="grid grid-cols-7">
            {dayNames.map((day) => (
              <div
                key={day}
                className="py-3 text-center text-xs font-semibold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/10"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-outline-variant/10" />;
              }
              const dateKey = formatDateKey(day);
              const dayEvents = eventsByDate.get(dateKey) || [];
              const isSelected = selectedDate === dateKey;
              const isToday = dateKey === todayKey;

              return (
                <div
                  key={dateKey}
                  onClick={() => setSelectedDate(dateKey)}
                  className={cn(
                    "min-h-[100px] border-b border-r border-outline-variant/10 p-2 cursor-pointer transition-colors",
                    isSelected
                      ? "bg-primary/5"
                      : "hover:bg-surface-container-high",
                    isToday && "bg-amber-50/50",
                  )}
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium mb-1",
                      isToday
                        ? "bg-primary text-on-primary"
                        : "text-on-surface",
                    )}
                  >
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map((ev) => {
                      const colors = typeColors[ev.rawType] || typeColors.UMUM;
                      return (
                        <div
                          key={ev.id}
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-medium truncate",
                            colors.bg,
                            colors.text,
                          )}
                        >
                          {ev.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <p className="text-[10px] text-on-surface-variant">
                        +{dayEvents.length - 2} lagi
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          {selectedDate && (
            <div className="bg-white rounded-xl border border-outline-variant/30 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-title-md text-on-surface">
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                    "id-ID",
                    {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    },
                  )}
                </h3>
                <button
                  onClick={() =>
                    setEditing({ ...defaultForm, eventDate: selectedDate })
                  }
                  className="p-2 rounded-lg hover:bg-surface-container-high transition-colors text-primary"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {selectedDateEvents.length === 0 ? (
                <p className="text-sm text-on-surface-variant py-4 text-center">
                  Tidak ada acara di tanggal ini.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedDateEvents.map((ev) => {
                    const colors = typeColors[ev.rawType] || typeColors.UMUM;
                    return (
                      <div
                        key={ev.id}
                        className="p-3 rounded-lg border border-outline-variant/20 hover:border-outline-variant/40 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={cn(
                                  "w-2 h-2 rounded-full",
                                  colors.dot,
                                )}
                              />
                              <p className="text-sm font-semibold text-on-surface">
                                {ev.title}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "inline-block px-2 py-0.5 rounded text-[10px] font-medium",
                                colors.bg,
                                colors.text,
                              )}
                            >
                              {ev.type}
                            </span>
                            {ev.description && (
                              <p className="text-xs text-on-surface-variant mt-2">
                                {ev.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                setEditing({
                                  id: ev.id,
                                  title: ev.title,
                                  eventDate: ev.eventDate,
                                  description: ev.description,
                                  type: ev.rawType,
                                })
                              }
                              className="p-1.5 text-outline hover:text-primary transition-colors rounded"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setConfirmState({
                                  mode: "delete",
                                  target: ev,
                                })
                              }
                              className="p-1.5 text-outline hover:text-error transition-colors rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-xl border border-outline-variant/30 shadow-sm p-6">
            <h3 className="font-title-md text-on-surface mb-4">
              Acara Mendatang
            </h3>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-on-surface-variant py-4 text-center">
                Tidak ada acara mendatang.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((ev) => {
                  const colors = typeColors[ev.rawType] || typeColors.UMUM;
                  return (
                    <div
                      key={ev.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer"
                      onClick={() => setSelectedDate(ev.eventDate)}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex flex-col items-center justify-center",
                          colors.bg,
                        )}
                      >
                        <span className="text-[10px] font-medium text-on-surface-variant">
                          {new Date(ev.eventDate + "T00:00:00").toLocaleDateString(
                            "id-ID",
                            { month: "short" },
                          )}
                        </span>
                        <span className={cn("text-sm font-bold", colors.text)}>
                          {new Date(ev.eventDate + "T00:00:00").getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-on-surface truncate">
                          {ev.title}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {ev.type}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-xl border border-outline-variant/30 shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-title-lg text-on-surface">
                {editing.id ? "Edit Acara" : "Tambah Acara"}
              </h3>
              <button
                onClick={() => setEditing(null)}
                className="p-1.5 rounded-lg hover:bg-surface-container-high"
              >
                <X className="w-5 h-5 text-outline" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Judul Acara
                </label>
                <input
                  value={editing.title}
                  onChange={(e) =>
                    setEditing({ ...editing, title: e.target.value })
                  }
                  className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Contoh: Ibadah Minggu"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={editing.eventDate}
                  onChange={(e) =>
                    setEditing({ ...editing, eventDate: e.target.value })
                  }
                  className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Jenis Acara
                </label>
                <select
                  value={editing.type}
                  onChange={(e) =>
                    setEditing({ ...editing, type: e.target.value })
                  }
                  className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  {eventTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Keterangan
                </label>
                <textarea
                  value={editing.description}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                  className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                  rows={3}
                  placeholder="Keterangan tambahan (opsional)"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-high transition-colors text-sm"
              >
                Batal
              </button>
              <button
                onClick={() =>
                  setConfirmState({ mode: editing.id ? "edit" : "create" })
                }
                disabled={!editing.title || !editing.eventDate}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:opacity-90 transition-opacity text-sm disabled:opacity-40"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmState && (
        <div className="fixed inset-0 bg-black/40 z-[80] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl border border-outline-variant/30 shadow-xl p-6">
            <h3 className="font-title-lg text-on-surface mb-2">Konfirmasi</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              {confirmState.mode === "delete"
                ? `Hapus acara "${confirmState.target?.title}"?`
                : `Simpan data acara?`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmState(null)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-high transition-colors text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={isSubmitting}
                className={cn(
                  "px-4 py-2 rounded-lg text-on-primary text-sm font-medium transition-opacity",
                  confirmState.mode === "delete"
                    ? "bg-rose-600 hover:opacity-90"
                    : "bg-primary hover:opacity-90",
                )}
              >
                {isSubmitting ? "Memproses..." : "Ya, Lanjutkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
