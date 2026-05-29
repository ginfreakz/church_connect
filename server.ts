import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "./src/lib/prisma";
import { JemaatStatus, TransactionType, UserRole } from "./src/generated/prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const statusLabel = {
    AKTIF: "Aktif",
    TIDAK_AKTIF: "Tidak Aktif",
  } as const;

  const typeLabel = {
    PEMASUKAN: "Pemasukan",
    PENGELUARAN: "Pengeluaran",
  } as const;

  const formatDate = (value: Date) => {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(value);
  };

  const toJemaatStatus = (value: string | undefined): JemaatStatus => {
    if (value?.toLowerCase() === "tidak aktif") {
      return JemaatStatus.TIDAK_AKTIF;
    }
    return JemaatStatus.AKTIF;
  };

  const toTransactionType = (value: string | undefined): TransactionType => {
    if (value?.toLowerCase() === "pengeluaran") {
      return TransactionType.PENGELUARAN;
    }
    return TransactionType.PEMASUKAN;
  };

  const toRole = (value: string | undefined): UserRole => {
    switch ((value || "").toLowerCase()) {
      case "keuangan":
        return UserRole.KEUANGAN;
      case "jemaat":
        return UserRole.JEMAAT;
      default:
        return UserRole.ADMIN;
    }
  };

  const mapRoleLabel = (value: UserRole) => {
    if (value === UserRole.KEUANGAN) return "keuangan";
    if (value === UserRole.JEMAAT) return "jemaat";
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
        })),
      );
    } catch (error) {
      console.error("Failed to load jemaat", error);
      res.status(500).json({ message: "Gagal mengambil data jemaat" });
    }
  });

  app.post("/api/jemaat", async (req, res) => {
    try {
      const { name, address, phone, status } = req.body as {
        name?: string;
        address?: string;
        phone?: string;
        status?: string;
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
        },
      });

      res.status(201).json({
        id: created.id,
        name: created.name,
        address: created.address,
        phone: created.phone,
        status: statusLabel[created.status],
        initials: created.initials,
      });
    } catch (error) {
      console.error("Failed to create jemaat", error);
      res.status(500).json({ message: "Gagal menambah jemaat" });
    }
  });

  app.patch("/api/jemaat/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, status, address, phone } = req.body as {
        name?: string;
        status?: string;
        address?: string;
        phone?: string;
      };

      const updated = await prisma.jemaat.update({
        where: { id },
        data: {
          name,
          status: status ? toJemaatStatus(status) : undefined,
          address,
          phone,
          initials: name ? buildInitials(name) : undefined,
        },
      });

      res.json({
        id: updated.id,
        name: updated.name,
        address: updated.address,
        phone: updated.phone,
        status: statusLabel[updated.status],
        initials: updated.initials,
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
          date: formatDate(item.transactionDate),
          type: typeLabel[item.type],
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
          amount: txType === TransactionType.PEMASUKAN ? parsedAmount : -parsedAmount,
          note,
        },
      });

      res.status(201).json({
        date: formatDate(created.transactionDate),
        type: typeLabel[created.type],
        category: created.category,
        amount: created.amount,
        note: created.note,
      });
    } catch (error) {
      console.error("Failed to create transaction", error);
      res.status(500).json({ message: "Gagal menambah transaksi" });
    }
  });

  app.get("/api/reports", async (req, res) => {
    try {
      const [jemaat, transactions] = await Promise.all([
        prisma.jemaat.findMany(),
        prisma.transaction.findMany({ orderBy: { transactionDate: "asc" } }),
      ]);

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
      const aktif = jemaat.filter((item) => item.status === JemaatStatus.AKTIF).length;
      const tidakAktif = totalJemaat - aktif;

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

      res.json({
        chartData,
        statusData,
        totalJemaat,
        offHistory: recentTransactions,
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
              { name: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 5,
        }),
        prisma.transaction.findMany({
          where: {
            OR: [
              { category: { contains: q, mode: "insensitive" } },
              { note: { contains: q, mode: "insensitive" } },
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
