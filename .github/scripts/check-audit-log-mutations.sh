#!/usr/bin/env bash
# AGENTS.md rule 3: audit_log is append-only; no code path may UPDATE or
# DELETE it. The database grant in the add_concurrency_guarantee migration
# is the real guarantee -- this is a fast CI trip-wire so a violation is
# caught in review, not just discovered at runtime.
set -euo pipefail

pattern='\.auditLog\.(update|delete|updateMany|deleteMany)\('

violations=0
if [ -d server/src ]; then
  while IFS= read -r -d '' f; do
    if grep -EnH "$pattern" "$f" >/dev/null 2>&1; then
      echo "BLOCKED: $f references audit_log with .update(/.delete( — it is append-only."
      grep -EnH "$pattern" "$f" | sed 's/^/  /'
      violations=1
    fi
  done < <(find server/src -type f -name '*.js' -print0)
fi

if [ "$violations" -ne 0 ]; then
  exit 1
fi

echo "OK: no UPDATE/DELETE call against audit_log found in server/src."
