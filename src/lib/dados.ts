import fs from "fs"
import path from "path"
import { parse } from "csv-parse/sync"
import { log } from "./logger"
import type {
  LinhaCurso, LinhaCard, LinhaEscola, LinhaResumoEscola,
  MetaDados, OverviewData, CursosData, EscolasData, DadosCards,
  PontoEvolucao, PontoEvolucaoUnidade, LinhaResumo, BarrasUnidades, CardRow,
} from "@/types"
import { MODALIDADE_LABELS, COTA_LABELS } from "@/types"

const DATA_DIR = path.resolve(process.cwd(), "dados")

const ARQUIVOS = {
  allData: path.join(DATA_DIR, "processed/all_data.csv"),
  cards: path.join(DATA_DIR, "processed/cards.csv"),
  escolas: path.join(DATA_DIR, "processed/escolas_all.csv"),
  escolasResumo: path.join(DATA_DIR, "processed/escolas_resumo_all.csv"),
  vagas: path.join(DATA_DIR, "vagas_referencia.csv"),
}

function readCsv<T>(file: string): T[] {
  if (!fs.existsSync(file)) return []
  const raw = fs.readFileSync(file, "utf-8")
  return parse(raw, { columns: true, skip_empty_lines: true, trim: true }) as T[]
}

// Cache por mtime: a API reflete exatamente o que está no disco. Se o arquivo
// mudou, reparsia; senão reaproveita o parse em memória.
const csvCache = new Map<string, { mtime: number; data: unknown[] }>()

function lerCsvCacheado<T>(file: string, key: string): T[] {
  let mtime = 0
  try {
    mtime = fs.statSync(file).mtimeMs
  } catch {
    /* arquivo ausente */
  }
  const cached = csvCache.get(key)
  if (cached && cached.mtime === mtime) return cached.data as T[]
  const data = readCsv<T>(file)
  csvCache.set(key, { mtime, data })
  return data
}

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0
  const n = parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

function limparTs(ts: string): string {
  return String(ts).trim().slice(0, 19)
}

// ---------------------------------------------------------------------------
// Normalização de texto (porta de funcoes._normalizar)
// ---------------------------------------------------------------------------

function _normalizar(texto: unknown): string {
  if (typeof texto !== "string") return ""
  let t = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  t = t.toUpperCase().trim().replace(/ {2}/g, " ")
  const correcoes: Record<string, string> = {
    "INTELIGENCA ARTIFICIAL": "INTELIGENCIA ARTIFICIAL",
    "LETRAS (PORTUGUES INGLES)": "LETRAS (PORTUGUES/INGLES)",
  }
  return correcoes[t] ?? t
}

// ---------------------------------------------------------------------------
// Carga dos dados
// ---------------------------------------------------------------------------

function aplicarVagas(rows: LinhaCurso[]): LinhaCurso[] {
  const vagas = lerCsvCacheado<Record<string, string>>(ARQUIVOS.vagas, "vagas")
  const vagasMap = new Map<string, number>()
  for (const v of vagas) {
    const chave = [
      _normalizar(v.Campus),
      _normalizar(v.Curso),
      v.Modalidade,
      (v.FormaSelecao || "").toUpperCase(),
    ].join("|")
    if (!vagasMap.has(chave)) vagasMap.set(chave, toNum(v.TotalVagas))
  }

  const extrairFormaSup = (curso: string): string => {
    const c = String(curso)
    if (c.includes(" (ENEM)")) return "ENEM"
    if (c.includes(" (Histórico e Redação)")) return "HISTÓRICO E REDAÇÃO"
    return ""
  }

  const limparCursoSup = (curso: string): string => {
    return String(curso).replace(" (ENEM)", "").replace(" (Histórico e Redação)", "")
  }

  return rows.map((r) => {
    const unidadeNorm = _normalizar(r.Unidade)
    const forma = r.Modalidade === "SUP" ? extrairFormaSup(r.Curso) : ""
    const cursoBase = limparCursoSup(r.Curso)
    const cursoNorm = _normalizar(cursoBase)
    const chave = `${unidadeNorm}|${cursoNorm}|${r.Modalidade}|${forma}`
    const totalVagas = vagasMap.get(chave)

    const vagasFinais = r.Vagas > 0 ? r.Vagas : (totalVagas ?? 0)
    return {
      ...r,
      Vagas: vagasFinais,
      "Inscr./Vagas": vagasFinais > 0 ? Math.round((r.Inscritos / vagasFinais) * 100) / 100 : 0,
    }
  })
}

