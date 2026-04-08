import { createServiceClient } from '@/lib/supabase/server'

const PRIVATE_BUCKET = 'questoes-imagens-private'

// Upload do crop original em bucket PRIVADO.
// Usado apenas como referência para reconstrução — nunca exposto publicamente.
export async function uploadCropPrivate(
  imageBuffer: Buffer,
  fileName: string
): Promise<string | null> {
  try {
    const supabase = createServiceClient()

    const { data, error } = await supabase.storage
      .from(PRIVATE_BUCKET)
      .upload(`figuras/private/${fileName}`, imageBuffer, {
        contentType: 'image/png',
        upsert: false,
      })

    if (error) {
      console.error('[PrivateStorage] Erro:', error.message)
      return null
    }

    console.log('[PrivateStorage] Salvo:', data.path)
    return data.path

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[PrivateStorage] Erro inesperado:', message)
    return null
  }
}

// Gerar URL temporária (signed) para enviar à IA.
// Expira em `expiresIn` segundos — apenas para uso interno — nunca exposta ao cliente.
export async function getCropSignedUrl(
  path: string,
  expiresIn = 60
): Promise<string | null> {
  try {
    const supabase = createServiceClient()

    const { data, error } = await supabase.storage
      .from(PRIVATE_BUCKET)
      .createSignedUrl(path, expiresIn)

    if (error) {
      console.error('[PrivateStorage] Signed URL erro:', error.message)
      return null
    }

    return data.signedUrl

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[PrivateStorage] Signed URL inesperado:', message)
    return null
  }
}
