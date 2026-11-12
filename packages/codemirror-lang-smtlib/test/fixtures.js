import {smtlibLanguage} from "../dist/index.js"
import {getStyleTags, highlightTree, tagHighlighter, tags as t} from "@lezer/highlight"
import {fileTests} from "@lezer/generator/dist/test"
import assert from "assert"
import * as fs from "fs"
import * as path from "path"
import {fileURLToPath} from "url"

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "fixtures")
const parse = (text, top) => (top ? smtlibLanguage.parser.configure({top}) : smtlibLanguage.parser).parse(text)

function errors(text, top) {
  const found = []
  parse(text, top).iterate({
    enter: node => { if (node.type.isError) found.push(JSON.stringify(text.slice(node.from, node.from + 30))) },
  })
  return found
}

// Scripts parse as scripts, and what z3 and cvc5 answered (.github/scripts/check-fixtures.sh)
// parses as responses.
for (const [dir, top] of [["valid", "Script"], ["responses", "Responses"]]) {
  describe(`fixtures/${dir}`, () => {
    for (const file of fs.readdirSync(path.join(fixtures, dir)).sort()) {
      it(`${file} parses as ${top} without error nodes`, () => {
        assert.deepStrictEqual(errors(fs.readFileSync(path.join(fixtures, dir, file), "utf8"), top), [])
      })
    }
  })
}

