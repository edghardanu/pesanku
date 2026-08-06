"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ShoppingBag, 
  Users, 
  Store, 
  CreditCard, 
  CheckCircle, 
  Clock,
  ArrowRightLeft,
  Settings,
  LogOut,
  Search,
  QrCode,
  Menu,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import Swal from 'sweetalert2';

type ClientAdminDashboardProps = {
  stats: {
    totalUsers: number;
    totalSellers: number;
    totalOrders: number;
    escrowBalance: number;
  };
  userName: string;
  umkmList: any[];
};

export default function ClientAdminDashboard({ stats, userName, umkmList }: ClientAdminDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'verifikasi' | 'pencairan' | 'umkm' | 'qris'>('overview');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [localUmkmList, setLocalUmkmList] = useState(umkmList);
  const [searchQueryUmkm, setSearchQueryUmkm] = useState('');
  const [searchQueryPayout, setSearchQueryPayout] = useState('');

  const [mockPayouts, setMockPayouts] = useState<any[]>([]);
  const [mockVerifications, setMockVerifications] = useState<any[]>([]);
  const [adminQrisUrl, setAdminQrisUrl] = useState('https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=DummyQRIS'); // Mock initial QRIS

  useEffect(() => {
    const savedPayouts = localStorage.getItem('mockPayouts');
    if (savedPayouts) {
      setMockPayouts(JSON.parse(savedPayouts));
    } else {
      setMockPayouts([
        {
          id: '1',
          storeName: 'Toko Roti Ibu Ana',
          rekening: 'BCA - 8921831923 (Ana)',
          diajukan: 'Rp 500.000',
          potongan: '-Rp 9.000',
          total: 'Rp 491.000'
        }
      ]);
    }

    const savedVerifications = localStorage.getItem('mockVerifications');
    if (savedVerifications) {
      setMockVerifications(JSON.parse(savedVerifications));
    } else {
      setMockVerifications([
        {
          id: 'ORD-99821',
          pembeli: 'Budi Pembeli',
          totalBayar: 'Rp 105.000',
          waktu: '10 mnt lalu'
        }
      ]);
    }

    const savedQris = localStorage.getItem('adminQrisUrl');
    if (savedQris) {
      setAdminQrisUrl(savedQris);
    }
  }, []);

  const updateMockPayouts = (newPayouts: any[]) => {
    setMockPayouts(newPayouts);
    localStorage.setItem('mockPayouts', JSON.stringify(newPayouts));
  };

  const updateMockVerifications = (newVerifications: any[]) => {
    setMockVerifications(newVerifications);
    localStorage.setItem('mockVerifications', JSON.stringify(newVerifications));
  };

  const handleAddUmkm = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Tambah UMKM Baru',
      html: `
        <div class="flex flex-col gap-4 text-left">
          <div>
            <label class="text-caption text-text-secondary mb-1 block">Nama Pemilik</label>
            <input id="swal-name" class="input-field w-full" placeholder="Cth: Budi Santoso">
          </div>
          <div>
            <label class="text-caption text-text-secondary mb-1 block">Email Login</label>
            <input id="swal-email" type="email" class="input-field w-full" placeholder="Cth: budi@gmail.com">
          </div>
          <div>
            <label class="text-caption text-text-secondary mb-1 block">Password Default</label>
            <input id="swal-password" type="password" class="input-field w-full" placeholder="Minimal 6 karakter">
          </div>
          <div class="h-px bg-border w-full my-2"></div>
          <div>
            <label class="text-caption text-text-secondary mb-1 block">Nama Toko / UMKM</label>
            <input id="swal-store" class="input-field w-full" placeholder="Cth: Kedai Budi">
          </div>
          <div>
            <label class="text-caption text-text-secondary mb-1 block">No. HP / WhatsApp</label>
            <input id="swal-phone" class="input-field w-full" placeholder="Cth: 08123456789">
          </div>
          <div>
            <label class="text-caption text-text-secondary mb-1 block">Alamat Lengkap</label>
            <textarea id="swal-address" class="input-field w-full" rows="2" placeholder="Cth: Jl. Sudirman No 1"></textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Simpan Data',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ff5c35', // brand-primary
      preConfirm: () => {
        const name = (document.getElementById('swal-name') as HTMLInputElement).value;
        const email = (document.getElementById('swal-email') as HTMLInputElement).value;
        const password = (document.getElementById('swal-password') as HTMLInputElement).value;
        const storeName = (document.getElementById('swal-store') as HTMLInputElement).value;
        const phone = (document.getElementById('swal-phone') as HTMLInputElement).value;
        const address = (document.getElementById('swal-address') as HTMLTextAreaElement).value;

        if (!name || !email || !password || !storeName || !address) {
          Swal.showValidationMessage('Semua field wajib diisi (kecuali No. HP opsional)');
          return false;
        }
        return { name, email, password, storeName, phone, address };
      }
    });

    if (formValues) {
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formValues.name,
            email: formValues.email,
            password: formValues.password,
            role: 'seller', // will be converted to 'penjual' in the backend
            storeName: formValues.storeName,
            phone: formValues.phone,
            address: formValues.address
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Gagal menambahkan UMKM');

        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'UMKM baru telah ditambahkan.',
          confirmButtonColor: '#10b981'
        }).then(() => {
          // Refresh the page to show the new UMKM
          router.refresh();
          // Also manually update the local state for immediate feedback
          const newUmkm = {
            id: data.userId,
            name: formValues.name,
            email: formValues.email,
            phone: formValues.phone,
            status: 'active',
            storeName: formValues.storeName,
            address: formValues.address,
            category: null,
            createdAt: new Date()
          };
          setLocalUmkmList([newUmkm, ...localUmkmList]);
        });
      } catch (error: any) {
        Swal.fire('Error', error.message, 'error');
      }
    }
  };

  const handleTabChange = (tab: 'overview' | 'verifikasi' | 'pencairan' | 'umkm' | 'qris') => {
    if (tab === activeTab) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab(tab);
      setIsTransitioning(false);
      setIsMobileSidebarOpen(false);
    }, 400); // Simulate lazy loading delay
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
        router.push("/login");
      } catch (error) {
        console.error('Logout error', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-base flex flex-col md:flex-row">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border transform ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 flex flex-col h-screen`}>
        <div className="p-4 border-b border-border flex justify-between items-center relative">
          <Link href="/" className="flex items-center gap-2">
            <ShoppingBag className="w-8 h-8 text-brand-primary" />
            <span className="text-h3 text-brand-primary font-bold tracking-tight">pesanku admin</span>
          </Link>
          <button 
            className="md:hidden text-text-secondary"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => handleTabChange('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
              activeTab === 'overview' 
                ? 'bg-brand-primary/10 text-brand-primary font-semibold' 
                : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>Overview</span>
          </button>

          <button 
            onClick={() => handleTabChange('umkm')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
              activeTab === 'umkm' 
                ? 'bg-brand-primary/10 text-brand-primary font-semibold' 
                : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
            }`}
          >
            <Store className="w-5 h-5" />
            <span>Daftar UMKM</span>
          </button>
          
          <button 
            onClick={() => handleTabChange('verifikasi')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
              activeTab === 'verifikasi' 
                ? 'bg-status-warning/10 text-status-warning font-semibold' 
                : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
            }`}
          >
            <CheckCircle className="w-5 h-5" />
            <span>Verifikasi Pembayaran</span>
            {mockVerifications.length > 0 && (
              <span className="ml-auto bg-status-warning text-white text-xs font-bold px-2 py-0.5 rounded-full">{mockVerifications.length}</span>
            )}
          </button>

          <button 
            onClick={() => handleTabChange('pencairan')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
              activeTab === 'pencairan' 
                ? 'bg-brand-secondary/10 text-brand-secondary-dark font-semibold' 
                : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
            }`}
          >
            <ArrowRightLeft className="w-5 h-5" />
            <span>Pencairan Dana (Payout)</span>
            {mockPayouts.length > 0 && (
              <span className="ml-auto bg-brand-secondary-dark text-white text-xs font-bold px-2 py-0.5 rounded-full">{mockPayouts.length}</span>
            )}
          </button>
          
          <button 
            onClick={() => handleTabChange('qris')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
              activeTab === 'qris' 
                ? 'bg-brand-primary/10 text-brand-primary font-semibold' 
                : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
            }`}
          >
            <QrCode className="w-5 h-5" />
            <span>Pengaturan QRIS</span>
          </button>
        </nav>

        <div className="p-4 border-t border-border">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-status-error hover:bg-status-error/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-semibold">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen md:h-screen overflow-y-auto relative">
        {/* Topbar Mobile */}
        <header className="md:hidden bg-surface border-b border-border p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-brand-primary" />
            <span className="text-h3 text-brand-primary font-bold tracking-tight">pesanku admin</span>
          </div>
          <button onClick={() => setIsMobileSidebarOpen(true)} className="p-2 text-text-primary">
            <Menu className="w-6 h-6" />
          </button>
        </header>

        <div className="p-4 md:p-8 flex-1 relative">
          {/* Loading Overlay */}
        {isTransitioning && (
          <div className="absolute inset-0 bg-base/60 backdrop-blur-sm z-50 flex items-center justify-center transition-all duration-300">
            <div className="bg-white p-4 rounded-full shadow-lg flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin"></div>
            </div>
          </div>
        )}

        <div className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-40' : 'opacity-100'}`}>
          <header className="mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-display-2 text-text-primary mb-1">Dashboard Admin</h1>
              <p className="text-body-base text-text-secondary">Pantau aktivitas platform, verifikasi pembayaran, dan kelola pencairan dana UMKM.</p>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-caption text-text-secondary">Login sebagai</p>
              <p className="font-semibold text-text-primary">{userName}</p>
            </div>
          </header>

          {activeTab === 'umkm' && (
            <div className="card p-0 border border-border overflow-hidden">
              <div className="p-6 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50">
                <h2 className="text-h3 w-full sm:w-auto">Daftar UMKM Terdaftar</h2>
                <div className="flex gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Cari nama toko..."
                      value={searchQueryUmkm}
                      onChange={(e) => setSearchQueryUmkm(e.target.value)}
                      className="input-field pl-10 pr-4 py-2 text-sm w-full"
                    />
                    <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <button 
                    onClick={handleAddUmkm}
                    className="btn-primary py-2 px-4 whitespace-nowrap text-sm h-[38px]"
                  >
                    + Tambah UMKM
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface text-caption text-text-secondary border-b border-border">
                      <th className="p-4 font-medium">Nama Toko</th>
                      <th className="p-4 font-medium">Pemilik / Kontak</th>
                      <th className="p-4 font-medium">Kategori</th>
                      <th className="p-4 font-medium">Alamat</th>
                      <th className="p-4 font-medium">Status Akun</th>
                      <th className="p-4 font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-body-small">
                    {localUmkmList.filter(u => (u.storeName || '').toLowerCase().includes(searchQueryUmkm.toLowerCase())).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-text-secondary">
                          {localUmkmList.length === 0 ? "Belum ada UMKM yang mendaftar." : "UMKM tidak ditemukan."}
                        </td>
                      </tr>
                    ) : (
                      localUmkmList
                        .filter(u => (u.storeName || '').toLowerCase().includes(searchQueryUmkm.toLowerCase()))
                        .map((umkm) => (
                        <tr key={umkm.id} className="border-b border-border hover:bg-gray-50">
                          <td className="p-4 font-semibold text-text-primary">
                            {umkm.storeName || "Belum diatur"}
                          </td>
                          <td className="p-4">
                            <p className="font-medium text-text-primary">{umkm.name}</p>
                            <p className="text-text-secondary text-caption">{umkm.email}</p>
                            <p className="text-text-secondary text-caption">{umkm.phone || '-'}</p>
                          </td>
                          <td className="p-4 text-text-secondary">{umkm.category || "-"}</td>
                          <td className="p-4 text-text-secondary max-w-[200px] truncate" title={umkm.address || ""}>{umkm.address || "-"}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              umkm.status === 'active' 
                                ? 'bg-status-success/10 text-status-success' 
                                : umkm.status === 'inactive'
                                ? 'bg-status-error/10 text-status-error'
                                : 'bg-status-warning/10 text-status-warning'
                            }`}>
                              {umkm.status === 'active' ? 'Aktif' : umkm.status === 'inactive' ? 'Tidak Aktif' : 'Pending'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2 items-center">
                              <select
                                value={umkm.status}
                                onChange={async (e) => {
                                  const newStatus = e.target.value;
                                  try {
                                    const res = await fetch('/api/admin/umkm/status', {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ userId: umkm.id, status: newStatus }),
                                    });
                                    if (!res.ok) throw new Error('Gagal memperbarui status');
                                    
                                    // Update local state
                                    setLocalUmkmList(localUmkmList.map(u => u.id === umkm.id ? { ...u, status: newStatus } : u));
                                    Swal.fire({
                                      toast: true,
                                      position: 'top-end',
                                      icon: 'success',
                                      title: 'Status berhasil diperbarui',
                                      showConfirmButton: false,
                                      timer: 3000
                                    });
                                  } catch (error) {
                                    console.error(error);
                                    Swal.fire('Error', 'Gagal memperbarui status', 'error');
                                  }
                                }}
                                className="input-field py-1.5 px-3 text-sm min-w-[120px]"
                              >
                                <option value="active">Set Aktif</option>
                                <option value="inactive">Set Tidak Aktif</option>
                                <option value="pending">Set Pending</option>
                              </select>

                              <button 
                                onClick={() => {
                                  Swal.fire({
                                    title: 'Hapus UMKM?',
                                    text: `Anda yakin ingin menghapus akun ${umkm.storeName}? Tindakan ini tidak bisa dibatalkan.`,
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonColor: '#ef4444',
                                    cancelButtonColor: '#94a3b8',
                                    confirmButtonText: 'Ya, Hapus!',
                                    cancelButtonText: 'Batal'
                                  }).then(async (result) => {
                                    if (result.isConfirmed) {
                                      try {
                                        const res = await fetch(`/api/admin/umkm?id=${umkm.id}`, { method: 'DELETE' });
                                        if (!res.ok) throw new Error('Gagal menghapus UMKM');
                                        
                                        setLocalUmkmList(localUmkmList.filter(u => u.id !== umkm.id));
                                        router.refresh();
                                        Swal.fire({
                                          toast: true,
                                          position: 'top-end',
                                          icon: 'success',
                                          title: 'UMKM berhasil dihapus',
                                          showConfirmButton: false,
                                          timer: 3000
                                        });
                                      } catch (error) {
                                        console.error(error);
                                        Swal.fire('Error', 'Terjadi kesalahan saat menghapus', 'error');
                                      }
                                    }
                                  });
                                }}
                                className="btn-outline py-1.5 px-3 text-sm text-status-error border-status-error hover:bg-status-error/10"
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-6 border border-border">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-caption text-text-secondary">Total Pengguna</p>
                      <p className="text-h2 text-text-primary">{stats.totalUsers}</p>
                    </div>
                  </div>
                </div>
                
                <div className="card p-6 border border-border">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-brand-secondary/20 flex items-center justify-center text-brand-secondary-dark">
                      <Store className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-caption text-text-secondary">UMKM Aktif</p>
                      <p className="text-h2 text-text-primary">{stats.totalSellers}</p>
                    </div>
                  </div>
                </div>
                
                <div className="card p-6 border border-border">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-status-success/20 flex items-center justify-center text-status-success">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-caption text-text-secondary">Total Transaksi</p>
                      <p className="text-h2 text-text-primary">{stats.totalOrders}</p>
                    </div>
                  </div>
                </div>

                <div className="card p-6 border border-border">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-caption text-text-secondary">Saldo Escrow (Ditahan)</p>
                      <p className="text-h2 text-text-primary">Rp {stats.escrowBalance.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-6 border border-border">
                <h2 className="text-h3 mb-4">Aktivitas Terbaru</h2>
                <div className="space-y-4">
                  <p className="text-text-secondary text-center py-8">Belum ada aktivitas hari ini.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'qris' && (
            <div className="card p-0 border border-border overflow-hidden max-w-2xl mx-auto">
              <div className="p-6 border-b border-border bg-gray-50">
                <h2 className="text-h3 mb-1">Pengaturan QRIS Admin</h2>
                <p className="text-body-small text-text-secondary">Foto barcode QRIS ini akan ditampilkan kepada pembeli pada saat *checkout* pembayaran.</p>
              </div>
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-64 h-64 border-4 border-gray-100 rounded-3xl overflow-hidden mb-6 relative shadow-inner bg-gray-50 flex items-center justify-center">
                  {adminQrisUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={adminQrisUrl} alt="QRIS Admin" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-text-secondary text-sm">Belum ada QRIS</span>
                  )}
                </div>
                
                <div className="flex gap-4">
                  <button 
                    onClick={async () => {
                      const { value: file } = await Swal.fire({
                        title: 'Perbarui QRIS',
                        input: 'file',
                        inputAttributes: {
                          'accept': 'image/*',
                          'aria-label': 'Upload foto QRIS'
                        },
                        showCancelButton: true,
                        confirmButtonText: 'Simpan',
                        cancelButtonText: 'Batal',
                        confirmButtonColor: '#ff5c35'
                      });

                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          const base64Url = e.target?.result as string;
                          setAdminQrisUrl(base64Url);
                          localStorage.setItem('adminQrisUrl', base64Url);
                          Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'success',
                            title: 'QRIS berhasil diperbarui',
                            showConfirmButton: false,
                            timer: 3000
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="btn-primary py-2 px-6 shadow-lg shadow-brand-primary/20"
                  >
                    Ganti Foto QRIS
                  </button>

                  {adminQrisUrl && (
                    <button 
                      onClick={() => {
                        Swal.fire({
                          title: 'Hapus QRIS?',
                          text: "Foto QRIS saat ini akan dihapus.",
                          icon: 'warning',
                          showCancelButton: true,
                          confirmButtonColor: '#ef4444',
                          cancelButtonColor: '#94a3b8',
                          confirmButtonText: 'Ya, Hapus',
                          cancelButtonText: 'Batal'
                        }).then((result) => {
                          if (result.isConfirmed) {
                            setAdminQrisUrl('');
                            localStorage.removeItem('adminQrisUrl');
                            Swal.fire({
                              toast: true,
                              position: 'top-end',
                              icon: 'success',
                              title: 'QRIS berhasil dihapus',
                              showConfirmButton: false,
                              timer: 3000
                            });
                          }
                        });
                      }}
                      className="btn-outline py-2 px-6 text-status-error border-status-error hover:bg-status-error/10"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'verifikasi' && (
            <div className="card p-0 border border-border overflow-hidden">
              <div className="p-6 border-b border-border flex justify-between items-center bg-gray-50">
                <h2 className="text-h3">Verifikasi Pembayaran Masuk</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface text-caption text-text-secondary border-b border-border">
                      <th className="p-4 font-medium">Order ID</th>
                      <th className="p-4 font-medium">Pembeli</th>
                      <th className="p-4 font-medium">Total Bayar</th>
                      <th className="p-4 font-medium">Bukti Bayar</th>
                      <th className="p-4 font-medium">Waktu</th>
                      <th className="p-4 font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-body-small">
                    {mockVerifications.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-text-secondary">Tidak ada pembayaran yang menunggu verifikasi.</td>
                      </tr>
                    ) : (
                      mockVerifications.map((verif) => (
                        <tr key={verif.id} className="border-b border-border hover:bg-gray-50">
                          <td className="p-4 font-mono font-medium">{verif.id}</td>
                          <td className="p-4">{verif.pembeli}</td>
                          <td className="p-4 font-semibold text-brand-primary">{verif.totalBayar}</td>
                          <td className="p-4">
                            <button 
                              onClick={() => {
                                Swal.fire({
                                  title: `Bukti Pembayaran - ${verif.id}`,
                                  imageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=600&fit=crop',
                                  imageWidth: 400,
                                  imageHeight: 600,
                                  imageAlt: 'Bukti Pembayaran',
                                  text: `Dari: ${verif.pembeli} | Nominal: ${verif.totalBayar}`,
                                  confirmButtonText: 'Tutup',
                                  confirmButtonColor: '#ff5c35'
                                });
                              }}
                              className="text-brand-secondary-dark font-medium underline hover:text-brand-primary transition-colors"
                            >
                              Lihat Bukti
                            </button>
                          </td>
                          <td className="p-4 text-text-secondary">{verif.waktu}</td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  Swal.fire({
                                    title: 'Verifikasi Pembayaran',
                                    text: `Terima pembayaran ${verif.totalBayar} dari ${verif.pembeli}?`,
                                    icon: 'question',
                                    showCancelButton: true,
                                    confirmButtonColor: '#ff5c35',
                                    cancelButtonColor: '#94a3b8',
                                    confirmButtonText: 'Ya, Verifikasi',
                                    cancelButtonText: 'Batal'
                                  }).then((result) => {
                                    if (result.isConfirmed) {
                                      updateMockVerifications(mockVerifications.filter(v => v.id !== verif.id));
                                      Swal.fire({
                                        toast: true,
                                        position: 'top-end',
                                        icon: 'success',
                                        title: 'Pembayaran berhasil diverifikasi',
                                        showConfirmButton: false,
                                        timer: 3000
                                      });
                                    }
                                  });
                                }}
                                className="btn-primary py-1.5 px-3 text-sm"
                              >
                                Verifikasi
                              </button>
                              <button 
                                onClick={() => {
                                  Swal.fire({
                                    title: 'Tolak Pembayaran',
                                    text: `Tolak pembayaran dari ${verif.pembeli}?`,
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonColor: '#ef4444', // status-error
                                    cancelButtonColor: '#94a3b8',
                                    confirmButtonText: 'Ya, Tolak',
                                    cancelButtonText: 'Batal'
                                  }).then((result) => {
                                    if (result.isConfirmed) {
                                      updateMockVerifications(mockVerifications.filter(v => v.id !== verif.id));
                                      Swal.fire({
                                        toast: true,
                                        position: 'top-end',
                                        icon: 'success',
                                        title: 'Pembayaran ditolak',
                                        showConfirmButton: false,
                                        timer: 3000
                                      });
                                    }
                                  });
                                }}
                                className="btn-outline py-1.5 px-3 text-sm text-status-error border-status-error hover:bg-status-error/10"
                              >
                                Tolak
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'pencairan' && (
            <div className="card p-0 border border-border overflow-hidden">
              <div className="p-6 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50">
                <h2 className="text-h3">Permintaan Pencairan Dana (Payout)</h2>
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Cari nama toko..."
                    value={searchQueryPayout}
                    onChange={(e) => setSearchQueryPayout(e.target.value)}
                    className="input-field pl-10 pr-4 py-2 text-sm w-full"
                  />
                  <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface text-caption text-text-secondary border-b border-border">
                      <th className="p-4 font-medium">Toko / UMKM</th>
                      <th className="p-4 font-medium">Rekening Tujuan</th>
                      <th className="p-4 font-medium">Dana Diajukan</th>
                      <th className="p-4 font-medium">Potongan (Admin)</th>
                      <th className="p-4 font-medium">Total Ditransfer</th>
                      <th className="p-4 font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-body-small">
                    {mockPayouts.filter(p => p.storeName.toLowerCase().includes(searchQueryPayout.toLowerCase())).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-text-secondary">
                          {mockPayouts.length === 0 ? "Tidak ada permintaan pencairan dana saat ini." : "Pencairan tidak ditemukan."}
                        </td>
                      </tr>
                    ) : (
                      mockPayouts
                        .filter(p => p.storeName.toLowerCase().includes(searchQueryPayout.toLowerCase()))
                        .map((payout) => (
                        <tr key={payout.id} className="border-b border-border hover:bg-gray-50">
                          <td className="p-4">
                            <p className="font-semibold text-text-primary">{payout.storeName}</p>
                          </td>
                          <td className="p-4 text-text-secondary">{payout.rekening}</td>
                          <td className="p-4 text-text-primary">{payout.diajukan}</td>
                          <td className="p-4 text-status-error">{payout.potongan}</td>
                          <td className="p-4 font-bold text-status-success">{payout.total}</td>
                          <td className="p-4">
                            <div className="flex gap-2 items-center">
                              <button 
                                onClick={() => {
                                  Swal.fire({
                                    title: 'Konfirmasi Pencairan',
                                    text: `Apakah Anda sudah mentransfer sejumlah ${payout.total} ke ${payout.rekening}?`,
                                    icon: 'question',
                                    showCancelButton: true,
                                    confirmButtonColor: '#10b981', // status-success
                                    cancelButtonColor: '#94a3b8',
                                    confirmButtonText: 'Ya, Sudah Ditransfer',
                                    cancelButtonText: 'Batal'
                                  }).then((result) => {
                                    if (result.isConfirmed) {
                                      updateMockPayouts(mockPayouts.filter(p => p.id !== payout.id));
                                      Swal.fire({
                                        toast: true,
                                        position: 'top-end',
                                        icon: 'success',
                                        title: 'Pencairan ditandai selesai',
                                        showConfirmButton: false,
                                        timer: 3000
                                      });
                                    }
                                  });
                                }}
                                className="btn-primary py-1.5 px-3 text-sm bg-status-success hover:bg-status-success/80 border-transparent text-white"
                              >
                                Tandai Selesai
                              </button>
                              
                              <button 
                                onClick={() => {
                                  Swal.fire({
                                    title: 'Hapus Permintaan?',
                                    text: `Tolak dan hapus permintaan pencairan dari ${payout.storeName}?`,
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonColor: '#ef4444',
                                    cancelButtonColor: '#94a3b8',
                                    confirmButtonText: 'Ya, Hapus!',
                                    cancelButtonText: 'Batal'
                                  }).then((result) => {
                                    if (result.isConfirmed) {
                                      updateMockPayouts(mockPayouts.filter(p => p.id !== payout.id));
                                      Swal.fire({
                                        toast: true,
                                        position: 'top-end',
                                        icon: 'success',
                                        title: 'Permintaan pencairan dihapus',
                                        showConfirmButton: false,
                                        timer: 3000
                                      });
                                    }
                                  });
                                }}
                                className="btn-outline py-1.5 px-3 text-sm text-status-error border-status-error hover:bg-status-error/10"
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        </div>
      </main>
    </div>
  );
}
