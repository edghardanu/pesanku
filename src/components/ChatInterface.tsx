"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Search, Send, Paperclip, Camera, Image, ChevronLeft, Calendar, FileText,
  Check, CheckCheck, Loader2, MessageCircle, X, ExternalLink,
  ShoppingBag, Trash2, ArrowLeft, Info, ShoppingCart, User, Clock
} from "lucide-react";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { formatChatTimeWIB } from "@/lib/promotionFormatting";
import { AuthUser, BuyerOrderViewItem, ChatMessage, ProductItem } from "@/types";
import StoreProductsGrid from "@/components/StoreProductsGrid";

interface ChatThread {
  orderId: string;
  title: string;
  subtitle: string;
  avatarInitial: string;
  lastMessage?: string;
  lastMessageAt?: string | Date | null;
  unreadCount: number;
  productId?: string;
  sellerId?: string;
  status?: string | null;
}

interface ChatInterfaceProps {
  mode: "buyer" | "seller";
  user: AuthUser | null;
  initialOrderId?: string | null;
  isEmbedded?: boolean;

  // Buyer-specific
  buyerOrders?: BuyerOrderViewItem[];
  setBuyerOrders?: React.Dispatch<React.SetStateAction<BuyerOrderViewItem[]>>;

  // Seller-specific
  sellerThreads?: any[];
  setSellerThreads?: React.Dispatch<React.SetStateAction<any[]>>;
  sellerProducts?: ProductItem[];
  sellerOrders?: any[];

  // Common callbacks for views redirect/tab change
  onBack?: () => void;
  onNavTab?: (tabName: string) => void;
  onSelectProductFilter?: (productId: string) => void;
}

