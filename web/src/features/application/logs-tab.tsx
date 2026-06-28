import { Copy, Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import type { Application } from "@/lib/api/resources"
import { useApplicationLogs } from "@/lib/queries"
import { type LogLevel, parseLogLine } from "./parse-log-line"

const LEVEL_TEXT: Record<LogLevel, string> = {
  info: "text-muted-foreground",
  debug: "text-muted-foreground/60",
  warn: "text-amber-400",
  error: "text-destructive",
}
const LEVEL_BG: Record<LogLevel, string> = {
  info: "",
  debug: "",
  warn: "bg-amber-400/5",
  error: "bg-destructive/5",
}

export function LogsTab({ app }: { app: Application }) {
  const building = app.status === "building"
  const live = building || app.status === "running"
  const [liveLog, setLiveLog] = useState("")
  const [filter, setFilter] = useState("")
  const [follow, setFollow] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  // While building, stream the daemon's build output live over SSE.
  useEffect(() => {
    if (!building) return
    setLiveLog("")
    const es = new EventSource(`/api/applications/${app.id}/logs/stream`)
    es.onmessage = (e) => setLiveLog((prev) => prev + e.data)
    es.addEventListener("done", () => es.close())
    es.onerror = () => es.close()
    return () => es.close()
  }, [building, app.id])

  // Once running/stopped, fall back to polling container logs.
  const { data, isLoading } = useApplicationLogs(app.id, app.status === "running")
  const raw = building ? liveLog : (data?.logs ?? "")

  const lines = useMemo(
    () =>
      raw
        .split("\n")
        .filter((l) => l.trim() !== "")
        .map(parseLogLine),
    [raw],
  )
  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase()
    if (!f) return lines
    return lines.filter((l) => l.text.toLowerCase().includes(f) || l.level.includes(f))
  }, [lines, filter])

  // Stick to the bottom while following and new lines arrive.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-pin on every new batch of lines
  useEffect(() => {
    if (follow && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [filtered, follow])

  const copy = () => {
    const text = filtered.map((l) => (l.ts ? `${l.ts} ` : "") + l.text).join("\n")
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Loglar kopyalandı"))
      .catch(() => toast.error("Kopyalanamadı"))
  }

  const placeholder =
    building || isLoading
      ? "Yükleniyor…"
      : lines.length > 0
        ? "Eşleşen log yok."
        : "Henüz log yok. Uygulamayı dağıtın."

  return (
    <div className="flex h-140 flex-col overflow-hidden rounded-xl border bg-muted/20">
      <div className="flex flex-wrap items-center gap-2.5 border-b bg-muted/40 p-2.5">
        <div className="flex h-8 min-w-40 flex-1 items-center gap-2 rounded-md border bg-background px-2.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Logları filtrele…"
            className="flex-1 bg-transparent font-mono text-xs outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="button"
          onClick={() => setFollow((v) => !v)}
          className={`flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs font-medium transition-colors ${
            follow
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
              : "bg-background text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="relative flex h-1.75 w-1.75">
            <span
              className={`absolute inset-0 rounded-full ${follow ? "bg-emerald-400" : "bg-muted-foreground"}`}
            />
            {follow && (
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/80" />
            )}
          </span>
          {follow ? "Takip ediliyor" : "Takip et"}
        </button>
        <button
          type="button"
          onClick={copy}
          className="flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Copy className="h-3.5 w-3.5" /> Kopyala
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-2 font-mono text-xs leading-relaxed"
      >
        {filtered.length === 0 ? (
          <p className="px-3.5 py-3 text-muted-foreground">{placeholder}</p>
        ) : (
          <>
            {filtered.map((l, i) => (
              <div key={i} className={`flex gap-3 px-3.5 py-px ${LEVEL_BG[l.level]}`}>
                {l.ts && (
                  <span className="flex-none tabular-nums text-muted-foreground/50">{l.ts}</span>
                )}
                <span className={`w-11 flex-none font-medium uppercase ${LEVEL_TEXT[l.level]}`}>
                  {l.level}
                </span>
                <span className="wrap-break-word text-foreground/80">{l.text}</span>
              </div>
            ))}
            {live && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 text-[11px] text-muted-foreground/60">
                <span className="inline-block h-2.75 w-1.5 animate-pulse bg-emerald-400" />
                streaming · {filtered.length} satır
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
