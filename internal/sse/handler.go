package sse

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/zeynelkozak/miso/internal/metrics"
)

type Handler struct {
	interval time.Duration
}

func NewHandler(interval time.Duration) *Handler {
	if interval <= 0 {
		interval = 2 * time.Second
	}
	return &Handler{interval: interval}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	ctx := r.Context()
	collector := metrics.NewCollector()
	enc := json.NewEncoder(w)

	h.send(ctx, w, enc, flusher, collector)

	ticker := time.NewTicker(h.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if !h.send(ctx, w, enc, flusher, collector) {
				return
			}
		}
	}
}

func (h *Handler) send(ctx context.Context, w http.ResponseWriter, enc *json.Encoder, flusher http.Flusher, c *metrics.Collector) bool {
	snap, err := c.Collect(ctx)
	if err != nil {
		return true
	}
	if _, err := w.Write([]byte("data: ")); err != nil {
		return false
	}
	if err := enc.Encode(snap); err != nil {
		return false
	}
	if _, err := w.Write([]byte("\n")); err != nil {
		return false
	}
	flusher.Flush()
	return true
}
