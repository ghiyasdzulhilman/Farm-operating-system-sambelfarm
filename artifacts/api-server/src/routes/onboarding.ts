import { Router, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { db, organisasiTable, pekerjaTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Zod Schema untuk validasi form pendaftaran kebun
const createOrgSchema = z.object({
  namaKebun: z.string().min(3, "Nama kebun minimal 3 karakter").max(100, "Nama kebun maksimal 100 karakter"),
  namaOwner: z.string().min(1, "Nama pemilik wajib diisi")
});

// Endpoint untuk dicek sama Frontend: "User ini udah punya kebun belum?"
router.get("/status", async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const [pekerja] = await db
      .select()
      .from(pekerjaTable)
      .where(eq(pekerjaTable.clerkUserId, userId))
      .limit(1);

    res.json({ hasOrganisasi: !!pekerja });
  } catch (error) {
    console.error("[STATUS ONBOARDING ERROR]:", error);
    res.status(500).json({ error: "Gagal mengecek status onboarding" });
  }
});

// Endpoint untuk Frontend nge-submit form bikin kebun baru
router.post("/create-organisasi", async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Validasi payload pakai Zod
  const parseResult = createOrgSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }

  const { namaKebun, namaOwner } = parseResult.data;

  try {
    // Cek duplikasi: Jangan sampai 1 user Clerk bikin 2 kebun (di versi 1 ini)
    const [existing] = await db
      .select()
      .from(pekerjaTable)
      .where(eq(pekerjaTable.clerkUserId, userId))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "Anda sudah memiliki organisasi/kebun." });
      return;
    }

    // Insert ke tabel organisasi dan pekerja dalam 1 transaksi (biar aman kalau gagal di tengah jalan)
    // PENTING: jangan panggil res.json() di dalam callback ini — callback selesai
    // BUKAN berarti COMMIT sudah terjadi. Cukup `return` data-nya ke luar.
    const newOrg = await db.transaction(async (tx) => {
      // 1. Bikin organisasinya
      const [org] = await tx
        .insert(organisasiTable)
        .values({ nama: namaKebun })
        .returning();

      // 2. Daftarin user Clerk ini sebagai pekerja (Owner) di organisasi tersebut
      await tx.insert(pekerjaTable).values({
        organisasiId: org.id,
        clerkUserId: userId,
        nama: namaOwner,
        // roleId dikosongin dulu gak apa-apa, atau lu bisa isi nanti kalau punya UUID master "Owner"
      });

      return org;
    });

    // res.json() dipanggil DI SINI, setelah db.transaction() resolve —
    // artinya COMMIT sudah pasti sukses sebelum client dikasih tau "berhasil"
    res.status(201).json({ success: true, data: newOrg });
  } catch (error) {
    console.error("[CREATE ORG ERROR]:", error);
    res.status(500).json({ error: "Gagal membuat organisasi baru." });
  }
});

export default router;
