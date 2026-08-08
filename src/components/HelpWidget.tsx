"use client";

import { useState, useEffect } from "react";
import { MessageCircle, HelpCircle, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

export default function HelpWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  
  const [category, setCategory] = useState("bug");
  const [customCategory, setCustomCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) {
      setUser(JSON.parse(u));
    }
  }, []);

  const handleWhatsApp = () => {
    // Nomor WA admin/CS (ganti dengan yang sesuai)
    window.open("https://wa.me/6281234567890", "_blank");
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      Swal.fire('Gagal', 'Anda harus login terlebih dahulu untuk mengirim tiket.', 'warning');
      return;
    }

    if (!notes.trim()) {
      Swal.fire('Error', 'Catatan tambahan wajib diisi.', 'error');
      return;
    }
    
    if (category === "lainnya" && !customCategory.trim()) {
      Swal.fire('Error', 'Silakan isi kolom kategori lainnya.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          category,
          customCategory: category === "lainnya" ? customCategory : null,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      Swal.fire('Berhasil', 'Tiket berhasil dikirim. Tim kami akan segera menindaklanjutinya.', 'success');
      setShowTicketForm(false);
      setNotes("");
      setCategory("bug");
      setCustomCategory("");
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Gagal mengirim tiket', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed md:bottom-6 bottom-44 md:right-6 right-4 z-[60] flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-3 items-end"
          >
            {!showTicketForm ? (
              <div className="flex flex-col gap-2 bg-surface border border-border p-3 rounded-2xl shadow-xl w-48">
                <button
                  onClick={handleWhatsApp}
                  className="flex items-center gap-2 p-2 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl transition-colors w-full text-left text-sm font-semibold"
                >
                  <MessageCircle className="w-5 h-5" />
                  Hubungi WA
                </button>
                <button
                  onClick={() => setShowTicketForm(true)}
                  className="flex items-center gap-2 p-2 hover:bg-brand-primary/10 text-brand-primary rounded-xl transition-colors w-full text-left text-sm font-semibold"
                >
                  <HelpCircle className="w-5 h-5" />
                  Butuh Bantuan?
                </button>
              </div>
            ) : (
              <div className="bg-surface border border-border p-5 rounded-2xl shadow-xl w-80 mb-2 max-h-[70vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-text-primary">Butuh Bantuan?</h3>
                  <button onClick={() => setShowTicketForm(false)} className="text-text-secondary hover:text-text-primary p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmitTicket} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Kategori Laporan</label>
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full input-field bg-base p-2 rounded-xl text-sm border border-border"
                    >
                      <option value="bug">Laporan Bug / Error</option>
                      <option value="penjual_tidak_responsif">Penjual Tidak Responsif</option>
                      <option value="pembayaran">Masalah Pembayaran</option>
                      <option value="pengiriman">Masalah Pengiriman</option>
                      <option value="lainnya">Lainnya...</option>
                    </select>
                  </div>
                  
                  {category === "lainnya" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Kategori (Manual)</label>
                      <input 
                        type="text" 
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="Tuliskan kategori..."
                        className="w-full input-field bg-base p-2 rounded-xl text-sm border border-border"
                      />
                    </motion.div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Catatan Tambahan</label>
                    <textarea 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Jelaskan detail masalah Anda secara lengkap..."
                      className="w-full input-field bg-base p-3 rounded-xl text-sm border border-border min-h-[100px] resize-y"
                    ></textarea>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full btn-primary py-2.5 rounded-xl flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? 'Mengirim...' : <><Send className="w-4 h-4" /> Kirim Tiket</>}
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) setShowTicketForm(false);
        }}
        className="w-14 h-14 bg-brand-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 hover:bg-brand-primary-hover transition-all z-50"
      >
        {isOpen ? <X className="w-6 h-6" /> : <HelpCircle className="w-6 h-6" />}
      </button>
    </div>
  );
}
