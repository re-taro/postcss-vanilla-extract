// @ts-check

import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import replace from "@rollup/plugin-replace";
import cjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import outputSize, { summarize } from "rollup-plugin-output-size";
import { dedent } from "@qnighy/dedent";

import pkg from "./package.json" assert { type: "json" };

const external = [
	...Object.keys(pkg.dependencies),
	...Object.keys(pkg.peerDependencies),
];

// ライセンス表記用のバナー
const banner = dedent`\
  /**
   * @license
   * ${pkg.name} v${pkg.version}
   * Released under the ${pkg.license} License.
   */
`;

/**
 * @type {import("rollup").RollupOptions}
 */
const options = {
	input: "src/index.ts",
	output: [
		{
			file: pkg.exports["."].import,
			format: "es",
			banner,
			sourcemap: false,
		},
		{
			file: pkg.exports["."].require,
			format: "cjs",
			banner,
			sourcemap: false,
		},
	],
	external,
	plugins: [
		cjs(),
		nodeResolve({ browser: false }),
		typescript({
			declaration: true,
			rootDir: "src",
			outDir: "dist",
			emitDeclarationOnly: true,
		}),
		replace({
			values: {
				"process.env.NODE_ENV": JSON.stringify("production"),
				"import.meta.env.NODE_ENV": JSON.stringify("production"),
				"import.meta.vitest": "undefined",
			},
			preventAssignment: true,
		}),
		terser({
			compress: {
				passes: 5,
			},
		}),
		outputSize({
			summary(summary) {
				console.log(summarize(summary));
			},
		}),
	],
};

export default options;
