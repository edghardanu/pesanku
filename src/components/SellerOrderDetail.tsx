"use client";
import { motion, AnimatePresence } from "framer-motion";

import React, { useState } from "react";
import { ArrowLeft, FileText, ChevronDown } from "lucide-react";
import { OrderItem, AuthUser } from "@/types";
import { formatOrderDateTimeWIB } from "@/lib/promotionFormatting";
import ChatInterface from "@/components/ChatInterface";
import Swal from "sweetalert2";

interface SellerOrderDetailProps {
    order: OrderItem;
    user?: AuthUser | null;
    onBack: () => void;
    onUpdateStatus: (newStatus: string) => void;
    onUploadDispatch: (orderId: string, currentStatus: string) => void;
    onUploadDelivery: (orderId: string) => void;
    checkoutFees?: any[];
    penaltyPercentage?: number;
    penaltyDays?: number;
    penaltySellerToAdmin?: number;
    penaltySellerToBuyer?: number;
    allBuyerOrders?: OrderItem[];
}

export default function SellerOrderDetail({ order, allBuyerOrders, user, onBack, onUpdateStatus, onUploadDispatch, onUploadDelivery, checkoutFees = [], penaltyPercentage = 0, penaltyDays = 1, penaltySellerToAdmin = 0, penaltySellerToBuyer = 0 }: SellerOrderDetailProps) {
    const isCompleted = order.status === 'completed';
    const isCancelled = order.status === 'cancelled';
    const isProcessing = order.status === 'processing';
    const isPreorderRunning = order.status === 'preorder_running';
    const isVerified = order.status === 'verified';
    const isWaitingPayment = order.status === 'waiting_verification';
    const isChatOnly = order.status === 'chat_only';

    const [activeDetailTab, setActiveDetailTab] = useState<'rincian' | 'info'>('rincian');
    const [isInvoiceOpen, setIsInvoiceOpen] = useState(true);

    const getOrderTimestamp = (dateVal: any) => {
      if (!dateVal) return 0;
      if (typeof dateVal === 'number') return dateVal > 1e11 ? dateVal : dateVal * 1000;
      const t = new Date(dateVal).getTime();
      return isNaN(t) ? 0 : t;
    };

    const orderTime = getOrderTimestamp(order.createdAt);

    const relatedOrders = (allBuyerOrders || [order]).filter((o: any) => {
      if (o.buyerId !== order.buyerId) return false;
      
      // If both have paymentId and they match
      if ((order as any).paymentId && o.paymentId) {
        return (order as any).paymentId === o.paymentId;
      }

      // If both are in active (non-finalized) status, group if within 10 minutes of each other
      const isActiveStatus = (s: string) => s !== 'cancelled' && s !== 'failed' && s !== 'completed';
      if (isActiveStatus(order.status || '') && isActiveStatus(o.status || '')) {
        const oTime = getOrderTimestamp(o.createdAt);
        return Math.abs(orderTime - oTime) < 10 * 60 * 1000;
      }

      return o.id === order.id;
    });

    const effectiveTotalPrice = relatedOrders.reduce((sum: number, o: any) => {
        const eq = Math.max(o.qty, o.minOrderQty || 1);
        const up = o.qty > 0 ? o.totalPrice / o.qty : 0;
        return sum + (up * eq);
    }, 0);

    const totalFees = checkoutFees.reduce((sum, fee) => sum + (parseInt(fee.value) || 0), 0);
    const displayedTotalPrice = effectiveTotalPrice - totalFees;

    return (
        <div className="flex flex-col min-h-screen bg-[#F0F4F8] w-full overflow-x-hidden">
            {/* Header Control Panel */}
            <div className="bg-white border-b border-gray-300 shadow-sm sticky top-0 z-20">
                {/* Action Bar */}
                <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-gray-200 gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <button
                            onClick={onBack}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors shrink-0"
                            title="Kembali ke Daftar Pesanan"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => window.open(`/invoice/${order.id}?role=seller&ids=${relatedOrders.map((o: any) => o.id).join(',')}`, '_blank')} className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold hover:bg-gray-50 shadow-sm transition-colors flex items-center gap-1.5">
                                <FileText className="w-4 h-4 text-brand-primary" /> CETAK INVOICE
                            </button>
                        </div>
                    </div>
                </div>

                {/* Status Stepper Header */}
                <div className="px-3 sm:px-4 py-2.5 flex flex-col gap-2 bg-white shadow-[0_4px_10px_-10px_rgba(0,0,0,0.1)] min-w-0 w-full">
                    <div className="w-full min-w-0">
                        <h1 className="text-xs sm:text-base md:text-xl font-black text-gray-800 tracking-tight break-all sm:break-normal leading-snug" title={order.id}>
                            {order.id} {relatedOrders.length > 1 ? `(+${relatedOrders.length - 1} lainnya)` : ''}
                        </h1>
                    </div>
                    <div className="w-full overflow-x-auto pb-1.5 pt-0.5 touch-pan-x [scrollbar-width:thin]">
                        <div className="flex bg-gray-100 rounded-lg overflow-hidden text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border border-gray-200 w-max shrink-0">
                            <div className={`px-2.5 sm:px-3 py-1.5 border-r border-gray-200 whitespace-nowrap ${isChatOnly ? 'bg-brand-primary text-white' : (isWaitingPayment || isVerified || isPreorderRunning || isProcessing || isCompleted) ? 'bg-white text-brand-primary' : 'text-gray-400'}`}>
                                Penawaran
                            </div>
                            <div className={`px-2.5 sm:px-3 py-1.5 border-r border-gray-200 whitespace-nowrap ${isWaitingPayment ? 'bg-brand-primary text-white' : (isVerified || isPreorderRunning || isProcessing || isCompleted) ? 'bg-white text-brand-primary' : 'text-gray-400'}`}>
                                Menunggu Pembayaran
                            </div>
                            <div className={`px-2.5 sm:px-3 py-1.5 border-r border-gray-200 whitespace-nowrap ${(isVerified || isPreorderRunning) ? 'bg-[#1e40af] text-white' : (isProcessing || isCompleted) ? 'bg-white text-[#1e40af]' : 'text-gray-400'}`}>
                                Diproses
                            </div>
                            <div className={`px-2.5 sm:px-3 py-1.5 border-r border-gray-200 whitespace-nowrap ${isProcessing ? 'bg-indigo-500 text-white' : isCompleted ? 'bg-white text-indigo-500' : 'text-gray-400'}`}>
                                Dikirim
                            </div>
                            <div className={`px-2.5 sm:px-3 py-1.5 whitespace-nowrap ${isCompleted ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}>
                                Selesai
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col min-[1500px]:flex-row flex-1 overflow-visible min-[1500px]:overflow-hidden p-3 sm:p-4 md:p-6 gap-4 md:gap-6 w-full max-w-[1600px] mx-auto">
                {/* Left Side: Invoice Form */}
                <div className="flex-1 min-w-0 w-full bg-white border border-gray-300 rounded shadow-sm overflow-hidden flex flex-col min-[1500px]:overflow-y-auto min-[1500px]:h-[calc(100vh-140px)]">
                    {/* Accordion Toggle Header */}
                    <button
                        onClick={() => setIsInvoiceOpen(!isInvoiceOpen)}
                        className="w-full flex items-center justify-between px-4 sm:px-6 py-4 bg-gray-50 hover:bg-gray-100 border-b border-gray-200 transition-colors focus:outline-none shrink-0 sticky top-0 z-10"
                    >
                        <div className="flex items-center gap-2 min-w-0 mr-2">
                            <FileText className="w-5 h-5 text-brand-primary shrink-0" />
                            <span className="font-bold text-gray-800 text-[14px] sm:text-[15px] truncate">Informasi Invoice & Rincian Pesanan</span>
                        </div>
                        <motion.div
                            animate={{ rotate: isInvoiceOpen ? 180 : 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <ChevronDown className="w-5 h-5 text-gray-500 shrink-0" />
                        </motion.div>
                    </button>

                    <AnimatePresence>
                        {isInvoiceOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="overflow-hidden flex flex-col shrink-0"
                            >
                                {/* Form Header Info Grid */}
                                <div className="p-4 sm:p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                    {/* Pembeli */}
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-baseline gap-1 text-[13px] text-gray-900 mt-2">
                                            <span className="text-gray-500 font-medium shrink-0">Pembeli:</span>
                                            <span className="font-semibold break-words min-w-0">{order.buyerName || "–"}</span>
                                        </div>
                                    </div>

                                    {/* Kontak */}
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-baseline gap-1 text-[13px] text-gray-900 mt-2">
                                            <span className="text-gray-500 font-medium shrink-0">Kontak:</span>
                                            <span className="font-semibold break-words min-w-0">{order.buyerPhone || "–"}</span>
                                        </div>
                                    </div>

                                    {/* Alamat Pengiriman */}
                                    <div>
                                        <label className="text-[12px] font-bold text-gray-800 block mb-2">Alamat Pengiriman</label>
                                        <div className="text-[13px] text-brand-primary font-semibold leading-relaxed">{order.buyerAddress || "–"}</div>
                                    </div>

                                    {/* Tanggal Pemesanan */}
                                    <div>
                                        <label className="text-[12px] font-bold text-gray-800 block mb-2">Tanggal Pemesanan</label>
                                        <div className="text-[13px] text-gray-900">{order.createdAt ? formatOrderDateTimeWIB(order.createdAt) : "–"}</div>
                                    </div>

                                    {/* Jadwal Pengiriman */}
                                    <div>
                                        <label className="text-[12px] font-bold text-gray-800 block mb-2">Jadwal Pengiriman</label>
                                        <div className="text-[13px] text-gray-600 leading-relaxed font-medium">
                                            {order.deliveryDate ? (
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-brand-primary">
                                                        {new Date(order.deliveryDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                    {order.trackingNumber && (
                                                        <span className="text-[12px] font-bold text-gray-800 mt-1">
                                                            No Resi: <span className="text-brand-primary">{order.trackingNumber}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            ) : order.trackingNumber ? (
                                                <span className="text-[12px] font-bold text-gray-800 block">
                                                    No Resi: <span className="text-brand-primary">{order.trackingNumber}</span>
                                                </span>
                                            ) : (
                                                <span className="italic text-brand-primary">Belum dijadwalkan / Informasi resi akan Anda update.</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Dokumen & Bukti */}
                                    <div>
                                        <label className="text-[12px] font-bold text-gray-800 block mb-2">Dokumen & Bukti</label>
                                        <div className="flex flex-col gap-1.5 w-full">
                                            {(() => {
                                                if (!order.proofUrl) {
                                                    return <span className="text-[11px] w-full max-w-[160px] text-center px-2 py-1 rounded bg-gray-100 text-gray-500 border border-transparent">Pembayaran: Belum ada</span>;
                                                }
                                                const proofStr = String(order.proofUrl);
                                                if (proofStr.startsWith('ipaymu:') || proofStr.startsWith('flip:')) {
                                                    return <span className="text-[11px] w-full max-w-[160px] text-center px-2 py-1 rounded bg-green-100 text-green-700 font-bold border border-green-200">Lunas (Gateway)</span>;
                                                }
                                                return <a href={proofStr} target="_blank" className="text-[11px] w-full max-w-[160px] text-center px-2 py-1 rounded bg-brand-primary/10 text-brand-primary font-semibold border-brand-primary/20 border transition-colors hover:bg-brand-primary hover:text-white">Bukti Bayar: Lihat</a>;
                                            })()}
                                            {order.dispatchReceiptUrl ? (
                                                <a href={order.dispatchReceiptUrl as string} target="_blank" className="text-[11px] w-full max-w-[160px] text-center px-2 py-1 rounded bg-amber-100 text-amber-700 font-semibold border-amber-200 border transition-colors hover:bg-amber-500 hover:text-white">Bukti Kirim: Lihat</a>
                                            ) : (
                                                <button onClick={() => onUploadDispatch(order.id, order.status || 'verified')} className="text-[11px] w-full max-w-[160px] text-center px-2 py-1 rounded border border-dashed border-gray-400 text-gray-600 hover:text-brand-primary hover:border-brand-primary transition-colors cursor-pointer">Bukti Kirim: Upload</button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className="px-4 sm:px-6 w-full border-t border-gray-100">
                                    <div className="border-b border-gray-200 overflow-x-auto">
                                        <ul className="flex min-w-max">
                                            <li onClick={() => setActiveDetailTab('rincian')} className={`px-4 py-2 border-b-2 text-sm tracking-wide cursor-pointer ${activeDetailTab === 'rincian' ? 'border-brand-primary text-brand-primary font-bold' : 'border-transparent text-gray-500 font-medium hover:text-gray-800'}`}>
                                                Rincian Pesanan
                                            </li>
                                            <li onClick={() => setActiveDetailTab('info')} className={`px-4 py-2 border-b-2 text-sm tracking-wide cursor-pointer ${activeDetailTab === 'info' ? 'border-brand-primary text-brand-primary font-bold' : 'border-transparent text-gray-500 font-medium hover:text-gray-800'}`}>
                                                Informasi Tambahan
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                {activeDetailTab === 'rincian' ? (
                                    <div className="p-4 sm:p-6">
                                        {/* Mobile Card View */}
                                        <div className="flex flex-col gap-3 md:hidden">
                                            {relatedOrders.map((o: any) => {
                                                const eq = Math.max(o.qty, o.minOrderQty || 1);
                                                const up = o.qty > 0 ? o.totalPrice / o.qty : 0;
                                                const total = up * eq;
                                                return (
                                                    <div key={o.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex flex-col gap-2">
                                                        <span className="font-bold text-brand-primary text-sm">{o.productName}</span>
                                                        {o.notes && <p className="text-[12px] text-gray-500 italic">{o.notes}</p>}
                                                        {o.selectedVariant && <span className="text-[12px] text-gray-700 font-medium">Varian: {o.selectedVariant}</span>}
                                                        <div className="flex justify-between items-center pt-2 border-t border-gray-200 text-[13px]">
                                                            <span className="text-gray-600">{eq} porsi × Rp {up.toLocaleString('id-ID')}</span>
                                                            <span className="font-bold text-gray-800">Rp {total.toLocaleString('id-ID')}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Desktop Table View */}
                                        <div className="hidden md:block overflow-x-auto w-full">
                                            <table className="w-full text-left text-[13px] min-w-full">
                                                <thead>
                                                    <tr className="border-b border-gray-300 text-gray-600 font-bold bg-[#f8f9fa]">
                                                        <th className="px-4 py-2.5">Produk</th>
                                                        <th className="px-4 py-2.5">Catatan</th>
                                                        <th className="px-4 py-2.5">Varian</th>
                                                        <th className="px-4 py-2.5 text-right">Jumlah</th>
                                                        <th className="px-4 py-2.5 text-right">Harga Satuan</th>
                                                        <th className="px-4 py-2.5 text-right">Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {relatedOrders.map((o: any) => {
                                                        const eq = Math.max(o.qty, o.minOrderQty || 1);
                                                        const up = o.qty > 0 ? o.totalPrice / o.qty : 0;
                                                        const total = up * eq;
                                                        return (
                                                            <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50 align-top">
                                                                <td className="px-4 py-3 font-semibold text-brand-primary">{o.productName}</td>
                                                                <td className="px-4 py-3 text-gray-600 italic max-w-[200px] break-words">{o.notes || "Tidak ada catatan."}</td>
                                                                <td className="px-4 py-3 font-medium text-gray-700">
                                                                    {o.selectedVariant ? (
                                                                        <div className="flex flex-col">
                                                                            <span>{o.selectedVariant}</span>
                                                                            {o.selectedVariantPrice ? <span className="text-[11px] text-gray-500 font-semibold">+ Rp {o.selectedVariantPrice.toLocaleString('id-ID')}</span> : null}
                                                                        </div>
                                                                    ) : <span className="text-gray-400 italic font-normal">–</span>}
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-medium">{eq} porsi</td>
                                                                <td className="px-4 py-3 text-right">Rp {up.toLocaleString('id-ID')}</td>
                                                                <td className="px-4 py-3 text-right font-bold text-gray-800">Rp {total.toLocaleString('id-ID')}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Totals */}
                                        <div className="flex justify-end mt-4 bg-gray-50 rounded-xl p-4">
                                            <div className="w-full max-w-[320px]">
                                                <div className="flex items-center justify-between py-1.5 text-sm gap-2">
                                                    <div className="flex items-center gap-2">
                                                        {relatedOrders.some((o: any) => o.isResponded === true) && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded border-2 border-dashed border-emerald-500 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase tracking-wider -rotate-2 select-none shadow-sm">
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                                Sudah Direspon
                                                            </span>
                                                        )}
                                                        <span className="text-gray-600 font-bold">Subtotal Produk:</span>
                                                    </div>
                                                    <span className="font-semibold text-gray-800">Rp {effectiveTotalPrice.toLocaleString('id-ID')}</span>
                                                </div>
                                                <div className="flex flex-col gap-1 pb-1.5 text-[11px] text-gray-500 pl-4 border-l-2 border-brand-primary/20 ml-2 mb-2">
                                                    {checkoutFees.map((fee, idx) => (<div key={idx} className="flex justify-between"><span>{fee.name}:</span><span className="text-red-500 font-medium">- Rp {(parseInt(fee.value) || 0).toLocaleString('id-ID')}</span></div>))}
                                                </div>
                                                <div className="flex justify-between py-3 border-t border-gray-300 mt-2 text-xl">
                                                    <span className="font-black text-gray-800">Total Pendapatan:</span>
                                                    <span className="font-black text-brand-primary">Rp {displayedTotalPrice.toLocaleString('id-ID')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-6 text-[13px] text-gray-700">
                                        <h3 className="font-bold text-gray-800 mb-3 text-sm">Peraturan Preorder & Pembatalan</h3>
                                        <div className="space-y-4">
                                            <p>Pesanan ini tunduk pada pedoman dan peraturan Preorder standar aplikasi. Pembeli dan penjual setuju untuk berkomunikasi melalui fitur chat terkait jadwal pengiriman, spesifikasi, dan ketersediaan barang.</p>
                                            <div className="bg-orange-50 border border-orange-200 p-4 rounded-md">
                                                <h4 className="font-bold text-orange-800 mb-2">Kebijakan Denda Pembatalan</h4>
                                                <ul className="list-disc pl-5 space-y-2 text-orange-900/80">
                                                    <li>Apabila pembeli membatalkan pesanan pada periode H-{penaltyDays} sebelum deadline pengiriman, maka sistem otomatis membebankan denda pembatalan.</li>
                                                    <li><strong>Nominal Denda (Pembeli Batal):</strong> Ditetapkan sebesar <strong>{penaltyPercentage}%</strong> dari Subtotal Produk (setara dengan <strong>Rp {((penaltyPercentage / 100) * effectiveTotalPrice).toLocaleString('id-ID')}</strong>).</li>
                                                    <li>Dana pengembalian setelah dikurangi denda akan diproses ke rekening pembeli.</li>
                                                    <hr className="my-2 border-orange-200" />
                                                    <li>Apabila <strong>penjual</strong> melakukan pembatalan pesanan sepihak pada H-{penaltyDays}, maka penjual akan dikenakan pinalti.</li>
                                                    <li><strong>Potongan Saldo Penjual:</strong> Total <strong>{penaltySellerToAdmin + penaltySellerToBuyer}%</strong> (<strong>{penaltySellerToAdmin}%</strong> kepada Admin dan <strong>{penaltySellerToBuyer}%</strong> kompensasi ke Pembeli).</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right Side: Chatter */}
                <div className="w-full min-[1500px]:w-[380px] 2xl:w-[420px] bg-white border border-gray-300 rounded shadow-sm flex flex-col shrink-0 mt-4 min-[1500px]:mt-0 min-[1500px]:h-[calc(100vh-140px)] static overflow-hidden">
                    <ChatInterface
                        mode="seller"
                        user={user || null}
                        initialOrderId={order.id}
                        isEmbedded={true}
                        sellerThreads={relatedOrders.map((o: any) => ({
                            orderId: o.id,
                            buyerName: o.buyerName,
                            productName: o.productName,
                            unreadCount: o.unreadCount || 0,
                            createdAt: o.createdAt
                        }))}
                        sellerOrders={relatedOrders}
                    />
                </div>
            </div>
        </div>
    );
}
