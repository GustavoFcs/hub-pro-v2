
// POST /api/admin/scan-gabarito
// Recebe o PDF do gabarito, usa IA para extrair respostas por número de questão.
// Retorna { answers: { number: N, answer: 'a'|'b'|'c'|'d'|'e'|'anulada' }[] }

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { preparePdf } from '@/lib/pdf/preparePdf'
import { scanGabaritoFromPdf } from '@/lib/ai/client'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────
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

  // ── Parse form ─────────────────────────────────────────────
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 })
  }

  const file = formData.get('gabarito') as File | null
  if (!file || (!file.name.endsWith('.pdf') && file.type !== 'application/pdf')) {
    return NextResponse.json({ error: 'PDF do gabarito obrigatório' }, { status: 400 })
  }

  // ── Preparar + escanear ────────────────────────────────────
  const pdfBuffer = Buffer.from(await file.arrayBuffer())
  let prepared
  try {
    prepared = await preparePdf(pdfBuffer)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao preparar PDF' },
      { status: 422 }
    )
  }

  const answers = await scanGabaritoFromPdf(prepared)

  return NextResponse.json({ answers })
}
