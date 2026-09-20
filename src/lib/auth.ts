import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

/**
 * Mengambil JWT_SECRET dari environment variable.
 * WAJIB di-set di production. Aplikasi akan crash jika tidak ada.
 */
export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set. Application cannot run securely.');
  }
  return new TextEncoder().encode(secret);
}

export async function getUserFromSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) return null;

  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    
    return payload as {
      id: string;
      role: string;
      email: string;
      name: string;
    };
  } catch (error) {
    return null;
  }
}
