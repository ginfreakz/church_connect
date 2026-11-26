import type express from "express";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import puppeteer, { type Browser } from "puppeteer-core";
import { prisma } from "../src/lib/prisma";
import {
  sanitizeLetterContent,
  sanitizeLetterhead,
  type LetterContent,
  type Letterhead,
  type LetterMeta,
} from "../src/lib/letter";

// ==================== SETTINGS ====================

const LETTERHEAD_KEY = "letterhead";

export async function getLetterhead(): Promise<Letterhead> {
  const row = await prisma.setting.findUnique({ where: { key: LETTERHEAD_KEY } });
  if (!row) return sanitizeLetterhead({});
  try {
    return sanitizeLetterhead(JSON.parse(row.value));
  } catch {
    return sanitizeLetterhead({});
  }
}

// ==================== HTML TEMPLATE ====================

// Open Sans is inlined so the preview and the PDF look the same on any laptop, offline.
const FONT_DIR = path.resolve(process.cwd(), "node_modules", "@fontsource-variable", "open-sans", "files");
let fontCss: string | null = null;
function fontFaces() {
  if (fontCss !== null) return fontCss;
  const face = (file: string, range: string) => {
    const full = path.join(FONT_DIR, file);
    if (!fs.existsSync(full)) return "";
    const data = fs.readFileSync(full).toString("base64");
    return `@font-face{font-family:"Open Sans";font-style:normal;font-weight:300 800;font-display:block;src:url(data:font/woff2;base64,${data}) format("woff2");unicode-range:${range};}`;
  };
  fontCss =
    face("open-sans-latin-ext-wght-normal.woff2", "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF")
    + face("open-sans-latin-wght-normal.woff2", "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD");
  return fontCss;
}

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Escaped text with **bold**, line breaks, and [placeholders] marked (highlighted on screen only).
const rich = (value: string) =>
  esc(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[[^\]\n]{1,80}\]/g, '<mark class="ph">$&</mark>')
    .replace(/\r?\n/g, "<br>");

const formatLetterDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
};

const STYLE = `
@page { size: A4; margin: 12mm 16mm 16mm 16mm; }
* { box-sizing: border-box; }
html, body { margin: 0; }
body { font-family: "Open Sans", Arial, sans-serif; color: #111; font-size: 10.5pt; line-height: 1.42;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
@media screen {
  body { background: #e5e7eb; padding: 24px 0; }
  .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 12mm 16mm 16mm; box-shadow: 0 2px 14px rgba(0,0,0,.18); }
}
.kop { display: grid; grid-template-columns: 27mm 1fr 27mm; align-items: center; column-gap: 3mm; }
.kop .logo { width: 27mm; height: 27mm; object-fit: contain; }
.kop .center { text-align: center; }
.kop .org { font-weight: 700; font-size: 18.5pt; line-height: 1.18; }
.kop .meta { font-size: 10.5pt; line-height: 1.32; margin-top: 1.5mm; font-weight: 400; }
.kop-meta-wide { text-align: center; font-size: 10.5pt; line-height: 1.32; font-weight: 400; }
.kop-line { border: 0; border-top: 3px solid #111; margin: 1.5mm -4mm 7mm; }
.content { font-weight: 600; }
table { border-collapse: collapse; }
td { padding: 0; vertical-align: top; }
.ref td.l { width: 20mm; }
.ref td.c { width: 3mm; }
.gap { height: 7mm; }
p { margin: 0 0 4.5mm; text-align: justify; }
.fields { margin: 0 0 4.5mm; }
strong { font-weight: 800; }
mark.ph { background: none; color: inherit; }
@media screen { mark.ph { background: #fde68a; border-radius: 2px; } }
.closing { margin-top: 7mm; break-inside: avoid; }
.sign { position: relative; height: 27mm; margin: 1mm 0; }
.sign img { position: absolute; mix-blend-mode: multiply; object-fit: contain; }
.sign .signature { left: 0; top: 0; height: 27mm; max-width: 60mm; }
.sign .stamp { left: 42mm; top: -9mm; height: 36mm; max-width: 40mm; opacity: .92; }
`;

