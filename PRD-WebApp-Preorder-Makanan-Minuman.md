# Product Requirement Document (PRD)
## WebApp Penjualan Makanan/Minuman Sistem Preorder

| | |
|---|---|
| **Versi Dokumen** | 1.0 |
| **Tanggal** | 5 Agustus 2026 |
| **Status** | Draft |
| **Pemilik Produk** | - |

---

## 1. Problem Statement

Pelaku UMKM yang menjual makanan/minuman sering kali membutuhkan skema **preorder dengan minimal kuantitas** untuk menjaga efisiensi produksi (misal: produksi baru layak dijalankan bila sudah ada minimal 10 pesanan). Saat ini belum ada platform yang secara khusus memfasilitasi:

- Penjual menentukan **minimal jumlah orderan** (default 10, dapat dikustomisasi) sebelum produk preorder bisa "dibuka" ke pembeli.
- Penjual menentukan **tanggal deadline pemesanan** yang hanya muncul ke pembeli setelah kuantitas minimal diinput.
- Pembayaran dilakukan via **QRIS** yang disediakan oleh admin (bukan QRIS pribadi penjual), sehingga dana tertampung di **saldo admin (escrow)** terlebih dahulu.
- Admin melakukan **pencairan dana ke penjual** setelah dipotong biaya (aplikasi, admin, jasa) secara manual/terverifikasi.

Tanpa sistem ini, penjual UMKM kesulitan mengelola preorder secara manual (lewat chat WhatsApp/Instagram), rawan kesalahan pencatatan jumlah pesanan, deadline, dan rekonsiliasi pembayaran.

---

## 2. Goals

1. Menyediakan **3 role**: Admin, Penjual, Pembeli, dengan hak akses berbeda.
2. Sistem mampu menangani **1.000 pengguna aktif bersamaan atau lebih**.
3. Sistem pembayaran tahap awal menggunakan **QRIS statis milik admin** (gambar barcode diunggah manual oleh admin), belum terintegrasi payment gateway otomatis.
4. Penjual dapat menginput **preorder quantity minimal (default 10, dapat dikustom)**.
5. **Tanggal deadline order tidak akan tampil ke pembeli** apabila penjual belum mengisi preorder quantity — ini adalah *hard dependency* pada alur produk.
6. Admin dapat mengelola saldo, verifikasi pembayaran, dan pencairan dana ke penjual dengan potongan biaya yang transparan.

### Non-Goals (Di Luar Cakupan Versi Ini)
- Payment gateway otomatis (Midtrans/Xendit dsb.) — versi ini QRIS manual.
- Fitur pengiriman/logistik (kurir).
- Live chat antara penjual-pembeli.
- Aplikasi mobile native (hanya web responsif).

---

## 3. Target User

| Role | Deskripsi |
|---|---|
| **Penjual** | Pelaku UMKM makanan/minuman di berbagai daerah yang ingin menjual dengan skema preorder untuk efisiensi produksi. |
| **Pembeli** | Konsumen umum yang ingin memesan produk preorder dari penjual UMKM pilihan mereka. |
| **Admin** | Pengelola platform yang memverifikasi pembayaran, mengelola saldo escrow, mencairkan dana ke penjual, dan mengelola data penjual/produk. |

**Catatan penting:** Produk preorder penjual **baru tampil dan dapat dipesan oleh pembeli** setelah penjual selesai menginput data preorder (quantity minimal). Sebelum itu, produk tidak "hidup" di sisi pembeli.

---

## 4. User Stories

### Sebagai Penjual
- Sebagai penjual, saya ingin mendaftar dan melengkapi profil toko saya agar dapat mulai berjualan.
- Sebagai penjual, saya ingin membuat produk preorder dan menentukan jumlah minimal order serta memilih apakah pakai default (10) atau custom.
- Sebagai penjual, saya ingin menentukan rentang tanggal deadline pemesanan setelah kuantitas minimal ditentukan.
- Sebagai penjual, saya ingin melihat progres jumlah order yang sudah masuk dibanding target minimal.
- Sebagai penjual, saya ingin melihat riwayat pencairan dana dan rincian potongan biaya.

### Sebagai Pembeli
- Sebagai pembeli, saya ingin melihat daftar produk preorder yang tersedia dari penjual UMKM.
- Sebagai pembeli, saya ingin memesan produk dan memilih tanggal deadline yang tersedia (hanya muncul jika penjual sudah mengatur preorder quantity).
- Sebagai pembeli, saya ingin melakukan pembayaran dengan scan QRIS yang ditampilkan di halaman produk.
- Sebagai pembeli, saya ingin mengunggah bukti pembayaran agar admin dapat memverifikasi.
- Sebagai pembeli, saya ingin melihat status pesanan saya (menunggu verifikasi, terkonfirmasi, preorder tercapai/gagal, dsb).

