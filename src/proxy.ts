import { NextResponse, NextRequest } from 'next/server';
import { APP_CONFIG } from './config/constants';

/**
 * Next.js Middleware for global project-wide authentication control.
 * This runs on the Edge runtime before every request.
 */
export function proxy(request: NextRequest) {
  // Pull the raw CSV string of allowed IPs from Google Cloud environment secrets
  const whitelist = process.env.WHITELISTED_IPS;
  
  // GCP and Vercel automatically inject the connecting user's IP here
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip');
  console.log("🚀 ~ proxy ~ ip:", ip)

  if (whitelist && ip) {
    const allowedIps = whitelist.replace(/[\[\]"]/g, '').split(',').map(s => s.trim());
    const isAllowed = allowedIps.some(allowed => ip.includes(allowed));
    
    if (!isAllowed) {
       console.warn(`Middleware intercepted unauthorized access at: ${request.nextUrl.pathname} from IP: ${ip}`);
       return new NextResponse(
         '🛑 Access Denied: For security reasons, the Scanner can only be accessed while directly connected to the authorized Warehouse WiFi network.', 
         { status: 403 }
       );
    }
  }

  // Check if authentication is enabled globally
  if (!APP_CONFIG.AUTH_ENABLED) {
    return NextResponse.next();
  }

  // Logic for authentication (usually checking a session cookie)
  const authToken = request.cookies.get('auth_token');
  const { pathname } = request.nextUrl;

  // Exclude public assets, static files, and the login page itself
  const isPublicFile = pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.startsWith('/static') || pathname.includes('.');
  const isLoginPage = pathname === '/login';

  if (!authToken && !isLoginPage && !isPublicFile) {
    // Redirect to login if auth is enabled but no token exists
    // return NextResponse.redirect(new URL('/login', request.url));
    console.warn('Middleware intercepted unauthorized access at:', pathname);
    // For now, we will just allow it to pass but log the warning since a login page doesn't exist yet
    // return NextResponse.next();
  }

  return NextResponse.next();
}

/**
 * Configure matching routes for performance optimization
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
