# Design System & Technical UI Specification (`design.md`)

**Proyek:** WebApp Preorder Makanan & Minuman UMKM  
**Versi:** 1.0  
**Tanggal:** 5 Agustus 2026  
**Status:** Approved Draft  

---

## 1. Design Philosophy & Direction

Desain aplikasi ini mengusung konsep **Modern Warm E-Commerce**. Karena berfokus pada makanan dan minuman UMKM, tampilan visual harus menumbuhkan rasa percaya (*trust*), rasa hangat (*warmth*), dan membangkitkan selera makan (*appetizing*), tanpa mengorbankan fungsionalitas transaksi e-commerce modern.

### Prinsip Utama Visual:
1. **Clean & Uncluttered**: Tata letak rapi, whitespace memadai, fokus penuh pada foto produk makanan/minuman berkualitas tinggi.
2. **Visual Hierarchy & Micro-Progress**: Penekanan visual pada status progress preorder (kuota terisi vs target kuota minimal).
3. **Clarity over Complexity**: Komponen form dan checkout dibuat sangat jelas, intuitif, dan tidak membingungkan pengguna awam.
4. **Mobile-First Approach**: Pengalaman belanja optimal di layar ponsel tanpa mengurangi kenyamanan di layar desktop.

---

## 2. Color Palette System

Perpaduan warna mengombinasikan warna hangat (*Warm Terracotta/Amber*) untuk membangkitkan selera dan memberikan kesan ramah, dengan warna netral modern (*Slate/Cream*) untuk keterbacaan yang optimal.

```
+-----------------------------------------------------------------------+
|  Primary         |  Secondary       |  Accent          | Neutral Dark |
|  #E05638         |  #F4A261         |  #2A9D8F         | #1E293B      |
|  (Terracotta)    |  (Warm Amber)    |  (Teal/Mint)     | (Slate 800)  |
+-----------------------------------------------------------------------+
```

### 2.1 Color Tokens

| Token Name | Color Code (HEX) | TailWind Equivalent | Penggunaan Utama |
|---|---|---|---|
| **Brand Primary** | `#E05638` | `rose-600` / `custom` | Tombol CTA utama, badge kuota aktif, highlight harga |
| **Brand Primary Hover** | `#C84327` | `rose-700` | Hover state tombol utama |
| **Brand Secondary** | `#F4A261` | `amber-400` | Accent bar progress kuota, status badge "Menunggu Kuota" |
| **Brand Accent** | `#2A9D8F` | `teal-600` | Badge "Kuota Tercapai", indikator verifikasi sukses |
| **Background Base** | `#FAFAF9` | `stone-50` | Latar belakang seluruh halaman web |
| **Background Surface** | `#FFFFFF` | `white` | Latar belakang kartu produk, kontainer form, modal |
| **Text Primary** | `#1E293B` | `slate-800` | Judul, nama produk, teks utama |
| **Text Secondary** | `#64748B` | `slate-500` | Deskripsi produk, label sekunder, timestamp |
| **Border / Divider** | `#E2E8F0` | `slate-200` | Garis batas kartu, pemisah section |
| **Status Success** | `#10B981` | `emerald-500` | Pembayaran terverifikasi, preorder diproses |
| **Status Warning** | `#F59E0B` | `amber-500` | Menunggu pembayaran / verifikasi admin |
| **Status Error/Alert**| `#EF4444` | `red-500` | Preorder gagal, batas waktu habis, penolakan |

---

## 3. Typography System

Menggunakan **Plus Jakarta Sans** atau **Inter** sebagai antarmuka font sans-serif modern yang sangat mudah dibaca (*legible*) di layar HP maupun monitor.

### Scale Hierarchy:

| Hierarchy | Size (rem/px) | Weight | Line Height | Usage |
|---|---|---|---|---|
| **Display 1** | 2.25rem (36px) | Bold (700) | 1.2 | Hero Banner, Landing Title |
| **Heading 1 (H1)** | 1.875rem (30px) | Bold (700) | 1.25 | Judul Halaman Utama (Katalog, Dashboard) |
| **Heading 2 (H2)** | 1.5rem (24px) | SemiBold (600) | 1.3 | Judul Section, Judul Modal, Nama Produk Detail |
| **Heading 3 (H3)** | 1.25rem (20px) | SemiBold (600) | 1.4 | Card Title, Sub-section |
| **Body Large** | 1.125rem (18px) | Medium (500) | 1.5 | Harga Produk, Headline Pendek |
| **Body Base** | 1rem (16px) | Regular (400) | 1.5 | Teks Paragraf Utama, Deskripsi Produk |
| **Body Small** | 0.875rem (14px) | Regular (400) | 1.4 | Label Form, Helper Text, Badges |
| **Caption** | 0.75rem (12px) | Medium (500) | 1.4 | Status Badge, Info Timestamp, Footer Text |

---

## 4. UI Components & Visual Guidelines

### 4.1 Card Produk Preorder (Katalog Pembeli)
Kartu produk memuat komponen visual progres kuota yang mencolok agar pembeli terdorong untuk segera memesan.

- **Thumbnail Image**: Aspect ratio 4:3 dengan `border-radius: 12px`, dilengkapi efek zoom halus saat di-hover.
- **Badge Status Preorder** (Pojok Kiri Atas Gambar):
  - `Terbuka`: Background Amber Muda (`#FEF3C7`), Teks Amber Tua.
  - `Kuota Tercapai`: Background Teal Muda (`#CCFBF1`), Teks Teal Tua.
