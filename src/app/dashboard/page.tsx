import { HeaderInstitucional } from "@/components/dashboard/HeaderInstitucional"
import { DashboardTabs } from "@/components/dashboard/DashboardTabs"
import { getMeta } from "@/lib/dados"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const meta = getMeta()

  return (
    <div className="pt-14 sm:pt-16">
      <HeaderInstitucional ultimaAtualizacao={meta.ultimaAtualizacao} />
      <main className="pb-10">
        <DashboardTabs meta={meta} />
      </main>
      <footer className="border-t bg-muted/40 py-4 text-center text-xs text-muted-foreground">
        Desenvolvido por Luciano Espiridiao — luciano.espiridiao@ifmg.edu.br · 2025 · Todos os direitos reservados.
      </footer>
    </div>
  )
}
