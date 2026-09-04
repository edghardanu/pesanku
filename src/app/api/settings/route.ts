import { db } from "@/lib/db";
import { settings } from "@/lib/schema";
import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const feeSettings = await db.select().from(settings).where(inArray(settings.key, ["fee_aplikasi", "fee_jasa", "fee_admin", "penalty_percentage", "ipaymu_sandbox"])).all();

    let feeApp = 0;
    let feeJasa = 0;
    let feeAdmin = 0;
    let penaltyPercentage = 0;
    let ipaymuSandbox = 0;

    feeSettings.forEach(f => {
      if (f.key === 'fee_aplikasi') feeApp = parseInt(f.value);
      if (f.key === 'fee_jasa') feeJasa = parseInt(f.value);
      if (f.key === 'fee_admin') feeAdmin = parseInt(f.value);
      if (f.key === 'penalty_percentage') penaltyPercentage = parseInt(f.value);
      if (f.key === 'ipaymu_sandbox') ipaymuSandbox = parseInt(f.value);
    });

    return NextResponse.json({ fee_aplikasi: feeApp, fee_jasa: feeJasa, fee_admin: feeAdmin, penalty_percentage: penaltyPercentage, ipaymu_sandbox: ipaymuSandbox });
  } catch (error) {
    return NextResponse.json({ fee_aplikasi: 0, fee_jasa: 0, fee_admin: 0, penalty_percentage: 0, ipaymu_sandbox: 0 });
  }
}

export async function POST(request: Request) {
  try {
    // Hanya admin yang boleh mengubah settings fee
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const updates = [];
    if (body.fee_aplikasi !== undefined) updates.push({ key: "fee_aplikasi", value: body.fee_aplikasi.toString() });
    if (body.fee_jasa !== undefined) updates.push({ key: "fee_jasa", value: body.fee_jasa.toString() });
    if (body.fee_admin !== undefined) updates.push({ key: "fee_admin", value: body.fee_admin.toString() });
    if (body.penalty_percentage !== undefined) updates.push({ key: "penalty_percentage", value: body.penalty_percentage.toString() });
    if (body.ipaymu_sandbox !== undefined) updates.push({ key: "ipaymu_sandbox", value: body.ipaymu_sandbox.toString() });

    for (const update of updates) {
      await db.insert(settings).values(update)
        .onConflictDoUpdate({ target: settings.key, set: { value: update.value } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
