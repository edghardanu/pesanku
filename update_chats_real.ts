import { db } from './src/lib/db';
import { chatMessages as chats } from './src/lib/schema';
import { eq, like, or } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function updateChats() {
    const allChats = await db.select().from(chats).where(
        or(
            like(chats.text, '%Tadi kakak melakukan pemesanan untuk%'),
            like(chats.text, '%Silakan sampaikan Surat Penawaran Anda dengan detail untuk pesanan%')
        )
    );

    let updated = 0;
    for (const chat of allChats) {
        let textStr = chat.text || "";
        const match = textStr.match(/<b>(.*?)<\/b>/);
        if (match) {
            const productName = match[1];
            const newText = "Halo kak! Pesanan untuk <b>" + productName + "</b> sudah kami terima. Jika kakak ingin mengajukan penawaran (nego harga, porsi, atau waktu pengiriman), silakan klik icon lampiran (📎) lalu pilih <b>Surat Penawaran</b> ya.";

            await db.update(chats)
                .set({ text: newText })
                .where(eq(chats.id, chat.id));
            updated++;
        }
    }

    console.log("Updated", updated, "chat messages.");
    process.exit(0);
}

updateChats().catch(console.error);
