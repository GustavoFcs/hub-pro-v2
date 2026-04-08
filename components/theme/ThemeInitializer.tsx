'use client'

import { useEffect } from 'react'
import { useThemeStore } from '@/lib/theme/store'

export function ThemeInitializer() {
  const { accent, colorMode } = useThemeStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', accent)
    document.documentElement.classList.toggle('dark',  colorMode === 'dark')
    document.documentElement.classList.toggle('light', colorMode === 'light')
  }, [accent, colorMode])

  return null
}
