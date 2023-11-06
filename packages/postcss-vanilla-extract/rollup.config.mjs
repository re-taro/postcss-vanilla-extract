import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import replace from "@rollup/plugin-replace";

import pkg from "./package.json" assert { type: "json" };

const externals = [
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.devDependencies),
  ...Object.keys(pkg.peerDependencies),
  "@qnighy/dedent",
];

/** @type {import('rollup').RollupOptions} */
const options = {
  input: "src/index.ts",
  output: [
    {
      file: pkg.module,
      format: "es",
      sourcemap: false,
    },
    {
      file: pkg.main,
      format: "cjs",
      sourcemap: false,
    },
  ],
  external: (id) => externals.some((d) => id.startsWith(d)),
  plugins: [
    typescript({
      tsconfig: "./tsconfig.json",
      outDir: ".",
      declaration: true,
    }),
    replace({
      "import.meta.vitest": "undefined",
      preventAssignment: true,
    }),
    terser(),
  ],
};

export default options;
