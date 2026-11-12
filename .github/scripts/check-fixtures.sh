#!/usr/bin/env bash
# Runs each fixtures/valid/X.smt2 through the solvers its `; oracle:` line names (z3,
# cvc5). Each must accept it: exit 0, no `(error` in its output, within 60 seconds. The
# output goes to fixtures/responses/X.<solver>.out, which the package tests parse as
# responses. Prints one line per disagreement.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)/fixtures" || exit 1

failed=0
rm -f responses/*.out

for file in valid/*.smt2; do
  name=$(basename "$file" .smt2)
  oracles=$(sed -n 's/^; oracle: //p' "$file")
  if [ -z "$oracles" ]; then
    echo "$file names no oracle"
    failed=1
  fi
  for solver in $oracles; do
    case $solver in
      z3) command=(z3 "$file") ;;
      cvc5) command=(cvc5 --incremental "$file") ;;
      *)
        echo "$file: unknown oracle $solver"
        failed=1
        continue
        ;;
    esac
    out=responses/$name.$solver.out
    timeout 60 "${command[@]}" >"$out"
    status=$?
    if [ "$status" -ne 0 ] || grep -q '(error' "$out"; then
      echo "$solver rejects $file (exit $status):"
      sed 's/^/  /' "$out"
      failed=1
    fi
  done
done

exit "$failed"
