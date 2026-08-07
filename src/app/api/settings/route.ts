import { db } from "@/lib/db";
import { settings } from "@/lib/schema";
import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const feeSettings = await db.select().from(settings).where(inArray(settings.key, ["fee_aplikasi", "fee_jasa", "fee_admin"])).all();
    
    let feeApp = 0;
    let feeJasa = 0;
    let feeAdmin = 0;
    
    feeSettings.forEach(f => {
      if(f.key === 'fee_aplikasi') feeApp = parseInt(f.value);
      if(f.key === 'fee_jasa') feeJasa = parseInt(f.value);
      if(f.key === 'fee_admin') feeAdmin = parseInt(f.value);
    });

    return NextResponse.json({ fee_aplikasi: feeApp, fee_jasa: feeJasa, fee_admin: feeAdmin });
  } catch (error) {
    return NextResponse.json({ fee_aplikasi: 0, fee_jasa: 0, fee_admin: 0 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const updates = [];
    if(body.fee_aplikasi !== undefined) updates.push({ key: "fee_aplikasi", value: body.fee_aplikasi.toString() });
    if(body.fee_jasa !== undefined) updates.push({ key: "fee_jasa", value: body.fee_jasa.toString() });
    if(body.fee_admin !== undefined) updates.push({ key: "fee_admin", value: body.fee_admin.toString() });

    for (const update of updates) {
      await db.insert(settings).values(update)
        .onConflictDoUpdate({ target: settings.key, set: { value: update.value }});
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
