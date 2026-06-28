import type { EnvVar } from "@/lib/api/resources"

// Keys that conventionally hold secrets get the masked toggle on by default.
const SECRET_HINT = /(SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE|API[_-]?KEY|_KEY$|CREDENTIAL)/i

// parseDotenv turns the contents of a .env file into env var rows. It handles
// blank lines, # comments, optional `export ` prefixes and surrounding quotes.
export function parseDotenv(text: string): EnvVar[] {
  const out: EnvVar[] = []
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim()
    if (line === "" || line.startsWith("#")) continue
    if (line.startsWith("export ")) line = line.slice(7).trim()
    const eq = line.indexOf("=")
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    if (!key) continue
    let value = line.slice(eq + 1).trim()
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1)
    }
    out.push({ key, value, secret: SECRET_HINT.test(key) })
  }
  return out
}

export const envSignature = (vars: { key: string; value: string; secret: boolean }[]) =>
  vars
    .filter((v) => v.key.trim() !== "")
    .map((v) => `${v.key} ${v.value} ${v.secret}`)
    .join("\n")
