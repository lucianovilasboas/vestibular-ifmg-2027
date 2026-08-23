const CHAVE = "vestibular-favorito-campus"

function normalizar(campus: string): string {
  return campus.trim().toUpperCase()
}

export function campusIgual(a: string, b: string): boolean {
  return normalizar(a) === normalizar(b)
}

export function getCampusFavorito(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(CHAVE)
  } catch {
    return null
  }
}

export function setCampusFavorito(campus: string | null): void {
  if (typeof window === "undefined") return
  try {
    if (campus && campus.trim()) {
      window.localStorage.setItem(CHAVE, normalizar(campus))
    } else {
      window.localStorage.removeItem(CHAVE)
    }
  } catch {
    /* storage indisponível */
  }
}
