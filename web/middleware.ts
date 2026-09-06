import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Only routes that need a user session. Public storefront (/s/*), the
  // anonymous APIs and static assets skip the session refresh entirely.
  matcher: ["/", "/app/:path*", "/invite/:path*", "/login", "/signup", "/forgot-password"],
};
