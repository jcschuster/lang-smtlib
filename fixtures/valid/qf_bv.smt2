; Fixed-size bit-vectors: indexed sorts and operators, binary and hexadecimal literals.
; oracle: z3 cvc5
(set-option :produce-models true)
(set-logic QF_BV)
(declare-const a (_ BitVec 8))
(declare-const b (_ BitVec 8))
(define-fun low ((v (_ BitVec 8))) (_ BitVec 4) ((_ extract 3 0) v))
(assert (= (bvadd a b) #x10))
(assert (= (low a) #b0011))
(assert (bvult ((_ zero_extend 8) b) (concat #x00 #xff)))
(assert (= ((_ rotate_left 1) a) (bvor (bvshl a #x01) (bvlshr a #x07))))
(check-sat)
(get-value (a b (low b)))
(get-model)
