# lang-smtlib

Editor language support for [SMT-LIB](https://smt-lib.org) 2.7:
[`codemirror-lang-smtlib`](packages/codemirror-lang-smtlib), a CodeMirror 6 language whose
Lezer grammar is generated from a BNF written from the concrete syntax (Appendix B) of the
SMT-LIB reference. Changes are in [CHANGELOG.md](CHANGELOG.md).

## Layout

- `spec/`: the grammar written from the reference (`smtlib-2.7.bnf`, `smtlib-2.7.lex`), its notation and the
  discrepancies found in the reference (`README.md`), and the pinned release (`SOURCE`).
- `gen/`: `bnf2lezer.mjs` writes the grammar from `spec/` and `overlay.grammar`;
  `CONFLICTS.md` explains the overlay. `node --test gen/` tests the generator.
- `fixtures/valid/`: scripts, each naming the solvers that accept it (`; oracle:`);
  `fixtures/responses/`: what those solvers answered.
- `packages/codemirror-lang-smtlib/`: the package.

## Working on it

The devshell (`nix develop`, or direnv) has every tool, including z3 and cvc5. Then:

```sh
pnpm install
pnpm generate                  # writes the grammar and src/words.ts
.github/scripts/test-all.sh    # every check CI runs
```

Generated files are committed, and `pnpm generate` leaves a clean tree.
`.github/scripts/check-fixtures.sh` runs the solvers over `fixtures/valid/` and rewrites
`fixtures/responses/`; `test-all.sh` fails if that changes them.

A new reference release is worked into `spec/` by hand: `reference.yml` checks smt-lib.org every
Sunday and opens an issue when it lists a release other than the one `spec/SOURCE` pins.

## Releasing

A release is a merged pull request labelled `release`: `release.yml` then publishes the
package to npm and creates the GitHub release `vX.Y.Z`, using the version's CHANGELOG
section as release notes. To make one, run `.github/scripts/version.sh X.Y.Z`, add a
`## [X.Y.Z] - date` section to `CHANGELOG.md`, open a pull request and label it `release`.

## Licence

MIT; see [LICENSE](LICENSE). The grammar is derived from the SMT-LIB reference by Barrett,
Fontaine and Tinelli; see [NOTICE](NOTICE).
