export type LogLevel = "info" | "warn" | "error" | "debug"
export type LogLine = { ts: string; level: LogLevel; text: string }

// parseLogLine pulls the Docker timestamp prefix (if present) off a raw line and
// guesses a level from its content so the view can colour-code it.
export function parseLogLine(raw: string): LogLine {
  let text = raw
  let ts = ""
  const m = raw.match(/^(\d{4}-\d{2}-\d{2}T[0-9:.]+(?:Z|[+-]\d{2}:\d{2})?)\s+([\s\S]*)$/)
  if (m) {
    const d = new Date(m[1])
    if (!Number.isNaN(d.getTime())) ts = d.toLocaleTimeString("tr-TR", { hour12: false })
    text = m[2]
  }
  const low = text.toLowerCase()
  let level: LogLevel = "info"
  if (/(error|fatal|panic|başarısız)/.test(low)) level = "error"
  else if (/(warn|uyarı)/.test(low)) level = "warn"
  else if (/debug/.test(low)) level = "debug"
  return { ts, level, text }
}
