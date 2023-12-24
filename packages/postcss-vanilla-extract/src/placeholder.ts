import type { NodePath } from "@babel/traverse";

import type { PlaceholderFunc, Position, SyntaxOptions } from "./types";

const whitespacePattern = /\s/;

type PlaceholderFuncWithSyntax = (key: number, syntaxId: string) => string;

const defaultPlaceholder: PlaceholderFuncWithSyntax = (
	key: number,
	syntaxId: string,
): string => `POSTCSS_${syntaxId}_${key}`;

const placeholderMapping: Partial<Record<Position, PlaceholderFuncWithSyntax>> =
	{
		block: (key, syntaxId) => `/* POSTCSS_${syntaxId}_${key} */`,
		statement: (key, syntaxId) => `/* POSTCSS_${syntaxId}_${key} */`,
		property: (key, syntaxId) => `--POSTCSS_${syntaxId}_${key}`,
	};

/**
 * Finds the first non-space character of a string
 *
 * @param {string} str String to search
 * @returns {string | null}
 */
function findFirstNonSpaceChar(str: string): string | null {
	for (const chr of str) {
		if (chr === undefined) {
			return null;
		}

		if (whitespacePattern.test(chr)) {
			continue;
		}

		return chr;
	}

	return null;
}

/**
 * Computes whether the current position may be block-level or not, such that we
 * can choose a more appropriate placeholder.
 *
 * @param {string} prefix Source prefix to scan
 * @param {string} [suffix] Source suffix to scan
 * @returns {boolean}
 */
export function computePossiblePosition(
	prefix: string,
	suffix?: string,
): Position {
	let possiblyInComment = false;
	let possiblePosition: Position = "default";
	for (let i = prefix.length; i > 0; i--) {
		const chr = prefix[i];
		if (possiblyInComment) {
			if (chr === "/" && prefix[i + 1] === "*") {
				possiblyInComment = false;
			}
			continue;
		} else {
			if (chr === "/" && prefix[i + 1] === "*") {
				possiblePosition = "comment";
				break;
			}
		}
		if (chr === "*" && prefix[i + 1] === "/") {
			possiblyInComment = true;
			continue;
		}
		if (chr === ",") {
			possiblePosition = "statement";
			break;
		}
		if (chr === ":") {
			possiblePosition = "default";
			break;
		}
		if (chr === "}") {
			possiblePosition = "block";
			break;
		}
		if (chr === "{") {
			possiblePosition = "statement";
			break;
		}
	}

	if (suffix) {
		const nextChr = findFirstNonSpaceChar(suffix);

		switch (possiblePosition) {
			case "block": {
				if (nextChr === "{") {
					possiblePosition = "selector";
				}
				break;
			}

			case "statement": {
				if (nextChr === ":") {
					possiblePosition = "property";
				}
				break;
			}
		}
	}

	return possiblePosition;
}

/**
 * Computes the placeholder for an expression
 *
 * @param {SyntaxOptions} syntax Syntax options
 * @returns {PlaceholderFunc}
 */
export const createPlaceholderFunc =
	(syntax: SyntaxOptions): PlaceholderFunc =>
	(i, node, before, after) => {
		if (!before) {
			return defaultPlaceholder(i, syntax.id);
		}

		const position = computePossiblePosition(before, after);

		return (placeholderMapping[position] ?? defaultPlaceholder)(i, syntax.id);
	};

