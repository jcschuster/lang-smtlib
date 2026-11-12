# Changelog

All notable changes to `codemirror-lang-smtlib` are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[semantic versioning](https://semver.org/spec/v2.0.0.html) over what the package exposes:
node names and the exported JavaScript API.

The SMT-LIB reference the grammar was written from is recorded in `package.json` under
`smtlib.reference`; it moves when the reference does, not when the package does.

## [Unreleased]

### Added

- `codemirror-lang-smtlib`: a CodeMirror 6 language (Lezer parser) for SMT-LIB 2.7 scripts,
  command responses, theory and logic declarations, generated from Appendix B of the
  reference (release 2026-09-09), with highlighting, folding, Lisp-style indentation and
  completion. Deviations from Appendix B: `(push)` and `(pop)` without a numeral, and
  hexadecimal indices as in `(_ char #x41)`.
