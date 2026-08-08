import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

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
  const route = protectedRoutes.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (!route) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname);

  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.redirect(loginUrl);
  }

  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'fallback-secret-for-development'
    );
    const { payload } = await jwtVerify(token, secret);
    const { role } = payload as SessionPayload;

    if (!role || !route.roles.includes(role)) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth_token');
    return response;
  }
}

export const config = {
  matcher: ['/admin/:path*', '/seller/:path*', '/profile/:path*', '/invoice/:path*'],
};
