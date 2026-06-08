import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "./src/lib/prisma";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const statusLabel: Record<string, string> = {
    AKTIF: "Aktif",
    TIDAK_AKTIF: "Tidak Aktif",
  };

  const typeLabel: Record<string, string> = {
    PEMASUKAN: "Pemasukan",
    PENGELUARAN: "Pengeluaran",
  };

  const formatDate = (value: Date) => {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(value);
  };

  const toJemaatStatus = (value: string | undefined): string => {
    if (value?.toLowerCase() === "tidak aktif") {
      return "TIDAK_AKTIF";
    }
    return "AKTIF";
  };

  const toTransactionType = (value: string | undefined): string => {
    if (value?.toLowerCase() === "pengeluaran") {
      return "PENGELUARAN";
    }
    return "PEMASUKAN";
  };

  const toRole = (value: string | undefined): string => {
    switch ((value || "").toLowerCase()) {
      case "keuangan":
        return "KEUANGAN";
      case "jemaat":
        return "JEMAAT";
      default:
        return "ADMIN";
    }
  };

  const mapRoleLabel = (value: string) => {
    if (value === "KEUANGAN") return "keuangan";
    if (value === "JEMAAT") return "jemaat";
    return "admin";
  };

  const buildInitials = (name: string) => {
    const words = name
      .split(" ")
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2);
    return words.map((part) => part[0].toUpperCase()).join("") || "NA";
  };

  const createJemaatId = async () => {
    const year = new Date().getFullYear();
    const prefix = `JM-${year}-`;
    const latest = await prisma.jemaat.findFirst({
      where: { id: { startsWith: prefix } },
      orderBy: { id: "desc" },
      select: { id: true },
    });

    const nextNumber = latest ? Number.parseInt(latest.id.slice(-3), 10) + 1 : 1;
    return `${prefix}${String(nextNumber).padStart(3, "0")}`;
  };

  const createMinistryId = async () => {
    const prefix = "MN-";
    const latest = await prisma.ministry.findFirst({
      where: { id: { startsWith: prefix } },
      orderBy: { id: "desc" },
      select: { id: true },
    });
    const nextNumber = latest ? Number.parseInt(latest.id.slice(3), 10) + 1 : 1;
    return `${prefix}${String(nextNumber).padStart(3, "0")}`;
  };

  const createMinistryMemberId = async () => {
    const prefix = "MM-";
    const latest = await prisma.ministryMember.findFirst({
      where: { id: { startsWith: prefix } },
      orderBy: { id: "desc" },
      select: { id: true },
    });
    const nextNumber = latest ? Number.parseInt(latest.id.slice(3), 10) + 1 : 1;
    return `${prefix}${String(nextNumber).padStart(3, "0")}`;
  };

  const createEventId = async () => {
    const prefix = "EV-";
    const latest = await prisma.event.findFirst({
      where: { id: { startsWith: prefix } },
      orderBy: { id: "desc" },
      select: { id: true },
    });
    const nextNumber = latest ? Number.parseInt(latest.id.slice(3), 10) + 1 : 1;
    return `${prefix}${String(nextNumber).padStart(3, "0")}`;
  };

  const eventTypeLabel: Record<string, string> = {
    UMUM: "Umum",
    IBADAH: "Ibadah",
    RAPAT: "Rapat",
    ULANG_TAHUN: "Ulang Tahun",
  };

  const toEventType = (value: string | undefined): string => {
    switch ((value || "").toLowerCase()) {
      case "ibadah":
        return "IBADAH";
      case "rapat":
        return "RAPAT";
      case "ulang tahun":
        return "ULANG_TAHUN";
      default:
        return "UMUM";
    }
  };

  const getUserIdFromHeader = (req: express.Request) => {
    const rawValue = req.header("x-user-id");
    if (!rawValue) return null;
    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  };

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password, role } = req.body as {
        email?: string;
        password?: string;
        role?: string;
      };

      if (!email || !password) {
        res.status(400).json({ message: "Email dan kata sandi wajib diisi" });
        return;
      }

      const user = await prisma.user.findUnique({ where: { email } });

      if (!user || user.passwordHash !== password) {
        res.status(401).json({ message: "Email atau kata sandi tidak valid" });
        return;
      }

      if (role && toRole(role) !== user.role) {
        res.status(403).json({ message: "Peran akun tidak sesuai" });
        return;
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          role: mapRoleLabel(user.role),
          name: "Admin Pusat",
          openingBalance: user.openingBalance,
        },
      });
    } catch (error) {
      console.error("Failed to login", error);
      res.status(500).json({ message: "Gagal melakukan login" });
    }
  });

  app.get("/api/stats", async (req, res) => {
    try {
      const totalJemaat = await prisma.jemaat.count();
      const txAmounts = await prisma.transaction.findMany({
        select: { amount: true },
      });

      const pemasukan = txAmounts
        .filter((item) => item.amount > 0)
        .reduce((sum, item) => sum + item.amount, 0);

      const pengeluaran = txAmounts
        .filter((item) => item.amount < 0)
        .reduce((sum, item) => sum + Math.abs(item.amount), 0);

      res.json({
        totalJemaat,
        pemasukan,
        pengeluaran,
        growth: "+12%",
      });
    } catch (error) {
      console.error("Failed to load stats", error);
      res.status(500).json({ message: "Gagal mengambil data statistik" });
    }
  });

  app.get("/api/jemaat", async (req, res) => {
    try {
      const jemaat = await prisma.jemaat.findMany({
        orderBy: { createdAt: "desc" },
      });

      res.json(
        jemaat.map((item) => ({
          id: item.id,
          name: item.name,
          address: item.address,
          phone: item.phone,
          status: statusLabel[item.status],
          initials: item.initials,
          birthDate: item.birthDate ? item.birthDate.toISOString().split("T")[0] : null,
        })),
      );
    } catch (error) {
      console.error("Failed to load jemaat", error);
      res.status(500).json({ message: "Gagal mengambil data jemaat" });
    }
  });

  app.post("/api/jemaat", async (req, res) => {
    try {
      const { name, address, phone, status, birthDate } = req.body as {
        name?: string;
        address?: string;
        phone?: string;
        status?: string;
        birthDate?: string;
      };

      if (!name || !address || !phone) {
        res.status(400).json({ message: "Nama, alamat, dan no HP wajib diisi" });
        return;
      }

      const id = await createJemaatId();
      const created = await prisma.jemaat.create({
        data: {
          id,
          name,
          address,
          phone,
          status: toJemaatStatus(status),
          initials: buildInitials(name),
          birthDate: birthDate ? new Date(birthDate) : null,
        },
      });

      res.status(201).json({
        id: created.id,
        name: created.name,
        address: created.address,
        phone: created.phone,
        status: statusLabel[created.status],
        initials: created.initials,
        birthDate: created.birthDate ? created.birthDate.toISOString().split("T")[0] : null,
      });
    } catch (error) {
      console.error("Failed to create jemaat", error);
      res.status(500).json({ message: "Gagal menambah jemaat" });
    }
  });

  app.patch("/api/jemaat/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, status, address, phone, birthDate } = req.body as {
        name?: string;
        status?: string;
        address?: string;
        phone?: string;
        birthDate?: string | null;
      };

      const updated = await prisma.jemaat.update({
        where: { id },
        data: {
          name,
          status: status ? toJemaatStatus(status) : undefined,
          address,
          phone,
          initials: name ? buildInitials(name) : undefined,
          birthDate: birthDate !== undefined ? (birthDate ? new Date(birthDate) : null) : undefined,
        },
      });

      res.json({
        id: updated.id,
        name: updated.name,
        address: updated.address,
        phone: updated.phone,
        status: statusLabel[updated.status],
        initials: updated.initials,
        birthDate: updated.birthDate ? updated.birthDate.toISOString().split("T")[0] : null,
      });
    } catch (error) {
      console.error("Failed to update jemaat", error);
      res.status(500).json({ message: "Gagal memperbarui jemaat" });
    }
  });

  app.delete("/api/jemaat/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.jemaat.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete jemaat", error);
      res.status(500).json({ message: "Gagal menghapus jemaat" });
    }
  });

  app.get("/api/transactions", async (req, res) => {
    try {
      const type = typeof req.query.type === "string" ? req.query.type : undefined;
      const category = typeof req.query.category === "string" ? req.query.category : undefined;

      const transactions = await prisma.transaction.findMany({
        where: {
          type: type ? toTransactionType(type) : undefined,
          category: category && category !== "Semua Kategori" ? category : undefined,
        },
        orderBy: { transactionDate: "desc" },
      });

      res.json(
        transactions.map((item) => ({
          id: item.id,
          date: formatDate(item.transactionDate),
          rawDate: item.transactionDate.toISOString().split("T")[0],
          type: typeLabel[item.type],
          rawType: item.type,
          category: item.category,
          amount: item.amount,
          note: item.note,
        })),
      );
    } catch (error) {
      console.error("Failed to load transactions", error);
      res.status(500).json({ message: "Gagal mengambil data transaksi" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const { date, type, category, amount, note } = req.body as {
        date?: string;
        type?: string;
        category?: string;
        amount?: number;
        note?: string;
      };

      if (!date || !type || !category || !amount || !note) {
        res.status(400).json({ message: "Tanggal, jenis, kategori, nominal, dan keterangan wajib diisi" });
        return;
      }

      const parsedAmount = Math.abs(Number(amount));
      const txType = toTransactionType(type);

      const created = await prisma.transaction.create({
        data: {
          transactionDate: new Date(date),
          type: txType,
          category,
          amount: txType === "PEMASUKAN" ? parsedAmount : -parsedAmount,
          note,
        },
      });

      res.status(201).json({
        id: created.id,
        date: formatDate(created.transactionDate),
        rawDate: created.transactionDate.toISOString().split("T")[0],
        type: typeLabel[created.type],
        rawType: created.type,
        category: created.category,
        amount: created.amount,
        note: created.note,
      });
    } catch (error) {
      console.error("Failed to create transaction", error);
      res.status(500).json({ message: "Gagal menambah transaksi" });
    }
  });

  app.patch("/api/transactions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { date, type, category, amount, note } = req.body as {
        date?: string;
        type?: string;
        category?: string;
        amount?: number;
        note?: string;
      };

      const parsedAmount = amount !== undefined ? Math.abs(Number(amount)) : undefined;
      const txType = type ? toTransactionType(type) : undefined;

      const updated = await prisma.transaction.update({
        where: { id: Number(id) },
        data: {
          transactionDate: date ? new Date(date) : undefined,
          type: txType,
          category,
          amount: parsedAmount !== undefined ? (txType === "PEMASUKAN" || (txType === undefined && parsedAmount > 0) ? parsedAmount : -parsedAmount) : undefined,
          note,
        },
      });

      res.json({
        id: updated.id,
        date: formatDate(updated.transactionDate),
        rawDate: updated.transactionDate.toISOString().split("T")[0],
        type: typeLabel[updated.type],
        rawType: updated.type,
        category: updated.category,
        amount: updated.amount,
        note: updated.note,
      });
    } catch (error) {
      console.error("Failed to update transaction", error);
      res.status(500).json({ message: "Gagal memperbarui transaksi" });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.transaction.delete({ where: { id: Number(id) } });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete transaction", error);
      res.status(500).json({ message: "Gagal menghapus transaksi" });
    }
  });

  app.get("/api/users/opening-balance", async (req, res) => {
    try {
      const userId = getUserIdFromHeader(req);
      if (!userId) {
        res.status(400).json({ message: "User ID tidak ditemukan" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { openingBalance: true },
      });

      if (!user) {
        res.status(404).json({ message: "User tidak ditemukan" });
        return;
      }

      res.json({ openingBalance: user.openingBalance });
    } catch (error) {
      console.error("Failed to load opening balance", error);
      res.status(500).json({ message: "Gagal mengambil saldo awal" });
    }
  });

  app.put("/api/users/opening-balance", async (req, res) => {
    try {
      const userId = getUserIdFromHeader(req);
      if (!userId) {
        res.status(400).json({ message: "User ID tidak ditemukan" });
        return;
      }

      const { openingBalance } = req.body as { openingBalance?: number };
      if (typeof openingBalance !== "number" || !Number.isFinite(openingBalance)) {
        res.status(400).json({ message: "Nilai saldo awal tidak valid" });
        return;
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { openingBalance: Math.round(openingBalance) },
        select: { openingBalance: true },
      });

      res.json({ openingBalance: updated.openingBalance });
    } catch (error) {
      console.error("Failed to save opening balance", error);
      res.status(500).json({ message: "Gagal menyimpan saldo awal" });
    }
  });

  app.get("/api/reports", async (req, res) => {
    try {
      const userId = getUserIdFromHeader(req);
      const [jemaat, transactions] = await Promise.all([
        prisma.jemaat.findMany(),
        prisma.transaction.findMany({ orderBy: { transactionDate: "asc" } }),
      ]);

      const user = userId
        ? await prisma.user.findUnique({
          where: { id: userId },
          select: { openingBalance: true },
        })
        : null;

      const openingBalance = user?.openingBalance ?? 0;

      const monthMap = new Map<string, { name: string; income: number; expense: number }>();
      for (const tx of transactions) {
        const date = tx.transactionDate;
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "short" })
          .format(date)
          .toUpperCase();

        if (!monthMap.has(key)) {
          monthMap.set(key, { name: monthLabel, income: 0, expense: 0 });
        }

        const bucket = monthMap.get(key)!;
        if (tx.amount > 0) {
          bucket.income += tx.amount;
        } else {
          bucket.expense += Math.abs(tx.amount);
        }
      }

      const chartData = Array.from(monthMap.values()).slice(-6).map((item) => ({
        name: item.name,
        income: Math.round(item.income / 1000000),
        expense: Math.round(item.expense / 1000000),
      }));

      const totalJemaat = jemaat.length;
      const aktif = jemaat.filter((item) => item.status === "AKTIF").length;
      const tidakAktif = totalJemaat - aktif;

      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const currentMonthNew = jemaat.filter((item) => item.createdAt >= currentMonthStart).length;
      const previousMonthNew = jemaat.filter((item) => item.createdAt >= previousMonthStart && item.createdAt < currentMonthStart).length;

      const growthValue = previousMonthNew === 0
        ? (currentMonthNew > 0 ? 100 : 0)
        : ((currentMonthNew - previousMonthNew) / previousMonthNew) * 100;

      const growthRounded = Number(growthValue.toFixed(1));

      const statusData = [
        {
          name: "Anggota Aktif",
          value: totalJemaat ? Math.round((aktif / totalJemaat) * 100) : 0,
          color: "#005e96",
        },
        {
          name: "Tidak Aktif",
          value: totalJemaat ? Math.round((tidakAktif / totalJemaat) * 100) : 0,
          color: "#006b5f",
        },
      ];

      const recentTransactions = transactions
        .slice(-8)
        .reverse()
        .map((tx) => ({
          date: formatDate(tx.transactionDate),
          activity: tx.category,
          attendance: "-",
          total: new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
          })
            .format(Math.abs(tx.amount))
            .replace("Rp", "Rp "),
          status: tx.amount > 0 ? "Verifikasi" : "Audit Selesai",
        }));

      const totalIncome = transactions.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
      const totalExpense = transactions.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      const currentBalance = openingBalance + totalIncome - totalExpense;

      const asOfDate = new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(now);

      res.json({
        chartData,
        statusData,
        totalJemaat,
        offHistory: recentTransactions,
        jemaatGrowthPercentage: growthRounded,
        jemaatGrowthLabel: `${growthRounded >= 0 ? "+" : ""}${growthRounded}%`,
        currentBalance,
        balanceAsOf: asOfDate,
      });
    } catch (error) {
      console.error("Failed to load reports", error);
      res.status(500).json({ message: "Gagal mengambil data laporan" });
    }
  });

  app.get("/api/search", async (req, res) => {
    try {
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      if (!q) {
        res.json({ results: [] });
        return;
      }

      const [jemaatResults, transactionResults] = await Promise.all([
        prisma.jemaat.findMany({
          where: {
            OR: [
              { name: { contains: q } },
              { address: { contains: q } },
            ],
          },
          take: 5,
        }),
        prisma.transaction.findMany({
          where: {
            OR: [
              { category: { contains: q } },
              { note: { contains: q } },
            ],
          },
          orderBy: { transactionDate: "desc" },
          take: 5,
        }),
      ]);

      const results = [
        ...jemaatResults.map((item) => ({
          id: item.id,
          type: "jemaat",
          title: item.name,
          subtitle: item.address,
          href: "/jemaat",
        })),
        ...transactionResults.map((item) => ({
          id: String(item.id),
          type: "transaksi",
          title: item.category,
          subtitle: `${typeLabel[item.type]} • ${formatDate(item.transactionDate)}`,
          href: "/keuangan",
        })),
      ];

      res.json({ results });
    } catch (error) {
      console.error("Failed to search", error);
      res.status(500).json({ message: "Gagal melakukan pencarian" });
    }
  });

  // ==================== MINISTRY ENDPOINTS ====================

  app.get("/api/ministries", async (req, res) => {
    try {
      const ministries = await prisma.ministry.findMany({
        orderBy: { createdAt: "desc" },
      });

      const memberCounts = await prisma.ministryMember.groupBy({
        by: ["ministryId"],
        _count: { id: true },
      });

      const countMap = new Map(memberCounts.map((m) => [m.ministryId, m._count.id]));

      res.json(
        ministries.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          leader: item.leader,
          status: statusLabel[item.status],
          memberCount: countMap.get(item.id) || 0,
          createdAt: formatDate(item.createdAt),
        })),
      );
    } catch (error) {
      console.error("Failed to load ministries", error);
      res.status(500).json({ message: "Gagal mengambil data pelayanan" });
    }
  });

  app.post("/api/ministries", async (req, res) => {
    try {
      const { name, description, leader, status } = req.body as {
        name?: string;
        description?: string;
        leader?: string;
        status?: string;
      };

      if (!name || !description || !leader) {
        res.status(400).json({ message: "Nama, deskripsi, dan penanggung jawab wajib diisi" });
        return;
      }

      const id = await createMinistryId();
      const created = await prisma.ministry.create({
        data: { id, name, description, leader, status: toJemaatStatus(status) },
      });

      res.status(201).json({
        id: created.id,
        name: created.name,
        description: created.description,
        leader: created.leader,
        status: statusLabel[created.status],
        memberCount: 0,
      });
    } catch (error) {
      console.error("Failed to create ministry", error);
      res.status(500).json({ message: "Gagal menambah pelayanan" });
    }
  });

  app.patch("/api/ministries/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, leader, status } = req.body as {
        name?: string;
        description?: string;
        leader?: string;
        status?: string;
      };

      const updated = await prisma.ministry.update({
        where: { id },
        data: {
          name,
          description,
          leader,
          status: status ? toJemaatStatus(status) : undefined,
        },
      });

      const memberCount = await prisma.ministryMember.count({ where: { ministryId: id } });

      res.json({
        id: updated.id,
        name: updated.name,
        description: updated.description,
        leader: updated.leader,
        status: statusLabel[updated.status],
        memberCount,
      });
    } catch (error) {
      console.error("Failed to update ministry", error);
      res.status(500).json({ message: "Gagal memperbarui pelayanan" });
    }
  });

  app.delete("/api/ministries/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.ministryMember.deleteMany({ where: { ministryId: id } });
      await prisma.ministry.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete ministry", error);
      res.status(500).json({ message: "Gagal menghapus pelayanan" });
    }
  });

  // ==================== MINISTRY MEMBERS ENDPOINTS ====================

  app.get("/api/ministries/:id/members", async (req, res) => {
    try {
      const { id } = req.params;
      const members = await prisma.ministryMember.findMany({
        where: { ministryId: id },
        orderBy: { joinedAt: "desc" },
      });

      const jemaatIds = members.map((m) => m.jemaatId);
      const jemaatList = await prisma.jemaat.findMany({
        where: { id: { in: jemaatIds } },
      });
      const jemaatMap = new Map(jemaatList.map((j) => [j.id, j]));

      res.json(
        members.map((m) => {
          const j = jemaatMap.get(m.jemaatId);
          return {
            id: m.id,
            jemaatId: m.jemaatId,
            name: j?.name || "-",
            initials: j?.initials || "NA",
            role: m.role,
            joinedAt: formatDate(m.joinedAt),
          };
        }),
      );
    } catch (error) {
      console.error("Failed to load ministry members", error);
      res.status(500).json({ message: "Gagal mengambil anggota pelayanan" });
    }
  });

  app.post("/api/ministries/:id/members", async (req, res) => {
    try {
      const { id } = req.params;
      const { jemaatId, role } = req.body as {
        jemaatId?: string;
        role?: string;
      };

      if (!jemaatId || !role) {
        res.status(400).json({ message: "Jemaat dan peran wajib diisi" });
        return;
      }

      const existing = await prisma.ministryMember.findFirst({
        where: { ministryId: id, jemaatId },
      });
      if (existing) {
        res.status(400).json({ message: "Jemaat sudah terdaftar di pelayanan ini" });
        return;
      }

      const memberId = await createMinistryMemberId();
      const created = await prisma.ministryMember.create({
        data: { id: memberId, ministryId: id, jemaatId, role },
      });

      const jemaat = await prisma.jemaat.findUnique({ where: { id: jemaatId } });

      res.status(201).json({
        id: created.id,
        jemaatId: created.jemaatId,
        name: jemaat?.name || "-",
        initials: jemaat?.initials || "NA",
        role: created.role,
        joinedAt: formatDate(created.joinedAt),
      });
    } catch (error) {
      console.error("Failed to add ministry member", error);
      res.status(500).json({ message: "Gagal menambah anggota pelayanan" });
    }
  });

  app.delete("/api/ministries/:ministryId/members/:jemaatId", async (req, res) => {
    try {
      const { ministryId, jemaatId } = req.params;
      await prisma.ministryMember.deleteMany({
        where: { ministryId, jemaatId },
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to remove ministry member", error);
      res.status(500).json({ message: "Gagal menghapus anggota pelayanan" });
    }
  });

  // ==================== EVENT ENDPOINTS ====================

  app.get("/api/events", async (req, res) => {
    try {
      const month = typeof req.query.month === "string" ? Number(req.query.month) : undefined;
      const year = typeof req.query.year === "string" ? Number(req.query.year) : undefined;

      let where = {};
      if (month !== undefined && year !== undefined) {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59);
        where = { eventDate: { gte: start, lte: end } };
      }

      const events = await prisma.event.findMany({
        where,
        orderBy: { eventDate: "asc" },
      });

      res.json(
        events.map((item) => ({
          id: item.id,
          title: item.title,
          eventDate: item.eventDate.toISOString().split("T")[0],
          description: item.description,
          type: eventTypeLabel[item.type] || item.type,
          rawType: item.type,
        })),
      );
    } catch (error) {
      console.error("Failed to load events", error);
      res.status(500).json({ message: "Gagal mengambil data acara" });
    }
  });

  app.post("/api/events", async (req, res) => {
    try {
      const { title, eventDate, description, type } = req.body as {
        title?: string;
        eventDate?: string;
        description?: string;
        type?: string;
      };

      if (!title || !eventDate) {
        res.status(400).json({ message: "Judul dan tanggal wajib diisi" });
        return;
      }

      const id = await createEventId();
      const created = await prisma.event.create({
        data: {
          id,
          title,
          eventDate: new Date(eventDate),
          description: description || "",
          type: toEventType(type),
        },
      });

      res.status(201).json({
        id: created.id,
        title: created.title,
        eventDate: created.eventDate.toISOString().split("T")[0],
        description: created.description,
        type: eventTypeLabel[created.type] || created.type,
        rawType: created.type,
      });
    } catch (error) {
      console.error("Failed to create event", error);
      res.status(500).json({ message: "Gagal menambah acara" });
    }
  });

  app.patch("/api/events/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { title, eventDate, description, type } = req.body as {
        title?: string;
        eventDate?: string;
        description?: string;
        type?: string;
      };

      const updated = await prisma.event.update({
        where: { id },
        data: {
          title,
          eventDate: eventDate ? new Date(eventDate) : undefined,
          description,
          type: type ? toEventType(type) : undefined,
        },
      });

      res.json({
        id: updated.id,
        title: updated.title,
        eventDate: updated.eventDate.toISOString().split("T")[0],
        description: updated.description,
        type: eventTypeLabel[updated.type] || updated.type,
        rawType: updated.type,
      });
    } catch (error) {
      console.error("Failed to update event", error);
      res.status(500).json({ message: "Gagal memperbarui acara" });
    }
  });

  app.delete("/api/events/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.event.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete event", error);
      res.status(500).json({ message: "Gagal menghapus acara" });
    }
  });

  // ==================== DASHBOARD UPCOMING ENDPOINTS ====================

  app.get("/api/dashboard/upcoming", async (req, res) => {
    try {
      const now = new Date();
      const weekLater = new Date(now);
      weekLater.setDate(weekLater.getDate() + 7);

      const upcomingEvents = await prisma.event.findMany({
        where: {
          eventDate: { gte: now, lte: weekLater },
        },
        orderBy: { eventDate: "asc" },
      });

      const allJemaat = await prisma.jemaat.findMany({
        where: { birthDate: { not: null }, status: "AKTIF" },
        select: { id: true, name: true, initials: true, birthDate: true },
      });

      const upcomingBirthdays = allJemaat.filter((j) => {
        if (!j.birthDate) return false;
        const bMonth = j.birthDate.getMonth();
        const bDay = j.birthDate.getDate();
        const checkDate = new Date(now);
        while (checkDate <= weekLater) {
          if (checkDate.getMonth() === bMonth && checkDate.getDate() === bDay) {
            return true;
          }
          checkDate.setDate(checkDate.getDate() + 1);
        }
        return false;
      }).map((j) => {
        const age = now.getFullYear() - j.birthDate!.getFullYear();
        return {
          id: j.id,
          name: j.name,
          initials: j.initials,
          birthDate: j.birthDate!.toISOString().split("T")[0],
          turningAge: age + 1,
        };
      });

      res.json({
        events: upcomingEvents.map((e) => ({
          id: e.id,
          title: e.title,
          eventDate: e.eventDate.toISOString().split("T")[0],
          type: eventTypeLabel[e.type] || e.type,
        })),
        birthdays: upcomingBirthdays,
      });
    } catch (error) {
      console.error("Failed to load upcoming data", error);
      res.status(500).json({ message: "Gagal mengambil data mendatang" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
