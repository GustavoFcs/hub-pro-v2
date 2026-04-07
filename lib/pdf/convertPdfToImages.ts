// Preparação do PDF para envio direto à IA (GPT-4o / Claude)
// Não depende de nenhuma biblioteca nativa (sem pdfjs, canvas, sharp ou poppler).
// GPT-4o (Responses API) e Claude 3.5 Sonnet aceitam PDFs como input nativo.

const MAX_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB

export type PreparedPdf = {
  type: 'base64_pdf'
  base64: string   // PDF em base64 puro (sem prefixo data:)
  sizeKB: number
}

export function preparePdfForAI(pdfBuffer: Buffer): PreparedPdf {
  if (pdfBuffer.byteLength > MAX_SIZE_BYTES) {
    throw new Error('PDF muito grande. Por favor, envie arquivos de até 20MB.')
  }

  return {
    type: 'base64_pdf',
    base64: pdfBuffer.toString('base64'),
    sizeKB: Math.round(pdfBuffer.byteLength / 1024),
  }
}
