# PLAN — lang-smtlib

CodeMirror 6 language package (`codemirror-lang-smtlib`) with a Lezer grammar generated from a BNF transcription of the SMT-LIB 2.7 concrete syntax. Written 2026-11-11. Status: nothing started.

## Rules for the agent

- Work through the phases in order. Tick a box only when its check passes.
- `[verify]` = from memory or unchecked. Confirm against the named source first; correct this file if it is wrong.
- `[ask]` = decision for Johannes. Stop and ask; do not pick silently.
- Environment: NixOS, fish, direnv. Use only tools from the flake devshell; no global installs; `pnpm`, not `npm`/`npx`.
- Do not publish to npm, push tags, or open upstream issues/PRs without asking.
- Generated files are committed. Every hand-written part is listed in the package README.
- README and NOTICE claim no conformance beyond what the tests show.

## Conventions shared by the five lang-* repos

- Layout as in lang-tptp: `spec/` (inputs + `SOURCE` with URL, version, sha256, date), `gen/` (Node ESM scripts), `fixtures/`, `packages/codemirror-lang-smtlib/`.
- Exports: `smtlib()` → `LanguageSupport`, `smtlibLanguage` → `LRLanguage`.
- CamelCase node names; shared names where the concept exists: `LineComment`, `String`, `Number`. Keep paren, comment and string node names identical to lang-egglog.
- Root scripts: `pnpm generate`, `pnpm build`, `pnpm test`. `pnpm generate` is idempotent (`git diff --exit-code` afterwards, checked in CI).

## Facts

Checked 2026-11-11:

- The official grammar exists only inside the reference PDF. Latest release found: Version 2.7, r2026-03-27, `https://smt-lib.org/papers/smt-lib-reference-v2.7-r2026-03-27.pdf`.
- The concrete syntax is Appendix B of the reference (seen in the 2.6 table of contents; a third-party 2.7 parser cites "Appendix B" for 2.7).
- The reference has a Lexicon section (3.1) and an "Example scripts" section (3.11.2).
- 2.7 is a backward-compatible extension of 2.6; it gives special meaning to the symbols `@`, `lambda` and `->`.
- Cross-checks, third-party: julianthome/smtlibv2-grammar (ANTLR, SMT-LIB 2.6, MIT); msakai/language-smtlib (Haskell, 2.7; its README lists the 2.7 additions it handles: `lambda`, `declare-sort-parameter`, `define-const`, the `_` wildcard pattern).

Unchecked:

- `[verify]` Everything about the lexicon (numerals, decimals, hexadecimals, binaries, string escape `""`, simple and `|quoted|` symbols, `:keywords`, reserved words, `;` comments) against section 3.1.
- `[verify]` Which languages Appendix B covers (scripts, command responses, theory declarations, logic declarations).
- `[verify]` Redistribution terms of the reference document, before committing the PDF or long verbatim excerpts.
- `[verify]` nixpkgs attribute names `z3`, `cvc5`, `poppler-utils` (for `pdftotext`).

## Decisions needed

