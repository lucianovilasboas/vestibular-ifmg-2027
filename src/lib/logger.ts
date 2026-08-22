import { nowBRT } from "./dates"

const DEBUG = process.env.DEBUG === "true"

export function log(tag: string, msg: string, data?: unknown) {
  if (!DEBUG) return
  const ts = nowBRT().slice(11, 19)
  const extra = data ? ` ${JSON.stringify(data)}` : ""
  console.log(`[${ts}][${tag}] ${msg}${extra}`)
}
