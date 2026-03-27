---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: Trackman Portal Integration
status: completed
stopped_at: Phase 23 context gathered
last_updated: "2026-03-27T00:52:14.529Z"
last_activity: 2026-03-26 — Phase 22 Plan 02 human-verified (all three portal states confirmed)
progress:
  total_phases: 13
  completed_phases: 4
  total_plans: 8
  completed_plans: 7
  percent: 46
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-26)

**Core value:** Accurately capture every shot metric from a Trackman report and produce a clean, complete CSV export
**Current focus:** Phase 22 — graphql-client-cookie-auth

## Current Position

Phase: 22 (graphql-client-cookie-auth) — COMPLETE
Plan: 2 of 2 complete
Status: Phase 22 complete — ready to begin Phase 23
Last activity: 2026-03-26 — Phase 22 Plan 02 human-verified (all three portal states confirmed)

Progress: [█████░░░░░] 46%

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
- executeQuery uses credentials:include for ambient browser cookie auth — no token management needed
- classifyAuthResult checks error code (UNAUTHENTICATED) then message substrings before falling through to generic error
- HEALTH_CHECK_QUERY targets me { id } — minimal query sufficient for auth detection
- [Phase 22]: PortalState string union over boolean — four states (denied/not-logged-in/ready/error) cleanly without additional parameters

### Pending Todos

- Plan Phase 23 (GraphQL-to-SessionData Parser)

### Blockers/Concerns

- Cookie auth requires user to be logged into Trackman portal — extension cannot authenticate independently
- GraphQL schema may change without notice — need resilient parsing
- credentials:include may be unreliable in MV3 service workers — validate first, fall back to chrome.cookies.getAll() if needed
- Trackman Measurement field names unconfirmed (docs returned 404) — must verify via DevTools during Phase 22

### Paused Milestones

- **v1.7 Flight Intelligence** — Phases 17-20 (dataset capture, trajectory engine, calibration, product integration) paused
- **v1.6 Data Intelligence (original)** — Phases 15-16 (session history UI, smart prompts) deferred

## Session Continuity

Last session: 2026-03-27T00:52:14.526Z
Stopped at: Phase 23 context gathered
Resume file: .planning/phases/23-graphql-to-sessiondata-parser/23-CONTEXT.md
