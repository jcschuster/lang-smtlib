import {smtlib, smtlibLanguage} from "../dist/index.js"
import {EditorState} from "@codemirror/state"
import {CompletionContext} from "@codemirror/autocomplete"
import {foldable, getIndentation, syntaxTree} from "@codemirror/language"
import assert from "assert"

const state = doc => EditorState.create({doc, extensions: [smtlib()]})

describe("completion", () => {
  // Labels offered at the end of `doc`.
  function labels(doc, explicit = false) {
    const s = state(doc)
    const [source] = s.languageDataAt("autocomplete", doc.length)
    const result = source(new CompletionContext(s, doc.length, explicit))
    return result && result.options.map(option => option.label)
  }

  it("offers command names at top level", () => {
    const offered = labels("(set-logic QF_LIA)\n(decl")
    assert.ok(offered.includes("declare-fun") && offered.includes("define-funs-rec") && offered.includes("check-sat"))
    assert.ok(!offered.includes("forall"))
  })

  it("offers the other reserved words in a nested list", () => {
    const offered = labels("(assert (fo")
    assert.ok(offered.includes("forall") && offered.includes("lambda") && offered.includes("_"))
    assert.ok(!offered.includes("assert"))
  })

  it("offers predefined keywords after a colon", () => {
    const offered = labels("(set-option :produce-m")
    assert.ok(offered.includes(":produce-models") && offered.includes(":named"))
  })

  it("offers nothing in argument position, or on an empty head unless asked", () => {
    assert.equal(labels("(assert x"), null)
    assert.equal(labels("("), null)
    assert.ok(labels("(", true).includes("assert"))
  })
})

describe("indentation", () => {
  // Indentation of the last line of `doc`.
  const indent = doc => getIndentation(state(doc), doc.lastIndexOf("\n") + 1)

  it("aligns with the first argument on the opening line", () => {
    assert.equal(indent("(assert (and p\n"), 13)
  })

  it("indents one unit when the head stands alone", () => {
    assert.equal(indent("(assert\n"), 2)
    assert.equal(indent("(assert\n  (and\n"), 4)
  })

  it("lines a closing paren up with its opening one", () => {
    assert.equal(indent("(assert\n  (and\n    p\n    )"), 2)
  })
})

describe("folding", () => {
  it("folds a command inside its parens", () => {
    const doc = "(assert\n  (and p q))"
    assert.deepStrictEqual(foldable(state(doc), 0, doc.indexOf("\n")), {from: 1, to: doc.length - 1})
  })
})

describe("top rules", () => {
  it("parses scripts by default and the other tops on request", () => {
    for (const [top, text, node] of [
      [undefined, "(check-sat)", "Command"],
      ["Responses", "unsat", "GeneralResponse"],
      ["TheoryFile", "(theory T)", "TheoryDecl"],
      ["LogicFile", "(logic L)", "Logic"],
    ]) {
      const language = top ? smtlibLanguage.configure({top}) : smtlibLanguage
      const s = EditorState.create({doc: text, extensions: [language]})
      assert.equal(syntaxTree(s).topNode.firstChild.name, node)
    }
  })
})
