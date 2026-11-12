; Floating point: indexed sorts, rounding modes, fp literals built from bit-vectors.
; oracle: z3 cvc5
(set-option :produce-models true)
(set-logic QF_FP)
(define-sort F32 () (_ FloatingPoint 8 24))
(declare-const x F32)
(declare-const r RoundingMode)
(define-const one F32 (fp #b0 #b01111111 #b00000000000000000000000))
(assert (fp.eq (fp.add RNE x one) ((_ to_fp 8 24) RNE 3.0)))
(assert (= r RTZ))
(assert (not (fp.isNaN (fp.mul r x x))))
(check-sat)
(get-value (x))
