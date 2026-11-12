; Arrays with integer indices.
; oracle: z3 cvc5
(set-option :produce-models true)
(set-logic QF_AUFLIA)
(declare-fun m () (Array Int Int))
(declare-fun i () Int)
(assert (= (select (store m i 5) i) 5))
(assert (= (select m 0) (- i 1)))
(assert (> i 2))
(check-sat)
(get-value ((select m 0) (select (store m i 5) i)))