export function loadAllData(): LinhaCurso[] {
  const raw = lerCsvCacheado<Record<string, string>>(ARQUIVOS.allData, "all_data")

  const rows: LinhaCurso[] = raw
    .filter((r) => String(r.Curso || "").trim() !== "Todos")
    .map((r) => ({
      Unidade: String(r.Unidade || "").toUpperCase(),
      Curso: String(r.Curso || ""),
      Vagas: Math.round(toNum(r.Vagas)),
      Inscritos: Math.round(toNum(r.Inscritos)),
      Homologados: Math.round(toNum(r.Homologados)),
      "Inscr./Vagas": toNum(r["Inscr./Vagas"]),
      "Homolog./Vagas": toNum(r["Homolog./Vagas"]),
      LB_PPI: toNum(r.LB_PPI), LB_Q: toNum(r.LB_Q), LB_PCD: toNum(r.LB_PCD), LB_EP: toNum(r.LB_EP),
      LI_PPI: toNum(r.LI_PPI), LI_Q: toNum(r.LI_Q), LI_PCD: toNum(r.LI_PCD), LI_EP: toNum(r.LI_EP),
      AC: toNum(r.AC),
      Data: limparTs(String(r.Timestamp || "")),
      Modalidade: String(r.Modalidade || ""),
    }))

  const vistos = new Set<string>()
  const unicos: LinhaCurso[] = []
  for (const r of rows) {
    const k = `${r.Data}|${r.Unidade}|${r.Curso}|${r.Modalidade}`
    if (vistos.has(k)) continue
    vistos.add(k)
    unicos.push(r)
  }

  return aplicarVagas(unicos)
}

export function loadCards(): LinhaCard[] {
  const raw = lerCsvCacheado<Record<string, string>>(ARQUIVOS.cards, "cards")
  return raw.map((r) => ({
    Modalidade: String(r.Modalidade || ""),
    Inscricoes: Math.round(toNum(r.Inscricoes)),
    InscricoesPagas: Math.round(toNum(r.InscricoesPagas)),
    Isencao: Math.round(toNum(r.Isencao)),
    IsencaoDeferidas: Math.round(toNum(r.IsencaoDeferidas)),
    CondicoesEspeciais: Math.round(toNum(r.CondicoesEspeciais)),
    CondicoesDeferidas: Math.round(toNum(r.CondicoesDeferidas)),
    Data: limparTs(String(r.Timestamp || "")),
  }))
}

export function loadEscolas(): LinhaEscola[] {
  const raw = lerCsvCacheado<Record<string, string>>(ARQUIVOS.escolas, "escolas")
  const rows: LinhaEscola[] = raw.map((r) => ({
    Rank: /^\d+$/.test(String(r.Rank || "")) ? parseInt(r.Rank, 10) : null,
    Campus: String(r.Campus || "").trim(),
    Escola: String(r.Escola || ""),
    Cidade: String(r.Cidade || ""),
    Tipo: String(r.Tipo || ""),
    Area: String(r.Area || ""),
    Inscritos: Math.round(toNum(r.Inscritos)),
    Data: limparTs(String(r.Timestamp || "")),
    Modalidade: String(r.Modalidade || ""),
  }))

  const vistos = new Set<string>()
  const unicos: LinhaEscola[] = []
  for (const r of rows) {
    const k = `${r.Data}|${r.Modalidade}|${r.Campus}|${r.Escola}`
    if (vistos.has(k)) continue
    vistos.add(k)
    unicos.push(r)
  }
  return unicos
}

export function loadEscolasResumo(): LinhaResumoEscola[] {
  const raw = lerCsvCacheado<Record<string, string>>(ARQUIVOS.escolasResumo, "escolas_resumo")
  const rows: LinhaResumoEscola[] = raw.map((r) => ({
    Campus: String(r.Campus || "").trim(),
    Categoria: String(r.Categoria || ""),
    Label: String(r.Label || ""),
    Valor: Math.round(toNum(r.Valor)),
    Data: limparTs(String(r.Timestamp || "")),
    Modalidade: String(r.Modalidade || ""),
  }))

  const vistos = new Set<string>()
  const unicos: LinhaResumoEscola[] = []
  for (const r of rows) {
    const k = `${r.Data}|${r.Modalidade}|${r.Campus}|${r.Categoria}|${r.Label}`
    if (vistos.has(k)) continue
    vistos.add(k)
    unicos.push(r)
  }
  return unicos
}

