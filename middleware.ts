import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PROTECTED_PATTERNS = [
  /^\/admin(\/.*)?$/,
  /^\/banco-questoes(\/.*)?$/,
  /^\/minha-lista(\/.*)?$/,
  /^\/dashboard(\/.*)?$/,
  /^\/vocalab(\/.*)?$/,
]

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PATTERNS.some((pattern) => pattern.test(pathname))

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
