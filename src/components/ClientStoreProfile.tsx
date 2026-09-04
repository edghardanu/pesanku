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
  ShoppingCart, Star,
  Store,
  Trash2,
  User,
  UserRound,
} from 'lucide-react';
import Swal from 'sweetalert2';

import ProductRating from '@/components/ProductRating';
import { getProductUnitPrice } from '@/lib/productVariants';
import { AuthUser, ProductItem } from '@/types';
import { useCart } from '@/lib/cart';
import CartSidebar from '@/components/CartSidebar';

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
  feeAplikasi = 0,
  feeJasa = 0,
  feeAdmin = 0,
}: {
  seller: StoreView;
  products: ProductItem[];
  showCatalog: boolean;
  user: AuthUser | null;
  feeAplikasi?: number;
  feeJasa?: number;
  feeAdmin?: number;
}) {
  const router = useRouter();
  const { items: cartItems, addItem: addCartItem, updateQty, removeItem: removeCartItem } = useCart();
  const [variantSelections, setVariantSelections] = useState<Record<string, string>>({});
  const storeDescription = seller.description?.trim();
  const joinedYear = seller.createdAt ? new Date(seller.createdAt).getFullYear() : null;

  const getCartLine = (productId: string) => {
    // Attempt to match the specific selected variant for this store page
    const currentSelected = variantSelections[productId] || '';
    return cartItems.find((ci) => ci.productId === productId && (ci.selectedVariant || '') === currentSelected)
      || cartItems.find((ci) => ci.productId === productId);
  };

  const addProduct = (product: ProductItem) => {
    if (isProductClosed(product)) {
      void Swal.fire('Preorder Ditutup', `${product.name} belum dapat dipesan.`, 'warning');
      return;
    }
    const selected = variantSelections[product.id] || '';
    addCartItem({
      productId: product.id,
      name: product.name,
      price: getProductUnitPrice(product.price, product.variants, selected),
      selectedVariant: selected,
      sellerId: product.sellerId || '',
      sellerName: seller.storeName || 'Toko UMKM',
      imageUrl: product.imageUrl || '',
      minQty: product.minOrderQty || product.minQty || 1
    });
  };

  const changeQty = (productId: string, delta: number) => {
    const line = getCartLine(productId);
    if (line) {
      updateQty(productId, line.selectedVariant, line.qty + delta);
    }
  };

  const setDirectQty = (productId: string, value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    const line = getCartLine(productId);
    if (line) {
      const qty = value === '' ? 0 : Number.parseInt(value, 10);
      updateQty(productId, line.selectedVariant, qty);
    }
  };

  const normalizeQty = (productId: string) => {
    const line = getCartLine(productId);
    if (line && line.qty < 1) {
      updateQty(productId, line.selectedVariant, 1);
    }
  };

  const removeProduct = (productId: string) => {
    const line = getCartLine(productId);
    if (line) {
      removeCartItem(productId, line.selectedVariant);
    }
  };

  const selectVariant = (productId: string, selectedVariant: string) => {
    setVariantSelections((current) => ({ ...current, [productId]: selectedVariant }));
  };

  return (
    <div className={`min-h-screen bg-base pb-12`}>
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
                <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                  {products.map((product) => {
                    const productSlug = (product.name || 'produk')
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-|-$/g, '');
                    const line = getCartLine(product.id);
                    const selectedVariant = line?.selectedVariant || variantSelections[product.id] || '';
                    const displayedPrice = getProductUnitPrice(product.price, product.variants, selectedVariant);
                    const productSubtotal = displayedPrice * (line?.qty || 1);
                    const closed = isProductClosed(product);

                    return (
                      <article key={product.id} className="group flex flex-row overflow-hidden bg-white dark:bg-border border border-gray-100 dark:border-gray-800 transition-all hover:shadow-md rounded-[20px] p-2.5 sm:p-3 gap-3 sm:gap-4 relative h-full">
                        <div className="relative w-[110px] h-[110px] sm:w-[120px] sm:h-[120px] shrink-0 bg-gray-50 border border-black/5 rounded-[14px] overflow-hidden self-start">
                          <Link href={`/product/${encodeURIComponent(productSlug)}-${product.id}`} className="block w-full h-full">
                            <Image
                              src={product.imageUrl || '/street-food-festival.jpg'}
                              alt={product.name}
                              fill
                              sizes="120px"
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            {/* Rating Badge */}
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm px-2.5 py-0.5 rounded-full flex items-center justify-center gap-1 shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-gray-100 text-[10px] sm:text-[11px] font-bold z-10 text-gray-800 leading-none pb-[1px] min-w-[50px]">
                              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-500 fill-yellow-500 shrink-0" />
                              {(product.averageRating ?? 0) > 0 ? (product.averageRating ?? 0).toFixed(1) : 'Baru'}
                            </div>
                          </Link>
                        </div>

                        <div className="flex flex-1 flex-col justify-center min-w-0 pt-0.5">
                          {product.batchCategory && (
                            <span className="mb-1.5 sm:mb-2 md:mt-2 inline-flex self-start rounded bg-brand-secondary/15 px-1.5 py-0.5 sm:px-2 sm:py-0.5 text-[9px] sm:text-[10px] font-bold text-brand-secondary-dark line-clamp-1 truncate block w-max max-w-full">
                              {product.batchCategory}
                            </span>
                          )}
                          <Link href={`/product/${encodeURIComponent(productSlug)}-${product.id}`}>
                            <h3 className="text-[13px] sm:text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 mb-1 group-hover:text-[#ff5c35] transition-colors">{product.name}</h3>
                          </Link>

                          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mb-1.5 line-clamp-1">
                            {product.description || 'Tidak ada deskripsi.'}
                          </p>

                          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold mb-2">
                            <span className="text-[#ff4b4b] truncate font-bold text-sm">
                              {formatRupiah(productSubtotal)}
                            </span>
                            {line && line.qty > 1 && (
                              <span className="ml-1 text-[10px] text-gray-500 font-medium whitespace-nowrap">
                                ({line.qty}× {formatRupiah(displayedPrice)})
                              </span>
                            )}
                          </div>

                          {product.variants && product.variants.length > 0 && (
                            <div className="mb-2 w-full overflow-x-auto pb-1 no-scrollbar flex items-center">
                              <span className="text-[10px] font-medium text-text-secondary mr-2 shrink-0">Varian:</span>
                              <div className="flex gap-1.5">
                                {product.variants.map((variant) => {
                                  const isSelected = selectedVariant === variant.name;
                                  return (
                                    <button
                                      key={variant.name}
                                      type="button"
                                      onClick={() => selectVariant(product.id, isSelected ? '' : variant.name)}
                                      aria-pressed={isSelected}
                                      className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold transition-colors shrink-0 whitespace-nowrap ${isSelected
                                        ? 'border-[#ff5c35] bg-[#ff5c35] text-white'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-[#ff5c35] hover:text-[#ff5c35]'
                                        }`}
                                    >
                                      {variant.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="mt-auto w-full">
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1 text-[10px] text-gray-500 w-full truncate"><Clock className="w-3 h-3 shrink-0 text-gray-400" /><span className="truncate">{product.processingTime || 'Preorder'}</span></span>
                            </div>

                            {line ? (
                              <div className="flex items-center justify-between gap-1.5 rounded-lg border border-[#ff5c35]/20 bg-[#ff5c35]/5 p-1 w-full mt-2">
                                <button type="button" onClick={() => changeQty(product.id, -1)} disabled={line.qty <= 1} className="rounded-md border border-gray-200 bg-white p-1 disabled:opacity-40" aria-label={`Kurangi`}>
                                  <Minus className="h-3.5 w-3.5 text-gray-700" />
                                </button>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={line.qty === 0 ? '' : line.qty}
                                  onChange={(event) => setDirectQty(product.id, event.target.value)}
                                  onBlur={() => normalizeQty(product.id)}
                                  className="w-8 rounded-md bg-transparent px-0.5 py-1 text-center text-xs font-bold text-gray-900 outline-none transition-colors border-none"
                                />
                                <button type="button" onClick={() => changeQty(product.id, 1)} className="rounded-md border border-gray-200 bg-white p-1" aria-label={`Tambah`}>
                                  <Plus className="h-3.5 w-3.5 text-gray-700" />
                                </button>
                                <button type="button" onClick={() => removeProduct(product.id)} className="ml-auto rounded-md border border-gray-200 bg-white p-1 text-red-500 hover:bg-red-50" aria-label={`Hapus`}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => addProduct(product)}
                                disabled={closed}
                                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#ff5c35] px-3 py-1.5 text-[11px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 mt-2"
                              >
                                <Plus className="h-3 h-3 shrink-0" /> <span className="truncate">{closed ? 'Ditutup' : 'Tambah'}</span>
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

      <CartSidebar />
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
