import { NextRequest, NextResponse } from 'next/server'
import { renderPageAsPng } from '@/lib/pdf/cropFigure'
import { pdfSessionStore } from '@/lib/pdfSessionStore'

// export kept for backwards compat — some routes still import from here
export { pdfSessionStore } from '@/lib/pdfSessionStore'

export async function POST(req: NextRequest) {
  const { sessionId, pageNumber } = await req.json()

  if (!sessionId || !pageNumber) {
    return NextResponse.json({ error: 'sessionId e pageNumber obrigatórios' }, { status: 400 })
  }

  const pdfBuffer = pdfSessionStore.get(sessionId)
  if (!pdfBuffer) {
    return NextResponse.json({ error: 'Sessão não encontrada ou expirada' }, { status: 404 })
  }

  try {
    const pageBuffer = await renderPageAsPng(pdfBuffer, pageNumber, 2.0)
    const base64 = pageBuffer.toString('base64')
    return NextResponse.json({ base64, pageNumber })
  } catch (err: any) {
    console.error('[RenderPage]', err?.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
