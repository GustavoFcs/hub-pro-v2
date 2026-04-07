"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/supabase/types'

interface User {
  id: string
  email: string
  name?: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  isAdmin: boolean
  isGuest: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setAsGuest: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
  'Too many requests': 'Muitas tentativas. Aguarde alguns minutos.',
}

function translateError(message: string): string {
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (message.includes(key)) return value
  }
  return 'Erro ao entrar. Tente novamente.'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  async function fetchProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) return null
    return data as Profile
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const u = session.user
          setUser({ id: u.id, email: u.email ?? '', name: u.user_metadata?.name })
          const p = await fetchProfile(u.id)
          setProfile(p)
        } else {
          setUser(null)
          setProfile(null)
        }
        setIsLoading(false)
      }
    )
    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(translateError(error.message))
    if (data.user) {
      const p = await fetchProfile(data.user.id)
      setProfile(p)
      setUser({ id: data.user.id, email: data.user.email ?? '', name: data.user.user_metadata?.name })
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    router.push('/')
  }

  const setAsGuest = () => {
    setIsGuest(true)
    setUser(null)
    setProfile(null)
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, isGuest, isLoading, login, logout, setAsGuest }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
