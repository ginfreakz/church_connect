-- CreateTable
CREATE TABLE "GerejaLokal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "worshipAddress" TEXT NOT NULL,
    "secretariat" TEXT NOT NULL DEFAULT '',
    "serviceSchedule" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Rohaniwan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "jabatan" TEXT NOT NULL DEFAULT 'PDM',
    "isGembala" BOOLEAN NOT NULL DEFAULT false,
    "gerejaLokalId" TEXT,
    "nir" TEXT NOT NULL DEFAULT '',
    "nirExpiry" DATETIME,
    "cardNumber" TEXT NOT NULL DEFAULT '',
    "cardExpiry" DATETIME,
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "birthPlace" TEXT NOT NULL DEFAULT '',
    "birthDate" DATETIME,
    "gender" TEXT NOT NULL DEFAULT '',
    "nationality" TEXT NOT NULL DEFAULT 'Indonesia',
    "churchName" TEXT NOT NULL DEFAULT '',
    "churchAddress" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Lampiran" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Lampiran_ownerType_ownerId_idx" ON "Lampiran"("ownerType", "ownerId");
