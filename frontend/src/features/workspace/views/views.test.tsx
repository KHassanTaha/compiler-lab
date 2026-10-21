import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type {
  IcgData,
  LexerData,
  ParserData,
  SemanticData,
} from "../../../lib/types";
import { IcgView } from "./IcgView";
import { LexerView } from "./LexerView";
import { ParserView } from "./ParserView";
import { SemanticView } from "./SemanticView";

const lexerData: LexerData = {
  tokens: [
    { type: "KEYWORD", value: "likho", line: 1, column: 1 },
    { type: "PUNCTUATION", value: "(", line: 1, column: 6 },
  ],
  summary: { total: 2, by_type: { KEYWORD: 1, PUNCTUATION: 1 } },
  errors: [],
};

describe("LexerView", () => {
  it("renders every token with its position and a by-type summary", () => {
    render(<LexerView data={lexerData} />);
    const table = screen.getByTestId("lexer-tokens-table");
    expect(table).toHaveTextContent("likho");
    expect(table).toHaveTextContent("KEYWORD");
    expect(screen.getByText("2 tokens")).toBeInTheDocument();
    expect(screen.getByText("KEYWORD: 1")).toBeInTheDocument();
  });
});

const parserData: ParserData = {
  tree: {
    type: "program",
    line: 1,
    column: 1,
    children: [{ type: "printStmt", line: 1, column: 1, value: "likho" }],
  },
  derivation: [{ step: 1, rule: "program", matched_text: "likho" }],
  errors: [],
};

describe("ParserView", () => {
  it("nests child nodes under their parent in the tree", () => {
    render(<ParserView data={parserData} />);
    const tree = screen.getByTestId("parser-tree");
    expect(tree).toHaveTextContent("program");
    expect(tree).toHaveTextContent("printStmt");
    expect(tree).toHaveTextContent("likho");
  });

  it("explains when no tree was produced", () => {
    render(<ParserView data={{ ...parserData, tree: null }} />);
    expect(screen.getByTestId("parser-tree")).toHaveTextContent(/did not parse/i);
  });
});

const semanticData: SemanticData = {
  symbol_table: [
    { scope: "global", name: "x", type: "int", line: 2, used: true },
    { scope: "global", name: "y", type: "string", line: 3, used: false },
  ],
  scopes: [],
  errors: [],
};

describe("SemanticView", () => {
  it("shows each symbol and flags unused ones", () => {
    render(<SemanticView data={semanticData} />);
    const table = screen.getByTestId("symbol-table");
    expect(table).toHaveTextContent("x");
    const rows = table.querySelectorAll("tbody tr");
    expect(rows[0]).toHaveTextContent("yes");
    expect(rows[1]).toHaveTextContent("no");
  });

  it("shows an empty message when nothing was declared", () => {
    render(<SemanticView data={{ ...semanticData, symbol_table: [] }} />);
    expect(screen.getByTestId("symbol-table")).toHaveTextContent(/no symbols/i);
  });
});

const icgData: IcgData = {
  tac: ["t1 = 5", "t2 = t1 + 1"],
  temp_count: 2,
  label_count: 0,
  errors: [],
};

describe("IcgView", () => {
  it("joins the three-address code and reports counts", () => {
    render(<IcgView data={icgData} />);
    const listing = screen.getByTestId("tac-listing");
    expect(listing).toHaveTextContent("t1 = 5");
    expect(listing).toHaveTextContent("t2 = t1 + 1");
    expect(screen.getByText("2 temporaries")).toBeInTheDocument();
  });

  it("surfaces the best-effort note when present", () => {
    render(<IcgView data={{ ...icgData, note: "Generated despite semantic errors." }} />);
    expect(screen.getByText(/despite semantic errors/i)).toBeInTheDocument();
  });
});
