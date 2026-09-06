import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { resolveCustomDomain } from "@/lib/custom-domain";

export async function middleware(request: NextRequest) {
  // Custom salon domains (Premium): rewrite the host's root paths onto /s/<slug>/…
  const rewrite = await resolveCustomDomain(request);
  if (rewrite) return NextResponse.rewrite(rewrite);
  return updateSession(request);
}

export const config = {
  // Only routes that need a user session, plus the paths a custom domain serves.
  matcher: ["/", "/app/:path*", "/invite/:path*", "/login", "/signup", "/forgot-password", "/book", "/book/:path*", "/review", "/chat"],
};
