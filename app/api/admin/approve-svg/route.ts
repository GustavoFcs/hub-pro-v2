import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// UUID v4 pattern — used to distinguish real DB IDs from review-time random IDs
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  const { questionId, svgContent, cropImagePath, description, pageNumber } =
    await req.json() as {
      questionId?: string
      svgContent?: string
      cropImagePath?: string
      description?: string
      pageNumber?: number
    }

  if (!questionId || !svgContent) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios ausentes' }, { status: 400 })
  }

  // Validação mínima do SVG
  if (!svgContent.startsWith('<svg') || !svgContent.includes('</svg>')) {
    return NextResponse.json({ error: 'SVG inválido' }, { status: 400 })
  }

  // Se o questionId não é um UUID real (e.g., review mode com ID temporário),
  // apenas confirmar o recebimento — confirm-import cuidará da persistência.
  if (!UUID_REGEX.test(questionId)) {
    console.log(`[ApproveSVG] Q${questionId}: ID temporário — persistência via confirm-import`)
    return NextResponse.json({ success: true })
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('questoes')
    .update({
      imagem_tipo:      'reconstruida',
      imagem_svg:       svgContent,
      imagem_url:       null,
      crop_image_path:  cropImagePath ?? null,
      updated_at:       new Date().toISOString(),
    })
    .eq('id', questionId)

  if (error) {
    console.error('[ApproveSVG]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`[ApproveSVG] Q${questionId}: SVG aprovado e salvo`)
  return NextResponse.json({ success: true })
}
