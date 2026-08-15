"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, Info, Plus, X } from "lucide-react";
import Image from "next/image";
import { MAX_PRODUCT_VARIANTS, MAX_PRODUCT_VARIANT_LENGTH } from "@/lib/productVariants";
import type { ProductVariant } from "@/types";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantInput, setVariantInput] = useState("");
  const [variantPriceInput, setVariantPriceInput] = useState("");
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar");
      return;
    }

    // Check file size (max 2MB for base64 safety)
    if (file.size > 2 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImagePreview(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const addVariant = () => {
    const nextVariantName = variantInput.trim();
    if (!nextVariantName) return;
    if (nextVariantName.length > MAX_PRODUCT_VARIANT_LENGTH) {
      setError(`Nama varian maksimal ${MAX_PRODUCT_VARIANT_LENGTH} karakter.`);
      return;
    }
    if (variants.length >= MAX_PRODUCT_VARIANTS) {
      setError(`Maksimal ${MAX_PRODUCT_VARIANTS} varian untuk satu produk.`);
      return;
    }
    if (variants.some((variant) => variant.name.toLocaleLowerCase('id-ID') === nextVariantName.toLocaleLowerCase('id-ID'))) {
      setError("Nama varian tidak boleh sama.");
      return;
    }

    const nextVariantPrice = variantPriceInput.trim() ? Number(variantPriceInput) : null;
    if (nextVariantPrice !== null && (!Number.isInteger(nextVariantPrice) || nextVariantPrice < 0)) {
      setError("Harga varian harus berupa angka bulat minimal Rp 0.");
      return;
    }

    setVariants((current) => [...current, { name: nextVariantName, price: nextVariantPrice }]);
    setVariantInput("");
    setVariantPriceInput("");
    setError("");
  };

  const removeVariant = (variantToRemove: string) => {
    setVariants((current) => current.filter((variant) => variant.name !== variantToRemove));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const minQty = "1";
    const pendingVariantName = variantInput.trim();
    const pendingVariantPrice = variantPriceInput.trim() ? Number(variantPriceInput) : null;
    const submittedVariants = pendingVariantName && !variants.some(
      (variant) => variant.name.toLocaleLowerCase('id-ID') === pendingVariantName.toLocaleLowerCase('id-ID'),
    ) ? [...variants, { name: pendingVariantName, price: pendingVariantPrice }] : variants;

    if (!pendingVariantName && variantPriceInput.trim()) {
      setError("Nama varian wajib diisi jika harga varian diberikan.");
      setLoading(false);
      return;
    }

    if (pendingVariantPrice !== null && (!Number.isInteger(pendingVariantPrice) || pendingVariantPrice < 0)) {
      setError("Harga varian harus berupa angka bulat minimal Rp 0.");
      setLoading(false);
      return;
    }

    if (pendingVariantName.length > MAX_PRODUCT_VARIANT_LENGTH || submittedVariants.length > MAX_PRODUCT_VARIANTS) {
      setError(`Maksimal ${MAX_PRODUCT_VARIANTS} varian dengan panjang ${MAX_PRODUCT_VARIANT_LENGTH} karakter per varian.`);
      setLoading(false);
      return;
    }

    // Validasi di frontend (Business Rule 1) removed since deadline is removed

    const data = {
      name: formData.get("name"),
      description: formData.get("description"),
      price: formData.get("price"),
      minQty: minQty,
      processingTime: formData.get("processingTime"),
      batchCategory: formData.get("batchCategory"),
      variants: submittedVariants,
      imageUrl: imagePreview || "",
    };

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Gagal menyimpan produk");
      }

      router.push("/seller");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Gagal menyimpan produk";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/seller" className="flex items-center gap-2 text-text-secondary hover:text-brand-primary mb-6 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Kembali ke Dashboard</span>
        </Link>

        <div className="card p-6 md:p-8">
          <h1 className="text-h2 mb-2">Tambah Produk Preorder Baru</h1>
          <p className="text-body-base text-text-secondary mb-8">Masukkan detail makanan atau minuman yang ingin Anda pre-orderkan.</p>

          {error && (
            <div className="mb-6 p-4 bg-status-error/10 border border-status-error rounded-xl text-status-error flex items-center gap-3">
              <Info className="w-5 h-5 shrink-0" />
              <p className="text-body-small font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-body-small font-medium text-text-primary mb-1">
                Nama Produk <span className="text-status-error">*</span>
              </label>
              <input 
                type="text" 
                name="name"
                required
                placeholder="Contoh: Ayam Bakar Spesial"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-body-small font-medium text-text-primary mb-1">
                Kategori Produk <span className="text-status-error">*</span>
              </label>
              <select name="batchCategory" required className="input-field appearance-none bg-no-repeat bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%24%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1.5em_1.5em] bg-[right_0.5rem_center] pr-10">
                <option value="">Pilih Kategori</option>
                <option value="Makanan Berat">Makanan Berat</option>
                <option value="Minuman Segar">Minuman Segar</option>
                <option value="Jajanan & Cemilan">Jajanan & Cemilan</option>
                <option value="Kue & Roti">Kue & Roti</option>
                <option value="Cepat Saji">Cepat Saji</option>
              </select>
            </div>

            <div>
              <label className="block text-body-small font-medium text-text-primary mb-1">
                Deskripsi
              </label>
              <textarea 
                name="description"
                placeholder="Jelaskan detail produk Anda (bahan, ukuran, dll)"
                className="input-field min-h-[100px] resize-y"
              />
            </div>

            <div>
              <label className="block text-body-small font-medium text-text-primary mb-1">
                Varian Produk <span className="font-normal text-text-secondary">(Opsional)</span>
              </label>
              <p className="mb-3 text-xs text-text-secondary">
                Buat pilihan seperti Original, Pedas, Cokelat, atau ukuran produk. Pembeli akan memilih salah satu sebelum checkout.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(160px,0.55fr)_auto]">
                <input
                  type="text"
                  value={variantInput}
                  onChange={(event) => setVariantInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addVariant();
                    }
                  }}
                  maxLength={MAX_PRODUCT_VARIANT_LENGTH}
                  placeholder="Contoh: Pedas"
                  aria-label="Nama varian"
                  className="input-field"
                />
                <input
                  type="number"
                  value={variantPriceInput}
                  onChange={(event) => setVariantPriceInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addVariant();
                    }
                  }}
                  min="0"
                  step="1"
                  placeholder="Harga (opsional)"
                  aria-label="Harga varian opsional"
                  className="input-field"
                />
                <button
                  type="button"
                  onClick={addVariant}
                  disabled={!variantInput.trim() || variants.length >= MAX_PRODUCT_VARIANTS}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-primary px-4 text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" /> Tambah Varian
                </button>
              </div>
              {variants.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2" aria-label="Daftar varian produk">
                  {variants.map((variant) => (
                    <span key={variant.name} className="inline-flex items-center gap-2 rounded-full border border-brand-primary/30 bg-brand-primary/10 px-3 py-1.5 text-sm font-semibold text-brand-primary">
                      {variant.name}
                      {variant.price !== null && variant.price !== undefined && (
                        <span className="font-bold">· Rp {variant.price.toLocaleString('id-ID')}</span>
                      )}
                      <button type="button" onClick={() => removeVariant(variant.name)} aria-label={`Hapus varian ${variant.name}`} className="rounded-full p-0.5 hover:bg-brand-primary/15">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-text-secondary">{variants.length}/{MAX_PRODUCT_VARIANTS} varian</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-body-small font-medium text-text-primary mb-1">
                  Harga (Rp) <span className="text-status-error">*</span>
                </label>
                <input 
                  type="number" 
                  name="price"
                  required
                  min="0"
                  placeholder="Contoh: 35000"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-body-small font-medium text-text-primary mb-1">
                  Foto Produk
                </label>
                
                {imagePreview ? (
                  <div className="relative border border-border rounded-xl p-2 h-40">
                    <div className="relative w-full h-full rounded-lg overflow-hidden">
                      <Image 
                        src={imagePreview} 
                        alt="Preview" 
                        fill 
                        className="object-cover"
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-surface text-status-error rounded-full p-1 shadow-md hover:bg-status-error hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <input 
                      type="file" 
                      accept="image/*"
                      id="product-image"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                    />
                    <label 
                      htmlFor="product-image"
                      className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center h-40 text-text-secondary cursor-pointer hover:border-brand-primary hover:bg-brand-primary/5 transition-colors"
                    >
                      <Upload className="w-6 h-6 mb-2" />
                      <span className="text-caption">Klik untuk upload foto</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            <hr className="border-border my-6" />

            <div className="bg-brand-secondary/10 p-4 rounded-xl mb-6">
              <h3 className="text-body-base font-semibold text-brand-secondary-dark dark:text-brand-secondary mb-2">Pengaturan Preorder</h3>
              
              <div>
              <div>
              </div>
              </div>
              <div className="mt-4">
                <label className="block text-body-small font-medium text-text-primary mb-1">
                  Waktu Proses Pemesanan (Estimasi)
                </label>
                <input 
                  type="text" 
                  name="processingTime"
                  placeholder="Contoh: 2 Hari, 1 Minggu, dsb."
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="btn-primary w-full sm:w-auto px-8"
              >
                {loading ? "Menyimpan..." : "Simpan Produk"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

