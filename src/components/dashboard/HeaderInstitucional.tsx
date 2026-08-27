"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Clock, RefreshCw } from "lucide-react"
import { proximaAtualizacao } from "@/lib/agenda"

const INTERVALO = 30_000

export function HeaderInstitucional({ ultimaAtualizacao }: { ultimaAtualizacao: string | null }) {
  const [proxima, setProxima] = useState<string>(() => proximaAtualizacao())

  useEffect(() => {
    const id = setInterval(() => setProxima(proximaAtualizacao()), INTERVALO)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="bg-gradient-to-r from-[#0f2e24] via-[#1a4a38] to-[#2e7d32] shadow-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2.5 px-3 sm:h-16 sm:gap-3 sm:px-4">
          <Image
            src="/vestibular-2027-imagem.png"
            alt="IFMG 2027"
            width={44}
            height={44}
            priority
            className="h-10 w-auto rounded-md border border-white/25 bg-white/10 sm:h-12"
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm leading-tight font-bold text-white sm:text-lg">
              Processo Seletivo IFMG 2027
            </h1>
            <p className="hidden text-xs text-white/80 sm:block">
              Acompanhamento de inscrições em tempo real
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="flex items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1.5 text-[10px] text-white/90 sm:text-xs">
              <RefreshCw className="size-3 shrink-0" />
              <span className="hidden sm:inline">Última atualização: </span>
              <span className="font-medium whitespace-nowrap">{ultimaAtualizacao ?? "—"}</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1.5 text-[10px] text-white/90 sm:text-xs">
              <Clock className="size-3 shrink-0" />
              <span className="hidden sm:inline">Próxima atualização: </span>
              <span className="font-medium whitespace-nowrap">{proxima}</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
