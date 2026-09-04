const fs = require('fs');

const NEW_TEXT = 'Halo kak! Pesanan untuk <b>${orderData.productName}</b> sudah kami terima. Jika kakak ingin mengajukan penawaran (nego harga, porsi, atau waktu pengiriman), silakan klik icon lampiran (📎) lalu pilih <b>Surat Penawaran</b> ya.';
const NEW_TEXT_SELLER = 'Halo kak! Pesanan untuk <b>${productName}</b> sudah kami terima. Jika kakak ingin mengajukan penawaran (nego harga, porsi, atau waktu pengiriman), silakan klik icon lampiran (📎) lalu pilih <b>Surat Penawaran</b> ya.';

let r1 = fs.readFileSync('src/app/api/chat/route.ts', 'utf-8');
r1 = r1.replace(/Halo kak! Silakan sampaikan Surat Penawaran Anda dengan detail untuk pesanan.*?<\/b>[^\r\n]*/g, NEW_TEXT);
fs.writeFileSync('src/app/api/chat/route.ts', r1, 'utf-8');

let r2 = fs.readFileSync('src/components/ClientSellerDashboard.tsx', 'utf-8');
r2 = r2.replace(/Halo kak! Silakan sampaikan Surat Penawaran Anda dengan detail untuk pesanan.*?<\/b>[^\r\n]*/g, NEW_TEXT_SELLER);
fs.writeFileSync('src/components/ClientSellerDashboard.tsx', r2, 'utf-8');
