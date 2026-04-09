// ============================================================
// Tipos TypeScript espelhando o schema do Supabase
// IMPORTANTE: usar `type` (não `interface`) para compatibilidade
// com o sistema de tipos genéricos do @supabase/supabase-js v2.
// Interfaces são opacas em conditional types e resolvem como `never`.
// ============================================================

export type Profile = {
  id: string
  email: string
  name: string | null
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
}

export type Materia = {
  id: string
  nome: string
  created_at: string
}

export type Subtopico = {
  id: string
  nome: string
  materia_id: string
  created_at: string
}

export type Instituicao = {
  id: string
  nome: string
  sigla: string | null
  created_at: string
}

export type Prova = {
  id: string
  titulo: string
  instituicao_id: string | null
  ano: number
  pdf_url: string | null
  status: 'pendente' | 'processando' | 'pendente_revisao' | 'concluido' | 'erro'
  created_at: string
  updated_at: string
}

export type Questao = {
  id: string
  prova_id: string | null
  materia_id: string | null
  subtopico_id: string | null
  instituicao_id: string | null
  ano: number | null
  numero_questao: number | null
  enunciado: string
  dificuldade: 'facil' | 'medio' | 'dificil' | 'muito_dificil'
  tem_imagem: boolean
  imagem_tipo: 'crop' | 'reconstruida' | null
  imagem_url: string | null
  imagem_svg: string | null
  crop_image_path: string | null
  gabarito: 'a' | 'b' | 'c' | 'd' | 'e' | null
  anulada: boolean
  frentes: string[]
  tempo_estimado_segundos: number | null
  created_at: string
  updated_at: string
}

export type Alternativa = {
  id: string
  questao_id: string
  letra: 'a' | 'b' | 'c' | 'd' | 'e'
  texto: string
  ordem: number
  created_at: string
}

export type VideoYT = {
  id: string
  questao_id: string
  youtube_url: string
  titulo: string | null
  professor: string | null
  validado: boolean
  created_at: string
}

export type SimuladoFolder = {
  id: string
  user_id: string
  nome: string
  created_at: string
  updated_at: string
}

export type Simulado = {
  id: string
  user_id: string
  folder_id: string | null
  titulo: string
  description: string | null
  status: 'draft' | 'ready' | 'exported'
  created_at: string
  updated_at: string | null
}

export type SimuladoAttempt = {
  id: string
  simulado_id: string
  user_id: string
  started_at: string
  finished_at: string | null
  status: 'in_progress' | 'finished'
}

export type SimuladoResponse = {
  id: string
  attempt_id: string
  questao_id: string
  resposta: string | null
  pulada: boolean
  correta: boolean | null
  answered_at: string
}

export type SimuladoQuestao = {
  simulado_id: string
  questao_id: string
  ordem: number
}

// Tipo completo com relações
export type QuestaoCompleta = Questao & {
  alternativas: Alternativa[]
  materia: Materia | null
  subtopico: Subtopico | null
  instituicao: Instituicao | null
  videos: VideoYT[]
}

