#!/usr/bin/env bash
# AGENTS.md rule 2: notification_outbox is the only path to sending email.
# The mailer client (server/src/lib/mailer.js) may be imported by exactly
# one file: the outbox delivery worker. Any other file importing it directly
# is an outbox-pattern violation -- run in CI on every PR.
set -euo pipefail

MAILER_MODULE="server/src/lib/mailer.js"
ALLOWED_IMPORTER="server/src/lib/outboxWorker.js"
pattern="from ['\"].*/mailer(\.js)?['\"]|require\(['\"].*/mailer(\.js)?['\"]\)"

violations=0
if [ -d server/src ]; then
  while IFS= read -r -d '' f; do
    [ "$f" = "$MAILER_MODULE" ] && continue
    [ "$f" = "$ALLOWED_IMPORTER" ] && continue
    if grep -EnH "$pattern" "$f" >/dev/null 2>&1; then
      echo "BLOCKED: $f imports the mailer client directly (only $ALLOWED_IMPORTER may)."
      grep -EnH "$pattern" "$f" | sed 's/^/  /'
      violations=1
    fi
  done < <(find server/src -type f -name '*.js' -print0)
fi

if [ "$violations" -ne 0 ]; then
  exit 1
fi

echo "OK: no file outside $ALLOWED_IMPORTER imports the mailer client."