export default function ChatInterface({
  mode,
  user,
  initialOrderId,
  isEmbedded = false,
  buyerOrders = [],
  setBuyerOrders,
  sellerThreads = [],
  setSellerThreads,
  sellerProducts = [],
  sellerOrders = [],
  onBack,
  onNavTab,
  onSelectProductFilter
}: ChatInterfaceProps) {
  const router = useRouter();

  // State
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(initialOrderId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showPenawaranForm, setShowPenawaranForm] = useState(false);
  const [penawaranData, setPenawaranData] = useState({ qty: "", price: "", date: "", productName: "", productBasePrice: 0, minQty: 1, productImageUrl: "" });
  const [showProductsPanel, setShowProductsPanel] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Buka panel produk secara default hanya di layar desktop lebar (>= 1024px)
      setShowProductsPanel(window.innerWidth >= 1024);
    }
  }, []);

  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [activeSessionStatus, setActiveSessionStatus] = useState<string | null>(null);
  const [activeSessionProductId, setActiveSessionProductId] = useState<string | null>(null);

  // Public products for the selected seller (only in buyer mode)
  const [storeProducts, setStoreProducts] = useState<ProductItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Refs for scroll and files
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const productsCacheRef = useRef<Record<string, ProductItem[]>>({});

  // Unify and sort threads list
  const threads: ChatThread[] = useMemo(() => {
    let result: ChatThread[] = [];
    if (mode === "buyer") {
      result = buyerOrders.map(o => ({
        orderId: o.orderId,
        title: o.storeName || 'Toko UMKM',
        subtitle: o.productName,
        avatarInitial: o.storeName ? o.storeName.charAt(0).toUpperCase() : 'RT',
        unreadCount: o.unreadCount || 0,
        lastMessageAt: o.lastMessageAt || o.createdAt,
        productId: o.productId,
        sellerId: o.sellerId,
        status: o.status
      }));
    } else {
      result = sellerThreads.map(t => ({
        orderId: t.orderId,
        title: t.buyerName || 'Pembeli',
        subtitle: t.productName,
        avatarInitial: (t.buyerName || 'P').charAt(0).toUpperCase(),
        unreadCount: t.unreadCount || 0,
        lastMessageAt: t.latestMessageAt || t.createdAt,
        lastMessage: t.latestMessage,
      }));
    }

    // Filter threads based on Search input
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.subtitle.toLowerCase().includes(q) ||
        t.orderId.toLowerCase().includes(q)
      );
    }

    // Sort by last message / created date descending
    return result.sort((a, b) => {
      const tA = new Date(a.lastMessageAt || 0).getTime();
      const tB = new Date(b.lastMessageAt || 0).getTime();
      return tB - tA;
    });
  }, [buyerOrders, sellerThreads, mode, searchQuery]);

  // Fetch store products on buyer side when thread changes
  const activeThread = useMemo(() => {
    return threads.find(t => t.orderId === selectedOrderId);
  }, [selectedOrderId, threads]);

  useEffect(() => {
    const controller = new AbortController();

    const targetSellerId = mode === "buyer" ? (activeThread?.sellerId || "") : (user?.id || "");

    if (targetSellerId && selectedOrderId) {
      // Jika sudah ada di cache, gunakan dari cache dan jangan hit API lagi
      if (productsCacheRef.current[targetSellerId]) {
        setStoreProducts(productsCacheRef.current[targetSellerId]);
        setIsLoadingProducts(false);
        return;
      }

      const getStoreProducts = async () => {
        setIsLoadingProducts(true);
        try {
          const res = await fetch(
            `/api/products/public?sellerId=${targetSellerId}&t=${Date.now()}`,
            {
              cache: 'no-store',
              signal: controller.signal
            }
          );
          if (res.ok) {
            const data = await res.json();
            if (!controller.signal.aborted) {
              const fetchedProducts = data.products || [];
              productsCacheRef.current[targetSellerId] = fetchedProducts;
              setStoreProducts(fetchedProducts);
            }
          }
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            // Error ditangani secara diam untuk menghindari console spam
          }
        } finally {
          if (!controller.signal.aborted) {
            setIsLoadingProducts(false);
          }
        }
      };
      getStoreProducts();
    } else {
      setStoreProducts([]);
    }

    return () => {
      controller.abort();
    };
  }, [activeThread?.sellerId, mode, selectedOrderId, user?.id]);

  // Clean unread counts optimistically when selecting thread
  useEffect(() => {
    if (selectedOrderId) {
      if (mode === "buyer" && setBuyerOrders) {
        setBuyerOrders(prev => prev.map(o => o.orderId === selectedOrderId ? { ...o, unreadCount: 0 } : o));
      } else if (mode === "seller" && setSellerThreads) {
        setSellerThreads(prev => prev.map(t => t.orderId === selectedOrderId ? { ...t, unreadCount: 0 } : t));
      }
    }
  }, [selectedOrderId, mode, setBuyerOrders, setSellerThreads]);

  // 1. Loader Effect for Active Chat
  const loadChatSession = async (orderId: string, skipLoadingState = false) => {
    if (!skipLoadingState) setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat?orderId=${orderId}&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setActiveSessionStatus(data.status);
        setActiveSessionProductId(data.productId);
      }
    } catch (err) {
      // Failed loading chat ditangani otomatis via retry pada polling
    } finally {
      if (!skipLoadingState) setIsLoadingMessages(false);
    }
  };

  // 2. Poll Effect for selected chat session
  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    if (selectedOrderId) {
      // First load
      loadChatSession(selectedOrderId, false);

      // Poll every 5 seconds
      pollingRef.current = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          loadChatSession(selectedOrderId, true);
        }
      }, 5000);
    } else {
      setMessages([]);
      setActiveSessionStatus(null);
      setActiveSessionProductId(null);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectedOrderId]);

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior });
    }, 100);
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom("smooth");
    }
  }, [messages.length]);

  // Sync selection if initialOrderId changes query
  useEffect(() => {
    if (initialOrderId && selectedOrderId !== initialOrderId) {
      setSelectedOrderId(initialOrderId);
    }
  }, [initialOrderId, selectedOrderId]);

  // Send message
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || !selectedOrderId) return;

    if (!customText) setInputText("");

    // Optimistic addition
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      text: textToSend,
      senderId: user?.id || "",
      isRead: false,
      createdAt: new Date().toISOString(),
      sender: mode === "buyer" ? "buyer" : "seller"
    };

    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom("smooth");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: selectedOrderId, text: textToSend })
      });
      if (res.ok) {
        const serverData = await res.json();
        // Replace temp message id with real message id
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: serverData.id } : m));
      }
    } catch (err) {
      // Failed sending message
    }
  };

  // Handle Photo & File updates
  const processImageUpload = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({
        icon: 'error',
        title: 'Ukuran Terlalu Besar',
        text: 'Maksimum ukuran foto adalah 2MB.',
        confirmButtonColor: '#ff5c35'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      handleSendMessage(`[CHAT_IMG|${base64}]`);
      setShowAttachmentMenu(false);
    };
    reader.readAsDataURL(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageUpload(file);
  };

  // Delete message
  const handleDeleteMessage = async (msgId: string) => {
    const result = await Swal.fire({
      title: 'Hapus Pesan?',
      text: 'Apakah Anda yakin ingin menghapus pesan ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#94A3B8',
      confirmButtonText: 'Hapus',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      // Optimistic delete
      setMessages(prev => prev.filter(m => m.id !== msgId));
      try {
        await fetch("/api/chat", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: msgId })
        });
      } catch (err) {
        // Failed deleting
      }
    }
  };

  // Edit message
  const handleEditMessage = async (msgId: string, currentText: string) => {
    const { value: text } = await Swal.fire({
      title: 'Edit Pesan',
      input: 'text',
      inputValue: currentText,
      showCancelButton: true,
      confirmButtonColor: '#800000',
      inputValidator: (value) => {
        if (!value.trim()) return 'Pesan tidak boleh kosong!';
      }
    });

    if (text) {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text } : m));
      try {
        await fetch("/api/chat", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: msgId, text })
        });
      } catch (err) {
        // Failed editing
      }
    }
  };

  // Buyer: Order confirmation modal (directly inside chat)
  const handleBuyerOrderNow = async (pId: string, pName: string, pPriceStr: string) => {
    const defaultAddress = user?.address || '';

    // Check if seller suggested a date in the chat
    let suggestedDateIso = '';
    let suggestedDateDisplay = '';
    const datePattern = /\*\*(\d{2}\/\d{2}\/\d{4})\*\*/;

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const isSellerMsg = msg.sender === 'seller' || msg.role === 'penjual' || msg.role === 'admin' || (msg.senderId !== user?.id);
      if (!isSellerMsg) continue;

      const match = (msg.text || '').match(datePattern);
      if (match) {
        suggestedDateDisplay = match[1];
        const [dd, mm, yyyy] = suggestedDateDisplay.split('/');
        suggestedDateIso = `${yyyy}-${mm}-${dd}`;
        break;
      }
    }

    const sellerDateBanner = suggestedDateDisplay
      ? `<div class="bg-amber-50 dark:bg-amber-950/20 border border-amber-500/30 rounded-xl p-3 mb-4 flex items-start gap-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" class="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span class="text-xs text-amber-850 dark:text-amber-300 leading-relaxed">Penjual menyarankan jadwal pengiriman <strong>${suggestedDateDisplay}</strong>.</span>
        </div>`
      : '';

    const { value: confirmResult } = await Swal.fire({
      title: 'Pesan Sekarang',
      html: `
        <div class="text-left space-y-4 pt-2">
          <div class="p-3 bg-base border border-border rounded-xl">
            <span class="text-xs text-text-secondary block">Produk Pilihan</span>
            <p class="font-bold text-text-primary text-sm">${pName}</p>
            <p class="text-brand-primary font-black mt-1 text-base">${pPriceStr} <span class="text-xs text-text-secondary font-normal">/ Porsi</span></p>
          </div>
          <div>
            <label class="block text-xs font-bold text-text-secondary mb-1">Jumlah Porsi <span class="text-status-error">*</span></label>
            <input type="number" id="chat-order-qty" value="1" min="1" class="input-field shadow-sm w-full" required>
          </div>
          <div>
            <label class="block text-xs font-bold text-text-secondary mb-1">Tanggal Pengiriman <span class="text-status-error">*</span></label>
            ${sellerDateBanner}
            <input type="date" id="chat-order-date" value="${suggestedDateIso}" class="input-field shadow-sm w-full" required>
          </div>
          <div>
            <label class="block text-xs font-bold text-text-secondary mb-1">Alamat Pengiriman <span class="text-xs font-normal text-text-secondary ml-1">(Opsional)</span></label>
            <textarea id="chat-order-address" class="input-field shadow-sm w-full" rows="3">${defaultAddress}</textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Ya, Lanjut Bayar',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#800000',
      cancelButtonColor: '#94A3B8',
      preConfirm: () => {
        const qtyEl = document.getElementById('chat-order-qty') as HTMLInputElement;
        const dateEl = document.getElementById('chat-order-date') as HTMLInputElement;
        const addressEl = document.getElementById('chat-order-address') as HTMLTextAreaElement;

        const qtyVal = parseInt(qtyEl?.value || '0');
        const dateVal = dateEl?.value;
        const addressVal = addressEl?.value?.trim() || '';

        if (!qtyVal || qtyVal < 1) {
          Swal.showValidationMessage('Minimal pesanan 1 porsi');
          return false;
        }
        if (!dateVal) {
          Swal.showValidationMessage('Silakan tentukan jadwal pengiriman');
          return false;
        }

        return { qty: qtyVal, orderDate: dateVal, shippingAddress: addressVal };
      }
    });

    if (confirmResult) {
      router.push(`/process-order?productId=${pId}&qty=${confirmResult.qty}&deliveryDate=${encodeURIComponent(confirmResult.orderDate)}&deliveryAddress=${encodeURIComponent(confirmResult.shippingAddress)}&chatOrderId=${selectedOrderId}`);
    }
  };

  // Seller: Schedule Negotiation dialog
  const handleSellerConfirmSchedule = async (pId: string, pName: string, pPriceStr: string, pImage: string) => {
    let defaultDateStr = new Date().toISOString().split('T')[0];
    const buyerDatePattern = /tanggal\s+(\d{2}\/\d{2}\/\d{4})/;
    for (let i = messages.length - 1; i >= 0; i--) {
      const match = (messages[i].text || '').match(buyerDatePattern);
      if (match) {
        const [dd, mm, yyyy] = match[1].split('/');
        defaultDateStr = `${yyyy}-${mm}-${dd}`;
        break;
      }
    }

    const { value: negotiationResult } = await Swal.fire({
      title: 'Konfirmasi Kesanggupan Preorder',
      html: `
        <div class="text-left space-y-4 pt-2">
          <div class="p-3 bg-base border border-border rounded-xl">
            <span class="text-xs text-text-secondary block">Produk Preorder</span>
            <p class="font-bold text-gray-900 text-sm">${pName}</p>
          </div>
          <div>
            <label class="block text-xs font-bold text-text-secondary mb-1">Tanggal Pengiriman <span class="text-status-error">*</span></label>
            <input id="presale-confirm-date" type="date" value="${defaultDateStr}" class="input-field w-full" />
          </div>
          <div>
            <label class="block text-xs font-bold text-text-secondary mb-1">Catatan Jadwal <span class="text-xs font-normal text-text-secondary ml-1">(Opsional)</span></label>
            <textarea id="presale-confirm-reason" maxlength="500" rows="3" class="input-field w-full" placeholder="Kirim tanggapan atau catatan jadwal pengiriman ke pembeli..."></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Kirim Konfirmasi Jadwal',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#800000',
      cancelButtonColor: '#94A3B8',
      preConfirm: () => {
        const dateInput = document.getElementById('presale-confirm-date') as HTMLInputElement;
        const reasonInput = document.getElementById('presale-confirm-reason') as HTMLTextAreaElement;

        if (!dateInput.value) {
          Swal.showValidationMessage('Tanggal pengiriman wajib diisi!');
          return false;
        }

        const parts = dateInput.value.split('-');
        return {
          dateStr: `${parts[2]}/${parts[1]}/${parts[0]}`, // DD/MM/YYYY format
          reason: reasonInput.value.trim()
        };
      }
    });

    if (negotiationResult) {
      const { dateStr, reason } = negotiationResult;

      let confirmMsg = `Halo kak! Pesanan Pre-Order Anda untuk produk **${pName}** kami jadwalkan pengirimannya pada **${dateStr}** (Bisa Diproses).`;
      if (reason) {
        confirmMsg += `\n\nCatatan dari kami: \n*"${reason}"*`;
      }
      confirmMsg += `\n\nSilakan klik tombol produk di bawah ini lalu lakukan *Checkout* (Pesan Sekarang) untuk menyelesaikan pesanan Anda. Terima kasih!`;
      confirmMsg += `\n\n[PRODUK_OFFER|${pId}|${pName}|${pPriceStr}|${pImage}]`;

      await handleSendMessage(confirmMsg);
    }
  };

  // Helper parser for messages
  const parseMessageContent = (text: string, isSender: boolean, msgId?: string, isResponded?: boolean, isApproved?: boolean) => {
    const trimmed = text.trim();

    // 1. Product Offer format: [PRODUK_OFFER|pId|pName|pPrice|pImage|minQty]
    const offerMatch = trimmed.match(/\[PRODUK_OFFER\|(.*?)\|(.*?)\|(.*?)\|(.*?)(?:\|(.*?))?\]/);
    if (offerMatch) {
      const remainder = trimmed.replace(offerMatch[0], "").trim();
      const pId = offerMatch[1];
      const pName = offerMatch[2];
      const rawPriceStr = offerMatch[3].replace(/[^\d]/g, '');
      const pPriceRaw = Number(rawPriceStr) || 0;
      const pImage = offerMatch[4] || "/street-food-festival.jpg";
      const minQty = offerMatch[5] ? Number(offerMatch[5]) : 1;

      const formattedPrice = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(pPriceRaw);

      return (
        <div className="flex flex-col gap-2">
          {remainder && (
            <p className="whitespace-pre-line text-sm break-words leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderRichText(remainder) }} />
          )}
          <div className={`flex flex-col gap-2.5 p-3 rounded-xl max-w-[270px] shadow-sm text-left border ${isSender ? "bg-white/15 border-white/20 text-white" : "bg-surface border-border text-text-primary"
            }`}>
            <div className="flex gap-3 items-center">
              <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-base relative border border-black/5 dark:border-white/10">
                <img src={pImage} alt={pName} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold truncate leading-tight ${isSender ? "text-white" : "text-text-primary"}`} title={pName}>{pName}</p>
                <p className={`text-[11px] font-extrabold mt-1 ${isSender ? "text-amber-250" : "text-brand-primary"}`}>{formattedPrice} <span className="text-[9px] font-normal opacity-90">(Min. {minQty})</span></p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mt-1">
              {/* Product link works for both sides */}
              <a
                href={`/product/${encodeURIComponent(pName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${pId}`}
                target="_blank"
                className={`w-full text-center text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 active:scale-95 ${isSender ? "bg-white text-brand-primary hover:bg-neutral-50" : "bg-brand-primary text-white hover:bg-brand-primary-hover"
                  }`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Lihat Produk
              </a>

              {/* Status badge for buyer asking a question */}
              {isSender && mode === "buyer" && (
                <div className="w-full bg-white/20 text-white/80 text-[10px] font-bold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 cursor-not-allowed border border-white/10 shadow-inner mt-1">
                  <Clock className="w-3 h-3 shrink-0" />
                  Sedang ditanyakan kepada penjual
                </div>
              )}

              {/* Seller receives product query from buyer -> Show Ada/Tidak buttons and Note */}
              {!isSender && mode === "seller" && (
                <div className="flex flex-col gap-1.5 w-full mt-2 pt-2 border-t border-gray-200">
                  <input
                    type="text"
                    id={`note-${msgId}`}
                    placeholder="Catatan tambahan (opsional)"
                    className="w-full text-[10px] p-1.5 border border-gray-300 rounded mb-1 outline-none focus:border-brand-primary"
                  />
                  <div className="flex gap-1.5 w-full">
                    <button
                      onClick={async () => {
                        const noteEl = document.getElementById(`note-${msgId}`) as HTMLInputElement;
                        const note = noteEl?.value ? `\nCatatan: ${noteEl.value}` : '';
                        await handleSendMessage(`Ya kak, produk *${pName}* (Min. ${minQty}) saat ini **Tersedia (Ada)** dan siap dipesan.${note}`);
                      }}
                      className="flex-1 bg-status-success hover:bg-emerald-600 text-white text-[10px] font-bold py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 active:scale-95 border-none cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      Ada
                    </button>
                    <button
                      onClick={async () => {
                        const noteEl = document.getElementById(`note-${msgId}`) as HTMLInputElement;
                        const note = noteEl?.value ? `\nCatatan: ${noteEl.value}` : '';
                        await handleSendMessage(`Mohon maaf kak, untuk sementara produk *${pName}* **Tidak Tersedia** (Kosong).${note}`);
                      }}
                      className="flex-1 bg-status-error hover:bg-red-600 text-white text-[10px] font-bold py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 active:scale-95 border-none cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      Tidak Ada
                    </button>
                  </div>
                </div>
              )}

              {/* Buyer receives product offer from seller -> Show Setuju/Tolak */}
              {!isSender && mode === "buyer" && (
                <div className="flex gap-1.5 w-full mt-1">
                  <button
                    onClick={() => handleBuyerOrderNow(pId, pName, formattedPrice)}
                    className="flex-1 bg-status-success hover:bg-emerald-600 text-white text-[11px] font-bold py-2 px-2 rounded-lg flex items-center justify-center gap-1 active:scale-95 border-none cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    Setuju (Beli)
                  </button>
                  <button
                    onClick={async () => {
                      await handleSendMessage(`Maaf kak, saya kurang tertarik dengan penawaran produk *${pName}*.`);
                    }}
                    className="flex-1 bg-status-error hover:bg-red-600 text-white text-[11px] font-bold py-2 px-2 rounded-lg flex items-center justify-center gap-1 active:scale-95 border-none cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    Tolak
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 2. Surat Penawaran format: [SURAT_PENAWARAN|qty|price|date|basePrice|productName|productImageUrl]
    const suratMatch = trimmed.match(/\[SURAT_PENAWARAN\|(.*?)\|(.*?)\|(.*?)(?:\|(.*?))?(?:\|(.*?))?(?:\|(.*?))?\]/);
    if (suratMatch) {
      const remainder = trimmed.replace(suratMatch[0], "").trim();
      const sQty = suratMatch[1];
      const sQtyNum = parseInt(suratMatch[1] || "0");
      const sPriceNum = parseInt(suratMatch[2] || "0");
      const sTotalPrice = isNaN(sPriceNum) ? suratMatch[2] : (sQtyNum * sPriceNum).toLocaleString('id-ID');
      const sDate = suratMatch[3];
      const sBasePriceNum = parseInt(suratMatch[4] || suratMatch[2] || "0");
      const sTotalBasePrice = isNaN(sBasePriceNum) ? suratMatch[4] || suratMatch[2] : (sQtyNum * sBasePriceNum).toLocaleString('id-ID');
      const sProductName = suratMatch[5] || activeThread?.subtitle || "Produk Pembeli";
      const sProductUrl = suratMatch[6] || undefined; // may be empty string or undefined

      return (
        <div className="flex flex-col gap-2">
          <p className="whitespace-pre-line text-sm break-words leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderRichText(remainder || "Halo kak! Berikut adalah surat rincian penawaran pesanan yang ingin saya ajukan. Mohon sekiranya dapat dicek dan dipertimbangkan:") }} />

          <div className={`flex flex-col gap-0 overflow-hidden rounded-xl w-full shadow-sm text-left border ${isSender ? "bg-white border-brand-primary/20" : "bg-white border-border"}`}>
            <div className="bg-brand-primary text-white p-3 flex items-center justify-center gap-2">
              <FileText className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-sm tracking-wide uppercase">Surat Penawaran</h4>
            </div>
            <div className="p-3 bg-white flex flex-col gap-2">
              {sProductUrl && (
                <div className="w-full h-24 mb-1 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 relative shrink-0">
                  <img src={sProductUrl} alt={sProductName} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex justify-between items-start gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100 min-w-0">
                <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Produk:</span>
                <span className="text-[11px] font-bold text-brand-primary text-right break-words" title={sProductName}>{sProductName}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100 min-w-0">
                <span className="text-xs font-semibold text-gray-500 whitespace-nowrap mr-2">Jumlah:</span>
                <span className="text-xs font-black text-gray-800 text-right">{sQty} Porsi</span>
              </div>

              <div className="flex flex-col gap-1 -mt-1">
                {sBasePriceNum !== sPriceNum && (
                  <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100 opacity-70 mt-1">
                    <span className="text-[10px] font-semibold text-gray-400">Total Harga Normal:</span>
                    <span className="text-[10px] font-bold text-gray-400 line-through">Rp {sTotalBasePrice}</span>
                  </div>
                )}
                <div className="flex justify-between items-center bg-brand-primary/5 p-2 rounded-lg border border-brand-primary/20">
                  <span className="text-xs font-bold text-brand-primary truncate mr-1">
                    {sBasePriceNum !== sPriceNum ? 'Harga Penawaran' : 'Total Harga'}
                  </span>
                  <span className="text-xs font-black text-brand-primary whitespace-nowrap">Rp {sTotalPrice}</span>
                </div>
              </div>
              <div className="flex flex-col bg-[#fff8eb] p-2 rounded-lg border border-orange-100 mt-1">
                <span className="text-[10px] font-bold text-orange-600 flex items-center gap-1 mb-1">
                  <Calendar className="w-3 h-3" /> Tanggal Pesanan
                </span>
                <span className="text-xs font-black text-gray-800">{sDate}</span>
              </div>

              {/* Status badge for sender (both buyer and seller) */}
              {isSender && !isResponded && (
                <div className="w-full bg-white text-gray-500 text-[10px] font-bold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 cursor-not-allowed border border-gray-200 mt-1 shadow-sm opacity-95">
                  <Clock className="w-3 h-3 shrink-0" />
                  Sedang ditanyakan kepada {mode === "buyer" ? "penjual" : "pembeli"}
                </div>
              )}

              {!isSender && (
                <div className="flex flex-col w-full gap-2 mt-2 pt-2 border-t border-gray-100">
                  {isResponded ? (
                    <div className="text-[11px] text-center font-bold text-gray-500 bg-gray-100 py-2 rounded-lg border border-gray-200 uppercase tracking-wider">
                      Sudah Direspon
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            const noteEl = document.getElementById(`offer-note-${msgId}`) as HTMLInputElement;
                            const note = noteEl?.value.trim() || '';
                            const pronoun = mode === "buyer" ? "saya" : "kami";
                            const noteStr = note ? `\n\nCatatan dari ${pronoun}:\n*"${note}"*` : '';
                            const msg = mode === "buyer"
                              ? `Mohon maaf kak, untuk penawaran pesanan **${sProductName}** dengan jumlah **${sQty} Porsi** seharga **Rp ${sTotalPrice}** pada tanggal **${sDate}** belum dapat saya setujui.`
                              : `Mohon maaf kak, untuk penawaran pesanan **${sProductName}** dengan jumlah **${sQty} Porsi** seharga **Rp ${sTotalPrice}** pada tanggal **${sDate}** belum dapat kami setujui.`;

                            handleSendMessage(msg + noteStr);
                          }}
                          className="bg-white border border-status-error text-status-error hover:bg-red-50 text-[11px] font-bold py-2 rounded-lg transition-colors cursor-pointer"
                        >
                          Tolak
                        </button>
                        <button
                          onClick={async () => {
                            const noteEl = document.getElementById(`offer-note-${msgId}`) as HTMLInputElement;
                            const note = noteEl?.value.trim() || '';
                            const pronoun = mode === "buyer" ? "saya" : "kami";
                            const noteStr = note ? `\n\nCatatan dari ${pronoun}:\n*"${note}"*` : '';
                            const msg = mode === "buyer"
                              ? `Halo kak! Penawaran pesanan **${sProductName}** untuk **${sQty} Porsi** seharga **Rp ${sTotalPrice}** pada tanggal **${sDate}** saya **SETUJUI**. Saya akan segera melanjutkan proses sesuai instruksi kakak.`
                              : `Halo kak! Penawaran pesanan **${sProductName}** untuk **${sQty} Porsi** seharga **Rp ${sTotalPrice}** pada tanggal **${sDate}** kami **SETUJUI** (Bisa Diproses). Silakan kakak bisa lanjut melakukan pembayaran ya!`;

                            await handleSendMessage(msg + noteStr);

                            // Update the main order status to waiting_verification if seller approves
                            if (mode === "seller") {
                              try {
                                // Format DD/MM/YYYY appropriately if needed before sending to db
                                const [d1, d2, d3] = sDate.includes('/') ? sDate.split('/') : sDate.split('-');
                                const isoDate = (d1 && d1.length === 2 && d3 && d3.length === 4) ? `${d3}-${d2}-${d1}` : sDate;

                                await fetch('/api/orders/update-status', {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ orderId: selectedOrderId, status: 'waiting_verification', requestedDeliveryDate: isoDate })
                                });
                                // Dispatch CustomEvent for immediate UI sync
                                if (typeof window !== 'undefined') {
                                  window.dispatchEvent(new CustomEvent('seller-order-status-updated', {
                                    detail: { orderId: selectedOrderId, status: 'waiting_verification', requestedDeliveryDate: isoDate }
                                  }));
                                }
                              } catch (e) {
                                console.error(e);
                              }
                            }
                          }}
                          className="bg-status-success text-white hover:bg-emerald-600 text-[11px] font-bold py-2 rounded-lg transition-colors cursor-pointer"
                        >
                          Setujui
                        </button>
                      </div>
                      <input
                        id={`offer-note-${msgId}`}
                        type="text"
                        placeholder="Ketik catatan tambahan di sini... (Opsional)"
                        className="w-full text-[11px] px-2 py-1.5 border border-gray-200 rounded outline-none focus:border-brand-primary placeholder:text-gray-400 bg-gray-50 mt-1"
                      />
                    </>
                  )}
                </div>
              )}

              {isSender && !isResponded && (
                <div className="flex flex-col w-full gap-2 mt-2 pt-2 border-t border-white/20">
                  <button
                    onClick={async () => {
                      const result = await Swal.fire({
                        title: 'Batalkan Penawaran?',
                        text: `Apakah Anda yakin ingin membatalkan penawaran ini?`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#ef4444',
                        cancelButtonColor: '#94a3b8',
                        confirmButtonText: 'Ya, Batalkan',
                        cancelButtonText: 'Tutup'
                      });

                      if (result.isConfirmed) {
                        try {
                          Swal.fire({
                            title: 'Memproses...',
                            allowOutsideClick: false,
                            didOpen: () => Swal.showLoading()
                          });

                          const reqBody = {
                            orderId: selectedOrderId,
                            status: 'cancelled',
                            ...(mode === "seller" ? { cancelReason: "Penjual membatalkan penawaran" } : {})
                          };

                          const res = await fetch('/api/orders/update-status', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(reqBody)
                          });

                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || 'Gagal membatalkan pesanan');

                          // Hapus chat sebelumnya otomatis
                          if (msgId) {
                            try {
                              await fetch(`/api/chat`, {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: msgId })
                              });
                            } catch (e) {
                              console.error(e);
                            }
                          }

                          Swal.fire({
                            icon: 'success',
                            title: 'Penawaran Dibatalkan',
                            text: 'Pemesanan telah dibatalkan sebelum disetujui.',
                            timer: 2000,
                            showConfirmButton: false
                          }).then(() => {
                            window.location.reload();
                          });
                        } catch (error) {
                          Swal.fire('Error', error instanceof Error ? error.message : 'Terjadi Kesalahan', 'error');
                        }
                      }
                    }}
                    className="bg-transparent border border-white/40 text-white hover:bg-white/10 text-[11px] font-bold py-2 rounded-lg transition-colors cursor-pointer w-full mt-1"
                  >
                    Batalkan Penawaran
                  </button>
                </div>
              )}

              {isSender && isResponded && (
                <div className="flex flex-col w-full gap-2 mt-2 pt-2 border-t border-white/20">
                  <div className="text-[11px] text-center font-bold text-white/80 bg-black/10 py-2 rounded-lg uppercase tracking-wider shadow-inner border border-black/5">
                    Sudah Direspon
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 3. Chat Image format: [CHAT_IMG|dataUrl]
    if (trimmed.startsWith("[CHAT_IMG|") && trimmed.endsWith("]")) {
      const dataUrl = trimmed.slice(10, -1);
      return (
        <div
          onClick={() => {
            Swal.fire({
              imageUrl: dataUrl,
              imageWidth: 600,
              confirmButtonText: 'Tutup',
              confirmButtonColor: '#800000',
              customClass: {
                popup: 'bg-surface text-text-primary rounded-xl border border-border'
              }
            });
          }}
          className="mt-1 w-full max-w-[220px] rounded-lg overflow-hidden border border-black/5 dark:border-white/5 cursor-pointer hover:opacity-90 transition-opacity bg-neutral-200/50 p-1 flex justify-center items-center"
        >
          <img src={dataUrl} alt="Payload" className="w-full h-auto object-cover rounded max-h-[220px]" />
        </div>
      );
    }

    // 3. Regular text content
    const isSellerApprovalMsg = !isSender && mode === "buyer" && text.includes("**SETUJUI**") && !text.includes("belum");

    return (
      <div className="flex flex-col gap-2 w-full">
        <p
          className="whitespace-pre-wrap text-sm break-words leading-relaxed w-full"
          dangerouslySetInnerHTML={{ __html: renderRichText(text) }}
        />
        {isSellerApprovalMsg && (
          <button
            onClick={async () => {
              // Parse out qty and date
              const qtyMatch = text.match(/untuk \*\*(.*?)\*\*/);
              const dateMatch = text.match(/pada tanggal \*\*(.*?)\*\*/);

              const sQtyNum = qtyMatch ? parseInt(qtyMatch[1]) : 1;
              const rawDate = dateMatch ? dateMatch[1] : '';
              const dateParts = rawDate.split('/');
              let formattedDate = rawDate;
              if (dateParts.length === 3) {
                formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
              }

              try {
                Swal.fire({
                  title: 'Menyiapkan Pembayaran...',
                  allowOutsideClick: false,
                  didOpen: () => Swal.showLoading()
                });

                const checkoutRes = await fetch('/api/checkout', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    productId: activeSessionProductId || activeThread?.productId || '',
                    qty: sQtyNum,
                    deliveryDate: formattedDate,
                    chatOrderId: selectedOrderId
                  })
                });

                const checkoutData = await checkoutRes.json();
                if (!checkoutRes.ok) throw new Error(checkoutData.error || 'Gagal memproses pesanan.');

                const activeOrderId = checkoutData.orderId || selectedOrderId;
                const payRes = await fetch('/api/ipaymu/create-payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ orderId: activeOrderId }),
                });

                const payData = await payRes.json();
                if (!payRes.ok) throw new Error(payData.error || 'Gagal membuat URL pembayaran.');

                if (payData.paymentUrl) {
                  window.location.href = payData.paymentUrl;
                } else {
                  throw new Error('URL pembayaran tidak tersedia.');
                }
              } catch (err: any) {
                Swal.fire({
                  icon: 'error',
                  title: 'Gagal Memproses',
                  text: err.message || 'Terjadi kesalahan saat memproses pembayaran.'
                });
              }
            }}
            className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white text-[11px] font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 active:scale-95 border-none cursor-pointer mt-1 mb-1 shadow-sm"
          >
            <Check className="w-3.5 h-3.5" /> Bayar Sekarang
          </button>
        )}
      </div>
    );
  };

  // Helper bold/italic/links highlights
  const renderRichText = (txt: string) => {
    // Temporarily extract <b>...</b> HTML tags before escaping
    // This allows messages stored with HTML bold (from older system) to render correctly
    const boldPlaceholders: string[] = [];
    let result = txt.replace(/<b>(.*?)<\/b>/gi, (_, inner) => {
      const idx = boldPlaceholders.length;
      boldPlaceholders.push(inner);
      return `%%BOLD${idx}%%`;
    });

    result = result
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Restore bold placeholders as <strong> tags
    result = result.replace(/%%BOLD(\d+)%%/g, (_, idx) => `<strong>${boldPlaceholders[parseInt(idx)]}</strong>`);

    // Replace markdown bold: **text**
    result = result.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Replace markdown italic: *text*
    result = result.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // Replace links
    result = result.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="underline hover:text-brand-primary-hover">$1</a>');

    return result;
  };

  // Render message groups by day
  const messageGroups = useMemo(() => {
    const groups: Record<string, ChatMessage[]> = {};
    messages.forEach(m => {
      let dateKey = "Hari ini";
      if (m.createdAt) {
        const msgDate = new Date(m.createdAt);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (msgDate.toDateString() === today.toDateString()) {
          dateKey = "Hari ini";
        } else if (msgDate.toDateString() === yesterday.toDateString()) {
          dateKey = "Kemarin";
        } else {
          dateKey = msgDate.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric"
          });
        }
      }
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(m);
    });
    return groups;
  }, [messages]);

  return (
    <div className={isEmbedded ? "flex w-full h-full border-none shadow-none flex-1 rounded-none overflow-hidden relative select-none" : "flex h-[calc(100vh-140px)] md:h-[650px] w-full card border border-border bg-surface shadow-md overflow-hidden relative select-none"}>

      {/* ── SECTION A: SIDEBAR (Chat list threads) ── */}
      {!isEmbedded && (
        <div className={`w-full md:w-[300px] lg:w-[325px] xl:w-[350px] border-r border-border flex flex-col h-full bg-surface-secondary/70 ${selectedOrderId ? "hidden md:flex" : "flex"}`}>

          {/* Search header list */}
          <div className="p-4 border-b border-border bg-surface flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2 text-text-primary">
                <MessageCircle className="w-6 h-6 text-brand-primary" />
                Obrolan
              </h2>
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-full transition-colors flex items-center text-text-secondary md:hidden"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Cari obrolan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10 pr-4 py-2 text-sm bg-base border-border"
              />
              <Search className="w-4 h-4 text-text-secondary absolute left-3.5 top-3" />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-3 text-text-secondary hover:text-text-primary">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Channels listing */}
          <div className="flex-1 overflow-y-auto divide-y divide-border bg-base/5 flex flex-col">
            {threads.length === 0 ? (
              <div className="p-10 text-center text-text-secondary flex flex-col items-center justify-center flex-1">
                <MessageCircle className="w-10 h-10 text-border mb-3" />
                <p className="text-sm">Tidak ada percakapan ditemukan.</p>
              </div>
            ) : (
              threads.map((t) => {
                const isActive = t.orderId === selectedOrderId;
                return (
                  <div
                    key={t.orderId}
                    onClick={() => setSelectedOrderId(t.orderId)}
                    className={`flex items-center gap-3.5 p-4 cursor-pointer transition-all border-l-4 border-transparent hover:bg-neutral-50 dark:hover:bg-slate-800/40 relative ${isActive ? "bg-brand-primary/5 dark:bg-brand-primary/10 border-l-brand-primary" : "bg-surface"
                      }`}
                  >
                    {/* Styled avatar profile */}
                    <div className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-tr from-brand-primary/20 to-brand-primary/5 text-brand-primary border border-brand-primary/10 font-bold text-sm relative shadow-sm">
                      {t.avatarInitial}
                    </div>

                    {/* Name structure preview */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="font-bold text-sm text-text-primary truncate">{t.title}</h4>
                        <span className="text-[10px] text-text-secondary shrink-0">
                          {t.lastMessageAt ? formatChatTimeWIB(t.lastMessageAt) : ""}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-brand-primary truncate uppercase tracking-tight mb-1">{t.subtitle}</p>
                      <p className="text-xs text-text-secondary truncate block leading-snug">
                        {t.lastMessage ? t.lastMessage : "📷 Kemitraan Preorder"}
                      </p>
                    </div>

                    {/* Unread dot alerts */}
                    {t.unreadCount > 0 && (
                      <span className="absolute right-4 bottom-4 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-primary px-1.5 text-[9px] font-bold text-white shadow-sm animate-pulse-slow">
                        {t.unreadCount}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── SECTION B: ACTIVE CONVERSATION PANE ── */}
      <div className={`flex-1 flex flex-col h-full bg-base ${!selectedOrderId ? "hidden md:flex" : "flex"} ${isEmbedded ? "w-full min-w-full" : ""}`}>
        {selectedOrderId && activeThread ? (
          <div className="flex flex-1 flex-col h-full relative overflow-hidden">

            {/* Header profile details */}
            <div className="p-4 border-b border-border bg-surface flex items-center justify-between shadow-xs sticky top-0 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSelectedOrderId(null)}
                  className="p-1.5 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-full transition-colors inline-block md:hidden !text-slate-900 mr-1"
                  title="Kembali ke daftar chat"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-brand-primary/10 text-brand-primary font-bold text-sm border border-brand-primary/20 shrink-0 select-none shadow-sm">
                  {activeThread.avatarInitial}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm sm:text-base !text-slate-900 truncate">{activeThread.title}</h3>
                    {activeSessionStatus === "chat_only" && (
                      <span className="bg-brand-primary/10 text-brand-primary text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider">Tanya Produk</span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-secondary font-medium tracking-tight truncate max-w-[220px] sm:max-w-md">Discussing: {activeThread.subtitle}</p>
                </div>
              </div>

              {/* Showcase trigger buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowProductsPanel(!showProductsPanel)}
                  className={`p-2 rounded-xl flex items-center justify-center gap-1 text-xs font-semibold border transition-all ${showProductsPanel
                    ? "bg-brand-primary/10 border-brand-primary/20 text-brand-primary"
                    : "bg-surface border-border text-text-secondary hover:text-brand-primary hover:border-brand-primary/20"
                    }`}
                  title="Tampilkan produk-produk"
                >
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Menu Toko</span>
                </button>
              </div>
            </div>

            {/* Conversation Core Body (Split with Products Showcase Panel) */}
            <div className="flex-1 flex overflow-hidden relative">

              {/* Messages viewport */}
              <div className="flex-1 flex flex-col h-full bg-neutral-50 dark:bg-slate-900/10 overflow-y-auto px-4 py-4 space-y-4">
                {isLoadingMessages && messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-text-secondary">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-primary mb-2" />
                    <p className="text-xs">Memuat riwayat chat...</p>
                  </div>
                ) : (
                  Object.entries(messageGroups).map(([dateKey, groupMessages]) => (
                    <div key={dateKey} className="flex flex-col space-y-3">
                      {/* Date Separator Pill */}
                      <div className="flex justify-center my-3 relative">
                        <span className="bg-neutral-200 dark:bg-slate-800 text-[10px] sm:text-xs text-text-primary px-3.5 py-1 rounded-full font-bold select-none shadow-xs border border-neutral-300/20">
                          {dateKey}
                        </span>
                      </div>

                      {groupMessages.map((m) => {
                        const isSender = (m.senderId && user?.id && m.senderId === user.id) || (mode === "buyer" && m.sender === "buyer") || (mode === "seller" && m.sender === "seller");

                        return (
                          <div
                            key={m.id}
                            className={`flex w-full group/msg gap-2.5 items-end ${isSender ? "justify-end" : "justify-start"}`}
                          >
                            {/* Profile image left avatar for receiver */}
                            {!isSender && (
                              <div className="w-7 h-7 rounded-full flex items-center justify-center bg-neutral-200 text-brand-primary font-bold text-xs select-none shadow-xs shrink-0 mb-1 border border-neutral-300">
                                {activeThread.avatarInitial}
                              </div>
                            )}

                            {/* Bubble item content */}
                            <div className="max-w-[75%] md:max-w-[65%] flex flex-col">
                              {/* Store name indicator for receiver */}
                              {!isSender && (
                                <span className="text-[10px] font-bold text-brand-primary/80 mb-1 pl-1 select-none tracking-wide">
                                  {activeThread.title}
                                </span>
                              )}

                              <div className={`p-3 rounded-2xl relative shadow-xs ${isSender
                                ? "bg-brand-primary text-white rounded-br-none"
                                : "bg-surface border border-border text-text-primary rounded-bl-none"
                                }`}>

                                {/* Header buttons deletion/edit on hover of sent messages */}
                                {isSender && m.id && !m.id.startsWith("temp-") && (
                                  <div className="absolute right-0 bottom-full mb-1 flex items-center gap-1.5 opacity-0 group-hover/msg:opacity-100 transition-opacity bg-surface border border-border shadow-md rounded-full px-2 py-0.5 z-10">
                                    <button
                                      onClick={() => handleEditMessage(m.id!, m.text)}
                                      className="text-[9px] font-bold text-brand-primary hover:underline bg-transparent border-none cursor-pointer"
                                      title="Edit pesan"
                                    >
                                      Edit
                                    </button>
                                    <span className="text-text-secondary text-[8px]">•</span>
                                    <button
                                      onClick={() => handleDeleteMessage(m.id!)}
                                      className="text-[9px] font-bold text-status-error hover:underline bg-transparent border-none cursor-pointer"
                                      title="Hapus pesan"
                                    >
                                      Hapus
                                    </button>
                                  </div>
                                )}

                                {(() => {
                                  const getParty = (msgItem: ChatMessage) => msgItem.role === 'penjual' || msgItem.sender === 'seller' ? 'seller' : 'buyer';
                                  const mIndex = messages.findIndex(x => x.id === m.id);
                                  const respondMsg = messages.slice(mIndex + 1).find(
                                    msg => getParty(msg) !== getParty(m) &&
                                      (msg.text.includes('SETUJUI') || msg.text.includes('belum dapat'))
                                  );
                                  const isResponded = !!respondMsg;
                                  const isApproved = isResponded && respondMsg.text.includes('SETUJUI');
                                  return parseMessageContent(m.text, isSender, m.id, isResponded, isApproved);
                                })()}

                                {/* Timeline + tick markers */}
                                <div className="flex items-center justify-end gap-1 mt-1.5 select-none opacity-85">
                                  <span className={`text-[8.5px] ${isSender ? "text-white/80" : "text-text-secondary"}`}>
                                    {m.createdAt ? formatChatTimeWIB(m.createdAt) : ""}
                                  </span>
                                  {isSender && (
                                    <span>
                                      {m.isRead ? (
                                        <CheckCheck className="w-3.5 h-3.5 text-blue-400 fill-current" />
                                      ) : (
                                        <Check className="w-3.5 h-3.5 text-white/50" />
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}

                {/* Scroll Anchor */}
                <div ref={chatEndRef} />
              </div>

              {/* Showcase right items panel drawer */}
              {showProductsPanel && (
                <div className="w-[280px] border-l border-border bg-surface h-full flex flex-col z-20 absolute right-0 top-0 bottom-0 2xl:relative shadow-2xl 2xl:shadow-none transform transition-transform duration-200">
                  <div className="p-3 border-b border-border bg-base/50 flex align-center justify-between shrink-0">
                    <span className="text-xs font-bold text-text-primary uppercase tracking-tight flex items-center gap-1.5 mt-0.5">
                      <ShoppingBag className="w-4 h-4 text-brand-primary" />
                      {mode === "buyer" ? "Preorder Toko" : "Tawarkan Produk"}
                    </span>
                    <button
                      onClick={() => setShowProductsPanel(false)}
                      className="p-1 hover:bg-neutral-100 dark:hover:bg-slate-700/80 rounded-full text-text-secondary"
                    >
                      <X className="w-4 h-4 hover:text-text-primary" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3.5 space-y-4 bg-base/15">
                    {mode === "buyer" ? (
                      isLoadingProducts ? (
                        <div className="flex items-center justify-center p-8 text-text-secondary">
                          <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
                        </div>
                      ) : storeProducts.length === 0 ? (
                        <div className="text-center py-6 text-xs text-text-secondary border border-dashed border-border rounded-xl bg-surface">
                          Tidak ada produk aktif.
                        </div>
                      ) : (
                        storeProducts.map(p => {
                          const pImage = p.imageUrl || "/street-food-festival.jpg";
                          const minQty = p.preorderMinQty || p.minOrderQty || p.minQty || 1;
                          const totalPrice = p.price * minQty;
                          const formattedPrice = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalPrice);

                          return (
                            <div key={p.id} className="flex flex-col gap-3 p-3.5 bg-surface border border-border rounded-xl shadow-xs transition-colors hover:border-brand-primary/30">
                              <div className="flex gap-2.5 items-center">
                                <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-base border border-border relative">
                                  <img src={pImage} alt={p.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="text-xs font-bold text-text-primary line-clamp-2 leading-tight" title={p.name}>{p.name}</p>
                                  <p className="text-[10px] font-bold text-brand-primary mt-1">{formattedPrice} <span className="text-[9px] font-normal text-text-secondary">(Min. {minQty})</span></p>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setInputText(`Permisi kak, apakah produk *${p.name}* ini masih tersedia untuk dipesan?\n\n[PRODUK_OFFER|${p.id}|${p.name}|${totalPrice}|${pImage}|${minQty}]`);
                                  if (window.innerWidth < 1024) {
                                    setShowProductsPanel(false);
                                  }
                                }}
                                className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white text-[10px] font-black py-1.5 rounded-lg active:scale-95 transition-all text-center border-none cursor-pointer"
                              >
                                Tanyakan Produk
                              </button>
                            </div>
                          );
                        })
                      )
                    ) : (
                      storeProducts.length === 0 ? (
                        <div className="text-center py-6 text-xs text-text-secondary border border-dashed border-border rounded-xl bg-surface">
                          Tidak ada produk yang siap ditawarkan.
                        </div>
                      ) : (
                        storeProducts.map(p => {
                          const pImage = p.imageUrl || "/street-food-festival.jpg";
                          const minQty = p.preorderMinQty || p.minOrderQty || p.minQty || 1;
                          const totalPrice = p.price * minQty;
                          const formattedPrice = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalPrice);

                          return (
                            <div key={p.id} className="flex flex-col gap-3 p-3.5 bg-surface border border-border rounded-xl shadow-xs transition-all hover:border-brand-primary/30">
                              <div className="flex gap-2.5 items-center">
                                <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-base border border-border relative">
                                  <img src={pImage} alt={p.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="text-xs font-bold text-text-primary line-clamp-2 leading-tight text-slate-800" title={p.name}>{p.name}</p>
                                  <p className="text-[10px] font-bold text-brand-primary mt-1">{formattedPrice} <span className="text-[9px] font-normal text-text-secondary">(Min. {minQty})</span></p>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setInputText(`Halo kak! Kami menawarkan produk pre-order *${p.name}* spesial untuk kakak:\n\n[PRODUK_OFFER|${p.id}|${p.name}|${totalPrice}|${pImage}|${minQty}]`);
                                  if (window.innerWidth < 1024) {
                                    setShowProductsPanel(false);
                                  }
                                }}
                                className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white text-[10px] font-black py-1.5 rounded-lg active:scale-95 transition-all text-center border-none cursor-pointer"
                              >
                                Tawarkan ke Pembeli
                              </button>
                            </div>
                          );
                        })
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Input message bar area */}
            <div className="p-3 border-t border-border bg-surface flex flex-col relative shrink-0">

              {/* Attachment selector floating bubble */}
              {showAttachmentMenu && (
                <div className="absolute bottom-full left-4 mb-2 flex flex-col gap-2 bg-surface border border-border p-3 rounded-2xl shadow-xl z-30 transition-all origin-bottom-left min-w-[200px]">
                  <button
                    onClick={() => {
                      setShowAttachmentMenu(false);
                      const activeBuyerOrderInfo = mode === "buyer" ? buyerOrders?.find(o => o.orderId === selectedOrderId) : null;
                      const activeSellerOrderInfo = mode === "seller" ? sellerOrders?.find(o => o.id === selectedOrderId) : null;

                      let basePrice = "";
                      let baseQty = 1;
                      let productImageUrl = "";

                      if (mode === "buyer" && activeBuyerOrderInfo) {
                        if (activeBuyerOrderInfo.productPrice) basePrice = String(activeBuyerOrderInfo.productPrice);
                        else if (activeBuyerOrderInfo.qty > 0) basePrice = String(activeBuyerOrderInfo.totalPrice / activeBuyerOrderInfo.qty);
                        baseQty = activeBuyerOrderInfo.minQty || 1;
                        productImageUrl = activeBuyerOrderInfo.productImageUrl || "";
                      } else if (mode === "seller" && activeSellerOrderInfo) {
                        if (activeSellerOrderInfo.productPrice) basePrice = String(activeSellerOrderInfo.productPrice);
                        else if (activeSellerOrderInfo.qty > 0) basePrice = String(activeSellerOrderInfo.totalPrice / activeSellerOrderInfo.qty);
                        baseQty = activeSellerOrderInfo.minOrderQty || 1;
                        productImageUrl = activeSellerOrderInfo.productImageUrl || "";
                      }

                      setPenawaranData({
                        qty: String(baseQty),
                        price: String(basePrice),
                        date: "",
                        productName: activeThread?.subtitle || "",
                        productBasePrice: Number(basePrice) || 0,
                        minQty: baseQty,
                        productImageUrl: productImageUrl
                      });
                      setShowPenawaranForm(true);
                    }}
                    className="flex flex-row items-center justify-start gap-3 w-full bg-base hover:bg-brand-primary/10 hover:text-brand-primary border border-border rounded-xl p-3 transition-colors cursor-pointer text-text-secondary"
                  >
                    <FileText className="w-5 h-5 shrink-0" />
                    <span className="text-[12px] font-semibold">Surat Penawaran</span>
                  </button>
                </div>
              )}

              {/* Hidden System upload portals */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                accept="image/*"
                className="hidden"
              />
              <input
                type="file"
                ref={cameraInputRef}
                onChange={onFileChange}
                accept="image/*"
                capture="environment"
                className="hidden"
              />

              {/* Input details layout */}
              <div className="flex gap-2.5 items-center w-full">
                <button
                  type="button"
                  onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                  className="flex items-center justify-center w-11 h-11 text-text-secondary hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-colors shrink-0"
                  title="Lampirkan foto"
                >
                  <Paperclip className="w-5 h-5" />
                </button>


                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ketik pesan..."
                  className="input-field flex-1 text-sm bg-base border-border px-4 py-2.5 h-11 focus:outline-none"
                />

                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim()}
                  className="btn-primary px-4.5 rounded-xl h-11 flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:pointer-events-none shrink-0"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

          </div>
        ) : (
          /* Empty Workspace Welcome state */
          <div className="flex flex-col items-center justify-center flex-1 p-10 text-center select-none bg-neutral-50 dark:bg-slate-900/10">
            <div className="w-24 h-24 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-sm mb-6 animate-pulse-slow">
              <MessageCircle className="w-12 h-12" />
            </div>
            <h3 className="text-xl font-extrabold text-text-primary mb-2">Chat Langsung Kepada Penjual</h3>
            <p className="text-sm text-text-secondary max-w-sm leading-relaxed mb-6">
              Pilih percakapan di daftar obrolan sebelah kiri untuk mulai berkirim pesan dengan {mode === "buyer" ? "penjual" : "pelanggan"} secara instan.
            </p>
            {onBack && (
              <button
                onClick={onBack}
                className="btn-outline flex items-center gap-2 py-2 px-5 text-sm md:hidden font-bold"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>
            )}
          </div>
        )}
      </div>

      {showPenawaranForm && (() => {
        const activeOrderInfo = mode === "buyer" ? buyerOrders?.find(o => o.orderId === selectedOrderId) : null;
        const minimumOrderQty = penawaranData.minQty || activeOrderInfo?.minQty || 1;
        const currentQty = parseInt(penawaranData.qty || '0');
        const isQtyValid = currentQty >= minimumOrderQty;

        const modalContent = (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-md">
            <div className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-xl max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-200 flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-border bg-base sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand-primary" />
                  <h2 className="text-lg font-bold text-text-primary">Buat Surat Penawaran</h2>
                </div>
                <button
                  onClick={() => setShowPenawaranForm(false)}
                  className="text-text-secondary hover:text-status-error transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 flex flex-col gap-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Produk yang Ditawarkan</label>
                  <input
                    type="text"
                    value={penawaranData.productName || "Produk Pembeli"}
                    disabled={true}
                    className="w-full bg-gray-100 border border-border rounded-xl px-3 py-2 text-sm cursor-not-allowed opacity-80 text-gray-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Jumlah Pesanan (Porsi/Pcs)</label>
                  <input
                    type="number"
                    placeholder={`Min. ${minimumOrderQty}`}
                    value={penawaranData.qty}
                    min={minimumOrderQty}
                    onChange={e => setPenawaranData({ ...penawaranData, qty: e.target.value })}
                    className={`w-full bg-base border rounded-xl px-3 py-2 text-sm outline-none transition-colors ${penawaranData.qty && !isQtyValid ? "border-status-error focus:border-status-error" : "border-border focus:border-brand-primary"
                      }`}
                  />
                  {penawaranData.qty && !isQtyValid && (
                    <p className="text-[10px] text-status-error mt-1 font-semibold">
                      * Minimal pemesanan untuk produk ini adalah {minimumOrderQty} porsi.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Harga Normal Produk (Rp)</label>
                  <input
                    type="text"
                    value={penawaranData.productBasePrice || penawaranData.price}
                    disabled={true}
                    className="w-full bg-gray-100 border border-border rounded-xl px-3 py-2 text-sm cursor-not-allowed opacity-80 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Harga Penawaran Anda (Rp)</label>
                  <input
                    type="number"
                    placeholder="e.g. 15000"
                    value={penawaranData.price}
                    onChange={e => setPenawaranData({ ...penawaranData, price: e.target.value })}
                    className="w-full bg-base border border-border rounded-xl px-3 py-2 text-sm outline-none transition-colors focus:border-brand-primary"
                  />
                  <p className="text-[10px] text-gray-500 mt-1 font-medium">* Masukkan nominal penawaran harga Anda (per satuan).</p>
                </div>

                {/* Total Price Display */}
                <div className="flex flex-col gap-2 -mt-1">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex justify-between items-center opacity-80">
                    <span className="text-xs font-bold text-gray-500">Total Harga Normal</span>
                    <span className="text-sm font-bold text-gray-500 line-through">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format((parseInt(penawaranData.qty) || 0) * (penawaranData.productBasePrice || parseInt(penawaranData.price) || 0))}
                    </span>
                  </div>
                  <div className={`bg-brand-primary/5 border border-brand-primary/10 rounded-xl p-3 flex justify-between items-center shadow-sm`}>
                    <span className="text-xs font-bold text-text-secondary">
                      {mode === 'buyer' ? 'Total Penawaran (ke Penjual)' : 'Total Penawaran (ke Pembeli)'}
                    </span>
                    <span className="text-sm font-black text-brand-primary">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format((parseInt(penawaranData.qty) || 0) * (parseInt(penawaranData.price) || 0))}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Tanggal Pesanan (Estimasi)</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-3 text-text-secondary" />
                    <input
                      type="date"
                      value={penawaranData.date}
                      onChange={e => setPenawaranData({ ...penawaranData, date: e.target.value })}
                      className="w-full bg-base border border-border rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-brand-primary transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Store Products Grid inside Modal */}
              {((activeOrderInfo?.sellerId && mode === 'buyer') || (user?.id && mode === 'seller')) && (
                <div className="bg-gray-50/50">
                  <StoreProductsGrid
                    sellerId={mode === 'buyer' ? (activeOrderInfo?.sellerId || "") : (user?.id || "")}
                    storeName={mode === 'buyer' ? (activeOrderInfo?.storeName || undefined) : undefined}
                    selectedProductName={penawaranData.productName}
                    onProductClick={(product) => {
                      setPenawaranData({
                        qty: String(product.minOrderQty || 1),
                        price: String(product.price),
                        date: penawaranData.date,
                        productName: product.name,
                        productBasePrice: product.price,
                        minQty: product.minOrderQty || 1,
                        productImageUrl: product.imageUrl || ""
                      });
                      Swal.fire({
                        title: 'Produk Terpilih',
                        text: `Formulir penawaran telah diperbarui untuk produk: ${product.name}`,
                        icon: 'success',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 2000
                      });
                    }}
                  />
                </div>
              )}

              <div className="p-4 border-t border-border bg-base flex justify-end gap-3 sticky bottom-0 z-10">
                <button onClick={() => setShowPenawaranForm(false)} className="px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Batal</button>
                <button
                  disabled={!penawaranData.qty || !isQtyValid || !penawaranData.price || !penawaranData.date}
                  onClick={async () => {
                    const introText = mode === "buyer"
                      ? "Halo kak! Berikut adalah rincian pesanan khusus yang ingin saya ajukan. Mohon sekiranya dapat dicek dan dipertimbangkan:"
                      : "Halo kak! Berikut adalah penawaran spesial dari toko kami terkait ketersediaan pesanan ini. Silakan dicek ya kak:";

                    const msg = `${introText}\n\n[SURAT_PENAWARAN|${penawaranData.qty}|${penawaranData.price}|${penawaranData.date}|${penawaranData.productBasePrice}|${penawaranData.productName}|${penawaranData.productImageUrl || ''}]`;
                    await handleSendMessage(msg);
                    setShowPenawaranForm(false);
                    setPenawaranData({ qty: "", price: "", date: "", productName: "", productBasePrice: 0, minQty: 1, productImageUrl: "" });
                  }}
                  className="px-4 py-2 text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary-hover rounded-xl transition-colors disabled:opacity-50"
                >
                  Kirim Penawaran
                </button>
              </div>
            </div>
          </div>
        );

        if (typeof document !== 'undefined') {
          return createPortal(modalContent, document.body);
        }
        return modalContent;
      })()}

    </div>
  );
}
