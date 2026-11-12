#!/usr/bin/env bash
# Prints the URL of the newest official SMT-LIB reference that https://smt-lib.org/language.shtml
# lists: the first "Latest official release" outside HTML comments, newest version first.
set -euo pipefail

page=$(curl -fsSL https://smt-lib.org/language.shtml)
# Drop HTML comments, which hold drafts.
page=$(perl -0pe 's/<!--.*?-->//gs' <<<"$page")
href=$(grep -A2 'Latest official release' <<<"$page" | grep -oE 'papers/smt-lib-reference-[^"]+\.pdf' | head -n 1)
if [ -z "$href" ]; then
  echo "no official release found on https://smt-lib.org/language.shtml" >&2
  exit 1
fi
echo "https://smt-lib.org/$href"
