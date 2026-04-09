import { NextRequest, NextResponse } from 'next/server'
import { getCropSignedUrl } from '@/lib/storage/uploadCropPrivate'
import { getActiveAIConfigFromDB, getAIHeaders, getAIBaseURL } from '@/lib/ai/config'

export async function POST(req: NextRequest) {
  const { questionId, cropImagePath, description } = await req.json() as {
    questionId?: string
    cropImagePath?: string
    description?: string
  }

  if (!questionId || !cropImagePath) {
    return NextResponse.json(
      { error: 'questionId e cropImagePath obrigatórios' },
      { status: 400 }
    )
  }

  console.log(`[ReconstructSVG] Q${questionId} | path: ${cropImagePath}`)

  // 1. Gerar URL temporária da imagem privada (300s — tempo suficiente para a IA buscar)
  const signedUrl = await getCropSignedUrl(cropImagePath, 300)
  if (!signedUrl) {
    return NextResponse.json(
      { error: 'Não foi possível acessar a imagem' },
      { status: 500 }
    )
  }

  // 2. Cascata de modelos — tentar até obter SVG válido
  const config = await getActiveAIConfigFromDB()

  const SVG_MODEL_CASCADE = [
    config.svgModel,
    'google/gemini-2.5-flash',
    'openai/gpt-4o',
  ]
  const modelsToTry = [...new Set(SVG_MODEL_CASCADE)]

  let svgContent: string | null = null

  for (const model of modelsToTry) {
    console.log(`[ReconstructSVG] Q${questionId} | tentando: ${model}`)
    svgContent = await reconstructWithModel(signedUrl, description ?? '', model)

    if (svgContent && isValidSVG(svgContent)) {
      console.log(`[ReconstructSVG] ✅ sucesso com ${model}`)
      break
    }

    console.warn(`[ReconstructSVG] ❌ ${model} falhou, tentando próximo...`)
    svgContent = null
  }

  if (!svgContent) {
    return NextResponse.json(
      { error: 'Todos os modelos falharam na reconstrução' },
      { status: 422 }
    )
  }

  console.log(`[ReconstructSVG] Q${questionId}: SVG gerado (${svgContent.length} chars)`)

  return NextResponse.json({ svgContent })
}

function isValidSVG(svg: string): boolean {
  if (!svg.startsWith('<svg'))    return false
  if (!svg.includes('</svg>'))   return false
  if (!svg.includes('viewBox'))  return false
  if (svg.length < 800)          return false

  const hasVisualElements = (
    svg.includes('<path')    ||
    svg.includes('<line')    ||
    svg.includes('<rect')    ||
    svg.includes('<circle')  ||
    svg.includes('<polygon') ||
    svg.includes('<polyline')
  )

  return hasVisualElements
}

