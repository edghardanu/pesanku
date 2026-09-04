'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/lib/cart';
import { ShoppingBag, X, Minus, Plus, Edit2, ArrowRight, Save, Store, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';

export default function CartSidebar() {
    const { items, totalItems, totalPrice, updateQty, removeItem, clear, setItems } = useCart();
    const [isOpen, setIsOpen] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
    const [editingId, setEditingId] = useState<string | null>(null);
    const [fees, setFees] = useState({ feeAplikasi: 0, feeJasa: 0, feeAdmin: 0 });

    React.useEffect(() => {
        if (isOpen) {
            fetch('/api/settings')
                .then(res => res.json())
                .then(data => {
                    setFees({
                        feeAplikasi: data.fee_aplikasi || 0,
                        feeJasa: data.fee_jasa || 0,
                        feeAdmin: data.fee_admin || 0
                    });
                })
                .catch(err => console.error("Failed to load fees:", err));

            // Sync cart items with the latest database details
            if (items.length > 0) {
                Promise.all(items.map(async (item) => {
                    try {
                        const res = await fetch(`/api/products/${item.productId}`);
                        if (res.ok) {
                            const { product } = await res.json();
                            if (product) {
                                const realMinQty = product.minOrderQty || product.minQty || 1;
                                return { ...item, minQty: realMinQty, price: product.price };
                            }
                        }
                    } catch (e) { }
                    return item;
                })).then((updatedItems) => {
                    const hasChanges = updatedItems.some((u, i) => u.minQty !== items[i].minQty || u.price !== items[i].price);
                    if (hasChanges) {
                        setItems(updatedItems.map(u => ({ ...u, qty: Math.max(u.qty, u.minQty || 1) })));
                    }
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const router = useRouter();

    const handleCheckout = async () => {
        if (items.length === 0) return;

        // Konfirmasi dulu ke pembeli
        const confirm = await Swal.fire({
            icon: 'info',
            title: 'Ajukan Penawaran',
            html: `
                <div class="text-left mt-2 mb-4">
                    <p class="text-xs text-gray-500 mb-3 leading-relaxed">Pesanan Anda akan diteruskan sebagai <strong>Surat Penawaran</strong> kepada penjual. Penjual akan meninjau jadwal dan kuota sebelum disetujui untuk dibayar.</p>
                    <label class="block text-xs font-bold text-gray-700 mb-1">Pilih Rencana Tanggal Pengiriman <span class="text-red-500">*</span></label>
                    <input type="date" id="cart-offer-date" class="w-full text-sm p-2.5 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:border-brand-primary" required min="${new Date().toISOString().split('T')[0]}" />
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '📨 Kirim Penawaran',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#800000',
            cancelButtonColor: '#94a3b8',
            preConfirm: () => {
                const dateVal = (document.getElementById('cart-offer-date') as HTMLInputElement)?.value;
                if (!dateVal) {
                    Swal.showValidationMessage('Silakan pilih rencana tanggal pengiriman terlebih dahulu!');
                    return false;
                }
                const parts = dateVal.split('-');
                return `${parts[2]}/${parts[1]}/${parts[0]}`; // Convert to DD/MM/YYYY
            }
        });

        if (!confirm.isConfirmed) return;
        const offerDate = confirm.value; // The DD/MM/YYYY string

        try {
            setIsCheckingOut(true);
            let firstOrderId: string | null = null;

            // Kirim setiap item keranjang sebagai penawaran ke penjual via presales chat
            for (const item of items) {
                const noteKey = `${item.productId}-${item.selectedVariant || ''}`;
                const notes = notesDraft[noteKey] !== undefined ? notesDraft[noteKey] : (item.notes || '');
                const qty = Math.max(item.qty, item.minQty || 1);
                const totalHarga = (item.price * qty).toLocaleString('id-ID'); // Numeric value * qty formatted

                const offerText = `Halo kak! Berikut adalah surat rincian penawaran pesanan yang ingin saya ajukan. Mohon sekiranya dapat dicek dan dipertimbangkan:\n\n[SURAT_PENAWARAN|${qty}|${item.price}|${offerDate}]`;

                const res = await fetch('/api/chat/presales', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        productId: item.productId,
                        text: offerText,
                        productOffer: null, // Tidak usah pakai PRODUK_OFFER fallback ganda, karena SURAT_PENAWARAN sudah keren!
                        qty: qty,
                        totalPrice: item.price * qty,
                        notes: notes,
                        variant: item.selectedVariant || null,
                        variantPrice: 0
                    })
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || `Gagal mengirim penawaran untuk ${item.name}`);
                }
                if (!firstOrderId) firstOrderId = data.orderId;
            }

            clear();
            setIsOpen(false);

            await Swal.fire({
                icon: 'success',
                title: 'Penawaran Terkirim! 🎉',
                html: `<p class="text-sm text-gray-600">Penawaran Anda telah dikirim ke penjual. Silakan pantau konfirmasi dari penjual di halaman <strong>Pesanan Saya</strong>.</p>`,
                confirmButtonColor: '#800000',
                confirmButtonText: 'Lihat Chat Pesanan',
            });

            // Redirect ke halaman pesanan, fokus ke chat pertama jika ada
            if (firstOrderId) {
                router.push(`/buyer/orders?openChat=${firstOrderId}`);
            } else {
                router.push('/buyer/orders');
            }

        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: error.message || 'Terjadi kesalahan saat mengirim penawaran',
                confirmButtonColor: '#ff5c35'
            });
        } finally {
            setIsCheckingOut(false);
        }
    };


    return (
        <>
            {/* Floating Action Button */}
            <AnimatePresence>
                {!isOpen && totalItems > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 50 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className="fixed bottom-6 right-6 z-50"
                    >
                        <button
                            onClick={() => setIsOpen(true)}
                            className="bg-brand-primary hover:bg-brand-primary-hover text-white p-4 rounded-full shadow-2xl shadow-brand-primary/30 flex items-center justify-center relative focus:outline-none focus:ring-4 focus:ring-brand-primary/50 transition-all active:scale-95 group"
                        >
                            <ShoppingBag className="w-6 h-6 stroke-[2.5px]" />
                            <div className="absolute -top-2 -right-2 bg-black text-white text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white">
                                {totalItems}
                            </div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cart Drawer Canvas Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999]"
                        />

                        <motion.div
                            initial={{ x: '100%', opacity: 0.5 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: '100%', opacity: 0.5 }}
                            transition={{ type: 'tween', stiffness: 300, damping: 30, ease: 'easeOut', duration: 0.25 }}
                            className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white border-l border-gray-200 shadow-2xl z-[1000] flex flex-col"
                        >
                            {/* Header */}
                            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white relative z-10">
                                <div>
                                    <h2 className="text-sm font-semibold text-gray-500 tracking-wide uppercase">Pesanan Saat Ini</h2>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Keranjang Belanja</h3>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Items List */}
                            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4 space-y-4 pt-6">
                                {items.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                        <div className="w-24 h-24 bg-brand-primary/10 rounded-full flex items-center justify-center mb-4">
                                            <ShoppingBag className="w-10 h-10 text-brand-primary/60" />
                                        </div>
                                        <p className="text-gray-900 font-semibold text-lg mb-1">Keranjang masih kosong</p>
                                        <p className="text-gray-500 text-sm">Ayo, masukkan menu favoritmu sekarang!</p>
                                    </div>
                                ) : (
                                    items.map((item) => {
                                        const noteKey = `${item.productId}-${item.selectedVariant || ''}`;
                                        const isEditing = editingId === noteKey;

                                        return (
                                            <div key={noteKey} className="bg-white p-4 rounded-[20px] border border-gray-100 shadow-sm relative overflow-hidden group">

                                                <div className="flex gap-4">
                                                    {/* Image */}
                                                    <div className="w-[72px] h-[72px] shrink-0 bg-[#fdf5ed] rounded-2xl p-1 flex items-center justify-center border border-brand-primary/10 overflow-hidden relative">
                                                        {item.imageUrl ? (
                                                            <Image src={item.imageUrl} alt={item.name} fill sizes="100px" className="object-cover rounded-xl" />
                                                        ) : (
                                                            <ShoppingBag className="w-8 h-8 text-brand-primary/40" />
                                                        )}
                                                    </div>

                                                    {/* Details */}
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-gray-900 leading-tight mb-1 truncate text-base">{item.name}</h4>

                                                        <div className="flex items-center gap-1.5 mb-1.5 text-gray-400">
                                                            <Store className="w-3.5 h-3.5" />
                                                            <span className="text-[11px] font-medium truncate">{item.sellerName || 'Toko UMKM'}</span>
                                                        </div>

                                                        {item.selectedVariant && (
                                                            <p className="text-xs text-gray-400 mb-1 leading-snug break-words">
                                                                <span className="font-medium text-gray-500">Varian:</span> {item.selectedVariant}
                                                            </p>
                                                        )}

                                                        {!isEditing && (notesDraft[noteKey] !== undefined ? notesDraft[noteKey] : item.notes) && (
                                                            <p className="text-[11px] text-gray-500 italic mb-1 leading-snug break-words line-clamp-2">
                                                                <span className="font-medium text-gray-400">Catatan:</span> {notesDraft[noteKey] !== undefined ? notesDraft[noteKey] : item.notes}
                                                            </p>
                                                        )}

                                                        {isEditing && (
                                                            <div className="mt-2 mb-2 flex flex-col gap-2 relative">
                                                                <textarea
                                                                    autoFocus
                                                                    value={notesDraft[noteKey] !== undefined ? notesDraft[noteKey] : (item.notes || '')}
                                                                    onChange={(e) => setNotesDraft(prev => ({ ...prev, [noteKey]: e.target.value }))}
                                                                    placeholder="Tambahkan catatan khusus..."
                                                                    className="w-full text-xs p-2.5 bg-gray-50 rounded-xl border-gray-200 border outline-none focus:border-brand-primary transition-colors resize-none"
                                                                    rows={2}
                                                                />
                                                                <button
                                                                    onClick={() => setEditingId(null)}
                                                                    className="self-end bg-brand-primary/10 text-brand-primary px-3 py-1 text-[10px] font-bold rounded-lg hover:bg-brand-primary/20 transition-colors"
                                                                >
                                                                    Tutup
                                                                </button>
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col mt-1.5 mb-2 gap-0.5">
                                                            <p className="font-bold tracking-tight text-gray-900">Rp {(item.price * Math.max(item.qty, item.minQty || 1)).toLocaleString('id-ID')}</p>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[10px] text-gray-500">Rp {item.price.toLocaleString('id-ID')} / porsi</p>
                                                                {(item.minQty || 1) > 1 && (
                                                                    <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase tracking-wider">Min {item.minQty} Porsi</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {/* Actions / Counter */}
                                                        <div className="flex items-center justify-between mt-1">

                                                            <div className="flex items-center bg-gray-50/80 rounded-full border border-gray-100 p-0.5 shadow-sm">
                                                                <button
                                                                    onClick={() => updateQty(item.productId, item.selectedVariant, item.qty - 1)}
                                                                    disabled={item.qty <= (item.minQty || 1)}
                                                                    className="w-8 h-8 flex flex-col items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-white rounded-full transition-all active:scale-95 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                                                                >
                                                                    <Minus className="w-3.5 h-3.5" />
                                                                </button>
                                                                <span className="w-8 text-center text-sm font-bold text-gray-900">
                                                                    {Math.max(item.qty, item.minQty || 1)}
                                                                </span>
                                                                <button
                                                                    onClick={() => updateQty(item.productId, item.selectedVariant, item.qty + 1)}
                                                                    className="w-8 h-8 flex flex-col items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-white rounded-full transition-all active:scale-95"
                                                                >
                                                                    <Plus className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>

                                                            {!isEditing && (
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => setEditingId(noteKey)}
                                                                        className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
                                                                    >
                                                                        <Edit2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => removeItem(item.productId, item.selectedVariant)}
                                                                        className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 border border-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            )}

                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        )
                                    })
                                )}
                            </div>

                            {/* Footer Summary (POS Style) */}
                            <div className="bg-white border-t border-gray-100 px-6 py-6 pb-8 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">

                                <div className="space-y-2.5 mb-6">
                                    <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                                        <span>Subtotal ({totalItems} produk)</span>
                                        <span>Rp {totalPrice.toLocaleString('id-ID')}</span>
                                    </div>

                                    {/* Breakdown of fees */}
                                    <div className="flex justify-between items-center text-xs font-medium text-gray-400">
                                        <span>Biaya Aplikasi</span>
                                        <span>Rp {fees.feeAplikasi.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-medium text-gray-400">
                                        <span>Biaya Jasa</span>
                                        <span>Rp {fees.feeJasa.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-medium text-gray-400">
                                        <span>Biaya Admin</span>
                                        <span>Rp {fees.feeAdmin.toLocaleString('id-ID')}</span>
                                    </div>

                                    <div className="w-full border-b border-dashed border-gray-200 mt-3 pt-2"></div>

                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-base font-bold text-gray-900">Total Pembayaran</span>
                                        <span className="text-xl font-bold text-brand-primary">Rp {(totalPrice + fees.feeAplikasi + fees.feeJasa + fees.feeAdmin).toLocaleString('id-ID')}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleCheckout}
                                    disabled={items.length === 0 || isCheckingOut}
                                    className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white py-4 rounded-[16px] font-bold text-[15px] flex items-center justify-center gap-2 shadow-xl shadow-brand-primary/20 active:scale-[0.98] transition-all disabled:opacity-60 disabled:active:scale-100"
                                >
                                    {isCheckingOut ? (
                                        <span className="flex items-center gap-2">Mengirim Penawaran... <span className="animate-pulse">⏳</span></span>
                                    ) : (
                                        <>📨 Ajukan Penawaran ke Penjual</>
                                    )}
                                </button>
                            </div>

                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
