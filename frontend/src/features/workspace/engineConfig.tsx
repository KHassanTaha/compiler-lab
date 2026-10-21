import type { ReactNode } from "react";
import type {
  EngineKey,
  EngineResult,
  IcgData,
  LexerData,
  ParserData,
  SemanticData,
} from "../../lib/types";
import { EngineErrors } from "./views/EngineErrors";
import { IcgView } from "./views/IcgView";
import { LexerView } from "./views/LexerView";
import { ParserView } from "./views/ParserView";
import { SemanticView } from "./views/SemanticView";

export type { EngineKey };

export type EngineSlug = "lex" | "parse" | "semantic" | "icg";

export interface EngineConfig {
  key: EngineKey;
  title: string;
  /** URL segment for POST /engines/<slug>. */
  slug: EngineSlug;
  description: string;
  rawTestId: string;
  /** Renders the engine-specific formatted view from a result's `data`. */
  renderFormatted: (result: EngineResult) => ReactNode;
}

function withErrors(dataErrors: EngineResult["errors"], view: ReactNode): ReactNode {
  return (
    <div className="flex flex-col gap-3">
      {view}
      <EngineErrors errors={dataErrors} />
    </div>
  );
}

export const ENGINES: EngineConfig[] = [
  {
    key: "lexer",
    title: "Lexer",
    slug: "lex",
    description: "Source → tokens",
    rawTestId: "lexer-raw-json",
    renderFormatted: (result) =>
      withErrors(result.errors, <LexerView data={result.data as unknown as LexerData} />),
  },
  {
    key: "parser",
    title: "Parser",
    slug: "parse",
    description: "Tokens → parse tree",
    rawTestId: "parser-raw-json",
    renderFormatted: (result) =>
      withErrors(result.errors, <ParserView data={result.data as unknown as ParserData} />),
  },
  {
    key: "semantic",
    title: "Semantic",
    slug: "semantic",
    description: "Types → symbol table",
    rawTestId: "semantic-raw-json",
    renderFormatted: (result) =>
      withErrors(result.errors, <SemanticView data={result.data as unknown as SemanticData} />),
  },
  {
    key: "icg",
    title: "ICG",
    slug: "icg",
    description: "Tree → three-address code",
    rawTestId: "icg-raw-json",
    renderFormatted: (result) =>
      withErrors(result.errors, <IcgView data={result.data as unknown as IcgData} />),
  },
];

export const ENGINE_BY_KEY: Record<EngineKey, EngineConfig> = {
  lexer: ENGINES[0],
  parser: ENGINES[1],
  semantic: ENGINES[2],
  icg: ENGINES[3],
};

export function statusFor(result: EngineResult | undefined): "idle" | "success" | "error" {
  if (!result) return "idle";
  return result.status === "success" ? "success" : "error";
}
