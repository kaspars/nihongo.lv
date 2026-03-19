import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map(e => e.trim())
  .filter(Boolean);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    const email = req.auth?.user?.email;
    if (!email || !adminEmails.includes(email)) {
      if (!req.auth) {
        // Not signed in — go to sign-in page
        return NextResponse.redirect(new URL("/api/auth/signin", req.url));
      }
      // Signed in but not an admin — go home
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
