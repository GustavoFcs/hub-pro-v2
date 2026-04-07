// Configuração de IA via .env.local — sem Supabase, sem cache
// Edite .env.local para trocar modelos sem reiniciar o compilador.
// Veja .env.example para todos os modelos disponíveis.

export interface AIConfig {
  provider: 'openrouter' | 'openai' | 'anthropic' | 'gemini'
  model: string
  visionModel: string
  /** Se true, extrai o texto do PDF localmente (pdfjs) e envia como texto puro.
   *  Use para modelos text-only como gpt-4o-mini, gpt-5.4-nano, etc.
   *  Configure via AI_EXTRACT_AS_TEXT=true no .env.local */
  extractAsText: boolean
}

export function getActiveAIConfig(): AIConfig {
  const provider = (
    process.env.AI_PROVIDER ?? 'openrouter'
  ) as AIConfig['provider']

  const model =
    process.env.AI_EXTRACT_MODEL ?? 'google/gemini-2.0-flash'

  const visionModel =
    process.env.AI_VISION_MODEL ?? 'openai/gpt-4o'

  const extractAsText =
    process.env.AI_EXTRACT_AS_TEXT === 'true'

  console.log(
    `[AI Config] Provider: ${provider} | ` +
    `Extract: ${model} (${extractAsText ? 'text-mode' : 'file-mode'}) | ` +
    `Vision: ${visionModel}`
  )

  return { provider, model, visionModel, extractAsText }
}
