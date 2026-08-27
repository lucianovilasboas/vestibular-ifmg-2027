// Deve espelhar a lista AGENDAS em collector/agenda.py (worker de coleta).
const AGENDAS = ["07:00", "09:00", "11:00", "13:00", "15:00", "17:00", "19:00", "21:00", "22:00"]

const FUSO = "America/Sao_Paulo"

function horaLocal(agora: Date, tz: string): { h: number; m: number } {
  let parte = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(agora)
  if (parte.startsWith("24:")) parte = `00:${parte.slice(3)}`
  const [h, m] = parte.split(":").map(Number)
  return { h, m }
}

export function proximaAtualizacao(agora: Date = new Date(), tz: string = FUSO): string {
  const { h, m } = horaLocal(agora, tz)
  const agoraMin = h * 60 + m
  const slots = AGENDAS.map((a) => {
    const [hh, mm] = a.split(":").map(Number)
    return { texto: a, min: hh * 60 + mm }
  })
  const proximo = slots.find((s) => s.min > agoraMin) ?? slots[0]
  const ehHoje = slots.some((s) => s.min > agoraMin)
  return `${ehHoje ? "hoje" : "amanhã"} às ${proximo.texto}`
}