- [ ] `[ask]` Scope: scripts only, or also command responses (second top rule, for highlighted solver output), theory and logic declarations?
- [ ] `[ask]` Solver extensions outside the standard (for example z3's `check-sat-using`, optimisation commands): highlight as known commands, or leave to the generic fallback (Phase 2)?
- [ ] `[ask]` npm name `codemirror-lang-smtlib` (check `pnpm view codemirror-lang-smtlib`).

## Phase 0 — Bootstrap

- [ ] Read the template copy under `packages/` (from lang-tptp) and the root files; note its build, test and generate commands.
- [ ] Rename everything: `git grep -il tptp` must end empty apart from deliberate credit lines.
- [ ] Remove TPTP-specific parts: mix-based `gen/`, nightly `tptp.yml`, `tools/differential`.
- [ ] `flake.nix` devshell: `nodejs`, `pnpm`, `poppler-utils`, `z3`, `cvc5`. Commit `flake.lock`.
- [ ] `pnpm install && pnpm build && pnpm test` pass on a stub grammar.

## Phase 1 — Spec (`spec/smtlib-2.7.bnf`)

- [ ] Download the PDF (not committed unless the terms allow); record URL, release date and sha256 in `spec/SOURCE`.
- [ ] `pdftotext -layout` Appendix B and section 3.1 into a scratch file as transcription aid.
- [ ] Define the BNF notation in `spec/README.md` (productions `::=`, `|`, `*`, `+`, `?`, quoted terminals, `<token classes>`), staying as close to Appendix B's own notation as possible.
- [ ] Transcribe Appendix B into `spec/smtlib-2.7.bnf`, one production per Appendix B production, same names, same order, section comments.
- [ ] Transcribe the lexicon into `spec/smtlib-2.7.lex` (token classes as regular expressions, reserved words, command names).
- [ ] Diff production names against julianthome's ANTLR grammar and note every 2.6 → 2.7 difference in `spec/README.md`.
- [ ] Human gate: Johannes reviews both spec files against the PDF. Do not start Phase 2 before this box is ticked.

## Phase 2 — Generator (`gen/bnf2lezer.mjs` → `src/smtlib.grammar`)

- [ ] Parse the BNF file; fail on undefined or unused nonterminals.
- [ ] Emit Lezer rules for nonterminals and a `@tokens` block from the `.lex` file; reserved words and command names via `@specialize` on the symbol token.
- [ ] Hand-written overlay `gen/overlay.grammar` for what the BNF cannot express (skip rules, token precedence, top rules, conflict markers); the generator merges it. List its contents in the package README.
- [ ] Generic fallback: an unknown command `( symbol s-expr* )` parses as `GenericCommand` without error nodes.
- [ ] Record every LR conflict the generator reports and how it was resolved in `gen/CONFLICTS.md`.
- [ ] Top rule `Script`; further top rules according to the scope decision.

## Phase 3 — CodeMirror package

- [ ] `styleTags`: command names, reserved words, keywords (`:…`), sorts, binders (`let`, `forall`, `exists`, `match`, `lambda`), literals, quoted symbols, comments.
- [ ] `languageData`: `commentTokens: {line: ";"}`, `closeBrackets: ["(", '"', "|"]`.
- [ ] Lisp-style indentation and list folding.
- [ ] Completion source for command names and reserved words from the `.lex` file.
- [ ] Optional: theory symbol and logic name tables (`spec/theory-symbols.json`) from the theory and logic pages on smt-lib.org `[verify source and format]`, used for completion and `standard` highlighting.
- [ ] Package README: SMT-LIB release pinned, generated versus hand-written files.

## Phase 4 — Tests

- [ ] `test/*.txt` in Lezer `fileTests` format: every command, every term form, every literal class, 2.7 additions, error recovery inside an unbalanced command.
- [ ] `fixtures/valid/*.smt2`: the example scripts of section 3.11.2 plus hand-written cases per logic.
- [ ] Script: fixtures accepted by `z3` and/or `cvc5` parse in Lezer without error nodes. Solvers accept neither exactly the standard nor each other's extensions; record per fixture which solver is the oracle.
- [ ] Generator test: every BNF production is reachable from a top rule in the emitted grammar.
- [ ] Highlight coverage test: every named node has a tag or is listed as intentionally untagged.

## Phase 5 — CI and release

- [ ] `.github/scripts/test-all.sh` runs generate (with diff check), build, tests, fixture checks; CI runs it inside `nix develop`.
- [ ] Scheduled workflow: detect a new reference release on smt-lib.org and open an issue (the transcription is manual).
- [ ] Carry over `version.sh`, `release.yml` and `CHANGELOG.md` from lang-tptp; adapt names.
- [ ] `NOTICE`: grammar derived from the SMT-LIB reference (authors Barrett, Fontaine, Tinelli), with its terms.

## Done when

- [ ] All boxes above ticked or explicitly waived by Johannes.
- [ ] `nix develop -c .github/scripts/test-all.sh` passes from a clean clone.

## After this plan (Johannes)

Configure npm trusted publishing, first release, add the package to the Loge cell bundle.
