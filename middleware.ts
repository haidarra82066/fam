import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PROTECTED_ROUTES = ['/dashboard', '/tree'];
const ADMIN_ROUTES = ['/admin'];
const AUTH_ROUTES = ['/login', '/signup'];

function isProtected(pathname: string) {
  return PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isAdminRoute(pathname: string) {
  return ADMIN_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_BASE_URL ?? request.nextUrl.origin;

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': appOrigin,
        'Access-Control-Allow-Methods': 'GET,POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isProtected(pathname) || isAdminRoute(pathname)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: import('@supabase/ssr').CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && (isProtected(pathname) || isAdminRoute(pathname))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('status').eq('id', user.id).maybeSingle();
    const status = profile?.status as string | undefined;
    const isAdmin = (process.env.ADMIN_EMAILS ?? '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean).includes((user.email ?? '').toLowerCase());

    if (AUTH_ROUTES.includes(pathname)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (status === 'rejected' && pathname !== '/rejected') {
      return NextResponse.redirect(new URL('/rejected', request.url));
    }

    if (status !== 'approved' && isProtected(pathname)) {
      return NextResponse.redirect(new URL('/pending-approval', request.url));
    }

    if (isAdminRoute(pathname) && !isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
