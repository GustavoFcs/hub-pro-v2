import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Mirrors QuestionCard's Question interface to avoid mapping
export interface SimuladoQuestion {
  id: string
  topic: string
  subtopic: string
  difficulty: string
  year: number
  text: string
  subject?: string
  institution?: string
  alternatives: { id: string; text: string }[]
  visualElement?: { type: string; imageUrl?: string | null; description?: string } | null
  videoUrl?: string | null
  videoTitulo?: string | null
  videoProfessor?: string | null
  imagemUrl?: string | null
  imagemSvg?: string | null
  imagemTipo?: 'crop' | 'reconstruida' | null
}

interface SimuladoStore {
  questions: SimuladoQuestion[]
  title: string

  addQuestion:    (q: SimuladoQuestion) => void
  removeQuestion: (id: string) => void
  clearList:      () => void
  setTitle:       (title: string) => void
  hasQuestion:    (id: string) => boolean
  reorder:        (fromIndex: number, toIndex: number) => void
}

export const useSimuladoStore = create<SimuladoStore>()(
  persist(
    (set, get) => ({
      questions: [],
      title: 'Meu Simulado',

      addQuestion: (q) => {
        if (get().hasQuestion(q.id)) return
        set(state => ({ questions: [...state.questions, q] }))
      },

      removeQuestion: (id) =>
        set(state => ({
          questions: state.questions.filter(q => q.id !== id)
        })),

      clearList: () => set({ questions: [] }),

      setTitle: (title) => set({ title }),

      hasQuestion: (id) => get().questions.some(q => q.id === id),

      reorder: (fromIndex, toIndex) => {
        const qs = [...get().questions]
        const [moved] = qs.splice(fromIndex, 1)
        qs.splice(toIndex, 0, moved)
        set({ questions: qs })
      },
    }),
    { name: 'simulado-store' }
  )
)
