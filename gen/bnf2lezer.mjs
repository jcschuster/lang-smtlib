// Writes packages/codemirror-lang-smtlib/src/smtlib.grammar from spec/smtlib-2.7.bnf,
// spec/smtlib-2.7.lex and gen/overlay.grammar, and src/words.ts (for completion) from the
// word lists of the .lex file. Notation: spec/README.md. What the overlay adds, and how
// the generator resolves conflicts: gen/CONFLICTS.md.
import {readFileSync, writeFileSync} from "node:fs"
import {fileURLToPath} from "node:url"
import {buildParser} from "@lezer/generator"
import {readSpec, words} from "./spec.mjs"
import {regexToLezer} from "./regex.mjs"

// Productions that become hidden rules, as a node for them would only wrap its one child.
// A parenthesised alternative of one becomes the named node given here.
const hidden = new Map([
  ["spec_constant", null],
  ["s_expr", "List"],
  ["symbol_", null],
])

// Lexical categories that only document Appendix B: the token expressions spell them out.
const documentation = new Set(["digit", "letter", "printable_char"])

// The top production whose language is ambiguous (CONFLICTS.md): every rule it reaches
// carries the ambiguity marker, so its conflicts are left to Lezer's GLR parsing.
const ambiguousTop = "general_response"
export const marker = "~response"

const camel = name => name.replace(/[-_]+(.)/g, (_, c) => c.toUpperCase())
const pascal = name => camel(name).replace(/^./, c => c.toUpperCase())
const normalize = text => text.replace(/\s+/g, " ").trim()

/// The rules defined in Lezer text, outside comments: {name, top, props, body, from, to}.
export function lezerRules(text) {
  const rules = []
  const head = /^(@top\s+)?([A-Za-z_]\w*)(\[[^\]]*\])?(<[^>]*>)?\s*\{/gm
  for (let m; (m = head.exec(text)); ) {
    const end = closingBrace(text, head.lastIndex)
    rules.push({name: m[2], top: !!m[1], props: m[3] ?? "", body: text.slice(head.lastIndex, end), from: m.index, to: end + 1})
    head.lastIndex = end + 1
  }
  return rules
}

