import type { NodePath } from "@babel/traverse";

export interface SyntaxOptions {
	id: string;
	names?: string[];
	placeholder?: PlaceholderFunc;
}

export type PlaceholderFunc = (
	key: number,
	node: NodePath,
	before?: string,
	after?: string,
) => string;