- **Progress Bar Preorder** (Elemen Kunci):
  - Progress bar dengan animasi transisi.
  - Teks terintegrasi: `"Terkumpul: 7 / 10 Min. Order"`.
- **Elemen Tanggal Deadline**:
  - *Skenario A (Penjual belum isi min. qty)*: Komponen tanggal **disembunyikan sepenuhnya** (tidak muncul di UI).
  - *Skenario B (Penjual sudah isi min. qty & deadline)*: Menampilkan teks icon kalender `Deadline: 12 Agu 2026`.

### 4.2 Form Input Produk (Sisi Penjual) - *Dependency Logic Visual*
Visual UI form untuk mengimplementasikan *hard dependency* antara Minimal Kuota dan Tanggal Deadline:

```
[ Step 1: Informasi Produk ]
- Nama Produk [ Textfield ]
- Harga (Rp)   [ Numberfield ]
- Upload Foto  [ Dropzone Area ]

[ Step 2: Pengaturan Preorder ]
- Preorder Quantity Minimal:
  (*) Default (10 Pcs)   ( ) Custom [ Input Qty ]

--------------------------------------------------------------
( BILA STEP 2 BELUM DIISI / BELUM DISIMPANKAN )
[!] Rentang Tanggal Deadline (Terkunci / Disabled)
    "Silakan tentukan minimal kuantitas preorder terlebih dahulu 
     untuk membuka pengaturan tanggal deadline."
--------------------------------------------------------------

( BILA STEP 2 SUDAH DIISI )
[v] Rentang Tanggal Preorder (Aktif)
    [ Tanggal Buka Preorder ]  s/d  [ Tanggal Tutup Preorder ]
```

### 4.3 Checkout & QRIS Admin Modal (Sisi Pembeli)
- **Instruksi Jelas**: "Scan QRIS di bawah ini melalui aplikasi M-Banking atau E-Wallet pilihan Anda".
- **Container Barcode**: QRIS Admin ditampilkan di dalam container putih dengan border `2px dashed #E05638`, dilengkapi tombol "Download QRIS".
- **Detail Rincian Pembayaran**:
  - Subtotal Pesanan
  - Kode Unik (opsional untuk verifikasi)
  - **Total Pembayaran (Bold)**
- **Upload Area Bukti Bayar**: Drag-and-drop file uploader dengan *live preview* gambar sebelum dikirim.

### 4.4 Modul Verifikasi & Escrow (Sisi Admin)
- **Table Layout**: Kolom berdampingan menampilkan Gambar Bukti Bayar vs Detail Transaksi.
- **Action Buttons**:
  - Tombol **Setujui Pembayaran** (Hijau Solid).
  - Tombol **Tolak** (Merah Outline dengan input alasan penolakan).
- **Rincian Potongan Fee Pencairan (Payout Breakdown Modal)**:
  - Total Saldo Kotor: `Rp 500.000`
  - Potongan Fee Aplikasi: `- Rp 1.500`
  - Potongan Fee Admin: `- Rp 2.500`
  - Potongan Fee Jasa: `- Rp 5.000`
  - **Total Bersih Diterima Penjual**: `Rp 491.000`

---

## 5. Responsive Layout & User Experience (UX) Flow

### 5.1 Breakpoints (Tailwind standard)
- **Mobile (`sm`)**: `< 640px` (Layout 1 kolom, Bottom Navigation Bar untuk Mobile Penjual/Pembeli).
- **Tablet (`md`)**: `640px - 1024px` (Grid 2 kolom untuk katalog produk).
- **Desktop (`lg/xl`)**: `> 1024px` (Grid 3-4 kolom untuk katalog, Side Navigation Bar untuk Dashboard Admin/Penjual).

### 5.2 Key UX Flows & States

```
[ Draft Produk (Penjual) ]
        │
        ▼ (Isi Min. Qty & Deadline)
[ Produk Aktif / Menunggu Kuota ] ──► (Tampil di Katalog Pembeli)
        │
        ├──► [ Kuota Tercapai ] ──► (Penjual Mulai Produksi)
        │
        └──► [ Kuota Tidak Tercapai (Deadline) ] ──► [ Status: Preorder Gagal ]
                                                             │
                                                             ▼
                                                    (Proses Refund Admin)
```

### 5.3 Empty & Loading States
- **Skeleton Loader**: Digunakan pada kartu produk saat fetching data katalog untuk mencegah Cumulative Layout Shift (CLS).
- **Empty State Katalog**: Ilustrasi makanan/keranjang kosong dengan pesan hangat: *"Belum ada preorder makanan yang buka hari ini. Cek kembali nanti ya!"*.
- **Empty State Saldo/Order**: Tampilan tabel bersih dengan tombol tindakan utama (*Primary CTA*).

---

## 6. Accessibility & Micro-Interactions

1. **Contrast Ratio**: Kombinasi warna teks `#1E293B` di atas background `#FAFAF9` memenuhi standar WCAG AA (Rasio Kontras > 7:1).
2. **Interactive States**: Semua tombol wajib memiliki visual state yang jelas (`Default`, `Hover`, `Active/Pressed`, `Disabled`, `Loading spinner`).
3. **Touch Targets**: Luas area sentuh pada komponen mobile minimal **44x44 pixel** untuk memudahkan navigasi jari.
4. **Toast Notifications**: Notifikasi pop-up di pojok kanan atas untuk memberikan feedback instan (misal: "Bukti pembayaran berhasil diunggah!").
