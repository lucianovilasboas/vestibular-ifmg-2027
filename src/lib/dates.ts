const TZ = "America/Sao_Paulo"

export function nowBRT(): string {
  return new Date().toLocaleString("sv", { timeZone: TZ }).replace(" ", "T")
}
