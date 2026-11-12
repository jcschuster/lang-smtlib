; Unicode strings and regular expressions, with the "" escape in string literals and a
; character with a hexadecimal index (a deviation, spec/README.md).
; oracle: z3 cvc5
(set-option :produce-models true)
(set-logic QF_SLIA)
(declare-const s String)
(declare-const t String)
(assert (= (str.++ s "-" t) "say ""hi""-there"))
(assert (str.in_re t (re.+ (re.range "a" "z"))))
(assert (= (str.len s) 8))
(assert (str.prefixof "say" s))
(assert (= (str.at s 0) (_ char #x73)))
(check-sat)
(get-value (s t))
