// Extrai o texto de todas as páginas de um PDF via pdfjs-dist.
// Usado pelo modelo de extração de texto (ex: gpt-4o-mini, gpt-5.4-nano)
// quando AI_EXTRACT_AS_TEXT=true no .env.local.

export type PdfPageText = {
  pageNumber: number
  text: string
}

export async function extractTextFromPdf(pdfBuffer: Buffer): Promise<PdfPageText[]> {
  // Import dinâmico para compatibilidade com Next.js (evita problemas de SSR)
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) })
  const pdfDoc = await loadingTask.promise

  const pages: PdfPageText[] = []

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum)
    const textContent = await page.getTextContent()

    const lines: string[] = []
    let lastY: number | null = null

    for (const item of textContent.items) {
      if (!('str' in item)) continue
      const str = item.str.trim()
      if (!str) continue

      // Inserir quebra de linha quando o Y muda significativamente
      const y = (item as any).transform?.[5] ?? null
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
        lines.push('\n')
      }
      lines.push(str)
      lastY = y
    }

    pages.push({ pageNumber: pageNum, text: lines.join(' ').replace(/ \n /g, '\n').trim() })
  }

  console.log(`[PDF Text] Extraídas ${pages.length} páginas | total chars: ${pages.reduce((s, p) => s + p.text.length, 0)}`)
  return pages
}
