"use client"

import { cn } from "@/lib/utils"

export function ChipBar({
  options, value, onChange, allLabel = "Total",
}: {
  options: string[]
  value: string
  onChange: (v: string) => void
  allLabel?: string
}) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-x-visible">
      <button
        type="button"
        onClick={() => onChange("__TOTAL__")}
        className={cn(
          "h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors",
          value === "__TOTAL__"
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-foreground hover:bg-muted"
        )}
      >
        {allLabel}
      </button>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors",
            value === o
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:bg-muted"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

export function SelectField({
  label, options, value, onChange, allLabel = "Total",
}: {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
  allLabel?: string
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <select
        className="h-10 w-full min-w-0 rounded-lg border border-input bg-card px-2.5 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="__TOTAL__">{allLabel}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}