async function reconstructWithModel(
  imageUrl: string,
  description: string,
  model: string
): Promise<string | null> {
  const config = await getActiveAIConfigFromDB()
  const headers = getAIHeaders(config)
  const baseURL = getAIBaseURL(config)

  const prompt = `
Você é um especialista em SVG técnico. Receberá a imagem de uma figura de prova
brasileira (vestibular/concurso militar) e deve reconstruí-la como SVG vetorial.

Descrição fornecida: "${description}"

═══════════════════════════════════════════════════
PRIORIDADE MÁXIMA — FIDELIDADE ESTRUTURAL
═══════════════════════════════════════════════════
Antes de escrever qualquer código, analise a imagem e responda internamente:
  1. Quantos painéis/subdiagramas existem? (a), (b), (c)?
  2. Qual é o tamanho e proporção de cada elemento?
  3. Quais detalhes pequenos existem? (bolinhas, pontos, pinos, hachuras, setas)
  4. Qual é o ângulo EXATO de cada linha, haste ou vetor?
  5. Onde exatamente elementos se tocam, cruzam ou se conectam?
  6. Qual é a altura da superfície do líquido (se houver)?

REGRAS ESTRUTURAIS INVIOLÁVEIS:
- Múltiplos painéis (a)(b)(c) → TODOS no mesmo SVG, lado a lado, proporcionais
- Ângulos devem ser visualmente idênticos à imagem — meça antes de desenhar
- Conexões entre elementos devem ser exatas — sem lacunas nem sobreposições erradas
- Objetos parcialmente submersos devem cruzar a superfície no ponto correto
- Bolinhas, pontos de articulação e pequenos detalhes são OBRIGATÓRIOS
- Rótulos (a), (b), (c) centralizados abaixo de cada painel
- NÃO invente elementos que não existem na imagem
- NÃO omita elementos que existem na imagem

═══════════════════════════════════════════════════
CORES — APLICAR APÓS FIDELIDADE ESTRUTURAL
═══════════════════════════════════════════════════
Após garantir fidelidade estrutural, aplique cores suaves:

  Líquido/fluido/água  → fill="rgba(67,97,238,0.18)"  stroke="#4361EE"
  Objeto sólido/haste  → fill="rgba(230,57,70,0.85)"  stroke="#C1121F"
  Ponto/bolinha/nó     → fill="#E63946"
  Região de ar/vazio   → fill="rgba(255,255,255,0.0)" (transparente)
  Recipiente/caixa     → stroke="#111111" fill="none" stroke-width="2"
  Interface líquido    → stroke="#4361EE" stroke-width="1.5" stroke-dasharray="6,3"
  Eixo x               → stroke="#4361EE" stroke-width="2"
  Eixo y               → stroke="#4361EE" stroke-width="2"
  Vetor de força       → stroke="#E63946" stroke-width="2.5"
  Área sombreada       → fill="rgba(0,200,150,0.18)" stroke="#00C896"
  Região marcada       → fill="rgba(232,184,75,0.20)" stroke="#E8B84B"

SE a imagem for monocromática: aplique as cores acima semanticamente.
SE a imagem já tiver cores: replique-as fielmente, ajustando apenas a opacidade.

═══════════════════════════════════════════════════
REGRAS TÉCNICAS
═══════════════════════════════════════════════════
- viewBox: proporcional à imagem original (analise as dimensões antes de definir)
- Texto: font-family="Georgia, serif" font-size="13" fill="#111111"
- Rótulos de elementos coloridos: mesma cor do elemento, font-size="12"
- Setas: <defs> com <marker> para cada cor — arrowhead preenchido
- stroke-width: 2px elementos principais, 1.5px bordas, 1px auxiliares
- Linhas auxiliares: stroke="#AAAAAA" stroke-dasharray="4,4" opacity="0.6"
- Fundo: <rect width="W" height="H" fill="white"/>
- NÃO use <image>, <foreignObject>, @font-face ou JavaScript

═══════════════════════════════════════════════════
CHECKLIST OBRIGATÓRIO — verificar antes de retornar
═══════════════════════════════════════════════════
☐ Todos os painéis (a)(b)(c) presentes e lado a lado?
☐ Todos os detalhes pequenos incluídos (bolinhas, pinos, pontos)?
☐ Ângulos das hastes/vetores fiéis à imagem?
☐ Conexões entre elementos sem lacunas?
☐ Superfície do líquido na altura correta?
☐ Rótulos (a)(b)(c) presentes e posicionados abaixo?
☐ Cores aplicadas em todos os elementos?
☐ SVG começa com <svg e termina com </svg>?

═══════════════════════════════════════════════════
FORMATO DE RESPOSTA
═══════════════════════════════════════════════════
Retorne APENAS o código SVG completo.
Comece exatamente com <svg e termine com </svg>.
Sem markdown, sem blocos de código, sem texto antes ou depois.
`.trim()

  const systemPrompt = `Você reconstrói figuras científicas de provas brasileiras como SVG vetorial.
Sua prioridade é FIDELIDADE ESTRUTURAL — ângulos, proporções, conexões e detalhes exatos.
Cores são secundárias à estrutura. Sua resposta é EXCLUSIVAMENTE código SVG válido.
Você NUNCA omite elementos visíveis na imagem. Você NUNCA inventa elementos inexistentes.`.trim()

  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method:  'POST',
      headers,
      body: JSON.stringify({
        model,
        max_tokens:  8192,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type:      'image_url',
                image_url: { url: imageUrl, detail: 'high' },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[ReconstructSVG] API erro (${model}):`, err)
      return null
    }

    const json  = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
    const raw   = json.choices?.[0]?.message?.content?.trim() ?? ''

    // Limpar markdown wrappers e validar SVG
    const cleaned = raw
      .replace(/```svg\n?/g, '')
      .replace(/```xml\n?/g, '')
      .replace(/```\n?/g,    '')
      .trim()

    if (!cleaned.startsWith('<svg') || !cleaned.includes('</svg>')) {
      console.error(`[ReconstructSVG] Resposta não é SVG válido (${model}):`, cleaned.slice(0, 200))
      return null
    }

    return cleaned

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error(`[ReconstructSVG] Erro (${model}):`, message)
    return null
  }
}
