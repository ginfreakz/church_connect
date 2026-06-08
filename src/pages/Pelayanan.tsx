import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  HeartHandshake,
  Users,
  UserPlus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

interface Ministry {
  id: string;
  name: string;
  description: string;
  leader: string;
  status: string;
  memberCount: number;
  createdAt?: string;
}

interface MinistryMember {
  id: string;
  jemaatId: string;
  name: string;
  initials: string;
  role: string;
  joinedAt: string;
}

interface JemaatOption {
  id: string;
  name: string;
}

interface MinistryForm {
  name: string;
  description: string;
  leader: string;
  status: string;
}

interface MemberForm {
  jemaatId: string;
  role: string;
}

const defaultForm: MinistryForm = {
  name: "",
  description: "",
  leader: "",
  status: "Aktif",
};

const defaultMemberForm: MemberForm = {
  jemaatId: "",
  role: "Anggota",
};

const memberRoles = ["Anggota", "Koordinator", "Pemimpin"];

export function Pelayanan() {
  const [data, setData] = useState<Ministry[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const [editing, setEditing] = useState<(MinistryForm & { id?: string }) | null>(null);
  const [confirmState, setConfirmState] = useState<{
    mode: "create" | "edit" | "delete";
    target?: Ministry;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [viewingMembers, setViewingMembers] = useState<Ministry | null>(null);
  const [members, setMembers] = useState<MinistryMember[]>([]);
  const [jemaatList, setJemaatList] = useState<JemaatOption[]>([]);
  const [addingMember, setAddingMember] = useState<MemberForm | null>(null);
  const [memberConfirm, setMemberConfirm] = useState<{
    mode: "add" | "remove";
    target?: MinistryMember;
  } | null>(null);

  const loadData = async () => {
    const response = await fetch("/api/ministries");
    const payload = await response.json();
    setData(payload);
  };

  const loadMembers = async (ministryId: string) => {
    const response = await fetch(`/api/ministries/${ministryId}/members`);
    const payload = await response.json();
    setMembers(payload);
  };

  const loadJemaatList = async () => {
    const response = await fetch("/api/jemaat");
    const payload = await response.json();
    setJemaatList(
      (payload || []).map((j: { id: string; name: string }) => ({
        id: j.id,
        name: j.name,
      })),
    );
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (viewingMembers) {
      loadMembers(viewingMembers.id);
      loadJemaatList();
    }
  }, [viewingMembers]);

  const filteredData = useMemo(() => {
    return data
      .filter((item) => {
        if (filter === "Aktif") return item.status === "Aktif";
        if (filter === "Tidak Aktif") return item.status === "Tidak Aktif";
        return true;
      })
      .filter((item) => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.leader.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
        );
      });
  }, [data, filter, query]);

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = filteredData.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, query]);

  const handleSaveMinistry = async () => {
    if (!editing) return;
    setIsSubmitting(true);
    try {
      const isEdit = !!editing.id;
      const url = isEdit ? `/api/ministries/${editing.id}` : "/api/ministries";
      const response = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editing.name,
          description: editing.description,
          leader: editing.leader,
          status: editing.status,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        window.alert(err.message || "Gagal menyimpan data");
        return;
      }
      setEditing(null);
      setConfirmState(null);
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMinistry = async (id: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/ministries/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        window.alert("Gagal menghapus pelayanan");
        return;
      }
      setConfirmState(null);
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMember = async () => {
    if (!addingMember || !viewingMembers) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/ministries/${viewingMembers.id}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(addingMember),
        },
      );
      if (!response.ok) {
        const err = await response.json();
        window.alert(err.message || "Gagal menambah anggota");
        return;
      }
      setAddingMember(null);
      setMemberConfirm(null);
      await loadMembers(viewingMembers.id);
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (jemaatId: string) => {
    if (!viewingMembers) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/ministries/${viewingMembers.id}/members/${jemaatId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        window.alert("Gagal menghapus anggota");
        return;
      }
      setMemberConfirm(null);
      await loadMembers(viewingMembers.id);
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmState) return;
    if (confirmState.mode === "delete" && confirmState.target) {
      await handleDeleteMinistry(confirmState.target.id);
    } else {
      await handleSaveMinistry();
    }
  };

  const handleMemberConfirmAction = async () => {
    if (!memberConfirm) return;
    if (memberConfirm.mode === "add") {
      await handleAddMember();
    } else if (memberConfirm.mode === "remove" && memberConfirm.target) {
      await handleRemoveMember(memberConfirm.target.jemaatId);
    }
  };

  const stats = [
    {
      label: "Total Pelayanan",
      value: String(data.length),
      icon: HeartHandshake,
      bg: "bg-violet-50",
      color: "text-violet-700",
    },
    {
      label: "Pelayanan Aktif",
      value: String(data.filter((d) => d.status === "Aktif").length),
      icon: HeartHandshake,
      bg: "bg-emerald-50",
      color: "text-emerald-700",
    },
    {
      label: "Total Anggota",
      value: String(data.reduce((sum, d) => sum + d.memberCount, 0)),
      icon: Users,
      bg: "bg-sky-50",
      color: "text-sky-700",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="font-headline-lg text-on-surface">
            Manajemen Pelayanan
          </h2>
          <p className="font-body-md text-on-surface-variant mt-1">
            Kelola departemen dan anggota pelayanan gereja
          </p>
        </div>
        <button
          onClick={() => setEditing({ ...defaultForm })}
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg font-label-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          Tambah Pelayanan
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm"
          >
            <div className={cn("p-2 rounded-lg w-fit", stat.bg, stat.color)}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="font-label-sm text-on-surface-variant uppercase tracking-widest mt-3">
              {stat.label}
            </p>
            <h3 className="font-headline-md mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-outline-variant/30 shadow-sm">
        <div className="p-6 border-b border-outline-variant/20">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
              <input
                type="text"
                placeholder="Cari pelayanan..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-white border border-outline-variant rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="flex gap-2">
              {["Semua", "Aktif", "Tidak Aktif"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    filter === f
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-white border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-outline-variant/10">
                <th className="px-6 py-4 font-label-lg text-on-surface-variant uppercase tracking-wider text-xs">
                  Pelayanan
                </th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant uppercase tracking-wider text-xs">
                  Penanggung Jawab
                </th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant uppercase tracking-wider text-xs">
                  Anggota
                </th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant uppercase tracking-wider text-xs">
                  Status
                </th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant uppercase tracking-wider text-xs text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-on-surface-variant"
                  >
                    Belum ada data pelayanan.
                  </td>
                </tr>
              ) : (
                paginatedData.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-primary/5 transition-colors group cursor-pointer"
                    onClick={() => setViewingMembers(m)}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-semibold text-sm">
                          <HeartHandshake className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-label-lg text-on-surface font-semibold">
                            {m.name}
                          </p>
                          <p className="text-xs text-on-surface-variant line-clamp-1 max-w-xs">
                            {m.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-on-surface">
                      {m.leader}
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-medium">
                        <Users className="w-3.5 h-3.5" />
                        {m.memberCount}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                          m.status === "Aktif"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500",
                        )}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            m.status === "Aktif" ? "bg-emerald-500" : "bg-slate-400",
                          )}
                        />
                        {m.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() =>
                            setEditing({
                              id: m.id,
                              name: m.name,
                              description: m.description,
                              leader: m.leader,
                              status: m.status,
                            })
                          }
                          className="p-2 text-outline hover:text-primary transition-colors rounded-lg hover:bg-primary/5"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            setConfirmState({ mode: "delete", target: m })
                          }
                          className="p-2 text-outline hover:text-error transition-colors rounded-lg hover:bg-error/5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant/20">
            <p className="text-sm text-on-surface-variant">
              Menampilkan {(safePage - 1) * pageSize + 1}-
              {Math.min(safePage * pageSize, filteredData.length)} dari{" "}
              {filteredData.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="p-2 rounded-lg border border-outline-variant/30 hover:bg-surface-container-high disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "w-9 h-9 rounded-lg text-sm font-medium transition-all",
                      page === safePage
                        ? "bg-primary text-on-primary"
                        : "hover:bg-surface-container-high text-on-surface-variant",
                    )}
                  >
                    {page}
                  </button>
                ),
              )}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={safePage >= totalPages}
                className="p-2 rounded-lg border border-outline-variant/30 hover:bg-surface-container-high disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-xl border border-outline-variant/30 shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-title-lg text-on-surface">
                {editing.id ? "Edit Pelayanan" : "Tambah Pelayanan"}
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
                  Nama Pelayanan
                </label>
                <input
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                  className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Contoh: Worship Team"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Deskripsi
                </label>
                <textarea
                  value={editing.description}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                  className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                  rows={3}
                  placeholder="Deskripsi singkat tentang pelayanan ini"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Penanggung Jawab
                </label>
                <input
                  value={editing.leader}
                  onChange={(e) =>
                    setEditing({ ...editing, leader: e.target.value })
                  }
                  className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Nama penanggung jawab"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Status
                </label>
                <select
                  value={editing.status}
                  onChange={(e) =>
                    setEditing({ ...editing, status: e.target.value })
                  }
                  className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Tidak Aktif">Tidak Aktif</option>
                </select>
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
                  setConfirmState({
                    mode: editing.id ? "edit" : "create",
                  })
                }
                disabled={!editing.name || !editing.description || !editing.leader}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:opacity-90 transition-opacity text-sm disabled:opacity-40"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingMembers && (
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl border border-outline-variant/30 shadow-xl p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-title-lg text-on-surface">
                  {viewingMembers.name}
                </h3>
                <p className="text-sm text-on-surface-variant">
                  {viewingMembers.description}
                </p>
              </div>
              <button
                onClick={() => setViewingMembers(null)}
                className="p-1.5 rounded-lg hover:bg-surface-container-high"
              >
                <X className="w-5 h-5 text-outline" />
              </button>
            </div>

            <div className="flex items-center justify-between mb-4">
              <p className="font-label-lg text-on-surface">
                Anggota ({members.length})
              </p>
              <button
                onClick={() => setAddingMember({ ...defaultMemberForm })}
                className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <UserPlus className="w-4 h-4" />
                Tambah Anggota
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {members.length === 0 ? (
                <div className="text-center py-8 text-on-surface-variant">
                  Belum ada anggota di pelayanan ini.
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-container-high transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
                          {m.initials}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-on-surface">
                            {m.name}
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            {m.role} &middot; Bergabung {m.joinedAt}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setMemberConfirm({ mode: "remove", target: m })
                        }
                        className="p-2 text-outline hover:text-error transition-colors rounded-lg hover:bg-error/5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {addingMember && viewingMembers && (
        <div className="fixed inset-0 bg-black/40 z-[75] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl border border-outline-variant/30 shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-title-lg text-on-surface">Tambah Anggota</h3>
              <button
                onClick={() => setAddingMember(null)}
                className="p-1.5 rounded-lg hover:bg-surface-container-high"
              >
                <X className="w-5 h-5 text-outline" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Pilih Jemaat
                </label>
                <select
                  value={addingMember.jemaatId}
                  onChange={(e) =>
                    setAddingMember({
                      ...addingMember,
                      jemaatId: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="">-- Pilih Jemaat --</option>
                  {jemaatList.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Peran</label>
                <select
                  value={addingMember.role}
                  onChange={(e) =>
                    setAddingMember({ ...addingMember, role: e.target.value })
                  }
                  className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  {memberRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setAddingMember(null)}
                className="px-4 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-high transition-colors text-sm"
              >
                Batal
              </button>
              <button
                onClick={() =>
                  setMemberConfirm({ mode: "add" })
                }
                disabled={!addingMember.jemaatId}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:opacity-90 transition-opacity text-sm disabled:opacity-40"
              >
                Tambah
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
                ? `Hapus pelayanan "${confirmState.target?.name}"? Semua anggota juga akan dihapus.`
                : `Simpan data pelayanan?`}
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

      {memberConfirm && (
        <div className="fixed inset-0 bg-black/40 z-[80] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl border border-outline-variant/30 shadow-xl p-6">
            <h3 className="font-title-lg text-on-surface mb-2">Konfirmasi</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              {memberConfirm.mode === "remove"
                ? `Hapus "${memberConfirm.target?.name}" dari pelayanan ini?`
                : `Tambah jemaat ke pelayanan ini?`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setMemberConfirm(null)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-high transition-colors text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleMemberConfirmAction}
                disabled={isSubmitting}
                className={cn(
                  "px-4 py-2 rounded-lg text-on-primary text-sm font-medium transition-opacity",
                  memberConfirm.mode === "remove"
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
