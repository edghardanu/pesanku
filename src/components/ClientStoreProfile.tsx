"use client";

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  Info,
  MapPin,
  Package,
  ShieldCheck,
  ShoppingBag,
  Store,
  User,
  UserRound,
} from 'lucide-react';

import ProductRating from '@/components/ProductRating';
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
  const storeDescription = seller.description?.trim();
  const joinedYear = seller.createdAt ? new Date(seller.createdAt).getFullYear() : null;

  return (
    <div className="min-h-screen bg-base pb-12">
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

                    return (
                      <article key={product.id} className="card group overflow-hidden border border-border transition-all hover:-translate-y-1 hover:shadow-lg">
                        <Link href={`/product/${encodeURIComponent(productSlug)}-${product.id}`} className="block h-full">
                          <div className="relative aspect-[4/3] bg-base">
                            <Image
                              src={product.imageUrl || '/street-food-festival.jpg'}
                              alt={product.name}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>

                          <div className="p-4">
                            {product.batchCategory && (
                              <span className="mb-2 inline-flex rounded bg-brand-secondary/15 px-2 py-0.5 text-[10px] font-bold text-brand-secondary-dark">
                                {product.batchCategory}
                              </span>
                            )}
                            <h3 className="line-clamp-2 text-lg font-bold text-text-primary transition-colors group-hover:text-brand-primary">{product.name}</h3>
                            <ProductRating
                              averageRating={product.averageRating}
                              ratingCount={product.ratingCount}
                              className="mt-1.5"
                            />
                            <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-relaxed text-text-secondary">
                              {product.description || 'Tidak ada deskripsi produk.'}
                            </p>
                            <p className="mt-3 text-xl font-bold text-brand-primary">Rp {product.price.toLocaleString('id-ID')}</p>

                            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                              <span className="flex items-center gap-1 text-xs text-text-secondary">
                                <Clock className="h-3.5 w-3.5" />
                                {product.processingTime || 'Waktu proses belum tersedia'}
                              </span>
                              <ChevronRight className="h-4 w-4 shrink-0 text-brand-primary" />
                            </div>
                          </div>
                        </Link>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
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
