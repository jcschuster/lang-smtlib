#!/usr/bin/env bash
# Runs every check in the repository, keeps going past a failure, and ends with one
# `PASS name` or `FAIL name` line per check. Exits non-zero if any failed. Expects the
# devshell (`nix develop`), which has z3 and cvc5:
#
#     .github/scripts/test-all.sh
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1

results=()
failed=0

check() {
  local name=$1
  shift
  echo "== $name"
  if "$@"; then
    results+=("PASS $name")
  else
    results+=("FAIL $name")
    failed=1
  fi
}

# Runs a command that writes into the given directories, and fails if it changed them.
# shellcheck disable=SC2329 # called through check
unchanged_by() {
  local before
  before=$(mktemp -d)
  local dirs=()
  while [ "$1" != -- ]; do
    dirs+=("$1")
    mkdir -p "$before/$1" && cp -r "$1/." "$before/$1"
    shift
  done
  shift
  "$@" || return 1
  for dir in "${dirs[@]}"; do diff -r "$before/$dir" "$dir" || return 1; done
}

check "LICENSE and NOTICE copies match" bash -c \
  'cmp LICENSE packages/codemirror-lang-smtlib/LICENSE && cmp NOTICE packages/codemirror-lang-smtlib/NOTICE'
check "pnpm install" pnpm install --frozen-lockfile
check "generated files are current" unchanged_by packages/codemirror-lang-smtlib/src -- pnpm generate
check "z3 and cvc5 accept the fixtures, and their answers are current" \
  unchanged_by fixtures/responses -- .github/scripts/check-fixtures.sh
check "pnpm build" pnpm build
check "pnpm test" pnpm test

echo
printf '%s\n' "${results[@]}"
exit "$failed"
