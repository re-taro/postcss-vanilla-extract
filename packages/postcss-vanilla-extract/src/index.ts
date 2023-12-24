import type { Parser } from "postcss";

import { createParser } from "./parse";

interface Mod {
	parse: Parser;
}

const mod: Mod = {
	parse: createParser({
		id: "vanilla-extract",
		names: ["style"],
	}),
};

export default mod;
