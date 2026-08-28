import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Syarat & Ketentuan | Pesanku',
  description: 'Syarat dan Ketentuan layanan Pesanku',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12 border border-gray-100">
          <div className="mb-10 text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight mb-4 text-center">
              Syarat & Ketentuan
            </h1>
            <div className="w-16 h-1 bg-green-500 mx-auto rounded-full mb-4"></div>
            <p className="text-gray-500">Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          
          <div className="prose prose-slate max-w-none text-slate-600 prose-headings:text-slate-800 prose-headings:font-bold prose-a:text-green-600 hover:prose-a:text-green-500">
            <h2 className="text-2xl mt-8 mb-4">1. Pendahuluan</h2>
            <p className="mb-4">
              Selamat datang di Pesanku, platform marketplace pre-order yang menghubungkan antara pembeli dan penjual (UMKM). 
              Dengan mengakses atau menggunakan platform ini, Anda menyetujui untuk terikat dengan Syarat dan Ketentuan berikut. 
              Jika Anda tidak menyetujui syarat-syarat ini, harap untuk tidak menggunakan layanan kami.
            </p>

            <h2 className="text-2xl mt-8 mb-4">2. Akun Pengguna</h2>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Pengguna bertanggung jawab penuh atas keamanan akun dan kata sandi masing-masing.</li>
              <li>Data yang didaftarkan harus valid dan akurat (termasuk nomor WhatsApp aktif).</li>
              <li>Satu informasi identitas hanya diperbolehkan membuat satu jenis akun aktif (Pembeli atau Penjual).</li>
            </ul>

            <h2 className="text-2xl mt-8 mb-4">3. Ketentuan Pemesanan (Pre-Order) & Pembayaran</h2>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Pembeli wajib memenuhi kuota minimum pemesanan (jika ada) sesuai yang ditetapkan oleh Penjual.</li>
              <li>Pesanan dianggap sah apabila pembayaran sudah diverifikasi oleh layanan <em>Payment Gateway</em> yang bekerja sama dengan sistem Pesanku.</li>
              <li>Sistem pembayaran berlaku menggunakan metode yang didukung oleh platform (seperti Virtual Account, e-Wallet, dll).</li>
              <li>Harga yang tertera sudah mengikat setelah Anda melakukan Checkout (tidak ada perubahan harga mendadak).</li>
            </ul>

            <h2 className="text-2xl mt-8 mb-4">4. Kewajiban Penjual</h2>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Penjual wajib menyediakan atau memproduksi pesanan sesuai dengan estimasi waktu atau tanggal pengiriman yang ditentukan.</li>
              <li>Informasi produk, gambar, dan detail spesifikasi harus mendeskripsikan barang asli secara aktual, jujur, dan tidak menipu.</li>
              <li>Penolakan order oleh Penjual (setelah pembayaran lunas) hanya dapat dilakukan dalam keadaan kahar atau jika kapasitas produksi benar-benar tidak mencukupi (uang akan dikembalikan penuh kepada pembeli).</li>
            </ul>

            <h2 className="text-2xl mt-8 mb-4">5. Perubahan Syarat & Ketentuan</h2>
            <p className="mb-4">
              Kami berhak untuk memodifikasi atau mengganti Syarat dan Ketentuan ini sewaktu-waktu. 
              Setiap perubahan material akan diinformasikan kepada pengguna sebelum perubahan tersebut berlaku efektif.
            </p>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-100 flex justify-center">
            <Link href="/" className="px-6 py-3 bg-green-50 text-green-700 font-medium rounded-xl hover:bg-green-100 transition-colors">
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
