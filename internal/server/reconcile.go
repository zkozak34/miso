package server

import (
	"context"

	"github.com/zeynelkozak/miso/internal/store"
)

// reconcileStatus corrects an application's stored status against the real state
// of the container Miso deployed, persisting and returning the updated app when
// the two diverge. Apps that are building, were never deployed, or whose daemon
// can't be reached are returned unchanged.
//
// It only ever flips between running and stopped: a "failed" deploy keeps its
// status (and last error) until the next deploy, and a container that has
// vanished is treated as stopped rather than failed.
func (s *Server) reconcileStatus(ctx context.Context, app store.Application) store.Application {
	if s.docker == nil || app.ContainerID == "" || app.Status == store.StatusBuilding {
		return app
	}

	st, err := s.docker.Inspect(ctx, app.ContainerID)
	if err != nil {
		return app
	}

	desired := app.Status
	switch {
	case !st.Exists:
		// The container we deployed is gone; if we still thought it was up, it
		// isn't anymore. A stored stopped/failed status is left untouched.
		if app.Status == store.StatusRunning {
			desired = store.StatusStopped
		}
	case st.Running:
		desired = store.StatusRunning
	default:
		// Exists but exited/created/paused: not serving, so report it stopped.
		desired = store.StatusStopped
	}

	if desired == app.Status {
		return app
	}
	if updated, err := s.store.SetApplicationStatus(app.ID, desired); err == nil {
		return updated
	}
	return app
}

// reconcileStatuses reconciles a batch of applications in place.
func (s *Server) reconcileStatuses(ctx context.Context, apps []store.Application) {
	for i := range apps {
		apps[i] = s.reconcileStatus(ctx, apps[i])
	}
}