function ultimaColetaPorModalidade(rows: LinhaCurso[]): LinhaCurso[] {
  const mods = [...new Set(rows.map((r) => r.Modalidade))]
  const out: LinhaCurso[] = []
  for (const mod of mods) {
    const dmod = rows.filter((r) => r.Modalidade === mod)
    const ult = dmod.reduce((a, b) => (a.Data > b.Data ? a : b)).Data
    out.push(...dmod.filter((r) => r.Data === ult))
  }
  return out
}

// ---------------------------------------------------------------------------
// Métricas
// ---------------------------------------------------------------------------

export function getMeta(): MetaDados {
  const all = loadAllData()
  const escolas = loadEscolas()

  // "Última atualização" = a última coleta completa realmente presente nos dados
  // (não o mtime do arquivo — que pode ser de uma regravação sem dados novos).
  let ultimaAtualizacao: string | null = null
  if (all.length) {
    const maxData = all.reduce((a, b) => (a.Data > b.Data ? a : b)).Data
    const [d, t] = maxData.split(" ")
    const [y, m, dia] = d.split("-")
    ultimaAtualizacao = `${dia}/${m}/${y}${t ? ` ${t}` : ""}`
  }

  return {
    ultimaAtualizacao,
    unidades: [...new Set(all.map((r) => r.Unidade).filter((u) => u && u !== "Todas"))].sort(),
    modalidades: [...new Set(all.map((r) => r.Modalidade).filter(Boolean))].sort(),
    campiEscolas: [...new Set(escolas.map((r) => r.Campus).filter((c) => c && c !== "Todas as unidades"))].sort(),
  }
}

export function getDadosCards(): DadosCards {
  const rows = loadCards().sort((a, b) => a.Data.localeCompare(b.Data))
  const cards: CardRow[] = rows.map((r) => ({
    Modalidade: r.Modalidade,
    Inscricoes: r.Inscricoes,
    InscricoesPagas: r.InscricoesPagas,
    Isencao: r.Isencao,
    IsencaoDeferidas: r.IsencaoDeferidas,
    CondicoesEspeciais: r.CondicoesEspeciais,
    CondicoesDeferidas: r.CondicoesDeferidas,
    Data: r.Data,
  }))
  return {
    modalidades: [...new Set(rows.map((r) => r.Modalidade))].sort(),
    rows: cards,
    ultimaData: rows.length ? rows[rows.length - 1].Data : "",
  }
}

const TOTAL = "__TOTAL__"

