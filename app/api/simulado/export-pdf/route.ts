import { NextRequest, NextResponse } from 'next/server'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import { existsSync } from 'fs'

export const maxDuration = 60 // Vercel timeout

/** Finds the local Chrome/Chromium binary for dev use. */
function getLocalChromePath(): string | undefined {
  const candidates: string[] = []

  if (process.platform === 'win32') {
    const lad = process.env.LOCALAPPDATA ?? ''
    const pf  = process.env.PROGRAMFILES ?? 'C:\\Program Files'
    const pf86 = process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)'
    candidates.push(
      `${pf}\\Google\\Chrome\\Application\\chrome.exe`,
      `${pf86}\\Google\\Chrome\\Application\\chrome.exe`,
      `${lad}\\Google\\Chrome\\Application\\chrome.exe`,
      `${pf}\\Chromium\\Application\\chrome.exe`,
    )
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    )
  } else {
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    )
  }

  return candidates.find(p => existsSync(p))
}

export async function POST(req: NextRequest) {
  const { simulado, includeGabarito } = await req.json()

  if (!simulado?.questions?.length) {
    return NextResponse.json({ error: 'Simulado vazio' }, { status: 400 })
  }

  console.log(`[ExportPDF] Gerando PDF: ${simulado.questions.length} questões | gabarito: ${includeGabarito}`)

  const html = buildSimuladoHTML(simulado, includeGabarito)

  const isDev = process.env.NODE_ENV !== 'production'
  const localPath = isDev ? getLocalChromePath() : undefined

  if (isDev && !localPath) {
    return NextResponse.json(
      { error: 'Chrome não encontrado. Instale o Google Chrome ou defina CHROME_PATH no .env.local.' },
      { status: 500 },
    )
  }

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined
  try {
    browser = await puppeteer.launch({
      args: isDev ? ['--no-sandbox', '--disable-setuid-sandbox'] : chromium.args,
      defaultViewport: { width: 1280, height: 800 },
      executablePath: isDev ? localPath! : await chromium.executablePath(),
      headless: true,
    })

    const page = await browser.newPage()

    // Allow loading images from external origins (Supabase storage)
    await page.setExtraHTTPHeaders({ 'Accept': 'text/html,application/xhtml+xml,*/*' })

    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 })

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' },
    })

    console.log(`[ExportPDF] PDF gerado: ${Math.round(pdf.length / 1024)}KB`)

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${(simulado.title ?? 'simulado').replace(/[^a-zA-Z0-9_\-\s]/g, '')}.pdf"`,
      },
    })
  } finally {
    await browser?.close()
  }
}

