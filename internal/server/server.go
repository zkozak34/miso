// Package server wires the HTTP API and the embedded SPA into a single handler.
package server

import (
	"context"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/zeynelkozak/miso/internal/store"
)

// Server holds the HTTP router, data store and configuration.
type Server struct {
	router chi.Router
	addr   string
	store  *store.Store
}

// New creates a Server bound to addr (e.g. ":8080") backed by st.
func New(addr string, st *store.Store) *Server {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Compress(5))

	return &Server{router: r, addr: addr, store: st}
}

// ListenAndServe builds the routes and starts the HTTP server, shutting down
// gracefully when ctx is cancelled.
func (s *Server) ListenAndServe(ctx context.Context) error {
	srv := &http.Server{
		Addr:              s.addr,
		Handler:           s.routes(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()

	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return err
	}
	return nil
}
