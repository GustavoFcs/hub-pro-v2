// GET /api/admin/ai-status
// Retorna a configuração de IA atual (sem expor chaves secretas).

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveAIConfig } from '@/lib/ai/config'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const config = getActiveAIConfig()

  const hasKey = (key: string | undefined) => Boolean(key && key.length > 8)

  return NextResponse.json({
    provider: config.provider,
    extractModel: config.model,
    visionModel: config.visionModel,
    keys: {
      openrouter: hasKey(process.env.OPENROUTER_API_KEY),
      openai: hasKey(process.env.OPENAI_API_KEY),
      anthropic: hasKey(process.env.ANTHROPIC_API_KEY),
      gemini: hasKey(process.env.GOOGLE_AI_API_KEY),
    },
  })
}
