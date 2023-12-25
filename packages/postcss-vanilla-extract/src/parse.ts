import type { Parser, ProcessOptions } from "postcss";
import { Document, Input } from "postcss";

import { extractCallExprFromSource } from "./extract";
import { createPlaceholderFunc } from "./placeholder";
import { computeReplacedSource } from "./replace";
import type { SyntaxOptions } from "./types";

/**
 * Parses the styles from a JS/TS source
 *
 * @param {string} source Source code to parse
 * @param {SyntaxOptions} options Syntax options
 * @param {ProcessOptions} [opts] Options to pass to PostCSS' parser when
 *   parsing
 * @returns {Document}
 */
function parseStyles(
	source: string,
	options: SyntaxOptions,
	opts?: ProcessOptions,
): Document {
	const extractedStyles = extractCallExprFromSource(source, options);
	const computePlaceholder =
		options.placeholder ?? createPlaceholderFunc(options);
	const doc = new Document();

	for (const path of extractedStyles) {
		const replacedSource = computeReplacedSource(
			source,
			path,
			computePlaceholder,
		);
	}

	doc.source = {
		input: new Input(source, opts),
		start: {
			line: 1,
			column: 1,
			offset: 0,
		},
	};

	return doc;
}

/**
 * Parses CSS from within object literals in a JavaScript document
 *
 * @param {SyntaxOptions} options Syntax options
 * @returns {Parser<Root | Document>}
 */
export const createParser =
	(options: SyntaxOptions): Parser =>
	(
		css: string | { toString: () => string },
		opts?: Pick<ProcessOptions, "map" | "from">,
	) => {
		const source = typeof css === "string" ? css : css.toString();

		return parseStyles(source, options, opts);
	};
