import { db } from "@/lib/db";
import { settings } from "@/lib/schema";
import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const feeSettings = await db.select().from(settings).where(inArray(settings.key, ["fee_aplikasi", "fee_jasa", "fee_admin", "checkout_fees_config"])).all();

    let checkoutFees: any[] = [];
    let hasCustomFees = false;

    feeSettings.forEach(f => {
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
        if (feeApp || feeApp === 0) checkoutFees.push({ id: 'aplikasi', name: 'Biaya Aplikasi', value: feeApp, description: 'Dibebankan kepada pembeli pada saat checkout.' });
        if (feeJasa || feeJasa === 0) checkoutFees.push({ id: 'jasa', name: 'Biaya Jasa', value: feeJasa, description: 'Dibebankan kepada pembeli pada saat checkout.' });
        if (feeAdmin || feeAdmin === 0) checkoutFees.push({ id: 'admin', name: 'Biaya Admin', value: feeAdmin, description: 'Dibebankan kepada pembeli pada saat checkout.' });
    }

    return NextResponse.json({ 
        checkout_fees: checkoutFees
    });
  } catch (error) {
    return NextResponse.json({ checkout_fees: [] });
  }
}
