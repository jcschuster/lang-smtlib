; Values of arrays over a parametric datatype: a model that a solver can only print with
; qualified terms (as ...), queried through get-value on applications and constants.
; oracle: z3 cvc5
(set-option :produce-models true)
(set-logic ALL)
(declare-datatype Opt (par (E) ((none) (some (val E)))))
(declare-const m (Array Int (Opt Bool)))
(declare-const k Int)
(declare-fun g (Int) Int)
(assert (= (g k) (g (+ k 1))))
(assert ((_ is some) (select m k)))
(assert (val (select m k)))
(check-sat)
(get-value (k (g k)))
(get-value ((select m k) (select m (+ k 7))))
(get-value (m))
