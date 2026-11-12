import {test} from "node:test"
import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import {buildParser} from "@lezer/generator"
import {generate, checkDeterministic, lezerRules, readOverlay} from "./bnf2lezer.mjs"
import {parseSpec, readSpec, words} from "./spec.mjs"
import {regexToLezer} from "./regex.mjs"

const spec = readSpec()
const overlay = readOverlay()
const {grammar, wordsTs} = generate(spec, overlay)
const src = new URL("../packages/codemirror-lang-smtlib/src/", import.meta.url)
const camel = name => name.replace(/[-_]+(.)/g, (_, c) => c.toUpperCase())
const pascal = name => camel(name).replace(/^./, c => c.toUpperCase())

test("the committed grammar and word lists are what the generator writes", () => {
  assert.equal(readFileSync(new URL("smtlib.grammar", src), "utf8"), grammar)
  assert.equal(readFileSync(new URL("words.ts", src), "utf8"), wordsTs)
})

test("every production of the .bnf file is reachable from a top rule of the grammar", () => {
  const rules = new Map(lezerRules(grammar).map(rule => [rule.name, rule]))
  const reached = new Set()
  const visit = name => {
    if (reached.has(name) || !rules.has(name)) return
    reached.add(name)
    for (const [word] of rules.get(name).body.matchAll(/[A-Za-z_]\w*/g)) visit(word)
  }
  for (const rule of rules.values()) if (rule.top) visit(rule.name)
  const missing = [...spec.bnf.keys()].filter(name => !reached.has(pascal(name)) && !reached.has(camel(name)))
  assert.deepEqual(missing, [])
})

test("every non-hidden production is a node type", () => {
  const parser = buildParser(grammar, {externalPropSource: () => () => null})
  const types = new Set(parser.nodeSet.types.map(type => type.name))
  const hidden = ["spec_constant", "s_expr", "symbol_"]
  const missing = [...spec.bnf.keys()].filter(name => !hidden.includes(name) && !types.has(pascal(name)))
  assert.deepEqual(missing, [])
})

test("outside responses the grammar is deterministic", () => {
  checkDeterministic(grammar)
})

test("an overlay rule named like a production must repeat its body", () => {
  const changed = overlay.replace("GetProofResponse[@dynamicPrecedence=-2] { sExpr }", "GetProofResponse[@dynamicPrecedence=-2] { List }")
  assert.notEqual(changed, overlay)
  assert.throws(() => generate(spec, changed), /body of GetProofResponse differs/)
})

test("undefined and unused productions are errors", () => {
  const withBnf = text => ({bnf: parseSpec(text), lex: spec.lex})
  assert.throws(() => generate(withBnf("<script> ::= <command>*\n<command> ::= <nothing>"), overlay), /<nothing> is not defined/)
  const extra = readFileSync(new URL("../spec/smtlib-2.7.bnf", import.meta.url), "utf8") + '\n<orphan> ::= "("\n'
  assert.throws(() => generate(withBnf(extra), overlay), /unused productions: <orphan>/)
})

test("terminals must be parens, reserved words, keywords or symbols", () => {
  const text = readFileSync(new URL("../spec/smtlib-2.7.bnf", import.meta.url), "utf8").replace('"check-sat" ")"', '"check sat" ")"')
  assert.throws(() => generate({bnf: parseSpec(text), lex: spec.lex}, overlay), /terminal "check sat"/)
})

// Lezer's reading of each translated token against the regular expression it came from.
test("every token matches what its regular expression matches", () => {
  const alphabet = ["0", "1", "7", "a", "F", "x", "b", "#", ".", ":", ";", "|", "\\", '"', " ", "\t", "\n", "\r", "-", "+", "~", "^", "@", "\x00", "\x7f", "é", "’", "😀"]
  const samples = [""]
  let seed = 1
  const random = n => ((seed = (seed * 1103515245 + 12345) % 2 ** 31), seed % n)
  for (let i = 0; i < 4000; i++) {
    let s = ""
    for (let length = 1 + random(7); length; length--) s += alphabet[random(alphabet.length)]
    samples.push(s)
  }
  for (const [name, [[first]]] of spec.lex) {
    if (!first.regex) continue
    const prefix = {string: '"', quoted_symbol: "|", hexadecimal: "#x", binary: "#b", keyword: ":", line_comment: ";"}[name] ?? ""
    const suffix = {string: '"', quoted_symbol: "|"}[name] ?? ""
    const parser = buildParser(`@top T { tok } @tokens { tok { ${regexToLezer(first.regex)} } }`)
    const whole = new RegExp(`^(?:${first.regex.source})$`, first.regex.flags)
    for (const sample of samples) {
      const text = prefix + sample + suffix
      let lezer = true
      try {
        parser.configure({strict: true}).parse(text)
      } catch {
        lezer = false
      }
      assert.equal(lezer, whole.test(text), `<${name}> on ${JSON.stringify(text)}`)
    }
  }
})

// Cases in the style of Section 3.1's examples, and near misses.
test("the token classes of the .lex file read their cases", () => {
  const token = name => new RegExp(`^(?:${spec.lex.get(name)[0][0].regex.source})$`, spec.lex.get(name)[0][0].regex.flags)
  const cases = {
    numeral: [["0", "42", "100"], ["01", "", "-1"]],
    decimal: [["0.0", "1.5", "1.05", "10.500", "1.00"], ["1.", ".5", "01.5", "1.5e3"]],
    hexadecimal: [["#x0", "#xB7", "#x0c3D", "#xff10"], ["#x", "#X0", "#xg"]],
    binary: [["#b0", "#b1", "#b010", "#b110100"], ["#b", "#b2"]],
    string: [
      ['"plain  text"', '""', '"a ""quoted"" word"', '"first\n\nthird line"', '"\\n"', '"é ’ 😀"'],
      ['"a"b"', '"', '"\x00"', '"\x7f"', '"\x0b"'],
    ],
    simple_symbol: [["+", ">=", "y", "minus", "//", "%", "<ab", "<cd>", "xyz9", "*%t&1", ".h", ".7", "+12", "-5", "~^", "as"], ["1a", "a b", "é", "", "a|b"]],
    quoted_symbol: [
      ["|with  spaces|", "|over\n  lines|", "||", '| " inside|', "|(&*)^#$>>?\"’]]0|", "|😀|"],
      ["|a|b|", "|a\\b|", "|", "|\x7f|"],
    ],
    keyword: [[":time", ":b3", ":bar-baz", ":>=", ":56", ":=>", ":as", ":assert"], [":", "::a", ":a b", ":|a|", ":é"]],
    line_comment: [["; x", ";", ";;a ’"], ["; x\n", "; x\ry"]],
  }
  for (const [name, [yes, no]] of Object.entries(cases)) {
    for (const s of yes) assert.ok(token(name).test(s), `<${name}> rejects ${JSON.stringify(s)}`)
    for (const s of no) assert.ok(!token(name).test(s), `<${name}> accepts ${JSON.stringify(s)}`)
  }
  const reserved = new Set(spec.lex.get("reserved").flatMap(([{ref}]) => words(spec.lex, ref)))
  for (const word of ["as", "let", "assert", "NUMERAL", "define-funs-rec"]) assert.ok(reserved.has(word), word)
})
