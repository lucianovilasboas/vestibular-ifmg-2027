"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { KpiCard, GradeKpi } from "@/components/dashboard/kpi-cards"
import { ChipBar, SelectField, BotaoFavorito } from "@/components/dashboard/ui-inputs"
import { useDados, useCampusFavorito } from "@/components/dashboard/hooks"
import { GraficoEvolucao, GraficoBarrasHorizontais } from "@/components/dashboard/graficos"
import { fmt } from "@/lib/utils"
import { MODALIDADE_LABELS, COTA_LABELS } from "@/types"
import type { MetaDados, CursosData } from "@/types"

const TOTAL = "__TOTAL__"

export function PorCurso({ meta, versao }: { meta: MetaDados; versao?: string }) {
  const [unidade, setUnidade] = useState(TOTAL)
  const [modalidade, setModalidade] = useState(TOTAL)
  const [curso, setCurso] = useState(TOTAL)

  const dados = useDados<CursosData>("cursos", { unidade, modalidade, curso }, versao)

  const { campusInicial, alternar, ehAtivo } = useCampusFavorito(meta.unidades)
  useEffect(() => {
    if (campusInicial) setUnidade(campusInicial)
  }, [campusInicial])

  const mudaUnidade = (v: string) => { setUnidade(v); setCurso(TOTAL) }
  const mudaModalidade = (v: string) => { setModalidade(v); setCurso(TOTAL) }

  const opcoesModalidade = dados.data?.modalidadesDisponiveis ?? meta.modalidades
  const opcoesCurso = dados.data?.cursosDisponiveis ?? []

  const cotas = dados.data?.cotas ?? []

  return (
    <div className="space-y-5">
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
          <SelectField label="Curso" options={opcoesCurso} value={curso} onChange={setCurso} />
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
          <GradeKpi>
            <KpiCard label="Inscritos" value={fmt(dados.data.kpis.inscritos)} cor="green" />
            <KpiCard label="Homologados" value={fmt(dados.data.kpis.homologados)} cor="blue" />
            <KpiCard label="Vagas" value={fmt(dados.data.kpis.vagas)} cor="orange" />
            <KpiCard label="Inscr./Vagas" value={dados.data.kpis.inscrVagas.toFixed(2)} cor="purple" />
          </GradeKpi>

          <Separator />

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

          {cotas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Reserva de Vagas por Cota (opção 1)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <GraficoBarrasHorizontais
                  data={cotas.map((c) => ({ cota: COTA_LABELS[c.cota] ?? c.cota, inscritos: c.inscritos }))}
                  altura={Math.max(340, cotas.length * 44 + 60)}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