function buildSimuladoHTML(simulado: {
  title?: string
  questions: Array<{
    questionNumber?: number
    statement?: string
    alternatives?: Array<{ letra: string; texto: string }>
    answer?: string
    anulada?: boolean
    subject?: string
    difficulty?: string
    year?: number
    institution?: string
    visualElement?: { type?: string; imageUrl?: string | null; description?: string } | null
  }>
}, includeGabarito: boolean): string {
  const questionsHTML = simulado.questions.map((q, idx) => `
    <div class="question">
      <div class="question-header">
        <span class="question-number">Questão ${idx + 1}</span>
        <div class="tags">
          ${q.anulada ? '<span class="tag anulada">ANULADA</span>' : ''}
          ${q.institution ? `<span class="tag">${escapeHtml(q.institution.toUpperCase())}</span>` : ''}
          ${q.year        ? `<span class="tag">${q.year}</span>` : ''}
          ${q.subject     ? `<span class="tag subject">${escapeHtml(q.subject)}</span>` : ''}
        </div>
      </div>
      <p class="statement">${q.statement ?? ''}</p>
      ${q.visualElement?.imageUrl && q.visualElement.imageUrl !== 'skipped'
        ? `<img src="${escapeHtml(q.visualElement.imageUrl)}" class="figure" alt="figura" />`
        : ''
      }
      <div class="alternatives">
        ${(q.alternatives ?? []).map(alt => `
          <div class="alternative">
            <span class="letra">${escapeHtml(alt.letra.toUpperCase())})</span>
            <span>${alt.texto}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('')

  const gabaritoHTML = includeGabarito ? `
    <div class="gabarito">
      <h2>Gabarito</h2>
      <div class="gabarito-grid">
        ${simulado.questions.map((q, idx) => `
          <div class="gabarito-item">
            <span class="gabarito-num">${idx + 1}</span>
            <span class="gabarito-ans ${q.anulada ? 'gabarito-anulada' : ''}">${q.anulada ? 'ANULADA' : escapeHtml((q.answer ?? '—').toUpperCase())}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : ''

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" crossorigin="anonymous">
      <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js" crossorigin="anonymous"></script>
      <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" crossorigin="anonymous"
        onload="renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false},{left:'\\\\(',right:'\\\\)',display:false},{left:'\\\\[',right:'\\\\]',display:true}],throwOnError:false})">
      </script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; }

        .header { text-align: center; margin-bottom: 2em; padding-bottom: 1em; border-bottom: 2px solid #000; }
        .header h1 { font-size: 18pt; font-weight: bold; }
        .header p  { font-size: 10pt; color: #555; margin-top: 4px; }

        .question { margin-bottom: 2em; page-break-inside: avoid; }
        .question-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
        .question-number { font-weight: bold; font-size: 11pt; }
        .tags { display: flex; gap: 6px; }
        .tag { font-size: 8pt; padding: 2px 6px; border: 1px solid #ccc; border-radius: 3px; }
        .tag.subject { border-color: #666; font-weight: bold; }
        .tag.anulada { border-color: #c00; color: #c00; font-weight: bold; background: #fff0f0; }

        .statement { margin-bottom: 10px; line-height: 1.6; text-align: justify; }
        .figure { max-width: 70%; display: block; margin: 12px auto; page-break-inside: avoid; }
        img { max-width: 100%; height: auto; }

        .alternatives { display: flex; flex-direction: column; gap: 4px; }
        .alternative { display: flex; gap: 8px; }
        .letra { font-weight: bold; min-width: 20px; }

        .gabarito { margin-top: 3em; padding-top: 2em; border-top: 2px solid #000; page-break-before: always; }
        .gabarito h2 { font-size: 14pt; margin-bottom: 1em; }
        .gabarito-grid { display: flex; flex-wrap: wrap; gap: 8px; }
        .gabarito-item { display: flex; gap: 4px; font-size: 11pt; min-width: 60px; }
        .gabarito-num { font-weight: bold; }
        .gabarito-ans { color: #333; }
        .gabarito-anulada { color: #c00; font-weight: bold; font-size: 8pt; }

        .watermark {
          position: fixed;
          top: 0; left: 0;
          width: 100%; height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          pointer-events: none;
          z-index: 0;
          transform: rotate(-45deg);
          font-size: 22pt;
          font-weight: bold;
          font-family: Arial, sans-serif;
          color: rgba(0,0,0,0.045);
          letter-spacing: 0.15em;
          line-height: 2.8;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          user-select: none;
        }

        /* Ensure content renders above watermark */
        .header, .question, .gabarito { position: relative; z-index: 1; }
      </style>
    </head>
    <body>
      <div class="watermark" aria-hidden="true">
        DERELICTQB DERELICTQB DERELICTQB DERELICTQB DERELICTQB<br/>
        DERELICTQB DERELICTQB DERELICTQB DERELICTQB DERELICTQB<br/>
        DERELICTQB DERELICTQB DERELICTQB DERELICTQB DERELICTQB<br/>
        DERELICTQB DERELICTQB DERELICTQB DERELICTQB DERELICTQB<br/>
        DERELICTQB DERELICTQB DERELICTQB DERELICTQB DERELICTQB<br/>
        DERELICTQB DERELICTQB DERELICTQB DERELICTQB DERELICTQB<br/>
        DERELICTQB DERELICTQB DERELICTQB DERELICTQB DERELICTQB<br/>
        DERELICTQB DERELICTQB DERELICTQB DERELICTQB DERELICTQB<br/>
        DERELICTQB DERELICTQB DERELICTQB DERELICTQB DERELICTQB<br/>
      </div>
      <div class="header">
        <h1>${escapeHtml(simulado.title ?? 'Simulado')}</h1>
        <p>${simulado.questions.length} questões</p>
      </div>
      ${questionsHTML}
      ${gabaritoHTML}
    </body>
    </html>
  `
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
