"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Search, Send, Paperclip, Camera, Image, ChevronLeft, Calendar,
  Check, CheckCheck, Loader2, MessageCircle, X, ExternalLink,
  ShoppingBag, Trash2, ArrowLeft, Info, ShoppingCart, User
} from "lucide-react";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { formatChatTimeWIB } from "@/lib/promotionFormatting";
import { AuthUser, BuyerOrderViewItem, ChatMessage, ProductItem } from "@/types";

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

  // Buyer-specific
  buyerOrders?: BuyerOrderViewItem[];
  setBuyerOrders?: React.Dispatch<React.SetStateAction<BuyerOrderViewItem[]>>;

  // Seller-specific
  sellerThreads?: any[];
  setSellerThreads?: React.Dispatch<React.SetStateAction<any[]>>;
  sellerProducts?: ProductItem[];

  // Common callbacks for views redirect/tab change
  onBack?: () => void;
  onNavTab?: (tabName: string) => void;
  onSelectProductFilter?: (productId: string) => void;
}

export default function ChatInterface({
  mode,
  user,
  initialOrderId,
  buyerOrders = [],
  setBuyerOrders,
  sellerThreads = [],
  setSellerThreads,
  sellerProducts = [],
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
        productId: o.sellerId ? undefined : undefined,
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

    if (mode === "buyer" && activeThread?.sellerId && selectedOrderId) {
      const sellerId = activeThread.sellerId;

      // Jika sudah ada di cache, gunakan dari cache dan jangan hit API lagi
      if (productsCacheRef.current[sellerId]) {
        setStoreProducts(productsCacheRef.current[sellerId]);
        setIsLoadingProducts(false);
        return;
      }

      const getStoreProducts = async () => {
        setIsLoadingProducts(true);
        try {
          const res = await fetch(
            `/api/products/public?sellerId=${sellerId}&t=${Date.now()}`,
            { 
              cache: 'no-store',
              signal: controller.signal 
            }
          );
          if (res.ok) {
            const data = await res.json();
            if (!controller.signal.aborted) {
              const fetchedProducts = data.products || [];
              productsCacheRef.current[sellerId] = fetchedProducts;
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
  }, [activeThread?.sellerId, mode, selectedOrderId]);

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
    const todayStr = new Date().toISOString().split('T')[0];

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
            <input id="presale-confirm-date" type="date" value="${todayStr}" class="input-field w-full" />
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
  const parseMessageContent = (text: string, isSender: boolean) => {
    const trimmed = text.trim();

    // 1. Product Offer format: [PRODUK_OFFER|pId|pName|pPrice|pImage]
    const offerMatch = trimmed.match(/\[PRODUK_OFFER\|(.*?)\|(.*?)\|(.*?)\|(.*?)\]/);
    if (offerMatch) {
      const remainder = trimmed.replace(offerMatch[0], "").trim();
      const pId = offerMatch[1];
      const pName = offerMatch[2];
      const pPrice = offerMatch[3];
      const pImage = offerMatch[4] || "/street-food-festival.jpg";

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
                <p className={`text-xs font-extrabold mt-1 ${isSender ? "text-amber-250" : "text-brand-primary"}`}>{pPrice}</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mt-1">
              {mode === "buyer" ? (
                <>
                  <a
                    href={`/product/${encodeURIComponent(pName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${pId}`}
                    target="_blank"
                    className={`w-full text-center text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 active:scale-95 ${isSender ? "bg-white text-brand-primary hover:bg-neutral-50" : "bg-brand-primary text-white hover:bg-brand-primary-hover"
                      }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Lihat Produk
                  </a>
                  <button
                    onClick={() => handleBuyerOrderNow(pId, pName, pPrice)}
                    className="w-full bg-status-success hover:bg-emerald-600 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 active:scale-95 border-none cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Pesan Sekarang
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      if (onSelectProductFilter && onNavTab) {
                        onSelectProductFilter(pId);
                        onNavTab("produk");
                        const calendarEl = document.getElementById('preorder-calendar-title');
                        if (calendarEl) calendarEl.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className={`w-full text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 active:scale-95 border-none cursor-pointer ${isSender ? "bg-white text-brand-primary hover:bg-neutral-50" : "bg-brand-primary text-white hover:bg-brand-primary-hover"
                      }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Lihat Jadwal Produk
                  </button>

                  {!isSender && (
                    <button
                      onClick={() => handleSellerConfirmSchedule(pId, pName, pPrice, pImage)}
                      className="w-full bg-status-success hover:bg-emerald-600 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 active:scale-95 border-none cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Konfirmasi (Bisa Diproses)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 2. Chat Image format: [CHAT_IMG|dataUrl]
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
    return (
      <p
        className="whitespace-pre-wrap text-sm break-words leading-relaxed"
        dangerouslySetInnerHTML={{ __html: renderRichText(text) }}
      />
    );
  };

  // Helper bold/italic/links highlights
  const renderRichText = (txt: string) => {
    let result = txt
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Replace markdown bold: **text**
    result = result.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Replace markdown italic: *text*
    result = result.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // Replace links: _http_
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
    <div className="flex h-[calc(100vh-140px)] md:h-[650px] w-full card border border-border bg-surface shadow-md overflow-hidden relative select-none">

      {/* ── SECTION A: SIDEBAR (Chat list threads) ── */}
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

      {/* ── SECTION B: ACTIVE CONVERSATION PANE ── */}
      <div className={`flex-1 flex flex-col h-full bg-base ${!selectedOrderId ? "hidden md:flex" : "flex"}`}>
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

                                {/* Inner Content parsing */}
                                {parseMessageContent(m.text, isSender)}

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
                <div className="w-[280px] border-l border-border bg-surface h-full flex flex-col z-20 absolute right-0 top-0 bottom-0 lg:relative shadow-2xl lg:shadow-none transform transition-transform duration-200">
                  <div className="p-3 border-b border-border bg-base/50 flex align-center justify-between shrink-0">
                    <span className="text-xs font-bold text-text-primary uppercase tracking-tight flex items-center gap-1.5 mt-0.5">
                      <ShoppingBag className="w-4 h-4 text-brand-primary" />
                      {mode === "buyer" ? "Preorder Tokok" : "Tawarkan Produk"}
                    </span>
                    <button
                      onClick={() => setShowProductsPanel(false)}
                      className="p-1 hover:bg-neutral-100 dark:hover:bg-slate-700/80 rounded-full text-text-secondary"
                    >
                      <X className="w-4 h-4 hover:text-text-primary" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-base/15">
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
                          const formattedPrice = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p.price);
                          return (
                            <div key={p.id} className="flex flex-col gap-2 p-2.5 bg-surface border border-border rounded-xl shadow-xs transition-colors hover:border-brand-primary/30">
                              <div className="flex gap-2.5 items-center">
                                <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-base border border-border relative">
                                  <img src={pImage} alt={p.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="text-xs font-bold text-text-primary line-clamp-2 leading-tight" title={p.name}>{p.name}</p>
                                  <p className="text-xs font-bold text-brand-primary mt-1">{formattedPrice}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  handleSendMessage(`Permisi kak, saya ingin bertanya tentang produk *${p.name}* (${formattedPrice}) ini:\n\n[PRODUK_OFFER|${p.id}|${p.name}|${formattedPrice}|${pImage}]`);
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
                      sellerProducts.length === 0 ? (
                        <div className="text-center py-6 text-xs text-text-secondary border border-dashed border-border rounded-xl bg-surface">
                          Tidak ada produk yang siap ditawarkan.
                        </div>
                      ) : (
                        sellerProducts.map(p => {
                          const pImage = p.imageUrl || "/street-food-festival.jpg";
                          const formattedPrice = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p.price);
                          return (
                            <div key={p.id} className="flex flex-col gap-2 p-2 bg-surface border border-border rounded-xl shadow-xs transition-all hover:border-brand-primary/30">
                              <div className="flex gap-2.5 items-center">
                                <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-base border border-border relative">
                                  <img src={pImage} alt={p.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="text-xs font-bold text-text-primary line-clamp-2 leading-tight text-slate-800" title={p.name}>{p.name}</p>
                                  <p className="text-xs font-bold text-brand-primary mt-1">{formattedPrice}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  handleSendMessage(`Halo kak! Kami menawarkan produk pre-order *${p.name}* (Harga dasar: ${formattedPrice}) yang bisa dibuat khusus untuk kakak:\n\n[PRODUK_OFFER|${p.id}|${p.name}|${formattedPrice}|${pImage}]`);
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
                <div className="absolute bottom-full left-4 mb-2 flex gap-3.5 bg-surface border border-border p-3.5 rounded-2xl shadow-xl z-30 transition-all origin-bottom-left">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-11 h-11 flex flex-col items-center justify-center bg-base hover:bg-brand-primary/10 hover:text-brand-primary border border-border rounded-xl transition-colors cursor-pointer text-text-secondary"
                    title="Ambil foto dari kamera"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="text-[8px] font-semibold mt-0.5">Kamera</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-11 h-11 flex flex-col items-center justify-center bg-base hover:bg-brand-primary/10 hover:text-brand-primary border border-border rounded-xl transition-colors cursor-pointer text-text-secondary"
                    title="Unggah dari galeri"
                  >
                    <Image className="w-5 h-5" />
                    <span className="text-[8px] font-semibold mt-0.5">Galeri</span>
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
                  className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${showAttachmentMenu
                      ? "bg-brand-primary/10 border-brand-primary/20 text-brand-primary"
                      : "bg-base border-border text-text-secondary hover:text-brand-primary"
                    }`}
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

    </div>
  );
}
