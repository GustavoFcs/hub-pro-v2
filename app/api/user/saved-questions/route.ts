import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data } = await supabase
    .from('questoes_salvas')
    .select('questao_id')
    .eq('user_id', user.id)

  const ids = (data ?? []).map(r => r.questao_id)
  return NextResponse.json({ ids })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { questionId } = await req.json() as { questionId?: string }
  if (!questionId) return NextResponse.json({ error: 'questionId obrigatório' }, { status: 400 })

  const { error } = await supabase
    .from('questoes_salvas')
    .insert({ user_id: user.id, questao_id: questionId })

  if (error && error.code !== '23505') { // ignore unique violation
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ saved: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { questionId } = await req.json() as { questionId?: string }
  if (!questionId) return NextResponse.json({ error: 'questionId obrigatório' }, { status: 400 })

  await supabase
    .from('questoes_salvas')
    .delete()
    .eq('user_id', user.id)
    .eq('questao_id', questionId)

  return NextResponse.json({ saved: false })
}
