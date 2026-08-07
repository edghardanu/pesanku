"use client";

import { useRef, useState, useEffect } from "react";
import { Printer, ArrowLeft, CheckCircle2, Clock, Package, Truck, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function ClientInvoice({ order, feeAplikasi = 0, feeJasa = 0, feeAdmin = 0 }: { order: any, feeAplikasi?: number, feeJasa?: number, feeAdmin?: number }) {
  const router = useRouter();
  
  const [printDate, setPrintDate] = useState("");

  useEffect(() => {
    setPrintDate(new Date().toLocaleString('id-ID'));
  }, []);
  
  const handlePrint = () => {
    window.print();
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';
  };

  const getStatusBadge = (status: string) => {
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
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans pb-24">
      {/* Non-printable action bar */}
      <div className="print:hidden sticky top-0 bg-white border-b border-gray-200 shadow-sm z-50 p-4">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-black font-semibold">
            <ArrowLeft className="w-5 h-5" />
            Kembali
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg font-bold transition-colors shadow-sm"
          >
            <Printer className="w-5 h-5" />
            Cetak PDF
          </button>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="max-w-3xl mx-auto p-4 md:p-8 mt-6">
        <div className="bg-white rounded-xl shadow-md overflow-hidden print:shadow-none print:w-full print:m-0 print:p-0">
          
          {/* Header */}
          <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-orange-50/30">
            <div>
              <h1 className="text-3xl font-black text-orange-600 tracking-tight">INVOICE</h1>
              <p className="text-sm font-semibold text-gray-500 mt-1 uppercase tracking-wider">{order.id}</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-sm text-gray-500 font-medium">Tanggal Transaksi</p>
              <p className="font-semibold text-gray-800">{formatDate(order.createdAt)}</p>
              {getStatusBadge(order.status)}
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-gray-100">
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
            </div>
          </div>

          {/* Items */}
          <div className="p-8">
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
                    {order.notes && (
                      <p className="text-sm text-gray-500 mt-1 italic">Catatan: {order.notes}</p>
                    )}
                  </td>
                  <td className="py-4 p-2 text-center text-gray-700">Rp {order.productPrice.toLocaleString('id-ID')}</td>
                  <td className="py-4 p-2 text-center text-gray-700 font-semibold">{order.qty}x</td>
                  <td className="py-4 p-2 text-right text-gray-800 font-bold">Rp {(order.productPrice * order.qty).toLocaleString('id-ID')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="bg-gray-50 p-8 flex justify-end">
            <div className="w-full md:w-1/2 space-y-3">
              
              <div className="flex justify-between text-gray-600 font-medium">
                <span>Subtotal</span>
                <span>Rp {order.totalPrice.toLocaleString('id-ID')}</span>
              </div>
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
                <span className="text-2xl font-black text-orange-600">Rp {(order.totalPrice + feeAplikasi + feeJasa + feeAdmin).toLocaleString('id-ID')}</span>
              </div>

            </div>
          </div>

          <div className="p-8 text-center border-t border-gray-100">
            <p className="text-sm text-gray-400 font-medium">Ini adalah bukti pembayaran otomatis yang sah yang diterbitkan oleh sistem Pesanku.</p>
            <p className="text-xs text-gray-400 mt-1">Dicetak pada {printDate}</p>
          </div>

        </div>
      </div>
      
      {/* Global CSS for printing */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background-color: white; -webkit-print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:w-full { width: 100% !important; max-width: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:m-0 { margin: 0 !important; }
        }
      `}} />
    </div>
  );
}
