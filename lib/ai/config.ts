// AI config -- three separate models per task.
// Source of truth: admin_config DB table, with .env.local fallback.
// In-memory cache of 60 seconds.

export interface AIConfig {
  provider: 'openrouter' | 'openai'
  textModel: string
  visionModel: string
  svgModel: string
  extractAsText: boolean
}

// -- Helpers ----------------------------------------------------------

export function getAIHeaders(config: AIConfig): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.provider === 'openrouter') {
    headers['Authorization'] = `Bearer ${process.env.OPENROUTER_API_KEY ?? ''}`
    headers['HTTP-Referer']  = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    headers['X-Title']       = 'HubPro'
  } else {
    headers['Authorization'] = `Bearer ${process.env.OPENAI_API_KEY ?? ''}`
  }
  return headers
}

export function getAIBaseURL(config: AIConfig): string {
  return config.provider === 'openrouter'
    ? 'https://openrouter.ai/api/v1'
    : 'https://api.openai.com/v1'
}

// -- Env-only (sync) --------------------------------------------------

export function getActiveAIConfig(): AIConfig {
  const provider = (
    process.env.AI_PROVIDER ?? 'openrouter'
  ) as AIConfig['provider']

  const textModel    = process.env.AI_TEXT_MODEL    ?? 'openai/gpt-4.1-nano'
  const visionModel  = process.env.AI_VISION_MODEL  ?? 'google/gemini-2.0-flash'
  const svgModel     = process.env.AI_SVG_MODEL     ?? 'google/gemini-2.5-pro-preview'
  const extractAsText = process.env.AI_EXTRACT_AS_TEXT === 'true'

  console.log(
    `[AI Config] Provider: ${provider} | ` +
    `Text: ${textModel} (${extractAsText ? 'text-mode' : 'file-mode'}) | ` +
    `Vision: ${visionModel} | SVG: ${svgModel}`
  )

  return { provider, textModel, visionModel, svgModel, extractAsText }
}

// -- DB-backed (async, 60s cache) -------------------------------------

let _cache: AIConfig | null = null
let _cacheAt = 0
const CACHE_TTL = 60_000

export async function getActiveAIConfigFromDB(): Promise<AIConfig> {
  const now = Date.now()
  if (_cache && now - _cacheAt < CACHE_TTL) return _cache

  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('admin_config')
      .select('value')
      .eq('key', 'ai_models')
      .single()

    if (data?.value) {
      const v = data.value as Record<string, string>
      const envBase = getActiveAIConfig()
      const merged: AIConfig = {
        provider:     (v.provider as AIConfig['provider']) ?? envBase.provider,
        textModel:    v.textModel   ?? envBase.textModel,
        visionModel:  v.visionModel ?? envBase.visionModel,
        svgModel:     v.svgModel    ?? envBase.svgModel,
        extractAsText: v.extractAsText === 'true'
          ? true
          : v.extractAsText === 'false'
            ? false
            : envBase.extractAsText,
      }
      _cache   = merged
      _cacheAt = now
      return merged
    }
  } catch {
    // Table may not exist yet -- silent fallback
  }

  const fallback = getActiveAIConfig()
  _cache   = fallback
  _cacheAt = now
  return fallback
}

/** Invalidate cache after saving new config to DB */
export function invalidateAIConfigCache() {
  _cache   = null
  _cacheAt = 0
}
