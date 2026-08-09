import type { ProductVariant } from '@/types';

export const MAX_PRODUCT_VARIANTS = 10;
export const MAX_PRODUCT_VARIANT_LENGTH = 40;

export type ProductVariantValidation =
  | { success: true; variants: ProductVariant[] }
  | { success: false; error: string };

const toVariantArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value.split(/\r?\n|,/);
    }
  }

  return [];
};

export function validateProductVariants(value: unknown): ProductVariantValidation {
  const rawVariants = toVariantArray(value);

  if (rawVariants.length > MAX_PRODUCT_VARIANTS) {
    return { success: false, error: `Maksimal ${MAX_PRODUCT_VARIANTS} varian untuk satu produk.` };
  }

  const variants: ProductVariant[] = [];
  for (const rawVariant of rawVariants) {
    const isLegacyString = typeof rawVariant === 'string';
    const isVariantObject = typeof rawVariant === 'object' && rawVariant !== null;

    if (!isLegacyString && !isVariantObject) {
      return { success: false, error: 'Data varian tidak valid.' };
    }

    const record = isVariantObject ? rawVariant as Record<string, unknown> : null;
    const name = (isLegacyString ? rawVariant : record?.name);
    if (typeof name !== 'string') {
      return { success: false, error: 'Nama varian harus berupa teks.' };
    }

    const normalizedName = name.trim();
    if (!normalizedName) continue;

    const rawPrice = record?.price;
    let price: number | null = null;
    if (rawPrice !== undefined && rawPrice !== null && rawPrice !== '') {
      const normalizedPrice = Number(rawPrice);
      if (!Number.isInteger(normalizedPrice) || normalizedPrice < 0) {
        return { success: false, error: `Harga varian ${normalizedName} harus berupa angka bulat minimal Rp 0.` };
      }
      price = normalizedPrice;
    }

    variants.push({ name: normalizedName, price });
  }

  if (variants.some((variant) => variant.name.length > MAX_PRODUCT_VARIANT_LENGTH)) {
    return { success: false, error: `Nama varian maksimal ${MAX_PRODUCT_VARIANT_LENGTH} karakter.` };
  }

  const uniqueVariants = Array.from(
    new Map(variants.map((variant) => [variant.name.toLocaleLowerCase('id-ID'), variant])).values(),
  );

  if (uniqueVariants.length !== variants.length) {
    return { success: false, error: 'Nama varian tidak boleh sama.' };
  }

  return { success: true, variants: uniqueVariants };
}

export function parseStoredProductVariants(value: string | null | undefined): ProductVariant[] {
  const result = validateProductVariants(value);
  return result.success ? result.variants : [];
}

export function serializeProductVariants(variants: ProductVariant[]): string | null {
  return variants.length > 0 ? JSON.stringify(variants) : null;
}

export function findProductVariant(
  variants: ProductVariant[] | null | undefined,
  selectedVariant: string | null | undefined,
): ProductVariant | undefined {
  return variants?.find((variant) => variant.name === selectedVariant);
}

export function getProductUnitPrice(
  basePrice: number,
  variants: ProductVariant[] | null | undefined,
  selectedVariant: string | null | undefined,
): number {
  return findProductVariant(variants, selectedVariant)?.price ?? basePrice;
}
