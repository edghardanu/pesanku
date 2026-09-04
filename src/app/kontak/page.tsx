import React from 'react';
import Link from 'next/link';

export const metadata = {
    title: 'Kontak Kami | Pesanku',
    description: 'Hubungi tim Pesanku untuk bantuan atau kerja sama kemitraan',
};

export default function KontakPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
                <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12 border border-gray-100">
                    <div className="mb-12 text-center">
                        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight mb-4 text-center">
                            Hubungi Kami
                        </h1>
                        <div className="w-16 h-1 bg-brand-primary mx-auto rounded-full mb-4"></div>
                        <p className="text-gray-500">Punya pertanyaan, keluhan, atau ide kerja sama? Tim Support kami siap membantu Anda.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 mb-12">
                        <div className="bg-brand-primary/5 p-6 rounded-2xl border border-brand-primary/10">
                            <h3 className="text-lg font-bold text-brand-primary mb-2">Informasi Kontak</h3>
                            <ul className="space-y-4 mt-4 text-slate-600">
                                <li className="flex flex-col xl:flex-row xl:items-start gap-1 xl:gap-0">
                                    <span className="font-bold w-24 shrink-0 text-slate-700">Email Utama:</span>
                                    <a href="mailto:support@pesanku.id" className="text-brand-primary hover:underline font-medium break-all">lamaninstudioindonesiakreasi@gmail.com</a>
                                </li>
                                <li className="flex flex-col xl:flex-row xl:items-start gap-1 xl:gap-0">
                                    <span className="font-bold w-24 shrink-0 text-slate-700">WhatsApp:</span>
                                    <a href="https://wa.me/6281234567890" target="_blank" className="text-brand-primary hover:underline font-medium">+62 852 8612 8625</a>
                                </li>
                                <li className="flex flex-col xl:flex-row xl:items-start gap-1 xl:gap-0">
                                    <span className="font-bold w-24 shrink-0 text-slate-700">Sosial Media:</span>
                                    <span>@lamanin.id (Instagram)</span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-700 mb-2">Alamat Usaha</h3>
                            <p className="text-slate-600 leading-relaxed max-w-sm">
                                Lamanin Studio Indonesia Kreasi<br />
                                Jl. Prima Dalam RT004/RW005,<br />
                                Kecamatan Kalideres,<br />
                                Jakarta Barat, 11820
                            </p>

                            <div className="mt-6 pt-4 border-t border-gray-100">
                                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Jam Operasional CS</h4>
                                <p className="text-slate-600 text-sm">
                                    Senin - Jumat: 09:00 - 17:00 WIB<br />
                                    <span className="text-xs text-slate-400 mt-1 block">Diluar batas jam operasional, silakan tinggalkan pesan chat / email.</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-gray-100 flex justify-center">
                        <Link href="/" className="px-6 py-3 bg-brand-primary/5 text-brand-primary font-medium rounded-xl hover:bg-brand-primary/10 transition-colors">
                            Kembali ke Beranda
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