// ============================================================
// Tipo Database no formato Supabase
// Todos os campos Row/Insert/Update devem ser inline (não
// referenciar type aliases) para funcionar com supabase-js v2.
// ============================================================

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          role: 'user' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          role?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          name?: string | null
          role?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      materias: {
        Row: {
          id: string
          nome: string
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          created_at?: string
        }
        Update: {
          nome?: string
          created_at?: string
        }
        Relationships: []
      }
      subtopicos: {
        Row: {
          id: string
          nome: string
          materia_id: string
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          materia_id: string
          created_at?: string
        }
        Update: {
          nome?: string
          materia_id?: string
          created_at?: string
        }
        Relationships: []
      }
      instituicoes: {
        Row: {
          id: string
          nome: string
          sigla: string | null
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          sigla?: string | null
          created_at?: string
        }
        Update: {
          nome?: string
          sigla?: string | null
          created_at?: string
        }
        Relationships: []
      }
      provas: {
        Row: {
          id: string
          titulo: string
          instituicao_id: string | null
          ano: number
          pdf_url: string | null
          status: 'pendente' | 'processando' | 'pendente_revisao' | 'concluido' | 'erro'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          titulo: string
          instituicao_id?: string | null
          ano: number
          pdf_url?: string | null
          status?: 'pendente' | 'processando' | 'pendente_revisao' | 'concluido' | 'erro'
          created_at?: string
          updated_at?: string
        }
        Update: {
          titulo?: string
          instituicao_id?: string | null
          ano?: number
          pdf_url?: string | null
          status?: 'pendente' | 'processando' | 'pendente_revisao' | 'concluido' | 'erro'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      questoes: {
        Row: {
          id: string
          prova_id: string | null
          materia_id: string | null
          subtopico_id: string | null
          instituicao_id: string | null
          ano: number | null
          numero_questao: number | null
          enunciado: string
          dificuldade: 'facil' | 'medio' | 'dificil' | 'muito_dificil'
          tem_imagem: boolean
          imagem_tipo: 'crop' | 'reconstruida' | null
          imagem_url: string | null
          imagem_svg: string | null
          crop_image_path: string | null
          gabarito: 'a' | 'b' | 'c' | 'd' | 'e' | null
          anulada: boolean
          frentes: string[]
          tempo_estimado_segundos: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          prova_id?: string | null
          materia_id?: string | null
          subtopico_id?: string | null
          instituicao_id?: string | null
          ano?: number | null
          numero_questao?: number | null
          enunciado: string
          dificuldade?: 'facil' | 'medio' | 'dificil' | 'muito_dificil'
          tem_imagem?: boolean
          imagem_tipo?: 'crop' | 'reconstruida' | null
          imagem_url?: string | null
          imagem_svg?: string | null
          crop_image_path?: string | null
          gabarito?: 'a' | 'b' | 'c' | 'd' | 'e' | null
          anulada?: boolean
          frentes?: string[]
          tempo_estimado_segundos?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          prova_id?: string | null
          materia_id?: string | null
          subtopico_id?: string | null
          instituicao_id?: string | null
          ano?: number | null
          numero_questao?: number | null
          enunciado?: string
          dificuldade?: 'facil' | 'medio' | 'dificil' | 'muito_dificil'
          tem_imagem?: boolean
          imagem_tipo?: 'crop' | 'reconstruida' | null
          imagem_url?: string | null
          imagem_svg?: string | null
          crop_image_path?: string | null
          gabarito?: 'a' | 'b' | 'c' | 'd' | 'e' | null
          anulada?: boolean
          frentes?: string[]
          tempo_estimado_segundos?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      alternativas: {
        Row: {
          id: string
          questao_id: string
          letra: 'a' | 'b' | 'c' | 'd' | 'e'
          texto: string
          ordem: number
          created_at: string
        }
        Insert: {
          id?: string
          questao_id: string
          letra: 'a' | 'b' | 'c' | 'd' | 'e'
          texto: string
          ordem: number
          created_at?: string
        }
        Update: {
          questao_id?: string
          letra?: 'a' | 'b' | 'c' | 'd' | 'e'
          texto?: string
          ordem?: number
          created_at?: string
        }
        Relationships: []
      }
      videos_yt: {
        Row: {
          id: string
          questao_id: string
          youtube_url: string
          titulo: string | null
          professor: string | null
          validado: boolean
          created_at: string
        }
        Insert: {
          id?: string
          questao_id: string
          youtube_url: string
          titulo?: string | null
          professor?: string | null
          validado?: boolean
          created_at?: string
        }
        Update: {
          questao_id?: string
          youtube_url?: string
          titulo?: string | null
          professor?: string | null
          validado?: boolean
          created_at?: string
        }
        Relationships: []
      }
      simulado_folders: {
        Row: {
          id: string
          user_id: string
          nome: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          nome: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      simulados: {
        Row: {
          id: string
          user_id: string
          folder_id: string | null
          titulo: string
          description: string | null
          status: 'draft' | 'ready' | 'exported'
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          folder_id?: string | null
          titulo: string
          description?: string | null
          status?: 'draft' | 'ready' | 'exported'
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          user_id?: string
          folder_id?: string | null
          titulo?: string
          description?: string | null
          status?: 'draft' | 'ready' | 'exported'
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      simulado_questoes: {
        Row: {
          simulado_id: string
          questao_id: string
          ordem: number
        }
        Insert: {
          simulado_id: string
          questao_id: string
          ordem: number
        }
        Update: {
          simulado_id?: string
          questao_id?: string
          ordem?: number
        }
        Relationships: []
      }
      simulado_attempts: {
        Row: {
          id: string
          simulado_id: string
          user_id: string
          started_at: string
          finished_at: string | null
          status: 'in_progress' | 'finished'
        }
        Insert: {
          id?: string
          simulado_id: string
          user_id: string
          started_at?: string
          finished_at?: string | null
          status?: 'in_progress' | 'finished'
        }
        Update: {
          finished_at?: string | null
          status?: 'in_progress' | 'finished'
        }
        Relationships: []
      }
      simulado_responses: {
        Row: {
          id: string
          attempt_id: string
          questao_id: string
          resposta: string | null
          pulada: boolean
          correta: boolean | null
          answered_at: string
        }
        Insert: {
          id?: string
          attempt_id: string
          questao_id: string
          resposta?: string | null
          pulada?: boolean
          correta?: boolean | null
          answered_at?: string
        }
        Update: {
          resposta?: string | null
          pulada?: boolean
          correta?: boolean | null
          answered_at?: string
        }
        Relationships: []
      }
      questoes_salvas: {
        Row: {
          id: string
          user_id: string
          questao_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          questao_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          questao_id?: string
        }
        Relationships: []
      }
      ai_config: {
        Row: {
          id: string
          provider: string
          model: string
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider?: string
          model?: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          provider?: string
          model?: string
          active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      admin_config: {
        Row: {
          key: string
          value: Record<string, string>
          updated_at: string
        }
        Insert: {
          key: string
          value?: Record<string, string>
          updated_at?: string
        }
        Update: {
          value?: Record<string, string>
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
