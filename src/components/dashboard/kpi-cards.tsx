import { cn } from "@/lib/utils"

const CORES_KPI: Record<string, string> = {
  green: "border-l-[#2e7d32]",
  blue: "border-l-[#1565c0]",
  orange: "border-l-[#ef6c00]",
  purple: "border-l-[#6a1b9a]",
  teal: "border-l-[#00838f]",
  red: "border-l-[#c62828]",
}

export function KpiCard({
  label, value, cor = "green",
}: { label: string; value: string | number; cor?: string }) {
  return (
    <div className={cn("rounded-xl border-l-[6px] bg-card p-3 shadow-sm ring-1 ring-foreground/10 sm:p-4", CORES_KPI[cor] ?? CORES_KPI.green)}>
      <div className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="mt-0.5 text-2xl leading-tight font-bold sm:text-[28px]">{value}</div>
    </div>
  )
}

export function GradeKpi({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">{children}</div>
  )
}
