"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useConfig } from '@/context/ConfigContext'
import { useAuth } from '@/context/AuthContext'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Settings, Lock, LogOut, ChevronDown, User } from 'lucide-react'

const navItems = [
  { label: 'Banco de Questões', href: '/banco-questoes' },
  { label: 'Minha Lista', href: '/minha-lista' },
  { label: 'Vocalab', href: '/vocalab' },
  { label: 'Dashboard', href: '/dashboard' },
]

export function Navbar() {
  const pathname = usePathname()
  const { aiProvider, setAiProvider } = useConfig()
  const { user, logout } = useAuth()

  return (
    <nav className="sticky top-0 z-50 h-[70px] w-full bg-[#0a0a0a] border-b border-accent flex items-center justify-between px-8 backdrop-blur-md">
      {/* Logo */}
      <Link href="/app" className="flex items-center gap-2">
        <span className="text-2xl font-bold text-white tracking-tight">📚 QB</span>
      </Link>

      {/* Navigation Menu (Center) */}
      <div className="hidden md:flex items-center gap-8">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "text-sm font-medium transition-all duration-300 border-b-2 pb-1",
              pathname === item.href 
                ? "text-accent border-accent" 
                : "text-[#CCCCCC] border-transparent hover:text-accent hover:border-accent"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* User Menu (Right) */}
      <div className="flex items-center gap-4">
        {/* AI Provider Selector */}
        <div className="flex items-center gap-2 bg-[#1a1a1a] border border-accent rounded-full p-1">
          <span className="text-[10px] font-bold text-white ml-2 uppercase tracking-tighter opacity-50">IA:</span>
          <button
            onClick={() => setAiProvider('claude')}
            className={cn(
              "px-3 py-1 text-[10px] font-bold rounded-full transition-all duration-200",
              aiProvider === 'claude' 
                ? "bg-accent text-black" 
                : "text-white hover:bg-white/10"
            )}
          >
            CLAUDE
          </button>
          <button
            onClick={() => setAiProvider('gpt')}
            className={cn(
              "px-3 py-1 text-[10px] font-bold rounded-full transition-all duration-200",
              aiProvider === 'gpt' 
                ? "bg-accent text-black" 
                : "text-white hover:bg-white/10"
            )}
          >
            GPT
          </button>
        </div>

        {/* User Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <Avatar className="h-9 w-9 border border-accent/30 hover:border-accent transition-colors duration-200">
              <AvatarFallback className="bg-[#1a1a1a] text-white text-xs">
                {user?.name?.substring(0, 2).toUpperCase() || <User size={16} />}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-[#0a0a0a] border-accent text-white p-2 mt-2">
            <div className="px-2 py-1.5 text-xs text-[#999999] font-mono">
              CONTA: {user?.email || 'Visitante'}
            </div>
            <DropdownMenuSeparator className="bg-accent/20" />
            <DropdownMenuItem className="hover:bg-accent hover:text-black cursor-pointer gap-2 transition-colors duration-200 rounded-md">
              <Settings size={16} />
              Configurações
            </DropdownMenuItem>
            <Link href="/admin">
              <DropdownMenuItem className="hover:bg-accent hover:text-black cursor-pointer gap-2 transition-colors duration-200 rounded-md">
                <Lock size={16} />
                Admin
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator className="bg-accent/20" />
            <DropdownMenuItem 
              onClick={() => logout()}
              className="hover:bg-destructive hover:text-white cursor-pointer gap-2 transition-colors duration-200 rounded-md text-destructive"
            >
              <LogOut size={16} />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
