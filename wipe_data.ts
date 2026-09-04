import 'dotenv/config';
import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('Menghapus data chat_messages...');
    try { await db.run(sql`DELETE FROM chat_messages;`); } catch (e) { }

    console.log('Menghapus data payouts...');
    try { await db.run(sql`DELETE FROM payouts;`); } catch (e) { }

    console.log('Menghapus data payments...');
    try { await db.run(sql`DELETE FROM payments;`); } catch (e) { }

    console.log('Menghapus data orders...');
    try { await db.run(sql`DELETE FROM orders;`); } catch (e) { }

    console.log('Mereset saldo seller menjadi 0...');
    try {
        console.log('clearing seller_balances..');
        await db.run(sql`UPDATE seller_balances SET available_balance = 0, retained_balance = 0;`);
    } catch (e) {
        console.log((e as any).message);
    }

    console.log('Selesai!');
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
