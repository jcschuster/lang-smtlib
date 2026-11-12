# spec

The SMT-LIB 2.7 concrete syntax, written by hand from the reference document recorded
in `SOURCE`. The generator in `gen/` reads these files; nothing else in the
repository is a source of grammar facts.

- `smtlib-2.7.bnf`: the syntactic productions of Appendix B, from its S-expressions to
  its command responses. One production per Appendix B production, same names, same
  order, a comment per Appendix B section.
- `smtlib-2.7.lex`: the lexical part of Appendix B (predefined symbols and keywords,
  auxiliary lexical categories, reserved words, other tokens), with Section 3.1 where
  Appendix B is silent (comments).
- `SOURCE`: URL, release, sha256 and fetch date of the reference.

The PDF is not in the repository. Fetch it from the URL in `SOURCE` and check its
sha256.

## Notation

Both files use the BNF notation of the reference (Section 1.1.7) in ASCII:

| Reference | Here | Meaning |
|---|---|---|
| ⟨term⟩ | `<term>` | nonterminal, or a token class of the `.lex` file |
| `(`, `assert`, `:sorts` | `"("`, `"assert"`, `":sorts"` | terminal, written exactly as in the source text |
| ::= | `::=` | production |
| \| | `\|` | alternative |
| ⟨x⟩∗ | `<x>*` | zero or more |
| ⟨x⟩+ | `<x>+` | one or more |
| ⟨x⟩ⁿ⁺¹ | `<x>^n+1` | one or more; every `^n+1` in one alternative repeats the same number of times. A context-free grammar cannot say that, so the generator reads it as `+`. |

A production starts with `<name> ::=` at the beginning of a line; a line starting with
`|` continues the previous production with a further alternative. Lines starting with
`#` are comments. A terminal never contains `"`. The reference has no optional (`?`)
operator and no grouping; neither do these files.

The `.lex` file adds two forms that only it uses:

- `/regex/` or `/regex/u`: an ECMAScript regular expression, matching one whole token.
  The `u` flag marks expressions that use `\u{...}` code points.
- `A - B`: the strings of `A` that are not strings of `B` (simple symbols minus
  reserved words).

Word lists (`<command_name>`, `<predefined_symbol>`, ...) are productions whose
alternatives are single terminals.

Every terminal of the `.bnf` file is `"("`, `")"`, a reserved word, a predefined keyword
or a predefined symbol, except `":produce-assertions"` (see "Discrepancies").

## Choices

- Spacing, the angle brackets ⟨⟩ and the superscript repetition marks are typographic
  in the PDF; the files follow the token sequence. ˜ and ˆ in Appendix B's list
  of symbol characters are the ASCII `~` and `^` (Section 3.1 prints them as such).
- Appendix B defines the lexical categories in prose; the regular expressions are
  written from it and tested against the examples of Section 3.1. They expand `<digit>`, `<letter>`, `<white_space_char>` and
  `<printable_char>` inline; the four productions stay as the record of Appendix B.
- `<decimal>` keeps the reference's form `<numeral>.0*<numeral>`. It denotes the same
  strings as `<numeral>.[0-9]+`.
