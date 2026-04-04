"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

interface User {
  id: string
  email: string
  name?: string
}

interface AuthContextType {
  user: User | null
  isGuest: boolean
  isLoading: boolean
  login: (email: string) => Promise<void>
  logout: () => void
  setAsGuest: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for saved user in session/local storage
    const savedUser = localStorage.getItem('user')
    const savedGuest = localStorage.getItem('isGuest')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    if (savedGuest === 'true') {
      setIsGuest(true)
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string) => {
    // Simulation of login
    const mockUser = { id: '1', email, name: email.split('@')[0] }
    setUser(mockUser)
    setIsGuest(false)
    localStorage.setItem('user', JSON.stringify(mockUser))
    localStorage.removeItem('isGuest')
  }

  const logout = () => {
    setUser(null)
    setIsGuest(false)
    localStorage.removeItem('user')
    localStorage.removeItem('isGuest')
  }

  const setAsGuest = () => {
    setIsGuest(true)
    setUser(null)
    localStorage.setItem('isGuest', 'true')
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ user, isGuest, isLoading, login, logout, setAsGuest }}>
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
