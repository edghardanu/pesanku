# iPaymu Proxy Worker

Cloudflare Git build settings:

- Root directory: `cloudflare-worker`
- Build command: kosong
- Deploy command: `npm run deploy`

Tambahkan secret `PROXY_SECRET` melalui Cloudflare Workers **Settings →
Variables and Secrets**. Nilainya harus sama dengan `IPAYMU_PROXY_SECRET` pada
environment aplikasi Pesanku.

Worker hanya menerima request `POST` ke `/payment`, `/transaction`, dan
`/transfer`. Production digunakan secara default; header `x-ipaymu-env: sandbox`
akan mengarahkan request ke Sandbox.

> Cloudflare Workers standar tidak menjamin satu IP egress statis. Pastikan
> solusi IP whitelist disepakati dengan iPaymu sebelum digunakan untuk transaksi
> Production.
