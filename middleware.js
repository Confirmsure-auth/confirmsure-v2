import { NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

// Protected route patterns
const PROTECTED_ROUTES = {
  FACTORY: /^\/factory/,
  ADMIN: /^\/admin/,
  API_FACTORY: /^\/api\/factory/,
  API_ADMIN: /^\/api\/admin/
}

// Rate limiting configuration
const RATE_LIMITS = {
  '/api/auth/signin': { windowMs: 15 * 60 * 1000, max: 5 }, // 5 attempts per 15 minutes
  '/api/products': { windowMs: 60 * 1000, max: 100 }, // 100 requests per minute
  '/api/upload': { windowMs: 60 * 1000, max: 20 }, // 20 uploads per minute
  '/api/qr/generate': { windowMs: 60 * 1000, max: 50 } // 50 QR generations per minute
}

// In-memory rate limiting store (use Redis in production)
const rateLimitStore = new Map()

export async function middleware(request) {
  const response = NextResponse.next()
  
  // Add security headers
  addSecurityHeaders(response)
  
  // Apply rate limiting
  const rateLimitResult = await applyRateLimit(request)
  if (rateLimitResult.blocked) {
    return new NextResponse('Too Many Requests', { 
      status: 429,
      headers: rateLimitResult.headers 
    })
  }

  // Add rate limit headers
  Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  const url = request.nextUrl.clone()
  const pathname = url.pathname

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    return handleApiRoute(request, response)
  }

  // Handle protected page routes
  if (isProtectedRoute(pathname)) {
    return await handleProtectedRoute(request, response)
  }

  return response
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response) {
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Needed for Next.js
      "style-src 'self' 'unsafe-inline'", // Needed for Tailwind
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'"
    ].join('; ')
  )

  // CORS headers for API routes
  response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || 'https://confirmsure.com')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

/**
 * Apply rate limiting
 */
async function applyRateLimit(request) {
  const pathname = request.nextUrl.pathname
  const clientIP = getClientIP(request)
  
  // Find matching rate limit rule
  const rateLimit = Object.entries(RATE_LIMITS).find(([pattern, limit]) => {
    return pathname.startsWith(pattern)
  })?.[1]

  if (!rateLimit) {
    return { blocked: false, headers: {} }
  }

  const key = `${clientIP}:${pathname}`
  const now = Date.now()
  const windowStart = now - rateLimit.windowMs

  // Get or create rate limit data
  let limitData = rateLimitStore.get(key) || { requests: [], windowStart: now }

  // Clean old requests
  limitData.requests = limitData.requests.filter(time => time > windowStart)

  // Check if limit exceeded
  if (limitData.requests.length >= rateLimit.max) {
    const oldestRequest = Math.min(...limitData.requests)
    const resetTime = oldestRequest + rateLimit.windowMs
    
    return {
      blocked: true,
      headers: {
        'X-RateLimit-Limit': rateLimit.max.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
        'Retry-After': Math.ceil((resetTime - now) / 1000).toString()
      }
    }
  }

  // Add current request
  limitData.requests.push(now)
  rateLimitStore.set(key, limitData)

  // Cleanup old entries periodically
  if (Math.random() < 0.01) { // 1% chance
    cleanupRateLimitStore()
  }

  return {
    blocked: false,
    headers: {
      'X-RateLimit-Limit': rateLimit.max.toString(),
      'X-RateLimit-Remaining': (rateLimit.max - limitData.requests.length).toString(),
      'X-RateLimit-Reset': Math.ceil((now + rateLimit.windowMs) / 1000).toString()
    }
  }
}

/**
 * Handle API route protection
 */
function handleApiRoute(request, response) {
  const pathname = request.nextUrl.pathname

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200 })
  }

  // API routes that require authentication
  if (pathname.startsWith('/api/factory/') || pathname.startsWith('/api/admin/')) {
    // Authentication will be handled in the API route itself
    // This middleware just adds security headers
    return response
  }

  return response
}

/**
 * Handle protected page routes
 */
async function handleProtectedRoute(request, response) {
  try {
    const supabase = createMiddlewareClient({ req: request, res: response })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      // Redirect to login
      const url = request.nextUrl.clone()
      url.pathname = '/auth/signin'
      url.searchParams.set('redirectTo', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, is_active, factory_id')
      .eq('user_id', session.user.id)
      .single()

    if (!profile || !profile.is_active) {
      // Redirect to unauthorized page
      const url = request.nextUrl.clone()
      url.pathname = '/auth/unauthorized'
      return NextResponse.redirect(url)
    }

    const pathname = request.nextUrl.pathname

    // Check role-based access
    if (PROTECTED_ROUTES.ADMIN.test(pathname)) {
      if (profile.role !== 'admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/auth/unauthorized'
        return NextResponse.redirect(url)
      }
    }

    if (PROTECTED_ROUTES.FACTORY.test(pathname)) {
      if (!['factory_manager', 'factory_operator', 'admin'].includes(profile.role)) {
        const url = request.nextUrl.clone()
        url.pathname = '/auth/unauthorized'
        return NextResponse.redirect(url)
      }
    }

    // Add user context to request headers for downstream use
    response.headers.set('x-user-id', session.user.id)
    response.headers.set('x-user-role', profile.role)
    if (profile.factory_id) {
      response.headers.set('x-factory-id', profile.factory_id)
    }

    return response
  } catch (error) {
    console.error('Middleware auth error:', error)
    
    // Redirect to login on error
    const url = request.nextUrl.clone()
    url.pathname = '/auth/signin'
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
}

/**
 * Check if route is protected
 */
function isProtectedRoute(pathname) {
  return Object.values(PROTECTED_ROUTES).some(pattern => pattern.test(pathname))
}

/**
 * Get client IP address
 */
function getClientIP(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()
  
  return request.ip || 'unknown'
}

/**
 * Cleanup old rate limit entries
 */
function cleanupRateLimitStore() {
  const now = Date.now()
  const maxAge = 24 * 60 * 60 * 1000 // 24 hours
  
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.windowStart > maxAge) {
      rateLimitStore.delete(key)
    }
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}