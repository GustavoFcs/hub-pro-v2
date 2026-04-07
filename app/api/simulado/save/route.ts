import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { title, questionIds, folderId } = await req.json()

  if (!title || !Array.isArray(questionIds) || questionIds.length === 0) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: title, questionIds' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Criar simulado
  const { data: simulado, error } = await supabase
    .from('simulados')
    .insert({ titulo: title, user_id: user.id, status: 'ready', folder_id: folderId ?? null })
    .select()
    .single()

  if (error || !simulado) {
    console.error('[Simulado/Save] insert error:', error)
    return NextResponse.json({ error: error?.message ?? 'Falha ao criar simulado' }, { status: 500 })
  }

  // Inserir questões com ordem
  const rows = (questionIds as string[]).map((qid, idx) => ({
    simulado_id: simulado.id,
    questao_id: qid,
    ordem: idx,
  }))

  const { error: rowsError } = await supabase.from('simulado_questoes').insert(rows)

  if (rowsError) {
    console.error('[Simulado/Save] rows insert error:', rowsError)
    // Limpar simulado órfão
    await supabase.from('simulados').delete().eq('id', simulado.id)
    return NextResponse.json({ error: rowsError.message }, { status: 500 })
  }

  console.log(`[Simulado] Salvo: ${simulado.id} | ${questionIds.length} questões`)
  return NextResponse.json({ simulado })
}
