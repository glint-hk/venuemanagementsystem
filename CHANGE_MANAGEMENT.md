# Change Management Log

Append-only release log — one entry per production release. Do not edit or remove past entries; add a new one for each release.

Pair with the mandatory pre-migration step in README.md ("Deployment"): commit a `pg_dump` snapshot to `db_backups/` before any schema or data change lands in a release.

## Format

```
## YYYY-MM-DD — vX.Y.Z
- Summary of what shipped
- Schema changes: <migration name(s), or "none">
- Backup: <db_backups/ filename this release's pre-migration snapshot corresponds to, or "none">
```

---

*No releases yet.*
