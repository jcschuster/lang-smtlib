// Reads the spec files in the notation of spec/README.md.
import {readFileSync} from "node:fs"

export const specFile = name => new URL(`../spec/${name}`, import.meta.url)

/// The productions of a .bnf or .lex file, in file order: name -> alternatives, each a
/// list of items {ref, rep}, {lit}, {regex} or {minus}. `rep` is "", "*" or "+"; the
/// reference's ⟨x⟩ⁿ⁺¹ (`^n+1`) reads as "+".
export function parseSpec(text, {lex = false} = {}) {
  const rules = new Map()
  let current = null
  text.split("\n").forEach((raw, index) => {
    const line = raw.trim(), at = `line ${index + 1}`
    if (!line || line.startsWith("#")) return
    const head = /^<([^<>\s]+)>\s*::=(.*)$/.exec(line)
    let body
    if (head) {
      if (rules.has(head[1])) throw new Error(`${at}: <${head[1]}> is defined twice`)
      current = head[1]
      rules.set(current, [])
      body = head[2]
    } else if (line.startsWith("|") && current) {
      body = line.slice(1)
    } else {
      throw new Error(`${at}: expected a production or a continuation: ${line}`)
    }
    for (const alternative of splitAlternatives(body, at)) rules.get(current).push(items(alternative, at, lex))
  })
  return rules
}

export function readSpec() {
  return {
    bnf: parseSpec(readFileSync(specFile("smtlib-2.7.bnf"), "utf8")),
    lex: parseSpec(readFileSync(specFile("smtlib-2.7.lex"), "utf8"), {lex: true}),
  }
}

// Splits at `|` outside terminals and regular expressions.
function splitAlternatives(body, at) {
  const parts = [], token = /\s*("[^"]*"|\/(?:[^/\\\n]|\\.)+\/u?|<[^<>\s]+>(?:\*|\+|\^n\+1)?|-|\|)/y
  let current = []
  let m
  while (token.lastIndex < body.length && (m = token.exec(body))) {
    if (m[1] == "|") {
      parts.push(current)
      current = []
    } else {
      current.push(m[1])
    }
  }
  if (body.slice(token.lastIndex).trim()) throw new Error(`${at}: cannot read ${JSON.stringify(body.slice(token.lastIndex))}`)
  parts.push(current)
  if (parts.some(p => !p.length)) throw new Error(`${at}: empty alternative`)
  return parts
}

function items(tokens, at, lex) {
  return tokens.map(token => {
    if (token.startsWith('"')) return {lit: token.slice(1, -1)}
    if (token.startsWith("<")) {
      const m = /^<([^<>]+)>(\*|\+|\^n\+1)?$/.exec(token)
      return {ref: m[1], rep: m[2] == "^n+1" ? "+" : m[2] ?? ""}
    }
    if (!lex) throw new Error(`${at}: ${token} is only allowed in the .lex file`)
    if (token == "-") return {minus: true}
    const flags = token.endsWith("u") ? "u" : ""
    return {regex: new RegExp(token.slice(1, flags ? -2 : -1), flags)}
  })
}

/// The terminals of a word-list production (every alternative a single terminal).
export function words(rules, name) {
  return rules.get(name).map(alternative => {
    if (alternative.length != 1 || alternative[0].lit == null) throw new Error(`<${name}> is not a word list`)
    return alternative[0].lit
  })
}
