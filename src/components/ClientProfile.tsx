"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Camera,
  Home,
  Landmark,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  Save,
  ShieldCheck,
  Store,
  Tags,
  User,
} from "lucide-react";
import Swal from "sweetalert2";

import { AuthUser, SellerProfile } from "@/types";

type ProfileFormData = {
  name: string;
  phone: string;
  address: string;
  profileImageUrl: string;
  storeName: string;
  storeAddress: string;
  category: string;
  bankAccount: string;
  logoUrl: string;
};

export default function ClientProfile({ user, sellerData }: { user: AuthUser, sellerData?: SellerProfile | null }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    name: user.name || "",
    phone: user.phone || "",
    address: user.address || "",
    profileImageUrl: user.profileImageUrl || sellerData?.logoUrl || "",
    storeName: sellerData?.storeName || user.name || "",
    storeAddress: sellerData?.address || user.address || "",
    category: sellerData?.category || "",
    bankAccount: sellerData?.bankAccount || "",
    logoUrl: sellerData?.logoUrl || user.profileImageUrl || "",
  });

  useEffect(() => {
    setTimeout(() => {
      if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }, 0);
  }, []);

  const roleLabel = user.role === 'penjual'
    ? 'Mitra UMKM'
    : user.role === 'admin'
      ? 'Administrator'
      : 'Status: Pelanggan';

  const roleClass = user.role === 'penjual'
    ? 'bg-status-success/10 text-status-success'
    : user.role === 'admin'
      ? 'bg-status-warning/10 text-status-warning'
      : 'bg-brand-primary/10 text-brand-primary';

  const isSeller = user.role === 'penjual';
  const personalCopy = isSeller
    ? {
      title: 'Data Penanggung Jawab',
      nameLabel: 'Nama Penanggung Jawab',
      phoneLabel: 'Kontak Penjual',
      addressLabel: 'Alamat Penanggung Jawab',
      namePlaceholder: 'Nama pemilik atau PIC toko',
      phonePlaceholder: 'Nomor WhatsApp penjual',
      addressPlaceholder: 'Alamat domisili penanggung jawab',
      sectionClass: 'border-status-success/30 bg-status-success/[0.03]',
      iconClass: 'text-status-success',
    }
    : {
      title: 'Data Pembeli',
      nameLabel: 'Nama Penerima',
      phoneLabel: 'WhatsApp Pembeli',
      addressLabel: 'Alamat Pengiriman',
      namePlaceholder: 'Nama penerima pesanan',
      phonePlaceholder: 'Nomor WhatsApp aktif',
      addressPlaceholder: 'Alamat lengkap untuk pengiriman',
      sectionClass: 'border-brand-primary/30 bg-brand-primary/[0.03]',
      iconClass: 'text-brand-primary',
    };

  const avatarUrl = formData.profileImageUrl || formData.logoUrl;

  const updateField = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getInitials = (name: string) => {
    return (name || "PS").substring(0, 2).toUpperCase();
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      Swal.fire('Format Tidak Didukung', 'File harus berupa gambar.', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      Swal.fire('Ukuran Terlalu Besar', 'Ukuran gambar maksimal 2MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const result = readerEvent.target?.result;
      if (typeof result !== 'string') return;

      setFormData(prev => ({
        ...prev,
        profileImageUrl: result,
        logoUrl: user.role === 'penjual' ? result : prev.logoUrl,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal menyimpan profil.');
      }

      await Swal.fire({
        icon: 'success',
        title: 'Profil Disimpan',
        text: 'Data akun berhasil diperbarui.',
        timer: 1600,
        showConfirmButton: false,
      });

      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Terjadi kesalahan.';
      Swal.fire('Gagal', message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Keluar?',
      text: "Apakah Anda yakin ingin mengakhiri sesi?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#800000',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal',
    });

    if (result.isConfirmed) {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-base text-text-primary pb-24 md:pb-12">
      <div className="bg-surface border-b border-border sticky top-0 z-40 shadow-sm">
        <div className="max-w-m-container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-text-secondary hover:text-brand-primary transition-colors">
            <ArrowLeft className="w-6 h-6" />
            <span className="font-semibold">Kembali</span>
          </Link>
          <h1 className="text-lg font-bold">Profil Akun</h1>
          <div className="w-16" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-m-container mx-auto p-4 space-y-6 mt-4">
        <section className={`rounded-2xl p-6 shadow-sm border flex flex-col items-center ${isSeller ? 'bg-status-success/[0.03] border-status-success/30' : 'bg-brand-primary/[0.03] border-brand-primary/30'}`}>
          <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center text-3xl font-bold shadow-inner mb-4 relative overflow-hidden ${isSeller ? 'bg-status-success/10 border-status-success/20 text-status-success' : 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary'}`}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Foto Profil" className="w-full h-full object-cover" />
            ) : (
              getInitials(formData.name)
            )}

            {user.role === 'penjual' && sellerData?.approvalStatus === 'approved' && (
              <div className="absolute bottom-0 bg-status-success w-full h-5 flex items-center justify-center text-white">
                <ShieldCheck className="w-3 h-3" />
              </div>
            )}
          </div>

          <label
            htmlFor="profile-photo"
            className="btn-outline px-4 py-2 flex items-center gap-2 cursor-pointer text-sm mb-4"
          >
            <Camera className="w-4 h-4" />
            Ubah Foto
          </label>
          <input
            id="profile-photo"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />

          <h2 className="text-2xl font-bold text-center text-text-primary">{formData.name || user.name}</h2>
          <span className={`px-3 py-1 rounded-full text-xs font-bold mt-2 shadow-sm ${roleClass}`}>
            {roleLabel}
          </span>
        </section>

        <section className={`rounded-2xl p-5 shadow-sm border space-y-5 ${personalCopy.sectionClass}`}>
          <h3 className="font-bold text-text-primary border-b border-border pb-3 flex items-center gap-2">
            <User className={`w-5 h-5 ${personalCopy.iconClass}`} /> {personalCopy.title}
          </h3>

          <label className="block">
            <span className="text-body-small font-medium text-text-secondary mb-1 flex items-center gap-2">
              <User className="w-4 h-4" /> {personalCopy.nameLabel}
            </span>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(event) => updateField('name', event.target.value)}
              className="input-field w-full"
              placeholder={personalCopy.namePlaceholder}
            />
          </label>

          <label className="block">
            <span className="text-body-small font-medium text-text-secondary mb-1 flex items-center gap-2">
              <Mail className="w-4 h-4" /> Email
            </span>
            <input
              type="email"
              value={user.email}
              disabled
              className="input-field w-full opacity-70 cursor-not-allowed"
            />
          </label>

          <label className="block">
            <span className="text-body-small font-medium text-text-secondary mb-1 flex items-center gap-2">
              <Phone className="w-4 h-4" /> {personalCopy.phoneLabel}
            </span>
            <input
              type="tel"
              value={formData.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              className="input-field w-full"
              placeholder={personalCopy.phonePlaceholder}
            />
          </label>

          <label className="block">
            <span className="text-body-small font-medium text-text-secondary mb-1 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> {personalCopy.addressLabel}
            </span>
            <textarea
              value={formData.address}
              onChange={(event) => updateField('address', event.target.value)}
              className="input-field w-full min-h-[96px] py-3"
              placeholder={personalCopy.addressPlaceholder}
            />
          </label>
        </section>

        {user.role === 'penjual' && (
          <section className="bg-surface rounded-2xl p-5 shadow-sm border border-border space-y-5">
            <h3 className="font-bold text-text-primary border-b border-border pb-3 flex items-center gap-2">
              <Store className="w-5 h-5 text-status-warning" /> Informasi Toko
            </h3>

            <label className="block">
              <span className="text-body-small font-medium text-text-secondary mb-1 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Nama Toko
              </span>
              <input
                type="text"
                required
                value={formData.storeName}
                onChange={(event) => updateField('storeName', event.target.value)}
                className="input-field w-full"
                placeholder="Nama UMKM"
              />
            </label>

            <label className="block">
              <span className="text-body-small font-medium text-text-secondary mb-1 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Alamat Operasional
              </span>
              <textarea
                value={formData.storeAddress}
                onChange={(event) => updateField('storeAddress', event.target.value)}
                className="input-field w-full min-h-[96px] py-3"
                placeholder="Alamat toko atau lokasi produksi"
              />
            </label>

            <label className="block">
              <span className="text-body-small font-medium text-text-secondary mb-1 flex items-center gap-2">
                <Tags className="w-4 h-4" /> Kategori Produk
              </span>
              <select
                value={formData.category}
                onChange={(event) => updateField('category', event.target.value)}
                className="input-field w-full"
              >
                <option value="">Pilih Kategori</option>
                <option value="Makanan Berat">Makanan Berat</option>
                <option value="Jajanan / Snack">Jajanan / Snack</option>
                <option value="Minuman">Minuman</option>
                <option value="Bahan Mentah">Bahan Mentah</option>
              </select>
            </label>

            <label className="block">
              <span className="text-body-small font-medium text-text-secondary mb-1 flex items-center gap-2">
                <Landmark className="w-4 h-4" /> Rekening Pencairan
              </span>
              <input
                type="text"
                value={formData.bankAccount}
                onChange={(event) => updateField('bankAccount', event.target.value)}
                className="input-field w-full"
                placeholder="Contoh: BCA - 1234567890 a.n Budi"
              />
            </label>
          </section>
        )}

        <section className="bg-surface rounded-2xl overflow-hidden shadow-sm border border-border">
          <Link href="/" className="flex items-center gap-4 p-4 hover:bg-base transition-colors border-b border-border">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <Home className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Beranda</p>
              <p className="text-xs text-text-secondary">Lihat katalog preorder</p>
            </div>
          </Link>

          {user.role === 'pembeli' && (
            <Link href="/buyer/orders" className="flex items-center gap-4 p-4 hover:bg-base transition-colors border-b border-border">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <Package className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">Daftar Pesanan Saya</p>
                <p className="text-xs text-text-secondary">Pantau jadwal dan preorder Anda</p>
              </div>
            </Link>
          )}

          {user.role === 'penjual' && (
            <Link href="/seller" className="flex items-center gap-4 p-4 hover:bg-base transition-colors border-b border-border">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                <Store className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">Dashboard Toko</p>
                <p className="text-xs text-text-secondary">Kelola pesanan dan kas masuk</p>
              </div>
            </Link>
          )}
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary py-3.5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex justify-center items-center gap-3 bg-red-500/10 hover:bg-red-500/20 text-red-600 font-bold py-3.5 rounded-2xl transition-all shadow-sm border border-red-500/20"
          >
            <LogOut className="w-5 h-5" />
            Keluar
          </button>
        </div>

        <div className="flex justify-center items-center gap-2 mt-4 mb-8 text-[10px] text-text-secondary flex-wrap">
          <Link href="/faq" className="hover:text-brand-primary underline transition-colors">Pusat Bantuan (FAQ)</Link>
          <span>&bull;</span>
          <Link href="/terms" className="hover:text-brand-primary underline transition-colors">Syarat & Ketentuan (T&C)</Link>
          <span>&bull;</span>
          <Link href="/refund-policy" className="hover:text-brand-primary underline transition-colors">Kebijakan Pengembalian Dana</Link>
        </div>
      </form>
    </div>
  );
}