### Sebagai Admin
- Sebagai admin, saya ingin mengelola data pendaftaran penjual (approve/reject).
- Sebagai admin, saya ingin mengunggah/mengelola gambar QRIS yang tampil di halaman produk.
- Sebagai admin, saya ingin memverifikasi bukti pembayaran dari pembeli secara manual.
- Sebagai admin, saya ingin melihat saldo escrow yang terkumpul per penjual.
- Sebagai admin, saya ingin mencairkan saldo ke penjual dengan potongan biaya otomatis (Rp1.500 biaya aplikasi + Rp2.500 biaya admin + Rp5.000 biaya jasa = **Rp9.000 total potongan per transaksi/pencairan**).
- Sebagai admin, saya ingin melihat dashboard ringkasan seluruh transaksi platform.

---

## 5. Functional Requirements (Use Case Breakdown)

Dipecah kecil-kecil per modul untuk meminimalkan risiko bug dan mempermudah testing/QA.

### 5.1 Modul Autentikasi & Role Management
| ID | Use Case | Deskripsi |
|---|---|---|
| AUTH-01 | Registrasi Akun | User baru mendaftar sebagai Pembeli atau mengajukan diri sebagai Penjual |
| AUTH-02 | Login | Login dengan email/no. HP + password |
| AUTH-03 | Verifikasi Email/OTP | Verifikasi akun baru via email atau OTP |
| AUTH-04 | Lupa Password | Reset password via email |
| AUTH-05 | Role-based Access Control | Middleware membatasi akses halaman/API sesuai role (admin/penjual/pembeli) |
| AUTH-06 | Logout | Mengakhiri sesi user |

### 5.2 Modul Penjual — Onboarding & Profil
| ID | Use Case | Deskripsi |
|---|---|---|
| SLR-01 | Registrasi Data Penjual | Input data lengkap: nama toko, nama pemilik, no. HP, alamat, kategori produk, no. rekening/e-wallet untuk pencairan |
| SLR-02 | Upload Dokumen Pendukung | Upload KTP/NIB (opsional, untuk validasi admin) |
| SLR-03 | Status Approval Penjual | Data penjual berstatus "pending" sampai disetujui admin |
| SLR-04 | Edit Profil Toko | Penjual dapat mengubah data profil setelah disetujui |

### 5.3 Modul Penjual — Manajemen Produk Preorder
| ID | Use Case | Deskripsi |
|---|---|---|
| PRD-01 | Tambah Produk | Input nama produk, deskripsi, harga, foto, kategori |
| PRD-02 | Input Preorder Quantity Minimal | Default 10, dapat diubah (custom) oleh penjual |
| PRD-03 | Validasi Dependency Deadline | Sistem **mengunci/menyembunyikan** input tanggal deadline ke pembeli selama PRD-02 belum diisi |
| PRD-04 | Input Tanggal Deadline Preorder | Setelah quantity minimal terisi, penjual menentukan tanggal buka & tutup preorder |
| PRD-05 | Edit Produk | Ubah data produk (harga, foto, deskripsi) sebelum ada order masuk; dibatasi setelah order berjalan |
| PRD-06 | Nonaktifkan/Hapus Produk | Produk yang sudah punya order tidak bisa dihapus, hanya dinonaktifkan |
| PRD-07 | Lihat Progres Preorder | Penjual melihat jumlah order masuk vs target minimal secara real-time |
| PRD-08 | Status Preorder | Sistem otomatis mengubah status produk: `Draft` → `Aktif/Menunggu Kuota` → `Kuota Tercapai` → `Preorder Ditutup (Deadline)` → `Diproses` → `Selesai` |

