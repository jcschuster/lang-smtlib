// Translates the regular expressions of spec/smtlib-2.7.lex into Lezer token syntax.
// Only the subset the .lex file uses: literals, escapes (\t \n \r \xHH \u{H...} and
// escaped punctuation), classes [...] and [^...] with ranges, groups (?:...), |, *, +, ?.

const simpleEscapes = {t: "\t", n: "\n", r: "\r"}

export function regexToLezer(regex) {
  const src = regex.source
  let pos = 0

  const fail = message => {
    throw new Error(`/${src}/ at ${pos}: ${message}`)
  }

  // One code point, after a backslash or as is.
  function char() {
    if (src[pos] != "\\") {
      const c = String.fromCodePoint(src.codePointAt(pos))
      pos += c.length
      return c.codePointAt(0)
    }
    const e = src[++pos]
    pos++
    if (e in simpleEscapes) return simpleEscapes[e].codePointAt(0)
    if (e == "x") {
      const hex = src.slice(pos, pos + 2)
      pos += 2
      return parseInt(hex, 16)
    }
    if (e == "u" && src[pos] == "{") {
      const end = src.indexOf("}", pos)
      const hex = src.slice(pos + 1, end)
      pos = end + 1
      return parseInt(hex, 16)
    }
    if (/[\\\/|.\-^$*+?()[\]{}]/.test(e)) return e.codePointAt(0)
    fail(`unsupported escape \\${e}`)
  }

  function alternation() {
    const branches = [sequence()]
    while (src[pos] == "|") {
      pos++
      branches.push(sequence())
    }
    return branches.length == 1 ? branches[0] : `(${branches.join(" | ")})`
  }

  function sequence() {
    const parts = []
    while (pos < src.length && src[pos] != "|" && src[pos] != ")") {
      let atom = primary()
      if ("*+?".includes(src[pos] ?? "x")) atom += src[pos++]
      parts.push(atom)
    }
    if (!parts.length) fail("empty sequence")
    return parts.join(" ")
  }

  function primary() {
    if (src.startsWith("(?:", pos)) {
      pos += 3
      const inner = alternation()
      if (src[pos++] != ")") fail("unclosed group")
      return `(${inner})`
    }
    if (src[pos] == "(") fail("capturing groups are not supported")
    if (src[pos] == "[") return charClass()
    if (src[pos] == ".") fail("'.' is not supported")
    return literal(char())
  }

  function charClass() {
    pos++
    const negated = src[pos] == "^"
    if (negated) pos++
    let set = ""
    while (src[pos] != "]") {
      if (pos >= src.length) fail("unclosed class")
      const from = char()
      if (src[pos] == "-" && src[pos + 1] != "]") {
        pos++
        set += `${setChar(from)}-${setChar(char())}`
      } else {
        set += setChar(from)
      }
    }
    pos++
    return `${negated ? "!" : "$"}[${set}]`
  }

  const root = alternation()
  if (pos != src.length) fail("unbalanced ')'")
  return root
}

function setChar(code) {
  if (code < 0x20 || code > 0x7e) return `\\u{${code.toString(16)}}`
  const c = String.fromCharCode(code)
  return /[\\\]\-]/.test(c) ? `\\${c}` : c
}

function literal(code) {
  if (code < 0x20 || code > 0x7e) return `"\\u{${code.toString(16)}}"`
  const c = String.fromCharCode(code)
  return JSON.stringify(c)
}