export function getOverview(unidade?: string, modalidade?: string, curso?: string): OverviewData {
  const dfAll = loadAllData()
  const unidadeSel = unidade && unidade !== TOTAL ? unidade : null
  const modalidadeSel = modalidade && modalidade !== TOTAL ? modalidade : null
  const cursoSel = curso && curso !== TOTAL ? curso : null

  const dfUnidade = unidadeSel ? dfAll.filter((r) => r.Unidade === unidadeSel) : dfAll

  let ultimaData: string | null = null
  if (modalidadeSel) {
    const mod = dfUnidade.filter((r) => r.Modalidade === modalidadeSel)
    ultimaData = mod.length ? mod.reduce((a, b) => (a.Data > b.Data ? a : b)).Data : null
  } else {
    ultimaData = dfAll.length ? dfAll.reduce((a, b) => (a.Data > b.Data ? a : b)).Data : null
  }

  let dfFilter: LinhaCurso[]
  let dfFilterMapa: LinhaCurso[]
  if (modalidadeSel) {
    dfFilter = dfUnidade.filter((r) => r.Modalidade === modalidadeSel && (ultimaData === null || r.Data === ultimaData))
    dfFilterMapa = dfUnidade.filter((r) => r.Modalidade === modalidadeSel)
  } else {
    dfFilter = ultimaColetaPorModalidade(dfUnidade)
    dfFilterMapa = dfUnidade
  }

  if (cursoSel) {
    dfFilter = dfFilter.filter((r) => r.Curso === cursoSel)
    dfFilterMapa = dfFilterMapa.filter((r) => r.Curso === cursoSel)
  }

  const totalInscritos = dfFilter.reduce((s, r) => s + r.Inscritos, 0)
  const modalidadesDisponiveis = [...new Set(dfUnidade.map((r) => r.Modalidade).filter(Boolean))].sort()
  const cursosDisponiveis = [...new Set(dfFilter.map((r) => r.Curso).filter(Boolean))].sort()

  const evolucaoMap = new Map<string, { data: string; modalidade: string; inscritos: number }>()
  for (const r of dfFilterMapa) {
    const k = `${r.Data}|${r.Modalidade}`
    const cur = evolucaoMap.get(k)
    if (cur) cur.inscritos += r.Inscritos
    else evolucaoMap.set(k, { data: r.Data, modalidade: r.Modalidade, inscritos: r.Inscritos })
  }
  const evolucao: PontoEvolucao[] = [...evolucaoMap.values()].sort((a, b) => a.data.localeCompare(b.data))

  const resumo: LinhaResumo[] = dfFilter
    .map((r) => ({
      Unidade: r.Unidade, Curso: r.Curso, Modalidade: r.Modalidade,
      Vagas: r.Vagas, Inscritos: r.Inscritos, "Inscr./Vagas": r["Inscr./Vagas"],
      Homologados: r.Homologados, "Homolog./Vagas": r["Homolog./Vagas"],
      Data: r.Data,
    }))
    .sort((a, b) => b.Inscritos - a.Inscritos)

  // Barras por unidade (última coleta global da seleção)
  const dfUltima = ultimaData ? dfAll.filter((r) => r.Data === ultimaData && r.Unidade !== "Todas") : []
  const barMap = new Map<string, BarrasUnidades>()
  for (const r of dfUltima) {
    const k = `${r.Unidade}|${r.Modalidade}`
    const cur = barMap.get(k)
    if (cur) cur.inscritos += r.Inscritos
    else barMap.set(k, { unidade: r.Unidade, modalidade: r.Modalidade, inscritos: r.Inscritos })
  }
  const barrasUnidades = [...barMap.values()].sort((a, b) => b.inscritos - a.inscritos)

  // Evolução por unidade
  const evolUniMap = new Map<string, PontoEvolucaoUnidade>()
  for (const r of dfAll.filter((x) => x.Unidade !== "Todas")) {
    const k = `${r.Data}|${r.Unidade}`
    const cur = evolUniMap.get(k)
    if (cur) cur.inscritos += r.Inscritos
    else evolUniMap.set(k, { data: r.Data, unidade: r.Unidade, inscritos: r.Inscritos })
  }
  const evolUnidades = [...evolUniMap.values()].sort((a, b) => a.data.localeCompare(b.data))

  return { ultimaData, totalInscritos, evolucao, resumo, barrasUnidades, evolUnidades, modalidadesDisponiveis, cursosDisponiveis }
}

export function getCursos(unidade?: string, modalidade?: string, curso?: string): CursosData {
  const dfAll = loadAllData()
  const unidadeSel = unidade && unidade !== TOTAL ? unidade : null
  const modalidadeSel = modalidade && modalidade !== TOTAL ? modalidade : null
  const cursoSel = curso && curso !== TOTAL ? curso : null

  let dfUnidade = unidadeSel ? dfAll.filter((r) => r.Unidade === unidadeSel) : dfAll
  const modalidadesDisponiveis = [...new Set(dfUnidade.map((r) => r.Modalidade).filter(Boolean))].sort()
  let dfBase = dfUnidade
  if (modalidadeSel) dfBase = dfBase.filter((r) => r.Modalidade === modalidadeSel)

  const ultimaData = dfBase.length ? dfBase.reduce((a, b) => (a.Data > b.Data ? a : b)).Data : null

  const dfUltima = modalidadeSel
    ? dfBase.filter((r) => ultimaData === null || r.Data === ultimaData)
    : ultimaColetaPorModalidade(dfBase)

  let dfSel = cursoSel ? dfUltima.filter((r) => r.Curso === cursoSel) : dfUltima
  dfSel = dfSel.filter((r) => r.Curso !== "Todos")

  const kpis = {
    inscritos: dfSel.reduce((s, r) => s + r.Inscritos, 0),
    homologados: dfSel.reduce((s, r) => s + r.Homologados, 0),
    vagas: dfSel.reduce((s, r) => s + r.Vagas, 0),
    inscrVagas: dfSel.length ? dfSel.reduce((s, r) => s + r["Inscr./Vagas"], 0) / dfSel.length : 0,
  }

  let dfEvol = cursoSel ? dfBase.filter((r) => r.Curso === cursoSel) : dfBase
  const evolMap = new Map<string, { data: string; modalidade: string; inscritos: number }>()
  for (const r of dfEvol) {
    const k = `${r.Data}|${r.Modalidade}`
    const cur = evolMap.get(k)
    if (cur) cur.inscritos += r.Inscritos
    else evolMap.set(k, { data: r.Data, modalidade: r.Modalidade, inscritos: r.Inscritos })
  }
  const evolucao = [...evolMap.values()].sort((a, b) => a.data.localeCompare(b.data))

  const tabela = [...dfSel].sort((a, b) => b.Inscritos - a.Inscritos)

  const cotaCols = Object.keys(COTA_LABELS).filter((c) => c in (dfSel[0] || {})) as (keyof LinhaCurso)[]
  const cotasMap = new Map<string, number>()
  for (const r of dfSel) {
    for (const col of cotaCols) {
      cotasMap.set(col, (cotasMap.get(col) ?? 0) + (r[col] as number))
    }
  }
  const cotas = [...cotasMap.entries()]
    .map(([cota, inscritos]) => ({ cota, inscritos }))
    .sort((a, b) => a.inscritos - b.inscritos)

  const cursosDisponiveis = [...new Set(dfUltima.map((r) => r.Curso).filter(Boolean))].sort()

  return { kpis, evolucao, tabela, cotas, modalidadesDisponiveis, cursosDisponiveis }
}

