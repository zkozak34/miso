import { useEffect, useRef, useState } from "react"
import type { Snapshot } from "@/lib/api"

const MAX_HISTORY = 60 // ~2 minutes at one sample / 2s

export type ConnectionState = "connecting" | "open" | "closed"

interface StreamResult {
  /** Most recent snapshot, or null before the first event. */
  latest: Snapshot | null
  /** Ring buffer of recent snapshots for charts (oldest first). */
  history: Snapshot[]
  status: ConnectionState
}

/**
 * Subscribes to the SSE metrics stream and keeps a bounded history for charts.
 * EventSource reconnects automatically on transient failures.
 */
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
      } catch {
        // Ignore malformed frames.
      }
    }

    source.onerror = () => {
      // EventSource retries on its own; reflect the transient state.
      setStatus(source.readyState === EventSource.CLOSED ? "closed" : "connecting")
    }

    return () => source.close()
  }, [])

  return { latest, history, status }
}
