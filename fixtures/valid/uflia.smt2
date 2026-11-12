; Quantifiers with patterns.
; oracle: z3 cvc5
(set-logic UFLIA)
(declare-fun f (Int) Int)
(declare-fun g (Int Int) Bool)
(assert (forall ((x Int)) (! (> (f x) x) :pattern ((f x)))))
(assert (forall ((x Int) (y Int)) (! (=> (g x y) (g y x)) :pattern ((g x y)))))
(assert (g 0 1))
(assert (< (f 3) 2))
(check-sat)
