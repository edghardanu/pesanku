"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle, Clock, ShoppingBag, Store, MapPin, X, Minus, Plus, Trash2, Info, User, Package, ShieldCheck, ShoppingCart, Calendar } from "lucide-react";
import Swal from 'sweetalert2';

import { AuthUser, ProductItem } from '@/types';
import ProductRating from '@/components/ProductRating';
import { findProductVariant, getProductUnitPrice } from '@/lib/productVariants';

type StoreView = {
  id: string;
  ownerName: string;
  phone: string | null;
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
  user,
}: {
  seller: StoreView;
  products: ProductItem[];
  user: AuthUser | null;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [variantSelections, setVariantSelections] = useState<Record<string, string>>({});

  const cartProducts = useMemo(
    () => products.filter((product) => cart[product.id]),
    [cart, products],
  );
  const totalItems = cartProducts.reduce((sum, product) => sum + cart[product.id].qty, 0);
  const totalPrice = cartProducts.reduce((sum, product) => sum + (
    cart[product.id].qty * getProductUnitPrice(product.price, product.variants, cart[product.id].selectedVariant)
  ), 0);

  const addProduct = (product: ProductItem) => {
    if (isProductClosed(product)) {
      void Swal.fire('Preorder Ditutup', `Produk ${product.name} belum dapat dipesan.`, 'warning');
      return;
    }

    const availableVariants = product.variants || [];
    const selectedVariant = variantSelections[product.id] || '';
    // Varian opsional

    setCart((current) => ({
      ...current,
      [product.id]: current[product.id] || {
        qty: 1,
        notes: '',
        selectedVariant,
      },
    }));
  };

  const selectVariant = (productId: string, selectedVariant: string) => {
    setVariantSelections((current) => ({ ...current, [productId]: selectedVariant }));
    setCart((current) => current[productId]
      ? { ...current, [productId]: { ...current[productId], selectedVariant } }
      : current);
  };

  const changeQty = (product: ProductItem, delta: number) => {
    setCart((current) => {
      const line = current[product.id];
      if (!line) return current;

      const nextQty = Math.max(1, line.qty + delta);
      return { ...current, [product.id]: { ...line, qty: nextQty } };
    });
  };

  const setDirectQty = (product: ProductItem, val: string) => {
    setCart((current) => {
      const line = current[product.id];
      if (!line) return current;
      let nextQty = 0;
      if (val !== '') {
        nextQty = parseInt(val, 10);
        if (isNaN(nextQty)) nextQty = line.qty;
      }
      return { ...current, [product.id]: { ...line, qty: nextQty } };
    });
  };

  const handleQtyBlur = (product: ProductItem) => {
    setCart((current) => {
      const line = current[product.id];
      if (!line) return current;
      if (line.qty < 1) {
        return { ...current, [product.id]: { ...line, qty: 1 } };
      }
      return current;
    });
  };

  const removeProduct = (productId: string) => {
    setCart((current) => {
      const next = { ...current };
      delete next[productId];
      return next;
    });
  };

  const updateNotes = (productId: string, notes: string) => {
    setCart((current) => ({
      ...current,
      [productId]: { ...current[productId], notes },
    }));
  };

  const checkout = async () => {
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
      const pResult = await Swal.fire({
        title: 'Akses Ditolak',
        html: `
          <p class="mb-2">Hanya akun pembeli yang dapat melakukan checkout.</p>
          <p class="text-sm text-text-secondary">Anda saat ini masuk sebagai <strong>${user.role}</strong>. Yuk, lengkapi pengalamanmu! Daftar sebagai pembeli sekarang dan mulai jelajahi dunia rasa dari UMKM terbaik kami.</p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Daftar Akun Pembeli',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#ff5c35'
      });
      if (pResult.isConfirmed) {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/register');
      }
      return;
    }

    if (cartProducts.length === 0) {
      await Swal.fire('Keranjang Kosong', 'Pilih setidaknya satu produk dari katalog toko.', 'info');
      return;
    }

    const unavailableProduct = cartProducts.find(isProductClosed);
    if (unavailableProduct) {
      await Swal.fire('Preorder Ditutup', `${unavailableProduct.name} tidak lagi dapat dipesan.`, 'warning');
      return;
    }

    // Varian sekarang opsional

    const summary = cartProducts.map((product) => `
      <div class="flex justify-between gap-3 py-2 border-b border-gray-100 text-sm">
        <span class="text-left">${escapeHtml(product.name)} <strong>× ${cart[product.id].qty}</strong>${cart[product.id].selectedVariant ? `<small class="block text-gray-500">Varian: ${escapeHtml(cart[product.id].selectedVariant)}</small>` : ''}</span>
        <strong>${formatRupiah(getProductUnitPrice(product.price, product.variants, cart[product.id].selectedVariant) * cart[product.id].qty)}</strong>
      </div>
    `).join('');

    const defaultAddress = user?.address || '';

    const result = await Swal.fire({
      title: 'Konfirmasi Checkout',
      html: `
        <div class="text-left">
          <p class="text-sm text-gray-500 mb-3">${cartProducts.length} produk dari ${escapeHtml(seller.storeName)}</p>
          ${summary}
          <div class="flex justify-between pt-4 text-base mb-4"><strong>Total</strong><strong style="color:#ff5c35">${formatRupiah(totalPrice)}</strong></div>
          <div class="mt-4">
            <label class="block text-sm font-semibold mb-1">Pilih Tanggal Pesanan <span class="text-red-500">*</span></label>
            <input type="date" id="order-date" lang="id" class="w-full border p-2 rounded text-sm mb-3 focus:outline-none focus:border-[#ff5c35]" required>
            <label class="block text-sm font-semibold mb-1">Alamat Pembeli <span class="text-xs font-normal text-gray-400 ml-1">(Opsional)</span></label>
            <textarea id="order-address" class="w-full border p-2 rounded text-sm focus:outline-none focus:border-[#ff5c35]" rows="3">${escapeHtml(defaultAddress)}</textarea>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Buat Pesanan',
      cancelButtonText: 'Periksa Lagi',
      confirmButtonColor: '#ff5c35',
      preConfirm: () => {
        const dateInput = document.getElementById('order-date') as HTMLInputElement;
        const addressInput = document.getElementById('order-address') as HTMLTextAreaElement;
        
        const dateVal = dateInput?.value;
        const addressVal = addressInput?.value?.trim() || '';
        
        if (!dateVal) {
          Swal.showValidationMessage('Silakan pilih tanggal pesanan');
          return false;
        }
        
        return { orderDate: dateVal, shippingAddress: addressVal };
      }
    });

    if (!result.isConfirmed) return;

    const checkoutItems = cartProducts.map((product) => ({
      productId: product.id,
      qty: cart[product.id].qty,
      notes: cart[product.id].notes,
      selectedVariant: cart[product.id].selectedVariant,
      deliveryDate: result.value?.orderDate,
      deliveryAddress: result.value?.shippingAddress,
    }));
    sessionStorage.setItem('pesanku-store-checkout', JSON.stringify(checkoutItems));
    router.push('/process-order?source=store');
  };

  return (
    <div className="min-h-screen bg-base pb-28 lg:pb-12">
      <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-full p-2 text-text-primary transition-colors hover:bg-base" aria-label="Kembali ke beranda">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2 text-brand-primary">
              <ShoppingBag className="h-6 w-6" />
              <span className="font-bold">pesanku</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <Link
                href="/profile"
                className="btn-outline border-transparent text-text-secondary hover:text-brand-primary hover:bg-brand-primary/5 flex items-center justify-center p-2 rounded-xl transition-all"
                title="Profil Akun"
              >
                <User className="w-5 h-5" />
              </Link>
            )}
            <Link href={user?.role === 'pembeli' ? '/buyer/orders' : user ? '/profile' : '/login'} className="text-sm font-semibold text-brand-primary hover:underline">
              {user?.role === 'pembeli' ? 'Pesanan Saya' : user ? 'Dashboard' : 'Masuk'}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-border bg-surface">
          <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl border border-border bg-brand-primary/10 shadow-sm md:h-28 md:w-28">
                {seller.logoUrl ? (
                  <Image src={seller.logoUrl} alt={seller.storeName} fill sizes="112px" className="object-cover" priority />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-brand-primary"><Store className="h-10 w-10" /></div>
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
                <p className="mb-3 text-sm text-text-secondary">Dikelola oleh {seller.ownerName}</p>
                <div className="flex flex-col gap-2 text-sm text-text-secondary sm:flex-row sm:flex-wrap sm:gap-5">
                  <span className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />{seller.address || 'Alamat toko belum ditambahkan'}</span>
                  {seller.category && <span className="flex items-center gap-2"><Package className="h-4 w-4 text-brand-primary" />{seller.category}</span>}
                  {seller.createdAt && <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-brand-primary" />Bergabung {new Date(seller.createdAt).getFullYear()}</span>}
                </div>
                <div className="mt-4 p-4 rounded-xl bg-surface border border-border/60">
                  <p className={`text-sm leading-relaxed whitespace-pre-line ${seller.description ? 'text-text-primary' : 'text-text-secondary/50 italic'}`}>
                    {seller.description || 'belum ada deskripsi'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto max-w-6xl px-4 py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-text-primary">Katalog Produk</h2>
            <p className="mt-1 text-sm text-text-secondary">Pilih beberapa produk dari toko ini dan checkout sekaligus.</p>
          </div>

          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            {products.length === 0 ? (
              <div className="card flex min-h-64 flex-col items-center justify-center border border-border p-8 text-center">
                <Package className="mb-4 h-12 w-12 text-text-secondary/40" />
                <h3 className="font-bold text-text-primary">Katalog masih kosong</h3>
                <p className="mt-1 text-sm text-text-secondary">Toko ini belum menambahkan produk.</p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {products.map((product) => {
                  const line = cart[product.id];
                  const closed = isProductClosed(product);
                  const selectedVariant = line?.selectedVariant || variantSelections[product.id] || '';
                  const selectedVariantDetails = findProductVariant(product.variants, selectedVariant);
                  const displayedPrice = selectedVariantDetails?.price ?? product.price;
                  return (
                    <article key={product.id} className="card overflow-hidden border border-border">
                      <div className="relative aspect-[4/3] bg-base">
                        <Image
                          src={product.imageUrl || '/street-food-festival.jpg'}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <div className="mb-2 flex flex-wrap gap-2">
                          {product.batchCategory && <span className="rounded bg-brand-secondary/15 px-2 py-0.5 text-[10px] font-bold text-brand-secondary-dark">{product.batchCategory}</span>}
                        </div>
                        <h3 className="line-clamp-2 text-lg font-bold text-text-primary">{product.name}</h3>
                        <ProductRating
                          averageRating={product.averageRating}
                          ratingCount={product.ratingCount}
                          className="mt-1.5"
                        />
                        <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-relaxed text-text-secondary">{product.description || 'Tidak ada deskripsi produk.'}</p>
                        <p className="mt-3 text-xl font-bold text-brand-primary">{formatRupiah(displayedPrice)}</p>
                        {selectedVariantDetails?.price !== null && selectedVariantDetails?.price !== undefined && (
                          <p className="mt-0.5 text-[11px] font-medium text-text-secondary">Harga varian {selectedVariantDetails.name}</p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                          {product.processingTime && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{product.processingTime}</span>}
                        </div>

                        {product.variants && product.variants.length > 0 && (
                          <fieldset className="mt-4">
                            <legend className="mb-2 text-xs font-semibold text-text-primary">
                              Pilih Tambahan Varian <span className="text-gray-400 font-normal">(Opsional)</span>
                            </legend>
                            <div className="flex flex-wrap gap-2">
                              {product.variants.map((variant) => {
                                const isSelected = selectedVariant === variant.name;
                                return (
                                  <button
                                    key={variant.name}
                                    type="button"
                                    onClick={() => selectVariant(product.id, variant.name)}
                                    aria-pressed={isSelected}
                                    className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${isSelected
                                      ? 'border-brand-primary bg-brand-primary text-white shadow-sm'
                                      : 'border-border bg-surface text-text-primary hover:border-brand-primary hover:text-brand-primary'
                                    }`}
                                  >
                                    <span>{variant.name}</span>
                                    {variant.price !== null && variant.price !== undefined && (
                                      <span className={`ml-1 ${isSelected ? 'text-white/90' : 'text-brand-primary'}`}>· {formatRupiah(variant.price)}</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </fieldset>
                        )}

                        {line ? (
                          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-2">
                            <button onClick={() => changeQty(product, -1)} disabled={line.qty <= 1} className="rounded-lg border border-border bg-surface p-2 disabled:opacity-40" aria-label={`Kurangi ${product.name}`}><Minus className="h-4 w-4" /></button>
                            <input 
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={line.qty === 0 ? '' : line.qty}
                              onChange={(e) => setDirectQty(product, e.target.value)}
                              onBlur={() => handleQtyBlur(product)}
                              className="w-12 bg-transparent text-center font-bold text-text-primary outline-none"
                            />
                            <button onClick={() => changeQty(product, 1)} className="rounded-lg border border-border bg-surface p-2 disabled:opacity-40" aria-label={`Tambah ${product.name}`}><Plus className="h-4 w-4" /></button>
                            <button onClick={() => removeProduct(product.id)} className="ml-auto rounded-lg p-2 text-status-error hover:bg-status-error/10" aria-label={`Hapus ${product.name} dari keranjang`}><Trash2 className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <button onClick={() => addProduct(product)} disabled={closed} className="btn-primary mt-4 flex w-full items-center justify-center gap-2 py-2.5 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500">
                            <Plus className="h-4 w-4" /> {closed ? 'Tidak Dapat Dipesan' : 'Tambah ke Keranjang'}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <aside id="keranjang-toko" className="card border border-border p-5 shadow-lg lg:sticky lg:top-24">
              <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-brand-primary" />
                  <h2 className="font-bold text-text-primary">Keranjang Toko</h2>
                </div>
                <span className="rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-bold text-brand-primary">{cartProducts.length} produk</span>
              </div>

              {cartProducts.length === 0 ? (
                <div className="py-10 text-center">
                  <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-text-secondary/30" />
                  <p className="text-sm font-semibold text-text-primary">Belum ada produk dipilih</p>
                  <p className="mt-1 text-xs text-text-secondary">Tambahkan produk dari katalog.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartProducts.map((product) => (
                    <div key={product.id} className="border-b border-border pb-4 last:border-0">
                      <div className="flex gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-base">
                          <Image src={product.imageUrl || '/street-food-festival.jpg'} alt="" fill sizes="56px" className="object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-bold text-text-primary">{product.name}</p>
                          {cart[product.id].selectedVariant && (
                            <p className="mt-0.5 text-xs font-semibold text-brand-primary">Varian: {cart[product.id].selectedVariant}</p>
                          )}
                          <p className="mt-1 text-sm font-bold text-brand-primary">{formatRupiah(getProductUnitPrice(product.price, product.variants, cart[product.id].selectedVariant) * cart[product.id].qty)}</p>
                          <p className="text-xs text-text-secondary">{cart[product.id].qty} porsi</p>
                        </div>
                        <button onClick={() => removeProduct(product.id)} className="self-start p-1 text-status-error" aria-label={`Hapus ${product.name}`}><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <textarea
                        value={cart[product.id].notes}
                        onChange={(event) => updateNotes(product.id, event.target.value)}
                        maxLength={500}
                        rows={2}
                        placeholder="Catatan untuk produk ini (opsional)"
                        className="mt-3 w-full resize-none rounded-lg border border-border bg-base px-3 py-2 text-xs text-text-primary outline-none focus:border-brand-primary"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 border-t border-border pt-4">
                <div className="mb-1 flex justify-between text-sm text-text-secondary"><span>Total porsi</span><span>{totalItems}</span></div>
                <div className="mb-5 flex items-center justify-between"><span className="font-bold text-text-primary">Total</span><span className="text-xl font-bold text-brand-primary">{formatRupiah(totalPrice)}</span></div>
                <button onClick={checkout} disabled={cartProducts.length === 0} className="btn-primary w-full py-3 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500">
                  Checkout {cartProducts.length > 1 ? `${cartProducts.length} Produk` : 'Pesanan'}
                </button>
              </div>
            </aside>
          </div>
        </section>
      </main>

      {cartProducts.length > 0 && (
        <button
          onClick={() => document.getElementById('keranjang-toko')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          className="fixed bottom-20 left-4 right-4 z-40 flex items-center justify-between rounded-2xl bg-brand-primary px-5 py-3 text-white shadow-xl lg:hidden"
        >
          <span className="flex items-center gap-2 font-semibold"><ShoppingCart className="h-5 w-5" />{cartProducts.length} produk</span>
          <span className="font-bold">{formatRupiah(totalPrice)}</span>
        </button>
      )}
    </div>
  );
}
