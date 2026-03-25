import { NextResponse, NextRequest } from 'next/server';

/**
 * Next.js Middleware for global project-wide IP Whitelisting.
 * Refined for Next.js 15/16 - uses standard headers to resolve client IP.
 */
export function proxy(request: NextRequest) {
  // Pull the raw CSV string of allowed IPs from environment variables
  const whitelist = process.env.WHITELISTED_IPS;
  
  /**
   * Google Cloud Run / Vercel automatically inject the real IP here.
   * Access only through headers to ensure compatibility across Next.js versions.
   */
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  // Resolve IP: Try forwarded list first, then real-ip, then fallback.
  // We avoid request.ip as it is inconsistent across environments.
  const resolvedIp = (forwardedFor ? forwardedFor.split(',')[0] : realIp) || '127.0.0.1';

  // 🛡️ IP Whitelist Logic
  if (whitelist && resolvedIp) {
    // Standardize localhost
    const ip = resolvedIp === '::1' ? '127.0.0.1' : resolvedIp;
    
    // Parse whitelist from JSON string or CSV - Ensuring empty entries are discarded
    const allowedIps = whitelist.replace(/[\[\]"]/g, '').split(',').map(s => s.trim()).filter(s => s.length > 0);
    
    // Check if the current IP is explicitly listed or contains a valid entry
    const isAllowed = allowedIps.some(allowed => ip.includes(allowed) || ip === allowed);
    
    if (!isAllowed) {
       console.warn(`🛑 Unauthorized frontend access blocked from IP: ${ip} at path: ${request.nextUrl.pathname}`);
       return new NextResponse(
         `Access Denied: The Warehouse Scanner is restricted to authorized WiFi networks only. (Your IP: ${ip})`, 
         { status: 403 }
       );
    }
  }

  return NextResponse.next();
}

/**
 * Configure matching routes.
 * Excludes backend calls, static assets, and system files.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (Next.js internal API routes)
     * - _next/static, _next/image, favicon.ico
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
