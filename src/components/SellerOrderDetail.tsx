"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Clock, CheckCircle2, MoreVertical, FileText, Download, MessageCircle, Truck, ShoppingBag, Calendar } from "lucide-react";
import { OrderItem, AuthUser } from "@/types";
import { formatOrderDateTimeWIB } from "@/lib/promotionFormatting";
import Link from "next/link";
import ChatInterface from "@/components/ChatInterface";
import Swal from "sweetalert2";

interface SellerOrderDetailProps {
    order: OrderItem;
    user?: AuthUser | null;
    onBack: () => void;
    onUpdateStatus: (newStatus: string) => void;
    onUploadDispatch: (orderId: string, currentStatus: string) => void;
    onUploadDelivery: (orderId: string) => void;
    feeAplikasi: number;
    feeJasa: number;
    feeAdmin: number;
    penaltyPercentage?: number;
}

export default function SellerOrderDetail({ order, user, onBack, onUpdateStatus, onUploadDispatch, onUploadDelivery, feeAplikasi, feeJasa, feeAdmin, penaltyPercentage = 0 }: SellerOrderDetailProps) {
    const isCompleted = order.status === 'completed';
    const isCancelled = order.status === 'cancelled';
    const isProcessing = order.status === 'processing';
    const isPreorderRunning = order.status === 'preorder_running';
    const isVerified = order.status === 'verified';
    const isWaitingPayment = order.status === 'waiting_verification';
    const isChatOnly = order.status === 'chat_only';

    const [inputText, setInputText] = useState("");
    const [activeDetailTab, setActiveDetailTab] = useState<'rincian' | 'info'>('rincian');

    const effectiveQty = Math.max(order.qty, order.minOrderQty || 1);
    const orderUnitPrice = order.qty > 0 ? order.totalPrice / order.qty : 0;
    const effectiveTotalPrice = orderUnitPrice * effectiveQty;
    const displayedTotalPrice = effectiveTotalPrice + feeAplikasi + feeJasa + feeAdmin;

    return (
        <div className="flex flex-col min-h-full bg-[#F0F4F8] w-full max-w-[100vw] md:max-w-none overflow-x-hidden">
            {/* Odoo Style Header Control Panel */}
            <div className="bg-white border-b border-gray-300 shadow-sm sticky top-0 z-40">
                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 sm:py-2 border-b border-gray-200 gap-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                            title="Return to List"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => window.open(`/invoice/${order.id}?role=seller`, '_blank')} className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-sm text-sm font-semibold hover:bg-gray-50 shadow-sm transition-colors flex items-center gap-2">
                                <FileText className="w-4 h-4" /> CETAK INVOICE
                            </button>
                            {/* Batal order button removed per user request */}
                        </div>
                    </div>


                </div>

                {/* Status Stepper */}
                <div className="px-5 py-3 flex flex-col md:flex-row md:justify-between items-start md:items-center gap-3 bg-white shadow-[0_4px_10px_-10px_rgba(0,0,0,0.1)] min-w-0 max-w-full">
                    <div className="flex-1 min-w-0 mr-4">
                        <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight truncate">
                            {order.id}
                        </h1>
                    </div>
                    <div className="flex items-center w-full md:w-auto overflow-x-auto pb-2 md:pb-0 min-w-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {/* Odoo style chevron stepper */}
                        <div className="flex bg-gray-100 rounded overflow-hidden text-[10px] md:text-[11px] font-bold uppercase tracking-wider border border-gray-200 shrink-0">
                            <div className={`px-4 py-1.5 border-r border-gray-200 ${isChatOnly ? 'bg-brand-primary text-white' : (isWaitingPayment || isVerified || isPreorderRunning || isProcessing || isCompleted) ? 'bg-white text-brand-primary' : 'text-gray-400'}`}>
                                Penawaran
                            </div>
                            <div className={`px-4 py-1.5 border-r border-gray-200 ${isWaitingPayment ? 'bg-brand-primary text-white' : (isVerified || isPreorderRunning || isProcessing || isCompleted) ? 'bg-white text-brand-primary' : 'text-gray-400'}`}>
                                Menunggu Pembayaran
                            </div>
                            <div className={`px-4 py-1.5 border-r border-gray-200 ${(isVerified || isPreorderRunning) ? 'bg-[#1e40af] text-white' : (isProcessing || isCompleted) ? 'bg-white text-[#1e40af]' : 'text-gray-400'}`}>
                                Diproses
                            </div>
                            <div className={`px-4 py-1.5 border-r border-gray-200 ${isProcessing ? 'bg-indigo-500 text-white' : isCompleted ? 'bg-white text-indigo-500' : 'text-gray-400'}`}>
                                Dikirim
                            </div>
                            <div className={`px-4 py-1.5 ${isCompleted ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}>
                                Selesai
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col lg:flex-row flex-1 p-3 md:p-4 gap-3 md:gap-4 w-full mx-auto items-start min-w-0 overflow-hidden">
                {/* Left Side: Order Form */}
                <div className="flex-1 min-w-0 w-full bg-white border border-gray-300 rounded shadow-sm overflow-hidden flex flex-col">
                    {/* Form Header Info Grid */}
                    <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-x-4 gap-y-5">
                        {/* Slot 1 (Left Col): Pembeli Nama */}
                        <div>
                            <div className="flex items-start gap-1 text-[13px] text-gray-900 mt-2">
                                <span className="text-gray-500 font-medium w-max shrink-0">Pembeli:</span>
                                <span className="font-semibold ml-1">{order.buyerName || "-"}</span>
                            </div>
                        </div>

                        {/* Slot 2 (Right Col): Pembeli Telp/Email */}
                        <div>
                            <div className="flex items-start gap-1 text-[13px] text-gray-900 mt-2">
                                <span className="text-gray-500 font-medium w-max shrink-0">Kontak:</span>
                                <span className="font-semibold break-words">{order.buyerPhone || "-"}</span>
                            </div>
                        </div>

                        {/* Slot 3 (Left Col): Alamat Pengiriman */}
                        <div>
                            <label className="text-[12px] font-bold text-gray-800 block mb-2">Alamat Pengiriman</label>
                            <div className="text-[13px] text-gray-800 leading-relaxed font-semibold">
                                {order.buyerAddress || "-"}
                            </div>
                        </div>

                        {/* Slot 4 (Right Col): Tanggal Pemesanan */}
                        <div>
                            <label className="text-[12px] font-bold text-gray-800 block mb-2">Tanggal Pemesanan</label>
                            <div className="text-[13px] text-gray-900">{order.createdAt ? formatOrderDateTimeWIB(order.createdAt) : "-"}</div>
                        </div>

                        {/* Slot 5 (Left Col): Estimasi/Jadwal Pengiriman */}
                        <div>
                            <label className="text-[12px] font-bold text-gray-800 block mb-2">Jadwal Pengiriman</label>
                            <div className="text-[13px] text-gray-600 leading-relaxed font-medium">
                                {order.deliveryDate ? (
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-brand-primary">
                                            {new Date(order.deliveryDate).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
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
                                    <span className="italic">Belum dijadwalkan / Informasi resi akan Anda update.</span>
                                )}
                            </div>
                        </div>

                        {/* Slot 6 (Right Col): Bukti Transaksi & Resi */}
                        <div>
                            <label className="text-[12px] font-bold text-gray-800 block mb-2">Dokumen & Bukti</label>
                            <div className="flex flex-col gap-1.5 w-full">
                                {(() => {
                                    if (!order.proofUrl) {
                                        return <span className="text-[11px] w-full max-w-[150px] text-center px-2 py-1 rounded bg-gray-100 text-gray-500 border border-transparent">Pembayaran: Belum ada</span>;
                                    }
                                    const proofStr = String(order.proofUrl);
                                    if (proofStr.startsWith('ipaymu:')) {
                                        const parts = proofStr.split(':');
                                        const via = parts.length >= 3 ? parts[2].toUpperCase() : 'SISTEM';
                                        const statusVal = parts.length >= 4 ? parts[3] : 'PAID';
                                        if (statusVal === 'paid') {
                                            return <span className="text-[11px] w-full max-w-[150px] text-center px-2 py-1 rounded bg-brand-secondary/10 text-brand-secondary font-bold border border-brand-secondary/20">Lunas ({via})</span>;
                                        }
                                        return <span className="text-[11px] w-full max-w-[150px] text-center px-2 py-1 rounded bg-amber-100 text-amber-700 font-bold border border-amber-200">Diproses ({via})</span>;
                                    }
                                    return <a href={proofStr} target="_blank" className="text-[11px] w-full max-w-[150px] text-center px-2 py-1 rounded bg-brand-primary/10 text-brand-primary font-semibold border-brand-primary/20 border transition-colors hover:bg-brand-primary hover:text-white">Bukti Bayar: Lihat</a>;
                                })()}

                                {order.dispatchReceiptUrl ? (
                                    <a href={order.dispatchReceiptUrl as string} target="_blank" className="text-[11px] w-full max-w-[150px] text-center px-2 py-1 rounded bg-amber-100 text-amber-700 font-semibold border-amber-200 border transition-colors hover:bg-amber-500 hover:text-white">Bukti Kirim: Lihat</a>
                                ) : (
                                    <button onClick={() => onUploadDispatch(order.id, order.status || 'verified')} className="text-[11px] w-full max-w-[150px] text-center px-2 py-1 rounded border border-dashed border-gray-400 text-gray-600 hover:text-brand-secondary hover:border-brand-secondary transition-colors cursor-pointer">Bukti Kirim: Upload</button>
                                )}
                            </div>
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
                            <table className="w-full text-left text-[13px] min-w-full">
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
                <div className="w-full lg:w-[300px] xl:w-[320px] 2xl:w-[380px] shrink-0 bg-white border border-gray-300 rounded shadow-sm flex flex-col mt-4 lg:mt-0 lg:min-h-[600px] lg:h-[calc(100vh-180px)] static lg:sticky lg:top-4 overflow-hidden">
                    <ChatInterface
                        mode="seller"
                        user={user || null}
                        initialOrderId={order.id}
                        isEmbedded={true}
                        sellerThreads={[{
                            orderId: order.id,
                            buyerName: order.buyerName,
                            productName: order.productName,
                            unreadCount: 0,
                            createdAt: order.createdAt
                        }]}
                        sellerOrders={[order]}
                    />
                </div>
            </div>
        </div>
    );
}
