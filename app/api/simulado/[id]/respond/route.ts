import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST — registrar resposta (ou pular) e retornar resultado
export async function POST(
  req: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  const { attemptId, questaoId, resposta, pulada } = await req.json()

  if (!attemptId || !questaoId) {
    return NextResponse.json({ error: 'attemptId e questaoId obrigatórios' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Verificar que a tentativa pertence ao usuário
  const { data: attempt } = await supabase
    .from('simulado_attempts')
    .select('id')
    .eq('id', attemptId)
    .eq('user_id', user.id)
    .single()

  if (!attempt) {
    return NextResponse.json({ error: 'Tentativa inválida' }, { status: 403 })
  }

  let correta: boolean | null = null
  let gabarito: string | null = null

  if (!pulada) {
    // Buscar gabarito server-side
    const { data: questao } = await supabase
      .from('questoes')
      .select('gabarito')
      .eq('id', questaoId)
      .single()

    gabarito = questao?.gabarito ?? null
    correta = resposta?.toLowerCase() === gabarito?.toLowerCase()
  }

  const { error } = await supabase
    .from('simulado_responses')
    .upsert(
      {
        attempt_id: attemptId,
        questao_id: questaoId,
        resposta:   pulada ? null : resposta,
        pulada:     pulada ?? false,
        correta,
        answered_at: new Date().toISOString(),
      },
      { onConflict: 'attempt_id,questao_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Retornar gabarito apenas após resposta (não pre-load)
  return NextResponse.json({ correta, gabarito })
}
