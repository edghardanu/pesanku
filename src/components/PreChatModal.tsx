"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, MessageCircle, X } from 'lucide-react';
import { useState } from 'react';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import { AuthUser } from '@/types';

type ChatTarget = {
  productId: string;
  productName: string;
  storeName: string;
  sellerId: string;
  sellerAvatarUrl?: string | null;
  price?: number;
  imageUrl?: string;
};

export default function PreChatModal({
  isOpen,
  onClose,
  target,
  user
}: {
  isOpen: boolean;
  onClose: () => void;
  target: ChatTarget | null;
  user: AuthUser | null;
}) {
  const router = useRouter();

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  // Set default selection to tomorrow
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });

  const [isLoading, setIsLoading] = useState(false);

  if (!target) return null;

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  // Calendar logic
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay(); // 0 = Sunday
  // Adjust so Monday is 0, Sunday is 6
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const days = [];
  for (let i = 0; i < startOffset; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
  }

  const handleSend = async () => {
    if (!user) {
      onClose();
      Swal.fire({
        title: 'Login Diperlukan',
        text: 'Silakan masuk ke akun pembeli untuk memulai chat!',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Masuk Sekarang',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#ff5c35',
        customClass: {
          popup: 'rounded-3xl',
          confirmButton: 'rounded-xl font-bold px-6 py-2.5 bg-brand-primary text-white shadow-lg shadow-brand-primary/20',
          cancelButton: 'rounded-xl font-bold px-6 py-2.5 bg-gray-100 text-gray-700'
        },
        buttonsStyling: false
      }).then((lr) => {
        if (lr.isConfirmed) router.push('/login');
      });
      return;
    }

    const dateStr = `${selectedDate.getDate().toString().padStart(2, '0')}/${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}/${selectedDate.getFullYear()}`;
    const message = `Halo! Saya tertarik dengan produk ${target.productName}. Saya rencananya ingin melakukan preorder untuk dikirim pada tanggal ${dateStr}. Apakah bisa diproses?`;

    setIsLoading(true);
    const payload: any = { productId: target.productId, text: message };
    if (target.price !== undefined) {
      payload.productOffer = {
        id: target.productId,
        name: target.productName,
        price: target.price,
        image: target.imageUrl || ''
      };
    }

    try {
      const res = await fetch('/api/chat/presales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      setIsLoading(false);

      if (data.error) {
        Swal.fire('Gagal Mengirim', data.error, 'error');
        return;
      }

      onClose();

      const chatUrl = `/buyer/orders?openChat=${data.orderId}&productName=${encodeURIComponent(target.productName)}&storeName=${encodeURIComponent(target.storeName)}&sellerId=${encodeURIComponent(target.sellerId)}`;

      Swal.fire({
        icon: 'success',
        title: 'Terkirim!',
        text: 'Mengantarkan Anda ke obrolan...',
        showConfirmButton: false,
        timer: 1500,
        customClass: { popup: 'rounded-3xl' }
      }).then(() => {
        router.push(chatUrl);
      });
    } catch (e) {
      setIsLoading(false);
      Swal.fire('Gagal', 'Terjadi kesalahan jaringan.', 'error');
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="relative w-full max-w-[340px] bg-white/90 backdrop-blur-3xl rounded-[32px] p-6 shadow-2xl border border-white/50"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="w-6" /> {/* Spacer for centering */}
              <h2 className="text-lg font-extrabold text-gray-900 tracking-tight text-center flex-1">Pilih Tanggal Pemesanan</h2>
              <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Calendar Widget */}
            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-4 mb-6">
              {/* Month Selector */}
              <div className="flex justify-between items-center mb-4 px-2">
                <span className="font-bold text-[15px] text-gray-800">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <div className="flex gap-1">
                  <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Days Header */}
              <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => (
                  <div key={day} className="text-[10px] font-bold text-gray-400">{day}</div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                {days.map((date, idx) => {
                  if (!date) return <div key={`empty-${idx}`} />;

                  const isSelected = date.getTime() === selectedDate.getTime();
                  const isToday = date.getTime() === today.getTime();
                  const isPast = date.getTime() < today.getTime();

                  return (
                    <button
                      key={date.toISOString()}
                      disabled={isPast}
                      onClick={() => setSelectedDate(date)}
                      className={`relative h-8 w-full rounded-full flex items-center justify-center text-[13px] font-medium transition-all ${isSelected
                        ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/30 font-bold'
                        : isPast
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-brand-primary/10 hover:text-brand-primary'
                        }`}
                    >
                      {date.getDate()}
                      {isToday && !isSelected && (
                        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-brand-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-[#b20000] text-white py-3.5 rounded-full text-[14px] font-bold shadow-lg shadow-[#b20000]/30 hover:bg-[#800000] hover:-translate-y-0.5 active:translate-y-0 transition-all outline-none"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4" />
                    Mulai Chat Penjual
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="w-full py-2 text-[13px] font-medium text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-none outline-none"
              >
                Batal
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
