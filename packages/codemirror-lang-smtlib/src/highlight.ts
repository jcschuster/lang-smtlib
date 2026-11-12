import type {NodePropSource} from "@lezer/common"
import {styleTags, tags as t, type Tag} from "@lezer/highlight"
import {commandNames, generalReservedWords, keywordTokens, symbolTokens} from "./words"

// styleTags selectors name nodes; these node names are the words themselves.
const words = (list: readonly string[], tag: Tag) => Object.fromEntries(list.map(word => [JSON.stringify(word), tag]))

const binders = ["let", "forall", "exists", "match", "lambda"]
const atoms = symbolTokens.filter(word => !["true", "false", "theory", "logic"].includes(word))

export const smtlibHighlighting: NodePropSource = styleTags({
  ...words(generalReservedWords, t.modifier),
  ...words(binders, t.controlKeyword),
  ...words(commandNames, t.keyword),
  ...words(["theory", "logic"], t.definitionKeyword),
  ...words(["true", "false"], t.bool),
  ...words(atoms, t.atom),
  ...words(keywordTokens, t.attributeName),
  Keyword: t.attributeName,
  SimpleSymbol: t.variableName,
  QuotedSymbol: t.special(t.variableName),
  "Sort/Identifier/SimpleSymbol Sort/Identifier/QuotedSymbol": t.typeName,
  "SortDec/SimpleSymbol SortDec/QuotedSymbol SortSymbolDecl/Identifier/SimpleSymbol": t.definition(t.typeName),
  "FunctionDef/SimpleSymbol FunctionDef/QuotedSymbol FunctionDec/SimpleSymbol FunctionDec/QuotedSymbol":
    t.definition(t.function(t.variableName)),
  "ConstructorDec/SimpleSymbol ConstructorDec/QuotedSymbol SelectorDec/SimpleSymbol SelectorDec/QuotedSymbol":
    t.definition(t.function(t.variableName)),
  "FunSymbolDecl/Identifier/SimpleSymbol": t.definition(t.function(t.variableName)),
  "SortedVar/SimpleSymbol SortedVar/QuotedSymbol VarBinding/SimpleSymbol VarBinding/QuotedSymbol":
    t.definition(t.variableName),
  "TheoryDecl/SimpleSymbol Logic/SimpleSymbol": t.definition(t.namespace),
  Numeral: t.integer,
  Decimal: t.float,
  "Hexadecimal Binary": t.number,
  String: t.string,
  LineComment: t.lineComment,
  "( )": t.paren,
})
