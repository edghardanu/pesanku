import { and, eq, like } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getUserFromSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders, products, settings } from '@/lib/schema';

const schedulePrefix = (sellerId: string) => `preorder_schedule:${sellerId}:`;
const validFulfillmentStatuses = ['scheduled', 'preparing', 'ready', 'shipped', 'delivered'] as const;
type FulfillmentStatus = (typeof validFulfillmentStatuses)[number];

type ScheduleValue = {
  deliveryDate: string;
  fulfillmentStatus: FulfillmentStatus;
  scheduleReason: string | null;
  updatedAt: string;
};

const isValidDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
};

const parseSchedule = (value: string): ScheduleValue | null => {
  try {
    const parsed = JSON.parse(value) as Partial<ScheduleValue>;
    if (
      !isValidDate(parsed.deliveryDate)
      || !validFulfillmentStatuses.includes(parsed.fulfillmentStatus as FulfillmentStatus)
    ) return null;

    return {
      deliveryDate: parsed.deliveryDate,
      fulfillmentStatus: parsed.fulfillmentStatus as FulfillmentStatus,
      scheduleReason: typeof parsed.scheduleReason === 'string' && parsed.scheduleReason.trim()
        ? parsed.scheduleReason.trim()
        : null,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch {
    return null;
  }
};

export async function GET() {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'penjual') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const prefix = schedulePrefix(user.id);
    const rows = await db.select().from(settings).where(like(settings.key, `${prefix}%`));
    const schedules = rows.flatMap((row) => {
      const schedule = parseSchedule(row.value);
      if (!schedule) return [];
      return [{ orderId: row.key.slice(prefix.length), ...schedule }];
    });

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('Fetch preorder schedule error:', error);
    return NextResponse.json({ error: 'Gagal memuat jadwal preorder.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'penjual') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json() as {
      orderId?: unknown;
      deliveryDate?: unknown;
      fulfillmentStatus?: unknown;
      scheduleReason?: unknown;
      confirmOrder?: unknown;
    };

    if (typeof body.orderId !== 'string' || !isValidDate(body.deliveryDate)) {
      return NextResponse.json({ error: 'Order dan tanggal pengiriman wajib diisi.' }, { status: 400 });
    }

    if (!validFulfillmentStatuses.includes(body.fulfillmentStatus as FulfillmentStatus)) {
      return NextResponse.json({ error: 'Status pengiriman tidak valid.' }, { status: 400 });
    }

    if (body.scheduleReason !== undefined && body.scheduleReason !== null && typeof body.scheduleReason !== 'string') {
      return NextResponse.json({ error: 'Alasan jadwal tidak valid.' }, { status: 400 });
    }

    const scheduleReason = typeof body.scheduleReason === 'string' ? body.scheduleReason.trim() : '';
    if (scheduleReason.length > 500) {
      return NextResponse.json({ error: 'Alasan jadwal maksimal 500 karakter.' }, { status: 400 });
    }

    const order = await db
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .innerJoin(products, eq(orders.productId, products.id))
      .where(and(eq(orders.id, body.orderId), eq(products.sellerId, user.id)))
      .get();

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan atau bukan milik toko Anda.' }, { status: 404 });
    }

    if (order.status === 'cancelled' || order.status === 'failed') {
      return NextResponse.json({ error: 'Pesanan yang dibatalkan atau gagal tidak dapat dijadwalkan.' }, { status: 400 });
    }

    const confirmOrder = body.confirmOrder === true;
    if (confirmOrder && order.status !== 'waiting_verification') {
      return NextResponse.json({ error: 'Hanya pesanan yang menunggu konfirmasi yang dapat dikonfirmasi.' }, { status: 400 });
    }

    const schedule: ScheduleValue = {
      deliveryDate: body.deliveryDate,
      fulfillmentStatus: body.fulfillmentStatus as FulfillmentStatus,
      scheduleReason: scheduleReason || null,
      updatedAt: new Date().toISOString(),
    };
    const key = `${schedulePrefix(user.id)}${body.orderId}`;

    const newStatus = (order.status === 'waiting_verification') ? 'verified' : order.status;

    await db.transaction(async (tx) => {
      await tx.insert(settings)
        .values({ key, value: JSON.stringify(schedule) })
        .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(schedule) } });

      if (newStatus !== order.status) {
        await tx.update(orders)
          .set({ status: newStatus })
          .where(eq(orders.id, body.orderId as string));
      }
    });

    return NextResponse.json({
      message: confirmOrder
        ? 'Pesanan berhasil dikonfirmasi dan jadwal pengiriman disimpan.'
        : 'Jadwal pengiriman berhasil disimpan.',
      schedule,
      status: newStatus,
    });
  } catch (error) {
    console.error('Update preorder schedule error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan jadwal pengiriman.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'penjual') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID wajib diisi.' }, { status: 400 });
    }

    const ownedOrder = await db
      .select({ id: orders.id })
      .from(orders)
      .innerJoin(products, eq(orders.productId, products.id))
      .where(and(eq(orders.id, orderId), eq(products.sellerId, user.id)))
      .get();

    if (!ownedOrder) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan atau bukan milik toko Anda.' }, { status: 404 });
    }

    await db.delete(settings).where(eq(settings.key, `${schedulePrefix(user.id)}${orderId}`));
    return NextResponse.json({ message: 'Jadwal pengiriman dihapus.' });
  } catch (error) {
    console.error('Delete preorder schedule error:', error);
    return NextResponse.json({ error: 'Gagal menghapus jadwal pengiriman.' }, { status: 500 });
  }
}
