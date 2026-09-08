import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Syarat & Ketentuan | Pesanku',
  description: 'Syarat dan Ketentuan layanan Pesanku termasuk mekanisme dan alur penyaluran dana Penjual.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12 border border-gray-100">
          <div className="mb-10 text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight mb-4 text-center">
              Syarat & Ketentuan Layanan Pesanku
            </h1>
            <div className="w-16 h-1 bg-brand-primary mx-auto rounded-full mb-4"></div>
            <p className="text-gray-500 text-sm">
              Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="prose prose-slate max-w-none text-slate-600 prose-headings:text-slate-800 prose-headings:font-bold prose-a:text-brand-primary hover:prose-a:text-brand-primary-hover space-y-6">
            
            <section>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-3 pb-2 border-b border-gray-100">
                1. Pendahuluan
              </h2>
              <p className="leading-relaxed">
                Selamat datang di <strong>Pesanku</strong>, platform marketplace pre-order yang menghubungkan Pembeli dan Penjual (Mitra UMKM).
                Dengan mengakses, mendaftar, atau menggunakan platform Pesanku, Anda menyatakan telah membaca, memahami, dan menyetujui untuk terikat dengan seluruh Syarat dan Ketentuan berikut. Jika Anda tidak menyetujui salah satu poin dalam syarat ini, Anda tidak diperkenankan menggunakan layanan kami.
              </p>
            </section>

            <section>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-3 pb-2 border-b border-gray-100">
                2. Akun Pengguna & Pendaftaran
              </h2>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Pengguna bertanggung jawab penuh atas keamanan akun, username, dan kata sandi masing-masing.</li>
                <li>Data yang didaftarkan (Nama, Email, Nomor WhatsApp, Alamat, dan Rekening Bank) harus valid, jujur, dan akurat.</li>
                <li>Saat pendaftaran akun Penjual, pendaftar diwajibkan menyetujui Syarat dan Ketentuan yang berlaku di platform Pesanku.</li>
                <li>Satu identitas/badan usaha hanya diperbolehkan mendaftarkan satu akun Penjual resmi.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-3 pb-2 border-b border-gray-100">
                3. Ketentuan Pemesanan (Pre-Order) & Pembayaran
              </h2>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Pembeli memesan produk pre-order dengan skema tenggat waktu atau kuota minimum pemesanan yang ditentukan oleh Penjual.</li>
                <li>Pesanan dianggap sah dan diproses setelah pembayaran berhasil diverifikasi melalui layanan <em>sistem pembayaran otomatis</em> resmi mitra Pesanku.</li>
                <li>Pembayaran yang sah dilakukan menggunakan metode resmi yang disediakan oleh platform (Virtual Account, E-Wallet, QRIS, dll).</li>
                <li>Harga barang dan estimasi pengiriman yang telah disetujui saat checkout bersifat mengikat.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-3 pb-2 border-b border-gray-100">
                4. Kewajiban & Hak Penjual
              </h2>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Penjual wajib memproduksi dan mengirimkan pesanan sesuai dengan deskripsi, spesifikasi, dan estimasi waktu yang dijanjikan.</li>
                <li>Informasi produk, foto, dan harga harus mendeskripsikan barang asli secara akurat, transparan, dan tidak menyesatkan.</li>
                <li>Penjual wajib mencantumkan informasi rekening bank atas nama yang sesuai/valid untuk proses penyaluran dana hasil penjualan.</li>
                <li>Penjual tidak diperkenankan meminta pembayaran di luar platform Pesanku.</li>
              </ul>
            </section>

            {/* SECTION 5: ALUR DANA DAN MEKANISME PENYALURAN PEMBAYARAN PENJUAL */}
            <section className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-6 md:p-8 my-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-sm">5</span>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 m-0">
                  Alur Dana & Mekanisme Penyaluran Pembayaran Penjual
                </h2>
              </div>
              
              <p className="text-slate-700 font-medium mb-4 leading-relaxed">
                Pesanku menerapkan mekanisme penampungan dana aman (Escrow) demi menjamin keamanan transaksi bagi Pembeli maupun Penjual. Berikut adalah alur lengkap penerimaan dan penyaluran dana transaksi:
              </p>

              <div className="space-y-4 text-sm md:text-base text-slate-700">
                <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
                  <h3 className="font-bold text-slate-800 text-base mb-1 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">A</span>
                    Penerimaan & Penampungan Dana Transaksi
                  </h3>
                  <p className="leading-relaxed">
                    Saat Pembeli melakukan pembayaran atas pesanan produk pre-order, dana pembayaran akan diterima dan diverifikasi secara otomatis melalui <em>sistem pembayaran terintegrasi</em>. Dana tersebut kemudian ditampung sementara di rekening penampungan resmi platform Pesanku (Sistem Rekening Bersama / Escrow).
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
                  <h3 className="font-bold text-slate-800 text-base mb-1 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">B</span>
                    Proses Verifikasi & Penahanan Sementara
                  </h3>
                  <p className="leading-relaxed">
                    Dana transaksi disimpan dengan aman selama Penjual memproses pesanan dan melakukan pengiriman produk. Penjual dapat memantau status pesanan dan saldo masuk yang tertahan melalui dashboard Penjual di platform Pesanku.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
                  <h3 className="font-bold text-slate-800 text-base mb-1 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">C</span>
                    Mekanisme Penyaluran & Pencairan Dana (Disbursement)
                  </h3>
                  <p className="leading-relaxed">
                    Dana transaksi akan dilepaskan dan disalurkan ke Penjual apabila salah satu kondisi berikut terpenuhi:
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
                    <li>Pembeli telah mengonfirmasi penerimaan barang dalam kondisi baik melalui sistem.</li>
                    <li>Batas waktu otomatisasi konfirmasi penerimaan pesanan oleh sistem telah berakhir tanpa adanya sanggahan dari Pembeli.</li>
                  </ul>
                  <p className="mt-2 leading-relaxed">
                    Setelah pesanan berstatus <strong>Selesai</strong>, dana bersih hasil transaksi secara otomatis atau melalui permintaan penarikan (payout) akan ditransfer/disalurkan langsung ke rekening bank terdaftar milik Penjual.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
                  <h3 className="font-bold text-slate-800 text-base mb-1 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary text-xs flex items-center justify-center font-bold">D</span>
                    Waktu Proses Transfer & Ketentuan Rekening
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Proses transfer/penyaluran dana ke rekening bank Penjual diproses dalam rentang waktu <strong>1x24 jam kerja</strong> sejak transaksi dinyatakan Selesai.</li>
                    <li>Penjual bertanggung jawab memastikan nomor rekening, nama bank, dan nama pemilik rekening terisi dengan benar saat pendaftaran.</li>
                    <li>Pesanku tidak bertanggung jawab atas keterlambatan atau kegagalan transfer yang disebabkan oleh kesalahan input data rekening oleh Penjual atau kendala operasional bank penerima.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-3 pb-2 border-b border-gray-100">
                6. Pembatalan Transaksi & Pengembalian Dana (Refund)
              </h2>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Jika pesanan dibatalkan oleh Penjual karena gagal memenuhi kuota minimum pre-order atau keadaan kahar (force majeure), dana Pembeli akan dikembalikan secara utuh (100%) melalui metode pembayaran asal.</li>
                <li>Apabila timbul sengketa terkait barang yang rusak atau tidak sesuai deskripsi, dana yang ada di sistem penampungan akan ditahan sampai sengketa diselesaikan oleh tim verifikator Pesanku.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-3 pb-2 border-b border-gray-100">
                7. Perubahan Syarat & Ketentuan
              </h2>
              <p className="leading-relaxed">
                Pesanku berhak memodifikasi, menambah, atau memperbarui Syarat dan Ketentuan ini sewaktu-waktu. Setiap perubahan material akan diumumkan melalui platform. Penggunaan layanan secara berkelanjutan menandakan persetujuan Anda terhadap pembaruan Syarat dan Ketentuan tersebut.
              </p>
            </section>

          </div>

          <div className="mt-12 pt-8 border-t border-gray-100 flex justify-center">
            <Link href="/register" className="px-6 py-3 bg-brand-primary text-white font-medium rounded-xl hover:bg-brand-primary-hover transition-colors shadow-md">
              Kembali ke Pendaftaran
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
