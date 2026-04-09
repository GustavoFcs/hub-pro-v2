'use client'

import { useState, useEffect, useCallback } from 'react'

export function useSavedQuestions() {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/user/saved-questions')
      .then(r => r.ok ? r.json() : { ids: [] })
      .then(({ ids }: { ids: string[] }) => setSavedIds(new Set(ids)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const isSaved = useCallback((id: string) => savedIds.has(id), [savedIds])

  const toggle = useCallback(async (questionId: string) => {
    const wasSaved = savedIds.has(questionId)
    const method = wasSaved ? 'DELETE' : 'POST'

    // Optimistic update
    setSavedIds(prev => {
      const next = new Set(prev)
      wasSaved ? next.delete(questionId) : next.add(questionId)
      return next
    })

    try {
      await fetch('/api/user/saved-questions', {
        method,
        body: JSON.stringify({ questionId }),
        headers: { 'Content-Type': 'application/json' },
      })
    } catch {
      // Rollback on error
      setSavedIds(prev => {
        const next = new Set(prev)
        wasSaved ? next.add(questionId) : next.delete(questionId)
        return next
      })
    }
  }, [savedIds])

  return { isSaved, toggle, savedIds, savedCount: savedIds.size, loading }
}
