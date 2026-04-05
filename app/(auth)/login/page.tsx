"use client"

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, Mail, ArrowRight, ShieldCheck, UserPlus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await login(email)
      router.push('/banco-questoes')
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background with Filters (Same as Landing) */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1524230572899-a752b3835840?q=80&w=2072&auto=format&fit=crop')",
          filter: "blur(15px) brightness(0.4) saturate(0.5)"
        }}
      />
      <div className="absolute inset-0 z-0 bg-black/80" />

      <div className="relative z-10 w-full max-w-[400px] bg-black/60 backdrop-blur-xl border border-accent/40 rounded-none shadow-2xl animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
        <div className="p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-6">
            <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
              <h1 className="text-4xl font-bold text-white uppercase tracking-[0.4em] font-[var(--font-bebas)]">
                DERELICT
              </h1>
            </Link>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white uppercase tracking-[0.3em] font-[var(--font-bebas)]">
                Acesse sua Conta
              </h2>
              <p className="text-[10px] font-mono text-accent/60 uppercase tracking-[0.2em] italic">
                Bem-vindo de volta
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-accent uppercase tracking-widest ml-1">E-mail</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-accent transition-colors" size={14} />
                  <Input 
                    type="email" 
                    placeholder="exemplo@email.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-background/50 border-border/50 text-white focus:border-accent h-11 rounded-none pl-10 text-xs transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[9px] font-bold text-accent uppercase tracking-widest">Senha</label>
                  <Link href="#" className="text-[8px] font-medium text-muted-foreground uppercase hover:text-accent transition-colors">Esqueceu?</Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-accent transition-colors" size={14} />
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-background/50 border-border/50 text-white focus:border-accent h-11 rounded-none pl-10 text-xs transition-all"
                  />
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-11 rounded-none font-bold text-[10px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2"
            >
              {isLoading ? 'Autenticando...' : 'Entrar no Sistema'}
              {!isLoading && <ArrowRight size={14} />}
            </Button>
          </form>

          {/* Footer */}
          <div className="pt-6 border-t border-border/30 text-center space-y-4">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Ainda não tem uma conta?</p>
            <Button variant="outline" className="w-full border-accent/20 text-accent hover:bg-accent hover:text-accent-foreground h-10 rounded-none font-bold text-[9px] uppercase tracking-widest transition-all">
              <UserPlus size={14} className="mr-2" />
              Criar conta agora
            </Button>
            
            <div className="flex items-center justify-center gap-2 text-[8px] text-muted-foreground font-mono uppercase tracking-tighter opacity-50">
              <ShieldCheck size={10} className="text-accent" />
              Sistema Protegido
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
