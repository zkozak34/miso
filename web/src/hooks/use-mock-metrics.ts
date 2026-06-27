import { useEffect, useRef, useState } from "react"

export interface MockPoint {
  cpu: number
  memory: number
  netIn: number
}

const MAX = 40
const MEM_LIMIT = 512

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

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
