---
tracker:
  kind: linear
  api_key: "$LINEAR_API_KEY"
  project_slug: "00db83904351"
  active_states:
    - Todo
    - In Progress
    - Rework
    - Merging
  terminal_states:
    - Closed
    - Cancelled
    - Canceled
    - Duplicate
    - Done
polling:
  interval_ms: 30000
workspace:
  root: "~/symphony-workspaces/trackpull"
hooks:
  after_create: |
    git clone --depth 1 https://github.com/criticalberne/TrackPull.git .
  before_run: |
    npm install
  after_run: |
    npm test
agent:
  max_concurrent_agents: 10
  max_turns: 20
codex:
  command: "codex app-server"
  approval_policy: "never"
  thread_sandbox: "workspace-write"
  turn_sandbox_policy:
    type: "workspaceWrite"
  read_timeout_ms: 30000
  stall_timeout_ms: 300000
  turn_timeout_ms: 3600000
server:
  port: 8787
---
You are working on a Linear issue `{{ issue.identifier }}`.
{% if attempt %}
This is retry attempt `{{ attempt }}`. Resume from the existing workspace state.
{% endif %}
Issue context:
- Title: {{ issue.title }}
- State: {{ issue.state }}
- URL: {{ issue.url }}
- Labels: {{ issue.labels }}
Description:
{% if issue.description %}
{{ issue.description }}
{% else %}
No description provided.
{% endif %}
## Harness Compatibility

This repository already has harness-engineering context. Reuse it instead of replacing it.

- Treat `README.md` as authoritative repository guidance when relevant.
- Treat `.planning` as authoritative repository guidance when relevant.
- Treat `.github` as authoritative repository guidance when relevant.
- Treat `scripts/build-extension.sh` and `scripts/smoke-test-extension.sh` as validation entry points when relevant.
- Preserve existing planning and repository conventions unless they conflict with the current Linear ticket.
- Prefer adapting the current harness to the task instead of inventing a new project workflow.
Instructions:
1. Work autonomously in the provided workspace.
2. Use the repository's existing harness/docs when they are present.
3. Use `linear_graphql` for Linear reads and writes when tracker changes are required.
4. For code changes, validate with `npm test` and run `bash scripts/build-extension.sh` when the change affects extension packaging, popup/options UI, manifest, background, or content scripts.
5. Use `bash scripts/smoke-test-extension.sh` when a manual extension-load sanity check is needed and summarize the manual steps/output in the final report.
6. Stop only for true blockers such as missing auth or missing required tools.
7. Final message must report completed actions and blockers only.
