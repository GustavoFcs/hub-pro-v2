// GET /api/admin/process-status/[provaId]
// Retorna o status de uma prova específica

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ provaId: string }> }
) {
  const { provaId } = await params

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  if (!provaId) {
    return NextResponse.json({ error: 'provaId inválido' }, { status: 400 })
  }

  const { data: prova, error } = await supabase
    .from('provas')
    .select('id, titulo, status, created_at, updated_at')
    .eq('id', provaId)
    .single()

  if (error || !prova) {
    return NextResponse.json({ error: 'Prova não encontrada' }, { status: 404 })
  }

  // Contar questões já importadas
  const { count } = await supabase
    .from('questoes')
    .select('id', { count: 'exact', head: true })
    .eq('prova_id', provaId)

  return NextResponse.json({
    id: prova.id,
    titulo: prova.titulo,
    status: prova.status,
    questoesImportadas: count ?? 0,
    createdAt: prova.created_at,
    updatedAt: prova.updated_at,
  })
}
