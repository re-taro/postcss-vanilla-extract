import generate from "@babel/generator";
import type { NodePath } from "@babel/traverse";
import type { CallExpression, ObjectExpression } from "@babel/types";

import type { PlaceholderFunc, SyntaxOptions } from "./types";

interface ExpressionReplacement {
	source: string;
	replacement: string;
}

interface SourceReplacementResult {
	result: string;
	replacements: ExpressionReplacement[];
}

/**
 * Computes the source with all expressions replaced
 *
 * @param {string} source Original source text
 * @param {NodePath<CallExpression>} node Node to traverse
 * @param {PlaceholderFunc} computePlaceholder Function used to compute the
 *   placeholder for a given expression
 * @returns {SourceReplacement}
 */
export function computeReplacedSource(
	source: string,
	node: NodePath<CallExpression>,
	computePlaceholder: PlaceholderFunc,
): SourceReplacementResult {
	const result: SourceReplacementResult = {
		replacements: [],
		result: "",
	};

	const props = (node.get("arguments")[0] as NodePath<ObjectExpression>).get(
		"properties",
	);

	for (let i = 0; i < props.length; i++) {
		const prop = props[i];

		if (prop.isObjectProperty()) {
			if (prop.node.value.type === "ObjectExpression") {
				const placeholder = computePlaceholder(
					i,
					node,
					generate(prop.node, {}, "").code,
				);
				result.replacements.push({
					source: generate(prop.node, {}, "").code,
					replacement: placeholder,
				});
				result.result +=
					i < props.length - 1 ? `${placeholder}\n` : placeholder;
			} else {
				result.result +=
					i < props.length - 1
						? `${generate(prop.node, {}, "").code},\n`
						: generate(prop.node, {}, "").code;
			}
		}
	}

	return result;
}

if (import.meta.vitest) {
	const { dedent } = await import("@qnighy/dedent");
	const { extractCallExprFromSource } = await import("./extract");
	const { createPlaceholderFunc } = await import("./placeholder");
	const { describe, it, expect } = import.meta.vitest;

	function sourceToReplacements(source: string): SourceReplacementResult[] {
		const options: SyntaxOptions = { id: "foo", names: ["style"] };
		const extractedStyles = extractCallExprFromSource(source, options);
		const computePlaceholder = createPlaceholderFunc(options);

		return [...extractedStyles].map((node) =>
			computeReplacedSource(source, node, computePlaceholder),
		);
	}

	describe("replace", () => {
		it("should return the source if no expressions", () => {
			const source = dedent`\
        const base = style({
          padding: 12,
        });
      `;
			const result = sourceToReplacements(source);

			expect(result).toStrictEqual<SourceReplacementResult[]>([
				{
					result: "padding: 12",
					replacements: [],
				},
			]);
		});
		it("should replace expressions with placeholders", () => {
			const source = dedent`\
        export const className = style({
          display: 'flex',
          vars: {
            [scopedVar]: 'green',
            '--global-variable': 'purple'
          },
          ':hover': {
            color: 'red'
          },
          selectors: {
            '&:nth-child(2n)': {
              background: '#fafafa'
            }
          },
          '@media': {
            'screen and (min-width: 768px)': {
              padding: 10
            }
          },
          '@supports': {
            '(display: grid)': {
              display: 'grid'
            }
          }
        });
      `;
			const result = sourceToReplacements(source);

			expect(result).toStrictEqual<SourceReplacementResult[]>([
				{
					result: dedent`\
            display: 'flex',
            /* POSTCSS_foo_1 */
            /* POSTCSS_foo_2 */
            /* POSTCSS_foo_3 */
            /* POSTCSS_foo_4 */
            /* POSTCSS_foo_5 */`,
					replacements: [
						{
							source: dedent`\
                vars: {
                  [scopedVar]: 'green',
                  '--global-variable': 'purple'
                }`,
							replacement: "/* POSTCSS_foo_1 */",
						},
						{
							source: dedent`\
                ':hover': {
                  color: 'red'
                }`,
							replacement: "/* POSTCSS_foo_2 */",
						},
						{
							source: dedent`\
                selectors: {
                  '&:nth-child(2n)': {
                    background: '#fafafa'
                  }
                }`,
							replacement: "/* POSTCSS_foo_3 */",
						},
						{
							source: dedent`\
                '@media': {
                  'screen and (min-width: 768px)': {
                    padding: 10
                  }
                }`,
							replacement: "/* POSTCSS_foo_4 */",
						},
						{
							source: dedent`\
                '@supports': {
                  '(display: grid)': {
                    display: 'grid'
                  }
                }`,
							replacement: "/* POSTCSS_foo_5 */",
						},
					],
				},
			]);
		});
	});
}
