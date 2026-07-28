#!/bin/bash
# Syntax-Check nach jeder Änderung an index.html / backup.html
# Extrahiert den <script type="module">-Block und prüft ihn mit node --check.
# Bricht Claude Code mit Exit 2 ab, damit Claude den Fehler sofort sieht und fixt.

set -u
FILES=("index.html" "backup.html")
FAIL=0

for f in "${FILES[@]}"; do
  [ -f "$f" ] || continue
  TMP="$(mktemp /tmp/claude-syntax-XXXX.mjs)"
  # Script-Block zwischen <script type="module"> und </script> extrahieren
  awk '/<script type="module">/{flag=1;next}/<\/script>/{flag=0}flag' "$f" > "$TMP"
  if [ -s "$TMP" ]; then
    if ! node --check "$TMP" 2> /tmp/claude-syntax-err.txt; then
      echo "❌ JavaScript-Syntaxfehler in $f:" >&2
      sed "s|$TMP|$f (Script-Block)|" /tmp/claude-syntax-err.txt >&2
      FAIL=1
    fi
  fi
  rm -f "$TMP"
done

if [ "$FAIL" -eq 1 ]; then
  exit 2   # Exit-Code 2 = Claude bekommt den Fehler als Feedback und korrigiert
fi
echo "✅ Syntax-Check OK"
