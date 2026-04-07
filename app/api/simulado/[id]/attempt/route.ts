import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — carregar tentativa ativa com respostas
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: attempt } = await supabase
    .from('simulado_attempts')
    .select(`
      id, status, started_at, finished_at,
      simulado_responses(id, questao_id, resposta, pulada, correta, answered_at)
    `)
    .eq('simulado_id', id)
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json(attempt ?? null)
}

// POST — iniciar ou retomar tentativa
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Verificar tentativa em andamento
  const { data: existing } = await supabase
    .from('simulado_attempts')
    .select('id, status, started_at, finished_at')
    .eq('simulado_id', id)
    .eq('user_id', user.id)
    .eq('status', 'in_progress')
    .single()

  if (existing) return NextResponse.json(existing)

  // Criar nova tentativa
  const { data: attempt, error } = await supabase
    .from('simulado_attempts')
    .insert({ simulado_id: id, user_id: user.id, status: 'in_progress' })
    .select('id, status, started_at, finished_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(attempt)
}

// PATCH — finalizar tentativa
export async function PATCH(
  req: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  const { attemptId } = await req.json()
  if (!attemptId) return NextResponse.json({ error: 'attemptId obrigatório' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { error } = await supabase
    .from('simulado_attempts')
    .update({ status: 'finished', finished_at: new Date().toISOString() })
    .eq('id', attemptId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
