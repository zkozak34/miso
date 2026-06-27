# Miso

Düşük kaynak tüketen, yüksek verimli bir **Docker yönetim paneli**. Go backend ile yazılır,
React tabanlı UI tek binary'ye gömülür — `make build` ile çıkan **tek çıktı** hem API'yı hem UI'ı
servis eder.

> **Faz 1 (mevcut):** Sistem kaynak kullanımı dashboard'u — CPU, RAM, disk, network canlı
> metrikleri (SSE) + sistem bilgisi paneli. Docker container yönetimi sonraki fazlarda.

## Teknolojiler

| Katman | Seçim |
| --- | --- |
| Backend | Go · `net/http` + [chi](https://github.com/go-chi/chi) · [gopsutil](https://github.com/shirou/gopsutil) |
| Canlı veri | Server-Sent Events (SSE) |
| UI | React + TypeScript + Vite (SPA) |
| Bileşenler | shadcn/ui (new-york) · Tailwind CSS v4 · Recharts |
| Form/validasyon | react-hook-form + zod |
| Paket yöneticisi | yarn |
| Linter/formatter | Biome |

## Gereksinimler

- Go ≥ 1.25
- Node ≥ 20, yarn (classic)

## Geliştirme

İki süreç çalışır: Go backend (`:8080`) ve Vite dev server (`:5173`). Vite, `/api` isteklerini
backend'e proxy'ler.

```bash
make dev
# UI:      http://localhost:5173
# Backend: http://localhost:8080
```

Veya ayrı terminallerde:

```bash
go run ./cmd/miso        # backend
cd web && yarn dev       # UI
```

## Üretim Derlemesi (tek binary)

```bash
make build      # web/dist'i derler, internal/server/dist'e gömer, bin/miso üretir
./bin/miso      # http://localhost:8080
./bin/miso --addr :9000   # özel adres
```

`make build` adımları: `yarn build` → `web/dist`'i `internal/server/dist`'e kopyala →
`go build` (`go:embed` ile UI binary'ye gömülür).

## API

| Method | Path | Açıklama |
| --- | --- | --- |
| GET | `/api/system/info` | Host bilgisi (OS, kernel, CPU, RAM, uptime…) |
| GET | `/api/metrics` | Anlık metrik snapshot'ı |
| GET | `/api/metrics/stream` | SSE — ~2 sn aralıkla canlı metrik akışı |

## Komutlar

```bash
make build    # tek binary üret
make dev      # backend + UI birlikte
make lint     # go vet + biome
make clean    # derleme çıktılarını temizle
make tidy     # go mod tidy
```

## Proje Yapısı

```
cmd/miso/            # entrypoint
internal/
  metrics/           # gopsutil collector + sistem bilgisi
  sse/               # SSE handler
  server/            # chi router + go:embed SPA
web/                 # Vite + React SPA
```
