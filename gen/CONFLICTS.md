# Conflicts and the overlay

`gen/bnf2lezer.mjs` turns each production of `spec/smtlib-2.7.bnf` into a Lezer rule. This
file records every conflict Lezer reports for that translation and how it is resolved, and
lists what `gen/overlay.grammar` adds. Checked with @lezer/generator 1.8.1.

## Scripts, theory and logic declarations: none

With `<script>`, `<theory_decl>` and `<logic>` as top rules, the translated grammar has no
LR conflict: after `(`, every alternative is told apart by a reserved word (`assert`,
`let`, `_`, `as`, `par`, ...) or by the kind of the next token. `checkDeterministic` in the
generator rebuilds the grammar without ambiguity markers and without the `Responses` top on
every `pnpm generate`, and fails if that reports a conflict, so GLR parsing stays confined
to responses.

## Command responses: ambiguous by design

The language of `<general_response>` is ambiguous: `<get_proof_response>` is any
`<s_expr>`, so it covers every other response, and the specific responses overlap among
themselves (`()` is an empty assertion list, assignment, model, unsat core and assumption
list). Which reading is meant depends on the command the solver answered, which the
response does not show. Without markers, Lezer reports these six conflicts:

1. reduce/reduce `specConstant -> String` and `EchoResponse -> String`
2. reduce/reduce `sExpr -> specConstant` and `AttributeValue -> specConstant`
3. reduce/reduce `Identifier -> symbol` and `symbol+ -> symbol` (a term list or an unsat core)
4. reduce/reduce `List -> "(" ")"` and `GetAssertionsResponse -> "(" ")"` (an empty list)
5. shift/reduce `Term -> · "(" QualIdentifier Term+ ")"` and `Term -> QualIdentifier` (a term list or valuation pairs)
6. shift/reduce `symbol -> · SimpleSymbol` and `reserved -> SimpleSymbol/"_"`

Resolution: the generator puts the ambiguity marker `~response` at every position of every
rule reachable from `<general_response>`, so Lezer accepts all such conflicts and parses
responses with GLR, keeping every reading alive until it fails. Where several readings
survive, the dynamic precedences in the overlay pick the most specific one:

| Rule | Precedence | Why |
|---|---|---|
| `GetAssignmentResponse` | 3 | `((a true))` is also a valuation list and a term list |
| `GetValueResponse` | 2 | `((x 1))` is also a term list |
| `GetUnsatCoreResponse` | 2 | `(a b)` is also a term list |
| `GetAssertionsResponse` | 1 | over `GetUnsatAssumpResponse`, which has the same body |
| `GetOptionResponse` | -1 | any `<attribute_value>`; loses to every specific response |
| `GetProofResponse` | -2 | any `<s_expr>`; loses to everything |

Ties left: an empty list `()` reads as `GetAssignmentResponse`; `<get_unsat_assump_response>`
never wins over `<get_assertions_response>`. Neither changes highlighting.

Limit: Lezer prunes parallel readings that have run for more than 500 nodes without
merging, keeping the one with the higher score so far, then the longer one. Precedences on
the response rules only count once the response is complete, so a long response may keep
another reading than a short one would: a get-unsat-core answer with hundreds of names
reads as `GetAssertionsResponse` (a list of terms). It still parses without errors.

## Words

- Reserved words (`<general_reserved_word>`, `<command_name>`) are `@specialize`d from the
  simple-symbol token, so they are never symbols, as Section 3.1 requires.
- Predefined symbols used as terminals (`true`, `sat`, `success`, `theory`, ...) and keyword
  terminals (`:print-success`, `:sorts`, ...) are `@extend`ed: they remain symbols and
  keywords too, because Appendix B allows both readings (`:print-success true` is an
  `<option>` through its own alternative and through `<attribute>`). The `sym` and `key`
  templates carry dynamic precedence 1, so where both readings parse the specific one wins.

## Tokens

- `Numeral` and `Decimal` overlap (`0` is a prefix of `0.5`): `@precedence { Decimal,
  Numeral }`.
- No other token overlaps; Lezer reports none.

## What the overlay adds

- The four top rules. `Script` is `<script>` plus `GenericCommand`, `( <symbol> <s_expr>* )`,
  for commands outside the standard (solver extensions such as `check-sat-using`, decided
  by Johannes 2026-11-12). `Responses`, `TheoryFile` and `LogicFile` are zero or more
  `<general_response>`, `<theory_decl>` and `<logic>`: a solver answers command by command,
  and an empty document should parse.
- `@skip { whitespace | LineComment }`, with `whitespace` one or more `<white_space_char>`.
- The dynamic precedences above, each on a rule that repeats its generated body (the
  generator checks that it does).
- The token precedence above, the paren tokens, the highlighting prop source and
  `@detectDelim`.
