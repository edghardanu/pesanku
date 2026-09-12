import { db } from "@/lib/db";
import { settings } from "@/lib/schema";
import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const feeSettings = await db.select().from(settings).where(inArray(settings.key, ["fee_aplikasi", "fee_jasa", "fee_admin", "penalty_percentage", "ipaymu_sandbox", "checkout_fees_config", "flip_sandbox"])).all();

    let penaltyPercentage = 0;
    let ipaymuSandbox = 0;
    let checkoutFees: any[] = [];
    let hasCustomFees = false;

    feeSettings.forEach(f => {
      if (f.key === 'penalty_percentage') penaltyPercentage = parseInt(f.value);
      if (f.key === 'ipaymu_sandbox') ipaymuSandbox = parseInt(f.value);
      if (f.key === 'flip_sandbox') { /* handled separately below */ }
      if (f.key === 'checkout_fees_config') {
          try {
              checkoutFees = JSON.parse(f.value);
              hasCustomFees = true;
          } catch(e) {}
      }
    });

    // Fallback to legacy structure if the new dynamic config doesn't exist yet
    if (!hasCustomFees) {
        let feeApp = 0;
        let feeJasa = 0;
        let feeAdmin = 0;
        feeSettings.forEach(f => {
            if (f.key === 'fee_aplikasi') feeApp = parseInt(f.value);
            if (f.key === 'fee_jasa') feeJasa = parseInt(f.value);
            if (f.key === 'fee_admin') feeAdmin = parseInt(f.value);
        });
        
        checkoutFees = [];
        if (feeApp || feeApp === 0) checkoutFees.push({ id: 'aplikasi', name: 'Biaya Aplikasi', value: feeApp, description: 'Dibebankan kepada pembeli pada saat checkout dan ikut dipotong dari hasil saldo bersih penjual.' });
        if (feeJasa || feeJasa === 0) checkoutFees.push({ id: 'jasa', name: 'Biaya Jasa', value: feeJasa, description: 'Dibebankan kepada pembeli pada saat checkout dan ikut dipotong dari saldo bersih penjual.' });
        if (feeAdmin || feeAdmin === 0) checkoutFees.push({ id: 'admin', name: 'Biaya Admin', value: feeAdmin, description: 'Dibebankan kepada pembeli pada saat checkout dan ikut dipotong dari hasil saldo bersih penjual.' });
    }

    let flipSandbox = 0;
    feeSettings.forEach(f => {
      if (f.key === 'flip_sandbox') flipSandbox = parseInt(f.value);
    });

    return NextResponse.json({ 
        checkout_fees: checkoutFees, 
        penalty_percentage: penaltyPercentage, 
        ipaymu_sandbox: ipaymuSandbox,
        flip_sandbox: flipSandbox
    });
  } catch (error) {
    return NextResponse.json({ checkout_fees: [], penalty_percentage: 0, ipaymu_sandbox: 0 });
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
    if (body.checkout_fees !== undefined) updates.push({ key: "checkout_fees_config", value: JSON.stringify(body.checkout_fees) });
    if (body.penalty_percentage !== undefined) updates.push({ key: "penalty_percentage", value: body.penalty_percentage.toString() });
    if (body.ipaymu_sandbox !== undefined) updates.push({ key: "ipaymu_sandbox", value: body.ipaymu_sandbox.toString() });
    if (body.flip_sandbox !== undefined) updates.push({ key: "flip_sandbox", value: body.flip_sandbox.toString() });

    for (const update of updates) {
      await db.insert(settings).values(update)
        .onConflictDoUpdate({ target: settings.key, set: { value: update.value } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
