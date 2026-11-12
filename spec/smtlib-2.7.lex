# SMT-LIB 2.7 lexicon, written from Appendix B (its lexical part) and Section 3.1 of The
# SMT-LIB Standard, Version 2.7, release 2026-09-09 (see SOURCE), in Appendix B's order.
# Notation: README.md.

# Predefined symbols
#
# Not reserved words: each is a <simple_symbol>. Name not in Appendix B.

<predefined_symbol> ::= "Bool" | "continued-execution" | "error" | "false"
                      | "immediate-exit" | "incomplete" | "logic" | "memout" | "sat"
                      | "success" | "theory" | "true" | "unknown" | "unsupported"
                      | "unsat"

# Predefined keywords
#
# Each is a <keyword>. Name not in Appendix B.

<predefined_keyword> ::= ":all-statistics" | ":assertion-stack-levels" | ":authors"
                       | ":category" | ":chainable" | ":definition"
                       | ":diagnostic-output-channel" | ":error-behavior" | ":extensions"
                       | ":funs" | ":funs-description" | ":global-declarations"
                       | ":interactive-mode" | ":language" | ":left-assoc" | ":license"
                       | ":name" | ":named" | ":notes" | ":pattern" | ":print-success"
                       | ":produce-assignments" | ":produce-models" | ":produce-proofs"
                       | ":produce-unsat-assumptions" | ":produce-unsat-cores"
                       | ":random-seed" | ":reason-unknown" | ":regular-output-channel"
                       | ":reproducible-resource-limit" | ":right-assoc"
                       | ":smt-lib-version" | ":sorts" | ":sorts-description" | ":source"
                       | ":status" | ":theories" | ":values" | ":verbosity" | ":version"

# Auxiliary Lexical Categories

<white_space_char> ::= /[\t\n\r ]/
# Deviation, decided by Johannes 2026-11-12: Appendix B has 32dec to 126dec and 128dec
# to 255dec; this follows Section 3.1 (128dec and up). README.md, "Discrepancies", 5.
<printable_char> ::= /[\x20-\x7E\u{80}-\u{10FFFF}]/u
<digit> ::= /[0-9]/
<letter> ::= /[A-Za-z]/

# Tokens: Reserved Words
#
# <reserved>, any reserved word, is named in Section 3.1. <general_reserved_word> and
# <command_name> are not Appendix B names, only labels of its two lists.

<reserved> ::= <general_reserved_word> | <command_name>
<general_reserved_word> ::= "!" | "_" | "as" | "BINARY" | "DECIMAL" | "exists"
                          | "HEXADECIMAL" | "forall" | "lambda" | "let" | "match"
                          | "NUMERAL" | "par" | "STRING"
# Deviation, decided by Johannes 2026-11-12: Appendix B's list lacks define-funs-rec,
# added because Section 3.1 makes every command name of Section 3.11 a reserved word.
# README.md, "Discrepancies", 3.
<command_name> ::= "assert" | "check-sat" | "check-sat-assuming" | "declare-const"
                 | "declare-datatype" | "declare-datatypes" | "declare-fun"
                 | "declare-sort" | "declare-sort-parameter" | "define-const"
                 | "define-fun" | "define-fun-rec" | "define-funs-rec" | "define-sort"
                 | "echo" | "exit"
                 | "get-assertions" | "get-assignment" | "get-info" | "get-model"
                 | "get-option" | "get-proof" | "get-unsat-assumptions"
                 | "get-unsat-core" | "get-value" | "pop" | "push" | "reset"
                 | "reset-assertions" | "set-info" | "set-logic" | "set-option"

# Tokens: Other tokens
#
# "(" and ")" are tokens themselves. Appendix B defines the other token classes in prose;
# the expressions below follow it.

<numeral> ::= /0|[1-9][0-9]*/
# Appendix B's form <numeral>.0*<numeral>.
<decimal> ::= /(?:0|[1-9][0-9]*)\.0*(?:0|[1-9][0-9]*)/
<hexadecimal> ::= /#x[0-9A-Fa-f]+/
<binary> ::= /#b[01]+/
# The only escape is "" for one ".
<string> ::= /"(?:[\t\n\r\x20\x21\x23-\x7E\u{80}-\u{10FFFF}]|"")*"/u
<simple_symbol> ::= /[A-Za-z+\-\/*=%?!.$_~&^<>@][0-9A-Za-z+\-\/*=%?!.$_~&^<>@]*/ - <reserved>
# Unnamed in Appendix B; Section 3.1 calls it a quoted symbol.
<quoted_symbol> ::= /\|[\t\n\r\x20-\x5B\x5D-\x7B\x7D\x7E\u{80}-\u{10FFFF}]*\|/u
<symbol> ::= <simple_symbol> | <quoted_symbol>
# Deviation, decided by Johannes 2026-11-12: Appendix B has :<simple_symbol>. Here a
# digit may come first (Section 3.1 lists :56 as a keyword) and reserved words are not
# excluded (:as is a keyword). README.md, "Discrepancies", 6 and 7.
<keyword> ::= /:[0-9A-Za-z+\-\/*=%?!.$_~&^<>@]+/

# Whitespace (Section 3.1; Appendix B does not define comments)
#
# From ; to the next 10dec or 13dec, outside string literals and quoted symbols.

<line_comment> ::= /;[^\n\r]*/
