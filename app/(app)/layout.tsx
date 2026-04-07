"use client"

import React from 'react'
import { SimuladoFloatingBar } from '@/components/simulado/SimuladoFloatingBar'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <main className="flex-1 w-full mx-auto">
        {children}
      </main>
      <SimuladoFloatingBar />
    </div>
  )
}
