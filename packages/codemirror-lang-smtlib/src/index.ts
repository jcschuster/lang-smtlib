import {parser} from "./smtlib.grammar"
import {commandNames, generalReservedWords, predefinedKeywords} from "./words"
import {
  LRLanguage,
  LanguageSupport,
  indentNodeProp,
  foldNodeProp,
  syntaxTree,
  TreeIndentContext,
} from "@codemirror/language"
import type {SyntaxNode} from "@lezer/common"
import type {Completion, CompletionContext, CompletionResult} from "@codemirror/autocomplete"

const parenthesised = (node: SyntaxNode) => node.firstChild?.name == "(" && node.lastChild?.name == ")"

/// Lisp-style indentation: a closing paren lines up with its opening one, an argument with
/// the first argument when that follows the head on the opening line, and anything else
/// one unit in from the opening paren.
function lispIndent(context: TreeIndentContext) {
  const open = context.node.firstChild
  if (open?.name != "(") return context.continue()
  if (/^\s*\)/.test(context.textAfter)) return context.column(open.from)
  const head = open.nextSibling
  const argument = head?.nextSibling
  if (argument && argument.name != ")" && context.lineAt(argument.from).from == context.lineAt(open.from).from)
    return context.column(argument.from)
  return context.column(open.from) + context.unit
}

const completions = (words: readonly string[], type: string): Completion[] => words.map(label => ({label, type}))
const commandCompletions = completions(commandNames, "keyword")
const reservedCompletions = completions(generalReservedWords, "keyword")
const keywordCompletions = completions(predefinedKeywords, "property")
const symbolChar = /[0-9A-Za-z+\-/*=%?!.$_~&^<>@]/

/// Command names after a `(` at top level, the other reserved words after a nested `(`,
/// and predefined keywords after `:`.
function smtlibCompletion(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/:?[0-9A-Za-z+\-/*=%?!.$_~&^<>@]*/)!
  if (word.text.startsWith(":")) return {from: word.from, options: keywordCompletions, validFor: /^:[0-9A-Za-z+\-/*=%?!.$_~&^<>@]*$/}
  if (context.state.sliceDoc(word.from - 1, word.from) != "(" || (!word.text && !context.explicit)) return null
  const inside = syntaxTree(context.state).resolveInner(word.from, -1)
  const list = inside.name == "(" ? inside.parent : inside
  return {
    from: word.from,
    options: list?.parent?.type.isTop ? commandCompletions : reservedCompletions,
    validFor: new RegExp(`^${symbolChar.source}*$`),
  }
}

/// The SMT-LIB language: highlighting (from `highlight.ts`, attached by the grammar), folding
/// of parenthesised forms, Lisp-style indentation and completion of command names, reserved
/// words and predefined keywords. Scripts are the default; `configure({top})` selects
/// `"Responses"`, `"TheoryFile"` or `"LogicFile"`.
export const smtlibLanguage = LRLanguage.define({
  name: "smtlib",
  parser: parser.configure({
    props: [
      indentNodeProp.add(type => (type.isTop ? undefined : lispIndent)),
      foldNodeProp.add(type => (type.isTop ? undefined : node => (parenthesised(node) ? {from: node.firstChild!.to, to: node.lastChild!.from} : null))),
    ],
  }),
  languageData: {
    commentTokens: {line: ";"},
    closeBrackets: {brackets: ["(", '"', "|"]},
    autocomplete: smtlibCompletion,
  },
})

/// SMT-LIB language support for CodeMirror.
export function smtlib() {
  return new LanguageSupport(smtlibLanguage)
}
