BINARY      := bin/miso
EMBED_DIR   := internal/server/dist
WEB_DIR     := web
LDFLAGS     := -s -w

.PHONY: all build web embed backend dev dev-backend dev-web lint clean tidy run

all: build

## build: produce the single binary with the UI embedded
build: embed
	go build -ldflags "$(LDFLAGS)" -o $(BINARY) ./cmd/miso
	@echo "✔ built $(BINARY)"

## web: install deps and build the SPA into web/dist
web:
	cd $(WEB_DIR) && yarn install --frozen-lockfile && yarn build

## embed: build the SPA and copy it into the Go embed directory
embed: web
	rm -rf $(EMBED_DIR)
	cp -R $(WEB_DIR)/dist $(EMBED_DIR)

## dev: run backend (:8080) and Vite dev server (:5173) together
dev:
	@echo "Backend → :8080 | UI → http://localhost:5173"
	@$(MAKE) -j2 dev-backend dev-web

dev-backend:
	go run ./cmd/miso

dev-web:
	cd $(WEB_DIR) && yarn dev

## run: run the already-built binary
run:
	$(BINARY)

## lint: lint both backend and frontend
lint:
	go vet ./...
	cd $(WEB_DIR) && npx @biomejs/biome check ./src

## tidy: tidy Go modules
tidy:
	go mod tidy

## clean: remove build artifacts
clean:
	rm -rf $(BINARY) $(WEB_DIR)/dist $(EMBED_DIR)
