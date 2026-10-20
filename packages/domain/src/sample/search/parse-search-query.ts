import {
  literalLength,
  MAX_SEARCH_TOKENS,
  MIN_TOKEN_LENGTH,
} from "./search-tokens.ts";

export type SearchTerm =
  | { kind: "word"; token: string }
  | { kind: "phrase"; text: string };

export type SearchQuery =
  | SearchTerm
  | { kind: "and" | "or"; children: readonly SearchQuery[] };

type Operator = "and" | "or";

type Lexeme =
  | { kind: "open" | "close" }
  | { kind: "operator"; operator: Operator }
  | { kind: "term"; term: SearchTerm };

const OPERATORS: ReadonlyMap<string, Operator> = new Map([
  ["AND", "and"],
  ["ET", "and"],
  ["OR", "or"],
  ["OU", "or"],
]);

const LEXEMES =
  /"([^"]*)"|(?<![^\s(])'(.*?)'(?![^\s)])|([()])|'?([^\s()"]+)/gsu;

function lexemeOf([, double, single, paren, bare]: RegExpExecArray): Lexeme {
  const quoted = double ?? single;
  if (quoted !== undefined) {
    return {
      kind: "term",
      term: { kind: "phrase", text: quoted.trim().split(/\s+/).join(" ") },
    };
  }
  if (paren !== undefined) {
    return { kind: paren === "(" ? "open" : "close" };
  }
  const token = bare ?? "";
  const operator = OPERATORS.get(token.toUpperCase());
  return operator
    ? { kind: "operator", operator }
    : { kind: "term", term: { kind: "word", token } };
}

function termText(term: SearchTerm): string {
  return term.kind === "word" ? term.token : term.text;
}

function lex(search: string): Lexeme[] {
  return [...search.matchAll(LEXEMES)]
    .map(lexemeOf)
    .filter(
      (lexeme) =>
        lexeme.kind !== "term" ||
        literalLength(termText(lexeme.term)) >= MIN_TOKEN_LENGTH,
    )
    .reduce<{ lexemes: Lexeme[]; depth: number; terms: number }>(
      ({ lexemes, depth, terms }, lexeme) => {
        const isDropped =
          (lexeme.kind === "close" && depth === 0) ||
          (lexeme.kind === "term" && terms >= MAX_SEARCH_TOKENS);
        if (isDropped) {
          return { lexemes, depth, terms };
        }
        return {
          lexemes: [...lexemes, lexeme],
          depth:
            depth +
            (lexeme.kind === "open" ? 1 : lexeme.kind === "close" ? -1 : 0),
          terms: terms + (lexeme.kind === "term" ? 1 : 0),
        };
      },
      { lexemes: [], depth: 0, terms: 0 },
    ).lexemes;
}

type Parsed = { query: SearchQuery | undefined; next: number };

function collapse(
  kind: Operator,
  children: readonly SearchQuery[],
): SearchQuery | undefined {
  return children.length > 1 ? { kind, children } : children[0];
}

function isOperator(lexeme: Lexeme | undefined, operator: Operator): boolean {
  return lexeme?.kind === "operator" && lexeme.operator === operator;
}

function parseUnary(lexemes: readonly Lexeme[], at: number): Parsed {
  const lexeme = lexemes[at];
  if (lexeme?.kind === "term") {
    return { query: lexeme.term, next: at + 1 };
  }
  const group = parseOr(lexemes, at + 1);
  return {
    query: group.query,
    next: lexemes[group.next]?.kind === "close" ? group.next + 1 : group.next,
  };
}

function present(query: SearchQuery | undefined): readonly SearchQuery[] {
  return query ? [query] : [];
}

function parseAnd(
  lexemes: readonly Lexeme[],
  at: number,
  children: readonly SearchQuery[] = [],
): Parsed {
  const lexeme = lexemes[at];
  if (isOperator(lexeme, "and")) {
    return parseAnd(lexemes, at + 1, children);
  }
  if (lexeme?.kind !== "term" && lexeme?.kind !== "open") {
    return { query: collapse("and", children), next: at };
  }
  const unary = parseUnary(lexemes, at);
  return parseAnd(lexemes, unary.next, [...children, ...present(unary.query)]);
}

function parseOr(
  lexemes: readonly Lexeme[],
  at: number,
  children: readonly SearchQuery[] = [],
): Parsed {
  const operand = parseAnd(lexemes, at);
  const operands = [...children, ...present(operand.query)];
  return isOperator(lexemes[operand.next], "or")
    ? parseOr(lexemes, operand.next + 1, operands)
    : { query: collapse("or", operands), next: operand.next };
}

export function parseSearchQuery(search: string): SearchQuery | undefined {
  return parseOr(lex(search), 0).query;
}

export function searchQueryTerms(query: SearchQuery): readonly SearchTerm[] {
  return "children" in query
    ? query.children.flatMap(searchQueryTerms)
    : [query];
}
