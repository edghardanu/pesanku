export type CheckoutFee = {
  id: string;
  name: string;
  description?: string;
  value: number;
  type?: 'nominal' | 'percentage';
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
