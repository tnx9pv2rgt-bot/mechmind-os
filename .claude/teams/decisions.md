# Architectural Decisions Log (append-only)

> Owner: `nexo-architect`. Subagent leggono on-demand.
> Format: `## YYYY-MM-DD HH:MM — <decision title>` + Why + How + Sign-off agent.

## 2026-05-10 13:30 — Multi-agent architecture v1
**Why**: Migrazione da agent singolo (4 specialist) a sistema gerarchico (architect + 4 lead + 12 specialist) con file-ownership matrix e cost-ceiling 4 paralleli.
**How**: 16 nuovi `.claude/agents/*.md` con `memory: project`. Worktree obbligatorio per parallel feature.
**Sign-off**: human (giovanni)
