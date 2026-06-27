import { useEffect, useRef, useState } from "react"
import type { Snapshot } from "@/lib/api"

const MAX_HISTORY = 60

export type ConnectionState = "connecting" | "open" | "closed"

interface StreamResult {
  latest: Snapshot | null
  history: Snapshot[]
  status: ConnectionState
}

export function useMetricsStream(): StreamResult {
  const [latest, setLatest] = useState<Snapshot | null>(null)
  const [history, setHistory] = useState<Snapshot[]>([])
  const [status, setStatus] = useState<ConnectionState>("connecting")
  const historyRef = useRef<Snapshot[]>([])

  useEffect(() => {
    const source = new EventSource("/api/metrics/stream")

    source.onopen = () => setStatus("open")

    source.onmessage = (event) => {
      try {
        const snap: Snapshot = JSON.parse(event.data)
        setLatest(snap)
        const next = [...historyRef.current, snap].slice(-MAX_HISTORY)
        historyRef.current = next
        setHistory(next)
      } catch {}
    }

    source.onerror = () => {
      setStatus(source.readyState === EventSource.CLOSED ? "closed" : "connecting")
    }

    return () => source.close()
  }, [])

  return { latest, history, status }
}
