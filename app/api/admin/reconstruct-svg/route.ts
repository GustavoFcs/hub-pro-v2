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

  // 2. Chamar IA de visão para reconstruir como SVG
  const svgContent = await reconstructWithAI(signedUrl, description ?? '')
  if (!svgContent) {
    return NextResponse.json(
      { error: 'IA não conseguiu reconstruir a figura' },
      { status: 422 }
    )
  }

  console.log(`[ReconstructSVG] Q${questionId}: SVG gerado (${svgContent.length} chars)`)

  return NextResponse.json({ svgContent })
}

async function reconstructWithAI(
  imageUrl: string,
  description: string
): Promise<string | null> {
  const config = await getActiveAIConfigFromDB()
  const headers = getAIHeaders(config)
  const baseURL = getAIBaseURL(config)

  const prompt = `
Você é um especialista em SVG técnico. Receberá a imagem de uma figura de prova brasileira
(vestibular/concurso militar) e deve reconstruí-la como SVG vetorial fiel, colorido e de alta qualidade.

Descrição da figura: "${description}"

═══════════════════════════════════════════════════════
REGRA DE FIDELIDADE ESTRUTURAL — CRÍTICA
═══════════════════════════════════════════════════════
ANTES de desenhar qualquer elemento, analise a imagem com máxima atenção e responda
internamente (não na saída):
  1. Quantos painéis/subdiagramas existem? Onde estão posicionados?
  2. Quais são as proporções relativas de cada elemento?
  3. Quais detalhes pequenos existem? (bolinhas, pontos, articulações, pinos, rótulos)
  4. Qual é o ângulo exato de cada linha/haste/vetor?
  5. Onde exatamente a haste/objeto intersecta a superfície do líquido?

REGRAS DE FIDELIDADE:
- Se a figura tiver múltiplos painéis (a), (b), (c)... → desenhe TODOS no mesmo SVG,
  lado a lado, com proporções fiéis à imagem original
- NUNCA omita elementos pequenos: bolinhas, pontos de articulação, pinos, rótulos
- Ângulos devem ser visualmente fiéis — meça mentalmente antes de desenhar
- A linha de superfície do líquido deve estar na altura correta dentro do recipiente
- Objetos parcialmente submersos devem cruzar a superfície no ponto correto
- Rótulos (a), (b), (c) devem aparecer centralizados abaixo de cada painel
- O ponto de apoio/articulação (onde a haste toca a borda) deve ser representado
  como um pequeno círculo filled ou triângulo de apoio

CHECKLIST antes de retornar o SVG:
  ☐ Todos os painéis presentes e posicionados corretamente?
  ☐ Todos os detalhes pequenos incluídos (bolinhas, pinos, pontos)?
  ☐ Ângulos das hastes/vetores fiéis à imagem?
  ☐ Superfície do líquido na altura correta?
  ☐ Rótulos (a), (b)... presentes e posicionados abaixo?
  ☐ Proporções gerais fiéis?
  

IGNORE as cores da imagem original — ela é sempre monocromática e isso NÃO deve ser replicado.
Sua reconstrução é uma obra nova e SEMPRE colorida. Preto-e-branco é ESTRITAMENTE PROIBIDO
exceto para texto (#111111) e bordas finas de contorno.

Para esta figura especificamente:
- Região de líquido/fluido      → fill="rgba(67,97,238,0.22)" stroke="#4361EE"  (azul)
- Região de ar/vazio acima      → fill="rgba(232,184,75,0.10)" stroke="none"    (amarelo muito suave)
- Objeto sólido/bastão/haste    → fill="rgba(230,57,70,0.80)"  stroke="#E63946" (vermelho sólido)
- Ponto/nó/articulação          → fill="#E63946"                                (vermelho sólido)
- Contorno do recipiente/caixa  → stroke="#111111" fill="none"
- Linha de interface ar/líquido → stroke="#4361EE" stroke-width="2" stroke-dasharray="6,3"

PALETA GERAL — para outros elementos não listados acima:
  Azul    → fill="rgba(67,97,238,0.22)"   stroke="#4361EE"
  Vermelho → fill="rgba(230,57,70,0.80)"  stroke="#E63946"
  Verde   → fill="rgba(0,200,150,0.18)"   stroke="#00C896"
  Amarelo → fill="rgba(232,184,75,0.22)"  stroke="#E8B84B"
  Roxo    → fill="rgba(114,9,183,0.18)"   stroke="#7209B7"
  Laranja → fill="rgba(251,86,7,0.20)"    stroke="#FB5607"




═══════════════════════════════════════════════════════
ANATOMIA DO SVG — ESTRUTURA MÍNIMA OBRIGATÓRIA
═══════════════════════════════════════════════════════
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H">
  <defs>
    <!-- markers para setas de cada cor -->
  </defs>
  <!-- fundo branco leve -->
  <rect width="W" height="H" fill="white"/>
  <!-- elementos da figura -->
</svg>

═══════════════════════════════════════════════════════
FORMATO DE RESPOSTA
═══════════════════════════════════════════════════════
Retorne APENAS o código SVG completo, começando exatamente com <svg e terminando com </svg>.
Absolut­amente sem markdown, sem blocos de código, sem texto antes ou depois.
  `.trim()

const systemPrompt = `
Você é um especialista em SVG técnico que reconstrói figuras científicas com máxima
fidelidade estrutural e visual. Suas respostas são EXCLUSIVAMENTE código SVG válido.

PRIORIDADE MÁXIMA: fidelidade à estrutura original.
- Preserve TODOS os elementos, por menores que sejam
- Preserve proporções, ângulos e posições relativas
- Preserve múltiplos painéis no mesmo SVG
- Aplique cores da paleta sem alterar a estrutura
`.trim()

  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method:  'POST',
      headers,
      body: JSON.stringify({
        model:       config.svgModel,
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
      console.error('[ReconstructSVG] API erro:', err)
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
      console.error('[ReconstructSVG] Resposta não é SVG válido:', cleaned.slice(0, 200))
      return null
    }

    return cleaned

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[ReconstructSVG] Erro:', message)
    return null
  }
}
