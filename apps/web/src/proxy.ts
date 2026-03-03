import { type NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get('better-auth.session_token');

  if (!sessionCookie?.value) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
