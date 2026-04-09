import { createClient } from '@/lib/supabase/client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AdminConfigStore {
  cardBorderStyle: 'accent' | 'neutral'
  setCardBorderStyle: (v: 'accent' | 'neutral') => Promise<void>
  load: () => Promise<void>
}

export const useAdminConfig = create<AdminConfigStore>()(
  persist(
    (set) => ({
      cardBorderStyle: 'accent',
      setCardBorderStyle: async (v) => {
        set({ cardBorderStyle: v })
        const supabase = createClient()
        await supabase
          .from('admin_config')
          .upsert({ key: 'card_border_style', value: v })
      },
      load: async () => {
        const supabase = createClient()
        const { data } = await supabase
          .from('admin_config')
          .select('value')
          .eq('key', 'card_border_style')
          .single()
        if (data?.value) set({ cardBorderStyle: data.value as 'accent' | 'neutral' })
      },
    }),
    { name: 'admin-config' }
  )
)
