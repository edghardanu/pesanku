"use client";

import React, { useEffect, useState, useRef } from "react";
import { ShoppingBag, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { ProductItem } from "@/types";

interface StoreProductsGridProps {
    sellerId: string;
    storeName?: string | null;
    selectedProductName?: string;
    onProductClick?: (product: ProductItem) => void;
}

export default function StoreProductsGrid({ sellerId, storeName, selectedProductName, onProductClick }: StoreProductsGridProps) {
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchProducts = async () => {
            if (!sellerId) return;
            setIsLoading(true);
            try {
                const res = await fetch(`/api/products/public?sellerId=${sellerId}&t=${Date.now()}`);
                if (!res.ok) throw new Error("Terjadi kesalahan saat memuat produk.");
                const data = await res.json();

                // Only show active products for buyer side
                const activeProducts = data.products?.filter((p: any) => p.status === 'active') || [];
                setProducts(activeProducts);
            } catch (error) {
                console.error("Failed to fetch store products:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProducts();
    }, [sellerId]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 300; // Adjust for smooth scrolling width
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    if (!sellerId || (!isLoading && products.length === 0)) {
        return null; // hide if no products
    }

    return (
        <div className="w-full bg-white border-t border-gray-200 mt-4 pt-5 pb-6">
            <div className="px-5 mb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-extrabold text-gray-800 flex items-center gap-2 uppercase tracking-wide">
                    <ShoppingBag className="w-4 h-4 text-brand-primary" />
                    Produk Lainnya (Katalog)
                </h3>

                {/* Carousel navigation buttons */}
                {!isLoading && products.length > 3 && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => scroll('left')} className="p-1.5 rounded-full bg-gray-100 hover:bg-brand-primary/10 hover:text-brand-primary text-gray-500 transition-colors border border-gray-200">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={() => scroll('right')} className="p-1.5 rounded-full bg-gray-100 hover:bg-brand-primary/10 hover:text-brand-primary text-gray-500 transition-colors border border-gray-200">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="flex justify-center p-8 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                </div>
            ) : (
                <div className="relative group px-1">
                    <div
                        ref={scrollContainerRef}
                        className="flex overflow-x-auto gap-4 px-4 pb-4 snap-x hide-scrollbar scroll-smooth"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {products.map((p) => {
                            const pImage = p.imageUrl || "/street-food-festival.jpg";
                            const formattedPrice = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p.price);
                            const isSelected = selectedProductName === p.name;

                            return (
                                <div key={p.id} className={`shrink-0 w-[140px] snap-start flex flex-col group/card border-2 rounded-xl overflow-hidden hover:shadow-lg transition-all bg-white cursor-pointer ${isSelected
                                        ? 'border-brand-primary ring-2 ring-brand-primary/20 shadow-md transform -translate-y-1'
                                        : 'border-gray-100 hover:border-brand-primary/40'
                                    }`} onClick={() => {
                                        if (onProductClick) {
                                            onProductClick(p);
                                        } else {
                                            window.open('/#katalog', '_self');
                                        }
                                    }}>
                                    <div className="h-28 w-full overflow-hidden relative bg-gray-100">
                                        <img src={pImage} alt={p.name} className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-500" />
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 bg-brand-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                                DIPILIH
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2.5 flex flex-col gap-1.5 flex-1 justify-between">
                                        <p className={`text-[11px] font-bold line-clamp-2 leading-relaxed ${isSelected ? 'text-brand-primary' : 'text-gray-800'}`}>{p.name}</p>
                                        <p className="text-[11px] font-black text-brand-primary">{formattedPrice}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
