import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — buscar simulado com questões completas (sem gabarito)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: simulado } = await supabase
    .from('simulados')
    .select('id, titulo, status, description, created_at, updated_at, folder_id')
    .eq('id', id)
    .single()

  if (!simulado) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  // Questões ordenadas
  const { data: sqRows } = await supabase
    .from('simulado_questoes')
    .select('ordem, questao_id')
    .eq('simulado_id', id)
    .order('ordem')

  const questaoIds = (sqRows ?? []).map(r => r.questao_id)

  if (questaoIds.length === 0) {
    return NextResponse.json({ ...simulado, questions: [] })
  }

  // Buscar questões (gabarito incluído — revelado na view do simulado)
  const { data: questoes } = await supabase
    .from('questoes')
    .select(`
      id, enunciado, dificuldade, ano, gabarito, anulada, imagem_url, imagem_tipo, imagem_svg, frentes,
      materia:materias(nome),
      subtopico:subtopicos(nome),
      instituicao:instituicoes(sigla, nome),
      alternativas(id, letra, texto, ordem),
      videos:videos_yt(youtube_url, titulo)
    `)
    .in('id', questaoIds)

  // Ordenar conforme ordem no simulado
  const questoesOrdenadas = (sqRows ?? [])
    .map(row => (questoes as { id: string }[] | null)?.find(q => q.id === row.questao_id))
    .filter(Boolean)

  return NextResponse.json({ ...simulado, questions: questoesOrdenadas })
}

// PATCH — atualizar simulado (título, pasta, status)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.titulo !== undefined) updates.titulo = body.titulo
  if (body.folderId !== undefined) updates.folder_id = body.folderId
  if (body.status !== undefined) updates.status = body.status

  const { error } = await supabase
    .from('simulados')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE — excluir simulado
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { error } = await supabase
    .from('simulados')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
