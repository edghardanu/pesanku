import { useEffect, useState, useCallback } from 'react';

export type CartItem = {
    productId: string;
    name: string;
    price: number;
    qty: number;
    minQty?: number;
    sellerId?: string;
    sellerName?: string;
    imageUrl?: string;
    selectedVariant?: string;
    notes?: string;
};

class CartStore {
    private items: CartItem[] = [];
    private listeners: Set<() => void> = new Set();

    constructor() {
        this.loadFromStorage();
    }

    private loadFromStorage() {
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem('pesanku_cart');
                if (stored) {
                    const parsed = JSON.parse(stored) as CartItem[];
                    this.items = parsed.map(item => ({
                        ...item,
                        qty: Math.max(item.qty || 1, item.minQty || 1)
                    }));
                }
            } catch (e) {
                console.error('Failed to load cart from local storage', e);
            }
        }
    }

    private saveToStorage() {
        if (typeof window !== 'undefined') {
            localStorage.setItem('pesanku_cart', JSON.stringify(this.items));
        }
    }

    private emitChange() {
        this.saveToStorage();
        this.listeners.forEach((listener) => listener());
    }

    subscribe(listener: () => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    getSnapshot() {
        return this.items;
    }

    addItem(item: Omit<CartItem, 'qty'> & { qty?: number }) {
        const existingIndex = this.items.findIndex(
            (i) => i.productId === item.productId && i.selectedVariant === item.selectedVariant
        );

        const newQty = item.qty || item.minQty || 1;
        const minAllowed = item.minQty || 1;

        if (existingIndex >= 0) {
            this.items[existingIndex] = {
                ...this.items[existingIndex],
                ...item, // Overwrite with fresh fetched data
                qty: Math.max(this.items[existingIndex].qty + (item.qty || 1), minAllowed)
            };
        } else {
            this.items.push({ ...item, qty: Math.max(newQty, minAllowed) });
        }
        this.emitChange();
    }

    updateQty(productId: string, selectedVariant: string | undefined, qty: number) {
        const index = this.items.findIndex(
            (i) => i.productId === productId && i.selectedVariant === selectedVariant
        );

        if (index >= 0) {
            const minAllowed = this.items[index].minQty || 1;
            this.items[index].qty = Math.max(minAllowed, qty);
            this.emitChange();
        }
    }

    removeItem(productId: string, selectedVariant: string | undefined) {
        this.items = this.items.filter(
            (i) => !(i.productId === productId && i.selectedVariant === selectedVariant)
        );
        this.emitChange();
    }

    setItems(items: CartItem[]) {
        this.items = items;
        this.emitChange();
    }

    clear() {
        this.items = [];
        this.emitChange();
    }
}

export const cartStore = new CartStore();

// A simple React Hook to interact with the Cart Store
export function useCart() {
    const [isMounted, setIsMounted] = useState(false);
    const [items, setItems] = useState<CartItem[]>([]);

    useEffect(() => {
        // Hydrate after mount to avoid server mismatch
        setItems(cartStore.getSnapshot());
        setIsMounted(true);

        const unsubscribe = cartStore.subscribe(() => {
            // Need a new array reference to trigger React re-render
            setItems([...cartStore.getSnapshot()]);
        });
        return () => {
            unsubscribe();
        };
    }, []);

    const totalItems = items.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.qty * item.price, 0);

    return {
        isMounted,
        items,
        totalItems,
        totalPrice,
        addItem: useCallback((item: Omit<CartItem, 'qty'> & { qty?: number }) => cartStore.addItem(item), []),
        updateQty: useCallback((productId: string, selectedVariant: string | undefined, qty: number) => cartStore.updateQty(productId, selectedVariant, qty), []),
        removeItem: useCallback((productId: string, selectedVariant: string | undefined) => cartStore.removeItem(productId, selectedVariant), []),
        setItems: useCallback((items: CartItem[]) => cartStore.setItems(items), []),
        clear: useCallback(() => cartStore.clear(), []),
    };
}
