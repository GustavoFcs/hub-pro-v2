"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

type AIProvider = 'claude' | 'gpt'

interface ConfigContextType {
  aiProvider: AIProvider
  setAiProvider: (provider: AIProvider) => void
  adminLogged: boolean
  setAdminLogged: (logged: boolean) => void
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined)

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [aiProvider, setAiProviderState] = useState<AIProvider>('claude')
  const [adminLogged, setAdminLogged] = useState(false)

  useEffect(() => {
    const savedProvider = localStorage.getItem('aiProvider') as AIProvider
    if (savedProvider) {
      setAiProviderState(savedProvider)
    }
  }, [])

  const setAiProvider = (provider: AIProvider) => {
    setAiProviderState(provider)
    localStorage.setItem('aiProvider', provider)
  }

  return (
    <ConfigContext.Provider value={{ aiProvider, setAiProvider, adminLogged, setAdminLogged }}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig() {
  const context = useContext(ConfigContext)
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider')
  }
  return context
}