export function renderLetterHtml(letterhead: Letterhead, meta: LetterMeta, content: LetterContent, opts: { print?: boolean } = {}) {
  const lh = letterhead;
  const contact = [lh.email && `Email : ${esc(lh.email)}`, lh.phone && `Telp : ${esc(lh.phone)}`].filter(Boolean).join(" &nbsp;");

  const blocks = content.blocks.map((block) => {
    if (block.type === "paragraph") {
      return block.text.trim() ? `<p>${rich(block.text)}</p>` : "";
    }
    const rows = block.rows
      .filter((r) => r.label.trim() || r.value.trim())
      .map((r) => `<div>${rich(r.label)} : ${rich(r.value)}</div>`)
      .join("");
    return `<div class="fields">${block.title.trim() ? `<div>${rich(block.title)}</div>` : ""}${rows}</div>`;
  }).join("\n");

  const signerName = content.signerName || lh.signerName;
  const signerTitle = content.signerTitle || lh.signerTitle;
  const showImages = content.useSignature;

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>${esc(`${meta.letterNumber} - ${meta.subject}`)}</title>
<style>${fontFaces()}${STYLE}</style>
</head>
<body>
<div class="sheet">
  <header class="kop">
    <div>${lh.logoLeft ? `<img class="logo" src="${lh.logoLeft}" alt="">` : ""}</div>
    <div class="center">
      <div class="org">${esc(lh.orgLine1)}${lh.orgLine2 ? `<br>${esc(lh.orgLine2)}` : ""}</div>
      ${contact ? `<div class="meta">${contact}</div>` : ""}
    </div>
    <div>${lh.logoRight ? `<img class="logo" src="${lh.logoRight}" alt="">` : ""}</div>
  </header>
  ${lh.secretariat ? `<div class="kop-meta-wide">Sekretariat : ${esc(lh.secretariat)}</div>` : ""}
  ${lh.legalLine ? `<div class="kop-meta-wide">${esc(lh.legalLine)}</div>` : ""}
  <hr class="kop-line">

  <main class="content">
    <table class="ref">
      <tr><td class="l">Nomor</td><td class="c">:</td><td>${esc(meta.letterNumber)}</td></tr>
      <tr><td class="l">Lampiran</td><td class="c">:</td><td>${esc(content.attachmentNote || "-")}</td></tr>
      <tr><td class="l">Perihal</td><td class="c">:</td><td>${esc(meta.subject)}</td></tr>
    </table>

    <div class="gap"></div>
    <div>Kepada Yth.</div>
    ${meta.counterparty ? `<div>${rich(meta.counterparty)}</div>` : ""}
    ${content.addressLines.trim() ? `<div>${rich(content.addressLines)}</div>` : ""}
    <div class="gap"></div>

    ${blocks}

    <section class="closing">
      <div>${esc(lh.city)}${lh.city ? ", " : ""}${esc(formatLetterDate(meta.letterDate))}</div>
      <div>Hormat kami,</div>
      <div>${esc(lh.signOffChurch)}</div>
      <div class="sign">
        ${showImages && lh.signature ? `<img class="signature" src="${lh.signature}" alt="">` : ""}
        ${showImages && lh.stamp ? `<img class="stamp" src="${lh.stamp}" alt="">` : ""}
      </div>
      <div>${esc(signerName)}</div>
      <div>${esc(signerTitle)}</div>
    </section>
  </main>
</div>
${opts.print ? "<script>window.addEventListener('load', () => setTimeout(() => window.print(), 300));</script>" : ""}
</body>
</html>`;
}

// ==================== PDF (headless Edge / Chrome) ====================

export class PdfEngineMissingError extends Error {}

function findBrowser(): string | null {
  const local = process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
  const candidates = [
    process.env.PDF_BROWSER_PATH,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(local, "Google", "Chrome", "Application", "chrome.exe"),
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/microsoft-edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  return candidates.find((p): p is string => !!p && fs.existsSync(p)) ?? null;
}

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });

async function waitForDevTools(port: number, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return true;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

// msedge.exe often relaunches itself and exits right away, so puppeteer.launch() (which watches the
// child process) fails. Start the browser on a known port and connect over DevTools instead.
export async function htmlToPdf(html: string): Promise<Uint8Array> {
  const executablePath = findBrowser();
  if (!executablePath) {
    throw new PdfEngineMissingError("Microsoft Edge atau Google Chrome tidak ditemukan di laptop ini");
  }

  const port = await freePort();
  const profileDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "jki-pdf-"));
  const child = spawn(executablePath, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-sync",
    "about:blank",
  ], { stdio: "ignore", windowsHide: true });
  child.on("error", () => undefined);

  let browser: Browser | null = null;
  try {
    if (!(await waitForDevTools(port, 20_000))) {
      throw new Error(`Browser tidak merespons (${executablePath})`);
    }
    browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${port}` });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    return await page.pdf({ preferCSSPageSize: true, printBackground: true });
  } finally {
    // Browser.close ends the whole browser even when it is no longer our child process.
    await browser?.close().catch(() => undefined);
    if (child.exitCode === null) child.kill();
    setTimeout(() => fs.promises.rm(profileDir, { recursive: true, force: true }).catch(() => undefined), 3000);
  }
}

