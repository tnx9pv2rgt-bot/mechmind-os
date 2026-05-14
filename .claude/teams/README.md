# .claude/teams — coordination layer

## Files
- `tasks.jsonl` — shared task list (append-only, claim via flock).
  Schema: `{"id":"T-001","status":"pending|in_progress|completed","claimed_by":"<agent>","claim_ts":<epoch>,"deps":[...],"files":[...],"summary":"..."}`
- `decisions.md` — architectural decision log (only `nexo-architect` writes).
- `mail/<from>/<to>/<ts>.json` — peer-to-peer messaging.
- `ownership-matrix.md` — single-writer file ownership rules.

## Rules
1. One writer per file (see ownership-matrix).
2. Claim a task: append entry with `claimed_by:<agent>,claim_ts:$(date +%s)`. Stale claim (>30min) auto-released.
3. Conflict on shared file → escalate to `nexo-architect`.
4. Mailbox: `from` writes, `to` reads then deletes.
