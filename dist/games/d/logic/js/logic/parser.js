import { TOKEN_TYPE } from "./constants.js";
import { and, atom, bottom, implication, not, or } from "./ast.js";
import { tokenize } from "./tokenizer.js";

export function parseFormula(input) {
  const parser = createParser(tokenize(input));
  const formula = parser.parseImplication();

  parser.expect(TOKEN_TYPE.EOF);

  return formula;
}

function createParser(tokens) {
  let position = 0;

  function current() {
    return tokens[position];
  }

  function match(type) {
    if (current().type !== type) {
      return false;
    }

    position += 1;
    return true;
  }

  function expect(type) {
    const token = current();

    if (token.type !== type) {
      throw new SyntaxError(`Expected ${type}, but found ${token.type}.`);
    }

    position += 1;
    return token;
  }

  function parseImplication() {
    const left = parseOr();

    if (match(TOKEN_TYPE.IMPLICATION)) {
      return implication(left, parseImplication());
    }

    return left;
  }

  function parseOr() {
    let left = parseAnd();

    while (match(TOKEN_TYPE.OR)) {
      left = or(left, parseAnd());
    }

    return left;
  }

  function parseAnd() {
    let left = parseNot();

    while (match(TOKEN_TYPE.AND)) {
      left = and(left, parseNot());
    }

    return left;
  }

  function parseNot() {
    if (match(TOKEN_TYPE.NOT)) {
      return not(parseNot());
    }

    return parsePrimary();
  }

  function parsePrimary() {
    const token = current();

    if (match(TOKEN_TYPE.ATOM)) {
      return atom(token.value);
    }

    if (match(TOKEN_TYPE.BOTTOM)) {
      return bottom();
    }

    if (match(TOKEN_TYPE.LPAREN)) {
      const formula = parseImplication();
      expect(TOKEN_TYPE.RPAREN);
      return formula;
    }

    throw new SyntaxError(`Unexpected token ${token.type}.`);
  }

  return {
    expect,
    parseImplication
  };
}

