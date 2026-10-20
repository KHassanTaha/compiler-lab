/**
 * Static docs content for /docs. Per PRD §10 the Docs page has no backend
 * dependency — the grammar and API summary are embedded here. The dynamic
 * grammar reference (workspace panel) comes from GET /api/grammar; this is
 * the abridged, canonical copy for documentation.
 */

export const EBNF = `program       ::= statement* EOF
statement     ::= varDecl | assignStmt | ifStmt | whileStmt | forStmt
                | funcDecl | returnStmt | printStmt | exprStmt | block
block         ::= "{" statement* "}"
varDecl       ::= TYPE IDENT "=" expr ";"
assignStmt    ::= IDENT "=" expr ";"
ifStmt        ::= IF "(" expr ")" block (ELSE (ifStmt | block))?
whileStmt     ::= WHILE "(" expr ")" block
forStmt       ::= FOR IDENT FROM expr TO expr block
funcDecl      ::= DEF IDENT "(" paramList? ")" "->" TYPE block
paramList     ::= param ("," param)*
param         ::= IDENT ":" TYPE
returnStmt    ::= RETURN expr? ";"
printStmt     ::= PRINT "(" expr ")" ";"
exprStmt      ::= expr ";"
expr          ::= orExpr
orExpr        ::= andExpr (OR andExpr)*
andExpr       ::= eqExpr (AND eqExpr)*
eqExpr        ::= relExpr ((EQ | NEQ) relExpr)*
relExpr       ::= addExpr ((LT | GT | LE | GE) addExpr)*
addExpr       ::= mulExpr ((PLUS | MINUS) mulExpr)*
mulExpr       ::= unaryExpr ((MUL | DIV | MOD) unaryExpr)*
unaryExpr     ::= (NOT | MINUS) unaryExpr | primary
primary       ::= INT_LIT | FLOAT_LIT | STR_LIT | TRUE | FALSE
                | IDENT | IDENT "(" argList? ")" | "(" expr ")"
argList       ::= expr ("," expr)*
TYPE          ::= "int" | "float" | "string" | "bool"`;

export interface KeywordRow {
  construct: string;
  english: string;
  hinglish: string;
}

export const KEYWORDS: KeywordRow[] = [
  { construct: "if", english: "if", hinglish: "agar" },
  { construct: "else", english: "else", hinglish: "warna" },
  { construct: "while", english: "while", hinglish: "jabtak" },
  { construct: "for", english: "for", hinglish: "har" },
  { construct: "from", english: "from", hinglish: "se" },
  { construct: "to", english: "to", hinglish: "tak" },
  { construct: "def", english: "def", hinglish: "kaam" },
  { construct: "return", english: "return", hinglish: "wapas" },
  { construct: "print", english: "print", hinglish: "likho" },
  { construct: "true", english: "true", hinglish: "sach" },
  { construct: "false", english: "false", hinglish: "jhoot" },
  { construct: "and", english: "and", hinglish: "aur" },
  { construct: "or", english: "or", hinglish: "ya" },
  { construct: "not", english: "not", hinglish: "nahi" },
];

export interface ApiRow {
  method: string;
  path: string;
  auth: string;
  description: string;
}

export const API_REFERENCE: ApiRow[] = [
  { method: "POST", path: "/api/auth/register", auth: "public", description: "Create an account." },
  { method: "POST", path: "/api/auth/login", auth: "public", description: "Exchange credentials for a JWT." },
  { method: "GET", path: "/api/auth/me", auth: "user", description: "Current user profile." },
  { method: "POST", path: "/api/engines/lex", auth: "user", description: "Run the lexer on code." },
  { method: "POST", path: "/api/engines/parse", auth: "user", description: "Run the parser on code." },
  { method: "POST", path: "/api/engines/semantic", auth: "user", description: "Run semantic analysis." },
  { method: "POST", path: "/api/engines/icg", auth: "user", description: "Generate three-address code." },
  { method: "POST", path: "/api/engines/run-all", auth: "user", description: "Run all four stages; one log row." },
  { method: "GET", path: "/api/examples", auth: "public", description: "Pre-loaded example programs." },
  { method: "GET", path: "/api/grammar", auth: "user", description: "Structured grammar reference." },
  { method: "GET", path: "/api/snippets", auth: "user", description: "List your saved snippets." },
  { method: "POST", path: "/api/snippets", auth: "user", description: "Save a snippet." },
  { method: "GET", path: "/api/history", auth: "user", description: "Your run history (filterable)." },
  { method: "GET", path: "/api/runs/{id}", auth: "user", description: "View any shared run." },
  { method: "GET", path: "/api/admin/stats", auth: "admin", description: "Dashboard statistics." },
  { method: "GET", path: "/api/admin/runs", auth: "admin", description: "All runs (filterable)." },
];
