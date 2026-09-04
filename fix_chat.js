const fs = require('fs');

let chat = fs.readFileSync('src/components/ChatInterface.tsx', 'utf-8');

// 1. Add state for showPenawaranForm and penawaran modal details
chat = chat.replace(/const \[showAttachmentMenu, setShowAttachmentMenu\] = useState\(false\);/,
    `const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showPenawaranForm, setShowPenawaranForm] = useState(false);
  const [penawaranData, setPenawaranData] = useState({ qty: "", price: "", date: "" });`);

// 2. Replace the showAttachmentMenu DOM (lines ~1057)
const attachMenuRegex = /\{showAttachmentMenu && \(\r?\n\s*<div className="absolute bottom-full left-4 mb-2 flex gap-3\.5 bg-surface border border-border p-3\.5 rounded-2xl shadow-xl z-30 transition-all origin-bottom-left">[\s\S]*?<\/div>\r?\n\s*\)\}/;
chat = chat.replace(attachMenuRegex,
    `{showAttachmentMenu && (
                <div className="absolute bottom-full left-4 mb-2 flex flex-col gap-2 bg-surface border border-border p-3 rounded-2xl shadow-xl z-30 transition-all origin-bottom-left min-w-[200px]">
                  <button
                    onClick={() => {
                      setShowAttachmentMenu(false);
                      setShowPenawaranForm(true);
                    }}
                    className="flex flex-row items-center justify-start gap-3 w-full bg-base hover:bg-brand-primary/10 hover:text-brand-primary border border-border rounded-xl p-3 transition-colors cursor-pointer text-text-secondary"
                  >
                    <FileText className="w-5 h-5 shrink-0" />
                    <span className="text-[12px] font-semibold">Surat Penawaran</span>
                  </button>
                </div>
              )}`);

// 3. Add the Penawaran Modal near the floating objects (or at the bottom of the component)
const penawaranModalCode = `
      {/* Modal Surat Penawaran */}
      <AnimatePresence>
        {showPenawaranForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-md overflow-hidden relative"
            >
              <div className="flex justify-between items-center p-4 border-b border-border bg-base">
                <div className="flex items-center gap-2">
                   <FileText className="w-5 h-5 text-brand-primary" />
                   <h2 className="text-lg font-bold text-text-primary">Buat Surat Penawaran</h2>
                </div>
                <button
                  onClick={() => setShowPenawaranForm(false)}
                  className="text-text-secondary hover:text-red-500 transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 flex flex-col gap-4">
                 <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">Jumlah Pesanan (Porsi/Pcs)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 50" 
                      value={penawaranData.qty}
                      onChange={e => setPenawaranData({...penawaranData, qty: e.target.value})}
                      className="w-full bg-base border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-primary transition-colors"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">Harga Satuan yang Ditawarkan (Rp)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 15000" 
                      value={penawaranData.price}
                      onChange={e => setPenawaranData({...penawaranData, price: e.target.value})}
                      className="w-full bg-base border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-primary transition-colors"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">📅 Tanggal Pesanan (Estimasi)</label>
                    <div className="relative">
                       <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-text-secondary" />
                       <input 
                         type="date" 
                         value={penawaranData.date}
                         onChange={e => setPenawaranData({...penawaranData, date: e.target.value})}
                         className="w-full bg-base border border-border rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-brand-primary transition-colors"
                       />
                    </div>
                 </div>
              </div>

              <div className="p-4 border-t border-border bg-base flex justify-end gap-3">
                 <button onClick={() => setShowPenawaranForm(false)} className="px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-gray-100 rounded-xl transition-colors">Batal</button>
                 <button 
                   disabled={!penawaranData.qty || !penawaranData.price || !penawaranData.date}
                   onClick={() => {
                      const msg = \`[SURAT_PENAWARAN|\${penawaranData.qty}|\${penawaranData.price}|\${penawaranData.date}]\`;
                      handleSendMessage(msg);
                      setShowPenawaranForm(false);
                      setPenawaranData({qty: "", price: "", date: ""});
                   }} 
                   className="px-4 py-2 text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary-hover rounded-xl transition-colors disabled:opacity-50"
                 >
                   Kirim Penawaran
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
`;

chat = chat.replace(/<\/div>\r?\n\s*\{\/\* Desktop Back Button \*\/\}/,
    `</div>
      ${penawaranModalCode}
      {/* Desktop Back Button */}`);


// 4. Add the Message Parser for SURAT_PENAWARAN
const pMatchCode = `
    // 2. Surat Penawaran format: [SURAT_PENAWARAN|qty|price|date]
    const suratMatch = trimmed.match(/\\[SURAT_PENAWARAN\\|(.*?)\\|(.*?)\\|(.*?)\\]/);
    if (suratMatch) {
      const remainder = trimmed.replace(suratMatch[0], "").trim();
      const sQty = suratMatch[1];
      const sPrice = parseInt(suratMatch[2] || "0").toLocaleString('id-ID');
      const sDate = suratMatch[3];
      
      return (
        <div className="flex flex-col gap-2">
          {remainder && (
            <p className="whitespace-pre-line text-sm break-words leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderRichText(remainder) }} />
          )}
          <div className={\`flex flex-col gap-0 overflow-hidden rounded-xl w-[260px] shadow-sm text-left border \${isSender ? "bg-white border-brand-primary/20" : "bg-white border-border"}\`}>
             <div className="bg-brand-primary text-white p-3 flex items-center justify-center gap-2">
                <FileText className="w-5 h-5" />
                <h4 className="font-bold text-sm tracking-wide uppercase">Surat Penawaran</h4>
             </div>
             <div className="p-3 bg-white flex flex-col gap-2">
                <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                   <span className="text-xs font-semibold text-gray-500">Jumlah:</span>
                   <span className="text-xs font-black text-gray-800">{sQty} Porsi</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                   <span className="text-xs font-semibold text-gray-500">Harga Satuan:</span>
                   <span className="text-xs font-black text-brand-primary">Rp {sPrice}</span>
                </div>
                <div className="flex flex-col bg-[#fff8eb] p-2 rounded-lg border border-orange-100 mt-1">
                   <span className="text-[10px] font-bold text-orange-600 flex items-center gap-1 mb-1">
                      <Calendar className="w-3 h-3" /> Tanggal Pesanan
                   </span>
                   <span className="text-xs font-black text-gray-800">{sDate}</span>
                </div>
             </div>
          </div>
        </div>
      );
    }
`;

chat = chat.replace(/\/\/ 2\. Promotion/, `${pMatchCode}\n    // 3. Promotion`);

// And I also need to ensure FileText is imported!
if (!chat.includes('FileText')) {
    chat = chat.replace(/from "lucide-react";/, `, FileText } from "lucide-react";`);
}

fs.writeFileSync('src/components/ChatInterface.tsx', chat);
