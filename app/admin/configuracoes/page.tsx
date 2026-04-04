"use client"

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Key, ShieldCheck, Database, Save, Eye, EyeOff } from 'lucide-react'

export default function ConfigPage() {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})

  const toggleKey = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
      <div className="flex justify-between items-center border-b border-accent/20 pb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight uppercase">CONFIGURAÇÕES API</h1>
          <p className="text-[#999999] text-sm font-mono tracking-widest">GERENCIE SUAS CHAVES DE ACESSO E CONEXÕES</p>
        </div>
        <Button className="bg-accent text-white hover:bg-[#E55A2B] px-10 py-6 rounded-md font-bold text-xs uppercase tracking-widest gap-2">
          <Save size={18} />
          SALVAR TUDO
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* OpenAI Section */}
        <Card className="bg-[#111111] border-accent/30 rounded-2xl p-8 shadow-2xl hover:border-accent/60 transition-all duration-300 group">
          <CardHeader className="p-0 mb-8 flex flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
              <Key className="text-accent" size={24} />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-white tracking-tight">OPENAI (GPT-4)</CardTitle>
              <p className="text-[10px] font-mono text-accent uppercase tracking-widest">PROVEDOR DE IA #1</p>
            </div>
          </CardHeader>
          <CardContent className="p-0 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#999999] uppercase tracking-widest ml-1">Chave de API</label>
              <div className="relative">
                <Input 
                  type={showKeys['openai'] ? 'text' : 'password'}
                  placeholder="sk-..." 
                  className="bg-[#0a0a0a] border-[#333333] text-white focus:border-accent h-12 rounded-lg font-mono text-sm pr-12"
                />
                <button 
                  onClick={() => toggleKey('openai')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#999999] hover:text-accent transition-colors"
                >
                  {showKeys['openai'] ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="p-4 bg-accent/5 rounded-lg border border-accent/10">
              <p className="text-[10px] text-[#999999] font-mono leading-relaxed">
                Status: <span className="text-green-500 font-bold uppercase ml-2 flex-inline items-center gap-1">CONECTADO ●</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Anthropic Section */}
        <Card className="bg-[#111111] border-accent/30 rounded-2xl p-8 shadow-2xl hover:border-accent/60 transition-all duration-300 group">
          <CardHeader className="p-0 mb-8 flex flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
              <Key className="text-accent" size={24} />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-white tracking-tight">ANTHROPIC (CLAUDE)</CardTitle>
              <p className="text-[10px] font-mono text-accent uppercase tracking-widest">PROVEDOR DE IA #2</p>
            </div>
          </CardHeader>
          <CardContent className="p-0 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#999999] uppercase tracking-widest ml-1">Chave de API</label>
              <div className="relative">
                <Input 
                  type={showKeys['anthropic'] ? 'text' : 'password'}
                  placeholder="sk-ant-..." 
                  className="bg-[#0a0a0a] border-[#333333] text-white focus:border-accent h-12 rounded-lg font-mono text-sm pr-12"
                />
                <button 
                  onClick={() => toggleKey('anthropic')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#999999] hover:text-accent transition-colors"
                >
                  {showKeys['anthropic'] ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="p-4 bg-accent/5 rounded-lg border border-accent/10">
              <p className="text-[10px] text-[#999999] font-mono leading-relaxed">
                Status: <span className="text-accent font-bold uppercase ml-2 flex-inline items-center gap-1">AGUARDANDO CHAVE ○</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Supabase Section */}
        <Card className="bg-[#111111] border-accent/30 rounded-2xl p-8 shadow-2xl hover:border-accent/60 transition-all duration-300 group md:col-span-2">
          <CardHeader className="p-0 mb-8 flex flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
              <Database className="text-accent" size={24} />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-white tracking-tight">SUPABASE DATABASE</CardTitle>
              <p className="text-[10px] font-mono text-accent uppercase tracking-widest">ARMAZENAMENTO CORE</p>
            </div>
          </CardHeader>
          <CardContent className="p-0 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#999999] uppercase tracking-widest ml-1">URL do Projeto</label>
              <Input 
                placeholder="https://xyz.supabase.co" 
                className="bg-[#0a0a0a] border-[#333333] text-white focus:border-accent h-12 rounded-lg font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#999999] uppercase tracking-widest ml-1">Anon Key</label>
              <div className="relative">
                <Input 
                  type={showKeys['supabase'] ? 'text' : 'password'}
                  placeholder="eyJhbGci..." 
                  className="bg-[#0a0a0a] border-[#333333] text-white focus:border-accent h-12 rounded-lg font-mono text-sm pr-12"
                />
                <button 
                  onClick={() => toggleKey('supabase')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#999999] hover:text-accent transition-colors"
                >
                  {showKeys['supabase'] ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
