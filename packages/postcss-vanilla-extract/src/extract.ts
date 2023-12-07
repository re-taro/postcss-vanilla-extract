import { parse as babelParse } from "@babel/parser";
import type { NodePath } from "@babel/traverse";
import traverse from "@babel/traverse";
import type { CallExpression } from "@babel/types";

import { hasDisableComment } from "./comment";
import type { SyntaxOptions } from "./types";

/**
 * Determines if a given tag is one of the supported tags
 *
 * @param {string} name Name to test
 * @param {readonly string[]} supported Supported tags
 * @returns {boolean}
 */
function isSupportedIdentifier(
	name: string,
	supported: readonly string[],
): boolean {
	for (const supportedName of supported) {
		if (supportedName === name) {
			return true;
		}
	}

	return false;
}

/**
 * Extracts stylesheets from a given source string
 *
 * @param {string} source Source to parse
 * @param {SyntaxOptions} options Syntax options
 * @returns {Set<NodePath<CallExpression>>}
 */
export function extractCallExprFromSource(
	source: string,
	options: SyntaxOptions,
): Set<NodePath<CallExpression>> {
	const extractedStyles = new Set<NodePath<CallExpression>>();
	const names = options?.names;
	if (!names) {
		return extractedStyles;
	}
	const ast = babelParse(source, {
		sourceType: "unambiguous",
		plugins: ["typescript"],
		ranges: true,
	});
	traverse(ast, {
		CallExpression: (path: NodePath<CallExpression>): void => {
			const calleeNode = path.get("callee");
			if (calleeNode.node.start !== null && calleeNode.node.end !== null) {
				const name = calleeNode.toString();
				if (
					isSupportedIdentifier(name, names) &&
					!hasDisableComment(path, options)
				) {
					extractedStyles.add(path);
				}
			}
		},
	});

	return extractedStyles;
}

if (import.meta.vitest) {
	const { dedent } = await import("@qnighy/dedent");
	const { describe, it, expect } = import.meta.vitest;

	describe("extract", () => {
		describe("extractCallExprFromSource", () => {
			it("should be empty if no tag names (default)", () => {
				const result = extractCallExprFromSource("", {
					id: "foo",
				});

				expect(result.size).toBe(0);
			});
			it("should detect call expr", () => {
				const source = dedent`\
					const scopedVar = createVar();
					export const flexContainer = style({
						display: 'flex'
					});
				`;
				const result = extractCallExprFromSource(source, {
					id: "foo",
					names: ["style"],
				});

				expect(result.size).toBe(1);
			});
			it("should parse typescript", () => {
				const source = dedent`\
					export const accentVar: CSSVarFunction = createVar();

					export const blue = style({
				  	vars: {
				  		[accentVar]: 'blue'
				  	}
					});
        `;
				const result = extractCallExprFromSource(source, {
					id: "foo",
					names: ["style"],
				});

				expect(result.size).toBe(1);
			});
			it("should respect disable comments", () => {
				const source = dedent`\
					// postcss-foo-disable-next-line
					export const flexContainer = style({
						display: 'flex'
					});
				`;
				const result = extractCallExprFromSource(source, {
					id: "foo",
					names: ["style"],
				});

				expect(result.size).toBe(0);
			});
		});
	});
}
