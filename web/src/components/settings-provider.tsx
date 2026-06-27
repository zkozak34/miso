import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react"

export interface Settings {
  chartPoints: number
  decimals: number
  showPerCore: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  chartPoints: 30,
  decimals: 1,
  showPerCore: true,
}

const STORAGE_KEY = "miso.settings"

interface SettingsContextValue {
  settings: Settings
  update: (partial: Partial<Settings>) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_SETTINGS
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      update: (partial) => setSettings((prev) => ({ ...prev, ...partial })),
    }),
    [settings],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider")
  return ctx
}
