import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Demo mode: allow all access without auth
  // In production: add Supabase auth check here
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/employee/:path*'],
};