describe("highlighting", () => {
  // One class per tag the highlight table uses, so modified tags stay distinct.
  const highlighter = tagHighlighter([
    {tag: t.keyword, class: "command"},
    {tag: t.controlKeyword, class: "binder"},
    {tag: t.modifier, class: "reserved"},
    {tag: t.definitionKeyword, class: "declaration"},
    {tag: t.attributeName, class: "keyword"},
    {tag: t.bool, class: "bool"},
    {tag: t.atom, class: "atom"},
    {tag: t.variableName, class: "symbol"},
    {tag: t.special(t.variableName), class: "quoted"},
    {tag: t.typeName, class: "sort"},
    {tag: t.definition(t.typeName), class: "sort-definition"},
    {tag: t.definition(t.variableName), class: "variable-definition"},
    {tag: t.definition(t.function(t.variableName)), class: "function-definition"},
    {tag: t.definition(t.namespace), class: "name"},
    {tag: t.integer, class: "integer"},
    {tag: t.float, class: "float"},
    {tag: t.number, class: "number"},
    {tag: t.string, class: "string"},
    {tag: t.lineComment, class: "comment"},
    {tag: t.paren, class: "paren"},
  ])

  // Each highlighted piece of text with its class, in document order.
  function classes(text, top) {
    const result = []
    highlightTree(parse(text, top), highlighter, (from, to, cls) => result.push([text.slice(from, to), cls]))
    return result
  }

  it("tells command names, binders, reserved words, sorts, literals and comments apart", () => {
    const text = [
      "; c",
      "(declare-fun f ((_ BitVec 8) |s t|) Bool)",
      "(define-fun g ((x Int)) Int (let ((y 1.5)) (! (as x Int) :named n)))",
      '(assert (forall ((z Int)) (f #x0f #b1 "s" 7)))',
      "(set-option :print-success true)",
    ].join("\n")
    assert.deepStrictEqual(classes(text), [
      ["; c", "comment"],
      ["(", "paren"], ["declare-fun", "command"], ["f", "symbol"], ["(", "paren"], ["(", "paren"], ["_", "reserved"],
      ["BitVec", "sort"], ["8", "integer"], [")", "paren"], ["|s t|", "sort"], [")", "paren"], ["Bool", "sort"], [")", "paren"],
      ["(", "paren"], ["define-fun", "command"], ["g", "function-definition"], ["(", "paren"], ["(", "paren"],
      ["x", "variable-definition"], ["Int", "sort"], [")", "paren"], [")", "paren"], ["Int", "sort"], ["(", "paren"],
      ["let", "binder"], ["(", "paren"], ["(", "paren"], ["y", "variable-definition"], ["1.5", "float"], [")", "paren"],
      [")", "paren"], ["(", "paren"], ["!", "reserved"], ["(", "paren"], ["as", "reserved"], ["x", "symbol"],
      ["Int", "sort"], [")", "paren"], [":named", "keyword"], ["n", "symbol"], [")", "paren"], [")", "paren"], [")", "paren"],
      ["(", "paren"], ["assert", "command"], ["(", "paren"], ["forall", "binder"], ["(", "paren"], ["(", "paren"],
      ["z", "variable-definition"], ["Int", "sort"], [")", "paren"], [")", "paren"], ["(", "paren"], ["f", "symbol"],
      ["#x0f", "number"], ["#b1", "number"], ['"s"', "string"], ["7", "integer"], [")", "paren"], [")", "paren"],
      [")", "paren"],
      ["(", "paren"], ["set-option", "command"], [":print-success", "keyword"], ["true", "bool"], [")", "paren"],
    ])
  })

  it("highlights response words and declarations", () => {
    const pick = (text, top) => classes(text, top).filter(([, cls]) => cls != "paren")
    assert.deepStrictEqual(pick('sat (error "e") ((a true))', "Responses"), [
      ["sat", "atom"], ["error", "atom"], ['"e"', "string"], ["a", "symbol"], ["true", "bool"],
    ])
    assert.deepStrictEqual(pick("(theory T :sorts ((S 0)) :funs ((f S S)))", "TheoryFile"), [
      ["theory", "declaration"], ["T", "name"], [":sorts", "keyword"], ["S", "sort-definition"], ["0", "integer"],
      [":funs", "keyword"], ["f", "function-definition"], ["S", "sort"], ["S", "sort"],
    ])
    assert.deepStrictEqual(pick('(logic L :theories (T) :language "x")', "LogicFile"), [
      ["logic", "declaration"], ["L", "name"], [":theories", "keyword"], ["T", "symbol"], [":language", "keyword"],
      ['"x"', "string"],
    ])
    assert.deepStrictEqual(pick("(declare-datatypes ((L 0)) (((nil) (cons (hd Int) (tl L)))))"), [
      ["declare-datatypes", "command"], ["L", "sort-definition"], ["0", "integer"], ["nil", "function-definition"],
      ["cons", "function-definition"], ["hd", "function-definition"], ["Int", "sort"], ["tl", "function-definition"],
      ["L", "sort"],
    ])
  })

  // Nodes that carry no tag of their own: their children do.
  const untagged = new Set([
    "Script", "Responses", "TheoryFile", "LogicFile", "GenericCommand", "List", "Index", "Identifier", "Sort",
    "AttributeValue", "Attribute", "QualIdentifier", "VarBinding", "SortedVar", "Pattern", "MatchCase", "Term",
    "SortSymbolDecl", "MetaSpecConstant", "FunSymbolDecl", "ParFunSymbolDecl", "TheoryAttribute", "TheoryDecl",
    "LogicAttribute", "Logic", "InfoFlag", "BValue", "Option", "SortDec", "SelectorDec", "ConstructorDec",
    "DatatypeDec", "FunctionDec", "FunctionDef", "Command", "ErrorBehavior", "ReasonUnknown", "ModelResponse",
    "InfoResponse", "ValuationPair", "TValuationPair", "CheckSatResponse", "EchoResponse", "GetAssertionsResponse",
    "GetAssignmentResponse", "GetInfoResponse", "GetModelResponse", "GetOptionResponse", "GetProofResponse",
    "GetUnsatAssumpResponse", "GetUnsatCoreResponse", "GetValueResponse", "SpecificSuccessResponse",
    "GeneralResponse",
  ])

  it("tags every node type, or lists it as untagged", () => {
    // Context-free rules only: every tagged node type has one.
    for (const type of smtlibLanguage.parser.nodeSet.types) {
      if (!type.name || type.isError) continue
      assert.equal(!!getStyleTags({type, matchContext: () => false}), !untagged.has(type.name), type.name)
    }
  })
})

describe("coverage", () => {
  it("every node type occurs in a test case or fixture", () => {
    const seen = new Set()
    const visit = (text, top) => parse(text, top).iterate({enter: node => { seen.add(node.name) }})
    const here = path.dirname(fileURLToPath(import.meta.url))
    for (const file of fs.readdirSync(here).filter(f => f.endsWith(".txt")))
      for (const {text, config} of fileTests(fs.readFileSync(path.join(here, file), "utf8"), file)) visit(text, config?.top)
    for (const [dir, top] of [["valid", "Script"], ["responses", "Responses"]])
      for (const file of fs.readdirSync(path.join(fixtures, dir))) visit(fs.readFileSync(path.join(fixtures, dir, file), "utf8"), top)
    // Its body is that of GetAssertionsResponse, which takes precedence (gen/CONFLICTS.md).
    seen.add("GetUnsatAssumpResponse")
    const names = smtlibLanguage.parser.nodeSet.types.filter(type => type.name && !type.isError).map(type => type.name)
    assert.deepStrictEqual(names.filter(name => !seen.has(name)), [])
  })
})
