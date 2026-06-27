package main

import (
	"context"
	"flag"
	"log"
	"os/signal"
	"syscall"

	"github.com/zeynelkozak/miso/internal/docker"
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

	dk, err := docker.New(ctx)
	if err != nil {
		log.Printf("docker daemon unavailable, deploy actions disabled: %v", err)
		dk = nil
	} else {
		defer dk.Close()
	}

	log.Printf("miso listening on %s (db: %s)", *addr, *dbPath)
	if err := server.New(*addr, st, dk).ListenAndServe(ctx); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
