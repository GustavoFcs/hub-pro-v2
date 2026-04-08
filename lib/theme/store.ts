import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AccentTheme = 'cyan' | 'green' | 'blue' | 'amber' | 'red' | 'orange' | 'silver'
export type ColorMode  = 'dark' | 'light'

export const ACCENT_THEMES: Record<AccentTheme, {
  label:   string
  hex:     string
  rgb:     string
  preview: string
}> = {
  cyan:  { label: 'Ciano Técnico',    hex: '#00B4D8', rgb: '0 180 216',   preview: 'bg-[#00B4D8]' },
  green: { label: 'Verde Terminal',   hex: '#00C896', rgb: '0 200 150',   preview: 'bg-[#00C896]' },
  blue:  { label: 'Azul Prussiano',   hex: '#4361EE', rgb: '67 97 238',   preview: 'bg-[#4361EE]' },
  amber: { label: 'Âmbar Dourado',    hex: '#E8B84B', rgb: '232 184 75',  preview: 'bg-[#E8B84B]' },
  red:    { label: 'Vermelho Técnico', hex: '#E63946', rgb: '230 57 70',   preview: 'bg-[#E63946]' },
  orange: { label: 'Laranja Original',  hex: '#E55A2B', rgb: '229 90 43',   preview: 'bg-[#E55A2B]' },
  silver: { label: 'Prata Técnico',     hex: '#A8A8B3', rgb: '168 168 179', preview: 'bg-[#A8A8B3]' },
}

interface ThemeStore {
  accent:          AccentTheme
  colorMode:       ColorMode
  setAccent:       (theme: AccentTheme) => void
  setColorMode:    (mode: ColorMode)    => void
  toggleColorMode: () => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      accent:    'cyan',
      colorMode: 'dark',

      setAccent: (accent) => {
        set({ accent })
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', accent)
        }
      },

      setColorMode: (colorMode) => {
        set({ colorMode })
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark',  colorMode === 'dark')
          document.documentElement.classList.toggle('light', colorMode === 'light')
        }
      },

      toggleColorMode: () => {
        const next = get().colorMode === 'dark' ? 'light' : 'dark'
        get().setColorMode(next)
      },
    }),
    { name: 'derelictqb-theme' }
  )
)
