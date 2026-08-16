const fs = require('fs');
let file = fs.readFileSync('src/components/ClientSellerDashboard.tsx', 'utf8');

// Update formData initialization
file = file.replace(
  "bankAccount: profile?.bankAccount || '',",
  "bankAccount: profile?.bankAccount || '',\n    description: profile?.description || '',"
);

// Update saveProfile request payload
file = file.replace(
  "bankAccount: formData.bankAccount,",
  "bankAccount: formData.bankAccount,\n          description: formData.description,"
);

// Inject textarea into the form
const textareaHTML = `                  <div>
                    <label className="block text-body-small font-medium text-text-secondary mb-1">Deskripsi Toko</label>
                    <textarea 
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="input-field w-full min-h-[100px] py-3"
                      placeholder="Ceritakan tentang UMKM dan produk-produk andalan Anda"
                    ></textarea>
                  </div>`;

file = file.replace(
  "<div>\n                    <label className=\"block text-body-small font-medium text-text-secondary mb-1\">Alamat Toko</label>",
  textareaHTML + "\n\n                  <div>\n                    <label className=\"block text-body-small font-medium text-text-secondary mb-1\">Alamat Toko</label>"
);

fs.writeFileSync('src/components/ClientSellerDashboard.tsx', file);
