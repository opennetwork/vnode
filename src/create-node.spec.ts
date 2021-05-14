import { Fragment } from "./fragment";
import {
  CallVNodeFn,
  createNode,
  CreateNodeFragmentSourceFirstStage,
  CreateNodeFragmentSourceSecondStage
} from "./create-node";
import { CreateNodeFn } from "./create-node-static";
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
      [1n],
      [0n],
      [""],
      ["Hello!"],
    ])("%p should produce a scalar node", async <I extends SourceReference>(input: I ) => {
      const output = createNode(input);
      expect(isScalarVNode(output)).toEqual(true);
      const source: I = output.source;
      expect(source).toEqual(input);
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

    function A() {
      return createNode("This is the content of A");
    }

    function B() {
      return createNode("This is the content of B");
    }

    function C() {
      return createNode("This is the content of C");
    }

    function D() {
      return [
        createNode(A),
        createNode(B)
      ];
    }

    async function *E() {
      yield createNode(D);
      yield createNode(C);
    }

    it("works", async () => {
      const node = createNode(E);
      const iterable = node.children;
      for await (const children of iterable) {
        const values = children.map(node => node.source);
        console.log({ values, children });
      }

    });

  });

});