// ==================== ROUTES ====================

const parseContent = (raw: string | null): LetterContent | null => {
  if (!raw) return null;
  try {
    return sanitizeLetterContent(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const fileSafe = (name: string) =>
  name.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 150);

const toMeta = (body: Record<string, unknown>): LetterMeta => ({
  letterNumber: typeof body.letterNumber === "string" ? body.letterNumber : "",
  letterDate: typeof body.letterDate === "string" ? body.letterDate : "",
  subject: typeof body.subject === "string" ? body.subject : "",
  counterparty: typeof body.counterparty === "string" ? body.counterparty : "",
});

export function registerLetterRoutes(app: express.Express) {
  app.get("/api/korwil/kop-surat", async (_req, res) => {
    try {
      res.json(await getLetterhead());
    } catch (error) {
      console.error("Failed to load letterhead", error);
      res.status(500).json({ message: "Gagal mengambil pengaturan kop surat" });
    }
  });

  app.put("/api/korwil/kop-surat", async (req, res) => {
    try {
      const letterhead = sanitizeLetterhead(req.body);
      const value = JSON.stringify(letterhead);
      await prisma.setting.upsert({
        where: { key: LETTERHEAD_KEY },
        create: { key: LETTERHEAD_KEY, value },
        update: { value },
      });
      res.json(letterhead);
    } catch (error) {
      console.error("Failed to save letterhead", error);
      res.status(500).json({ message: "Gagal menyimpan pengaturan kop surat" });
    }
  });

  // Live preview for unsaved letters. `letterhead` may be sent by the settings page to preview unsaved changes.
  app.post("/api/korwil/surat/preview", async (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const letterhead = body.letterhead ? sanitizeLetterhead(body.letterhead) : await getLetterhead();
      const html = renderLetterHtml(letterhead, toMeta((body.meta ?? {}) as Record<string, unknown>), sanitizeLetterContent(body.content));
      res.type("html").send(html);
    } catch (error) {
      console.error("Failed to render letter preview", error);
      res.status(500).json({ message: "Gagal membuat pratinjau surat" });
    }
  });

  const loadLetter = async (id: string) => {
    const item = await prisma.surat.findUnique({ where: { id } });
    const content = item ? parseContent(item.content) : null;
    if (!item || !content) return null;
    const meta: LetterMeta = {
      letterNumber: item.letterNumber,
      letterDate: item.letterDate.toISOString(),
      subject: item.subject,
      counterparty: item.counterparty,
    };
    return { item, html: (print = false) => getLetterhead().then((lh) => renderLetterHtml(lh, meta, content, { print })) };
  };

  app.get("/api/korwil/surat/:id/letter.html", async (req, res) => {
    try {
      const letter = await loadLetter(req.params.id);
      if (!letter) {
        res.status(404).json({ message: "Surat ini tidak dibuat dengan pembuat surat" });
        return;
      }
      res.type("html").send(await letter.html(req.query.print === "1"));
    } catch (error) {
      console.error("Failed to render letter", error);
      res.status(500).json({ message: "Gagal membuat surat" });
    }
  });

  app.get("/api/korwil/surat/:id/letter.pdf", async (req, res) => {
    try {
      const letter = await loadLetter(req.params.id);
      if (!letter) {
        res.status(404).json({ message: "Surat ini tidak dibuat dengan pembuat surat" });
        return;
      }
      const pdf = await htmlToPdf(await letter.html());
      const name = `${fileSafe(`${letter.item.letterNumber} - ${letter.item.subject}`)}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `${req.query.download === "1" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(name)}`);
      res.send(Buffer.from(pdf));
    } catch (error) {
      console.error("Failed to build letter PDF", error);
      const message = error instanceof PdfEngineMissingError
        ? `${error.message}. Gunakan tombol Cetak lalu pilih "Save as PDF".`
        : "Gagal membuat PDF surat";
      res.status(500).json({ message });
    }
  });
}
