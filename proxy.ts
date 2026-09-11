import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * `middleware.ts` está deprecado en Next.js 16, renombrado a `proxy.ts`
 * (mismo comportamiento, export `proxy` en vez de `middleware` — ver
 * node_modules/next/dist/docs/.../file-conventions/proxy.md).
 */
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const isLoginPage = request.nextUrl.pathname === "/admin/login";

  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
