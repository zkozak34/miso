package server

import (
	"embed"
	"io/fs"
	"net/http"
	"path"
	"strings"
)

// distFS holds the built SPA. The `dist` directory is populated by the build
// (Makefile copies web/dist here) before `go build`. A placeholder keeps the
// embed valid during backend-only development.
//
//go:embed all:dist
var distFS embed.FS

// spaHandler serves the embedded SPA, falling back to index.html for unknown
// paths so client-side routing works. Missing static assets return 404.
func spaHandler() (http.Handler, error) {
	sub, err := fs.Sub(distFS, "dist")
	if err != nil {
		return nil, err
	}
	fileServer := http.FileServer(http.FS(sub))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqPath := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if reqPath == "" {
			reqPath = "index.html"
		}

		if _, err := fs.Stat(sub, reqPath); err != nil {
			// Not a real file: serve the SPA shell for client-side routing.
			r.URL.Path = "/"
		}
		fileServer.ServeHTTP(w, r)
	}), nil
}
