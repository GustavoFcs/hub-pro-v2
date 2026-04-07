import { Buffer } from 'buffer'

export interface PreparedPdf {
  type: 'pdf'
  base64: string
  sizeKB: number
  mimeType: 'application/pdf'
}

export async function preparePdf(pdfBuffer: Buffer): Promise<PreparedPdf> {
  const sizeKB = Math.round(pdfBuffer.length / 1024)

  if (sizeKB > 20480) {
    throw new Error('PDF muito grande. Envie arquivos de até 20MB.')
  }

  const base64 = pdfBuffer.toString('base64')
  console.log(`[PDF] Preparado: ${sizeKB} KB | Enviando direto para IA`)

  return { type: 'pdf', base64, sizeKB, mimeType: 'application/pdf' }
}