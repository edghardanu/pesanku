"use client";

import { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock3, Megaphone, Package, Sparkles } from 'lucide-react';
import Swal from 'sweetalert2';

import { formatPromotionDeadline, formatRupiah, getPromotionCountdown } from '@/lib/promotionFormatting';
import { PromotionOfferItem, PromotionRequestItem, PromotionRequestStatus } from '@/types';

type SellerProductOption = { id: string; name: string };

type SellerPromotionCenterProps = {
  offers: PromotionOfferItem[];
  initialRequests: PromotionRequestItem[];
  products: SellerProductOption[];
};

const statusLabel: Record<PromotionRequestStatus, string> = {
  pending: 'Menunggu persetujuan admin',
  approved: 'Aktif — tampil paling atas',
  rejected: 'Ditolak admin',
  cancelled: 'Dibatalkan',
};

const statusStyle: Record<PromotionRequestStatus, string> = {
  pending: 'bg-status-warning/10 text-status-warning border-status-warning/20',
  approved: 'bg-status-success/10 text-status-success border-status-success/20',
  rejected: 'bg-status-error/10 text-status-error border-status-error/20',
  cancelled: 'bg-border/60 text-text-secondary border-border',
};

export default function SellerPromotionCenter({ offers, initialRequests, products }: SellerPromotionCenterProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, string>>({});
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const initialization = window.setTimeout(() => setNow(Date.now()), 0);
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.clearTimeout(initialization);
      window.clearInterval(interval);
    };
  }, []);

  const submitRequest = async (offer: PromotionOfferItem) => {
    const productId = selectedProducts[offer.id];
    if (!productId) {
      await Swal.fire('Pilih produk', 'Pilih produk yang ingin dipromosikan terlebih dahulu.', 'info');
      return;
    }

    setBusyOfferId(offer.id);
    try {
      const response = await fetch('/api/seller/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promotionId: offer.id, productId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal mengajukan promosi.');
      setRequests((current) => [data.promotionRequest, ...current]);
      setSelectedProducts((current) => ({ ...current, [offer.id]: '' }));
      await Swal.fire({ icon: 'success', title: 'Pengajuan terkirim', text: 'Admin akan meninjau produk Anda.', timer: 1800, showConfirmButton: false });
    } catch (error) {
      await Swal.fire('Gagal', error instanceof Error ? error.message : 'Gagal mengajukan promosi.', 'error');
    } finally {
      setBusyOfferId(null);
    }
  };

  return (
    <div className="space-y-7">
      <div className="rounded-2xl border border-brand-primary/20 p-5 sm:p-7" style={{ backgroundImage: 'linear-gradient(135deg, rgba(224, 86, 56, 0.10), transparent 55%, rgba(244, 162, 97, 0.12))' }}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl"><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-primary px-3 py-1 text-xs font-bold text-white"><Megaphone className="h-4 w-4" /> Promosi Produk</div><h1 className="text-h1 mb-2">Jangkau lebih banyak pembeli</h1><p className="text-body-base text-text-secondary">Pilih penawaran dari admin dan ajukan satu produk. Setelah disetujui, produk tampil paling atas pada “Rekomendasi Untuk Kamu” dengan label <strong className="text-text-primary">Paling Populer</strong> hingga deadline.</p></div>
          <div className="min-w-[220px] rounded-2xl border border-brand-secondary/30 bg-surface p-4 shadow-sm"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Tampilan di katalog</p><span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold text-white shadow-sm" style={{ backgroundImage: 'linear-gradient(to right, #f97316, var(--color-brand-primary))' }}><Sparkles className="h-4 w-4" /> Paling Populer</span></div>
        </div>
      </div>

      <section>
        <div className="mb-4"><h2 className="text-h3">Penawaran Tersedia</h2><p className="mt-1 text-sm text-text-secondary">Harga berikut adalah tarif penawaran. Aktivasi tetap menunggu persetujuan admin.</p></div>
        {offers.length === 0 ? (
          <div className="card border border-dashed border-border p-10 text-center"><CalendarClock className="mx-auto mb-3 h-10 w-10 text-text-secondary/50" /><p className="font-semibold">Belum ada penawaran aktif</p><p className="mt-1 text-sm text-text-secondary">Silakan periksa kembali setelah admin menerbitkan paket baru.</p></div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {offers.map((offer) => {
              const selectedProductId = selectedProducts[offer.id] || '';
              const offerExpired = now > 0 && new Date(offer.expiresAt).getTime() <= now;
              const selectedProductHasOpenRequest = requests.some((request) => request.productId === selectedProductId && (request.status === 'pending' || (request.status === 'approved' && new Date(request.expiresAt).getTime() > now)));
              return <article key={offer.id} className="card flex flex-col overflow-hidden border border-brand-primary/20 p-0">
                <div className="p-5 text-white" style={{ backgroundImage: 'linear-gradient(to right, var(--color-brand-primary), #f97316)' }}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-white/80">Paket promosi</p><h3 className="mt-1 text-xl font-black">{offer.name}</h3></div><Sparkles className="h-7 w-7 shrink-0" /></div><p className="mt-4 text-3xl font-black">{formatRupiah(offer.price)}</p></div>
                <div className="flex flex-1 flex-col p-5"><div className="space-y-2 text-sm"><p className="flex gap-2 text-text-primary"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" /><span>{formatPromotionDeadline(offer.expiresAt)}</span></p><p className="flex items-center gap-2 font-semibold text-brand-primary"><Clock3 className="h-4 w-4" />{getPromotionCountdown(offer.expiresAt, now)}</p></div><label className="mt-5 block border-t border-border pt-5"><span className="mb-2 block text-sm font-semibold text-text-primary">Produk yang dipromosikan</span><select className="input-field w-full" value={selectedProductId} onChange={(event) => setSelectedProducts((current) => ({ ...current, [offer.id]: event.target.value }))}><option value="">Pilih produk Anda</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>{selectedProductHasOpenRequest && <p className="mt-2 text-xs font-semibold text-status-warning">Produk ini masih memiliki pengajuan atau promosi aktif.</p>}{offerExpired && <p className="mt-2 text-xs font-semibold text-status-error">Masa penawaran ini telah berakhir.</p>}<button type="button" onClick={() => submitRequest(offer)} disabled={!selectedProductId || selectedProductHasOpenRequest || offerExpired || busyOfferId === offer.id || products.length === 0} className="btn-primary mt-4 flex w-full items-center justify-center gap-2"><Megaphone className="h-4 w-4" />{busyOfferId === offer.id ? 'Mengirim…' : 'Ajukan Produk'}</button></div>
              </article>;
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4"><h2 className="text-h3">Riwayat Pengajuan</h2><p className="mt-1 text-sm text-text-secondary">Pantau status promosi produk yang sudah Anda ajukan.</p></div>
        {requests.length === 0 ? (
          <div className="card border border-dashed border-border p-10 text-center"><Package className="mx-auto mb-3 h-10 w-10 text-text-secondary/50" /><p className="font-semibold">Belum ada pengajuan promosi</p></div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {requests.map((request) => {
              const status = request.status ?? 'pending';
              const expired = now > 0 && new Date(request.expiresAt).getTime() <= now;
              return <article key={request.id} className="card border border-border p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-bold text-text-primary">{request.productName}</p><p className="mt-1 text-sm text-text-secondary">{request.offerName} · {formatRupiah(request.offerPrice)}</p></div><CheckCircle2 className={`h-5 w-5 shrink-0 ${status === 'approved' && !expired ? 'text-status-success' : 'text-text-secondary'}`} /></div><p className="mt-3 text-xs text-text-secondary">Berakhir {formatPromotionDeadline(request.expiresAt)}</p><span className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${expired && status === 'approved' ? statusStyle.cancelled : statusStyle[status]}`}>{expired && status === 'approved' ? 'Promosi telah berakhir' : statusLabel[status]}</span></article>;
            })}
          </div>
        )}
      </section>
    </div>
  );
}
