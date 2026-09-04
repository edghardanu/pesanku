"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, Clock, ChevronLeft, ChevronRight, LayoutGrid, List, Filter, SlidersHorizontal, X, Loader2, MessageCircle } from 'lucide-react';
import { BuyerOrderViewItem } from '@/types';
import { formatOrderDateTimeWIB } from '@/lib/promotionFormatting';

const getStatusTitle = (status: string | undefined | null) => {
  if (!status) return 'Lainnya';
  if (status === 'completed') return 'Selesai';
  if (status === 'processing' || status === 'accepted') return 'Diproses';
  if (status === 'waiting_verification' || status === 'pending') return 'Menunggu Pembayaran';
  if (status === 'cancelled') return 'Dibatalkan';
  return 'Lainnya';
};

export const OrdersTable = ({ onBack, user }: { onBack?: () => void, user?: { name: string, id?: string } | null }) => {
  const handleBack = () => {
    if (onBack) onBack();
    else window.location.href = '/';
  };
  const [orders, setOrders] = useState<BuyerOrderViewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<string[]>(['Riwayat']);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'orders' | 'tracking'>('orders');
  const [selectedOrderGroup, setSelectedOrderGroup] = useState<BuyerOrderViewItem[] | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const fetchOrders = () => {
      fetch(`/api/buyer/orders?t=${Date.now()}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (data && data.orders) {
            setOrders(data.orders);
          }
          setIsLoading(false);
          timeoutId = setTimeout(fetchOrders, 10000); // Polling every 10 seconds
        })
        .catch(() => {
          setIsLoading(false);
          timeoutId = setTimeout(fetchOrders, 15000);
        });
    };

    fetchOrders();
    return () => clearTimeout(timeoutId);
  }, []);

  const removeFilter = (filterToRemove: string) => {
    setFilters(filters.filter(f => f !== filterToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim() !== '') {
      setFilters([...filters, searchTerm.trim()]);
      setSearchTerm('');
    }
  };

  const groupedOrdersList = React.useMemo(() => {
    const groups: { [key: string]: BuyerOrderViewItem[] } = {};
    orders.forEach(order => {
      if (order.status === 'chat_only') return;
      const time = order.createdAt ? new Date(order.createdAt).getTime() : 0;
      let foundKey = Object.keys(groups).find(key => Math.abs(Number(key) - time) <= 5000);
      if (!foundKey) {
        foundKey = time.toString();
        groups[foundKey] = [];
      }
      groups[foundKey].push(order);
    });
    return Object.values(groups).sort((a, b) => new Date(b[0].createdAt || 0).getTime() - new Date(a[0].createdAt || 0).getTime());
  }, [orders]);

  const filteredOrderGroups = groupedOrdersList.filter(group => {
    if (activeTab === 'tracking') {
       const trackingStatuses = ['processing', 'accepted', 'preorder_running'];
       const hasTracking = group.some(o => trackingStatuses.includes(o.status || ''));
       if (!hasTracking) return false;
    }

    const matchesSearch = searchTerm === '' || group.some(o => {
      const translatedStatus = getStatusTitle(o.status);
      const combinedString = `${o.orderId} ${o.storeName} ${o.productName} ${translatedStatus}`.toLowerCase();
      return combinedString.includes(searchTerm.toLowerCase());
    });
    
    const matchesFilters = filters.length === 0 || filters.every(f => 
      f.toLowerCase() === 'riwayat' || group.some(o => {
         const translatedStatus = getStatusTitle(o.status);
         const combinedString = `${o.orderId} ${o.storeName} ${o.productName} ${translatedStatus}`.toLowerCase();
         return combinedString.includes(f.toLowerCase());
      })
    );

    return matchesSearch && matchesFilters;
  });

  if (selectedOrderGroup) {
    return <OrderDetailForm orderGroup={selectedOrderGroup} onBack={() => setSelectedOrderGroup(null)} user={user} />;
  }

  const TopHeader = () => (
    <div className="flex flex-wrap items-center gap-4 sm:gap-6 px-4 py-2 bg-[#800000] text-white shrink-0">
      <div className="flex items-center gap-2 cursor-pointer" onClick={handleBack}>
        <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
          <LayoutGrid className="w-4 h-4" />
        </div>
        <span className="font-semibold text-lg tracking-tight">Pesanku</span>
      </div>
      <div className="flex gap-4 font-medium text-sm text-white/90 overflow-x-auto whitespace-nowrap pb-1 sm:pb-0 hide-scrollbar w-full sm:w-auto order-3 sm:order-none">
        <span className="cursor-pointer hover:text-white" onClick={handleBack}>Dashboard</span>
        <span className={`cursor-pointer pb-0.5 ${activeTab === 'orders' ? 'font-bold text-white border-b-2 border-white' : 'hover:text-white'}`} onClick={() => setActiveTab('orders')}>Pesanan Saya</span>
        <span className={`cursor-pointer pb-0.5 ${activeTab === 'tracking' ? 'font-bold text-white border-b-2 border-white' : 'hover:text-white'}`} onClick={() => setActiveTab('tracking')}>Lacak Pesanan</span>
        <span className="cursor-pointer hover:text-white pb-0.5">Histori Pembayaran</span>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <Clock className="w-4 h-4" />
        <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center font-bold text-xs uppercase">
          {user?.name ? user.name.charAt(0) : 'E'}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full bg-white dark:bg-surface min-h-screen text-[13px] text-gray-700 dark:text-gray-200">
      {/* Top Header */}
      <TopHeader />

      {/* Sub Header */}
      <div className="flex flex-col lg:flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 gap-3">
        <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 justify-between">
          <h2 className="text-xl text-gray-800 dark:text-white truncate">{activeTab === 'tracking' ? 'Lacak Pesanan' : 'Pesanan Saya'}</h2>
        </div>
        
        <div className="flex-1 w-full lg:max-w-2xl px-0 lg:px-4 flex">
          <div className="flex items-center flex-1 bg-white border border-gray-300 rounded shadow-sm px-2 overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 min-w-0">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <div className="flex items-center gap-1 ml-2 overflow-x-auto hide-scrollbar shrink-0 py-1">
              {filters.map((filter, idx) => (
                <span key={idx} className="bg-[#e2e2e0] dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded text-xs whitespace-nowrap flex items-center gap-1 shrink-0">
                  {filter}
                  <button onClick={() => removeFilter(filter)} className="hover:text-red-500 ml-0.5"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search..." 
              className="flex-1 bg-transparent border-none py-1.5 px-2 text-sm focus:outline-none focus:ring-0 min-w-[80px]" 
            />
            <div className="w-px h-5 bg-gray-300 mx-1 sm:mx-2 shrink-0" />
            <ChevronLeft className="w-4 h-4 text-gray-400 shrink-0" />
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end shrink-0">
          <div className="text-sm text-gray-500 hidden sm:block">
            {filteredOrderGroups.length > 0 ? `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, filteredOrderGroups.length)} / ${filteredOrderGroups.length}` : '0 / 0'}
          </div>
          <div className="flex gap-1">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              disabled={currentPage * itemsPerPage >= filteredOrderGroups.length}
              onClick={() => setCurrentPage(p => p + 1)}
              className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex rounded border border-gray-300 bg-white shadow-sm overflow-hidden h-7">
            <button className="px-2 bg-gray-100 hover:bg-gray-200 border-r border-gray-300 flex items-center justify-center"><List className="w-4 h-4" /></button>
            <button className="px-2 hover:bg-gray-100 border-r border-gray-300 flex items-center justify-center"><LayoutGrid className="w-4 h-4" /></button>
            <button className="px-2 hover:bg-gray-100 flex items-center justify-center"><SlidersHorizontal className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 font-bold bg-gray-50 dark:bg-gray-800/50">
              <th className="px-4 py-2 w-10">
                <input type="checkbox" className="rounded border-gray-300 text-[#017e84] focus:ring-[#017e84]" />
              </th>
              <th className="px-2 py-2">Nomor Pesanan</th>
              <th className="px-2 py-2">Tanggal</th>
              <th className="px-2 py-2">Toko / Penjual</th>
              <th className="px-2 py-2">Produk</th>
              <th className="px-2 py-2">Qty</th>
              <th className="px-2 py-2">Pembeli</th>
              <th className="px-2 py-2 text-right">Total Harga</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-500 font-medium bg-gray-50/50">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
                    Memuat data pesanan real-time...
                  </div>
                </td>
              </tr>
            ) : filteredOrderGroups.length > 0 ? (
              filteredOrderGroups.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((group, i) => {
                const primaryOrder = group[0];
                const uniqueStores = Array.from(new Set(group.map(o => o.storeName))).filter(Boolean) as string[];
                const productNamesStr = group.map(o => o.productName).join(', ');
                const totalQty = group.reduce((sum, o) => sum + o.qty, 0);
                const totalGroupPrice = group.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
                const displayId = group.length > 1 ? `${primaryOrder.orderId} (+${group.length - 1})` : primaryOrder.orderId;
                
                const initial = uniqueStores.length > 0 ? uniqueStores[0]!.charAt(0).toUpperCase() : 'T';
                const statusTitle = getStatusTitle(primaryOrder.status);
                  
                const statusColor = 
                  primaryOrder.status === 'completed' ? 'bg-[#17a2b8]' : 
                  primaryOrder.status === 'processing' || primaryOrder.status === 'accepted' ? 'bg-[#f7b824]' :
                  primaryOrder.status === 'waiting_verification' || primaryOrder.status === 'pending' ? 'bg-[#ff4b4b]' :
                  primaryOrder.status === 'cancelled' ? 'bg-gray-500' : 'bg-[#017e84]';

                const formattedDate = primaryOrder.createdAt ? formatOrderDateTimeWIB(primaryOrder.createdAt) : '-';

                return (
                  <tr key={i} onClick={() => setSelectedOrderGroup(group)} className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                    <td className="px-4 py-2.5">
                      <input type="checkbox" className="rounded border-gray-300 text-[#017e84] focus:ring-[#017e84]" onClick={(e) => e.stopPropagation()} />
                    </td>
                    <td className="px-2 py-2.5 font-bold cursor-pointer text-[#017e84] hover:underline whitespace-nowrap">{displayId}</td>
                    <td className="px-2 py-2.5">{formattedDate}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex flex-col gap-1.5">
                        {uniqueStores.map(store => (
                          <div key={store} className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded bg-orange-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 uppercase">
                              {store.charAt(0)}
                            </div>
                            <span className="truncate max-w-[200px] font-medium leading-none">{store}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-2.5 truncate max-w-[240px] text-gray-500">{productNamesStr}</td>
                    <td className="px-2 py-2.5">{totalQty}</td>
                    <td className="px-2 py-2.5 truncate max-w-[150px]">{user?.name || 'Pelanggan'}</td>
                    <td className="px-2 py-2.5 text-right font-medium text-gray-800 dark:text-gray-200">
                      Rp {totalGroupPrice.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white ${statusColor}`}>
                        {statusTitle}
                      </span>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-500 font-medium bg-gray-50/50">
                  Tidak ada data pesanan yang cocok dengan pencarian Anda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const OrderDetailForm = ({ orderGroup, onBack, user }: { orderGroup: BuyerOrderViewItem[], onBack?: () => void, user?: { name: string, id?: string } | null }) => {
  const primaryOrder = orderGroup[0];
  const formattedDate = primaryOrder.createdAt ? formatOrderDateTimeWIB(primaryOrder.createdAt) : '-';
  const siblingOrders = orderGroup;
  const uniqueStores = Array.from(new Set(orderGroup.map(o => o.storeName))).filter(Boolean) as string[];
  
  const handleBack = () => {
    if (onBack) onBack();
    else window.location.href = '/';
  };
  
  const pipeline = [
    { key: 'waiting_verification', label: 'Menunggu Pembayaran' },
    { key: 'processing', label: 'Diproses' },
    { key: 'completed', label: 'Selesai' }
  ];
  const orderStatusIdx = pipeline.findIndex(p => p.key === primaryOrder.status);
  const currentStep = orderStatusIdx >= 0 ? orderStatusIdx : 0;

  const [activeTab, setActiveTab] = useState<'chat'|'log'>('chat');
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const promises = siblingOrders.map(sibling => 
          fetch(`/api/chat?orderId=${sibling.orderId}`).then(res => res.json())
        );
        const results = await Promise.all(promises);
        
        let allMessages: any[] = [];
        results.forEach((data, index) => {
          if (data && data.messages) {
            const msgs = data.messages.map((m: any) => ({
              ...m,
              _storeName: siblingOrders[index].storeName // attaching storename manually
            }));
            allMessages = [...allMessages, ...msgs];
          }
        });
        
        // Remove duplicates if same message was somehow duplicated across same sender?
        const uniqueMessages = [];
        const seenBuyerMessages = new Set();
        
        for (const msg of allMessages) {
           if (msg.senderId === user?.id) {
             const key = `${msg.text}_${new Date(msg.createdAt).getTime()}`;
             if (!seenBuyerMessages.has(key)) {
               seenBuyerMessages.add(key);
               uniqueMessages.push(msg);
             }
           } else {
             uniqueMessages.push(msg); // All seller messages are unique
           }
        }
        
        uniqueMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setMessages(uniqueMessages);
      } catch (err) {
        console.error("Failed to fetch group chats", err);
      }
    };
    
    fetchChats();
    const interval = setInterval(fetchChats, 5000);
    return () => clearInterval(interval);
  }, [siblingOrders.map(o => o.orderId).join(','), user]);

  const renderRichText = (txt: string) => {
    return txt
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>");
  };

  const parseMessageContent = (text: string, isSender: boolean) => {
    const trimmed = text.trim();

    // 1. Product Offer format
    const offerMatch = trimmed.match(/\[PRODUK_OFFER\|(.*?)\|(.*?)\|(.*?)\|(.*?)\]/);
    if (offerMatch) {
      const remainder = trimmed.replace(offerMatch[0], "").trim();
      const pId = offerMatch[1];
      const pName = offerMatch[2];
      const pPrice = offerMatch[3];
      const pImage = offerMatch[4] || "/street-food-festival.jpg";

      return (
        <div className="flex flex-col gap-2 relative z-10 w-full min-w-[240px]">
          {remainder && (
            <p className="whitespace-pre-line text-[13px] leading-relaxed mb-1"
               dangerouslySetInnerHTML={{ __html: renderRichText(remainder) }} />
          )}
          <div className="flex flex-col gap-2 p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="flex gap-3 items-center">
              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-100 relative border border-gray-200">
                <img src={pImage} alt={pName} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <p className="text-[13px] font-bold text-gray-800 leading-tight block truncate" title={pName}>{pName}</p>
                <p className="text-xs font-black text-[#1c8859] mt-0.5">{pPrice}</p>
              </div>
            </div>
            
            <a
              href={`/product/${encodeURIComponent(pName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${pId}`}
              target="_blank"
              className="w-full text-center text-[11px] font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 active:scale-95 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              Lihat Produk Detail
            </a>
          </div>
        </div>
      );
    }
    
    // 2. Chat Image format
    if (trimmed.startsWith("[CHAT_IMG|") && trimmed.endsWith("]")) {
      const dataUrl = trimmed.slice(10, -1);
      return (
        <div className="mt-1 w-full max-w-[220px] rounded-lg overflow-hidden border border-gray-200 bg-gray-50 p-1 flex justify-center items-center">
          <img src={dataUrl} alt="Attachment" className="w-full h-auto object-cover rounded max-h-[220px]" />
        </div>
      );
    }

    // 3. Regular text
    return (
      <p className="text-[13px] leading-relaxed mb-4 whitespace-pre-wrap"
         dangerouslySetInnerHTML={{ __html: renderRichText(text) }} />
    );
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    
    setIsSending(true);
    setInputText('');
    
    const tempMsg = {
      id: Math.random().toString(),
      text,
      senderId: user?.id || 'temp',
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);
    
    try {
      await Promise.all(siblingOrders.map(sibling => 
        fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            orderId: sibling.orderId, 
            text 
          })
        })
      ));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-surface min-h-screen text-[13px] text-gray-700 dark:text-gray-200 flex flex-col">
      {/* Top Header */}
      <div className="flex items-center gap-4 sm:gap-6 px-4 py-3 bg-white border-b border-gray-200 shadow-sm overflow-x-auto whitespace-nowrap hide-scrollbar shrink-0">
        <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={handleBack}>
          <div className="w-8 h-8 bg-[#1c8859]/10 rounded-full flex items-center justify-center shrink-0 text-[#1c8859]">
            <ChevronLeft className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-[#1c8859]">Pesanku</span>
        </div>
        <div className="flex flex-1 gap-3 font-medium text-[14px] text-gray-500 shrink-0 items-center ml-4">
          <span className="cursor-pointer hover:text-[#1c8859] transition-colors" onClick={handleBack}>Dashboard</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="cursor-pointer hover:text-[#1c8859] transition-colors" onClick={handleBack}>Pesanan Saya</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="font-bold text-gray-800 border-b-2 border-[#1c8859] pb-0.5">{orderGroup.length > 1 ? `Sesi Pembelian ${formattedDate.split(',')[0]}` : primaryOrder.orderId}</span>
        </div>
        <div className="ml-auto flex items-center gap-4 shrink-0">
          <Clock className="w-5 h-5 text-gray-400" />
          <div className="w-8 h-8 bg-[#1c8859] rounded-full flex items-center justify-center font-bold text-sm uppercase text-white shadow-md">
            {user?.name ? user.name.charAt(0) : 'P'}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-b border-gray-100 gap-4 bg-gray-50/50">
        <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap shrink-0 max-w-full hide-scrollbar">
          {primaryOrder.status === 'waiting_verification' && (
            <button className="bg-[#1c8859] shadow-lg shadow-green-500/20 text-white px-5 py-2.5 rounded-xl hover:bg-[#156e47] font-bold transition-all active:scale-95">Bayar Sekarang</button>
          )}
          <button className="bg-white shadow-sm border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl hover:bg-gray-50 font-bold transition-all active:scale-95">Panduan</button>
          {primaryOrder.status !== 'completed' && primaryOrder.status !== 'cancelled' && (
            <button className="bg-white border border-red-200 text-red-600 px-5 py-2.5 rounded-xl hover:bg-red-50 font-bold transition-all active:scale-95">Batalkan Pesanan</button>
          )}
        </div>
        
        {/* Pipeline / Progress Bar */}
        <div className="flex items-center rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-white text-xs font-bold shrink-0">
          {pipeline.map((step, idx) => {
            const isActive = idx === currentStep;
            const isPast = idx < currentStep;
            return (
              <div 
                key={step.key} 
                className={`
                  relative px-5 py-2.5 flex items-center transition-colors
                  ${isActive ? 'bg-[#1c8859] text-white' : isPast ? 'bg-green-50 text-[#1c8859]' : 'text-gray-400'}
                  ${idx !== 0 ? 'pl-8' : ''}
                `}
              >
                {/* Arrow shape overlay */}
                {idx > 0 && (
                  <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center -ml-px z-10 w-4">
                    <svg viewBox="0 0 10 20" preserveAspectRatio="none" className={`h-full w-full ${isActive ? 'text-[#1c8859]' : isPast ? 'text-green-50' : 'text-white'}`}>
                      <polygon points="0,0 10,10 0,20" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-gray-200" />
                    </svg>
                  </div>
                )}
                <span className="relative z-20 whitespace-nowrap">{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content splitting into Left Form and Right Log */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Form Area */}
        <div className="flex-1 bg-white p-4 lg:p-8 overflow-y-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-8">{orderGroup.length > 1 ? `Pesanan Gabungan (+${orderGroup.length} Produk)` : primaryOrder.orderId}</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 w-full max-w-4xl bg-gray-50 p-6 rounded-2xl border border-gray-100">
            {/* Customer Details */}
            <div>
              <p className="font-bold text-gray-400 mb-2 uppercase text-xs tracking-wider">Pemesan</p>
              <p className="text-[#1c8859] font-bold text-lg">{user?.name || 'Pelanggan'}</p>
              <p className="text-gray-600 mt-2 text-sm leading-relaxed">
                Detail alamat dan pengiriman akan disesuaikan dengan instruksi pada profil atau kesepakatan chat.
              </p>
            </div>
            {/* Order Details */}
            <div className="grid grid-cols-[140px_1fr] gap-y-3 gap-x-2 text-sm">
              <span className="text-gray-500 font-bold">Tanggal Pesan</span>
              <span className="text-gray-800 font-medium">{formattedDate}</span>
              
              <span className="text-gray-500 font-bold">Toko / Penjual</span>
              <div className="flex flex-col gap-2">
                {uniqueStores.map(store => (
                  <div key={store} className="flex items-center gap-1.5 text-[#1c8859] font-bold">
                    <div className="w-5 h-5 rounded bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-bold shrink-0 uppercase border border-orange-200">
                      {store.charAt(0)}
                    </div>
                    {store}
                  </div>
                ))}
              </div>

              <span className="text-gray-500 font-bold">Metode Pembayaran</span>
              <span className="text-gray-800 font-medium bg-white px-2.5 py-1 rounded border border-gray-200 shadow-sm self-start inline-block">
                {primaryOrder.status === 'processing' || primaryOrder.status === 'completed' ? 'iPaymu (Lunas)' : 'Menunggu / Transfer Cepat'}
              </span>
            </div>
          </div>

          <div className="border-b border-gray-200 mb-4">
            <div className="flex gap-6">
              <span className="font-bold text-[#1c8859] border-b-2 border-[#1c8859] pb-3 cursor-pointer">Rincian Pesanan</span>
              <span className="font-medium text-gray-500 hover:text-gray-700 pb-3 cursor-pointer transition-colors">Informasi Lain</span>
            </div>
          </div>

          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-bold bg-gray-50">
                <th className="py-3 px-4 rounded-tl-lg">Produk</th>
                <th className="py-3 px-4">Varian</th>
                <th className="py-3 px-4 text-center">Kuantitas</th>
                <th className="py-3 px-4 text-right">Harga Satuan</th>
                <th className="py-3 px-4 text-right rounded-tr-lg">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orderGroup.map((o, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4 font-semibold text-[#1c8859]">
                    {o.productName}
                    <div className="text-[10px] text-gray-500 font-medium leading-none font-normal mt-1 flex items-center gap-1">
                      <span className="w-3 h-3 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-[8px] uppercase">{o.storeName?.charAt(0) || '-'}</span>
                      {o.storeName}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-600">{o.selectedVariant || '-'}</td>
                  <td className="py-4 px-4 text-center font-medium bg-gray-50 w-20">{o.qty}</td>
                  <td className="py-4 px-4 text-right text-gray-600">Rp {((o.totalPrice || 0) / (o.qty || 1)).toLocaleString('id-ID')}</td>
                  <td className="py-4 px-4 text-right font-bold text-gray-800">Rp {o.totalPrice?.toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
            <div className="w-[320px] grid grid-cols-2 gap-y-3 bg-gray-50 p-5 rounded-xl border border-gray-100">
              <span className="text-gray-500 font-medium">Subtotal Produk:</span>
              <span className="text-right font-semibold">Rp {orderGroup.reduce((sum, o) => sum + (o.totalPrice || 0), 0).toLocaleString('id-ID')}</span>
              <span className="text-gray-500 font-medium">Biaya Tambahan:</span>
              <span className="text-right text-gray-400">Gratis</span>
              <div className="col-span-2 border-t border-gray-200 my-1"></div>
              <span className="text-[#1c8859] font-black text-lg">Total Pembayaran:</span>
              <span className="text-right font-black text-lg text-[#1c8859]">Rp {orderGroup.reduce((sum, o) => sum + (o.totalPrice || 0), 0).toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>

        {/* Right Log/Chat Area */}
        <div className="w-full lg:w-[420px] bg-[#f0f2f5] border-l border-gray-200 flex flex-col shrink-0 min-h-[400px] lg:min-h-0 bg-opacity-70">
          <div className="flex border-b border-gray-200 bg-white">
            <button className="flex-1 bg-white text-[#1c8859] font-bold py-3 border-r border-[#1c8859] border-b-2 hover:bg-gray-50 transition-colors">Ruang Chat Penjual ({uniqueStores.length})</button>
            <button className="flex-1 text-gray-500 font-medium py-3 hover:bg-gray-50 transition-colors">Log Pesanan</button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            <div className="flex gap-2 items-start opacity-70 mb-2">
               <div className="bg-gray-200 text-gray-600 rounded p-2 px-3 text-xs w-full text-center">
                 Pesanan dibuat. Status: Menunggu Pembayaran
               </div>
            </div>

            {messages.map((msg, idx) => {
              const isBuyerMsg = msg.sender === 'buyer' || msg.senderId === user?.id;
              
              if (isBuyerMsg) {
                return (
                  <div key={`${msg.id || ''}_${idx}`} className="flex gap-2 mb-2 items-start justify-end w-full">
                    <div className="bg-[#e7fedb] border border-[#d2f4bf] rounded-2xl p-3 shadow-sm max-w-[85%] relative rounded-tr-none min-w-[120px]">
                      {parseMessageContent(msg.text, true)}
                      <div className="absolute right-3 bottom-1.5 flex items-center gap-1 z-20 bg-[#e7fedb]/80 px-1 rounded">
                        <span className="text-[9px] font-medium text-gray-500">{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit'}) : ''}</span>
                        <svg viewBox="0 0 16 15" width="14" height="13" className="text-blue-500"><path fill="currentColor" d="m15.01 3.316-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"></path></svg>
                      </div>
                    </div>
                  </div>
                )
              } else {
                const sName = msg._storeName || primaryOrder.storeName || 'T';
                return (
                  <div key={`${msg.id || ''}_${idx}`} className="flex gap-2 items-end mb-2 mt-1 w-full relative group">
                    <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold shrink-0 text-[10px] shadow-sm border border-orange-200">
                      {sName.charAt(0).toUpperCase()}
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm max-w-[85%] relative rounded-bl-sm min-w-[120px]">
                      <span className="font-bold text-[11px] text-orange-600 block mb-1.5">{sName}</span>
                      {parseMessageContent(msg.text, false)}
                      <div className="absolute right-3 bottom-1.5 flex items-center gap-1 z-20 bg-white/80 px-1 rounded">
                        <span className="text-[9px] font-medium text-gray-400">{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit'}) : ''}</span>
                      </div>
                    </div>
                  </div>
                )
              }
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Action Input Area */}
          <form onSubmit={handleSendMessage} className="bg-white p-3 border-t border-gray-200">
            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2 relative">
              <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Ketik pesan disini..." className="bg-transparent flex-1 text-[13px] text-gray-800 focus:outline-none h-8" />
              <button type="submit" disabled={!inputText.trim()} className="w-8 h-8 bg-[#1c8859] disabled:opacity-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center text-white shrink-0 hover:bg-[#156e47] active:scale-95 transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
