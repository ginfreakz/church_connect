import type express from "express";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { prisma } from "../src/lib/prisma";

// Uploaded files live next to the database, outside git. Back up this folder together with church-connect.db.
export const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const OWNER_TYPES = {
  GEREJA_LOKAL: "gereja-lokal",
  ROHANIWAN: "rohaniwan",
  SURAT: "surat",
} as const;
export type OwnerType = keyof typeof OWNER_TYPES;

const isOwnerType = (value: unknown): value is OwnerType =>
  typeof value === "string" && value in OWNER_TYPES;

export const toDateOnly = (value: Date | null) => (value ? value.toISOString().split("T")[0] : null);

export const parseDateInput = (value: unknown): Date | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export const str = (value: unknown): string | undefined =>
  typeof value === "string" ? value.trim() : undefined;

const toJabatan = (value: unknown) => (String(value || "").toUpperCase() === "PDT" ? "PDT" : "PDM");

const toGender = (value: unknown) => {
  const v = String(value || "").toUpperCase();
  if (v === "LAKI_LAKI" || v === "PEREMPUAN") return v;
  return "";
};

export const nextId = async (prefix: string, findLatest: (prefix: string) => Promise<{ id: string } | null>) => {
  const latest = await findLatest(prefix);
  const nextNumber = latest ? Number.parseInt(latest.id.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
};

const createGerejaLokalId = () =>
  nextId("GL-", (prefix) =>
    prisma.gerejaLokal.findFirst({ where: { id: { startsWith: prefix } }, orderBy: { id: "desc" }, select: { id: true } }),
  );

const createRohaniwanId = () =>
  nextId("RW-", (prefix) =>
    prisma.rohaniwan.findFirst({ where: { id: { startsWith: prefix } }, orderBy: { id: "desc" }, select: { id: true } }),
  );

// Windows-safe file name: keeps letters, digits, dot, dash, underscore and spaces.
const safeFileName = (name: string) => {
  const ext = path.extname(name).slice(0, 10);
  const base = path.basename(name, path.extname(name))
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .slice(0, 80) || "file";
  return `${base}${ext.replace(/[^\w.]/g, "")}`;
};

export const resolveStoredPath = (storedPath: string) => {
  const absolute = path.resolve(UPLOADS_DIR, storedPath);
  if (!absolute.startsWith(UPLOADS_DIR + path.sep)) {
    throw new Error("Invalid stored path");
  }
  return absolute;
};

const removeStoredFile = async (storedPath: string) => {
  try {
    await fs.promises.unlink(resolveStoredPath(storedPath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
};

export const deleteAttachmentsOf = async (ownerType: OwnerType, ownerId: string) => {
  const files = await prisma.lampiran.findMany({ where: { ownerType, ownerId } });
  for (const file of files) {
    await removeStoredFile(file.storedPath);
  }
  await prisma.lampiran.deleteMany({ where: { ownerType, ownerId } });
  await fs.promises.rm(path.join(UPLOADS_DIR, OWNER_TYPES[ownerType], ownerId), { recursive: true, force: true });
};

const mapLampiran = (item: {
  id: number;
  label: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}) => ({
  id: item.id,
  label: item.label,
  originalName: item.originalName,
  mimeType: item.mimeType,
  size: item.size,
  createdAt: item.createdAt.toISOString(),
  url: `/api/lampiran/${item.id}/file`,
});

type RohaniwanRow = Awaited<ReturnType<typeof prisma.rohaniwan.findFirstOrThrow>>;

const mapRohaniwan = (item: RohaniwanRow, gerejaNames: Map<string, string>, lampiranCount = 0) => ({
  id: item.id,
  name: item.name,
  jabatan: item.jabatan,
  isGembala: item.isGembala,
  gerejaLokalId: item.gerejaLokalId,
  gerejaLokalName: item.gerejaLokalId ? gerejaNames.get(item.gerejaLokalId) ?? null : null,
  nir: item.nir,
  nirExpiry: toDateOnly(item.nirExpiry),
  cardNumber: item.cardNumber,
  cardExpiry: toDateOnly(item.cardExpiry),
  address: item.address,
  phone: item.phone,
  birthPlace: item.birthPlace,
  birthDate: toDateOnly(item.birthDate),
  gender: item.gender,
  nationality: item.nationality,
  churchName: item.churchName,
  churchAddress: item.churchAddress,
  notes: item.notes,
  lampiranCount,
});

type GerejaRow = Awaited<ReturnType<typeof prisma.gerejaLokal.findFirstOrThrow>>;

const mapGereja = (item: GerejaRow, extra: { lampiranCount?: number; gembala?: Array<{ id: string; name: string; jabatan: string }> } = {}) => ({
  id: item.id,
  name: item.name,
  worshipAddress: item.worshipAddress,
  secretariat: item.secretariat,
  serviceSchedule: item.serviceSchedule,
  notes: item.notes,
  lampiranCount: extra.lampiranCount ?? 0,
  gembala: extra.gembala ?? [],
});

const countLampiran = async (ownerType: OwnerType) => {
  const counts = await prisma.lampiran.groupBy({ by: ["ownerId"], where: { ownerType }, _count: { id: true } });
  return new Map(counts.map((c) => [c.ownerId, c._count.id]));
};

const gerejaNameMap = async () => {
  const list = await prisma.gerejaLokal.findMany({ select: { id: true, name: true } });
  return new Map(list.map((g) => [g.id, g.name]));
};

const rohaniwanData = (body: Record<string, unknown>) => ({
  name: str(body.name),
  jabatan: body.jabatan !== undefined ? toJabatan(body.jabatan) : undefined,
  isGembala: typeof body.isGembala === "boolean" ? body.isGembala : undefined,
  gerejaLokalId: body.gerejaLokalId === undefined ? undefined : (str(body.gerejaLokalId) || null),
  nir: str(body.nir),
  nirExpiry: parseDateInput(body.nirExpiry),
  cardNumber: str(body.cardNumber),
  cardExpiry: parseDateInput(body.cardExpiry),
  address: str(body.address),
  phone: str(body.phone),
  birthPlace: str(body.birthPlace),
  birthDate: parseDateInput(body.birthDate),
  gender: body.gender !== undefined ? toGender(body.gender) : undefined,
  nationality: str(body.nationality),
  churchName: str(body.churchName),
  churchAddress: str(body.churchAddress),
  notes: str(body.notes),
});

const gerejaData = (body: Record<string, unknown>) => ({
  name: str(body.name),
  worshipAddress: str(body.worshipAddress),
  secretariat: str(body.secretariat),
  serviceSchedule: str(body.serviceSchedule),
  notes: str(body.notes),
});

export function registerKorwilRoutes(app: express.Express) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, _file, cb) => {
        const ownerType = req.body.ownerType as OwnerType;
        const ownerId = String(req.body.ownerId || "");
        if (!isOwnerType(ownerType) || !/^[A-Z]{2}-\d+$/.test(ownerId)) {
          cb(new Error("INVALID_OWNER"), "");
          return;
        }
        const dir = path.join(UPLOADS_DIR, OWNER_TYPES[ownerType], ownerId);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        cb(null, `${Date.now()}-${safeFileName(file.originalname)}`);
      },
    }),
    // Browsers send file names as UTF-8; multer's default (latin1) garbles accented names.
    defParamCharset: "utf8",
    limits: { fileSize: MAX_FILE_SIZE, files: 20 },
  });

  // ==================== GEREJA LOKAL ====================

  app.get("/api/korwil/gereja-lokal", async (_req, res) => {
    try {
      const [list, counts, gembala] = await Promise.all([
        prisma.gerejaLokal.findMany({ orderBy: { name: "asc" } }),
        countLampiran("GEREJA_LOKAL"),
        prisma.rohaniwan.findMany({
          where: { isGembala: true, gerejaLokalId: { not: null } },
          select: { id: true, name: true, jabatan: true, gerejaLokalId: true },
        }),
      ]);
      res.json(list.map((item) => mapGereja(item, {
        lampiranCount: counts.get(item.id) ?? 0,
        gembala: gembala.filter((g) => g.gerejaLokalId === item.id).map(({ id, name, jabatan }) => ({ id, name, jabatan })),
      })));
    } catch (error) {
      console.error("Failed to load gereja lokal", error);
      res.status(500).json({ message: "Gagal mengambil data gereja lokal" });
    }
  });

  app.get("/api/korwil/gereja-lokal/:id", async (req, res) => {
    try {
      const item = await prisma.gerejaLokal.findUnique({ where: { id: req.params.id } });
      if (!item) {
        res.status(404).json({ message: "Gereja lokal tidak ditemukan" });
        return;
      }
      const gembala = await prisma.rohaniwan.findMany({
        where: { isGembala: true, gerejaLokalId: item.id },
        select: { id: true, name: true, jabatan: true },
        orderBy: { name: "asc" },
      });
      res.json(mapGereja(item, { gembala }));
    } catch (error) {
      console.error("Failed to load gereja lokal", error);
      res.status(500).json({ message: "Gagal mengambil data gereja lokal" });
    }
  });

  app.post("/api/korwil/gereja-lokal", async (req, res) => {
    try {
      const data = gerejaData(req.body ?? {});
      if (!data.name || !data.worshipAddress) {
        res.status(400).json({ message: "Nama gereja dan alamat lokasi ibadah wajib diisi" });
        return;
      }
      const created = await prisma.gerejaLokal.create({
        data: { ...data, id: await createGerejaLokalId(), name: data.name, worshipAddress: data.worshipAddress },
      });
      res.status(201).json(mapGereja(created));
    } catch (error) {
      console.error("Failed to create gereja lokal", error);
      res.status(500).json({ message: "Gagal menambah gereja lokal" });
    }
  });

  app.patch("/api/korwil/gereja-lokal/:id", async (req, res) => {
    try {
      const data = gerejaData(req.body ?? {});
      if (data.name === "" || data.worshipAddress === "") {
        res.status(400).json({ message: "Nama gereja dan alamat lokasi ibadah wajib diisi" });
        return;
      }
      const updated = await prisma.gerejaLokal.update({ where: { id: req.params.id }, data });
      res.json(mapGereja(updated));
    } catch (error) {
      console.error("Failed to update gereja lokal", error);
      res.status(500).json({ message: "Gagal memperbarui gereja lokal" });
    }
  });

  app.delete("/api/korwil/gereja-lokal/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await deleteAttachmentsOf("GEREJA_LOKAL", id);
      await prisma.rohaniwan.updateMany({ where: { gerejaLokalId: id }, data: { gerejaLokalId: null } });
      await prisma.gerejaLokal.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete gereja lokal", error);
      res.status(500).json({ message: "Gagal menghapus gereja lokal" });
    }
  });

  // ==================== ROHANIWAN (GEMBALA, PDM, PDT) ====================

  app.get("/api/korwil/rohaniwan", async (req, res) => {
    try {
      const gembalaOnly = req.query.gembala === "1";
      const [list, counts, names] = await Promise.all([
        prisma.rohaniwan.findMany({
          where: gembalaOnly ? { isGembala: true } : undefined,
          orderBy: { name: "asc" },
        }),
        countLampiran("ROHANIWAN"),
        gerejaNameMap(),
      ]);
      res.json(list.map((item) => mapRohaniwan(item, names, counts.get(item.id) ?? 0)));
    } catch (error) {
      console.error("Failed to load rohaniwan", error);
      res.status(500).json({ message: "Gagal mengambil data rohaniwan" });
    }
  });

  app.get("/api/korwil/rohaniwan/:id", async (req, res) => {
    try {
      const item = await prisma.rohaniwan.findUnique({ where: { id: req.params.id } });
      if (!item) {
        res.status(404).json({ message: "Data rohaniwan tidak ditemukan" });
        return;
      }
      res.json(mapRohaniwan(item, await gerejaNameMap()));
    } catch (error) {
      console.error("Failed to load rohaniwan", error);
      res.status(500).json({ message: "Gagal mengambil data rohaniwan" });
    }
  });

  app.post("/api/korwil/rohaniwan", async (req, res) => {
    try {
      const data = rohaniwanData(req.body ?? {});
      if (!data.name) {
        res.status(400).json({ message: "Nama lengkap wajib diisi" });
        return;
      }
      const created = await prisma.rohaniwan.create({
        data: { ...data, id: await createRohaniwanId(), name: data.name },
      });
      res.status(201).json(mapRohaniwan(created, await gerejaNameMap()));
    } catch (error) {
      console.error("Failed to create rohaniwan", error);
      res.status(500).json({ message: "Gagal menambah data rohaniwan" });
    }
  });

  app.patch("/api/korwil/rohaniwan/:id", async (req, res) => {
    try {
      const data = rohaniwanData(req.body ?? {});
      if (data.name === "") {
        res.status(400).json({ message: "Nama lengkap wajib diisi" });
        return;
      }
      const updated = await prisma.rohaniwan.update({ where: { id: req.params.id }, data });
      res.json(mapRohaniwan(updated, await gerejaNameMap()));
    } catch (error) {
      console.error("Failed to update rohaniwan", error);
      res.status(500).json({ message: "Gagal memperbarui data rohaniwan" });
    }
  });

  app.delete("/api/korwil/rohaniwan/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await deleteAttachmentsOf("ROHANIWAN", id);
      await prisma.rohaniwan.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete rohaniwan", error);
      res.status(500).json({ message: "Gagal menghapus data rohaniwan" });
    }
  });

  // ==================== LAMPIRAN (ATTACHMENTS) ====================

  app.get("/api/lampiran", async (req, res) => {
    try {
      const { ownerType, ownerId } = req.query;
      if (!isOwnerType(ownerType) || typeof ownerId !== "string") {
        res.status(400).json({ message: "Parameter lampiran tidak valid" });
        return;
      }
      const list = await prisma.lampiran.findMany({ where: { ownerType, ownerId }, orderBy: { createdAt: "desc" } });
      res.json(list.map(mapLampiran));
    } catch (error) {
      console.error("Failed to load lampiran", error);
      res.status(500).json({ message: "Gagal mengambil lampiran" });
    }
  });

  // Field order matters: ownerType, ownerId and label must be appended before the files.
  app.post("/api/lampiran", (req, res) => {
    upload.array("files")(req, res, async (uploadError: unknown) => {
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      const cleanup = () => Promise.all(files.map((f) => fs.promises.unlink(f.path).catch(() => undefined)));

      if (uploadError) {
        await cleanup();
        const message = uploadError instanceof multer.MulterError && uploadError.code === "LIMIT_FILE_SIZE"
          ? `Ukuran file maksimal ${MAX_FILE_SIZE / 1024 / 1024} MB`
          : "Gagal mengunggah file";
        res.status(400).json({ message });
        return;
      }

      try {
        const ownerType = req.body.ownerType as OwnerType;
        const ownerId = String(req.body.ownerId || "");
        const label = str(req.body.label) ?? "";

        if (!isOwnerType(ownerType) || files.length === 0) {
          await cleanup();
          res.status(400).json({ message: "Pilih file yang akan diunggah" });
          return;
        }

        const ownerExists = {
          GEREJA_LOKAL: () => prisma.gerejaLokal.count({ where: { id: ownerId } }),
          ROHANIWAN: () => prisma.rohaniwan.count({ where: { id: ownerId } }),
          SURAT: () => prisma.surat.count({ where: { id: ownerId } }),
        }[ownerType]();
        if (!(await ownerExists)) {
          await cleanup();
          // multer already created the folder for this (non-existent) owner.
          await fs.promises.rm(path.join(UPLOADS_DIR, OWNER_TYPES[ownerType], ownerId), { recursive: true, force: true });
          res.status(404).json({ message: "Data pemilik lampiran tidak ditemukan" });
          return;
        }

        const created = [];
        for (const file of files) {
          created.push(await prisma.lampiran.create({
            data: {
              ownerType,
              ownerId,
              label: label || path.basename(file.originalname, path.extname(file.originalname)),
              originalName: file.originalname,
              storedPath: path.relative(UPLOADS_DIR, file.path).split(path.sep).join("/"),
              mimeType: file.mimetype || "application/octet-stream",
              size: file.size,
            },
          }));
        }
        res.status(201).json(created.map(mapLampiran));
      } catch (error) {
        await cleanup();
        console.error("Failed to save lampiran", error);
        res.status(500).json({ message: "Gagal menyimpan lampiran" });
      }
    });
  });

  app.get("/api/lampiran/:id/file", async (req, res) => {
    try {
      const item = await prisma.lampiran.findUnique({ where: { id: Number(req.params.id) } });
      if (!item) {
        res.status(404).json({ message: "Lampiran tidak ditemukan" });
        return;
      }
      const absolute = resolveStoredPath(item.storedPath);
      if (!fs.existsSync(absolute)) {
        res.status(404).json({ message: "File lampiran tidak ditemukan di penyimpanan" });
        return;
      }
      const disposition = req.query.download === "1" ? "attachment" : "inline";
      res.setHeader("Content-Type", item.mimeType);
      res.setHeader("Content-Disposition", `${disposition}; filename*=UTF-8''${encodeURIComponent(item.originalName)}`);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.sendFile(absolute);
    } catch (error) {
      console.error("Failed to send lampiran", error);
      res.status(500).json({ message: "Gagal membuka lampiran" });
    }
  });

  app.patch("/api/lampiran/:id", async (req, res) => {
    try {
      const label = str(req.body?.label);
      if (!label) {
        res.status(400).json({ message: "Keterangan lampiran wajib diisi" });
        return;
      }
      const updated = await prisma.lampiran.update({ where: { id: Number(req.params.id) }, data: { label } });
      res.json(mapLampiran(updated));
    } catch (error) {
      console.error("Failed to update lampiran", error);
      res.status(500).json({ message: "Gagal memperbarui lampiran" });
    }
  });

  app.delete("/api/lampiran/:id", async (req, res) => {
    try {
      const item = await prisma.lampiran.findUnique({ where: { id: Number(req.params.id) } });
      if (!item) {
        res.status(404).json({ message: "Lampiran tidak ditemukan" });
        return;
      }
      await removeStoredFile(item.storedPath);
      await prisma.lampiran.delete({ where: { id: item.id } });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete lampiran", error);
      res.status(500).json({ message: "Gagal menghapus lampiran" });
    }
  });
}

// Used by the global search in the top bar.
export async function searchKorwil(q: string) {
  const [gereja, rohaniwan] = await Promise.all([
    prisma.gerejaLokal.findMany({
      where: { OR: [{ name: { contains: q } }, { worshipAddress: { contains: q } }] },
      take: 5,
    }),
    prisma.rohaniwan.findMany({
      where: { OR: [{ name: { contains: q } }, { nir: { contains: q } }, { cardNumber: { contains: q } }] },
      take: 5,
    }),
  ]);
  return [
    ...gereja.map((item) => ({
      id: item.id,
      type: "gereja-lokal",
      title: item.name,
      subtitle: `Gereja Lokal • ${item.worshipAddress}`,
      href: `/korwil/gereja-lokal/${item.id}`,
    })),
    ...rohaniwan.map((item) => ({
      id: item.id,
      type: "rohaniwan",
      title: `${item.jabatan === "PDT" ? "Pdt." : "Pdm."} ${item.name}`,
      subtitle: `${item.isGembala ? "Gembala Jemaat" : "Rohaniwan"}${item.nir ? ` • NIR ${item.nir}` : ""}`,
      href: `/korwil/rohaniwan/${item.id}`,
    })),
  ];
}
