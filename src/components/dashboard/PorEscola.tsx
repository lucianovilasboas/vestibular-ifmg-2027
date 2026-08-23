"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ChipBar, BotaoFavorito } from "@/components/dashboard/ui-inputs"
import { useDados, useCampusFavorito } from "@/components/dashboard/hooks"
import { GraficoEvolucao, GraficoBarrasHorizontais, GraficoDonut, formataDataCompleta } from "@/components/dashboard/graficos"
import { TabelaEscolas } from "@/components/dashboard/tabelas"
import { fmt } from "@/lib/utils"
import { MODALIDADE_LABELS } from "@/types"
import type { MetaDados, EscolasData, PontoEvolucao } from "@/types"

const TOTAL = "__TOTAL__"

export function PorEscola({ meta, versao }: { meta: MetaDados; versao?: string }) {
  const [modalidade, setModalidade] = useState(TOTAL)
  const [campus, setCampus] = useState(TOTAL)

  const dados = useDados<EscolasData>("escolas", { modalidade, campus }, versao)

  const opcoesModalidade = meta.modalidades
  const opcoesCampus = meta.campiEscolas

  const { campusInicial, alternar, ehAtivo } = useCampusFavorito(meta.campiEscolas)
  useEffect(() => {
    if (campusInicial) setCampus(campusInicial)
  }, [campusInicial])

  const top30 = dados.data?.top30 ?? []
  const donuts = dados.data?.donuts ?? { tipo: [], area: [], cidade: [] }

  const evolEscolas = (dados.data?.evolEscolas ?? []).map<PontoEvolucao>((p) => ({
    data: p.data, inscritos: p.inscritos, modalidade: p.escola,
  }))

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Modalidade (escolas)</p>
          <ChipBar
            options={opcoesModalidade.map((m) => MODALIDADE_LABELS[m] ?? m)}
            value={modalidade === TOTAL ? TOTAL : MODALIDADE_LABELS[modalidade] ?? modalidade}
            onChange={(v) => setModalidade(v === TOTAL ? TOTAL : Object.keys(MODALIDADE_LABELS).find((k) => (MODALIDADE_LABELS[k] ?? k) === v) ?? v)}
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <p className="text-xs font-medium text-muted-foreground">Campus</p>
            <BotaoFavorito
              ativo={campus !== TOTAL && ehAtivo(campus)}
              disabled={campus === TOTAL}
              onClick={() => alternar(campus)}
            />
          </div>
          <ChipBar options={opcoesCampus} value={campus} onChange={setCampus} />
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
            Última coleta:{" "}
            <span className="font-medium text-foreground">
              {dados.data.ultimaColeta ? formataDataCompleta(dados.data.ultimaColeta) : "—"}
            </span>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Top 30 Escolas de Origem</CardTitle>
              <span className="text-sm font-semibold text-foreground">
                {fmt(top30.reduce((s, r) => s + r.Inscritos, 0))} inscrições
              </span>
            </CardHeader>
            <CardContent>
              {top30.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">Sem dados para exibir.</p>
              )}

              {/* Lista de cards (mobile) */}
              <ol className="space-y-2 lg:hidden">
                {top30.map((r, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.Escola}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.Cidade}{r.Tipo ? ` · ${r.Tipo}` : ""}{r.Area ? ` · ${r.Area}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold">{fmt(r.Inscritos)}</span>
                  </li>
                ))}
              </ol>

              {/* Gráfico (desktop) */}
              <div className="hidden space-y-4 lg:block">
                {top30.length > 0 && (
                  <GraficoBarrasHorizontais
                    data={top30.map((r) => ({ Escola: r.Escola, Inscritos: r.Inscritos }))}
                    altura={Math.max(600, top30.length * 24 + 60)}
                    cor="#2e7d32"
                    xKey="Inscritos"
                    yKey="Escola"
                    rotulo="Inscritos"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Donuts */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Tipo, Área e Cidade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <GraficoDonut data={donuts.tipo} titulo="Por Tipo" />
                <GraficoDonut data={donuts.area} titulo="Por Área" />
                <GraficoDonut data={donuts.cidade} titulo="Por Cidade" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evolução das 10 Escolas com mais Inscrições</CardTitle>
            </CardHeader>
            <CardContent>
              {evolEscolas.length
                ? <GraficoEvolucao data={evolEscolas} altura={420} />
                : <p className="py-6 text-center text-sm text-muted-foreground">Sem dados para exibir.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tabela de Escolas (última coleta)</CardTitle>
            </CardHeader>
            <CardContent>
              {top30.length
                ? <TabelaEscolas linhas={top30} comCampus={campus === TOTAL} />
                : <p className="py-6 text-center text-sm text-muted-foreground">Sem dados para exibir.</p>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
