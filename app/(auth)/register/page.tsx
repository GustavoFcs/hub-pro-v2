"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não conferem.')
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      if (signUpError) throw signUpError
      setSuccess(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao criar conta.'
      setError(message.includes('already registered')
        ? 'Este e-mail já está cadastrado.'
        : 'Erro ao criar conta. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1524230572899-a752b3835840?q=80&w=2072&auto=format&fit=crop')",
          filter: "blur(15px) brightness(0.4) saturate(0.5)",
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
                Criar Conta
              </h2>
              <p className="text-[10px] font-mono text-accent/60 uppercase tracking-[0.2em] italic">
                Junte-se à plataforma
              </p>
            </div>
          </div>

          {success ? (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <UserCheck size={48} className="text-accent" />
              </div>
              <p className="font-mono text-xs text-white leading-relaxed">
                Verifique seu e-mail para confirmar o cadastro.
              </p>
              <Link href="/login">
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-11 rounded-none font-bold text-[10px] uppercase tracking-[0.2em]">
                  Ir para o Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-accent uppercase tracking-widest ml-1">Nome completo</label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-accent transition-colors" size={14} />
                    <Input
                      type="text"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="bg-background/50 border-border/50 text-white focus:border-accent h-11 rounded-none pl-10 text-xs transition-all"
                    />
                  </div>
                </div>

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
                  <label className="text-[9px] font-bold text-accent uppercase tracking-widest ml-1">Senha</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-accent transition-colors" size={14} />
                    <Input
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-background/50 border-border/50 text-white focus:border-accent h-11 rounded-none pl-10 text-xs transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-accent uppercase tracking-widest ml-1">Confirmar senha</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-accent transition-colors" size={14} />
                    <Input
                      type="password"
                      placeholder="Repita a senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
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
                {isLoading ? 'Criando conta...' : 'Criar Conta'}
                {!isLoading && <ArrowRight size={14} />}
              </Button>

              {error && (
                <p className="font-mono text-[11px] text-red-400 text-center leading-relaxed">
                  {error}
                </p>
              )}
            </form>
          )}

          {/* Footer */}
          <div className="pt-6 border-t border-border/30 text-center space-y-4">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Já tem uma conta?</p>
            <Link href="/login">
              <Button variant="outline" className="w-full border-accent/20 text-accent hover:bg-accent hover:text-accent-foreground h-10 rounded-none font-bold text-[9px] uppercase tracking-widest transition-all">
                Entrar agora
              </Button>
            </Link>
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