- Names that Appendix B does not give, all in the `.lex` file and marked there:
  `<predefined_symbol>`, `<predefined_keyword>`, `<general_reserved_word>`,
  `<command_name>`, `<quoted_symbol>` (Section 3.1's term), `<line_comment>`.
  `<reserved>`, any reserved word, is named in Section 3.1.

## Discrepancies in the source

Found while writing the spec files. Items marked **deviation** are where the spec files differ
from the literal Appendix B text; each carries a comment at that place in the file.

1. `<get_unsat_assump_response>` is defined, but `<specific_success_response>` refers
   to `<get_unsat_assumptions_response>`, which is not defined. Same in Figure 3.10 and
   in the 2.6 reference; the list of specific responses in Section 3.11.1 uses
   `get_unsat_assump_response`, and so does julianthome's ANTLR grammar.
   **Deviation**, decided by Johannes 2026-11-12: the short name everywhere, so the
   `.bnf` file has no undefined nonterminal and no unused one apart from the top rules.
2. `<logic_attribute>` is written with `:=` instead of `::=` (Appendix B, Section 3.10
   and 2.6). **Deviation**, in notation only: written as `::=`.
3. The reserved command names of Appendix B (and of the 2.6 Appendix B) lack
   `define-funs-rec`, which has a production in `<command>`. Section 3.1 makes every
   command name of Section 3.11 a reserved word, and
   Figure 3.7 has `define-funs-rec`. **Deviation**, decided by Johannes 2026-11-12:
   added to `<command_name>`.
4. `:produce-assertions` is an alternative of `<option>` but not in Appendix B's list
   of predefined keywords. Kept as is.
5. `<printable_char>`: Appendix B says 32–126 and 128–255; Section 3.1 says 32–126 and
   128dec and up, for Unicode text in an 8-bit encoding such as UTF-8.
   The two agree if Appendix B counts bytes of the encoded text.
   **Deviation**, decided by Johannes 2026-11-12: every character from 128 up, as in
   Section 3.1. The regular expressions match code points, as in a JavaScript string:
   `\u{80}-\u{10FFFF}`. So a quoted-symbol example of Section 3.1 printed with `’`
   matches as printed, and with `'`.
6. `<keyword>` is `:<simple_symbol>`, and a simple symbol does not start with a digit,
   but Section 3.1 lists `:56` as an example keyword.
   **Deviation**, decided by Johannes 2026-11-12: a keyword is `:` followed by one or
   more symbol characters or digits, a digit first allowed.
7. Literally, `<keyword>` inherits the exclusion of reserved words from `<simple_symbol>`, so
   `:as` or `:assert` would not be keywords.
   **Deviation**, decided by Johannes 2026-11-12: reserved words are not excluded after
   `:`; `:as` is a keyword.
8. Section 3.1 does not restrict the characters of a comment; Appendix B does not
   define comments. `<line_comment>` takes any character up to 10dec or 13dec.
9. `<index>` is `<numeral> | <symbol>`, but the official UnicodeStrings theory on
   smt-lib.org writes characters as `(_ char #x41)`, with a hexadecimal index, and its
   notes call this an extension of the standard.
   **Deviation**, decided by Johannes 2026-11-12: `<hexadecimal>` added to `<index>`.
   Only hexadecimals: no official theory indexes with a decimal, binary or string, so
   those stay errors.
10. `(push <numeral>)` and `(pop <numeral>)` require the numeral; z3 and cvc5 also accept
   `(push)` and `(pop)` and read them as `(push 1)` and `(pop 1)`.
   **Deviation**, decided by Johannes 2026-11-12: `(push)` and `(pop)` added to
   `<command>`. Other arguments, such as a symbol, stay errors.

## Differences from 2.6

Against Appendix B of the latest 2.6 release (r2024-09-20,
`https://smt-lib.org/papers/smt-lib-reference-v2.6-r2024-09-20.pdf`, sha256
`d26111c0e49f0c655952d78d15ffab3d80c6160963da7411472ab884c5b5675b`), by diffing the
text of both appendices:

- Reserved words: `lambda`, `declare-sort-parameter` and `define-const` added.
- `<simple_symbol>`: the exclusion of reserved words added to Appendix B (Section 3.1 of
  2.6 already says so). The extracted text of the 2.6 Appendix B also lacks `~` and `^`
  in the list of symbol characters, which Section 3.1 of 2.6 has; possibly only a
  font that the text extraction does not map.
- `<symbol_>` (symbol or `_`) added; `<pattern>` uses it, so `_` is a wildcard pattern.
- `<term>`: the `lambda` alternative added.
- `<prop_literal>` (symbol or `(not symbol)`) removed; `check-sat-assuming` takes
  `<term>*` instead of `<prop_literal>*`.
- `<command>`: `declare-sort-parameter` and `define-const` added.
- `<get_unsat_assump_response>`: `( <symbol>* )` became `( <term>* )`.

Everything else, including the predefined symbols and keywords, is unchanged. The
2.7 releases 2026-03-27 and 2026-09-09 have the same Appendix B and Section 3.1; the
later one adds the `(f a)` shorthand for `(@ f a)` on monomorphic maps, which is
already a `( <qual_identifier> <term>+ )` term.

Production names against julianthome/smtlibv2-grammar (`SMTLIBv2.g4`, commit
`13f4f4cbe92bcc39fe3b425873a8616d58638059`, SMT-LIB 2.6 r2017-07-18, MIT):

- Same name in both: every production of the `.bnf` file except the four below.
- Named differently there: `logic_attribue` (`<logic_attribute>`), `error_behaviour`
  (`<error-behavior>`), `reason_unknown` (`<reason-unknown>`).
- Only here: `<symbol_>` (2.7).
- Only there: `prop_literal` (2.6, removed in 2.7); the start rules `start` (script) and
  `response` (general response); a wrapper rule per token class (`numeral`, `decimal`,
  `hexadecimal`, `binary`, `string`, `symbol`, `simpleSymbol`, `quotedSymbol`,
  `keyword`), per word list (`generalReservedWord`, `predefSymbol`, `predefKeyword`)
  and per command name (`cmd_assert` ... `cmd_setOption`).
- Content differences seen on the way, not used here: its `<s_expr>` lacks
  `<reserved>` (added in 2.6 r2021-04-02), and its `check-sat-assuming` takes no
  arguments.

## How the generator reads these files

`gen/bnf2lezer.mjs` (details and conflicts: `gen/CONFLICTS.md`):

- The top rules, from the scope decision in `PLAN.md`, are `<script>` (default),
  `<general_response>`, `<theory_decl>` and `<logic>`: exactly the `.bnf` productions
  that no other production uses.
- Each production becomes a node named in CamelCase (`<qual_identifier>` ->
  `QualIdentifier`), except `<spec_constant>`, `<s_expr>` and `<symbol_>`, which only
  wrap one child; the parenthesised alternative of `<s_expr>` is the node `List`.
- A token class of the `.lex` file that the `.bnf` file names becomes a token named in
  CamelCase (`<simple_symbol>` -> `SimpleSymbol`); `<line_comment>` becomes `LineComment`.
- Reserved words are specialized from `SimpleSymbol`; terminals that are predefined
  symbols or keywords extend `SimpleSymbol` and `Keyword`.
- Node names shared with lang-egglog: a parenthesised list is `List` with the literal
  tokens `"("` and `")"`, a comment is `LineComment`, a string literal is `String`.

## Redistribution

The reference permits verbatim copies of the whole document and forbids modified
versions; `NOTICE` quotes its notice. The PDF could be committed verbatim; it is not, to
keep the repository small. The notice says nothing about grammars written from the
document. To keep clear of copying its text, the spec files and this README quote at
most a few words of it; the productions are the reference's grammar in this notation,
and the fixtures are written for this repository.
