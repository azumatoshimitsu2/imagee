import { TOKEN_TYPE } from "./constants.js";

const singleCharacterTokens = {
  "(": TOKEN_TYPE.LPAREN,
  ")": TOKEN_TYPE.RPAREN,
  "&": TOKEN_TYPE.AND,
  "∧": TOKEN_TYPE.AND,
  "|": TOKEN_TYPE.OR,
  "∨": TOKEN_TYPE.OR,
  "!": TOKEN_TYPE.NOT,
  "¬": TOKEN_TYPE.NOT,
  "⊥": TOKEN_TYPE.BOTTOM
};

export function tokenize(input) {
  const tokens = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (input.startsWith("->", index)) {
      tokens.push({
        type: TOKEN_TYPE.IMPLICATION,
        value: "→"
      });
      index += 2;
      continue;
    }

    if (char === "→") {
      tokens.push({
        type: TOKEN_TYPE.IMPLICATION,
        value: "→"
      });
      index += 1;
      continue;
    }

    if (input.startsWith("bottom", index)) {
      const nextChar = input[index + "bottom".length];

      if (!nextChar || !/[A-Za-z]/.test(nextChar)) {
        tokens.push({
          type: TOKEN_TYPE.BOTTOM,
          value: "⊥"
        });
        index += "bottom".length;
        continue;
      }
    }

    if (singleCharacterTokens[char]) {
      tokens.push({
        type: singleCharacterTokens[char],
        value: char
      });
      index += 1;
      continue;
    }

    if (/[A-Z]/.test(char)) {
      tokens.push({
        type: TOKEN_TYPE.ATOM,
        value: char
      });
      index += 1;
      continue;
    }

    throw new SyntaxError(`Unexpected character "${char}" at position ${index}.`);
  }

  tokens.push({
    type: TOKEN_TYPE.EOF,
    value: ""
  });

  return tokens;
}

