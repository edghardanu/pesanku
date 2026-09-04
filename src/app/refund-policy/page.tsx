import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Kebijakan Pengembalian Dana | Pesanku',
  description: 'Prosedur dan Kebijakan Pengembalian Dana (Refund) di platform Pesanku',
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12 border border-gray-100">
          <div className="mb-10 text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight mb-4 text-center">
              Kebijakan Pengembalian Dana
            </h1>
            <div className="w-16 h-1 bg-brand-primary mx-auto rounded-full mb-4"></div>
            <p className="text-gray-500">Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <div className="prose prose-slate max-w-none text-slate-600 prose-headings:text-slate-800 prose-headings:font-bold prose-a:text-brand-primary hover:prose-a:text-brand-primary-hover">
            <p className="mb-6 font-medium text-slate-700">
              Di Pesanku, kepuasan pembeli adalah prioritas kami. Meski begitu, karena sistem kami berbasis sistem Pre-Order (Pesan di Muka), ada aturan ketat mengenai prosedur pengembalian dana (Refund).
            </p>

            <h2 className="text-2xl mt-8 mb-4">1. Kondisi yang Valid untuk Refund</h2>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Penjual Menolak Pesanan:</strong> Jika Anda telah melakukan pembayaran namun Penjual menolak pesanan Anda dengan alasan apapun (misalnya kuota terpenuhi atau keterbatasan bahan baku).</li>
              <li><strong>Pesanan Dibatalkan Otomatis (Expired):</strong> Jika Anda sudah membayar, tetapi Penjual tidak menanggapinya melewati batas waktu verifikasi yang diizinkan sistem.</li>
              <li><strong>Kegagalan Produksi/Pengiriman:</strong> Jika pada hari yang disepakati, Penjual secara sepihak menyatakan tidak bisa memenuhi pesanan dan membatalkan pesanan dari Dashboard mereka.</li>
            </ul>

            <h2 className="text-2xl mt-8 mb-4">2. Kondisi yang Tidak Mengizinkan Refund</h2>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Pembeli Berubah Pikiran:</strong> Pesanan yang sudah berstatus <em>Diproses</em> atau <em>Terverifikasi</em> tidak dapat dibatalkan oleh Pembeli secara sepihak.</li>
              <li><strong>Keterlambatan Konfirmasi Pembeli:</strong> Jika barang sudah siap namun Pembeli gagal merespons atau memberikan alamat yang salah sehingga pengiriman terkendala.</li>
            </ul>

            <h2 className="text-2xl mt-8 mb-4">3. Proses & Estimasi Waktu Pengembalian</h2>
            <p className="mb-4">
              Jika kondisi Refund Anda valid berdasarkan poin ke-1:
            </p>
            <ol className="list-decimal pl-6 mb-4 space-y-2">
              <li>Sistem akan secara otomatis membatalkan pesanan Anda.</li>
              <li>Dana akan diproses oleh layanan Payment Gateway terkait yang digunakan.</li>
              <li>Estimasi proses Refund biasanya memakan waktu antara <strong>3 hingga 14 hari kerja</strong>, bergantung pada metode pembayaran awal yang Anda gunakan (Kartu Kredit/Debet, e-Wallet, atau Bank Transfer).</li>
            </ol>

            <h2 className="text-2xl mt-8 mb-4">4. Bantuan Lanjutan</h2>
            <p className="mb-4">
              Jika Anda telah memenuhi syarat namun dana belum diterima melewati dari 14 hari kerja, silakan hubungi tim dukungan pelanggan kami untuk eskalasi kendala tiket pembayaran Anda.
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-100 flex justify-center">
            <Link href="/" className="px-6 py-3 bg-brand-primary/5 text-brand-primary font-medium rounded-xl hover:bg-brand-primary/10 transition-colors">
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
