import type express from "express";
import fs from "node:fs";
import { degrees, PDFDocument, type PDFImage } from "pdf-lib";
import { prisma } from "../src/lib/prisma";
import { sanitizeLetterContent } from "../src/lib/letter";
import { deleteAttachmentsOf, nextId, parseDateInput, resolveStoredPath, str, toDateOnly } from "./korwil";
import { getLetterhead } from "./letter";

const ROMAN_MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

const toDirection = (value: unknown) => (String(value || "").toUpperCase() === "MASUK" ? "MASUK" : "KELUAR");

type SuratRow = Awaited<ReturnType<typeof prisma.surat.findFirstOrThrow>>;

const mapSurat = (item: SuratRow, lampiranCount = 0) => ({
  id: item.id,
  direction: item.direction,
  letterNumber: item.letterNumber,
  letterDate: toDateOnly(item.letterDate),
  subject: item.subject,
  counterparty: item.counterparty,
  category: item.category,
  notes: item.notes,
  content: parseContent(item.content),
  lampiranCount,
});

function parseContent(raw: string | null) {
  if (!raw) return null;
  try {
    return sanitizeLetterContent(JSON.parse(raw));
  } catch {
    return null;
  }
}

const suratData = (body: Record<string, unknown>) => ({
  direction: body.direction !== undefined ? toDirection(body.direction) : undefined,
  letterNumber: str(body.letterNumber),
  letterDate: parseDateInput(body.letterDate),
  subject: str(body.subject),
  counterparty: str(body.counterparty),
  category: str(body.category),
  notes: str(body.notes),
  // Letter generator body: object to save, null to turn the letter back into a plain archive record.
  content: body.content === undefined ? undefined : body.content === null ? null : JSON.stringify(sanitizeLetterContent(body.content)),
});

const createSuratId = () =>
  nextId("SR-", (prefix) =>
    prisma.surat.findFirst({ where: { id: { startsWith: prefix } }, orderBy: { id: "desc" }, select: { id: true } }),
  );

// Another outgoing letter already using this number? Incoming numbers come from other senders, so they may repeat.
const duplicateOutgoing = async (letterNumber: string, excludeId?: string) =>
  (await prisma.surat.count({
    where: { direction: "KELUAR", letterNumber, id: excludeId ? { not: excludeId } : undefined },
  })) > 0;

// EXIF orientation of a JPEG (1 = upright). Phone cameras store rotation here instead of rotating pixels.
function jpegOrientation(buf: Buffer): number {
  try {
    if (buf.readUInt16BE(0) !== 0xffd8) return 1;
    let offset = 2;
    while (offset + 4 < buf.length) {
      const marker = buf.readUInt16BE(offset);
      if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) break;
      const size = buf.readUInt16BE(offset + 2);
      if (marker === 0xffe1 && buf.toString("ascii", offset + 4, offset + 8) === "Exif") {
        const tiff = offset + 10;
        const little = buf.toString("ascii", tiff, tiff + 2) === "II";
        const u16 = (o: number) => (little ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
        const u32 = (o: number) => (little ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
        const ifd = tiff + u32(tiff + 4);
        const entries = u16(ifd);
        for (let i = 0; i < entries; i += 1) {
          const entry = ifd + 2 + i * 12;
          if (u16(entry) === 0x0112) return u16(entry + 8);
        }
        return 1;
      }
      offset += 2 + size;
    }
  } catch {
    // Malformed metadata: treat as upright.
  }
  return 1;
}

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 12;

// One image per A4 page (landscape if the image is), scaled to fit and centred.
function drawImagePage(doc: PDFDocument, image: PDFImage, orientation: number) {
  const sideways = orientation === 6 || orientation === 8;
  const shownW = sideways ? image.height : image.width;
  const shownH = sideways ? image.width : image.height;
  const [pageW, pageH] = shownW > shownH ? [A4[1], A4[0]] : A4;
  const page = doc.addPage([pageW, pageH]);

  const scale = Math.min((pageW - MARGIN * 2) / shownW, (pageH - MARGIN * 2) / shownH);
  const W = shownW * scale;
  const H = shownH * scale;
  const bx = (pageW - W) / 2;
  const by = (pageH - H) / 2;

  // pdf-lib rotates counter-clockwise around (x, y); width/height are in the image's own orientation.
  if (orientation === 3) {
    page.drawImage(image, { x: bx + W, y: by + H, width: W, height: H, rotate: degrees(180) });
  } else if (orientation === 6) {
    page.drawImage(image, { x: bx, y: by + H, width: H, height: W, rotate: degrees(-90) });
  } else if (orientation === 8) {
    page.drawImage(image, { x: bx + W, y: by, width: H, height: W, rotate: degrees(90) });
  } else {
    page.drawImage(image, { x: bx, y: by, width: W, height: H });
  }
}

const pdfFileName = (item: SuratRow) =>
  `${item.letterNumber} - ${item.subject}`
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150) + ".pdf";

