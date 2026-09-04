const fs = require('fs');

let page = fs.readFileSync('src/app/buyer/orders/page.tsx', 'utf-8');
page = page.replace('penaltyPercentage={penaltyPercentage}', '');
fs.writeFileSync('src/app/buyer/orders/page.tsx', page);

let buyer = fs.readFileSync('src/components/ClientBuyerOrders.tsx', 'utf-8');
if (!buyer.includes('import ClientOrderDetail')) {
    buyer = "import ClientOrderDetail from './ClientOrderDetail';\n" + buyer;
}
// remove penaltyPercentage from ClientOrderDetail call
buyer = buyer.replace('penaltyPercentage={penaltyPercentage}', '');

// Also fix unreadCount undefined error on line 1270 and tab any on 1297
buyer = buyer.replace(/order\.unreadCount > 0/g, '(order.unreadCount || 0) > 0');
buyer = buyer.replace(/order\.unreadCount\}/g, '(order.unreadCount || 0)}');
buyer = buyer.replace(/onNavigateTab=\{\(\(tab\) => setActiveTab\(tab\)\)\}/g, "onNavigateTab={(tab: 'orders' | 'tracking' | 'chats') => { if (tab === 'orders' || tab === 'tracking') setActiveTab(tab); }}");
buyer = buyer.replace(/onNavigateTab=\{\(tab\) => setActiveTab\(tab\)\}/g, "onNavigateTab={(tab: 'orders' | 'tracking' | 'chats') => { if (tab === 'orders' || tab === 'tracking') setActiveTab(tab); }}");


fs.writeFileSync('src/components/ClientBuyerOrders.tsx', buyer);

let seller = fs.readFileSync('src/components/SellerOrderDetail.tsx', 'utf-8');
seller = seller.replace(/title=\{order\.buyerEmail \|\| "-"\}/g, 'title={order.buyerPhone || "-"}');
fs.writeFileSync('src/components/SellerOrderDetail.tsx', seller);
