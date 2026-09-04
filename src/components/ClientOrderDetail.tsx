"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Clock, CheckCircle2, MoreVertical, FileText, Download, MessageCircle, Truck, ShoppingBag, Calendar, PackageCheck } from "lucide-react";
import { BuyerOrderViewItem, AuthUser } from "@/types";
import { formatOrderDateTimeWIB } from "@/lib/promotionFormatting";
import ChatInterface from "@/components/ChatInterface";
import Swal from "sweetalert2";


interface ClientOrderDetailProps {
    order: BuyerOrderViewItem;
    user?: AuthUser | null;
    onBack?: () => void;
    onNavigateTab: (tab: 'orders' | 'tracking') => void;
    onCancelOrder: () => void;
    feeAplikasi: number;
    feeJasa: number;
    feeAdmin: number;
    penaltyPercentage?: number;
}

export default function ClientOrderDetail({ order, user, onBack, onNavigateTab, onCancelOrder, feeAplikasi, feeJasa, feeAdmin, penaltyPercentage = 0 }: ClientOrderDetailProps) {
    const isCompleted = order.status === 'completed';
    const isCancelled = order.status === 'cancelled';
    const isProcessing = order.status === 'processing';
    const isPreorderRunning = order.status === 'preorder_running';
    const isVerified = order.status === 'verified';
    const isWaitingPayment = order.status === 'waiting_verification';
    const isChatOnly = order.status === 'chat_only';
    const isDirectCheckout = typeof order.orderId === 'string' && order.orderId.startsWith('ORD-');

    const [inputText, setInputText] = useState("");
    const [activeDetailTab, setActiveDetailTab] = useState<'rincian' | 'info'>('rincian');

    const effectiveQty = Math.max(order.qty, order.minQty || 1);
    const orderUnitPrice = order.qty > 0 ? order.totalPrice / order.qty : 0;
    const effectiveTotalPrice = orderUnitPrice * effectiveQty;
    const displayedTotalPrice = effectiveTotalPrice + feeAplikasi + feeJasa + feeAdmin;

    return (
        <div className="flex flex-col min-h-screen bg-[#F0F4F8] max-w-[100vw] overflow-x-hidden">
            {/* Odoo Style Header Control Panel */}
            <div className="bg-white border-b border-gray-300 shadow-sm sticky top-0 z-40">
                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 sm:py-2 border-b border-gray-200 gap-3">
                    <div className="flex items-center gap-3">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                                title="Return to List"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div className="flex flex-wrap gap-2">
                            {isProcessing && (
                                <button
                                    onClick={async () => {
                                        const { value: file } = await Swal.fire({
                                            title: 'Selesaikan Pesanan',
                                            html: '<p class="text-sm text-gray-600 mb-2">Upload foto bukti barang sudah sampai sebagai konfirmasi penerimaan.</p>',
                                            input: 'file',
                                            inputAttributes: { accept: 'image/*', 'aria-label': 'Upload Bukti Sampai' },
                                            showCancelButton: true,
                                            confirmButtonText: 'Selesaikan Pesanan',
                                            cancelButtonText: 'Batal',
                                            confirmButtonColor: '#10b981',
                                            preConfirm: (f) => { if (!f) { Swal.showValidationMessage('Foto bukti sampai wajib dilampirkan!'); return false; } return f; }
                                        });
                                        if (file) {
                                            Swal.fire({ title: 'Mengunggah...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                                            const reader = new FileReader();
                                            reader.onload = async (ev) => {
                                                try {
                                                    const res = await fetch('/api/orders/update-status', {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ orderId: order.orderId, status: 'completed', deliveryProofUrl: ev.target?.result })
                                                    });
                                                    if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Gagal'); }
                                                    Swal.fire({ icon: 'success', title: 'Pesanan Selesai!', text: 'Terima kasih telah berbelanja.', confirmButtonColor: '#10b981' }).then(() => window.location.reload());
                                                } catch (err) { Swal.fire('Gagal', err instanceof Error ? err.message : 'Terjadi kesalahan', 'error'); }
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                    className="bg-status-success hover:bg-emerald-600 text-white px-3 py-1.5 rounded-sm text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
                                >
                                    <PackageCheck className="w-4 h-4" /> SELESAI PESANAN
                                </button>
                            )}
                            <button onClick={() => window.open(`/invoice/${order.orderId}?role=buyer`, '_blank')} className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-sm text-sm font-semibold hover:bg-gray-50 shadow-sm transition-colors">
                                CETAK INVOICE
                            </button>
                            {!isCompleted && !isProcessing && (
                                <button onClick={onCancelOrder} className="bg-white border text-red-600 hover:text-white border-gray-300 hover:bg-red-600 px-3 py-1.5 rounded-sm text-sm font-semibold shadow-sm transition-colors">
                                    BATAL ORDER
                                </button>
                            )}
                        </div>
                    </div>


                </div>

                {/* Status Stepper */}
                <div className="px-5 py-3 flex flex-col md:flex-row md:justify-between items-start md:items-center gap-3 bg-white shadow-[0_4px_10px_-10px_rgba(0,0,0,0.1)] min-w-0 max-w-full">
                    <div className="flex-1 min-w-0 mr-4">
                        <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight truncate">
                            {order.orderId}
                        </h1>
                    </div>
                    <div className="flex items-center w-full md:w-auto overflow-x-auto pb-2 md:pb-0 min-w-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <div className="flex bg-gray-100 rounded overflow-hidden text-[10px] md:text-[11px] font-bold uppercase tracking-wider border border-gray-200 shrink-0">
                            <div className={`px-4 py-1.5 border-r border-gray-200 ${isChatOnly ? 'bg-brand-primary text-white' : (isWaitingPayment || isVerified || isPreorderRunning || isProcessing || isCompleted) ? 'bg-white text-brand-primary' : 'text-gray-400'}`}>
                                Penawaran
                            </div>
                            <div className={`px-4 py-1.5 border-r border-gray-200 ${isWaitingPayment ? 'bg-brand-primary text-white' : (isVerified || isPreorderRunning || isProcessing || isCompleted) ? 'bg-white text-brand-primary' : 'text-gray-400'}`}>
                                Menunggu Pembayaran
                            </div>
                            <div className={`px-4 py-1.5 border-r border-gray-200 ${(isVerified || isPreorderRunning) ? 'bg-brand-primary text-white' : (isProcessing || isCompleted) ? 'bg-white text-brand-primary' : 'text-gray-400'}`}>
                                Diproses
                            </div>
                            <div className={`px-4 py-1.5 border-r border-gray-200 ${isProcessing ? 'bg-indigo-500 text-white' : isCompleted ? 'bg-white text-indigo-500' : 'text-gray-400'}`}>
                                Dikirim
                            </div>
                            <div className={`px-4 py-1.5 border-r border-gray-200 ${isCompleted ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}>
                                Selesai
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden lg:overflow-visible p-4 md:p-6 gap-4 md:gap-6 w-full max-w-[1600px] mx-auto items-start">
                {/* Left Side: Order Form */}
                <div className="flex-1 min-w-0 w-full bg-white border border-gray-300 rounded shadow-sm overflow-hidden flex flex-col">
                    {/* Form Header Info Grid */}
                    <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-x-8 gap-y-6">
                        {/* Slot 1 (Left Col): Nama */}
                        <div>
                            <div className="flex items-start gap-2 text-[13px] text-gray-900 mt-2">
                                <span className="text-gray-500 font-medium w-11 shrink-0">Nama:</span>
                                <span className="font-semibold">{user?.name || "-"}</span>
                            </div>
                        </div>

                        {/* Slot 2 (Right Col): Email */}
                        <div>
                            <div className="flex items-start gap-2 text-[13px] text-gray-900 mt-2">
                                <span className="text-gray-500 font-medium w-11 shrink-0">Email:</span>
                                <span className="font-semibold truncate block max-w-full" title={user?.email || "-"}>{user?.email || "-"}</span>
                            </div>
                        </div>

                        {/* Slot 3 (Left Col): Delivery Address */}
                        <div>
                            <label className="text-[12px] font-bold text-gray-800 block mb-2">Alamat Pengiriman</label>
                            <div className="text-[13px] text-gray-800 leading-relaxed font-semibold">
                                {user?.address || "-"}
                            </div>
                        </div>

                        {/* Slot 4 (Right Col): Order Date */}
                        <div>
                            <label className="text-[12px] font-bold text-gray-800 block mb-2">Tanggal Pemesanan</label>
                            <div className="text-[13px] text-gray-900">{order.createdAt ? formatOrderDateTimeWIB(order.createdAt) : "-"}</div>
                        </div>

                        {/* Slot 5 (Left Col): Delivery ETA */}
                        <div>
                            <label className="text-[12px] font-bold text-gray-800 block mb-2">Estimasi Pengiriman</label>
                            <div className="text-[13px] text-gray-600 leading-relaxed font-medium">
                                {(order.deliveryDate || order.trackingNumber || order.dispatchReceiptUrl) ? (
                                    <div className="flex flex-col gap-1.5">
                                        {order.deliveryDate && (
                                            <span className="font-semibold text-brand-primary">
                                                {new Date(order.deliveryDate).toLocaleDateString('id-ID', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        )}
                                        {order.trackingNumber && (
                                            <span className="font-bold text-gray-800">
                                                No Resi: <span className="text-brand-primary">{order.trackingNumber}</span>
                                            </span>
                                        )}
                                        {order.dispatchReceiptUrl && (
                                            <a href={order.dispatchReceiptUrl} target="_blank" className="text-[11px] w-max px-2 py-1 rounded bg-amber-100 text-amber-700 font-semibold border-amber-200 border transition-colors hover:bg-amber-500 hover:text-white">
                                                Lihat Bukti Foto Resi
                                            </a>
                                        )}
                                    </div>
                                ) : (
                                    'Informasi resi akan diupdate oleh penjual'
                                )}
                            </div>
                        </div>

                        {/* Slot 6 (Right Col): Payment */}
                        <div>
                            <label className="text-[12px] font-bold text-gray-800 block mb-2">Pembayaran</label>
                            {(() => {
                                const isOrderPaid = ['verified', 'processing', 'completed', 'preorder_running'].includes(order.status || '');
                                const proofUrl = order.paymentProofUrl;

                                if (order.status === 'chat_only' || (!isOrderPaid && !proofUrl)) {
                                    return (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                            Belum Dibayar
                                        </div>
                                    );
                                }

                                let sid = '';
                                let viaCode = 'VA';
                                if (proofUrl && proofUrl.startsWith('ipaymu:')) {
                                    const parts = proofUrl.split(':');
                                    sid = parts[1] || '';
                                    viaCode = (parts[2] || 'VA').toUpperCase();
                                }

                                const channelMap: Record<string, string> = {
                                    'VA': 'Virtual Account (iPaymu)',
                                    'BCA': 'BCA Virtual Account',
                                    'MANDIRI': 'Mandiri Virtual Account',
                                    'BNI': 'BNI Virtual Account',
                                    'BRI': 'BRI Virtual Account',
                                    'CIMB': 'CIMB Niaga VA',
                                    'PERMATA': 'Permata Bank VA',
                                    'QRIS': 'QRIS (iPaymu)',
                                    'ALFAMART': 'Alfamart Retail',
                                    'INDOMARET': 'Indomaret Retail',
                                };

                                const channelName = channelMap[viaCode] || `Virtual Account (${viaCode})`;

                                return (
                                    <div className="flex flex-col gap-1.5 bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 max-w-xs shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-extrabold bg-emerald-600 text-white">
                                                ✓ Lunas
                                            </span>
                                            <span className="text-[11px] font-bold text-emerald-800">Verifikasi Otomatis System</span>
                                        </div>
                                        <div className="text-[12px] text-gray-700 space-y-1 pt-1 border-t border-emerald-200/60">
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-500 font-medium">Metode:</span>
                                                <span className="font-bold text-gray-900">{channelName}</span>
                                            </div>
                                            {sid && sid !== 'undefined' && (
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-gray-500 font-medium">No. Ref:</span>
                                                    <code className="text-[11px] bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-800 font-mono font-semibold">{sid}</code>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Form Tabs for Lines */}
                    <div className="px-4 w-full">
                        <div className="border-b border-gray-200 overflow-x-auto">
                            <ul className="flex min-w-max">
                                <li
                                    onClick={() => setActiveDetailTab('rincian')}
                                    className={`px-4 py-2 border-b-2 text-sm tracking-wide cursor-pointer ${activeDetailTab === 'rincian' ? 'border-brand-primary text-brand-primary font-bold' : 'border-transparent text-gray-500 font-medium hover:text-gray-800'}`}
                                >
                                    Rincian Pesanan
                                </li>
                                <li
                                    onClick={() => setActiveDetailTab('info')}
                                    className={`px-4 py-2 border-b-2 text-sm tracking-wide cursor-pointer ${activeDetailTab === 'info' ? 'border-brand-primary text-brand-primary font-bold' : 'border-transparent text-gray-500 font-medium hover:text-gray-800'}`}
                                >
                                    Informasi Tambahan
                                </li>
                            </ul>
                        </div>
                    </div>

                    {activeDetailTab === 'rincian' ? (
                        <div className="p-0 overflow-x-auto w-full">
                            <table className="w-full text-left text-[13px] min-w-[700px]">
                                <thead>
                                    <tr className="border-b border-gray-300 text-gray-600 font-bold bg-[#f8f9fa]">
                                        <th className="px-4 py-2.5">Produk</th>
                                        <th className="px-4 py-2.5">Deskripsi Produk</th>
                                        <th className="px-4 py-2.5">Tambahan Varian</th>
                                        <th className="px-4 py-2.5 text-right">Jumlah</th>
                                        <th className="px-4 py-2.5 text-right">Harga Satuan</th>
                                        <th className="px-4 py-2.5 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-gray-100 hover:bg-gray-50 align-top">
                                        <td className="px-4 py-3 font-semibold text-brand-primary">{order.productName}</td>
                                        <td className="px-4 py-3 text-gray-600 italic max-w-[200px] break-words">
                                            {order.notes || "Tidak ada catatan."}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-700">
                                            {order.selectedVariant ? (
                                                <div className="flex flex-col">
                                                    <span>{order.selectedVariant}</span>
                                                    {order.selectedVariantPrice ? (
                                                        <span className="text-[11px] text-gray-500 font-semibold">+ Rp {order.selectedVariantPrice.toLocaleString('id-ID')}</span>
                                                    ) : null}
                                                </div>
                                            ) : (
                                                <span className="text-gray-600 italic font-normal">Tidak ada tambahan varian.</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium">{effectiveQty} porsi</td>
                                        <td className="px-4 py-3 text-right">Rp {orderUnitPrice.toLocaleString('id-ID')}</td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-800">Rp {effectiveTotalPrice.toLocaleString('id-ID')}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <div className="flex justify-end p-6 bg-gray-50">
                                <div className="w-full max-w-[300px]">
                                    <div className="flex justify-between py-1.5 text-sm">
                                        <span className="text-gray-600 font-bold">Subtotal Produk:</span>
                                        <span className="font-semibold text-gray-800">Rp {effectiveTotalPrice.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex flex-col gap-1 pb-1.5 text-[11px] text-gray-500 pl-4 border-l-2 border-brand-primary/20 ml-2 mb-2">
                                        <div className="flex justify-between">
                                            <span>Biaya Aplikasi:</span>
                                            <span>Rp {feeAplikasi.toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Biaya Jasa:</span>
                                            <span>Rp {feeJasa.toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Biaya Admin:</span>
                                            <span>Rp {feeAdmin.toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between py-3 border-t border-gray-300 mt-2 text-xl">
                                        <span className="font-black text-gray-800">Total Keseluruhan:</span>
                                        <span className="font-black text-brand-primary">Rp {displayedTotalPrice.toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* OTHER PRODUCTS FEATURE (Moved to Chat Modal per user request) */}
                        </div>
                    ) : (
                        <div className="p-6 text-[13px] text-gray-700">
                            <h3 className="font-bold text-gray-800 mb-3 text-sm">Peraturan Preorder & Pembatalan</h3>
                            <div className="space-y-4">
                                <p>
                                    Pesanan ini tunduk pada pedoman dan peraturan Preorder standar aplikasi. Pembeli dan penjual setuju untuk berkomunikasi melalui fitur chat terkait jadwal pengiriman, spesifikasi, dan ketersediaan barang.
                                </p>

                                <div className="bg-orange-50 border border-orange-200 p-4 rounded-md">
                                    <h4 className="font-bold text-orange-800 mb-2">Kebijakan Denda Pembatalan</h4>
                                    <ul className="list-disc pl-5 space-y-2 text-orange-900/80">
                                        <li>Apabila pembeli membatalkan pesanan setelah pesanan diproses atau dikonfirmasi oleh penjual, sistem dapat membebankan denda pembatalan.</li>
                                        <li><strong>Nominal Denda:</strong> Ditetapkan sebesar <strong>{penaltyPercentage}%</strong> dari Subtotal Produk (setara dengan <strong>Rp {((penaltyPercentage / 100) * effectiveTotalPrice).toLocaleString('id-ID')}</strong>) jika bahan telah dibeli penjual, atau persentase lain yang disepakati/ditetapkan sistem.</li>
                                        <li>Dana pengembalian setelah dikurangi denda akan diproses ke rekening pembeli yang didaftarkan.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side: Chatter */}
                <div className="w-full lg:w-[320px] xl:w-[360px] 2xl:w-[420px] bg-white border border-gray-300 rounded shadow-sm flex flex-col shrink-0 mt-4 lg:mt-0 lg:h-[calc(100vh-180px)] static lg:sticky lg:top-4 overflow-hidden">
                    <ChatInterface
                        mode="buyer"
                        user={user || null}
                        initialOrderId={order.orderId}
                        isEmbedded={true}
                        buyerOrders={[order]}
                    />
                </div>
            </div>
        </div>
    );
}