export function registerSuratRoutes(app: express.Express) {
  app.get("/api/korwil/surat", async (_req, res) => {
    try {
      const [list, counts] = await Promise.all([
        prisma.surat.findMany({ orderBy: [{ letterDate: "desc" }, { createdAt: "desc" }] }),
        prisma.lampiran.groupBy({ by: ["ownerId"], where: { ownerType: "SURAT" }, _count: { id: true } }),
      ]);
      const countMap = new Map(counts.map((c) => [c.ownerId, c._count.id]));
      res.json(list.map((item) => mapSurat(item, countMap.get(item.id) ?? 0)));
    } catch (error) {
      console.error("Failed to load surat", error);
      res.status(500).json({ message: "Gagal mengambil data surat" });
    }
  });

  // Registered before /:id so "next-number" is not read as an id.
  app.get("/api/korwil/surat/next-number", async (req, res) => {
    try {
      const date = parseDateInput(req.query.date) ?? new Date();
      const year = date.getUTCFullYear();
      const list = await prisma.surat.findMany({
        where: {
          direction: "KELUAR",
          letterDate: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) },
        },
        select: { letterNumber: true },
      });
      const { letterCode } = await getLetterhead();
      const highest = list
        .map((item) => Number.parseInt(item.letterNumber, 10))
        .filter(Number.isFinite)
        .reduce((max, n) => Math.max(max, n), 0);
      res.json({
        letterNumber: `${String(highest + 1).padStart(2, "0")}/${letterCode}/${ROMAN_MONTHS[date.getUTCMonth()]}/${year}`,
      });
    } catch (error) {
      console.error("Failed to suggest letter number", error);
      res.status(500).json({ message: "Gagal membuat saran nomor surat" });
    }
  });

  app.get("/api/korwil/surat/:id", async (req, res) => {
    try {
      const item = await prisma.surat.findUnique({ where: { id: req.params.id } });
      if (!item) {
        res.status(404).json({ message: "Surat tidak ditemukan" });
        return;
      }
      res.json(mapSurat(item));
    } catch (error) {
      console.error("Failed to load surat", error);
      res.status(500).json({ message: "Gagal mengambil data surat" });
    }
  });

  app.post("/api/korwil/surat", async (req, res) => {
    try {
      const data = suratData(req.body ?? {});
      if (!data.letterNumber || !data.subject || !data.letterDate) {
        res.status(400).json({ message: "No surat, tanggal, dan perihal wajib diisi" });
        return;
      }
      const direction = data.direction ?? "KELUAR";
      if (direction === "KELUAR" && await duplicateOutgoing(data.letterNumber)) {
        res.status(409).json({ message: `No surat ${data.letterNumber} sudah dipakai surat keluar lain` });
        return;
      }
      const created = await prisma.surat.create({
        data: {
          ...data,
          id: await createSuratId(),
          direction,
          letterNumber: data.letterNumber,
          letterDate: data.letterDate,
          subject: data.subject,
        },
      });
      res.status(201).json(mapSurat(created));
    } catch (error) {
      console.error("Failed to create surat", error);
      res.status(500).json({ message: "Gagal menambah surat" });
    }
  });

  app.patch("/api/korwil/surat/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = suratData(req.body ?? {});
      if (data.letterNumber === "" || data.subject === "" || data.letterDate === null) {
        res.status(400).json({ message: "No surat, tanggal, dan perihal wajib diisi" });
        return;
      }
      const current = await prisma.surat.findUnique({ where: { id } });
      if (!current) {
        res.status(404).json({ message: "Surat tidak ditemukan" });
        return;
      }
      const direction = data.direction ?? current.direction;
      const letterNumber = data.letterNumber ?? current.letterNumber;
      if (direction === "KELUAR" && await duplicateOutgoing(letterNumber, id)) {
        res.status(409).json({ message: `No surat ${letterNumber} sudah dipakai surat keluar lain` });
        return;
      }
      const updated = await prisma.surat.update({ where: { id }, data: { ...data, letterDate: data.letterDate ?? undefined } });
      res.json(mapSurat(updated));
    } catch (error) {
      console.error("Failed to update surat", error);
      res.status(500).json({ message: "Gagal memperbarui surat" });
    }
  });

  app.delete("/api/korwil/surat/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await deleteAttachmentsOf("SURAT", id);
      await prisma.surat.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete surat", error);
      res.status(500).json({ message: "Gagal menghapus surat" });
    }
  });

  // Joins the letter's photos (JPG/PNG) and PDFs, in upload order, into one downloadable PDF.
  app.get("/api/korwil/surat/:id/pdf", async (req, res) => {
    try {
      const item = await prisma.surat.findUnique({ where: { id: req.params.id } });
      if (!item) {
        res.status(404).json({ message: "Surat tidak ditemukan" });
        return;
      }
      const files = await prisma.lampiran.findMany({
        where: { ownerType: "SURAT", ownerId: item.id },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });

      const doc = await PDFDocument.create();
      doc.setTitle(`${item.letterNumber} - ${item.subject}`);
      doc.setSubject(item.subject);

      for (const file of files) {
        const absolute = resolveStoredPath(file.storedPath);
        if (!fs.existsSync(absolute)) continue;
        const bytes = await fs.promises.readFile(absolute);
        try {
          if (file.mimeType === "image/jpeg") {
            drawImagePage(doc, await doc.embedJpg(bytes), jpegOrientation(bytes));
          } else if (file.mimeType === "image/png") {
            drawImagePage(doc, await doc.embedPng(bytes), 1);
          } else if (file.mimeType === "application/pdf") {
            const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
            const pages = await doc.copyPages(source, source.getPageIndices());
            pages.forEach((page) => doc.addPage(page));
          }
        } catch (error) {
          console.warn(`Skipping lampiran ${file.id} in surat PDF`, error);
        }
      }

      if (doc.getPageCount() === 0) {
        res.status(400).json({ message: "Belum ada foto (JPG/PNG) atau PDF surat untuk dijadikan PDF" });
        return;
      }

      const output = await doc.save();
      const disposition = req.query.download === "1" ? "attachment" : "inline";
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `${disposition}; filename*=UTF-8''${encodeURIComponent(pdfFileName(item))}`);
      res.send(Buffer.from(output));
    } catch (error) {
      console.error("Failed to build surat PDF", error);
      res.status(500).json({ message: "Gagal membuat PDF surat" });
    }
  });
}

export async function searchSurat(q: string) {
  const list = await prisma.surat.findMany({
    where: { OR: [{ letterNumber: { contains: q } }, { subject: { contains: q } }, { counterparty: { contains: q } }] },
    orderBy: { letterDate: "desc" },
    take: 5,
  });
  return list.map((item) => ({
    id: item.id,
    type: "surat",
    title: item.subject,
    subtitle: `Surat ${item.direction === "MASUK" ? "Masuk" : "Keluar"} • ${item.letterNumber}`,
    href: `/korwil/surat/${item.id}`,
  }));
}
