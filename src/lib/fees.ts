export type FeeTarget = 'buyer' | 'seller';

export type CheckoutFee = {
  id: string;
  name: string;
  description?: string;
  value: number;
  type?: 'nominal' | 'percentage';
  chargedTo?: FeeTarget; // buyer = ditagih ke pembeli, seller = dipotong dari penjual
};

export function calcFeeAmount(fee: CheckoutFee, subtotal: number): number {
  if (fee.type === 'percentage') {
    return Math.round((subtotal * (fee.value || 0)) / 100);
  }
  return fee.value || 0;
}

export function calcTotalFees(fees: CheckoutFee[], subtotal: number): number {
  return fees.reduce((sum, f) => sum + calcFeeAmount(f, subtotal), 0);
}

// Filter helpers — undefined (legacy) dianggap 'both' agar data lama tetap kompatibel
export function isBuyerFee(fee: CheckoutFee): boolean {
  return !fee.chargedTo || fee.chargedTo === 'buyer';
}
export function isSellerFee(fee: CheckoutFee): boolean {
  return !fee.chargedTo || fee.chargedTo === 'seller';
}

export function calcBuyerFees(fees: CheckoutFee[], subtotal: number): number {
  return fees.filter(isBuyerFee).reduce((sum, f) => sum + calcFeeAmount(f, subtotal), 0);
}
export function calcSellerFees(fees: CheckoutFee[], subtotal: number): number {
  return fees.filter(isSellerFee).reduce((sum, f) => sum + calcFeeAmount(f, subtotal), 0);
}

export function formatFeeValue(fee: CheckoutFee): string {
  if (fee.type === 'percentage') return `${fee.value}%`;
  const v = fee.value || 0;
  return `${v < 0 ? '-' : ''}Rp ${Math.abs(v).toLocaleString('id-ID')}`;
}

export function formatFeeAmount(fee: CheckoutFee, subtotal: number): string {
  const amt = calcFeeAmount(fee, subtotal);
  if (fee.type === 'percentage') return `${fee.value}% (Rp ${amt.toLocaleString('id-ID')})`;
  return `Rp ${amt.toLocaleString('id-ID')}`;
}

export function getFeeTargetLabel(fee: CheckoutFee): string {
  if (fee.chargedTo === 'seller') return 'Penjual';
  if (fee.chargedTo === 'buyer') return 'Pembeli';
  return 'Pembeli'; // legacy default display as Pembeli
}
