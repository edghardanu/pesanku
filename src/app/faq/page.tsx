import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'FAQ - Pertanyaan Seputar Pesanku',
  description: 'Tanya Jawab Seputar platform Pesanku',
};

const faqs = [
  {
    question: "Apa itu Pesanku?",
    answer: "Pesanku adalah sebuah platform marketplace khusus sistem Pre-Order. Kami menjembatani pembeli dengan berbagai penjual UMKM yang membuat produk kustom, makanan sistem PO (Pesan Antar)."
  },
  {
    question: "Bagaimana cara kerja Pre-Order di sini?",
    answer: "Anda memilih produk yang ditawarkan penjual, lalu menentukan jumlah dan tanggal kebutuhan Anda (deadline). Setelah Anda membayar, uang Anda diamankan di sistem kami. Penjual akan memverifikasi pesanan Anda lalu mulai memproduksinya."
  },
  {
    question: "Metode pembayaran apa saja yang didukung?",
    answer: "Kami mendukung berbagai metode pembayaran melalui Gateway Pembayaran resmi, termasuk Transfer Bank (Virtual Account), e-Wallet (OVO, GoPay, Dana, ShopeePay), dan QRIS."
  },
  {
    question: "Bagaimana jika pesanan saya ditolak oleh Penjual?",
    answer: "Jika penjual menolak pesanan (sebelum atau pun sesudah pembayaran, namun belum masuk proses produksi), sistem akan otomatis melakukan pembatalan pesanan Anda, dan dana yang telah masuk akan langsung dilanjutkan ke proses pengembalian dana (Refund)."
  },
  {
    question: "Apakah saya bisa chat penjual terlebih dahulu?",
    answer: "Tentu! Anda sangat dianjurkan untuk memanfaatkan fitur 'Chat Penjual' sebelum melakukan pemesanan untuk memastikan ketersediaan barang, request khusus, atau negosiasi tanggal tenggat waktu."
  },
  {
    question: "Bagaimana cara saya menjadi Penjual/Mitra UMKM?",
    answer: "Anda dapat mendaftar seperti biasa lalu mengikuti prosedur aktivasi toko di pengaturan profil Anda. Tim kami akan meninjau proses kelayakan (Approval) sebelum Anda dapat menayangkan produk perdana Anda."
  }
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12 border border-gray-100">
          <div className="mb-12 text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight mb-4 text-center">
              Pusat Bantuan / FAQ
            </h1>
            <div className="w-16 h-1 bg-brand-primary mx-auto rounded-full mb-4"></div>
            <p className="text-gray-500">Temukan jawaban untuk pertanyaan-pertanyaan yang paling sering ditanyakan di platform kami.</p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white border text-left p-6 rounded-xl hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-start">
                  <span className="text-brand-primary mr-3 text-xl font-black">Q.</span>
                  {faq.question}
                </h3>
                <div className="text-slate-600 pl-8 leading-relaxed">
                  <span className="font-semibold text-slate-400 block mb-1">Answer:</span>
                  {faq.answer}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-brand-primary/5 border border-brand-primary/10 p-6 rounded-xl text-center">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Masih memiliki pertanyaan?</h2>
            <p className="text-slate-600 mb-6">Jangan ragu untuk menghubungi kami jika Anda membutuhkan bantuan lebih lanjut.</p>
            <a href="mailto:support@pesanku.id" className="inline-block px-8 py-3 bg-brand-primary text-white font-semibold rounded-xl hover:bg-brand-primary-hover transition-colors shadow-sm cursor-pointer">
              Hubungi Support
            </a>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-100 flex justify-center">
            <Link href="/" className="px-6 py-3 bg-gray-50 text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition-colors">
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
