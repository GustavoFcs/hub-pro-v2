"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { 
  Users, 
  FileText, 
  HelpCircle, 
  TrendingUp, 
  Activity, 
  Clock,
  ShieldAlert
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { ThemeSettings } from '@/components/admin/ThemeSettings'
import { AIModelSettings } from '@/components/admin/AIModelSettings'
import type { Prova } from '@/lib/supabase/types'

interface ChartEntry { name: string; questões: number }

interface DashboardData {
  totalUsuarios: number
  provasProcessadas: number
  questoesBanco: number
  chartData: ChartEntry[]
  recentProvas: Pick<Prova, 'id' | 'titulo' | 'status' | 'created_at'>[]
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [usersRes, provasRes, questoesRes, chartRes, recentRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('provas').select('id', { count: 'exact', head: true }).eq('status', 'concluido'),
        supabase.from('questoes').select('id', { count: 'exact', head: true }),
        supabase.from('questoes').select('created_at'),
        supabase.from('provas').select('id, titulo, status, created_at').order('created_at', { ascending: false }).limit(5),
      ])

      // Build chart: questões por mês (últimos 4 meses)
      const now = new Date()
      const countsByMonth: Record<string, number> = {}
      for (let i = 3; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        countsByMonth[`${d.getFullYear()}-${d.getMonth()}`] = 0
      }
      ;(chartRes.data ?? []).forEach((row: { created_at: string }) => {
        const d = new Date(row.created_at)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        if (key in countsByMonth) countsByMonth[key]++
      })
      const chartData: ChartEntry[] = Object.entries(countsByMonth).map(([key, count]) => {
        const [year, month] = key.split('-').map(Number)
        return { name: MONTH_NAMES[month], questões: count }
      })

      setData({
        totalUsuarios: usersRes.count ?? 0,
        provasProcessadas: provasRes.count ?? 0,
        questoesBanco: questoesRes.count ?? 0,
        chartData,
        recentProvas: (recentRes.data ?? []) as Pick<Prova, 'id' | 'titulo' | 'status' | 'created_at'>[],
      })
    }
    load()
  }, [])

  function formatRelativeTime(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m atrás`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h atrás`
    return `${Math.floor(hrs / 24)}d atrás`
  }

  const stats = data
    ? [
        { label: 'Total Usuários', value: data.totalUsuarios.toLocaleString('pt-BR'), icon: Users, trend: '' },
        { label: 'Provas Processadas', value: String(data.provasProcessadas), icon: FileText, trend: '' },
        { label: 'Questões no Banco', value: data.questoesBanco.toLocaleString('pt-BR'), icon: HelpCircle, trend: '' },
        { label: 'Taxa de Acerto IA', value: '98.4%', icon: TrendingUp, trend: '+0.2%' },
      ]
    : [
        { label: 'Total Usuários', value: '—', icon: Users, trend: '' },
        { label: 'Provas Processadas', value: '—', icon: FileText, trend: '' },
        { label: 'Questões no Banco', value: '—', icon: HelpCircle, trend: '' },
        { label: 'Taxa de Acerto IA', value: '98.4%', icon: TrendingUp, trend: '+0.2%' },
      ]

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
      <div className="flex justify-between items-center border-b border-accent/20 pb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight uppercase">ADMIN DASHBOARD</h1>
          <p className="text-muted-foreground text-sm font-mono tracking-widest">VISÃO GERAL DO SISTEMA DERELICT</p>
        </div>
        <div className="flex items-center gap-4 bg-accent/10 border border-accent/20 px-6 py-3 rounded-full">
          <Activity className="text-accent animate-pulse" size={18} />
          <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">SISTEMA ONLINE</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="bg-card border-accent/20 p-6 rounded-2xl shadow-xl hover:border-accent/50 transition-all duration-300">
            <CardContent className="p-0 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="p-3 bg-accent/10 rounded-xl border border-accent/10">
                  <stat.icon className="text-accent" size={20} />
                </div>
                {stat.trend && <span className="text-[10px] font-bold text-green-500 font-mono">{stat.trend}</span>}
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
                <h3 className="text-3xl font-bold text-foreground tracking-tighter">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <Card className="bg-card border-accent/20 p-8 rounded-2xl shadow-xl lg:col-span-2">
          <CardHeader className="p-0 mb-8">
            <CardTitle className="text-xl font-bold text-foreground tracking-tight uppercase">ATIVIDADE DO BANCO</CardTitle>
            <p className="text-[10px] font-mono text-accent uppercase tracking-widest">ÚLTIMOS 4 MESES</p>
          </CardHeader>
          <CardContent className="p-0 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.chartData ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                <XAxis dataKey="name" stroke="#666666" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#666666" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #FF6B35', borderRadius: '8px' }}
                  itemStyle={{ color: '#FF6B35' }}
                />
                <Bar dataKey="questões" fill="#FF6B35" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* System Logs */}
        <Card className="bg-card border-accent/20 p-8 rounded-2xl shadow-xl">
          <CardHeader className="p-0 mb-8 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-foreground tracking-tight uppercase">ÚLTIMAS PROVAS</CardTitle>
              <p className="text-[10px] font-mono text-accent uppercase tracking-widest">PROCESSAMENTO</p>
            </div>
            <ShieldAlert className="text-accent/50" size={20} />
          </CardHeader>
          <CardContent className="p-0 space-y-6">
            {(data?.recentProvas ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground font-mono">Nenhuma prova encontrada.</p>
            )}
            {(data?.recentProvas ?? []).map((prova) => (
              <div key={prova.id} className="flex gap-4 items-start border-l border-accent/20 pl-4">
                <div className="flex-1">
                  <p className="text-xs text-foreground font-medium mb-1">{prova.titulo}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold uppercase ${
                      prova.status === 'concluido' ? 'text-green-500' :
                      prova.status === 'erro' ? 'text-red-400' :
                      prova.status === 'processando' ? 'text-yellow-400' : 'text-muted-foreground'
                    }`}>{prova.status}</span>
                    <Clock size={10} className="text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-mono">{formatRelativeTime(prova.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Aparência */}
      <div className="space-y-4">
        <div className="border-b border-accent/20 pb-4">
          <h2 className="text-xl font-bold text-foreground tracking-tight uppercase">Aparência</h2>
          <p className="text-[10px] font-mono text-accent uppercase tracking-widest">Tema e modo de cor</p>
        </div>
        <div className="max-w-sm">
          <ThemeSettings />
        </div>
      </div>

      {/* Modelos de IA */}
      <div className="space-y-4">
        <div className="border-b border-accent/20 pb-4">
          <h2 className="text-xl font-bold text-foreground tracking-tight uppercase">Modelos de IA</h2>
          <p className="text-[10px] font-mono text-accent uppercase tracking-widest">Extração · Visão · Reconstrução SVG</p>
        </div>
        <div className="max-w-xl">
          <AIModelSettings />
        </div>
      </div>
    </div>
  )
}
