# Evidence Index

_Maintained by `lead`. One row per durable artefact._

| Date (UTC) | Task / VM row | Artefact | Result |
| ---------- | ------------- | -------- | ------ |
| 2026-06-15T03:41 | T-M0-01 (discovery) | `ground-truth.md` | Captured; forge toolchain absent |
| 2026-06-15T03:41 | T-M0-02 / VM-LOCAL-GATES | `gates/local-2026-06-15T0341Z.log` | build PASS; tests blocked by env; forge lint n/a |
| 2026-06-15T03:42 | BLK-01 | `blockers.md` | Open — escalated to operator |
| 2026-06-15T03:42 | T-M0-03 | `../STATUS.md` | Created from RUNBOOK template |
| 2026-06-15T03:41 | T-M0-05 | `*/README.md` placeholders | Scaffolding created |

## Quality-gate hooks installed (per QUALITY_GATES.md)
- `.claude/hooks/task-completed.sh` (evidence-gated completion) — executable, syntax-checked
- `.claude/hooks/teammate-idle.sh` (anti-idle) — executable, syntax-checked
- `.claude/hooks/task-created.sh` (task shape + scope guard) — executable, syntax-checked
- `.claude/settings.json` — TaskCompleted / TeammateIdle / TaskCreated wired; agent-teams env + auto teammate mode

## Not yet produced (blocked by BLK-01)
forge-deploy.log · forge-install.log · smoke-jira.log · rovo/visibility.md ·
jira-config/* · automation/*-audit.md · agent-runs/* · outcomes/* · DONE.md
