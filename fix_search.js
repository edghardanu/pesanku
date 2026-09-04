const fs = require('fs');

let code = fs.readFileSync('src/components/ClientBuyerOrders.tsx', 'utf-8');

// 1. Add searchQuery state
code = code.replace(/const \[selectedOrderId, setSelectedOrderId\] = useState<string \| null>\(null\);/,
    `const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);\n  const [searchQuery, setSearchQuery] = useState("");`);

// 2. Add searchQuery to filtering logic
code = code.replace(/const filteredLocalOrders = localOrders\.filter\(\(o\) => \{/,
    `const filteredLocalOrders = localOrders.filter((o) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !o.productName?.toLowerCase().includes(q) &&
        !o.storeName?.toLowerCase().includes(q) &&
        !o.orderId?.toLowerCase().includes(q)
      ) {
        return false;
      }
    }`);

// 3. Bind search input
code = code.replace(/<input\s+type="text"\s+placeholder="Cari pesanan\.\.\."\s+className="bg-transparent border-none outline-none w-full text-\[13px\] text-text-primary placeholder:text-text-secondary disabled:opacity-50"\s+disabled\s*\/>/m,
    `<input 
                         type="text" 
                         placeholder="Cari pesanan / toko / ID..." 
                         className="bg-transparent border-none outline-none w-full text-[13px] text-text-primary placeholder:text-text-secondary"
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                       />`);

fs.writeFileSync('src/components/ClientBuyerOrders.tsx', code);
