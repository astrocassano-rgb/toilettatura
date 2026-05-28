import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isProtectedRoute = request.nextUrl.pathname.startsWith("/prenota/nuova") ||
    request.nextUrl.pathname.startsWith("/cani") ||
    request.nextUrl.pathname.startsWith("/wallet") ||
    request.nextUrl.pathname.startsWith("/profilo");

  if (isProtectedRoute && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // Se l'utente è loggato e prova ad andare su /login, lo rimandiamo alla home
  if (request.nextUrl.pathname === '/login' && user) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/).*)"]
};
