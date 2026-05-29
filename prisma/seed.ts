import { PrismaPg } from "@prisma/adapter-pg";
import { JemaatStatus, PrismaClient, TransactionType, UserRole } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.transaction.deleteMany();
  await prisma.jemaat.deleteMany();

  await prisma.jemaat.createMany({
    data: [
      {
        id: "JM-2023-001",
        name: "Andreas Santoso",
        address: "Jl. Kebon Jeruk No. 12, Jakarta Barat",
        phone: "0812-3456-7890",
        status: JemaatStatus.AKTIF,
        initials: "AS",
      },
      {
        id: "JM-2023-002",
        name: "Maria Lestari",
        address: "Apartemen Park View Tower B Lt 10",
        phone: "0813-9876-5432",
        status: JemaatStatus.AKTIF,
        initials: "ML",
      },
      {
        id: "JM-2022-145",
        name: "Budi Setiawan",
        address: "Jl. Sudirman Gg. Melati No. 45",
        phone: "0811-2233-4455",
        status: JemaatStatus.TIDAK_AKTIF,
        initials: "BS",
      },
      {
        id: "JM-2023-015",
        name: "Daniel Wijaya",
        address: "Perum Citra Indah Blok C2/15",
        phone: "0812-7788-9900",
        status: JemaatStatus.AKTIF,
        initials: "DW",
      },
      {
        id: "JM-2023-088",
        name: "Ester Putri",
        address: "Jl. Merdeka Baru No. 101, Tangerang",
        phone: "0856-4433-2211",
        status: JemaatStatus.AKTIF,
        initials: "EP",
      },
    ],
  });

  await prisma.transaction.createMany({
    data: [
      {
        transactionDate: new Date("2023-10-24"),
        type: TransactionType.PEMASUKAN,
        category: "Persembahan Mingguan",
        amount: 12500000,
        note: "Kebaktian Umum I, II, dan III",
      },
      {
        transactionDate: new Date("2023-10-22"),
        type: TransactionType.PENGELUARAN,
        category: "Tagihan Listrik",
        amount: -4200000,
        note: "Pemakaian Gedung & Kantor (Sept)",
      },
      {
        transactionDate: new Date("2023-10-20"),
        type: TransactionType.PEMASUKAN,
        category: "Donasi Renovasi",
        amount: 50000000,
        note: "Donatur Anonim via Transfer",
      },
      {
        transactionDate: new Date("2023-10-18"),
        type: TransactionType.PENGELUARAN,
        category: "Gaji Staff",
        amount: -28500000,
        note: "Payroll 12 Karyawan Tetap",
      },
      {
        transactionDate: new Date("2023-10-15"),
        type: TransactionType.PENGELUARAN,
        category: "Pemeliharaan AC",
        amount: -18500000,
        note: "Service berkala 8 unit AC gedung",
      },
    ],
  });

  await prisma.user.upsert({
    where: { email: "admin@gereja.id" },
    update: {
      passwordHash: "admin123",
      role: UserRole.ADMIN,
      openingBalance: 0,
    },
    create: {
      email: "admin@gereja.id",
      passwordHash: "admin123",
      role: UserRole.ADMIN,
      openingBalance: 0,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
