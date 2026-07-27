import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, pekerjaTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// Menyuntikkan tipe organisasiId ke Request bawaan Express
declare global {
  namespace Express {
    interface Request {
      organisasiId?: string;
    }
  }
}

export const requireOrganisasi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { userId } = getAuth(req);
  
  if (!userId) {
    res.status(401).json({ error: "Unauthorized: Anda belum login." });
    return;
  }

  try {
    // Cari pekerja yang nyambung sama akun Clerk ini
    const [pekerja] = await db
      .select({ organisasiId: pekerjaTable.organisasiId })
      .from(pekerjaTable)
      .where(eq(pekerjaTable.clerkUserId, userId))
      .limit(1);

    // Kalau pekerja atau organisasiId-nya gak ada, berarti dia user baru yang belum onboarding
    if (!pekerja || !pekerja.organisasiId) {
      res.status(403).json({ 
        error: "BELUM_ONBOARDING", 
        message: "Anda belum terhubung ke organisasi manapun." 
      });
      return;
    }

    // Kalau aman, simpan organisasiId di 'req' supaya bisa dipakai di route lain
    req.organisasiId = pekerja.organisasiId;
    next();
  } catch (err) {
    console.error("[REQUIRE ORGANISASI ERROR]:", err);
    res.status(500).json({ error: "Gagal memverifikasi organisasi." });
  }
};
