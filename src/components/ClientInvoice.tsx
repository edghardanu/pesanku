"use client";

import { useState, useEffect } from "react";
import { Printer, ArrowLeft, CheckCircle2, Clock, Package, Truck, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { InvoiceOrder } from "@/types";
import { WIB_TIMEZONE, formatDateTimeWIB } from "@/lib/promotionFormatting";

export default function ClientInvoice({ order, feeAplikasi = 0, feeJasa = 0, feeAdmin = 0, viewerRole = 'buyer' }: { order: InvoiceOrder, feeAplikasi?: number, feeJasa?: number, feeAdmin?: number, viewerRole?: 'buyer' | 'seller' | 'admin' }) {
  const router = useRouter();
  const itemUnitPrice = order.selectedVariantPrice ?? order.productPrice;
  
  const [printDate, setPrintDate] = useState("");

  useEffect(() => {
    setTimeout(() => {
      setPrintDate(formatDateTimeWIB(new Date()));
    }, 0);
  }, []);
  
  const handlePrint = () => {
    const originalTitle = document.title;
    const restoreTitle = () => {
      document.title = originalTitle;
    };

    setPrintDate(formatDateTimeWIB(new Date()));
    document.title = `Invoice-${order.id}`;
    window.addEventListener('afterprint', restoreTitle, { once: true });
    window.setTimeout(() => window.print(), 50);
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'Tanggal tidak tersedia';
    return formatDateTimeWIB(date);
  };

  const proofUrl = order.paymentProofUrl;
  let sid = '';
  let viaCode = 'VA';
  if (proofUrl && proofUrl.startsWith('ipaymu:')) {
    const parts = proofUrl.split(':');
    sid = parts[1] || '';
    viaCode = (parts[2] || 'VA').toUpperCase();
  }

  const channelMap: Record<string, string> = {
    'VA': 'Virtual Account',
    'TRANSFER': 'Virtual Account',
    'BANKTRANSFER': 'Virtual Account',
    'BCA': 'Virtual Account (Bank Central Asia)',
    'MANDIRI': 'Virtual Account (Bank Mandiri)',
    'BNI': 'Virtual Account (Bank Negara Indonesia)',
    'BRI': 'Virtual Account (Bank Rakyat Indonesia)',
    'CIMB': 'Virtual Account (Bank CIMB Niaga)',
    'PERMATA': 'Virtual Account (Bank Permata)',
    'BSI': 'Virtual Account (Bank Syariah Indonesia)',
    'BAG': 'Virtual Account (Bank Artha Graha)',
    'QRIS': 'QRIS',
    'ALFAMART': 'Alfamart Retail',
    'INDOMARET': 'Indomaret Retail',
  };

  const channelName = channelMap[viaCode] || `Virtual Account (${viaCode})`;

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'pending':
        return <div className="inline-flex mt-2 items-center gap-1.5 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold"><Clock className="w-4 h-4" /> Menunggu Pembayaran</div>;
      case 'waiting_verification':
        return <div className="inline-flex mt-2 items-center gap-1.5 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold"><Clock className="w-4 h-4" /> Menunggu Verifikasi</div>;
      case 'verified':
      case 'processing':
        return <div className="inline-flex mt-2 items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold"><Package className="w-4 h-4" /> Lunas / Diproses</div>;
      case 'shipped':
        return <div className="inline-flex mt-2 items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold"><Truck className="w-4 h-4" /> Lunas / Dikirim</div>;
      case 'completed':
        return <div className="inline-flex mt-2 items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold"><CheckCircle2 className="w-4 h-4" /> Lunas / Selesai</div>;
      case 'cancelled':
        return <div className="inline-flex mt-2 items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold"><XCircle className="w-4 h-4" /> Dibatalkan</div>;
      default:
        return <div className="inline-flex mt-2 items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">{status}</div>;
    }
  };

  return (
    <div className="invoice-page min-h-screen bg-gray-100 text-gray-800 font-sans pb-24">
      {/* Non-printable action bar */}
      <div className="print:hidden sticky top-0 bg-white border-b border-gray-200 shadow-sm z-50 p-4">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <button onClick={() => {
            if (viewerRole === 'seller') router.push('/seller');
            else if (viewerRole === 'admin') router.push('/admin');
            else router.push('/');
          }} className="flex items-center gap-2 text-gray-600 hover:text-black font-semibold">
            <ArrowLeft className="w-5 h-5" />
            Kembali
          </button>
          <button 
            onClick={handlePrint}
            aria-label={`Cetak atau simpan invoice ${order.id} sebagai PDF`}
            className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-hover text-white px-5 py-2 rounded-lg font-bold transition-colors shadow-sm"
          >
            <Printer className="w-5 h-5" />
            Cetak / Simpan PDF
          </button>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="invoice-shell max-w-3xl mx-auto p-4 md:p-8 mt-6">
        <div className="invoice-document bg-white rounded-xl shadow-md overflow-hidden print:shadow-none print:w-full print:m-0 print:p-0">
          
          {/* Header */}
          <div className="invoice-section invoice-header p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-brand-primary/[0.03]">
            <div>
              <h1 className="text-3xl font-black text-brand-primary tracking-tight">INVOICE</h1>
              <p className="text-sm font-semibold text-gray-500 mt-1 uppercase tracking-wider">{order.id}</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-sm text-gray-500 font-medium">Tanggal Transaksi</p>
              <p className="font-semibold text-gray-800">{formatDate(order.createdAt)}</p>
              {getStatusBadge(order.status)}
            </div>
          </div>

          <div className="invoice-section invoice-parties p-8 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-100">
            {/* Seller */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Diterbitkan Oleh (Penjual)</p>
              <h3 className="text-lg font-bold text-gray-800">{order.sellerName}</h3>
              <p className="text-gray-600 text-sm mt-1 leading-relaxed max-w-[250px]">{order.sellerAddress}</p>
            </div>

            {/* Buyer */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Ditagihkan Kepada (Pembeli)</p>
              <h3 className="text-lg font-bold text-gray-800">{order.buyerName}</h3>
              <p className="text-gray-600 text-sm mt-1">{order.buyerEmail}</p>
              <p className="text-gray-600 text-sm mt-1">{order.buyerPhone || '-'}</p>
              <p className="text-gray-600 text-sm mt-1 leading-relaxed max-w-[250px]">{order.buyerAddress || '-'}</p>
            </div>

            {/* Payment Method & Reference */}
            <div className="md:col-span-2 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/80 p-4 rounded-xl">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Metode Pembayaran</p>
                <p className="text-sm font-extrabold text-gray-800 mt-1">{channelName}</p>
              </div>
              {sid && sid !== 'undefined' && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No. Referensi / Transaksi ID</p>
                  <code className="text-xs font-mono font-bold text-gray-700 bg-white px-2.5 py-1 rounded border border-gray-200 block mt-1 max-w-full break-all">{sid}</code>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="invoice-section p-8">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="py-3 font-bold text-gray-700 uppercase p-2 text-sm">Deskripsi Produk</th>
                  <th className="py-3 font-bold text-gray-700 uppercase p-2 text-sm text-center">Harga Satuan</th>
                  <th className="py-3 font-bold text-gray-700 uppercase p-2 text-sm text-center">Kuantitas</th>
                  <th className="py-3 font-bold text-gray-700 uppercase p-2 text-sm text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-50">
                  <td className="py-4 p-2">
                    <p className="font-bold text-gray-800 text-lg">{order.productName}</p>
                    {order.selectedVariant && (
                      <p className="text-sm font-semibold text-brand-primary mt-1">
                        Varian: {order.selectedVariant}
                        {order.selectedVariantPrice !== null && order.selectedVariantPrice !== undefined
                          ? ` · Rp ${order.selectedVariantPrice.toLocaleString('id-ID')}`
                          : ''}
                      </p>
                    )}
                    {order.notes && (
                      <p className="text-sm text-gray-500 mt-1 italic">Catatan: {order.notes}</p>
                    )}
                  </td>
                  <td className="py-4 p-2 text-center text-gray-700">Rp {itemUnitPrice.toLocaleString('id-ID')}</td>
                  <td className="py-4 p-2 text-center text-gray-700 font-semibold">{order.qty}x</td>
                  <td className="py-4 p-2 text-right text-gray-800 font-bold">Rp {(itemUnitPrice * order.qty).toLocaleString('id-ID')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="invoice-section bg-gray-50 p-8 flex justify-end">
            <div className="w-full md:w-1/2 space-y-3">
              
              <div className="flex justify-between text-gray-600 font-medium">
                <span>Subtotal</span>
                <span>Rp {order.totalPrice.toLocaleString('id-ID')}</span>
              </div>
              
              {viewerRole === 'buyer' ? (
                <>
                  <div className="flex justify-between text-gray-600 font-medium">
                    <span>Biaya Aplikasi</span>
                    <span>Rp {feeAplikasi.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 font-medium">
                    <span>Biaya Jasa</span>
                    <span>Rp {feeJasa.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 font-medium">
                    <span>Biaya Admin</span>
                    <span>Rp {feeAdmin.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-center">
                    <span className="text-xl font-black text-gray-800">TOTAL PEMBAYARAN</span>
                    <span className="text-2xl font-black text-brand-primary">Rp {(order.totalPrice + feeAplikasi + feeJasa + feeAdmin).toLocaleString('id-ID')}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-gray-600 font-medium">
                    <span>Biaya Admin</span>
                    <span>-Rp {feeAdmin.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 font-medium">
                    <span>Biaya Aplikasi</span>
                    <span>-Rp {feeAplikasi.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 font-medium">
                    <span>Biaya Jasa</span>
                    <span>-Rp {feeJasa.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-center">
                    <span className="text-xl font-black text-gray-800">TOTAL DITERIMA</span>
                    <span className="text-2xl font-black text-green-600">Rp {Math.max(0, order.totalPrice - feeAdmin - feeAplikasi - feeJasa).toLocaleString('id-ID')}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="invoice-footer p-8 text-center border-t border-gray-100">
            <p className="text-sm text-gray-400 font-medium">Ini adalah bukti pembayaran otomatis yang sah yang diterbitkan oleh sistem Pesanku.</p>
            <p className="text-xs text-gray-400 mt-1">Dicetak pada {printDate}</p>
          </div>

        </div>
      </div>
      
      {/* Global CSS for printing */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 12mm;
        }

        @media print {
          html, body {
            background-color: white !important;
            color: #1f2937 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .invoice-page {
            min-height: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .invoice-shell {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .invoice-document {
            width: 100% !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          .invoice-section,
          .invoice-footer,
          .invoice-document table,
          .invoice-document tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .invoice-section {
            padding: 18px 24px !important;
          }
          .invoice-header {
            flex-direction: row !important;
            align-items: center !important;
          }
          .invoice-header > div:last-child {
            text-align: right !important;
          }
          .invoice-parties {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 32px !important;
          }
          .invoice-footer {
            padding: 16px 24px !important;
          }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:w-full { width: 100% !important; max-width: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:m-0 { margin: 0 !important; }
        }
      `}</style>
    </div>
  );
}
