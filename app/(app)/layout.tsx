"use client"

import React from 'react'
import { Navbar } from '@/components/Navbar'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-[1280px] mx-auto p-8">
        {children}
      </main>
    </div>
  )
}
