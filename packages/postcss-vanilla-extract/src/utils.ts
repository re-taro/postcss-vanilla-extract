import { parse as babelParse } from "@babel/parser";
import type { File } from "@babel/types";

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