export function generate({bnf, lex}, overlay) {
  const both = [...bnf.keys()].filter(name => lex.has(name))
  if (both.length) throw new Error(`defined in both spec files: ${both.join(" ")}`)

  const isWordList = name => lex.get(name).every(a => a.length == 1 && a[0].lit != null)
  const isUnion = name => lex.get(name).every(a => a.length == 1 && a[0].ref)
  const isToken = name => lex.get(name).length == 1 && lex.get(name)[0][0].regex
  for (const name of lex.keys())
    if (!isWordList(name) && !isUnion(name) && !isToken(name)) throw new Error(`<${name}> is not a word list, union or token`)

  const tokenRegex = name => lex.get(name)[0][0].regex
  const whole = regex => new RegExp(`^(?:${regex.source})$`, regex.flags)
  const reserved = new Set(lex.get("reserved").flatMap(([{ref}]) => words(lex, ref)))
  // The token class that reserved words are carved out of (`A - <reserved>`).
  const symbolClass = [...lex.keys()].find(name => isToken(name) && lex.get(name)[0].some(item => item.minus))

  const ruleName = name => (hidden.has(name) ? camel(name) : pascal(name))
  const ruleNames = new Set([...bnf.keys()].map(ruleName))

  // Overlay rules named like a production either replace it (a @top) or add props to it,
  // in which case their body must be the generated one.
  const overlayRules = lezerRules(overlay)
  const byName = new Map(overlayRules.map(rule => [rule.name, rule]))
  const propRules = overlayRules.filter(rule => !rule.top && ruleNames.has(rule.name))
  // What the rest of the overlay refers to.
  const overlayText = cut(overlay, propRules.map(rule => [rule.from, rule.to])).replace(/\/\/.*$/gm, "")
  const mentioned = name => new RegExp(`(^|[^\\w"])${name}([^\\w"]|$)`).test(overlayText)

  const tokens = new Map()
  const lexRules = []
  const terminals = new Map()

  function terminal(text) {
    if (!terminals.has(text)) {
      let lezer
      if (text == "(" || text == ")") lezer = JSON.stringify(text)
      else if (reserved.has(text)) lezer = `kw<${JSON.stringify(text)}>`
      else if (whole(tokenRegex("keyword")).test(text)) lezer = `key<${JSON.stringify(text)}>`
      else if (whole(tokenRegex(symbolClass)).test(text)) lezer = `sym<${JSON.stringify(text)}>`
      else throw new Error(`terminal "${text}" is neither a paren nor a reserved word, keyword or symbol`)
      terminals.set(text, lezer)
    }
    return terminals.get(text)
  }

  // Token classes named in the .bnf file become named tokens; unions become hidden rules.
  function lexical(name, named) {
    if (tokens.has(name)) return tokens.get(name)
    if (!lex.has(name)) throw new Error(`<${name}> is not defined`)
    if (isWordList(name)) throw new Error(`<${name}> is a word list, not a token class`)
    const lezer = isToken(name) && named ? pascal(name) : camel(name)
    tokens.set(name, lezer)
    if (isUnion(name)) {
      const members = lex.get(name).flatMap(([{ref}]) => (isWordList(ref) ? words(lex, ref).map(terminal) : [lexical(ref, named)]))
      lexRules.push(`${lezer} { ${members.join(" | ")} }`)
    }
    return lezer
  }

  const used = new Set()
  const reference = name => {
    used.add(name)
    return bnf.has(name) ? ruleName(name) : lexical(name, true)
  }

  // Productions reachable from the ambiguous top.
  const ambiguous = new Set()
  const reach = name => {
    if (ambiguous.has(name) || !bnf.has(name)) return
    ambiguous.add(name)
    for (const alternative of bnf.get(name)) for (const item of alternative) if (item.ref) reach(item.ref)
  }
  reach(ambiguousTop)

  const alternative = (name, items, mark) => {
    const m = mark ? `${marker} ` : ""
    const text = items
      .map(item => {
        if (!item.ref) return m + terminal(item.lit)
        return item.rep ? (mark ? `(${m}${reference(item.ref)} ${marker})${item.rep}` : reference(item.ref) + item.rep) : m + reference(item.ref)
      })
      .join(" ")
    const list = hidden.get(name)
    const wrapped = list && items[0].lit == "(" ? `${list} { ${text} }` : null
    return {text: (wrapped ? m + list : text) + (mark ? ` ${marker}` : ""), wrapped}
  }

  const productions = [], wrappers = []
  for (const [name, alternatives] of bnf) {
    const lezer = ruleName(name)
    const plain = alternatives.map(items => alternative(name, items, false).text).join(" | ")
    const own = byName.get(lezer)
    if (own?.top) continue
    if (own && normalize(own.body) != normalize(plain))
      throw new Error(`gen/overlay.grammar: the body of ${lezer} differs from <${name}>, which is: ${plain}`)
    const generated = alternatives.map(items => alternative(name, items, ambiguous.has(name)))
    wrappers.push(...generated.filter(a => a.wrapped).map(a => a.wrapped))
    productions.push(`${lezer}${own?.props ?? ""} {\n  ${generated.map(a => a.text).join(" |\n  ")}\n}`)
  }

  const unused = [...bnf.keys()].filter(name => !used.has(name) && !mentioned(ruleName(name)))
  if (unused.length) throw new Error(`unused productions: ${unused.map(r => `<${r}>`).join(" ")}`)

  // Token classes only the overlay names, such as the skip tokens.
  for (const name of lex.keys())
    if (!tokens.has(name) && !isWordList(name)) {
      if (mentioned(pascal(name))) lexical(name, true)
      else if (mentioned(camel(name))) lexical(name, false)
    }
  const unusedLex = [...lex.keys()].filter(name => !tokens.has(name) && !isWordList(name) && !documentation.has(name))
  if (unusedLex.length) throw new Error(`unused lexical categories: ${unusedLex.map(r => `<${r}>`).join(" ")}`)

  const tokenBlock = /^@tokens\s*\{/m.exec(overlay)
  if (!tokenBlock) throw new Error("gen/overlay.grammar has no @tokens block")
  const tokenEnd = closingBrace(overlay, tokenBlock.index + tokenBlock[0].length)
  const kept = cut(overlay, [...propRules.map(rule => [rule.from, rule.to]), [tokenBlock.index, tokenEnd + 1]])

  const tokenDefinitions = [...tokens]
    .filter(([name]) => isToken(name))
    .map(([name, lezer]) => `  ${lezer} { ${regexToLezer(tokenRegex(name))} }`)
  const symbolToken = tokens.get(symbolClass), keywordToken = tokens.get("keyword")

  const grammar = [
    "// Generated by gen/bnf2lezer.mjs from spec/smtlib-2.7.bnf, spec/smtlib-2.7.lex and",
    "// gen/overlay.grammar. Do not edit.",
    "",
    kept.trim(),
    "",
    "// One rule per production of spec/smtlib-2.7.bnf, in its order.",
    "",
    productions.join("\n\n"),
    "",
    wrappers.join("\n\n"),
    "",
    "// Reserved words are never symbols; predefined symbols and keywords still are, and win",
    "// where both readings parse.",
    `kw<word> { @specialize[@name={word}]<${symbolToken}, word> }`,
    `sym[@dynamicPrecedence=1]<word> { @extend[@name={word}]<${symbolToken}, word> }`,
    `key[@dynamicPrecedence=1]<word> { @extend[@name={word}]<${keywordToken}, word> }`,
    "",
    lexRules.join("\n\n"),
    "",
    "@tokens {",
    tokenDefinitions.join("\n\n"),
    "",
    overlay.slice(tokenBlock.index + tokenBlock[0].length, tokenEnd).replace(/^\n+|\s+$/g, ""),
    "}",
    "",
  ].join("\n")

  // The word lists, and the keywords and symbols the grammar turns into tokens of their own
  // (each a node named by its text).
  const list = name => JSON.stringify(words(lex, name))
  const own = prefix => JSON.stringify([...terminals].filter(([, lezer]) => lezer.startsWith(prefix)).map(([text]) => text).sort())
  const wordsTs = [
    "// Generated by gen/bnf2lezer.mjs from spec/smtlib-2.7.bnf and spec/smtlib-2.7.lex. Do not edit.",
    "",
    `export const commandNames = ${list("command_name")}`,
    `export const generalReservedWords = ${list("general_reserved_word")}`,
    `export const predefinedKeywords = ${list("predefined_keyword")}`,
    `export const keywordTokens = ${own("key<")}`,
    `export const symbolTokens = ${own("sym<")}`,
    "",
  ].join("\n")

  return {grammar, wordsTs}
}

function closingBrace(text, pos) {
  for (let depth = 1; ; pos++) {
    if (pos >= text.length) throw new Error("unclosed block")
    if (text[pos] == '"') pos = text.indexOf('"', pos + 1)
    else if (text[pos] == "{") depth++
    else if (text[pos] == "}" && !--depth) return pos
  }
}

function cut(text, ranges) {
  let out = "", pos = 0
  for (const [from, to] of ranges.sort((a, b) => a[0] - b[0])) {
    out += text.slice(pos, from)
    pos = to
  }
  return (out + text.slice(pos)).replace(/\n{3,}/g, "\n\n")
}

/// Fails unless the grammar, with the ambiguity markers removed and every top that reaches
/// <general_response> demoted, builds without conflicts: GLR is confined to responses.
export function checkDeterministic(grammar) {
  const responseTops = lezerRules(grammar).filter(rule => rule.top && /\bGeneralResponse\b/.test(rule.body))
  let text = grammar.split(` ${marker}`).join("").split(`${marker} `).join("")
  for (const rule of responseTops) text = text.replace(`@top ${rule.name}`, rule.name)
  buildParser(text, {externalPropSource: () => () => null, warn: () => {}})
}

export const readOverlay = () => readFileSync(new URL("overlay.grammar", import.meta.url), "utf8")

if (process.argv[1] == fileURLToPath(import.meta.url)) {
  const src = new URL("../packages/codemirror-lang-smtlib/src/", import.meta.url)
  const {grammar, wordsTs} = generate(readSpec(), readOverlay())
  checkDeterministic(grammar)
  writeFileSync(new URL("smtlib.grammar", src), grammar)
  writeFileSync(new URL("words.ts", src), wordsTs)
}
