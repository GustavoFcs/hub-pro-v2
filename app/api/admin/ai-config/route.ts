// GET  /api/admin/ai-config  — retorna configuração atual (DB > env)
// POST /api/admin/ai-config  — salva nova configuração no banco e invalida cache

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getActiveAIConfigFromDB, invalidateAIConfigCache } from '@/lib/ai/config'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const config = await getActiveAIConfigFromDB()
  return NextResponse.json(config)
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const allowed = ['provider', 'textModel', 'visionModel', 'svgModel', 'extractAsText']
  const value: Record<string, string> = {}
  for (const k of allowed) {
    if (body[k] !== undefined) value[k] = String(body[k])
  }

  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { error } = await sb
    .from('admin_config')
    .upsert({ key: 'ai_models', value, updated_at: new Date().toISOString() })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  invalidateAIConfigCache()
  return NextResponse.json({ success: true })
}