if (import.meta.vitest) {
	const { dedent } = await import("@qnighy/dedent");
	const { getNodePathsFromTemplate } = await import("./utils");
	const { describe, it, expect, beforeEach } = import.meta.vitest;

	describe("placeholder", () => {
		describe("computePossiblePosition", () => {
			it("should use default when empty", () => {
				const result = computePossiblePosition("");
				expect(result).toBe("default");
			});
			it("should be statement if semi-colon encountered", () => {
				const result = computePossiblePosition(
					"const base = style({ padding: 0,",
				);
				expect(result).toBe("statement");
			});
			it("should be default if colon encountered", () => {
				const result = computePossiblePosition("const base = style({ padding:");
				expect(result).toBe("default");
			});
			it("should be block if closing paren encountered", () => {
				const result = computePossiblePosition(
					"const base = style({ vars: { }",
				);
				expect(result).toBe("block");
			});
			it("should be statement if opening paren encountered", () => {
				const result = computePossiblePosition("const base = style({");
				expect(result).toBe("statement");
			});
			it("should handle spaces after prefix", () => {
				const result = computePossiblePosition("const base = style({ ");
				expect(result).toBe("statement");
			});
			it("should be comment if opening comment encountered", () => {
				const result = computePossiblePosition("const base = style({ /* foo");
				expect(result).toBe("comment");
			});
			it("should ignore key chars inside comments", () => {
				const result = computePossiblePosition(
					"const base = style({ /* tricky } comment */",
				);
				expect(result).toBe("statement");
			});
			it("should handle block position with suffix", () => {
				const result = computePossiblePosition(
					"const base = style({ vars: { }",
					"const other = style({ vars: { }",
				);
				expect(result).toBe("block");
			});
			it("should be selector if suffix is open paren & prefix is block", () => {
				const result = computePossiblePosition(
					"const base = style({ vars: { }",
					"{",
				);
				expect(result).toBe("selector");
			});
			it("should handle spaces before suffix", () => {
				const result = computePossiblePosition(
					"const base = style({ vars: { }",
					" {",
				);
				expect(result).toBe("selector");
			});
			it("should be statement if suffix is colon & prefix is statement", () => {
				const result = computePossiblePosition(
					"const base = style({ ",
					": 0 }",
				);
				expect(result).toBe("property");
			});
		});
		describe("createPlaceholder", () => {
			let createPlaceholder: PlaceholderFunc;
			let nodes: NodePath[];
			beforeEach(() => {
				nodes = getNodePathsFromTemplate(dedent`\
          export const accentVar = createVar();
          export const blue = style({
            vars: {
              [accentVar]: 'blue',
            },
          });
        `);
				createPlaceholder = createPlaceholderFunc({
					id: "foo",
				});
			});
			it("should use default placeholder if no prefix", () => {
				const result = createPlaceholder(808, nodes[0]);
				expect(result).toBe("POSTCSS_foo_808");
			});
			describe("default positions", () => {
				it("should use default placeholder", () => {
					const result = createPlaceholder(808, nodes[0], "/* some comment */");
					expect(result).toBe("POSTCSS_foo_808");
				});
			});
			describe("selector positions", () => {
				it("should use default placeholder", () => {
					const result = createPlaceholder(
						808,
						nodes[0],
						"const foo = style({ vars: {}",
						"{}",
					);
					expect(result).toBe("POSTCSS_foo_808");
				});
			});
			describe("comment positions", () => {
				it("should use default placeholder", () => {
					const result = createPlaceholder(808, nodes[0], "/* foo ", " bar */");
					expect(result).toBe("POSTCSS_foo_808");
				});
			});
			describe("statement positions", () => {
				it("should use a comment placeholder", () => {
					const result = createPlaceholder(808, nodes[0], "color: blue,");
					expect(result).toBe("/* POSTCSS_foo_808 */");
				});
			});
			describe("block positions", () => {
				it("should use a comment placeholder", () => {
					const result = createPlaceholder(
						808,
						nodes[0],
						"const foo = style({ vars: {}",
					);
					expect(result).toBe("/* POSTCSS_foo_808 */");
				});
			});
			describe("property positions", () => {
				it("should use a variable placeholder", () => {
					const result = createPlaceholder(
						808,
						nodes[0],
						"const foo = style({ vars: {",
						": blue }",
					);
					expect(result).toBe("--POSTCSS_foo_808");
				});
			});
		});
	});
}
