import { NextRequest, NextResponse } from "next/server"
import {
  getMeta, getDadosCards, getOverview, getCursos, getEscolas,
} from "@/lib/dados"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const view = sp.get("view") || "meta"

  try {
    switch (view) {
      case "meta": {
        return NextResponse.json(getMeta())
      }
      case "cards": {
        return NextResponse.json(getDadosCards())
      }
      case "overview": {
        const data = getOverview(
          sp.get("unidade") || undefined,
          sp.get("modalidade") || undefined,
          sp.get("curso") || undefined,
        )
        return NextResponse.json(data)
      }
      case "cursos": {
        const data = getCursos(
          sp.get("unidade") || undefined,
          sp.get("modalidade") || undefined,
          sp.get("curso") || undefined,
        )
        return NextResponse.json(data)
      }
      case "escolas": {
        const data = getEscolas(
          sp.get("modalidade") || undefined,
          sp.get("campus") || undefined,
        )
        return NextResponse.json(data)
      }
      default:
        return NextResponse.json({ error: "view inválida" }, { status: 400 })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
