---
name: Dependency maintenance
description: Security overrides and versioned Expo patches need to follow the resolved pnpm dependency graph.
---

Keep workspace security overrides scoped to compatible major versions where possible, and keep any `patch-package` filename aligned with the exact resolved package version. Treat production audit results separately from development-only tooling findings when an upstream package has no patched release.

**Why:** Refreshing the lockfile can move transitive Expo packages to a newer patch version, which makes a version-specific patch fail during postinstall even when the application code is unchanged.

**How to apply:** After dependency updates, refresh the lockfile, run postinstall, audit production and development trees separately, and restart every affected workflow before publishing.

Local `file:` dependencies are copied into pnpm's virtual store rather than being read live from the vendor directory; after changing a vendored package, force-refresh the install before testing runtime behavior.

**Why:** A patched vendored package can appear correct when inspected from the workspace while Metro or another consumer still executes the stale copied package from pnpm's store.

**How to apply:** Run a forced pnpm install after editing a local dependency, then verify the resolved consumer path and rerun the affected build.