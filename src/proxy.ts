import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const publicPaths = [
  '/',
  '/login', 
  '/register',
  '/verify',
  '/forgot-password',
  '/reset-password',
  '/api/auth/login', 
  '/api/auth/register', 
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/otp/verify',
  '/api/otp/verify-register', 
  '/api/otp/send', 
  '/api/public-stats'
];

const protectedRoutes = [
  { prefix: '/admin', roles: ['admin'] },
  { prefix: '/seller', roles: ['penjual'] },
  { prefix: '/profile', roles: ['admin', 'penjual', 'pembeli'] },
  { prefix: '/invoice', roles: ['admin', 'penjual', 'pembeli'] },
];

type SessionPayload = {
  role?: string;
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;

  // Izinkan file statis dan internal Next.js
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/assets') ||
    pathname.match(/\.(.*)$/)
  ) {
    return NextResponse.next();
  }

  const isPublicPath = publicPaths.some(p => {
    if (p === '/') {
      return pathname === '/';
    }
    // Untuk path lainnya, cek exact match atau sub-path (contoh: /api/otp/...)
    return pathname === p || pathname.startsWith(`${p}/`);
  });

  // 1. Validasi Token (Jika Ada Token)
  let payloadData: SessionPayload | null = null;
  if (token) {
    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'fallback-secret-for-development'
      );
      const { payload } = await jwtVerify(token, secret);
      payloadData = payload as SessionPayload;
    } catch {
      // Jika token ada tapi tidak valid (palsu/expired)
      payloadData = null;
    }
  }

  // 2. Akses Ditolak: Jika tidak memiliki token valid pada endpoint/url yang bukan publik
  if (!payloadData && !isPublicPath) {
    const errorMsg = token ? 'Sesi Anda telah berakhir atau tidak valid. Silakan login kembali.' : 'Anda tidak mempunyai hak akses, silakan login.';
    
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json({ message: errorMsg }, { status: 401 });
      if (token) response.cookies.delete('auth_token');
      return response;
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', errorMsg);
    loginUrl.searchParams.set('next', pathname); // Membantu redirect kembali ke halaman semula
    
    const response = NextResponse.redirect(loginUrl);
    if (token) {
      response.cookies.delete('auth_token');
    }
    return response;
  }

  // 3. Otorisasi Role: Jika rolenya dibutuhkan untuk path tersebut
  const route = protectedRoutes.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (route && payloadData) {
    const { role } = payloadData;
    if (!role || !route.roles.includes(role)) {
      return NextResponse.redirect(new URL('/', request.url)); 
      // Redirect ke beranda jika rolenya tidak diperbolehkan untuk route ini
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
