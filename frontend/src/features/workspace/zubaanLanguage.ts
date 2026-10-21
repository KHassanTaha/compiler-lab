import { HighlightStyle, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import type { StreamParser } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

const KEYWORDS = new Set([
  "agar",
  "warna",
  "jabtak",
  "har",
  "se",
  "tak",
  "kaam",
  "wapas",
  "likho",
  "aur",
  "ya",
  "nahi",
]);

const TYPES = new Set(["int", "float", "string", "bool"]);
const BOOLEANS = new Set(["sach", "jhoot"]);

/**
 * A StreamLanguage tokenizer for ZubaanScript. Small enough that a full
 * Lezer grammar would be overkill — highlighting only needs to colour
 * keywords, types, literals and comments.
 */
const zubaanParser: StreamParser<unknown> = {
  token(stream) {
    if (stream.eatSpace()) return null;

    if (stream.match("//")) {
      stream.skipToEnd();
      return "comment";
    }

    if (stream.match("/*")) {
      while (!stream.eol()) {
        if (stream.match("*/")) break;
        stream.next();
      }
      return "comment";
    }

    if (stream.match(/^"[^"]*"?/)) return "string";
    if (stream.match(/^\d+\.\d+/)) return "number";
    if (stream.match(/^\d+/)) return "number";
    if (stream.match(/^(==|!=|<=|>=|->|=|\+|-|\*|\/|%|<|>)/)) return "operator";
    if (stream.match(/^[(){};,.:]/)) return "punctuation";

    if (stream.match(/^[a-zA-Z_]\w*/)) {
      const word = stream.current();
      if (KEYWORDS.has(word)) return "keyword";
      if (TYPES.has(word)) return "typeName";
      if (BOOLEANS.has(word)) return "bool";
      return "variableName";
    }

    stream.next();
    return null;
  },
};

/** ZubaanScript language support for the CodeMirror editor. */
export const zubaanLanguage = StreamLanguage.define(zubaanParser);

/** Warm-palette syntax colours, matching the app's token tones. */
export const zubaanHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.keyword, color: "#a8632f", fontWeight: "600" },
    { tag: t.typeName, color: "#2f6f8f" },
    { tag: t.string, color: "#8a6d1f" },
    { tag: t.number, color: "#3f7d4e" },
    { tag: t.comment, color: "#9a8a76", fontStyle: "italic" },
    { tag: t.operator, color: "#6b5540" },
    { tag: t.variableName, color: "#3d2f22" },
  ]),
);
