"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  Info,
  MapPin,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  Trash2,
  User,
  UserRound,
} from 'lucide-react';
import Swal from 'sweetalert2';

import ProductRating from '@/components/ProductRating';
import { getProductUnitPrice } from '@/lib/productVariants';
import { AuthUser, ProductItem } from '@/types';

type StoreView = {
  id: string;
  ownerName: string;
  storeName: string;
  address: string | null;
  category: string | null;
  logoUrl: string | null;
  description?: string | null;
  approvalStatus: string | null;
  createdAt?: Date | null;
};

type CartLine = {
  qty: number;
  notes: string;
  selectedVariant: string;
};

const formatRupiah = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const isProductClosed = (product: ProductItem) => {
  const deadline = product.deadlineDate ? new Date(product.deadlineDate) : null;
  const deadlinePassed = Boolean(deadline && !Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now());
  return ['closed', 'processing', 'completed'].includes(product.status || '') || deadlinePassed;
};

export default function ClientStoreProfile({
  seller,
  products,
  showCatalog,
  user,
}: {
  seller: StoreView;
  products: ProductItem[];
  showCatalog: boolean;
  user: AuthUser | null;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [variantSelections, setVariantSelections] = useState<Record<string, string>>({});
  const storeDescription = seller.description?.trim();
  const joinedYear = seller.createdAt ? new Date(seller.createdAt).getFullYear() : null;
  const cartProducts = useMemo(
    () => products.filter((product) => cart[product.id]),
    [cart, products],
  );
  const totalItems = cartProducts.reduce((total, product) => total + cart[product.id].qty, 0);
  const totalPrice = cartProducts.reduce((total, product) => total + (
    getProductUnitPrice(product.price, product.variants, cart[product.id].selectedVariant) * cart[product.id].qty
  ), 0);

  const addProduct = (product: ProductItem) => {
    if (isProductClosed(product)) {
      void Swal.fire('Preorder Ditutup', `${product.name} belum dapat dipesan.`, 'warning');
      return;
    }

    setCart((current) => ({
      ...current,
      [product.id]: current[product.id] || {
        qty: 1,
        notes: '',
        selectedVariant: variantSelections[product.id] || '',
      },
    }));
  };

  const changeQty = (productId: string, delta: number) => {
    setCart((current) => {
      const line = current[productId];
      if (!line) return current;
      return {
        ...current,
        [productId]: { ...line, qty: Math.max(1, line.qty + delta) },
      };
    });
  };

  const removeProduct = (productId: string) => {
    setCart((current) => {
      const next = { ...current };
      delete next[productId];
      return next;
    });
  };

  const selectVariant = (productId: string, selectedVariant: string) => {
    setVariantSelections((current) => ({ ...current, [productId]: selectedVariant }));
    setCart((current) => current[productId]
      ? { ...current, [productId]: { ...current[productId], selectedVariant } }
      : current);
  };

  const checkout = async () => {
    if (cartProducts.length === 0) {
      await Swal.fire('Keranjang Kosong', 'Tambahkan produk sebelum melanjutkan checkout.', 'info');
      return;
    }

    if (!user) {
      const result = await Swal.fire({
        title: 'Login Diperlukan',
        text: 'Silakan login sebagai pembeli untuk melanjutkan checkout.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Masuk Sekarang',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#ff5c35',
      });
      if (result.isConfirmed) router.push('/login');
      return;
    }

    if (user.role !== 'pembeli') {
      await Swal.fire('Akses Ditolak', 'Hanya akun pembeli yang dapat melakukan checkout.', 'warning');
      return;
    }

    const summary = cartProducts.map((product) => {
      const line = cart[product.id];
      const lineTotal = getProductUnitPrice(product.price, product.variants, line.selectedVariant) * line.qty;
      return `
        <div class="flex justify-between gap-3 border-b border-gray-100 py-2 text-sm">
          <span class="text-left">${escapeHtml(product.name)} <strong>× ${line.qty}</strong>${line.selectedVariant ? `<small class="block text-gray-500">Varian: ${escapeHtml(line.selectedVariant)}</small>` : ''}</span>
          <strong>${formatRupiah(lineTotal)}</strong>
        </div>
      `;
    }).join('');

    const now = new Date();
    const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60_000)).toISOString().slice(0, 10);
    const result = await Swal.fire({
      title: 'Konfirmasi Checkout',
      html: `
        <div class="text-left">
          <p class="mb-3 text-sm text-gray-500">${cartProducts.length} produk dari ${escapeHtml(seller.storeName)}</p>
          ${summary}
          <div class="mb-4 flex justify-between pt-4 text-base"><strong>Total</strong><strong style="color:#ff5c35">${formatRupiah(totalPrice)}</strong></div>
          <label for="store-order-date" class="mb-1 block text-sm font-semibold">Tanggal Pesanan <span class="text-red-500">*</span></label>
          <input id="store-order-date" type="date" min="${today}" class="mb-3 w-full rounded border p-2 text-sm focus:border-[#ff5c35] focus:outline-none" />
          <label for="store-order-address" class="mb-1 block text-sm font-semibold">Alamat Pengiriman <span class="font-normal text-gray-400">(opsional)</span></label>
          <textarea id="store-order-address" rows="3" class="w-full rounded border p-2 text-sm focus:border-[#ff5c35] focus:outline-none">${escapeHtml(user.address || '')}</textarea>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Checkout Sekarang',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ff5c35',
      preConfirm: () => {
        const deliveryDate = (document.getElementById('store-order-date') as HTMLInputElement)?.value;
        const deliveryAddress = (document.getElementById('store-order-address') as HTMLTextAreaElement)?.value.trim() || '';
        if (!deliveryDate) {
          Swal.showValidationMessage('Tanggal pesanan wajib dipilih.');
          return false;
        }
        return { deliveryDate, deliveryAddress };
      },
    });

    if (!result.isConfirmed || !result.value) return;

    const checkoutItems = cartProducts.map((product) => ({
      productId: product.id,
      qty: cart[product.id].qty,
      notes: cart[product.id].notes,
      selectedVariant: cart[product.id].selectedVariant,
      deliveryDate: result.value.deliveryDate,
      deliveryAddress: result.value.deliveryAddress,
    }));

    sessionStorage.setItem('pesanku-store-checkout', JSON.stringify(checkoutItems));
    router.push('/process-order?source=store');
  };

  return (
    <div className={`min-h-screen bg-base ${showCatalog ? 'pb-32' : 'pb-12'}`}>
      <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-full p-2 text-text-primary transition-colors hover:bg-base"
              aria-label="Kembali ke beranda"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Link href="/" className="flex items-center gap-2 text-brand-primary" aria-label="Pesanku">
              <ShoppingBag className="h-6 w-6" />
              <span className="font-bold">pesanku</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <Link
                href="/profile"
                className="btn-outline flex items-center justify-center rounded-xl border-transparent p-2 text-text-secondary transition-all hover:bg-brand-primary/5 hover:text-brand-primary"
                title="Profil Akun"
                aria-label="Profil akun"
              >
                <User className="h-5 w-5" />
              </Link>
            )}
            <Link
              href={user?.role === 'pembeli' ? '/buyer/orders' : user ? '/profile' : '/login'}
              className="text-sm font-semibold text-brand-primary hover:underline"
            >
              {user?.role === 'pembeli' ? 'Pesanan Saya' : user ? 'Dashboard' : 'Masuk'}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className={`container mx-auto px-4 py-8 md:py-12 ${showCatalog ? 'max-w-6xl' : 'max-w-4xl'}`}>
          <div className="card border border-border p-5 shadow-sm sm:p-7">
            <div className="mb-7 flex flex-col gap-6 border-b border-border/60 pb-7 sm:flex-row sm:items-center">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl border border-border bg-brand-primary/10 shadow-sm md:h-28 md:w-28">
                {seller.logoUrl ? (
                  <Image
                    src={seller.logoUrl}
                    alt={`Foto profil ${seller.storeName}`}
                    fill
                    sizes="112px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-brand-primary">
                    <Store className="h-10 w-10" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-text-primary md:text-3xl">{seller.storeName}</h1>
                  {seller.approvalStatus === 'approved' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-status-success/10 px-2.5 py-1 text-xs font-semibold text-status-success">
                      <ShieldCheck className="h-3.5 w-3.5" /> Terverifikasi
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-secondary">Dikelola oleh {seller.ownerName}</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-primary">Profil Toko</p>
              <h2 className="mt-1 text-xl font-bold text-text-primary">Informasi Detail Toko</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ProfileDetail icon={Store} label="Nama Toko" value={seller.storeName} />
              <ProfileDetail icon={UserRound} label="Pengelola" value={seller.ownerName} />
              <ProfileDetail icon={MapPin} label="Alamat Toko" value={seller.address || 'Belum ditambahkan'} />
              <ProfileDetail icon={Package} label="Kategori" value={seller.category || 'Belum ditambahkan'} />
              <ProfileDetail icon={Calendar} label="Tahun Bergabung" value={joinedYear ? String(joinedYear) : 'Belum tersedia'} />
              <ProfileDetail
                icon={ShieldCheck}
                label="Status Toko"
                value={seller.approvalStatus === 'approved' ? 'UMKM Terverifikasi' : 'Profil UMKM'}
              />
            </div>

            <div className="mt-7 border-t border-border/60 pt-6">
              <div className="mb-3 flex items-center gap-2">
                <Info className="h-5 w-5 text-brand-primary" />
                <h3 className="text-sm font-semibold text-text-primary">Deskripsi Toko</h3>
              </div>
              <div className="rounded-xl border border-border/50 bg-surface p-4">
                <p className={`whitespace-pre-line text-sm leading-relaxed ${storeDescription ? 'text-text-primary' : 'italic text-text-secondary/50'}`}>
                  {storeDescription || 'Belum ada deskripsi toko.'}
                </p>
              </div>
            </div>
          </div>

          {showCatalog && (
            <div className="mt-10">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-primary">Katalog Toko</p>
                <h2 className="mt-1 text-2xl font-bold text-text-primary">Katalog Produk</h2>
                <p className="mt-1 text-sm text-text-secondary">Pilih produk untuk melihat detail dan melakukan pemesanan.</p>
              </div>

              {products.length === 0 ? (
                <div className="card flex min-h-56 flex-col items-center justify-center border border-border p-8 text-center">
                  <Package className="mb-4 h-12 w-12 text-text-secondary/40" />
                  <h3 className="font-bold text-text-primary">Katalog masih kosong</h3>
                  <p className="mt-1 text-sm text-text-secondary">Toko ini belum menambahkan produk.</p>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((product) => {
                    const productSlug = (product.name || 'produk')
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-|-$/g, '');
                    const line = cart[product.id];
                    const selectedVariant = line?.selectedVariant || variantSelections[product.id] || '';
                    const displayedPrice = getProductUnitPrice(product.price, product.variants, selectedVariant);
                    const closed = isProductClosed(product);

                    return (
                      <article key={product.id} className="card group flex flex-col overflow-hidden border border-border transition-all hover:-translate-y-1 hover:shadow-lg">
                        <Link href={`/product/${encodeURIComponent(productSlug)}-${product.id}`} className="block">
                          <div className="relative aspect-[4/3] bg-base">
                            <Image
                              src={product.imageUrl || '/street-food-festival.jpg'}
                              alt={product.name}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                        </Link>

                        <div className="flex flex-1 flex-col p-4">
                          {product.batchCategory && (
                            <span className="mb-2 inline-flex self-start rounded bg-brand-secondary/15 px-2 py-0.5 text-[10px] font-bold text-brand-secondary-dark">
                              {product.batchCategory}
                            </span>
                          )}
                          <Link href={`/product/${encodeURIComponent(productSlug)}-${product.id}`}>
                            <h3 className="line-clamp-2 text-lg font-bold text-text-primary transition-colors group-hover:text-brand-primary">{product.name}</h3>
                          </Link>
                          <ProductRating
                            averageRating={product.averageRating}
                            ratingCount={product.ratingCount}
                            className="mt-1.5"
                          />
                          <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-relaxed text-text-secondary">
                            {product.description || 'Tidak ada deskripsi produk.'}
                          </p>
                          <p className="mt-3 text-xl font-bold text-brand-primary">{formatRupiah(displayedPrice)}</p>

                          {product.variants && product.variants.length > 0 && (
                            <fieldset className="mt-4">
                              <legend className="mb-2 text-xs font-semibold text-text-primary">Pilih varian <span className="font-normal text-text-secondary">(opsional)</span></legend>
                              <div className="flex flex-wrap gap-2">
                                {product.variants.map((variant) => {
                                  const isSelected = selectedVariant === variant.name;
                                  return (
                                    <button
                                      key={variant.name}
                                      type="button"
                                      onClick={() => selectVariant(product.id, isSelected ? '' : variant.name)}
                                      aria-pressed={isSelected}
                                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${isSelected
                                        ? 'border-brand-primary bg-brand-primary text-white'
                                        : 'border-border bg-surface text-text-primary hover:border-brand-primary hover:text-brand-primary'
                                      }`}
                                    >
                                      {variant.name}{variant.price !== null && variant.price !== undefined ? ` · ${formatRupiah(variant.price)}` : ''}
                                    </button>
                                  );
                                })}
                              </div>
                            </fieldset>
                          )}

                          <div className="mt-auto pt-4">
                            <div className="mb-3 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                              <span className="flex items-center gap-1 text-xs text-text-secondary"><Clock className="h-3.5 w-3.5" />{product.processingTime || 'Waktu proses belum tersedia'}</span>
                              <Link href={`/product/${encodeURIComponent(productSlug)}-${product.id}`} aria-label={`Lihat detail ${product.name}`}>
                                <ChevronRight className="h-4 w-4 shrink-0 text-brand-primary" />
                              </Link>
                            </div>

                            {line ? (
                              <div className="flex items-center gap-2 rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-2">
                                <button type="button" onClick={() => changeQty(product.id, -1)} disabled={line.qty <= 1} className="rounded-lg border border-border bg-surface p-2 disabled:opacity-40" aria-label={`Kurangi ${product.name}`}>
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="min-w-8 text-center font-bold text-text-primary">{line.qty}</span>
                                <button type="button" onClick={() => changeQty(product.id, 1)} className="rounded-lg border border-border bg-surface p-2" aria-label={`Tambah ${product.name}`}>
                                  <Plus className="h-4 w-4" />
                                </button>
                                <button type="button" onClick={() => removeProduct(product.id)} className="ml-auto rounded-lg p-2 text-status-error hover:bg-status-error/10" aria-label={`Hapus ${product.name} dari keranjang`}>
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => addProduct(product)}
                                disabled={closed}
                                className="btn-primary flex w-full items-center justify-center gap-2 py-2.5 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                              >
                                <Plus className="h-4 w-4" /> {closed ? 'Tidak Dapat Dipesan' : 'Tambah ke Keranjang'}
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {showCatalog && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center gap-3 sm:gap-5" aria-live="polite">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-primary px-1 text-[10px] font-bold text-white">{totalItems}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs text-text-secondary">{cartProducts.length > 0 ? `${cartProducts.length} produk · ${totalItems} item` : 'Keranjang masih kosong'}</p>
                <p className="text-lg font-bold text-brand-primary sm:text-xl">{formatRupiah(totalPrice)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void checkout()}
              disabled={cartProducts.length === 0}
              className="btn-primary shrink-0 px-5 py-3 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 sm:min-w-40"
            >
              Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileDetail({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Store;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <>
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" />
      <div className="min-w-0">
        <p className="mb-0.5 text-xs text-text-secondary">{label}</p>
        <p className="break-words text-sm font-medium text-text-primary">{value}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <a href={href} className="flex items-start gap-3 rounded-xl border border-border/50 bg-surface p-3 transition-colors hover:border-brand-primary/30">
        {content}
      </a>
    );
  }

  return <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-surface p-3">{content}</div>;
}
