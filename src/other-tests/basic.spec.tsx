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

});

type SourceVNode = VNode & { source: SourceReference };
function sources(node: VNode): VNode & { children: AsyncIterable<SourceVNode[]> } {
  return {
    ...node,
    children: children(node)
  };

  function children(node: VNode): AsyncIterable<SourceVNode[]> {
    return {
      async *[Symbol.asyncIterator]() {
        yield *childrenGenerator();
      }
    };
    async function *childrenGenerator(): AsyncIterable<SourceVNode[]> {
      if (!node.children) return;
      for await (const children of node.children) {
        if (!children.length) {
          continue;
        }
        if (children.every(isSourceVNode)) {
          yield [...children];
          continue;
        }
        // We have a bunch of iterables, async or not, that will provide an array of
        // ElementDOMNativeVNode for each iteration
        const lanes: LaneInput<SourceVNode[]> = children
            .map(sourcesChildren);
        const merged: AsyncIterable<ReadonlyArray<SourceVNode[] | undefined>> = merge(lanes);
        for await (const parts of merged) {
          yield parts.reduce<SourceVNode[]>(
              (updates , part) => updates.concat(part ?? []),
              []
          );
        }
      }
    }

    function sourcesChildren(node: VNode): Input<SourceVNode[]> {
      return isSourceVNode(node) ? [[node]] : sources(node).children;
    }

    function isSourceVNode(node: VNode): node is SourceVNode {
      return isSourceReference(node.source) && node.source !== node.reference;
    }
  }


}
