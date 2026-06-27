# Miso

Düşük kaynak tüketen, yüksek verimli bir **Docker yönetim paneli**. Go backend ile yazılır,
React tabanlı UI tek binary'ye gömülür — `make build` ile çıkan **tek çıktı** hem API'yı hem UI'ı
servis eder.

> **Faz 1:** Sistem kaynak dashboard'u — CPU, RAM, disk, network canlı metrikleri (SSE) + sistem bilgisi.
>
> **Faz 2:** Proje → Environment → Uygulama yönetimi. Projeler oluştur, environment'lara
> (production/staging…) böl, environment'lara Git üzerinden uygulama ekle, uygulama detayını gör.
> Veriler SQLite'ta kalıcı.
>
> **Faz 3 (mevcut):** Gerçek Docker entegrasyonu (resmi Docker Go SDK). **Deploy** Git reposunu
> uzak build context olarak derler ve container'ı çalıştırır; **Stop/Restart** gerçek container'ı
> yönetir. Container/imaj adı `projectName-env-appName` deseniyle üretilir. Detay sayfası canlı
> CPU/bellek/ağ istatistiklerini ve container loglarını gösterir; build sırasında durum `building`
> olur, başarısızlıkta hata mesajı yüzeye çıkar. Container portu forma eklenen alanlarla publish edilir.

## Teknolojiler

| Katman | Seçim |
| --- | --- |
| Backend | Go · `net/http` + [chi](https://github.com/go-chi/chi) · [gopsutil](https://github.com/shirou/gopsutil) |
| Veritabanı | [SQLite](https://modernc.org/sqlite) (pure-Go, cgo yok) — `miso.db` |
| Canlı veri | Server-Sent Events (SSE) |
| UI | React + TypeScript + Vite (SPA) |
| Yönlendirme/durum | react-router-dom · TanStack Query |
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
./bin/miso      # http://localhost:8080  (db: ./miso.db)
./bin/miso --addr :9000 --db /var/lib/miso.db   # özel adres ve DB yolu
```

`make build` adımları: `yarn build` → `web/dist`'i `internal/server/dist`'e kopyala →
`go build` (`go:embed` ile UI binary'ye gömülür). SQLite veritabanı ilk çalıştırmada otomatik oluşur.

## API

### Sistem (Faz 1)
| Method | Path | Açıklama |
| --- | --- | --- |
| GET | `/api/system/info` | Host bilgisi (OS, kernel, CPU, RAM, uptime…) |
| GET | `/api/metrics` | Anlık metrik snapshot'ı |
| GET | `/api/metrics/stream` | SSE — ~2 sn aralıkla canlı metrik akışı |

### Kaynak yönetimi (Faz 2)
| Method | Path | Açıklama |
| --- | --- | --- |
| GET/POST | `/api/projects` | projeleri listele (sayım+durum) / oluştur |
| GET/PATCH/DELETE | `/api/projects/{pid}` | tekil proje |
| GET/POST | `/api/projects/{pid}/environments` | environment listele / oluştur |
| GET/DELETE | `/api/environments/{eid}` | tekil environment |
| GET/POST | `/api/environments/{eid}/applications` | uygulama listele / oluştur |
| GET/PATCH/DELETE | `/api/applications/{aid}` | tekil uygulama (PATCH: port + restart policy; silmede container da kaldırılır) |
| | | _proje/env silmede de alt container'lar temizlenir_ |
| PUT | `/api/applications/{aid}/env` | ortam değişkenlerini değiştir (deploy'da container'a uygulanır) |
| POST | `/api/applications/{aid}/{deploy\|stop\|restart}` | gerçek Docker aksiyonu |
| GET | `/api/applications/{aid}/logs` | container (veya derleme) logları |
| GET | `/api/applications/{aid}/logs/stream` | derleme logları canlı (SSE) |
| GET | `/api/applications/{aid}/stats` | canlı CPU/bellek/ağ istatistiği |

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
cmd/miso/            # entrypoint (--addr, --db)
internal/
  metrics/           # gopsutil collector + sistem bilgisi
  sse/               # SSE handler
  store/             # SQLite store (projects/environments/applications)
  server/            # chi router + CRUD handlers + go:embed SPA
web/                 # Vite + React SPA
  src/app/           # sidebar layout
  src/pages/         # dashboard, projects, project, environment, application
  src/features/      # kartlar + dialog'lar
  src/lib/           # API client + react-query hook'ları
```
