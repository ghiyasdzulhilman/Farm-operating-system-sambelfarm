import { db, pekerjaTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/**
 * Fungsi Detektif untuk mencari UUID pekerja berdasarkan Clerk User ID
 * @param clerkUserId ID String yang didapat dari Clerk Auth (req.auth.userId)
 * @returns string (UUID Pekerja) atau null jika belum di-link
 */
export async function getPekerjaIdFromClerk(clerkUserId: string): Promise<string | null> {
  if (!clerkUserId) return null;

  try {
    const [pekerja] = await db
      .select({ id: pekerjaTable.id })
      .from(pekerjaTable)
      .where(eq(pekerjaTable.clerkUserId, clerkUserId))
      .limit(1);

    return pekerja ? pekerja.id : null;
  } catch (error) {
    console.error("[AUTH HELPER ERROR]: Gagal mencari relasi pekerja-clerk", error);
    return null;
  }
}
