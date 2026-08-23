"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { getCampusFavorito, setCampusFavorito, campusIgual } from "@/lib/favorito"

export function useDados<T>(view: string, params: Record<string, string | undefined>, versao?: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      qs.set("view", view)
      for (const [k, v] of Object.entries(params)) {
        if (v && v !== "__TOTAL__") qs.set(k, v)
      }
      const res = await fetch(`/api/dados?${qs.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados")
    } finally {
      setLoading(false)
    }
  }, [view, JSON.stringify(params), versao])

  useEffect(() => {
    carregar()
  }, [carregar])

  return { data, loading, error, recarregar: carregar }
}

export function useCampusFavorito(opcoes: string[]) {
  const [favorito, setFavorito] = useState<string | null>(null)

  useEffect(() => {
    setFavorito(getCampusFavorito())
  }, [])

  const campusInicial = useMemo(() => {
    if (!favorito) return null
    return opcoes.find((o) => campusIgual(o, favorito)) ?? null
  }, [favorito, opcoes])

  const alternar = (campus: string) => {
    if (campusIgual(campus, favorito ?? "")) {
      setCampusFavorito(null)
      setFavorito(null)
    } else {
      setCampusFavorito(campus)
      setFavorito(campus)
    }
  }

  const ehAtivo = (campus: string) => !!favorito && campusIgual(campus, favorito)

  return { favorito, campusInicial, alternar, ehAtivo }
}
