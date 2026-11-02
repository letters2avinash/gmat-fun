import { NextResponse, type NextRequest } from "next/server";

// sazzag.gmat.fun serves the test series. Requests on that host are rewritten
// into the /series section, so sazzag.gmat.fun/ shows /series and
// sazzag.gmat.fun/test/3 shows /series/test/3. API routes live under
// /api/series and are reachable on the same host unchanged.
const SERIES_HOSTS = new Set(["sazzag.gmat.fun", "sazzag.localhost"]);

export function proxy(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (!SERIES_HOSTS.has(host)) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/series") || pathname.startsWith("/api/series")) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = pathname === "/" ? "/series" : `/series${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|logo).*)"],
};
