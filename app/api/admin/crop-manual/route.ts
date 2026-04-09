import { NextRequest, NextResponse } from 'next/server'
import { pdfSessionStore, pdfPageCache } from '@/lib/pdfSessionStore'
import { renderPageAsPng, cropFigureFromPage } from '@/lib/pdf/cropFigure'
import { uploadCropPrivate } from '@/lib/storage/uploadCropPrivate'
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
    // Use cached page PNG if available — guarantees pixel-identical coordinates
    // with what render-page returned to the canvas (critical for scanned PDFs)
    const cacheKey = `${sessionId}:${pageNumber}`
    const pageBuffer = pdfPageCache.get(cacheKey)
      ?? await renderPageAsPng(pdfBuffer, pageNumber, 2.0)

    const croppedBuffer = await cropFigureFromPage(pageBuffer, cropBox as CropBox, true)

    const fileName = `q${questionNumber}-p${pageNumber}-manual-${Date.now()}.png`
    const cropPath = await uploadCropPrivate(croppedBuffer, fileName)

    if (!cropPath) {
      return NextResponse.json({ error: 'Falha no upload' }, { status: 500 })
    }

    console.log(`[CropManual] Q${questionNumber}: ✅ ${cropPath}`)
    return NextResponse.json({ cropPath, reconstructed: false })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[CropManual]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
