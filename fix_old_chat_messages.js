// fix_old_chat_messages.js
// Fixes outdated auto-generated chat opening messages in the DB
// Run: node fix_old_chat_messages.js

const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

const client = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
    const result = await client.execute(
        `SELECT id, text FROM chat_messages WHERE text LIKE '%melakukan pemesanan%' OR text LIKE '%Tadi kakak%'`
    );

    const rows = result.rows;
    console.log(`Found ${rows.length} message(s) with old wording.`);

    let updated = 0;
    for (const row of rows) {
        const id = row.id;
        const text = row.text;
        console.log(`\nBefore: ${text}`);

        let newText = String(text)
            .replace(/Tadi kakak melakukan pemesanan untuk <b>(.*?)<\/b> ya\?/gi,
                'Apakah ada yang bisa kami bantu seputar penawaran produk <b>$1</b>? Silakan klik icon lampiran (📎) lalu pilih <b>Surat Penawaran</b> untuk mengajukan penawaran harga, porsi, atau waktu.')
            .replace(/melakukan pemesanan untuk <b>(.*?)<\/b>/gi,
                'menerima permintaan penawaran untuk <b>$1</b>');

        if (newText !== String(text)) {
            await client.execute({ sql: 'UPDATE chat_messages SET text = ? WHERE id = ?', args: [newText, id] });
            console.log(`After:  ${newText}`);
            updated++;
        } else {
            console.log('(no change needed)');
        }
    }

    console.log(`\n✅ Updated ${updated} message(s).`);
}

main().catch(console.error);
