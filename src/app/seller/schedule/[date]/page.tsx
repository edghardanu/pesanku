import { db } from "@/lib/db";
import { orders, products, users, settings } from "@/lib/schema";
import { eq, and, like, inArray } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Truck, ChevronLeft, MapPin, UserRound, Phone, StickyNote, Wallet } from "lucide-react";

export const dynamic = 'force-dynamic';

const fulfillmentStyles: Record<string, { label: string; badge: string }> = {
  scheduled: { label: 'Terjadwal', badge: 'bg-blue-500/10 text-blue-700' },
  preparing: { label: 'Disiapkan', badge: 'bg-amber-500/10 text-amber-700' },
  ready: { label: 'Siap Dikirim', badge: 'bg-violet-500/10 text-violet-700' },
  shipped: { label: 'Dikirim', badge: 'bg-cyan-500/10 text-cyan-700' },
  delivered: { label: 'Terkirim', badge: 'bg-emerald-500/10 text-emerald-700' },
};

const formatLongDate = (dateKey: string) => {
  if (!dateKey) return '';
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export default async function ScheduleDetailPage({ params }: { params: Promise<{ date: string }> | { date: string } }) {
  const user = await getUserFromSession();
  if (!user || user.role !== 'penjual') {
    redirect('/login');
  }

  const resolvedParams = await params;
  const date = resolvedParams.date;

  // 1. Fetch schedules from settings for this seller
  const prefix = `preorder_schedule:${user.id}:`;
  const scheduleRows = await db.select().from(settings).where(like(settings.key, `${prefix}%`));
  
  // 2. Parse and filter for the target date
  const targetDateSchedules: { orderId: string; fulfillmentStatus: string; scheduleReason: string | null }[] = [];
  
  for (const row of scheduleRows) {
    try {
      const parsed = JSON.parse(row.value);
      if (parsed.deliveryDate === date) {
        targetDateSchedules.push({
          orderId: row.key.slice(prefix.length),
          fulfillmentStatus: parsed.fulfillmentStatus || 'scheduled',
          scheduleReason: typeof parsed.scheduleReason === 'string' && parsed.scheduleReason.trim()
            ? parsed.scheduleReason.trim()
            : null,
        });
      }
    } catch {}
  }

  // 3. Fetch detailed orders based on orderIds
  const scheduledOrders = targetDateSchedules.length > 0 ? await db.select({
    id: orders.id,
    qty: orders.qty,
    totalPrice: orders.totalPrice,
    status: orders.status,
    selectedVariant: orders.selectedVariant,
    selectedVariantPrice: orders.selectedVariantPrice,
    requestedDeliveryDate: orders.deliveryDate,
    deliveryAddress: orders.deliveryAddress,
    notes: orders.notes,
    productName: products.name,
    buyerName: users.name,
    buyerPhone: users.phone,
  })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .leftJoin(users, eq(orders.buyerId, users.id))
    .where(inArray(orders.id, targetDateSchedules.map(s => s.orderId)))
  : [];
  
  // Merge fulfillment status
  const finalOrders: any[] = scheduledOrders.map(order => ({
    ...order,
    fulfillmentStatus: targetDateSchedules.find(s => s.orderId === order.id)?.fulfillmentStatus || 'scheduled',
    scheduleReason: targetDateSchedules.find(s => s.orderId === order.id)?.scheduleReason || null,
  }));

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-border">
        <div className="container max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/seller" className="p-2 -ml-2 rounded-full hover:bg-border/50 text-text-secondary transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold text-text-primary capitalize">Jadwal Produk</h1>
            <p className="text-xs text-brand-primary font-semibold">{formatLongDate(date)}</p>
          </div>
        </div>
      </header>
      
      <main className="container max-w-4xl mx-auto px-4 py-8">
        {finalOrders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-16 text-center bg-base">
            <Truck className="mx-auto mb-4 h-12 w-12 text-text-secondary/30" />
            <p className="text-base font-semibold text-text-primary">Tidak Ada Pengiriman</p>
            <p className="mt-1 text-sm text-text-secondary">Belum ada pesanan yang dijadwalkan untuk tanggal ini.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {finalOrders.map((order) => {
              const status = order.fulfillmentStatus || 'scheduled';
              const style = fulfillmentStyles[status] || fulfillmentStyles.scheduled;
              return (
                <div key={order.id} className="rounded-xl border border-border bg-base p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-text-primary">{order.productName}</p>
                      {order.selectedVariant && (
                        <p className="mt-0.5 text-xs font-semibold text-brand-primary">
                          Varian: {order.selectedVariant}
                          {order.selectedVariantPrice !== null && order.selectedVariantPrice !== undefined ? ` · Rp ${order.selectedVariantPrice.toLocaleString('id-ID')}` : ''}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-text-secondary font-medium">{order.qty} porsi · {order.id}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${style.badge}`}>{style.label}</span>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-text-secondary bg-surface p-3 rounded-lg border border-border/50">
                    <p className="flex items-center gap-2"><UserRound className="h-4 w-4 shrink-0" /><span className="font-semibold text-text-primary">{order.buyerName || 'Pembeli'}</span></p>
                    {order.buyerPhone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0" />{order.buyerPhone}</p>}
                    {order.deliveryAddress && (
                      <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /><span className="line-clamp-2 leading-relaxed">{order.deliveryAddress}</span></p>
                    )}
                    {order.notes && (
                      <div className="flex items-start gap-2 bg-brand-primary/5 p-2 rounded border border-brand-primary/10 mt-2">
                        <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
                        <span className="italic text-brand-primary-dark line-clamp-3">{order.notes}</span>
                      </div>
                    )}
                    {order.scheduleReason && (
                      <div className="flex items-start gap-2 rounded border border-amber-500/20 bg-amber-500/10 p-2 text-amber-700 dark:text-amber-300">
                        <StickyNote className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Alasan jadwal: {order.scheduleReason}</span>
                      </div>
                    )}
                    <p className="flex items-center gap-2 font-bold text-text-primary pt-1"><Wallet className="h-4 w-4 shrink-0 text-status-success" />Rp {(order.totalPrice || 0).toLocaleString('id-ID')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
