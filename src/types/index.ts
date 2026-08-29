export const COTAS = [
  "LB_PPI", "LB_Q", "LB_PCD", "LB_EP",
  "LI_PPI", "LI_Q", "LI_PCD", "LI_EP",
  "AC",
] as const

export const MODALIDADES = ["INT", "SUB", "SUP"] as const

export const MODALIDADE_LABELS: Record<string, string> = {
  INT: "Cursos Técnicos Integrados",
  SUB: "Cursos Técnicos Subsequentes",
  SUP: "Cursos de Graduação",
}

export const COTA_LABELS: Record<string, string> = {
  LB_PPI: "LB - Pretos/Pardos/Indígenas",
  LB_Q: "LB - Quilombolas",
  LB_PCD: "LB - Pessoa com Deficiência",
  LB_EP: "LB - Escola Pública",
  LI_PPI: "LI - Pretos/Pardos/Indígenas",
  LI_Q: "LI - Quilombolas",
  LI_PCD: "LI - Pessoa com Deficiência",
  LI_EP: "LI - Escola Pública",
  AC: "Ampla Concorrência",
}

export interface LinhaCurso {
  Unidade: string
  Curso: string
  Vagas: number
  Inscritos: number
  Homologados: number
  "Inscr./Vagas": number
  "Homolog./Vagas": number
  LB_PPI: number
  LB_Q: number
  LB_PCD: number
  LB_EP: number
  LI_PPI: number
  LI_Q: number
  LI_PCD: number
  LI_EP: number
  AC: number
  Data: string
  Modalidade: string
}

export interface LinhaCard {
  Modalidade: string
  Inscricoes: number
  InscricoesPagas: number
  Isencao: number
  IsencaoDeferidas: number
  CondicoesEspeciais: number
  CondicoesDeferidas: number
  Data: string
}

export interface LinhaEscola {
  Rank: number | null
  Campus: string
  Escola: string
  Cidade: string
  Tipo: string
  Area: string
  Inscritos: number
  Data: string
  Modalidade: string
}

export interface LinhaEscolaTop extends LinhaEscola {
  delta: number | null
}

export interface LinhaResumoEscola {
  Campus: string
  Categoria: string
  Label: string
  Valor: number
  Data: string
  Modalidade: string
}

export interface MetaDados {
  ultimaAtualizacao: string | null
  unidades: string[]
  modalidades: string[]
  campiEscolas: string[]
}

export interface PontoEvolucao {
  data: string
  modalidade?: string
  inscritos: number
}

export interface PontoEvolucaoUnidade {
  data: string
  unidade: string
  inscritos: number
}

export interface LinhaResumo {
  Unidade: string
  Curso: string
  Modalidade: string
  Vagas: number
  Inscritos: number
  "Inscr./Vagas": number
  Homologados: number
  "Homolog./Vagas": number
  Data: string
}

export interface BarrasUnidades {
  unidade: string
  modalidade: string
  inscritos: number
}

export interface CardRow {
  Modalidade: string
  Inscricoes: number
  InscricoesPagas: number
  Isencao: number
  IsencaoDeferidas: number
  CondicoesEspeciais: number
  CondicoesDeferidas: number
  Data: string
}

export interface DadosCards {
  modalidades: string[]
  rows: CardRow[]
  ultimaData: string
}

export interface OverviewData {
  ultimaData: string | null
  totalInscritos: number
  evolucao: PontoEvolucao[]
  resumo: LinhaResumo[]
  barrasUnidades: BarrasUnidades[]
  evolUnidades: PontoEvolucaoUnidade[]
  modalidadesDisponiveis: string[]
  cursosDisponiveis: string[]
}

export interface CursosData {
  kpis: { inscritos: number; homologados: number; vagas: number; inscrVagas: number }
  kpisAnterior: { inscritos: number; homologados: number; vagas: number; inscrVagas: number } | null
  evolucao: PontoEvolucao[]
  tabela: (LinhaCurso & {})[]
  cotas: { cota: string; inscritos: number }[]
  modalidadesDisponiveis: string[]
  cursosDisponiveis: string[]
}

export interface EscolasData {
  ultimaColeta: string | null
  top30: LinhaEscolaTop[]
  donuts: { tipo: { label: string; valor: number }[]; area: { label: string; valor: number }[]; cidade: { label: string; valor: number }[] }
  evolEscolas: { data: string; escola: string; inscritos: number }[]
}