### 5.4 Modul Pembeli — Katalog & Order
| ID | Use Case | Deskripsi |
|---|---|---|
| BUY-01 | Lihat Katalog Produk | Pembeli melihat daftar produk preorder aktif dari berbagai penjual |
| BUY-02 | Lihat Detail Produk | Detail produk termasuk progres kuota, tanggal deadline (jika tersedia), harga |
| BUY-03 | Pilih Tanggal Deadline | Hanya aktif/terlihat bila PRD-04 sudah diisi penjual |
| BUY-04 | Checkout / Buat Order | Pembeli input jumlah pesanan, catatan tambahan |
| BUY-05 | Tampilkan QRIS Admin | Sistem menampilkan gambar QRIS milik admin di halaman pembayaran (bukan QRIS penjual) |
| BUY-06 | Upload Bukti Bayar | Pembeli upload screenshot bukti transfer/pembayaran |
| BUY-07 | Lihat Status Order | Status: `Menunggu Verifikasi` → `Terverifikasi` → `Preorder Berjalan` → `Preorder Gagal (kuota tidak tercapai)` / `Diproses` → `Selesai` |
| BUY-08 | Riwayat Order | Pembeli melihat riwayat seluruh pesanan |
| BUY-09 | Notifikasi | Notifikasi email/in-app saat status order berubah |

### 5.5 Modul Admin — Manajemen Penjual
| ID | Use Case | Deskripsi |
|---|---|---|
| ADM-01 | Review & Approve/Reject Penjual | Admin meninjau data pendaftaran penjual |
| ADM-02 | Kelola Data Penjual | Lihat, edit, nonaktifkan akun penjual |
| ADM-03 | Kelola Kategori Produk | Admin mengatur master kategori produk |

### 5.6 Modul Admin — Pembayaran & Saldo (Escrow)
| ID | Use Case | Deskripsi |
|---|---|---|
| PAY-01 | Upload/Kelola QRIS Admin | Admin mengunggah gambar barcode QRIS yang akan tampil di semua halaman produk |
| PAY-02 | Verifikasi Bukti Pembayaran | Admin cek manual bukti bayar dari pembeli, approve/reject |
| PAY-03 | Update Saldo Escrow | Setelah verifikasi, dana otomatis tercatat sebagai saldo penjual (masih ditahan admin) |
| PAY-04 | Dashboard Saldo per Penjual | Admin melihat saldo terkumpul tiap penjual |
| PAY-05 | Hitung Potongan Biaya | Sistem otomatis menghitung: Biaya Aplikasi Rp1.500 + Biaya Admin Rp2.500 + Biaya Jasa Rp5.000 |
| PAY-06 | Proses Pencairan Dana | Admin memproses pencairan ke rekening/e-wallet penjual, sistem generate bukti pencairan |
| PAY-07 | Riwayat Transaksi Penjual | Penjual & admin dapat melihat riwayat lengkap transaksi dan pencairan |
| PAY-08 | Rekonsiliasi Preorder Gagal | Jika kuota minimal tidak tercapai sampai deadline, sistem menandai order untuk proses refund (kebijakan refund perlu didefinisikan terpisah) |

### 5.7 Modul Admin — Dashboard & Laporan
| ID | Use Case | Deskripsi |
|---|---|---|
| RPT-01 | Dashboard Ringkasan | Total penjual, total pembeli, total transaksi, total saldo escrow |
| RPT-02 | Laporan Transaksi | Export laporan transaksi per periode |
| RPT-03 | Log Aktivitas Admin | Audit trail semua aksi verifikasi/pencairan yang dilakukan admin |

---

## 6. Business Rules Penting

1. **Dependency Kuota → Deadline**: Field tanggal deadline preorder **tidak dapat diisi** oleh penjual sebelum field jumlah minimal order (preorder quantity) diisi. Field ini juga **tidak akan tampil ke pembeli** selama kondisi tersebut belum terpenuhi.
2. **Kuota Minimal Default**: 10 order, dapat dikustomisasi oleh penjual per produk.
3. **Skema Biaya Pencairan** (dipotong dari total saldo yang dicairkan ke penjual):
   - Biaya Aplikasi: **Rp1.500**
   - Biaya Admin: **Rp2.500**
   - Biaya Jasa: **Rp5.000**
   - **Total potongan: Rp9.000** per transaksi pencairan *(perlu dikonfirmasi: apakah potongan ini per order/per pembeli, atau flat per pencairan batch ke penjual — lihat bagian "Open Questions")*
4. Dana dari pembeli **selalu masuk ke saldo admin (escrow)** terlebih dahulu, tidak langsung ke penjual.
5. Pencairan ke penjual dilakukan **secara manual oleh admin** setelah verifikasi (bukan otomatis/real-time).
6. Produk preorder yang tidak mencapai kuota minimal hingga deadline akan berstatus "Preorder Gagal" dan memerlukan alur refund.

---

## 7. Non-Functional Requirements

