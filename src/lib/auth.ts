import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export async function getUserFromSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'fallback-secret-for-development'
    );
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
