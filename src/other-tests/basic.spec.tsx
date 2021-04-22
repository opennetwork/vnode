import { WeakVContext } from "../vcontext-weak";
import { VContextHydrateEvent } from "../vcontext-events";
import { hydrate } from "../hydrate";
import { Component } from "typedoc/dist/lib/utils";
import { h } from "../h";
import { isVNode, VNode } from "../vnode";
import { isSourceReference, SourceReference } from "../source-reference";
import { Input } from "@opennetwork/progressive-merge/dist/async";
import { LaneInput, merge } from "@opennetwork/progressive-merge";
import { createFragment, Fragment } from "../fragment";
import { filtered } from "../filter";

class HydratingVContext extends WeakVContext {
  hydrate(node: VContextHydrateEvent["node"], tree?: VContextHydrateEvent["tree"]): Promise<void> {
    return super.hydrate(node, tree);
  }
}

describe("Basic", function () {

  it("works & hydrates", async () => {
    const context = new HydratingVContext();
    function Component() {
      return true;
    }
    await hydrate(context, <Component />);
  });

  it("returns the source", async () => {
    const expected = Math.random();
    function Component() {
      return expected;
    }
    const iterator = sources(<Component />).children[Symbol.asyncIterator]();
    const { done, value: children } = await iterator.next();
    expect(done).toBeFalsy();
    expect(Array.isArray(children)).toBeTruthy();
    expect(children.length).toEqual(1);
    const [result] = children;
    expect(result).toBeTruthy();
    expect(isVNode(result)).toBeTruthy();
    expect(result.source).toEqual(expected);
  });

  it("returns the inner yielded source", async () => {
    const initial = Math.random();
    const expected = Math.random();
    async function *Yielding() {
      yield initial;
      yield expected;
    }
    function Component() {
      return (
          <Yielding />
      );
    }
    const results = [
      initial,
      expected
    ];
    for await (const [{ source: result }] of sources(<Component />).children) {
      const nextExpected = results.shift();
      expect(result).toEqual(nextExpected);
    }
    expect(results.length).toEqual(0);
  });

  it("does logic?", async () => {

    async function *Every(props: unknown, input: VNode) {
      let yielded = false;
      for await (const children of sources(input).children) {
        yield children.every(({ source }) => source);
        yielded = true;
      }
      if (!yielded) return false;
    }

    function Thing() {
      return (
          <Every>
            {1}
            {2}
          </Every>
      );
    }

    const results: boolean[] = [];
    for await (const [result] of sources(<Thing />).children) {
      expect(isVNode(result)).toBeTruthy();
      const { source } = result;
      assertBoolean(source);
      results.push(source);
    }

    expect(results[results.length - 1]).toEqual(true);

  });

  function assertBoolean(source: unknown): asserts source is boolean {
    expect(typeof source).toEqual("boolean");
  }
});

type SourceVNode = VNode & { source: SourceReference };
function sources(node: VNode): VNode & { children: AsyncIterable<SourceVNode[]> } {
  return filtered(node, isSourceVNode);

  function isSourceVNode(node: VNode): node is SourceVNode {
    return isSourceReference(node.source) && node.source !== node.reference;
  }
}
