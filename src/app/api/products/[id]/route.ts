import { NextResponse } from "next/server";

import { getProductDetail } from "@/lib/productDetails";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const product = await getProductDetail(id);

    if (!product) {
      return NextResponse.json(
        { message: "Produk tidak ditemukan" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { product },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Fetch product detail error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan pada server" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