| Kategori | Requirement |
|---|---|
| **Performa** | Response time API < 200ms (untuk operasi baca/tulis standar, di luar upload gambar) |
| **Skalabilitas** | Mendukung minimal 1.000 concurrent users |
| **Availability** | Uptime 99.9% (downtime maksimal ~8.76 jam/tahun) |
| **Responsivitas** | UI responsif di Desktop, Mobile, dan Tablet (mobile-first design) |
| **Keamanan** | - Enkripsi password (bcrypt/argon2)<br>- HTTPS wajib di seluruh endpoint<br>- Rate limiting untuk mencegah brute force<br>- Validasi & sanitasi input (mencegah SQL Injection/XSS)<br>- RBAC ketat antar role<br>- Audit log untuk aksi sensitif (verifikasi pembayaran, pencairan dana)<br>- Secure file upload (validasi tipe & ukuran file bukti bayar/QRIS) |
| **Skalabilitas Data** | Database perlu didesain agar query performa tetap stabil walau data transaksi bertambah besar |
| **Observability** | Logging & monitoring error (misal Sentry) serta uptime monitoring |

---

## 8. Scope (Versi Awal / MVP)

### In-Scope
- Registrasi data penjual dengan kolom input lengkap (nama toko, pemilik, kontak, alamat, kategori, rekening pencairan).
- Data penjual masuk ke halaman admin untuk direview/diapprove.
- Manajemen produk preorder oleh penjual (termasuk aturan dependency kuota-deadline).
- Alur pemesanan & pembayaran manual via QRIS admin.
- Verifikasi pembayaran manual oleh admin.
- Pengelolaan saldo escrow dan pencairan dana dengan potongan biaya.
- Dashboard admin dasar.

### Out-of-Scope (Fase Berikutnya)
- Payment gateway otomatis.
- Sistem refund otomatis.
- Rating & review produk/penjual.
- Multi-bahasa.
- Aplikasi mobile native.

### Tech Stack
| Layer | Teknologi |
|---|---|
| Frontend & Backend (Fullstack) | Next.js |
| Database | Turso (libSQL) |
| Media Storage | Cloudinary (upload foto produk, bukti bayar, QRIS) |
| Deployment | Vercel |

---

## 9. Data Model (Draft Awal)

Entitas utama yang perlu ada di database:

- **User** (id, nama, email, no_hp, password_hash, role[admin/penjual/pembeli], status, created_at)
- **SellerProfile** (id, user_id, nama_toko, alamat, kategori, no_rekening, status_approval)
- **Product** (id, seller_id, nama, deskripsi, harga, foto_url, preorder_min_qty, deadline_date, status)
- **Order** (id, product_id, buyer_id, qty, total_harga, tanggal_pilih_deadline, status)
- **Payment** (id, order_id, bukti_bayar_url, status_verifikasi, verified_by, verified_at)
- **SellerBalance** (id, seller_id, saldo_tertahan, saldo_tercairkan)
- **Payout** (id, seller_id, jumlah_dicairkan, biaya_aplikasi, biaya_admin, biaya_jasa, total_potongan, status, processed_by, processed_at)
- **AdminQRIS** (id, image_url, aktif, updated_at)
- **AuditLog** (id, admin_id, aksi, target_entity, target_id, timestamp)

---

## 10. Open Questions (Perlu Klarifikasi Sebelum Development)

1. Apakah potongan biaya Rp1.500 + Rp2.500 + Rp5.000 dikenakan **per order/pembeli** atau **flat per pencairan** ke penjual (misal 1x pencairan mencakup banyak order)?
2. Bagaimana kebijakan **refund** bila preorder gagal mencapai kuota minimal sampai deadline? Apakah dana dikembalikan penuh ke pembeli, atau ada potongan?
3. Apakah pembeli bisa **membatalkan order** sebelum deadline, dan bagaimana dampaknya ke progres kuota?
4. Apakah satu penjual bisa punya **banyak produk preorder aktif sekaligus**?
5. Apakah perlu ada **batas waktu verifikasi** pembayaran oleh admin (SLA), mengingat prosesnya manual?
6. Bagaimana jika kuota preorder terlampaui (misal target 10, tapi order masuk 15) — apakah tetap diterima semua atau dibatasi?
7. Apakah dibutuhkan fitur **notifikasi WhatsApp** selain email/in-app, mengingat target user UMKM lebih terbiasa dengan WA?

---

## 11. Metrics of Success

- Jumlah penjual UMKM aktif terdaftar & disetujui.
- Jumlah preorder yang berhasil mencapai kuota minimal (success rate).
- Rata-rata waktu verifikasi pembayaran oleh admin.
- Tingkat retensi pembeli (repeat order).
- Response time API rata-rata < 200ms tercapai di production.
