import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn, fmt } from "@/lib/utils"

const CORES_KPI: Record<string, string> = {
  green: "border-l-[#2e7d32]",
  blue: "border-l-[#1565c0]",
  orange: "border-l-[#ef6c00]",
  purple: "border-l-[#6a1b9a]",
  teal: "border-l-[#00838f]",
  red: "border-l-[#c62828]",
}

export function DeltaBadge({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-[#2e7d32]/15 px-1.5 py-0.5 text-[10px] leading-none font-semibold text-[#2e7d32]">
        <TrendingUp className="size-3 shrink-0" aria-hidden />
        +{fmt(delta)}
      </span>
    )
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-[#c62828]/15 px-1.5 py-0.5 text-[10px] leading-none font-semibold text-[#c62828]">
        <TrendingDown className="size-3 shrink-0" aria-hidden />
        {fmt(delta)}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none font-semibold text-muted-foreground">
      <Minus className="size-3 shrink-0" aria-hidden />
      0
    </span>
  )
}

export function KpiCard({
  label, value, cor = "green", delta,
}: { label: string; value: string | number; cor?: string; delta?: number }) {
  return (
    <div className={cn("rounded-xl border-l-[6px] bg-card p-3 shadow-sm ring-1 ring-foreground/10 sm:p-4", CORES_KPI[cor] ?? CORES_KPI.green)}>
      <div className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-2xl leading-tight font-bold sm:text-[28px]">{value}</span>
        {delta !== undefined && <DeltaBadge delta={delta} />}
      </div>
    </div>
  )
}

export function GradeKpi({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">{children}</div>
  )
}
