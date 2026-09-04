const fs = require('fs');

let r1 = fs.readFileSync('src/app/api/chat/route.ts', 'utf-8');
r1 = r1.replace(/Halo kak! Tadi kakak melakukan pemesanan untuk/g, "Halo kak! Silakan sampaikan Surat Penawaran Anda dengan detail untuk pesanan");
fs.writeFileSync('src/app/api/chat/route.ts', r1, 'utf-8');

let r2 = fs.readFileSync('src/components/ClientSellerDashboard.tsx', 'utf-8');
r2 = r2.replace(/Halo kak! Tadi kakak melakukan pemesanan untuk/g, "Halo kak! Silakan sampaikan Surat Penawaran Anda dengan detail untuk pesanan");
fs.writeFileSync('src/components/ClientSellerDashboard.tsx', r2, 'utf-8');
