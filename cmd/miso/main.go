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
)

func main() {
	addr := flag.String("addr", ":8080", "HTTP listen address")
	flag.Parse()

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	log.Printf("miso listening on %s", *addr)
	if err := server.New(*addr).ListenAndServe(ctx); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
