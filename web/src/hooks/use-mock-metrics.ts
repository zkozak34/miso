import { useEffect, useRef, useState } from "react"

export interface MockPoint {
  cpu: number // percent
  memory: number // MB
  netIn: number // KB/s
}

const MAX = 40
const MEM_LIMIT = 512

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

/**
 * Phase-2 placeholder: synthesizes a rolling metric series client-side so the
 * application detail charts animate. Replaced by real container stats in Phase 3.
 * When `active` is false (app stopped) the series flattens to zero.
 */
export function useMockMetrics(active: boolean): { latest: MockPoint; history: MockPoint[] } {
  const [history, setHistory] = useState<MockPoint[]>([])
  const ref = useRef<MockPoint>({ cpu: 2, memory: 180, netIn: 20 })

  useEffect(() => {
    if (!active) {
      const zero = { cpu: 0, memory: 0, netIn: 0 }
      ref.current = zero
      setHistory(Array.from({ length: MAX }, () => zero))
      return
    }

    // Seed with a flat-ish history so the chart isn't empty on first paint.
    setHistory(Array.from({ length: MAX }, () => ref.current))

    const id = setInterval(() => {
      const prev = ref.current
      const next: MockPoint = {
        cpu: clamp(prev.cpu + (Math.random() - 0.5) * 4, 0.2, 60),
        memory: clamp(prev.memory + (Math.random() - 0.5) * 24, 80, MEM_LIMIT),
        netIn: clamp(prev.netIn + (Math.random() - 0.5) * 30, 0, 400),
      }
      ref.current = next
      setHistory((h) => [...h, next].slice(-MAX))
    }, 1500)

    return () => clearInterval(id)
  }, [active])

  return { latest: history[history.length - 1] ?? ref.current, history }
}
