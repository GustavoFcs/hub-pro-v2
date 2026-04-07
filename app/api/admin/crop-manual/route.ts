import { NextRequest, NextResponse } from 'next/server'
import { pdfSessionStore } from '@/lib/pdfSessionStore'
import { renderPageAsPng, cropFigureFromPage } from '@/lib/pdf/cropFigure'
import { uploadQuestionImage } from '@/lib/storage/uploadQuestionImage'
import type { CropBox } from '@/lib/ai/locateFigure'

export async function POST(req: NextRequest) {
  const { sessionId, pageNumber, cropBox, questionNumber } = await req.json()

  if (!sessionId || !pageNumber || !cropBox) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios ausentes' }, { status: 400 })
  }

  const pdfBuffer = pdfSessionStore.get(sessionId)
  if (!pdfBuffer) {
    return NextResponse.json({ error: 'Sessão não encontrada ou expirada' }, { status: 404 })
  }

  try {
    const pageBuffer = await renderPageAsPng(pdfBuffer, pageNumber, 2.0)
    const croppedBuffer = await cropFigureFromPage(pageBuffer, cropBox as CropBox, true)

    const fileName = `q${questionNumber}-p${pageNumber}-manual-${Date.now()}.png`
    const imageUrl = await uploadQuestionImage(croppedBuffer, fileName)

    if (!imageUrl) {
      return NextResponse.json({ error: 'Falha no upload' }, { status: 500 })
    }

    console.log(`[CropManual] Q${questionNumber}: ✅ ${imageUrl}`)
    return NextResponse.json({ imageUrl })
  } catch (err: any) {
    console.error('[CropManual]', err?.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
