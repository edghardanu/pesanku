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
  X,
  BarChart3,
  Calendar,
  TrendingUp,
  Filter,
  Sun,
  Moon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  ordersList?: any[];
};

export default function ClientAdminDashboard({ stats, userName, umkmList, ordersList = [] }: ClientAdminDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'verifikasi' | 'pencairan' | 'umkm' | 'qris'>('overview');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [localUmkmList, setLocalUmkmList] = useState(umkmList);
  const [searchQueryUmkm, setSearchQueryUmkm] = useState('');
  const [searchQueryPayout, setSearchQueryPayout] = useState('');

  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDarkMode(true);
    }
  };

  const [selectedMonth, setSelectedMonth] = useState<string>('8'); // Default Agustus
  const [selectedYear, setSelectedYear] = useState<string>('2026'); // Default 2026
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Live DB orders state for real-time calculation
  const [liveOrders, setLiveOrders] = useState<any[]>(ordersList);

  // 100% Real-time async polling from SQLite DB every 3 seconds
  useEffect(() => {
    const fetchLiveStats = async () => {
      try {
        const res = await fetch('/api/admin/chart-stats');
        if (res.ok) {
          const data = await res.json();
          if (data.ordersList) {
            setLiveOrders(data.ordersList);
          }
        }
      } catch (err) {
        console.error('Error polling chart stats:', err);
      }
    };

    fetchLiveStats();
    const interval = setInterval(fetchLiveStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const getChartData = () => {
    const yearNum = parseInt(selectedYear, 10);

    // Filter 100% real SQLite orders by selected year
    const ordersInYear = liveOrders.filter(o => {
      if (!o.createdAt) return false;
      const d = new Date(o.createdAt);
      return d.getFullYear() === yearNum;
    });

    if (selectedMonth === 'all') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      
      return monthNames.map((month, i) => {
        const monthOrders = ordersInYear.filter(o => new Date(o.createdAt).getMonth() === i);
        const count = monthOrders.length;
        const amount = monthOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);

        return { label: month, count, amount };
      });
    } else {
      const monthIndex = parseInt(selectedMonth, 10);
      const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][monthIndex - 1] || 30;
      
      const periodLabels = [
        `Tgl 1-4`,
        `Tgl 5-8`,
        `Tgl 9-12`,
        `Tgl 13-16`,
        `Tgl 17-20`,
        `Tgl 21-24`,
        `Tgl 25-${daysInMonth}`
      ];

      const ordersInMonth = ordersInYear.filter(o => new Date(o.createdAt).getMonth() + 1 === monthIndex);
      
      const periodRanges = [
        [1, 4],
        [5, 8],
        [9, 12],
        [13, 16],
        [17, 20],
        [21, 24],
        [25, daysInMonth]
      ];

      return periodLabels.map((label, i) => {
        const [startDay, endDay] = periodRanges[i];
        const periodOrders = ordersInMonth.filter(o => {
          const day = new Date(o.createdAt).getDate();
          return day >= startDay && day <= endDay;
        });

        const count = periodOrders.length;
        const amount = periodOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);

        return { label, count, amount };
      });
    }
  };

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
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left hover-btn ${
              activeTab === 'overview' 
                ? 'bg-brand-primary/10 text-brand-primary font-semibold' 
                : 'text-text-secondary hover:bg-border/40 dark:hover:bg-slate-800/80 hover:text-text-primary'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>Overview</span>
          </button>

          <button 
            onClick={() => handleTabChange('umkm')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left hover-btn ${
              activeTab === 'umkm' 
                ? 'bg-brand-primary/10 text-brand-primary font-semibold' 
                : 'text-text-secondary hover:bg-border/40 dark:hover:bg-slate-800/80 hover:text-text-primary'
            }`}
          >
            <Store className="w-5 h-5" />
            <span>Daftar UMKM</span>
          </button>
          
          <button 
            onClick={() => handleTabChange('verifikasi')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left hover-btn ${
              activeTab === 'verifikasi' 
                ? 'bg-status-warning/10 text-status-warning font-semibold' 
                : 'text-text-secondary hover:bg-border/40 dark:hover:bg-slate-800/80 hover:text-text-primary'
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
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left hover-btn ${
              activeTab === 'pencairan' 
                ? 'bg-brand-secondary/20 text-brand-secondary-dark dark:text-brand-secondary font-semibold' 
                : 'text-text-secondary hover:bg-border/40 dark:hover:bg-slate-800/80 hover:text-text-primary'
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
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left hover-btn ${
              activeTab === 'qris' 
                ? 'bg-brand-primary/10 text-brand-primary font-semibold' 
                : 'text-text-secondary hover:bg-border/40 dark:hover:bg-slate-800/80 hover:text-text-primary'
            }`}
          >
            <QrCode className="w-5 h-5" />
            <span>Pengaturan QRIS</span>
          </button>
        </nav>

        <div className="p-4 border-t border-border">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-status-error hover:bg-status-error/10 hover-btn transition-colors"
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
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-border/60 dark:hover:bg-slate-800 transition-colors relative overflow-hidden flex items-center justify-center w-9 h-9 border border-border hover-btn cursor-pointer"
              aria-label="Toggle Dark Mode"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isDarkMode ? (
                  <motion.div
                    key="moon"
                    initial={{ y: -20, opacity: 0, rotate: -90 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    exit={{ y: 20, opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                    className="absolute"
                  >
                    <Moon className="w-4 h-4 text-brand-secondary" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="sun"
                    initial={{ y: 20, opacity: 0, rotate: 90 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    exit={{ y: -20, opacity: 0, rotate: -90 }}
                    transition={{ duration: 0.2 }}
                    className="absolute"
                  >
                    <Sun className="w-4 h-4 text-brand-secondary" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
            <button onClick={() => setIsMobileSidebarOpen(true)} className="p-2 text-text-primary">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1 relative">
          {/* Loading Overlay */}
        {isTransitioning && (
          <div className="absolute inset-0 bg-base/60 backdrop-blur-sm z-50 flex items-center justify-center transition-all duration-300">
            <div className="bg-surface p-4 rounded-full shadow-lg flex items-center justify-center border border-border">
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
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleDarkMode}
                className="p-2 rounded-full hover:bg-border/60 dark:hover:bg-slate-800 transition-colors relative overflow-hidden flex items-center justify-center w-10 h-10 border border-border hover-btn cursor-pointer shadow-sm"
                aria-label="Toggle Dark Mode"
                title={isDarkMode ? "Ganti ke Light Mode" : "Ganti ke Dark Mode"}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isDarkMode ? (
                    <motion.div
                      key="moon"
                      initial={{ y: -30, opacity: 0, rotate: -90 }}
                      animate={{ y: 0, opacity: 1, rotate: 0 }}
                      exit={{ y: 30, opacity: 0, rotate: 90 }}
                      transition={{ duration: 0.3 }}
                      className="absolute"
                    >
                      <Moon className="w-5 h-5 text-brand-secondary" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="sun"
                      initial={{ y: 30, opacity: 0, rotate: 90 }}
                      animate={{ y: 0, opacity: 1, rotate: 0 }}
                      exit={{ y: -30, opacity: 0, rotate: -90 }}
                      transition={{ duration: 0.3 }}
                      className="absolute"
                    >
                      <Sun className="w-5 h-5 text-brand-secondary" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
              <div className="hidden sm:block text-right">
                <p className="text-caption text-text-secondary">Login sebagai</p>
                <p className="font-semibold text-text-primary">{userName}</p>
              </div>
            </div>
          </header>

          {activeTab === 'umkm' && (
            <div className="card p-0 border border-border overflow-hidden">
              <div className="p-6 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-surface/50">
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
                        <tr key={umkm.id} className="border-b border-border hover:bg-surface/80 dark:hover:bg-slate-800/80 transition-colors">
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

              {/* Grafik Aktivitas & Transaksi Terbaru */}
              <div className="card p-6 border border-border">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-border">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <BarChart3 className="w-5 h-5 text-brand-primary" />
                      <h2 className="text-h3 text-text-primary">Aktivitas & Grafik Transaksi</h2>
                      <span className="flex items-center gap-1.5 text-xs text-status-success font-semibold px-2.5 py-0.5 bg-status-success/10 rounded-full border border-status-success/20 ml-1">
                        <span className="w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
                        Real-time Live
                      </span>
                    </div>
                    <p className="text-body-small text-text-secondary">
                      Statistik volume transaksi dan aktivitas platform terfilter secara otomatis.
                    </p>
                  </div>

                  {/* Filter Dropdowns */}
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-1.5 bg-base px-3 py-2 rounded-xl border border-border">
                      <Filter className="w-4 h-4 text-brand-primary" />
                      <select 
                        value={selectedMonth} 
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-transparent text-text-primary text-sm font-semibold outline-none cursor-pointer"
                      >
                        <option value="all">Semua Bulan (1 Tahun)</option>
                        <option value="1">Januari</option>
                        <option value="2">Februari</option>
                        <option value="3">Maret</option>
                        <option value="4">April</option>
                        <option value="5">Mei</option>
                        <option value="6">Juni</option>
                        <option value="7">Juli</option>
                        <option value="8">Agustus</option>
                        <option value="9">September</option>
                        <option value="10">Oktober</option>
                        <option value="11">November</option>
                        <option value="12">Desember</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 bg-base px-3 py-2 rounded-xl border border-border">
                      <Calendar className="w-4 h-4 text-brand-secondary-dark dark:text-brand-secondary" />
                      <select 
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="bg-transparent text-text-primary text-sm font-semibold outline-none cursor-pointer"
                      >
                        <option value="2026">Tahun 2026</option>
                        <option value="2025">Tahun 2025</option>
                        <option value="2024">Tahun 2024</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Metric Summaries for the selected filter */}
                {(() => {
                  const chartData = getChartData();
                  const totalCount = chartData.reduce((acc, curr) => acc + curr.count, 0);
                  const totalAmount = chartData.reduce((acc, curr) => acc + curr.amount, 0);
                  const maxCount = Math.max(...chartData.map(d => d.count), 1);

                  const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
                  const filterLabel = selectedMonth === 'all' 
                    ? `Tahun ${selectedYear}` 
                    : `${monthNames[parseInt(selectedMonth)-1]} ${selectedYear}`;

                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-base p-4 rounded-xl border border-border flex items-center justify-between">
                          <div>
                            <p className="text-caption text-text-secondary">Total Transaksi ({filterLabel})</p>
                            <p className="text-h2 font-bold text-brand-primary">{totalCount} <span className="text-sm font-normal text-text-secondary">Order</span></p>
                          </div>
                          <TrendingUp className="w-8 h-8 text-brand-primary/40" />
                        </div>
                        <div className="bg-base p-4 rounded-xl border border-border flex items-center justify-between">
                          <div>
                            <p className="text-caption text-text-secondary">Estimasi Perputaran Dana</p>
                            <p className="text-h2 font-bold text-status-success">Rp {totalAmount.toLocaleString('id-ID')}</p>
                          </div>
                          <CreditCard className="w-8 h-8 text-status-success/40" />
                        </div>
                        <div className="bg-base p-4 rounded-xl border border-border flex items-center justify-between">
                          <div>
                            <p className="text-caption text-text-secondary">Filter Aktif Terpilih</p>
                            <p className="text-body-base font-bold text-text-primary">{filterLabel}</p>
                          </div>
                          <Filter className="w-8 h-8 text-brand-secondary/40" />
                        </div>
                      </div>

                      {/* Bar Chart Visual Graphics */}
                      <div className="relative pt-8 pb-3 px-3 bg-base/60 rounded-2xl border border-border/80">
                        {/* Background Grid Lines */}
                        <div className="absolute inset-x-4 top-10 bottom-12 flex flex-col justify-between pointer-events-none opacity-20">
                          <div className="border-b border-dashed border-text-secondary w-full"></div>
                          <div className="border-b border-dashed border-text-secondary w-full"></div>
                          <div className="border-b border-dashed border-text-secondary w-full"></div>
                          <div className="border-b border-dashed border-text-secondary w-full"></div>
                        </div>

                        {/* Bars Container */}
                        <div className="relative z-10 flex items-end justify-between gap-2 sm:gap-4 h-64 pt-8 px-2">
                          {chartData.map((item, index) => {
                            const barHeightPercent = item.count === 0 ? 4 : Math.max((item.count / maxCount) * 100, 15);
                            const isHovered = hoveredBarIndex === index;
                            const hasOrders = item.count > 0;

                            return (
                              <div 
                                key={index} 
                                className="flex-1 flex flex-col items-center h-full justify-end group relative"
                                onMouseEnter={() => setHoveredBarIndex(index)}
                                onMouseLeave={() => setHoveredBarIndex(null)}
                              >
                                {/* Tooltip on Hover */}
                                {isHovered && (
                                  <div className="absolute -top-14 z-30 bg-slate-900 text-white text-xs py-2 px-3.5 rounded-xl shadow-2xl font-medium whitespace-nowrap border border-slate-700 animate-in fade-in zoom-in-95">
                                    <div className="font-bold text-brand-secondary text-sm">{item.label}</div>
                                    <div className="text-slate-300">{item.count} Transaksi (Rp {item.amount.toLocaleString('id-ID')})</div>
                                  </div>
                                )}

                                {/* Bar Element */}
                                <div className="w-full flex items-end justify-center h-full pt-6">
                                  <div 
                                    className={`w-full max-w-[44px] rounded-t-xl transition-all duration-300 relative cursor-pointer ${
                                      isHovered 
                                        ? 'bg-gradient-to-t from-brand-primary via-brand-primary to-brand-secondary shadow-lg shadow-brand-primary/40 scale-105 ring-2 ring-brand-primary/40' 
                                        : hasOrders
                                        ? 'bg-gradient-to-t from-brand-primary/80 to-brand-primary shadow-sm'
                                        : 'bg-border/60 dark:bg-slate-700/50 hover:bg-border'
                                    }`}
                                    style={{ height: `${barHeightPercent}%` }}
                                  >
                                    {/* Value label on top of bar */}
                                    <div className={`absolute -top-6 inset-x-0 text-center text-xs font-bold transition-colors ${
                                      isHovered ? 'text-brand-primary scale-110' : hasOrders ? 'text-text-primary font-bold' : 'text-text-secondary/60 font-normal'
                                    }`}>
                                      {item.count}
                                    </div>
                                  </div>
                                </div>

                                {/* X-axis Label */}
                                <span className={`text-xs mt-3 font-medium transition-colors truncate max-w-full ${
                                  isHovered ? 'text-brand-primary font-bold' : 'text-text-secondary'
                                }`}>
                                  {item.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {activeTab === 'qris' && (
            <div className="card p-0 border border-border overflow-hidden max-w-2xl mx-auto">
              <div className="p-6 border-b border-border bg-surface/50">
                <h2 className="text-h3 mb-1">Pengaturan QRIS Admin</h2>
                <p className="text-body-small text-text-secondary">Foto barcode QRIS ini akan ditampilkan kepada pembeli pada saat *checkout* pembayaran.</p>
              </div>
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-64 h-64 border-4 border-border rounded-3xl overflow-hidden mb-6 relative shadow-inner bg-base flex items-center justify-center">
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
              <div className="p-6 border-b border-border flex justify-between items-center bg-surface/50">
                <h2 className="text-h3">Status Pembayaran Masuk</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface text-caption text-text-secondary border-b border-border">
                      <th className="p-4 font-medium">Order ID</th>
                      <th className="p-4 font-medium">Total Bayar</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Waktu Pemesanan</th>
                    </tr>
                  </thead>
                  <tbody className="text-body-small">
                    {liveOrders.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-text-secondary">Tidak ada data transaksi saat ini.</td>
                      </tr>
                    ) : (
                      liveOrders.map((order) => (
                        <tr key={order.id} className="border-b border-border hover:bg-surface/80 dark:hover:bg-slate-800/80 transition-colors">
                          <td className="p-4 font-mono font-medium">{order.id}</td>
                          <td className="p-4 font-semibold text-brand-primary">Rp {(order.totalPrice || 0).toLocaleString('id-ID')}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              order.status === 'verified' || order.status === 'completed' 
                                ? 'bg-status-success/10 text-status-success' 
                                : order.status === 'waiting_verification'
                                ? 'bg-status-warning/10 text-status-warning'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {order.status === 'verified' ? 'Dibayar' : 
                               order.status === 'completed' ? 'Selesai' :
                               order.status === 'waiting_verification' ? 'Pending' : 'Batal'}
                            </span>
                          </td>
                          <td className="p-4 text-text-secondary">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
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
              <div className="p-6 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-surface/50">
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
                        <tr key={payout.id} className="border-b border-border hover:bg-surface/80 dark:hover:bg-slate-800/80 transition-colors">
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
