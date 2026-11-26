// Called by the .bat launchers. Uses only Node built-ins so it works before `npm install`.
//
//   node scripts/prepare-app.mjs update    -> git pull the latest version (skipped if git is unavailable)
//   node scripts/prepare-app.mjs prepare   -> install deps / generate Prisma client when needed,
//                                             back up the database, apply migrations, seed a brand-new DB
//
// Exit code 1 means the app should not be started.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);

const BACKUP_DIR = path.join(ROOT, "database-backup", "auto");
const KEEP_BACKUPS = 20;
const LOCK_FILE = path.join(ROOT, "package-lock.json");
const SCHEMA_FILE = path.join(ROOT, "prisma", "schema.prisma");
const DEPS_STAMP = path.join(ROOT, "node_modules", ".jki-lock-hash");
const CLIENT_DIR = path.join(ROOT, "src", "generated", "prisma");
const CLIENT_STAMP = path.join(CLIENT_DIR, ".jki-schema-hash");

const info = (msg) => console.log(`[INFO] ${msg}`);
const warn = (msg) => console.log(`[PERINGATAN] ${msg}`);

function run(command, { timeout } = {}) {
  const result = spawnSync(command, { shell: true, stdio: "inherit", timeout, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
  return result.status === 0;
}

function capture(command) {
  const result = spawnSync(command, { shell: true, encoding: "utf8", env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
  return result.status === 0 ? result.stdout.trim() : null;
}

const fileHash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const readStamp = (file) => (fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim() : "");

// Same resolution as prisma.config.ts / src/lib/prisma.ts: DATABASE_URL from .env, else ./church-connect.db.
function databasePath() {
  let url = process.env.DATABASE_URL;
  const envFile = path.join(ROOT, ".env");
  if (!url && fs.existsSync(envFile)) {
    const line = fs.readFileSync(envFile, "utf8").split(/\r?\n/).find((l) => /^\s*DATABASE_URL\s*=/.test(l));
    if (line) url = line.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");
  }
  url = url || "file:./church-connect.db";
  return path.resolve(ROOT, url.replace(/^file:/, ""));
}

function update() {
  if (!fs.existsSync(path.join(ROOT, ".git"))) {
    info("Folder ini bukan hasil git clone, cek update dilewati.");
    return;
  }
  if (capture("git --version") === null) {
    info("Git belum terpasang, cek update dilewati.");
    return;
  }

  info("Mengecek versi terbaru aplikasi...");
  const before = capture("git rev-parse HEAD");
  if (!run("git pull --ff-only", { timeout: 120_000 })) {
    warn("Gagal mengambil update (tidak ada internet atau ada perubahan lokal). Aplikasi tetap dijalankan dengan versi saat ini.");
    const dirty = capture("git status --porcelain --untracked-files=no");
    if (dirty) warn(`File yang berubah di laptop ini:\n${dirty}`);
    return;
  }

  const after = capture("git rev-parse HEAD");
  if (before && after && before !== after) {
    info("Aplikasi diperbarui. Perubahan:");
    run(`git log --oneline --no-decorate ${before}..${after}`);
  } else {
    info("Aplikasi sudah versi terbaru.");
  }
}

function backupDatabase(dbFile) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const target = path.join(BACKUP_DIR, `church-connect-${stamp}.db`);
  fs.copyFileSync(dbFile, target);
  info(`Backup database: ${path.relative(ROOT, target)}`);

  const old = fs.readdirSync(BACKUP_DIR)
    .filter((f) => /^church-connect-\d{8}-\d{6}\.db$/.test(f))
    .sort()
    .slice(0, -KEEP_BACKUPS);
  for (const file of old) fs.rmSync(path.join(BACKUP_DIR, file), { force: true });
}

function prepare() {
  const lockHash = fileHash(LOCK_FILE);
  if (readStamp(DEPS_STAMP) !== lockHash) {
    info("Memasang dependensi (bisa beberapa menit)...");
    // `npm ci` installs exactly what package-lock.json says and never rewrites it, so git pull stays clean.
    if (!run("npm ci") && !run("npm install --no-save")) {
      console.error("[ERROR] Gagal memasang dependensi.");
      return false;
    }
    fs.writeFileSync(DEPS_STAMP, lockHash);
  }

  const schemaHash = fileHash(SCHEMA_FILE);
  if (readStamp(CLIENT_STAMP) !== schemaHash) {
    info("Menyiapkan Prisma client...");
    if (!run("npm run prisma:generate")) {
      console.error("[ERROR] Gagal membuat Prisma client.");
      return false;
    }
    fs.mkdirSync(CLIENT_DIR, { recursive: true });
    fs.writeFileSync(CLIENT_STAMP, schemaHash);
  }

  const dbFile = databasePath();
  const isNewDatabase = !fs.existsSync(dbFile);
  if (!isNewDatabase) backupDatabase(dbFile);

  info("Menerapkan migrasi database...");
  if (!run("npm run prisma:deploy")) {
    console.error("[ERROR] Gagal menerapkan migrasi database. Backup tersimpan di database-backup\\auto.");
    return false;
  }

  // The seed wipes existing data, so it only ever runs on a database that was just created.
  if (isNewDatabase) {
    info("Database baru, mengisi data awal...");
    if (!run("npm run prisma:seed")) warn("Gagal mengisi data awal. Aplikasi tetap bisa dijalankan.");
  }
  return true;
}

const mode = process.argv[2];
if (mode === "update") {
  update();
  process.exit(0);
} else if (mode === "prepare") {
  process.exit(prepare() ? 0 : 1);
} else {
  console.error("Usage: node scripts/prepare-app.mjs <update|prepare>");
  process.exit(1);
}
