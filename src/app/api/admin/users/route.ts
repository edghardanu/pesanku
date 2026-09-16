import { db } from "@/lib/db";
import { users, sellerProfiles, sellerBalances } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";

export async function DELETE(request: Request) {
  try {
    const admin = await getUserFromSession();
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID pengguna diperlukan" }, { status: 400 });
    }

    // Hindari menghapus akun diri sendiri atau admin utama yang sedang login
    if (id === admin.id) {
       return NextResponse.json({ error: "Tidak dapat menghapus akun admin yang sedang login" }, { status: 400 });
    }

    // Jika pengguna adalah penjual, hapus terlebih dahulu data dependen yang belum diverifikasi
    // Hal ini untuk menghindari FOREIGN KEY constraint failed di SQLite
    const userToDel = await db.select().from(users).where(eq(users.id, id)).get();
    
    if (!userToDel) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
    }

    // Secara agresif membersihkan potensi data yatim (orphan) pengguna yang menghalangi SQLite constraint,
    // terutama untuk pengguna 'pending' atau setengah terdaftar (termasuk pembeli yang mungkin nge-bug tersangkut profil).
    await db.delete(sellerProfiles).where(eq(sellerProfiles.userId, id));
    
    // SQLite tidak peduli apakah kita cek ada record atau tidak, mengeksekusi Delete di table empty aman.
    try {
      await db.delete(users).where(eq(users.id, id));
    } catch (dbError: any) {
      if (dbError?.message?.includes('FOREIGN KEY constraint') || dbError?.code === 'SQLITE_CONSTRAINT') {
        return NextResponse.json({ 
          error: "Dibatalkan: Pengguna ini sudah memiliki histori transaksi (Pesanan/Produk) yang mengikat."
        }, { status: 400 });
      }
      throw dbError; // Lempar ke blok catch utama
    }

    return NextResponse.json({ success: true, message: "Pengguna berhasil dihapus" });
  } catch (error: any) {
    console.error("Delete user error:", error);
    
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
