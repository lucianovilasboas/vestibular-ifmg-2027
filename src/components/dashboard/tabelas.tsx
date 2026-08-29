"use client"

import { useState } from "react"
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table"
import { cn, fmt } from "@/lib/utils"
import { DeltaBadge } from "@/components/dashboard/kpi-cards"
import type { LinhaResumo, LinhaEscola, LinhaEscolaTop } from "@/types"
import { MODALIDADE_LABELS } from "@/types"

interface Ordenacao {
  chave: string
  dir: "asc" | "desc"
}

function CabecalhoOrdenavel({
  rotulo, chave, ordenacao, aoOrdenar, alinharDireita,
}: {
  rotulo: string
  chave: string
  ordenacao: Ordenacao
  aoOrdenar: (chave: string) => void
  alinharDireita?: boolean
}) {
  const ativo = ordenacao.chave === chave
  const Icone = ativo ? (ordenacao.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <button
      type="button"
      onClick={() => aoOrdenar(chave)}
      aria-label={`Ordenar por ${rotulo}`}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded px-1.5 -my-1 text-foreground transition-colors hover:bg-muted active:bg-muted",
        alinharDireita ? "ml-auto" : "ml-0",
        ativo && "text-primary"
      )}
    >
      <span>{rotulo}</span>
      <Icone className="size-3.5 shrink-0" />
    </button>
  )
}

function useOrdenacao(chaveInicial: string, dirInicial: "asc" | "desc" = "desc") {
  const [ordenacao, setOrdenacao] = useState<Ordenacao>({ chave: chaveInicial, dir: dirInicial })

  const aoOrdenar = (chave: string) => {
    setOrdenacao((o) => o.chave === chave
      ? { chave, dir: o.dir === "asc" ? "desc" : "asc" }
      : { chave, dir: "desc" })
  }

  return { ordenacao, aoOrdenar }
}

const COLUNAS_RESUMO = [
  { chave: "Unidade", rotulo: "Unidade", tipo: "texto" },
  { chave: "Curso", rotulo: "Curso", tipo: "texto" },
  { chave: "Modalidade", rotulo: "Modalidade", tipo: "texto" },
  { chave: "Vagas", rotulo: "Vagas", tipo: "numero", direita: true },
  { chave: "Inscritos", rotulo: "Inscritos", tipo: "numero", direita: true },
  { chave: "Inscr./Vagas", rotulo: "Inscr./Vagas", tipo: "numero", direita: true },
  { chave: "Homologados", rotulo: "Homologados", tipo: "numero", direita: true },
  { chave: "Homolog./Vagas", rotulo: "Homolog./Vagas", tipo: "numero", direita: true },
  { chave: "Data", rotulo: "Data", tipo: "texto" },
]

export function TabelaResumo({ linhas }: { linhas: LinhaResumo[] }) {
  const { ordenacao, aoOrdenar } = useOrdenacao("Inscritos")

  const linhasOrdenadas = [...linhas].sort((a, b) => {
    const col = COLUNAS_RESUMO.find((c) => c.chave === ordenacao.chave)
    const va = a[ordenacao.chave as keyof LinhaResumo]
    const vb = b[ordenacao.chave as keyof LinhaResumo]
    const cmp = col?.tipo === "numero"
      ? Number(va) - Number(vb)
      : String(va).localeCompare(String(vb), "pt-BR")
    return ordenacao.dir === "asc" ? cmp : -cmp
  })

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {COLUNAS_RESUMO.map((col) => (
            <TableHead key={col.chave} className={col.direita ? "text-right" : undefined}>
              <CabecalhoOrdenavel
                rotulo={col.rotulo}
                chave={col.chave}
                ordenacao={ordenacao}
                aoOrdenar={aoOrdenar}
                alinharDireita={col.direita}
              />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {linhasOrdenadas.map((r, i) => (
          <TableRow key={i}>
            <TableCell>{r.Unidade}</TableCell>
            <TableCell className="max-w-[260px] truncate">{r.Curso}</TableCell>
            <TableCell>{MODALIDADE_LABELS[r.Modalidade] ?? r.Modalidade}</TableCell>
            <TableCell className="text-right">{fmt(r.Vagas)}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(r.Inscritos)}</TableCell>
            <TableCell className="text-right">{r["Inscr./Vagas"].toFixed(2)}</TableCell>
            <TableCell className="text-right">{fmt(r.Homologados)}</TableCell>
            <TableCell className="text-right">{r["Homolog./Vagas"].toFixed(2)}</TableCell>
            <TableCell>{r.Data.slice(0, 16)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

const COLUNAS_ESCOLAS = [
  { chave: "Rank", rotulo: "Rank", tipo: "numero" },
  { chave: "Campus", rotulo: "Campus", tipo: "texto" },
  { chave: "Escola", rotulo: "Escola", tipo: "texto" },
  { chave: "Cidade", rotulo: "Cidade", tipo: "texto" },
  { chave: "Tipo", rotulo: "Tipo", tipo: "texto" },
  { chave: "Area", rotulo: "Área", tipo: "texto" },
  { chave: "Inscritos", rotulo: "Inscritos", tipo: "numero", direita: true },
]

export function TabelaEscolas({ linhas, comCampus }: { linhas: LinhaEscolaTop[]; comCampus: boolean }) {
  const { ordenacao, aoOrdenar } = useOrdenacao("Inscritos")

  const linhasOrdenadas = [...linhas].sort((a, b) => {
    const col = COLUNAS_ESCOLAS.find((c) => c.chave === ordenacao.chave)
    const va = a[ordenacao.chave as keyof LinhaEscola]
    const vb = b[ordenacao.chave as keyof LinhaEscola]
    const cmp = col?.tipo === "numero"
      ? Number(va ?? 0) - Number(vb ?? 0)
      : String(va ?? "").localeCompare(String(vb ?? ""), "pt-BR")
    return ordenacao.dir === "asc" ? cmp : -cmp
  })

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {COLUNAS_ESCOLAS.filter((c) => c.chave !== "Campus" || comCampus).map((col) => (
            <TableHead key={col.chave} className={col.direita ? "text-right" : undefined}>
              <CabecalhoOrdenavel
                rotulo={col.rotulo}
                chave={col.chave}
                ordenacao={ordenacao}
                aoOrdenar={aoOrdenar}
                alinharDireita={col.direita}
              />
            </TableHead>
          ))}
          <TableHead className="text-right">Crescimento</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {linhasOrdenadas.map((r, i) => (
          <TableRow key={i}>
            <TableCell>{r.Rank ?? "—"}</TableCell>
            {comCampus && <TableCell>{r.Campus}</TableCell>}
            <TableCell className="max-w-[300px] truncate">{r.Escola}</TableCell>
            <TableCell>{r.Cidade}</TableCell>
            <TableCell>{r.Tipo}</TableCell>
            <TableCell>{r.Area}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(r.Inscritos)}</TableCell>
            <TableCell className="text-right">
              {r.delta !== null && <DeltaBadge delta={r.delta} />}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
