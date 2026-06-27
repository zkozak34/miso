// Command miso runs the Docker management panel: a Go HTTP server that exposes
// system-metrics APIs and serves the embedded web UI from a single binary.
package main

import (
	"context"
	"flag"
	"log"
	"os/signal"
	"syscall"

	"github.com/zeynelkozak/miso/internal/server"
	"github.com/zeynelkozak/miso/internal/store"
)

func main() {
	addr := flag.String("addr", ":8080", "HTTP listen address")
	dbPath := flag.String("db", "miso.db", "SQLite database path")
	flag.Parse()

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	st, err := store.Open(*dbPath)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer st.Close()

	log.Printf("miso listening on %s (db: %s)", *addr, *dbPath)
	if err := server.New(*addr, st).ListenAndServe(ctx); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
