import { useEffect, useState } from "react"
import { useApplicationStats } from "@/lib/queries"

// useStatsHistory polls live container stats and keeps a rolling window for the
// charts. The window resets whenever the container stops running.
export function useStatsHistory(appId: string, running: boolean) {
  const { data } = useApplicationStats(appId, running)
  const [history, setHistory] = useState<{ cpu: number; mem: number }[]>([])

  useEffect(() => {
    if (!running) setHistory([])
  }, [running])

  useEffect(() => {
    if (!data || !running) return
    setHistory((h) => [...h.slice(-39), { cpu: data.cpuPercent, mem: data.memoryUsage }])
  }, [data, running])

  return { latest: data, history }
}
