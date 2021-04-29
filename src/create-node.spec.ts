import { Fragment } from "./fragment";
import { createNode, CreateNodeFragmentSourceFirstStage, CreateNodeFragmentSourceSecondStage } from "./create-node";
import { FragmentVNode, isFragmentVNode, isScalarVNode, ScalarVNode, VNode } from "./vnode";
import { SourceReference } from "./source-reference";

describe("createNode", () => {

  describe("types", () => {

    /*

export type CreateNodeFragmentSourceFirstStage =
  | Function
  | Promise<unknown>
  | typeof Fragment;

export type CreateNodeFragmentSourceSecondStage =
  | AsyncIterable<unknown>
  | Iterable<unknown>
  | IterableIterator<unknown>
  | undefined
  | null;
     */

    it.concurrent.each<[CreateNodeFragmentSourceFirstStage]>([
      [() => {}],
      [Promise.resolve()],
      [Fragment],
    ])("%p should produce a fragment node", async (input) => {
      const output: FragmentVNode = createNode(input);
      expect(isFragmentVNode(output)).toEqual(true);
    });

    it.concurrent.each<[VNode]>([
      [createNode("source")],
      [createNode(Fragment)]
    ])("%p should return itself", async <I extends VNode>(input: I) => {
      const output: I = createNode(input);
      expect(output).toEqual(input);
    });

    it.concurrent.each<[SourceReference]>([
      [Symbol("Unique Symbol")],
      [true],
      [false],
      [1],
      [0],
      [""],
      ["Hello!"],
    ])("%p should produce a scalar node", async <I extends SourceReference>(input: I ) => {
      const output: ScalarVNode & { source: I } = createNode(input);
      expect(isScalarVNode(output)).toEqual(true);
    });

    async function *asyncGenerator() {

    }
    function *generator() {

    }

    it.concurrent.each<[CreateNodeFragmentSourceSecondStage]>([
      [asyncGenerator()],
      [generator()],
      [undefined],
      [
        // tslint:disable-next-line:no-null-keyword
        null
      ],
      [[]], // Iterable,
      [{ async *[Symbol.asyncIterator]() { }}] // AsyncIterable
    ])("%p should produce a fragment node", async (input) => {
      const output: FragmentVNode = createNode(input);
      expect(isFragmentVNode(output)).toEqual(true);
    });

    it("Should throw for a random object", () => {
      const node: unknown = { key: 1 };
      // pls no
      expect(() => createNode(node as VNode)).toThrow();
    });

  });

});
