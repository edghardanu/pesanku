"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, Info, X } from "lucide-react";
import Image from "next/image";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasMinQty, setHasMinQty] = useState(false);
  
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const minQty = formData.get("minQty");
    const deadline = formData.get("deadline");

    // Validasi di frontend (Business Rule 1)
    if (deadline && (!minQty || parseInt(minQty as string) < 1)) {
      setError("Kuota minimal wajib diisi sebelum mengatur deadline!");
      setLoading(false);
      return;
    }

    const data = {
      name: formData.get("name"),
      description: formData.get("description"),
      price: formData.get("price"),
      minQty: minQty,
      deadline: deadline,
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
    } catch (err: any) {
      setError(err.message);
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
                Deskripsi
              </label>
              <textarea 
                name="description"
                placeholder="Jelaskan detail produk Anda (bahan, ukuran, dll)"
                className="input-field min-h-[100px] resize-y"
              />
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
                      className="absolute -top-2 -right-2 bg-white text-status-error rounded-full p-1 shadow-md hover:bg-status-error hover:text-white transition-colors"
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
              <h3 className="text-body-base font-semibold text-brand-secondary-dark mb-2">Pengaturan Preorder</h3>
              <p className="text-caption text-text-secondary mb-4">Sistem akan secara otomatis membatalkan preorder jika kuota minimal tidak tercapai hingga batas waktu (deadline) yang ditentukan.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-body-small font-medium text-text-primary mb-1">
                    Minimal Pembelian (Porsi) <span className="text-status-error">*</span>
                  </label>
                  <input 
                    type="number" 
                    name="minQty"
                    min="1"
                    defaultValue="10"
                    onChange={(e) => setHasMinQty(parseInt(e.target.value) > 0)}
                    className="input-field bg-white"
                  />
                </div>

                <div>
                  <label className="block text-body-small font-medium text-text-primary mb-1">
                    Batas Waktu (Deadline)
                  </label>
                  <input 
                    type="date" 
                    name="deadline"
                    className="input-field bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
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

