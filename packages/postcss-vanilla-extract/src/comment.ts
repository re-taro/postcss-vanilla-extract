import type { NodePath } from "@babel/traverse";
import type { CallExpression, Comment } from "@babel/types";

/**
 * Determines if a given comment is a postcss-lit-disable comment
 * @param {Comment} node Node to test
 * @return {boolean}
 */
export const isDisableComment = (node: Comment): boolean =>
  node.type === "CommentLine" &&
  node.value.includes("postcss-vanilla-extract-disable-next-line");

/**
 * Determines if a node has a leading postcss-lit-disable comment
 * @param {NodePath<CallExpression>} path NodePath to test
 * @return {boolean}
 */
export function hasDisableComment(path: NodePath<CallExpression>): boolean {
  const statement = path.getStatementParent();
  if (statement?.node.leadingComments) {
    const comment =
      statement.node.leadingComments[statement.node.leadingComments.length - 1];
    if (comment !== undefined && isDisableComment(comment)) {
      return true;
    }
  }

  return false;
}

if (import.meta.vitest) {
  const { dedent } = await import("@qnighy/dedent");
  const { default: traverse } = await import("@babel/traverse");
  const { parseScript } = await import("./utils");
  const { describe, it, expect } = import.meta.vitest;

  describe("comment", () => {
    describe("isDisableComment", () => {
      it("should be true for disable comments", () => {
        const ast = parseScript(dedent`\
          // postcss-vanilla-extract-disable-next-line
          const foo = style({});
        `);
        const comment = ast.comments![0]!;

        expect(isDisableComment(comment)).toBe(true);
      });
      it("should be false for unrelated comments", () => {
        const ast = parseScript(dedent`\
          // totally unrelated
          const foo = style({});
        `);
        const comment = ast.comments![0]!;

        expect(isDisableComment(comment)).toBe(false);
      });
    });
    describe("hasDisableComment", () => {
      it("should be true when disable comment exists", () => {
        const ast = parseScript(dedent`\
          // postcss-vanilla-extract-disable-next-line
          const foo = style({});
        `);
        let path: NodePath<CallExpression> | undefined;
        traverse(ast, {
          CallExpression: (p) => {
            path = p;
          },
        });

        expect(hasDisableComment(path!)).toBe(true);
      });
      it("should be false if no comments", () => {
        const ast = parseScript(dedent`\
          const foo = style({
            display: 'flex'
          });
        `);
        const paths: NodePath<CallExpression>[] = [];
        traverse(ast, {
          CallExpression: (p) => {
            paths.push(p);
          },
        });

        expect(paths.length).toBe(1);
        expect(paths.every((p) => hasDisableComment(p))).toBe(false);
      });
      it("should be false if unrelated comments", () => {
        const ast = parseScript(dedent`\
          // some other comment
          const foo = style({
            display: 'flex'
          });
        `);
        const paths: NodePath<CallExpression>[] = [];
        traverse(ast, {
          CallExpression: (p) => {
            paths.push(p);
          },
        });

        expect(paths.length).toBe(1);
        expect(paths.every((p) => hasDisableComment(p))).toBe(false);
      });
    });
  });
}
