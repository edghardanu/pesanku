const fs = require('fs');
let code = fs.readFileSync('src/components/ClientStoreProfile.tsx', 'utf8');

// 1. Add Tab State
if (!code.includes('const [activeTab')) {
  code = code.replace(
    'const [variantSelections, setVariantSelections] = useState<Record<string, string>>({});',
    `const [variantSelections, setVariantSelections] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'katalog' | 'profil'>('katalog');`
  );
}

// 2. Refactor the layout to separate profile from catalog
// We will replace the entire <main> block structure.

// Replace the header section (up to the end of the <section> before Katalog Produk)
// and the start of the catalog section:
const headerRegex = /<section className="border-b border-border bg-surface">[\s\S]*?<section className="container mx-auto max-w-6xl px-4 py-8">\s*<div className="mb-6">\s*<h2 className="text-2xl font-bold text-text-primary">Katalog Produk<\/h2>\s*<p className="mt-1 text-sm text-text-secondary">Pilih beberapa produk dari toko ini dan checkout sekaligus\.<\/p>\s*<\/div>/m;

const newLayout = `<section className="border-b border-border bg-surface">
          <div className="container mx-auto max-w-6xl px-4 pt-8 pb-0 md:pt-12">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center mb-8">
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
                <p className="text-sm text-text-secondary">Dikelola oleh {seller.ownerName}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 overflow-x-auto scollbar-hide border-b-2 border-transparent">
              <button 
                onClick={() => setActiveTab('katalog')}
                className={\`pb-3 text-sm font-bold whitespace-nowrap transition-all border-b-2 \${activeTab === 'katalog' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}\`}
              >
                Katalog Produk
              </button>
              <button 
                onClick={() => setActiveTab('profil')}
                className={\`pb-3 text-sm font-bold whitespace-nowrap transition-all border-b-2 \${activeTab === 'profil' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}\`}
              >
                Profil Detail Toko
              </button>
            </div>
          </div>
        </section>

        <section className="container mx-auto max-w-6xl px-4 py-8">
          {activeTab === 'profil' ? (
            <div className="card max-w-3xl p-6 border border-border shadow-sm">
              <h2 className="text-xl font-bold text-text-primary mb-6">Informasi Toko</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-3">Detail & Kontak</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-3 bg-surface rounded-xl border border-border/50">
                      <MapPin className="h-5 w-5 text-brand-primary shrink-0 mt-0.5" />
                      <div>
                         <p className="text-xs text-text-secondary mb-0.5">Alamat</p>
                         <p className="text-sm font-medium text-text-primary">{seller.address || 'Belum ditambahkan'}</p>
                      </div>
                    </div>
                    {seller.category && (
                      <div className="flex items-start gap-3 p-3 bg-surface rounded-xl border border-border/50">
                        <Package className="h-5 w-5 text-brand-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-text-secondary mb-0.5">Kategori</p>
                          <p className="text-sm font-medium text-text-primary">{seller.category}</p>
                        </div>
                      </div>
                    )}
                    {seller.createdAt && (
                      <div className="flex items-start gap-3 p-3 bg-surface rounded-xl border border-border/50">
                        <Calendar className="h-5 w-5 text-brand-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-text-secondary mb-0.5">Tahun Bergabung</p>
                          <p className="text-sm font-medium text-text-primary">{new Date(seller.createdAt).getFullYear()}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-border/60">
                  <h3 className="text-sm font-semibold text-text-primary mb-3">Deskripsi Utama</h3>
                  <div className="bg-surface rounded-xl p-4 border border-border/50 relative">
                     <div className="absolute top-4 right-4 text-text-secondary/20 h-10 w-10">
                       <Info className="w-full h-full" />
                     </div>
                     <p className={\`text-sm leading-relaxed whitespace-pre-line relative z-10 \${storeDescription ? 'text-text-primary' : 'text-text-secondary/50 italic'}\`}>
                       {storeDescription || 'belum ada deskripsi'}
                     </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
            <div className="mb-6">
               <p className="text-sm text-text-secondary">Pilih beberapa produk dari toko ini dan checkout sekaligus.</p>
            </div>
            `;

code = code.replace(headerRegex, newLayout);

// We need to close the conditional rendering for activeTab ('</>') at the end of the section
// The section ends around `</section>` just before `</main>`
const footerRegex = /<\/section>\s*<\/main>/;
code = code.replace(footerRegex, `          </>\n          )}\n        </section>\n      </main>`);

fs.writeFileSync('src/components/ClientStoreProfile.tsx', code);
