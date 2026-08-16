import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isStaffRole, roleRequiresMfa } from "@/lib/admin/permissions";

export default auth((request) => {
  const pathname = request.nextUrl.pathname;
  const session = request.auth;
  if (pathname.startsWith("/admin")) {
    if (!session?.user) return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, request.nextUrl));
    if (!isStaffRole(session.user.role)) return NextResponse.redirect(new URL("/portal", request.nextUrl));
    if (roleRequiresMfa(session.user.role) && (!session.user.mfaEnabled || !session.user.mfaVerified) && pathname !== "/admin/settings") {
      return NextResponse.redirect(new URL("/admin/settings?mfa=required", request.nextUrl));
    }
  }
  if (pathname.startsWith("/portal") && session?.user && isStaffRole(session.user.role)) return NextResponse.redirect(new URL("/admin", request.nextUrl));
  return NextResponse.next();
});

export const config = { matcher: ["/admin/:path*", "/portal/:path*"] };
