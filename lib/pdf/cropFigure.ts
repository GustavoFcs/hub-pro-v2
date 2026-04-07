// Renderiza uma página de PDF como PNG e recorta a bounding box especificada.
// Usa pdf-to-img (que internamente usa pdfjs-dist/legacy) + sharp.

import sharp from 'sharp'
import type { CropBox } from '@/lib/ai/locateFigure'

// Renderiza a página pageNumber (1-based) como PNG e retorna o Buffer
export async function renderPageAsPng(
  pdfBuffer: Buffer,
  pageNumber: number,
  scale = 2.0
): Promise<Buffer> {
  // pdf-to-img usa import() dinâmico para evitar problemas com Next.js
  const { pdf } = await import('pdf-to-img')

  let pageIndex = 0
  for await (const page of await pdf(pdfBuffer, { scale })) {
    pageIndex++
    if (pageIndex === pageNumber) {
      return page as unknown as Buffer
    }
  }

  throw new Error(`[cropFigure] Página ${pageNumber} não encontrada no PDF (total: ${pageIndex})`)
}

// Recorta a região especificada pela CropBox de um PNG
export async function cropFigureFromPage(
  pageImageBuffer: Buffer,
  cropBox: CropBox,
  skipBlankCheck = false
): Promise<Buffer> {
  const metadata = await sharp(pageImageBuffer).metadata()
  const imgW = metadata.width ?? 0
  const imgH = metadata.height ?? 0

  if (!imgW || !imgH) {
    throw new Error('[cropFigure] Não foi possível obter dimensões da imagem')
  }

  // Converter percentuais em pixels (margem mínima de 0.2%)
  const margin = 0.005
  const xPct = Math.max(0, cropBox.xPct / 100 - margin)
  const yPct = Math.max(0, cropBox.yPct / 100 - margin)
  const wPct = Math.min(1, cropBox.wPct / 100 + margin * 2)
  const hPct = Math.min(1, cropBox.hPct / 100 + margin * 2)

  const left = Math.round(xPct * imgW)
  const top  = Math.round(yPct * imgH)
  const width  = Math.min(imgW - left, Math.round(wPct * imgW))
  const height = Math.min(imgH - top,  Math.round(hPct * imgH))

  if (width <= 0 || height <= 0) {
    throw new Error(`[cropFigure] Região inválida: ${width}x${height} @ (${left},${top})`)
  }

  console.log(
    `[cropFigure] Imagem ${imgW}x${imgH} → crop (${left},${top}) ${width}x${height}`
  )

  const cropped = await sharp(pageImageBuffer)
    .extract({ left, top, width, height })
    .png()
    .toBuffer()

  // Reject near-blank images (avg brightness > 250 across all channels)
  // Skipped for manual crops — the user explicitly chose the region
  if (!skipBlankCheck) {
    const stats = await sharp(cropped).stats()
    const avgBrightness = stats.channels.reduce((sum, c) => sum + c.mean, 0) / stats.channels.length
    if (avgBrightness > 250) {
      throw new Error(
        `[cropFigure] Imagem recortada está em branco (brilho médio=${avgBrightness.toFixed(1)}) — coordenadas provavelmente apontam para espaço vazio`
      )
    }
  }

  return cropped
}
