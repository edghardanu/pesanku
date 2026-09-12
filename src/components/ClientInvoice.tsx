"use client";

import React, { useRef } from "react";
import { formatOrderDateTimeWIB } from "@/lib/promotionFormatting";

interface ClientInvoiceProps {
  order: any;
  checkoutFees: any[];
  viewerRole: string;
}

export default function ClientInvoice({ order, checkoutFees, viewerRole }: ClientInvoiceProps) {
  const printRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = () => {
    window.print();
  };

  const effectiveQty = Math.max(order.qty, order.minOrderQty || 1);
  const orderUnitPrice = order.qty > 0 ? (order.totalPrice / order.qty) : 0;
  
  const effectiveTotalPrice = order.totalPrice;
  const totalFees = checkoutFees.reduce((sum, fee) => sum + (parseInt(fee.value) || 0), 0);
  const total = effectiveTotalPrice + totalFees;

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col items-center py-10 w-full" style={{ fontFamily: "Arial, sans-serif" }}>
      <div className="w-full max-w-4xl bg-white shadow-sm border border-gray-300">
        <div ref={printRef} className="p-8 md:p-12 print-container">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-300 pb-6 mb-6">
            <div>
              <h1 className="text-3xl font-black text-[#1e40af] tracking-tight">INVOICE</h1>
              <p className="text-gray-500 mt-1 font-semibold text-sm">#{order.id}</p>
            </div>
            <div className="text-left md:text-right mt-4 md:mt-0">
              <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-1">Tanggal Pesanan</p>
              <p className="font-bold text-gray-800">{order.createdAt ? formatOrderDateTimeWIB(order.createdAt) : "-"}</p>
              <div className="mt-3">
                 <span className={`inline-block px-3 py-1 text-xs font-bold rounded uppercase tracking-wide
                    ${order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    order.status === 'processing' ? 'bg-indigo-100 text-indigo-700' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    (order.paymentStatus === 'verified' || order.status === 'verified') ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                    'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                    Status: {order.status}
                 </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Penjual Info */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Dari (Penjual)</h3>
              <p className="font-bold text-gray-800 text-lg">{order.sellerName || "-"}</p>
              <p className="text-sm text-gray-600 mt-1 max-w-[250px] leading-relaxed font-medium">{order.sellerAddress || "-"}</p>
            </div>
            
            {/* Pembeli Info */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Kepada (Pembeli)</h3>
              <p className="font-bold text-gray-800 text-lg">{order.buyerName || "-"}</p>
              <p className="text-sm text-gray-600 mt-1 font-medium">{order.buyerPhone || "-"}</p>
              <p className="text-sm text-gray-600 mt-1 max-w-[250px] leading-relaxed font-medium">{order.buyerAddress || "-"}</p>
            </div>
          </div>

          <table className="w-full text-left border-collapse mb-8 border border-gray-200">
            <thead>
              <tr className="bg-[#f8f9fa] text-gray-700 text-xs uppercase tracking-wider">
                <th className="p-3 font-bold border-b border-gray-300">Deskripsi Item</th>
                <th className="p-3 font-bold border-b border-gray-300 text-center">Qty</th>
                <th className="p-3 font-bold border-b border-gray-300 text-right">Harga Satuan</th>
                <th className="p-3 font-bold border-b border-gray-300 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="p-3">
                  <p className="font-bold text-gray-800">{order.productName}</p>
                  {order.selectedVariant ? (
                     <p className="text-xs text-gray-500 mt-1 font-medium">Varian: {order.selectedVariant}</p>
                  ) : null}
                  {order.notes ? (
                     <p className="text-xs text-gray-500 mt-1 italic font-medium">Catatan: {order.notes}</p>
                  ) : null}
                </td>
                <td className="p-3 text-center text-gray-700 font-semibold">{order.qty}</td>
                <td className="p-3 text-right text-gray-700 font-medium">
                  Rp {(order.totalPrice / order.qty).toLocaleString('id-ID')}
                </td>
                <td className="p-3 text-right font-bold text-gray-800">
                  Rp {order.totalPrice.toLocaleString('id-ID')}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="flex flex-col items-end mb-12">
            <div className="w-full md:w-1/2 p-4 bg-[#f8f9fa] border border-gray-200 rounded">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600 text-sm font-bold">Subtotal Produk</span>
                <span className="text-gray-800 font-bold">Rp {effectiveTotalPrice.toLocaleString('id-ID')}</span>
              </div>
              {checkoutFees.map((fee, idx) => (
                <div key={idx} className="flex justify-between items-center mb-2">
                  <span className="text-gray-500 text-[13px] font-medium">{fee.name}</span>
                  <span className="text-gray-700 text-[13px] font-semibold">Rp {(parseInt(fee.value) || 0).toLocaleString('id-ID')}</span>
                </div>
              ))}
              <div className="border-t border-gray-300 my-3"></div>
              <div className="flex justify-between items-center">
                <span className="text-gray-800 font-black text-lg uppercase tracking-wide">Total Keseluruhan</span>
                <span className="text-[#1e40af] font-black text-xl">Rp {total.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
          
          <div className="text-center text-xs text-gray-400 mt-12 border-t border-gray-200 pt-6 font-medium">
            <p>Terima kasih atas pesanan Anda.</p>
            <p className="mt-1">Invoice ini sah dan digenerate secara otomatis oleh sistem.</p>
          </div>
        </div>
      </div>
      
      <div className="mt-8 print-hide-buttons flex gap-4">
        <button 
          onClick={handlePrint}
          className="bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-bold py-2.5 px-6 rounded shadow transition-colors cursor-pointer"
        >
          Cetak PDF / Print
        </button>
        <button 
          onClick={() => window.close()}
          className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-bold py-2.5 px-6 rounded shadow-sm transition-colors cursor-pointer"
        >
          Tutup
        </button>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-hide-buttons {
            display: none !important;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
          }
          .min-h-screen > div {
             box-shadow: none !important;
             border: none !important;
          }
        }
      `}} />
    </div>
  );
}
