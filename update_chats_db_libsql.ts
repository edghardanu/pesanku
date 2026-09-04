import { createClient } from "@libsql/client";

const client = createClient({
    url: "file:sqlite.db",
});

async function main() {
    const rs = await client.execute("SELECT * FROM chats WHERE text LIKE '%Tadi kakak melakukan pemesanan untuk%' OR text LIKE '%Silakan sampaikan Surat Penawaran Anda dengan detail untuk pesanan%'");

    let updated = 0;
    for (const row of rs.rows) {
        const textStr = String(row.text);
        const match = textStr.match(/<b>(.*?)<\/b>/);
        if (match) {
            const productName = match[1];
            const newText = "Halo kak! Pesanan pre-order untuk <b>" + productName + "</b> sudah saya terima. Mengenai (nego harga, custom porsi, atau waktu pengiriman), bisakah kakak buat <b>Surat Penawaran</b> dari fitu lampiran khusus (📎) dibawah ya.";
            await client.execute({
                sql: "UPDATE chats SET text = ? WHERE id = ?",
                args: [newText, row.id]
            });
            updated++;
        }
    }
    console.log("Updated", updated);
}

main();
