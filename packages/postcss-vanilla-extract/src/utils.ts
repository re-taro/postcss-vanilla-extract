import { parse as babelParse } from "@babel/parser";
import type { NodePath } from "@babel/traverse";
import traverse from "@babel/traverse";
import type { File, ObjectExpression } from "@babel/types";

/**
 * Parses some javascript/typescript via babel
 *
 * @param {string} source Source to parse
 * @returns {File}
 */
export function parseScript(source: string): File {
	const ast = babelParse(source, {
		sourceType: "unambiguous",
		ranges: true,
	});

	return ast;
}

/**
 * Gets the NodePaths for a given source template
 *
 * @param {string} source Source code
 * @returns {NodePath<Expression>[]}
 */
export function getNodePathsFromTemplate(source: string): NodePath[] {
	const ast = parseScript(source);
	const results: NodePath[] = [];

	traverse(ast, {
		CallExpression: (node) => {
			const calleeNode = node.get("callee");
			if (calleeNode.node.start !== null && calleeNode.node.end !== null) {
				const name = calleeNode.toString();
				if (name === "style") {
					for (const prop of (
						node.get("arguments")[0] as NodePath<ObjectExpression>
					).get("properties")) {
						if (prop.isObjectProperty()) {
							results.push(prop);
						}
					}
				}
			}
		},
	});

	return results;
}
