"use client"

import { LandingPage } from "@/components/landing-page"
import { HubSection } from "@/components/hub-section"
import { ColophonSection } from "@/components/colophon-section"
import { SideNav } from "@/components/side-nav"
import { useAuth } from "@/context/AuthContext"

export default function Page() {
  const { user, isGuest } = useAuth()
  const isAuthorized = !!user || isGuest

  return (
    <main className="relative min-h-screen">
      {isAuthorized && <SideNav />}
      <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />

      <div className="relative z-10">
        <LandingPage />
        {isAuthorized && (
          <>
            <HubSection />
            <ColophonSection />
          </>
        )}
      </div>
    </main>
  )
}
