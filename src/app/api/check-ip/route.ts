import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    if (!res.ok) throw new Error('Gagal memanggil API ipify');
    
    const data = await res.json();
    
    return NextResponse.json({ 
      pesan: "Ini adalah IP Outbound dari server Back-End ini",
      ip_outbound_backend: data.ip 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Gagal mengecek IP' }, 
      { status: 500 }
    );
  }
}
