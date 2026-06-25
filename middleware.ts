import { NextRequest, NextResponse } from 'next/server';

// In-memory rate limiter (resets on cold start — sufficient for abuse prevention)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_TARGETS = [
  '/api/generate',
  '/api/cbt-generate',
  '/api/kokushi-generate',
  '/api/explain',
];

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 20;  // per IP per minute per endpoint

function getRateLimitKey(ip: string, pathname: string): string {
  return `${ip}:${pathname}`;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!RATE_LIMIT_TARGETS.some(t => pathname.startsWith(t))) {
    return NextResponse.next();
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  const key = getRateLimitKey(ip, pathname);
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  entry.count += 1;

  if (entry.count > MAX_REQUESTS) {
    return NextResponse.json(
      { error: 'リクエストが多すぎます。しばらく待ってから再試行してください。' },
      { status: 429 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/generate', '/api/cbt-generate', '/api/kokushi-generate', '/api/explain'],
};
