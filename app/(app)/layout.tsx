"use client"

import React from 'react'

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
    </div>
  )
}
