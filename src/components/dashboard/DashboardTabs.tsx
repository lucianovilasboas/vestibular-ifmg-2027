"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { VisaoGeral } from "./VisaoGeral"
import { PorCurso } from "./PorCurso"
import { PorEscola } from "./PorEscola"
import { cn } from "@/lib/utils"
import type { MetaDados } from "@/types"

const TABS = [
  { id: "geral", emoji: "📊", rotulo: "Visão Geral" },
  { id: "curso", emoji: "🎓", rotulo: "Por Curso" },
  { id: "escola", emoji: "🏫", rotulo: "Por Escola" },
]

const INTERVALO_SYNC = 30_000

export function DashboardTabs({ meta }: { meta: MetaDados }) {
  const [tab, setTab] = useState("geral")
  const [versao, setVersao] = useState(meta.ultimaAtualizacao)
  const versaoRef = useRef(meta.ultimaAtualizacao)
  const router = useRouter()

  useEffect(() => {
    versaoRef.current = versao
  }, [versao])

  useEffect(() => {
    const checar = async () => {
      try {
        const res = await fetch("/api/dados?view=meta")
        if (!res.ok) return
        const j = await res.json()
        if (j.ultimaAtualizacao && j.ultimaAtualizacao !== versaoRef.current) {
          versaoRef.current = j.ultimaAtualizacao
          setVersao(j.ultimaAtualizacao)
          router.refresh()
        }
      } catch {
        /* rede indisponível — ignora */
      }
    }
    const id = setInterval(checar, INTERVALO_SYNC)
    return () => clearInterval(id)
  }, [router])

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4">
      <nav className="sticky top-14 z-40 -mx-3 border-b bg-background/95 backdrop-blur sm:top-16 sm:-mx-4">
        <div className="flex gap-1 overflow-x-auto px-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={cn(
                "flex h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors",
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="text-base leading-none">{t.emoji}</span>
              {t.rotulo}
            </button>
          ))}
        </div>
      </nav>

      <div className="py-4 sm:py-6">
        {tab === "geral" && <VisaoGeral meta={meta} versao={versao ?? undefined} />}
        {tab === "curso" && <PorCurso meta={meta} versao={versao ?? undefined} />}
        {tab === "escola" && <PorEscola meta={meta} versao={versao ?? undefined} />}
      </div>
    </div>
  )
}
