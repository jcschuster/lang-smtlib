; Uninterpreted sorts and functions, named assertions and unsat cores.
; oracle: z3 cvc5
(set-option :produce-unsat-cores true)
(set-logic QF_UF)
(declare-sort U 0)
(declare-fun f (U) U)
(declare-fun |a constant| () U)
(declare-const b U)
(assert (! (= (f |a constant|) b) :named eq1))
(assert (! (= (f b) |a constant|) :named eq2))
(assert (! (not (= (f (f |a constant|)) |a constant|)) :named neq))
(check-sat)
(get-unsat-core)
