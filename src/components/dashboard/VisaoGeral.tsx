"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { KpiCard, GradeKpi } from "@/components/dashboard/kpi-cards"
import { ChipBar, SelectField, BotaoFavorito } from "@/components/dashboard/ui-inputs"
import { useDados, useCampusFavorito } from "@/components/dashboard/hooks"
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

  const { campusInicial, alternar, ehAtivo } = useCampusFavorito(meta.unidades)
  useEffect(() => {
    if (campusInicial) setUnidade(campusInicial)
  }, [campusInicial])

  const mudaUnidade = (v: string) => { setUnidade(v); setCurso(TOTAL) }
  const mudaModalidade = (v: string) => { setModalidade(v); setCurso(TOTAL) }

  const opcoesModalidade = dados.data?.modalidadesDisponiveis ?? meta.modalidades
  const opcoesCurso = dados.data?.cursosDisponiveis ?? []

  const linhasCards = [...(cards.data?.rows ?? [])].sort((a, b) => a.Modalidade.localeCompare(b.Modalidade))

  type Kpis = { inscricoes: number; pagas: number; isencao: number; isencaoDeferidas: number; condEspeciais: number; condDeferidas: number }

  let kpis: Kpis = { inscricoes: 0, pagas: 0, isencao: 0, isencaoDeferidas: 0, condEspeciais: 0, condDeferidas: 0 }
  let deltas: Kpis | null = null

  if (linhasCards.length) {
    if (cardMod === TOTAL) {
      const porData = new Map<string, Kpis>()
      for (const r of linhasCards) {
        const cur = porData.get(r.Data) ?? { inscricoes: 0, pagas: 0, isencao: 0, isencaoDeferidas: 0, condEspeciais: 0, condDeferidas: 0 }
        cur.inscricoes += r.Inscricoes
        cur.pagas += r.InscricoesPagas
        cur.isencao += r.Isencao
        cur.isencaoDeferidas += r.IsencaoDeferidas
        cur.condEspeciais += r.CondicoesEspeciais
        cur.condDeferidas += r.CondicoesDeferidas
        porData.set(r.Data, cur)
      }
      const datas = [...porData.keys()].sort()
      const atual = porData.get(datas.at(-1) ?? "")
      const anterior = porData.get(datas.at(-2) ?? "")
      if (atual && anterior) {
        deltas = {
          inscricoes: atual.inscricoes - anterior.inscricoes,
          pagas: atual.pagas - anterior.pagas,
          isencao: atual.isencao - anterior.isencao,
          isencaoDeferidas: atual.isencaoDeferidas - anterior.isencaoDeferidas,
          condEspeciais: atual.condEspeciais - anterior.condEspeciais,
          condDeferidas: atual.condDeferidas - anterior.condDeferidas,
        }
        kpis = atual
      } else if (atual) {
        kpis = atual
      }
    } else {
      const modRows = linhasCards.filter((r) => r.Modalidade === cardMod)
      const atual = modRows.at(-1)
      const anterior = modRows.at(-2)
      if (atual) {
        kpis = {
          inscricoes: atual.Inscricoes, pagas: atual.InscricoesPagas, isencao: atual.Isencao,
          isencaoDeferidas: atual.IsencaoDeferidas, condEspeciais: atual.CondicoesEspeciais,
          condDeferidas: atual.CondicoesDeferidas,
        }
        if (anterior) {
          deltas = {
            inscricoes: atual.Inscricoes - anterior.Inscricoes,
            pagas: atual.InscricoesPagas - anterior.InscricoesPagas,
            isencao: atual.Isencao - anterior.Isencao,
            isencaoDeferidas: atual.IsencaoDeferidas - anterior.IsencaoDeferidas,
            condEspeciais: atual.CondicoesEspeciais - anterior.CondicoesEspeciais,
            condDeferidas: atual.CondicoesDeferidas - anterior.CondicoesDeferidas,
          }
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
              <KpiCard label="Inscrições" value={fmt(kpis.inscricoes)} cor="green" delta={deltas?.inscricoes} />
              <KpiCard label="Inscrições Pagas" value={fmt(kpis.pagas)} cor="blue" delta={deltas?.pagas} />
              <KpiCard label="Solic. de Isenção" value={fmt(kpis.isencao)} cor="orange" delta={deltas?.isencao} />
              <KpiCard label="Isenções Deferidas" value={fmt(kpis.isencaoDeferidas)} cor="purple" delta={deltas?.isencaoDeferidas} />
              {(kpis.condEspeciais > 0 || kpis.condDeferidas > 0) && (
                <>
                  <KpiCard label="Condições Especiais" value={fmt(kpis.condEspeciais)} cor="teal" delta={deltas?.condEspeciais} />
                  <KpiCard label="Condições Deferidas" value={fmt(kpis.condDeferidas)} cor="red" delta={deltas?.condDeferidas} />
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
          <div className="mb-1.5 flex items-center gap-2">
            <p className="text-xs font-medium text-muted-foreground">Campus</p>
            <BotaoFavorito
              ativo={unidade !== TOTAL && ehAtivo(unidade)}
              disabled={unidade === TOTAL}
              rotulo={campusInicial}
              onClick={() => alternar(unidade)}
            />
          </div>
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
