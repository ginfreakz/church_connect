-- AlterTable
ALTER TABLE "Jemaat" ADD COLUMN "birthDate" DATETIME;

-- CreateTable
CREATE TABLE "Ministry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "leader" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AKTIF',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MinistryMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ministryId" TEXT NOT NULL,
    "jemaatId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "eventDate" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
