"use client"

import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts"
import type { PontoEvolucao, BarrasUnidades } from "@/types"
import { MODALIDADE_LABELS } from "@/types"

const CORES = ["#2e7d32", "#1565c0", "#ef6c00"]
const CORES_DONUT = ["#2e7d32", "#66bb6a", "#a5d6a7", "#1565c0", "#ef6c00", "#6a1b9a",
  "#00838f", "#c62828", "#f9a825", "#5d4037", "#455a64", "#7b1fa2"]

export function formataDataEixo(data: string): string {
  const [d] = String(data).split(" ")
  const [y, m, day] = d.split("-")
  return `${day}/${m}`
}

export function formataDataCompleta(data: string): string {
  const [d, t] = String(data).split(" ")
  const [y, m, day] = d.split("-")
  return `${day}/${m}/${y}${t ? ` ${t}` : ""}`
}

function fmtEixo(v: number): string {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`
  return String(v)
}

function formataTsEixo(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dia = String(d.getDate()).padStart(2, "0")
  return formataDataEixo(`${y}-${m}-${dia}`)
}

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid hsl(155 15% 85%)",
  fontSize: 13,
  fontFamily: "inherit",
}

interface ItemTooltip {
  name?: string
  value?: number | string
  color?: string
  stroke?: string
  dataKey?: string | number
  payload?: { _ord?: string }
}

function TooltipEvolucao({ active, payload, label, multi }: {
  active?: boolean
  payload?: ItemTooltip[]
  label?: string | number
  multi: boolean
}) {
  if (!active || !payload || payload.length === 0) return null
  const titulo = payload[0]?.payload?._ord
  return (
    <div style={{
      backgroundColor: "var(--popover)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      boxShadow: "0 8px 24px oklch(0 0 0 / 0.08)",
      padding: "10px 12px",
      fontFamily: "inherit",
      fontSize: 13,
      minWidth: 170,
    }}>
      <p style={{ margin: "0 0 8px", fontWeight: 700, color: "var(--popover-foreground)" }}>
        {titulo ? formataDataCompleta(titulo) : String(label ?? "")}
      </p>
      {payload.filter((item) => Number.isFinite(Number(item.value))).map((item) => {
        const cor = item.stroke ?? item.color ?? "#2e7d32"
        return (
          <div key={String(item.dataKey)} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: cor, flexShrink: 0 }} />
            <span style={{ flex: 1, color: "var(--muted-foreground)" }}>{item.name}</span>
            <span style={{ fontWeight: 700, color: "var(--popover-foreground)", fontVariantNumeric: "tabular-nums" }}>
              {Number(item.value ?? 0).toLocaleString("pt-BR")}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function GraficoEvolucao({ data, altura = 320 }: { data: PontoEvolucao[]; altura?: number }) {
  const mods = [...new Set(data.map((d) => d.modalidade).filter(Boolean) as string[])]
  const multi = mods.length > 1

  const porTs = new Map<number, Record<string, number | string>>()
  for (const p of data) {
    const ts = Date.parse(p.data.replace(" ", "T"))
    const entry = porTs.get(ts) ?? { _ord: p.data, _ts: ts }
    if (multi && p.modalidade) entry[p.modalidade] = ((entry[p.modalidade] as number) || 0) + p.inscritos
    else entry.__total = ((entry.__total as number) || 0) + p.inscritos
    porTs.set(ts, entry)
  }
  const chartData = [...porTs.values()].sort((a, b) => Number(a._ts) - Number(b._ts))

  const series = multi
    ? mods.map((m, i) => ({ key: m, cor: CORES[i % CORES.length] }))
    : [{ key: "__total", cor: "#2e7d32" }]

  return (
    <div className="legend-evolucao">
      <ResponsiveContainer width="100%" height={altura}>
        <LineChart data={chartData} margin={{ left: 0, right: 16, top: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(155 15% 90%)" />
          <XAxis
            dataKey="_ts"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickCount={6}
            minTickGap={24}
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => formataTsEixo(v)}
          />
          <YAxis tick={{ fontSize: 11 }} width={44} tickFormatter={(v: number) => fmtEixo(v)} />
          <Tooltip content={<TooltipEvolucao multi={multi} />} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }}
          iconType="plainline" />
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key}
            name={multi ? (MODALIDADE_LABELS[s.key] ?? s.key) : "Inscrições"}
            stroke={s.cor} strokeWidth={3} connectNulls
            dot={{ r: 3, fill: "#ffffff", strokeWidth: 2, stroke: s.cor }}
            activeDot={{ r: 6, fill: s.cor, stroke: "#ffffff", strokeWidth: 2 }}
            animationDuration={800} animationEasing="ease-out" />
        ))}
      </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function GraficoBarrasAgrupadas({ data, altura = 600 }: { data: BarrasUnidades[]; altura?: number }) {
  const mods = [...new Set(data.map((d) => d.modalidade))]
  const porUni = new Map<string, Record<string, number>>()
  for (const d of data) {
    const entry = porUni.get(d.unidade) ?? {}
    entry[d.modalidade] = (entry[d.modalidade] ?? 0) + d.inscritos
    porUni.set(d.unidade, entry)
  }
  const chartData = [...porUni.entries()].map(([unidade, v]) => ({ unidade, ...v }))

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <ResponsiveContainer width="100%" height={altura}>
          <BarChart data={chartData} margin={{ left: 0, right: 10, top: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(155 15% 90%)" />
            <XAxis dataKey="unidade" angle={-35} textAnchor="end" interval={0} height={90} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => fmtEixo(v)} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number, name: string) => [value.toLocaleString("pt-BR"), MODALIDADE_LABELS[name] ?? name]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {mods.map((m, i) => (
              <Bar key={m} dataKey={m} name={m} fill={CORES[i % CORES.length]} radius={[6, 6, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function GraficoBarrasHorizontais({
  data, altura, cor = "#2e7d32", xKey = "inscritos", yKey = "cota", rotulo = "Inscritos",
}: {
  data: Record<string, string | number>[]
  altura: number
  cor?: string
  xKey?: string
  yKey?: string
  rotulo?: string
}) {
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 30, top: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(155 15% 90%)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => fmtEixo(v)} />
        <YAxis type="category" dataKey={yKey} width={170} tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number) => [value.toLocaleString("pt-BR"), rotulo]}
        />
        <Bar dataKey={xKey} name={rotulo} fill={cor} radius={[0, 6, 6, 0]} barSize={22} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function GraficoDonut({
  data, altura = 300, titulo,
}: { data: { label: string; valor: number }[]; altura?: number; titulo: string }) {
  if (data.length === 0) return null
  const total = data.reduce((s, d) => s + d.valor, 0)
  return (
    <div>
      <p className="mb-1 text-center text-sm font-semibold text-foreground">{titulo}</p>
      <ResponsiveContainer width="100%" height={altura}>
        <PieChart>
          <Pie
            data={data} dataKey="valor" nameKey="label" cx="50%" cy="50%"
            innerRadius={55} outerRadius={90} paddingAngle={1.5} strokeWidth={0}
          >
            {data.map((e) => <Cell key={e.label} fill={CORES_DONUT[data.indexOf(e) % CORES_DONUT.length]} />)}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number, name: string) => [
              `${value.toLocaleString("pt-BR")} (${total ? Math.round((value / total) * 100) : 0}%)`,
              name,
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
