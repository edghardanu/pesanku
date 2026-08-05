"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingBag, Plus, Package, DollarSign, Settings, LogOut, Info } from "lucide-react";

import Swal from 'sweetalert2';

type Product = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  preorderMinQty: number | null;
  currentQty: number | null;
  status: string | null;
  deadlineDate: Date | null;
};

type ClientSellerDashboardProps = {
  profile: any;
  myProducts: Product[];
  activeCount: number;
  waitingCount: number;
  completedCount: number;
  userName: string;
};

export default function ClientSellerDashboard({
  profile,
  myProducts,
  activeCount,
  waitingCount,
  completedCount,
  userName
}: ClientSellerDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'produk' | 'keuangan' | 'pengaturan'>('produk');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [formData, setFormData] = useState({
    storeName: profile?.storeName || '',
    address: profile?.address || '',
    category: profile?.category || '',
    bankAccount: profile?.bankAccount || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleTabChange = (tab: 'produk' | 'keuangan' | 'pengaturan') => {
    if (tab === activeTab) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab(tab);
      setIsTransitioning(false);
    }, 400); // Simulate lazy loading delay
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage('');
    try {
      const res = await fetch('/api/seller/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setSaveMessage('Profil berhasil disimpan!');
      } else {
        const data = await res.json();
        setSaveMessage(data.error || 'Gagal menyimpan profil.');
      }
    } catch (error) {
      setSaveMessage('Terjadi kesalahan koneksi saat menyimpan profil.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Konfirmasi Keluar',
      text: `Apakah Anda ${userName} ingin keluar?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff5c35', // brand-primary
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-base flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-surface border-r border-border md:h-screen sticky top-0 flex flex-col">
        <div className="p-6 border-b border-border">
          <Link href="/" className="flex items-center gap-2">
            <ShoppingBag className="w-8 h-8 text-brand-primary" />
            <span className="text-h2 text-brand-primary font-bold">pesanku</span>
          </Link>
          <div className="mt-4 p-3 bg-brand-primary/10 rounded-lg">
            <p className="text-caption text-text-secondary">Toko Aktif</p>
            <p className="text-body-base font-semibold text-brand-primary truncate">{profile?.storeName || 'Toko Saya'}</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => handleTabChange('produk')}
            className={`w-full flex items-center gap-3 p-3 rounded-lg font-medium transition-colors text-left ${
              activeTab === 'produk' 
                ? 'bg-brand-primary/10 text-brand-primary' 
                : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
            }`}
          >
            <Package className="w-5 h-5" />
            Produk Preorder
          </button>
          <button 
            onClick={() => handleTabChange('keuangan')}
            className={`w-full flex items-center gap-3 p-3 rounded-lg font-medium transition-colors text-left ${
              activeTab === 'keuangan' 
                ? 'bg-status-success/10 text-status-success' 
                : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            Keuangan & Saldo
          </button>
          <button 
            onClick={() => handleTabChange('pengaturan')}
            className={`w-full flex items-center gap-3 p-3 rounded-lg font-medium transition-colors text-left ${
              activeTab === 'pengaturan' 
                ? 'bg-brand-secondary/10 text-brand-secondary-dark' 
                : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
            }`}
          >
            <Settings className="w-5 h-5" />
            Pengaturan Toko
          </button>
        </nav>
        
        <div className="p-4 border-t border-border">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 p-3 text-status-error w-full hover:bg-red-50 rounded-lg font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen md:h-screen overflow-y-auto">
        {/* Topbar Mobile */}
        <header className="md:hidden bg-surface border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-brand-primary" />
            <span className="text-h3 text-brand-primary font-bold">pesanku</span>
          </div>
        </header>

        <div className="p-6 md:p-10 flex-1 relative">
          {/* Loading Overlay */}
          {isTransitioning && (
            <div className="absolute inset-0 bg-base/60 backdrop-blur-sm z-50 flex items-center justify-center rounded-xl transition-all duration-300">
              <div className="bg-white p-4 rounded-full shadow-lg flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin"></div>
              </div>
            </div>
          )}

          <div className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-40' : 'opacity-100'}`}>
            {activeTab === 'produk' && (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h1 className="text-h1 mb-1">Produk Preorder</h1>
                  <p className="text-body-base text-text-secondary">Kelola semua produk makanan & minuman preorder Anda di sini.</p>
                </div>
                <Link href="/seller/product/new" className="btn-primary flex items-center gap-2 whitespace-nowrap">
                  <Plus className="w-5 h-5" />
                  Tambah Produk
                </Link>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="card p-6">
                  <h3 className="text-body-small text-text-secondary mb-2">Total Produk Aktif</h3>
                  <p className="text-display-1 font-bold">{activeCount}</p>
                </div>
                <div className="card p-6 border-brand-primary border-2 shadow-sm">
                  <h3 className="text-body-small text-text-secondary mb-2">Preorder Menunggu Kuota</h3>
                  <p className="text-display-1 font-bold text-brand-primary">{waitingCount}</p>
                </div>
                <div className="card p-6">
                  <h3 className="text-body-small text-text-secondary mb-2">Preorder Selesai / Dikirim</h3>
                  <p className="text-display-1 font-bold text-status-success">{completedCount}</p>
                </div>
              </div>

              {/* Product List */}
              <div className="card overflow-hidden">
                <div className="p-5 border-b border-border bg-gray-50 flex justify-between items-center">
                  <h2 className="text-h3">Daftar Produk</h2>
                </div>
                
                <div className="overflow-x-auto">
                  {myProducts.length === 0 ? (
                    <div className="p-10 text-center text-text-secondary">
                      Belum ada produk. Silakan tambah produk preorder pertama Anda!
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border text-body-small text-text-secondary">
                          <th className="p-4 font-medium">Info Produk</th>
                          <th className="p-4 font-medium">Harga</th>
                          <th className="p-4 font-medium">Progress Kuota</th>
                          <th className="p-4 font-medium">Status & Deadline</th>
                          <th className="p-4 font-medium text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="text-body-base">
                        {myProducts.map(product => {
                          const current = product.currentQty || 0;
                          const min = product.preorderMinQty || 1;
                          const pct = Math.min((current / min) * 100, 100);
                          const isFull = current >= min;
                          
                          let deadlineText = "-";
                          if (product.deadlineDate) {
                            deadlineText = new Date(product.deadlineDate).toLocaleDateString('id-ID');
                          }

                          return (
                            <tr key={product.id} className="border-b border-border hover:bg-gray-50/50">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 relative bg-gray-200 rounded-md overflow-hidden shrink-0">
                                    {product.imageUrl && (
                                      <Image src={product.imageUrl} alt={product.name} fill className="object-cover" sizes="48px" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-text-primary line-clamp-1">{product.name}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 font-medium">Rp {product.price.toLocaleString('id-ID')}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{current} / {min}</span>
                                  <div className="w-16 bg-border h-1.5 rounded-full overflow-hidden">
                                    <div className={`${isFull ? 'bg-brand-accent' : 'bg-brand-secondary'} h-full rounded-full`} style={{ width: `${pct}%` }}></div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={`inline-block px-2 py-1 rounded text-caption font-semibold mb-1 ${isFull ? 'bg-brand-accent/20 text-brand-accent' : 'bg-brand-secondary/20 text-brand-secondary'}`}>
                                  {isFull ? 'Kuota Tercapai' : 'Menunggu Kuota'}
                                </span>
                                <p className="text-caption text-text-secondary">s/d {deadlineText}</p>
                              </td>
                              <td className="p-4 text-right">
                                <button className="text-brand-primary font-medium hover:underline text-sm">Edit</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'keuangan' && (
            <div className="space-y-6">
              <h1 className="text-h1 mb-1">Keuangan & Saldo</h1>
              <p className="text-body-base text-text-secondary mb-8">Pantau penghasilan dan tarik dana penjualan Anda di sini.</p>
              
              <div className="card p-8 border-status-success/20 bg-status-success/5 text-center">
                <Info className="w-12 h-12 text-status-success mx-auto mb-4" />
                <h2 className="text-h2 text-text-primary mb-2">Belum Ada Transaksi</h2>
                <p className="text-text-secondary">Saldo Anda saat ini adalah Rp 0. Terus promosikan pre-order Anda!</p>
              </div>
            </div>
          )}

          {activeTab === 'pengaturan' && (
            <div className="space-y-6 max-w-2xl">
              <h1 className="text-h1 mb-1">Pengaturan Toko</h1>
              <p className="text-body-base text-text-secondary mb-8">Kelola informasi UMKM dan detail pencairan dana Anda.</p>
              
              <form onSubmit={handleSaveProfile} className="card p-6 space-y-6">
                {saveMessage && (
                  <div className={`p-4 rounded-lg text-sm font-medium ${saveMessage.includes('berhasil') ? 'bg-status-success/10 text-status-success' : 'bg-status-error/10 text-status-error'}`}>
                    {saveMessage}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-body-small font-medium text-text-secondary mb-1">Nama Toko *</label>
                    <input 
                      type="text" 
                      required
                      value={formData.storeName}
                      onChange={(e) => setFormData({...formData, storeName: e.target.value})}
                      className="input-field w-full"
                      placeholder="Masukkan nama UMKM Anda"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-body-small font-medium text-text-secondary mb-1">Alamat Toko</label>
                    <textarea 
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="input-field w-full min-h-[100px] py-3"
                      placeholder="Masukkan alamat lengkap toko"
                    ></textarea>
                  </div>
                  
                  <div>
                    <label className="block text-body-small font-medium text-text-secondary mb-1">Kategori Produk</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="input-field w-full"
                    >
                      <option value="">Pilih Kategori</option>
                      <option value="Makanan Berat">Makanan Berat</option>
                      <option value="Jajanan / Snack">Jajanan / Snack</option>
                      <option value="Minuman">Minuman</option>
                      <option value="Bahan Mentah">Bahan Mentah</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-body-small font-medium text-text-secondary mb-1">Informasi Rekening Bank</label>
                    <input 
                      type="text" 
                      value={formData.bankAccount}
                      onChange={(e) => setFormData({...formData, bankAccount: e.target.value})}
                      className="input-field w-full"
                      placeholder="Contoh: BCA - 1234567890 a.n Budi"
                    />
                    <p className="text-caption text-text-secondary mt-1">Rekening ini digunakan untuk pencairan dana (payout) hasil penjualan Anda.</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-end">
                  <button type="submit" disabled={isSaving} className="btn-primary min-w-[150px]">
                    {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
          )}
          </div>
        </div>
      </main>
    </div>
  );
}
