"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { KpiCard, GradeKpi } from "@/components/dashboard/kpi-cards"
import { ChipBar, SelectField } from "@/components/dashboard/ui-inputs"
import { useDados } from "@/components/dashboard/hooks"
import { GraficoEvolucao, GraficoBarrasAgrupadas } from "@/components/dashboard/graficos"
import { TabelaResumo } from "@/components/dashboard/tabelas"
import { fmt } from "@/lib/utils"
import { MODALIDADE_LABELS } from "@/types"
import type { MetaDados, DadosCards, OverviewData, PontoEvolucao } from "@/types"

const TOTAL = "__TOTAL__"

export function VisaoGeral({ meta, versao }: { meta: MetaDados; versao?: string }) {
  const [unidade, setUnidade] = useState(TOTAL)
  const [modalidade, setModalidade] = useState(TOTAL)
  const [curso, setCurso] = useState(TOTAL)
  const [cardMod, setCardMod] = useState(TOTAL)

  const cards = useDados<DadosCards>("cards", {}, versao)
  const dados = useDados<OverviewData>("overview", { unidade, modalidade, curso }, versao)

  const mudaUnidade = (v: string) => { setUnidade(v); setCurso(TOTAL) }
  const mudaModalidade = (v: string) => { setModalidade(v); setCurso(TOTAL) }

  const opcoesModalidade = dados.data?.modalidadesDisponiveis ?? meta.modalidades
  const opcoesCurso = dados.data?.cursosDisponiveis ?? []

  const linhasCards = [...(cards.data?.rows ?? [])].sort((a, b) => a.Modalidade.localeCompare(b.Modalidade))

  let kpis = { inscricoes: 0, pagas: 0, isencao: 0, isencaoDeferidas: 0, condEspeciais: 0, condDeferidas: 0 }
  if (linhasCards.length) {
    if (cardMod === TOTAL) {
      const ultimaData = linhasCards.reduce((a, b) => (a.Data > b.Data ? a : b)).Data
      const naUltima = linhasCards.filter((r) => r.Data === ultimaData)
      kpis = {
        inscricoes: naUltima.reduce((s, r) => s + r.Inscricoes, 0),
        pagas: naUltima.reduce((s, r) => s + r.InscricoesPagas, 0),
        isencao: naUltima.reduce((s, r) => s + r.Isencao, 0),
        isencaoDeferidas: naUltima.reduce((s, r) => s + r.IsencaoDeferidas, 0),
        condEspeciais: naUltima.reduce((s, r) => s + r.CondicoesEspeciais, 0),
        condDeferidas: naUltima.reduce((s, r) => s + r.CondicoesDeferidas, 0),
      }
    } else {
      const modRows = linhasCards.filter((r) => r.Modalidade === cardMod)
      const row = modRows.at(-1)
      if (row) {
        kpis = {
          inscricoes: row.Inscricoes, pagas: row.InscricoesPagas, isencao: row.Isencao,
          isencaoDeferidas: row.IsencaoDeferidas, condEspeciais: row.CondicoesEspeciais,
          condDeferidas: row.CondicoesDeferidas,
        }
      }
    }
  }

  const evolUnidades = (dados.data?.evolUnidades ?? []).map<PontoEvolucao>((p) => ({
    data: p.data, inscritos: p.inscritos, modalidade: p.unidade,
  }))

  return (
    <div className="space-y-5">
      {/* Cards institucionais */}
      {linhasCards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Painel Institucional — IFMG 2027</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-end gap-2">
              <SelectField
                label="Modalidade dos cards:"
                options={cards.data?.modalidades ?? []}
                value={cardMod}
                onChange={setCardMod}
                allLabel="Total"
              />
            </div>
            <GradeKpi>
              <KpiCard label="Inscrições" value={fmt(kpis.inscricoes)} cor="green" />
              <KpiCard label="Inscrições Pagas" value={fmt(kpis.pagas)} cor="blue" />
              <KpiCard label="Solic. de Isenção" value={fmt(kpis.isencao)} cor="orange" />
              <KpiCard label="Isenções Deferidas" value={fmt(kpis.isencaoDeferidas)} cor="purple" />
              {(kpis.condEspeciais > 0 || kpis.condDeferidas > 0) && (
                <>
                  <KpiCard label="Condições Especiais" value={fmt(kpis.condEspeciais)} cor="teal" />
                  <KpiCard label="Condições Deferidas" value={fmt(kpis.condDeferidas)} cor="red" />
                </>
              )}
            </GradeKpi>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Filtros */}
      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Campus</p>
          <ChipBar options={meta.unidades} value={unidade} onChange={mudaUnidade} />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Modalidade</p>
          <ChipBar
            options={opcoesModalidade.map((m) => MODALIDADE_LABELS[m] ?? m)}
            value={modalidade === TOTAL ? TOTAL : MODALIDADE_LABELS[modalidade] ?? modalidade}
            onChange={(v) => mudaModalidade(v === TOTAL ? TOTAL : Object.keys(MODALIDADE_LABELS).find((k) => (MODALIDADE_LABELS[k] ?? k) === v) ?? v)}
          />
        </div>
        <div className="flex gap-3">
          <SelectField
            label="Curso"
            options={opcoesCurso}
            value={curso}
            onChange={setCurso}
          />
        </div>
      </div>

      {dados.loading && (
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando dados...</p>
      )}
      {dados.error && (
        <p className="py-10 text-center text-sm text-destructive">Erro ao carregar: {dados.error}</p>
      )}

      {!dados.loading && !dados.error && dados.data && (
        <>
          <div className="rounded-lg bg-muted/60 px-4 py-2.5 text-xs text-muted-foreground sm:text-sm">
            <span className="font-medium text-foreground">
              {unidade === TOTAL ? "IFMG — Total" : unidade} ·{" "}
              {modalidade === TOTAL ? "Todas as Modalidades" : MODALIDADE_LABELS[modalidade] ?? modalidade} ·{" "}
              {curso === TOTAL ? "Todos os cursos" : curso}
            </span>{" "}
            · <strong>Total de inscrições: {fmt(dados.data.totalInscritos)}</strong>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Evolução das Inscrições</CardTitle>
            </CardHeader>
            <CardContent>
              {dados.data.evolucao.length
                ? <GraficoEvolucao data={dados.data.evolucao} />
                : <p className="py-6 text-center text-sm text-muted-foreground">Sem dados para exibir.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evolução das Inscrições por Unidade</CardTitle>
            </CardHeader>
            <CardContent>
              {evolUnidades.length
                 ? <GraficoEvolucao data={evolUnidades} altura={600} />
                : <p className="py-6 text-center text-sm text-muted-foreground">Sem dados para exibir.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comparativo de Inscrições por Unidade</CardTitle>
            </CardHeader>
            <CardContent>
              {dados.data.barrasUnidades.length
                ? <GraficoBarrasAgrupadas data={dados.data.barrasUnidades} />
                : <p className="py-6 text-center text-sm text-muted-foreground">Sem dados para exibir.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumo dos dados</CardTitle>
            </CardHeader>
            <CardContent>
              <TabelaResumo linhas={dados.data.resumo} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
