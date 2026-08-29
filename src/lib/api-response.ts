// ============================================================
//  src/lib/api-response.ts
//  Helper fungsi untuk API Route responses yang konsisten
// ============================================================

import { NextResponse } from 'next/server';

/** Response sukses standar */
export function ok<T extends object>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/** Response sukses tanpa data tambahan */
export function success(message = 'Berhasil', status = 200) {
  return NextResponse.json({ success: true, message }, { status });
}

/** Response error 400 Bad Request */
export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/** Response error 401 Unauthorized */
export function unauthorized(message = 'Tidak memiliki akses') {
  return NextResponse.json({ error: message }, { status: 401 });
}

/** Response error 403 Forbidden */
export function forbidden(message = 'Akses ditolak') {
  return NextResponse.json({ error: message }, { status: 403 });
}

/** Response error 404 Not Found */
export function notFound(message = 'Data tidak ditemukan') {
  return NextResponse.json({ error: message }, { status: 404 });
}

/** Response error 500 Internal Server Error */
export function serverError(message = 'Terjadi kesalahan pada server') {
  return NextResponse.json({ error: message }, { status: 500 });
}
