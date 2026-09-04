const fs = require('fs');

let code = fs.readFileSync('src/components/ClientBuyerOrders.tsx', 'utf-8');

// 1. Remove openChat redirect to detail/chats
code = code.replace(/if \(productName\) \{\r?\n\s*setActiveTab\('chats'\);\r?\n\s*setSelectedChatOrderId\(openChatOrderId\);\r?\n\s*\}/,
    `if (productName) {
        setActiveTab('orders');
        setSelectedOrderId(openChatOrderId);
      }`);

// 2. Remove 'chats' from state
code = code.replace(/useState\<'orders' \| 'chats' \| 'tracking'\>\('orders'\);/, "useState<'orders' | 'tracking'>('orders');\n  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);");

// 3. Update filteredLocalOrders
code = code.replace(/if \(activeTab === 'chats'\) return true; \/\/ Semua order punya chat\r?\n\s*if \(activeTab === 'tracking'\) return o\.status !== 'chat_only' && o\.status !== 'cancelled';\r?\n\s*return o\.status !== 'chat_only'; \/\/ Tab pesanan: sembunyikan chat_only/,
    `if (activeTab === 'tracking') return o.status !== 'chat_only' && o.status !== 'cancelled';
    return true;`);

// 4. Fix main container width to be wider
code = code.replace(/className=\{\`container mx-auto px-4 pt-6 pb-24 md:pb-12 transition-all duration-300 \$\{activeTab === 'chats' \? 'max-w-7xl' : 'max-w-4xl'\}\`\}/,
    `className="container mx-auto px-4 pt-6 pb-24 md:pb-12 transition-all duration-300 max-w-[1500px]"`);

// 5. Remove Chats Tab Button
const tabsRegex = /\{\/\* Navigation Tabs \*\/\}\r?\n\s*\{user && \(\r?\n\s*<div className="mb-6 grid w-full grid-cols-3 border-b border-border" role="tablist" aria-label="Navigasi pesanan"\>/;
code = code.replace(tabsRegex, `{/* Navigation Tabs */}\n            {user && (\n              <div className="mb-6 grid w-full grid-cols-2 border-b border-border" role="tablist" aria-label="Navigasi pesanan">`);

// Remove chats button block
code = code.replace(/<button\r?\n\s*type="button"\r?\n\s*role="tab"\r?\n\s*aria-selected=\{activeTab === 'chats'\}[\s\S]*?<\/button>\r?\n\s*<button\r?\n\s*type="button"\r?\n\s*role="tab"\r?\n\s*aria-selected=\{activeTab === 'tracking'\}/,
    `<button\n                  type="button"\n                  role="tab"\n                  aria-selected={activeTab === 'tracking'}`);


// 7. REPLACE THE STACK WITH MASTER-DETAIL!
// First, strip out `activeTab === 'chats'` logic completely if it exists.
code = code.replace(/\) : activeTab === 'chats' \? \([\s\S]*?\r?\n\s*\/>\r?\n\s*\) : activeTab === 'tracking' \? \(/, `) : activeTab === 'tracking' ? (`);

const match = code.match(/\)\s*:\s*\(\r?\n\s*<div className="space-y-4">/);

if (!match) {
    console.log("Could not find stack");
    process.exit(1);
}

// Add w-full min-w-0 to fix squeezing, especially shrinking
const masterDetailCode = `) : (
              <div className="flex w-full h-[calc(100vh-140px)] bg-white border border-border sm:rounded-xl shadow-sm overflow-hidden relative">
                {/* SIDEBAR: Order List */}
                <div className={\`w-full md:w-[280px] lg:w-[320px] xl:w-[350px] shrink-0 border-r border-border flex flex-col h-full bg-surface-secondary/50 \${selectedOrderId ? 'hidden md:flex' : 'flex'}\`}>
                  <div className="p-4 border-b border-border bg-white flex flex-col gap-3 sticky top-0 z-10 shrink-0">
                    <h2 className="font-bold text-lg text-text-primary flex items-center gap-2">
                       <MessageCircle className="w-5 h-5 text-brand-primary" />
                       Chat & Pesanan
                    </h2>
                    <div className="relative relative w-full h-10 bg-base rounded-full flex items-center px-4 shadow-inner border border-border focus-within:ring-2 focus-within:ring-brand-primary/20 focus-within:border-brand-primary transition-all">
                       <Search className="w-4 h-4 text-text-secondary mr-2" />
                       <input 
                         type="text" 
                         placeholder="Cari pesanan..." 
                         className="bg-transparent border-none outline-none w-full text-[13px] text-text-primary placeholder:text-text-secondary disabled:opacity-50"
                         disabled
                       />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {filteredLocalOrders.map((order) => (
                      <div 
                        key={order.orderId}
                        onClick={() => setSelectedOrderId(order.orderId)}
                        className={\`p-4 justify-between items-start border-b border-border hover:bg-gray-50/80 cursor-pointer transition-colors relative flex gap-3 \${selectedOrderId === order.orderId ? 'bg-brand-primary/5' : ''}\`}
                      >
                        {selectedOrderId === order.orderId && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary rounded-r-full"></div>}
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-brand-primary/10 text-brand-primary font-bold text-sm border border-brand-primary/20 shrink-0 select-none shadow-sm">
                           {(order.storeName || 'P').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-start mb-0.5">
                              <span className="font-bold text-[13px] text-gray-900 truncate pr-2">{order.storeName || 'Toko UMKM'}</span>
                              <span className="text-[10px] text-gray-500 whitespace-nowrap">{formatOrderDate(order.createdAt).split(',')[0]}</span>
                           </div>
                           <div className="text-[12px] font-medium text-gray-700 truncate mb-1 pr-2">{order.productName}</div>
                           
                           {/* Status Badge */}
                           <div className="flex items-center justify-between mt-2">
                              <span className={\`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold \${
                                 order.status === 'chat_only' ? 'bg-sky-100 text-sky-700'
                                 : order.status === 'cancelled' ? 'bg-red-100 text-red-700'
                                 : order.status === 'waiting_verification' ? 'bg-yellow-100 text-yellow-800'
                                 : order.status === 'completed' ? 'bg-emerald-100 text-emerald-700'
                                 : 'bg-indigo-100 text-indigo-700'
                              }\`}>
                                 {order.status === 'chat_only' ? 'Quotation (Chat)' : order.status === 'completed' ? 'Selesai' : order.status === 'cancelled' ? 'Dibatalkan' : 'Proses'}
                              </span>
                              {order.unreadCount > 0 ? <span className="w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">{order.unreadCount}</span> : null}
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* MAIN CONTENT: Order Detail + Chat */}
                <div className={\`flex-1 h-full bg-base overflow-y-auto \${!selectedOrderId ? 'hidden md:block' : 'block'} w-full min-w-0 relative\`}>
                    {selectedOrderId ? (
                      <div className="w-full h-full min-w-0">
                         {/* Mobile Back Button */}
                         <div className="md:hidden sticky top-0 z-50 bg-white border-b border-gray-200 p-3 shadow-sm shrink-0">
                           <button 
                             onClick={() => setSelectedOrderId(null)}
                             className="flex items-center gap-1.5 text-gray-700 font-bold text-sm bg-gray-100 px-3 py-1.5 rounded-md hover:bg-gray-200 transition-colors"
                           >
                              <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
                           </button>
                         </div>
                         
                         {filteredLocalOrders.filter(o => o.orderId === selectedOrderId).map((order) => (
                            <ClientOrderDetail
                              key={order.orderId}
                              order={order}
                              user={user || null}
                              onNavigateTab={(tab) => setActiveTab(tab)}
                              onCancelOrder={() => {
                                handleCancelOrder(order.orderId, order.productName);
                              }}
                              feeAplikasi={feeAplikasi}
                              feeJasa={feeJasa}
                              feeAdmin={feeAdmin}
                              penaltyPercentage={penaltyPercentage}
                            />
                         ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-10 bg-neutral-50 h-[calc(100vh-140px)] w-full">
                         <div className="w-24 h-24 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-sm mb-6 animate-pulse-slow">
                           <MessageCircle className="w-12 h-12" />
                         </div>
                         <h3 className="text-xl font-extrabold text-text-primary mb-2">Pilih Pesanan & Chat</h3>
                         <p className="text-sm text-text-secondary max-w-sm leading-relaxed">
                           Silakan pilih daftar pesanan atau percakapan di sebelah kiri untuk melihat detail pesanan beserta ruang negosiasi Anda dengan penjual.
                         </p>
                      </div>
                    )}
                </div>
              </div>
            )}
          </>
        )}
      </main>`;

const p1 = match.index;
const p2 = code.indexOf(`</main>`);
if (p1 !== -1 && p2 !== -1) {
    code = code.substring(0, p1) + "\n" + masterDetailCode + "\n" + code.substring(p2);
    fs.writeFileSync('src/components/ClientBuyerOrders.tsx', code);
    console.log("Success!");
} else {
    console.log("Could not find main tag");
}

