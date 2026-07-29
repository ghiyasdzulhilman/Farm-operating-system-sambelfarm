import { Router } from "express";
import { db, kategoriKeuanganTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { getPekerjaIdFromClerk } from "../lib/authHelpers";

const router = Router();

// ---------------------------------------------------------------------------
// 1. MASTER KATEGORI KEUANGAN
// ---------------------------------------------------------------------------

// A. Ambil Semua Kategori (GET /api/finance/kategori)

router.get("/kategori", async (req, res): Promise<void> => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    if (!req.organisasiId) { res.status(403).json({ error: "BELUM_ONBOARDING" }); return; }

    const data = await db
      .select()
      .from(kategoriKeuanganTable)
      .where(eq(kategoriKeuanganTable.organisasiId, req.organisasiId))
      .orderBy(desc(kategoriKeuanganTable.createdAt));

    res.json({ success: true, data });
  } catch (err) {
    console.error("[GET KATEGORI KEUANGAN ERROR]:", err);
    res.status(500).json({ error: "Gagal mengambil data kategori keuangan." });
  }
});

// B. Tambah Kategori Baru (POST /api/finance/kategori)

router.post("/kategori", async (req, res): Promise<void> => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    if (!req.organisasiId) { res.status(403).json({ error: "BELUM_ONBOARDING" }); return; }

    const { nama, tipe, keterangan } = req.body;
    if (!nama || !tipe) {
      res.status(400).json({ error: "Nama dan Tipe kategori wajib diisi." });
      return;
    }

    const pekerjaId = await getPekerjaIdFromClerk(userId);

    const [newKategori] = await db.insert(kategoriKeuanganTable)
      .values({
        nama,
        tipe,
        keterangan: keterangan || null,
        createdBy: pekerjaId,
        organisasiId: req.organisasiId
      })
      .returning();

    res.status(201).json({ success: true, data: newKategori });
  } catch (err: any) {
    console.error("[POST KATEGORI KEUANGAN ERROR]:", err);
    if (err.code === "23505" || err.message?.includes("unique")) {
      res.status(400).json({ error: "Kategori dengan nama ini sudah ada." });
      return;
    }
    res.status(500).json({ error: "Gagal menyimpan kategori baru." });
  }
});

// C. Update Kategori (PUT /api/finance/kategori/:id)

router.put("/kategori/:id", async (req, res): Promise<void> => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    if (!req.organisasiId) { res.status(403).json({ error: "BELUM_ONBOARDING" }); return; }

    const { id } = req.params;
    const { nama, tipe, keterangan } = req.body;

    if (!nama || !tipe) {
      res.status(400).json({ error: "Nama dan Tipe kategori wajib diisi." });
      return;
    }

    const [updatedKategori] = await db.update(kategoriKeuanganTable)
      .set({
        nama,
        tipe,
        keterangan: keterangan || null
      })
      .where(
        and(
          eq(kategoriKeuanganTable.id, id),
          eq(kategoriKeuanganTable.organisasiId, req.organisasiId)
        )
      )
      .returning();

    // 404 di sini juga otomatis menutup kemungkinan org lain tahu
    // apakah ID tersebut ada tapi cuma "bukan milik dia" — nggak bocorin info.
    if (!updatedKategori) {
      res.status(404).json({ error: "Kategori tidak ditemukan." });
      return;
    }

    res.json({ success: true, data: updatedKategori });
  } catch (err: any) {
    console.error("[PUT KATEGORI KEUANGAN ERROR]:", err);
    if (err.code === "23505" || err.message?.includes("unique")) {
      res.status(400).json({ error: "Kategori dengan nama ini sudah ada." });
      return;
    }
    res.status(500).json({ error: "Gagal mengupdate kategori." });
  }
});

// D. Hapus Kategori (DELETE /api/finance/kategori/:id)

router.delete("/kategori/:id", async (req, res): Promise<void> => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    if (!req.organisasiId) { res.status(403).json({ error: "BELUM_ONBOARDING" }); return; }

    const { id } = req.params;

    const deleted = await db.delete(kategoriKeuanganTable)
      .where(
        and(
          eq(kategoriKeuanganTable.id, id),
          eq(kategoriKeuanganTable.organisasiId, req.organisasiId)
        )
      )
      .returning({ id: kategoriKeuanganTable.id });

    // Fix bug lama: sebelumnya endpoint ini selalu balas "sukses" walau
    // 0 baris kehapus (id salah, atau sekarang: id milik organisasi lain).
    if (deleted.length === 0) {
      res.status(404).json({ error: "Kategori tidak ditemukan." });
      return;
    }

    res.json({ success: true, message: "Kategori berhasil dihapus." });
  } catch (err: any) {
    console.error("[DELETE KATEGORI KEUANGAN ERROR]:", err);
    if (err.code === "23503") {
      res.status(400).json({ error: "Gagal menghapus! Kategori ini sudah dipakai di transaksi." });
      return;
    }
    res.status(500).json({ error: "Gagal menghapus kategori." });
  }
});

export default router;
