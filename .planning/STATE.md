---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: Trackman Portal Integration
status: planning
stopped_at: Phase 21 context gathered
last_updated: "2026-03-26T20:47:06.583Z"
last_activity: 2026-03-26 — Roadmap created for v1.6 Portal Integration (phases 21-25)
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 5
  completed_plans: 4
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-26)

**Core value:** Accurately capture every shot metric from a Trackman report and produce a clean, complete CSV export
**Current focus:** v1.6 Trackman Portal Integration — Phase 21: Manifest and Permissions Foundation

## Current Position

Phase: 21 — Manifest and Permissions Foundation
Plan: —
Status: Not started (roadmap complete; ready for planning)
Last activity: 2026-03-26 — Roadmap created for v1.6 Portal Integration (phases 21-25)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- v1.3: 8 plans, 22 tasks, 5 days
- v1.4: 2 plans, 4 tasks, 1 day
- v1.5: 6 plans, 14 tasks, 1 day

## Accumulated Context

### Decisions

See: .planning/PROJECT.md Key Decisions table (updated 2026-03-26)

Recent decisions relevant to this milestone:

- GraphQL API at api.trackmangolf.com/graphql is the data source — cookie-based auth via credentials:include
- Base64 activity IDs decode to SessionActivity\n{uuid}
- Older SESSION type activities accessible via node(id) query even without reportLink
- New host permissions: api.trackmangolf.com, portal.trackmangolf.com — declared as optional_host_permissions
- Measurement type has 60+ fields — superset of what the interceptor captures
- Credit milo-mac for GraphQL API discovery when pushing to GitHub
- optional_host_permissions chosen over host_permissions to avoid disabling existing users on update

### Pending Todos

- Plan Phase 21 (Manifest and Permissions Foundation)

### Blockers/Concerns

- Cookie auth requires user to be logged into Trackman portal — extension cannot authenticate independently
- GraphQL schema may change without notice — need resilient parsing
- credentials:include may be unreliable in MV3 service workers — validate first, fall back to chrome.cookies.getAll() if needed
- Trackman Measurement field names unconfirmed (docs returned 404) — must verify via DevTools during Phase 22

### Paused Milestones

- **v1.7 Flight Intelligence** — Phases 17-20 (dataset capture, trajectory engine, calibration, product integration) paused
- **v1.6 Data Intelligence (original)** — Phases 15-16 (session history UI, smart prompts) deferred

## Session Continuity

Last session: 2026-03-26T20:47:06.581Z
Stopped at: Phase 21 context gathered
Resume file: .planning/phases/21-manifest-permissions-foundation/21-CONTEXT.md
