import { createClient } from "@libsql/client";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const client = createClient({
    url: "libsql://pesanku-edghardanuwijaya354.aws-ap-northeast-1.turso.io",
    authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MTc2MDU1NzMsImlhdCI6MTc4NjA2OTU3NCwiaWQiOiIwMTlmZDJjNi05NzAxLTczYmYtYjU2NC1jZGYxN2ZlNDUyNGEiLCJraWQiOiIzaWhiVmxSazVmM1NNc2JXRXRlNUIybl9qNFNpSkVJNlBaaE5VWVdSRXpFIiwicmlkIjoiODI5ODQ2YmMtMTM0Zi00YWI3LTkzMDUtYzdmZmM5NmE5OWIwIn0.DaKzF91eK2OYFJP3wUwkASwH1voYOGqhZPa57Uk6Ki-tdcF6m2PV5PsYMFyGirZjhg8OFTZxMjKzfsipn93XDA",
});

async function run() {
    const statements = [
        "ALTER TABLE `orders` ADD COLUMN `delivery_proof_url` text",
        "ALTER TABLE `orders` ADD COLUMN `dispatch_receipt_url` text",
        "ALTER TABLE `orders` ADD COLUMN `tracking_number` text",
        "ALTER TABLE `orders` ADD COLUMN `delivery_date` text",
        "ALTER TABLE `orders` ADD COLUMN `delivery_address` text",
        "ALTER TABLE `orders` ADD COLUMN `cancel_reason` text"
    ];
    for (const st of statements) {
        try {
            await client.execute(st);
            console.log("Success: " + st);
        } catch (e) {
            console.log("Failed (probably already exists): " + st + " | Error: " + e.message);
        }
    }
}

run();
