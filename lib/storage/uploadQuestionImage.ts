import { createClient } from '@/lib/supabase/server'

const BUCKET = 'questoes-imagens'

export async function uploadQuestionImage(
  imageData: Buffer | string,
  fileName: string
): Promise<string | null> {
  try {
    const supabase = await createClient()

    const buffer = typeof imageData === 'string'
      ? Buffer.from(imageData, 'base64')
      : imageData

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(`figuras/${fileName}`, buffer, {
        contentType: 'image/png',
        upsert: false,
      })

    if (error) {
      console.error('[Storage] Erro no upload:', error.message)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(data.path)

    console.log('[Storage] Upload concluído:', publicUrl)
    return publicUrl
  } catch (err: any) {
    console.error('[Storage] Erro inesperado:', err?.message)
    return null
  }
}
