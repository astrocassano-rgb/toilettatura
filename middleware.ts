import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./src/types/database";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const traceId = crypto.randomUUID();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Parameters<typeof response.cookies.set>[2] }>) {
          cookiesToSet.forEach((cookie) => response.cookies.set(cookie.name, cookie.value, cookie.options));
        }
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

  const isProtectedRoute = request.nextUrl.pathname.startsWith("/prenota/nuova") ||
    request.nextUrl.pathname.startsWith("/cani") ||
    request.nextUrl.pathname.startsWith("/wallet") ||
    request.nextUrl.pathname.startsWith("/profilo") ||
    request.nextUrl.pathname.startsWith("/prenotazioni");

  // #region debug-point B:middleware-auth-state
  void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "profile-auth-loop", runId: "post-fix", hypothesisId: "B", location: "middleware.ts", traceId, msg: "[DEBUG] Middleware auth state", data: { pathname: request.nextUrl.pathname, search: request.nextUrl.search, isProtectedRoute, isAdminRoute, hasUser: Boolean(user), userId: user?.id ?? null, cookieNames: request.cookies.getAll().map((cookie) => cookie.name) }, ts: Date.now() }) }).catch(() => {});
  // #endregion

  if ((isProtectedRoute || isAdminRoute) && !user) {
    // #region debug-point B:middleware-redirect-login
    void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "profile-auth-loop", runId: "post-fix", hypothesisId: "B", location: "middleware.ts", traceId, msg: "[DEBUG] Middleware redirecting to login", data: { pathname: request.nextUrl.pathname, search: request.nextUrl.search }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && user) {
    const role = (user as any)?.app_metadata?.role;
    if (role !== "admin") {
      const targetUrl = request.nextUrl.clone();
      targetUrl.pathname = "/";
      targetUrl.search = "";
      return NextResponse.redirect(targetUrl);
    }
  }

  // Se l'utente è loggato e prova ad andare su /login, lo rimandiamo alla destinazione desiderata oppure alla home
  if (request.nextUrl.pathname === '/login' && user) {
    const nextPath = request.nextUrl.searchParams.get('next');
    const targetUrl = request.nextUrl.clone();

    // #region debug-point C:middleware-login-bounce
    void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "profile-auth-loop", runId: "post-fix", hypothesisId: "C", location: "middleware.ts", traceId, msg: "[DEBUG] Middleware bouncing logged-in user away from login", data: { pathname: request.nextUrl.pathname, nextPath, userId: user.id }, ts: Date.now() }) }).catch(() => {});
    // #endregion

    if (nextPath && nextPath.startsWith('/')) {
      const nextUrl = new URL(nextPath, request.url);
      targetUrl.pathname = nextUrl.pathname;
      targetUrl.search = nextUrl.search;
    } else {
      targetUrl.pathname = '/';
      targetUrl.search = '';
    }

    return NextResponse.redirect(targetUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/).*)"]
};
