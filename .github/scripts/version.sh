#!/usr/bin/env bash
# With no argument, prints the package's version; with one, sets it. Run from anywhere in
# the repository:
#
#     .github/scripts/version.sh          # prints e.g. 0.1.0
#     .github/scripts/version.sh 0.2.0    # sets 0.2.0
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

package=packages/codemirror-lang-smtlib/package.json

if [ $# -eq 0 ]; then
  jq -r .version "$package"
  exit 0
fi

new=$1
if ! [[ $new =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "not a version: $new (expected MAJOR.MINOR.PATCH)" >&2
  exit 1
fi
sed -i -E "0,/\"version\": \"[^\"]+\"/s//\"version\": \"$new\"/" "$package"
