"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { 
  LayoutDashboard, 
  UploadCloud, 
  FileEdit, 
  Key, 
  LogOut,
  ArrowLeft,
  ShieldCheck,
  Brain,
  GraduationCap,
} from 'lucide-react'

const adminMenuItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Upload de Prova', href: '/admin/upload-prova', icon: UploadCloud },
  { label: 'Gerenciar Provas', href: '/admin/gerenciar-provas', icon: FileEdit },
  { label: 'Revisão de IA', href: '/admin/revisao-ia', icon: Brain },
  { label: 'Simulados', href: '/minha-lista', icon: GraduationCap },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { logout } = useAuth()

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 bg-[#0a0a0a] border-r border-accent flex flex-col p-6 z-50">
      <div className="flex items-center gap-3 mb-10 px-2">
        <ShieldCheck className="text-accent" size={24} />
        <h2 className="text-xl font-bold text-white tracking-tight uppercase">ADMIN</h2>
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        {adminMenuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300",
                isActive 
                  ? "bg-accent text-black" 
                  : "text-[#999999] hover:bg-[#1a1a1a] hover:text-accent"
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        <Link
          href="/banco-questoes"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[#999999] hover:bg-[#1a1a1a] hover:text-white transition-all duration-300"
        >
          <ArrowLeft size={18} />
          Voltar ao App
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-300 w-full text-left"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  )
}
