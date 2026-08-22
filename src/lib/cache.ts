import { log } from "./logger"

interface CacheEntry {
  data: unknown
  timestamp: number
  ttl: number
}

const cache = new Map<string, CacheEntry>()
const DEFAULT_TTL = 60 * 1000

export function getCached<T>(path: string): T | null {
  const entry = cache.get(path)
  if (!entry) {
    log("cache", "MISS", path)
    return null
  }
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(path)
    log("cache", "EXPIRED", path)
    return null
  }
  log("cache", "HIT", path)
  return entry.data as T
}

export function setCache(path: string, data: unknown, ttl?: number): void {
  cache.set(path, { data, timestamp: Date.now(), ttl: ttl ?? DEFAULT_TTL })
  log("cache", "SET", path)
}