export function getEscolas(modalidade?: string, campus?: string): EscolasData {
  const escolas = loadEscolas()
  const resumo = loadEscolasResumo()

  const modalidadeSel = modalidade && modalidade !== TOTAL ? modalidade : null
  const campusSel = campus && campus !== TOTAL ? campus : null

  let base = modalidadeSel ? escolas.filter((r) => r.Modalidade === modalidadeSel) : escolas
  if (campusSel) base = base.filter((r) => r.Campus === campusSel)

  const ultimaColeta = base.length ? base.reduce((a, b) => (a.Data > b.Data ? a : b)).Data : null
  const ultima = ultimaColeta ? base.filter((r) => r.Data === ultimaColeta) : []

  const topBase = campusSel ? ultima : ultima.filter((r) => r.Campus === "Todas as unidades")
  const top30 = [...topBase].sort((a, b) => b.Inscritos - a.Inscritos)

  // Donuts (tipo/área/cidade)
  let resumoBase = modalidadeSel ? resumo.filter((r) => r.Modalidade === modalidadeSel) : resumo
  if (campusSel) resumoBase = resumoBase.filter((r) => r.Campus === campusSel)
  const ultimaResumo = resumoBase.length ? resumoBase.reduce((a, b) => (a.Data > b.Data ? a : b)).Data : null
  const resumoUltima = ultimaResumo ? resumoBase.filter((r) => r.Data === ultimaResumo) : []

  const donuts: EscolasData["donuts"] = { tipo: [], area: [], cidade: [] }
  for (const cat of ["tipo", "area", "cidade"] as const) {
    const map = new Map<string, number>()
    for (const r of resumoUltima.filter((x) => x.Categoria === cat)) {
      map.set(r.Label, (map.get(r.Label) ?? 0) + r.Valor)
    }
    let itens = [...map.entries()].map(([label, valor]) => ({ label, valor })).sort((a, b) => b.valor - a.valor)
    if (itens.length > 12) {
      const outros = itens.slice(12).reduce((s, i) => s + i.valor, 0)
      itens = [...itens.slice(0, 12), { label: "Outros", valor: outros }]
    }
    donuts[cat] = itens
  }

  // Evolução das 10 escolas com mais inscrições
  let evolBase = modalidadeSel ? escolas.filter((r) => r.Modalidade === modalidadeSel) : escolas
  if (!campusSel) evolBase = evolBase.filter((r) => r.Campus === "Todas as unidades")
  else evolBase = evolBase.filter((r) => r.Campus === campusSel)

  const evolMap = new Map<string, { data: string; escola: string; inscritos: number }>()
  for (const r of evolBase) {
    const k = `${r.Data}|${r.Escola}`
    const cur = evolMap.get(k)
    if (cur) cur.inscritos += r.Inscritos
    else evolMap.set(k, { data: r.Data, escola: r.Escola, inscritos: r.Inscritos })
  }
  const series = [...evolMap.values()]
  const totais = new Map<string, number>()
  for (const s of series) totais.set(s.escola, (totais.get(s.escola) ?? 0) + s.inscritos)
  const topEscolas = [...totais.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([e]) => e)
  const evolEscolas = series
    .filter((s) => topEscolas.includes(s.escola))
    .sort((a, b) => a.data.localeCompare(b.data))

  return { ultimaColeta, top30, donuts, evolEscolas }
}

export function getModalidadeLabel(code: string): string {
  return MODALIDADE_LABELS[code] ?? code
}

export function logDados(tag: string, msg: string, data?: unknown) {
  log(tag, msg, data)
}
