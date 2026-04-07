// Busca de vídeos no YouTube para correção de questões
// Cache em memória com TTL de 1 hora para não estourar cota da API

import { google } from 'googleapis'

interface VideoResult {
  videoId: string
  title: string
  channelTitle: string
  thumbnailUrl: string
}

interface CacheEntry {
  results: VideoResult[]
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const TTL_MS = 60 * 60 * 1000  // 1 hora

export async function searchCorrectionVideo(
  questionText: string,
  institution: string,
  year: number,
  questionNumber: number
): Promise<VideoResult | null> {
  const query = buildSearchQuery(questionText, institution, year, questionNumber)
  const cached = cache.get(query)

  if (cached && cached.expiresAt > Date.now()) {
    return cached.results[0] ?? null
  }

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    console.warn('[YouTube] YOUTUBE_API_KEY not set, skipping video search')
    return null
  }

  try {
    const youtube = google.youtube({ version: 'v3', auth: apiKey })
    const response = await youtube.search.list({
      part: ['snippet'],
      q: query,
      type: ['video'],
      videoDuration: 'medium',  // evitar vídeos muito curtos
      relevanceLanguage: 'pt',
      maxResults: 3,
    })

    const videos = (response.data.items ?? [])
      .filter(item => item.id?.videoId && item.snippet)
      .map(item => ({
        videoId: item.id!.videoId!,
        title: item.snippet!.title ?? '',
        channelTitle: item.snippet!.channelTitle ?? '',
        thumbnailUrl: item.snippet!.thumbnails?.medium?.url ?? '',
      }))

    cache.set(query, { results: videos, expiresAt: Date.now() + TTL_MS })
    return videos[0] ?? null
  } catch (err) {
    console.error('[YouTube] Search failed:', err)
    return null
  }
}

function buildSearchQuery(
  questionText: string,
  institution: string,
  year: number,
  questionNumber: number
): string {
  // Pegar as primeiras 60 chars do enunciado para context
  const snippet = questionText.slice(0, 60).replace(/\s+/g, ' ').trim()
  return `correção questão ${questionNumber} ${institution} ${year} ${snippet}`
}

/** Limpa todo o cache de buscas (útil em testes) */
export function clearYoutubeCache(): void {
  cache.clear()
}
