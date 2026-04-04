"use client"

import React from 'react'
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
  LineChart,
  Line
} from 'recharts'

const data = [
  { name: 'Jan', questões: 400, provas: 24 },
  { name: 'Fev', questões: 300, provas: 18 },
  { name: 'Mar', questões: 200, provas: 12 },
  { name: 'Abr', questões: 278, provas: 15 },
]

export default function AdminDashboardPage() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
      <div className="flex justify-between items-center border-b border-accent/20 pb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight uppercase">ADMIN DASHBOARD</h1>
          <p className="text-[#999999] text-sm font-mono tracking-widest">VISÃO GERAL DO SISTEMA DERELICT</p>
        </div>
        <div className="flex items-center gap-4 bg-accent/10 border border-accent/20 px-6 py-3 rounded-full">
          <Activity className="text-accent animate-pulse" size={18} />
          <span className="text-[10px] font-bold text-white uppercase tracking-widest">SISTEMA ONLINE</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Usuários', value: '1,284', icon: Users, trend: '+12%' },
          { label: 'Provas Processadas', value: '86', icon: FileText, trend: '+5%' },
          { label: 'Questões no Banco', value: '14,202', icon: HelpCircle, trend: '+18%' },
          { label: 'Taxa de Acerto IA', value: '98.4%', icon: TrendingUp, trend: '+0.2%' },
        ].map((stat, i) => (
          <Card key={i} className="bg-[#111111] border-accent/20 p-6 rounded-2xl shadow-xl hover:border-accent/50 transition-all duration-300">
            <CardContent className="p-0 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="p-3 bg-accent/10 rounded-xl border border-accent/10">
                  <stat.icon className="text-accent" size={20} />
                </div>
                <span className="text-[10px] font-bold text-green-500 font-mono">{stat.trend}</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#999999] uppercase tracking-widest mb-1">{stat.label}</p>
                <h3 className="text-3xl font-bold text-white tracking-tighter">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <Card className="bg-[#111111] border-accent/20 p-8 rounded-2xl shadow-xl lg:col-span-2">
          <CardHeader className="p-0 mb-8">
            <CardTitle className="text-xl font-bold text-white tracking-tight uppercase">ATIVIDADE DO BANCO</CardTitle>
            <p className="text-[10px] font-mono text-accent uppercase tracking-widest">ÚLTIMOS 4 MESES</p>
          </CardHeader>
          <CardContent className="p-0 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
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
        <Card className="bg-[#111111] border-accent/20 p-8 rounded-2xl shadow-xl">
          <CardHeader className="p-0 mb-8 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-white tracking-tight uppercase">LOGS DO SISTEMA</CardTitle>
              <p className="text-[10px] font-mono text-accent uppercase tracking-widest">TEMPO REAL</p>
            </div>
            <ShieldAlert className="text-accent/50" size={20} />
          </CardHeader>
          <CardContent className="p-0 space-y-6">
            {[
              { msg: 'Nova prova processada: ENEM 2024', time: '2m atrás', type: 'success' },
              { msg: 'Usuário gustavo.pro efetuou login', time: '5m atrás', type: 'info' },
              { msg: 'Backup do banco concluído', time: '12m atrás', type: 'success' },
              { msg: 'Erro na extração: PDF corrompido', time: '45m atrás', type: 'error' },
              { msg: 'API Key OpenAI atualizada', time: '1h atrás', type: 'info' },
            ].map((log, i) => (
              <div key={i} className="flex gap-4 items-start border-l border-accent/20 pl-4">
                <div className="flex-1">
                  <p className="text-xs text-white font-medium mb-1">{log.msg}</p>
                  <div className="flex items-center gap-2">
                    <Clock size={10} className="text-[#666666]" />
                    <span className="text-[10px] text-[#666666] font-mono">{log.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
