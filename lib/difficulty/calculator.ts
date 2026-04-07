export type Difficulty = 'facil' | 'medio' | 'dificil' | 'muito_dificil'

export interface DifficultyInput {
  aiSuggestion: string          // o que a IA retornou
  institution?: string          // IME, ITA, FUVEST, ENEM, etc.
  subject?: string              // Matemática, Física, etc.
  hasFormula?: boolean          // tem fórmulas/LaTeX?
  hasFigure?: boolean           // tem figura/diagrama?
  alternativesCount?: number    // 4 ou 5 alternativas
  statementLength?: number      // tamanho do enunciado em chars
}

// Peso por instituição — ajuste fino, não salto de categoria
// A IA já recebe o contexto e classifica contextualmente; estes pesos são correções pequenas.
const INSTITUTION_WEIGHT: Record<string, number> = {
  'ime':     1.0,
  'ita':     1.0,
  'efomm':   0.7,
  'afa':     0.5,
  'espcex':  0.3,
  'eear':    0.2,
  'esa':     0.2,
  'usp':     0.3,
  'fgv':     0.3,
  'fuvest':  0.2,
  'unicamp': 0.3,
  'enem':   -0.5,  // ENEM tende a ser mais acessível
  'default': 0,
}

// Peso por matéria — leve ajuste para exatas
const SUBJECT_WEIGHT: Record<string, number> = {
  'matemática':  0.4,
  'física':      0.3,
  'química':     0.1,
  'biologia':    0,
  'história':    0,
  'geografia':   0,
  'português':   0,
  'inglês':      0,
  'default':     0,
}

export function calculateDifficulty(input: DifficultyInput): Difficulty {
  // Score base da IA — ela já sabe o contexto, então este valor domina
  const aiScore: Record<string, number> = {
    'facil':          0,
    'medio':          2,
    'dificil':        4,
    'muito_dificil':  6,
  }

  let score = aiScore[input.aiSuggestion?.toLowerCase()] ?? 2

  // Ajuste por instituição
  const instKey = input.institution?.toLowerCase() ?? 'default'
  score += INSTITUTION_WEIGHT[instKey] ?? INSTITUTION_WEIGHT['default']

  // Ajuste por matéria
  const subjectKey = input.subject?.toLowerCase() ?? 'default'
  score += SUBJECT_WEIGHT[subjectKey] ?? SUBJECT_WEIGHT['default']

  // Bônus por complexidade visual (pequeno)
  if (input.hasFormula)  score += 0.2
  if (input.hasFigure)   score += 0.2

  // Bônus por enunciado muito longo
  if ((input.statementLength ?? 0) > 600) score += 0.2
  if ((input.statementLength ?? 0) > 1000) score += 0.2

  // Converter score em dificuldade
  if (score <= 1)  return 'facil'
  if (score <= 3)  return 'medio'
  if (score <= 5)  return 'dificil'
  return 'muito_dificil'
}

// Cores e labels para UI
export const DIFFICULTY_CONFIG: Record<Difficulty, {
  label: string
  color: string
  bg: string
}> = {
  facil:          { label: 'Fácil',          color: 'text-green-400',  bg: 'bg-green-400/10' },
  medio:          { label: 'Médio',          color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  dificil:        { label: 'Difícil',        color: 'text-orange-400', bg: 'bg-orange-400/10' },
  muito_dificil:  { label: 'Muito Difícil',  color: 'text-red-400',    bg: 'bg-red-400/10' },
}
