import { ContextSourceOptions } from "./source-options";
import { isScalarVNode, VNode, VNodeRepresentation } from "./vnode";
import {
  asyncExtendedIterable,
  AsyncIterableLike,
  isAsyncIterable,
  isIterable,
  source,
  isPromise,
  isIterableIterator,
  getNext,
  isTransientAsyncIteratorSource,
  asyncIterator
} from "iterable";
import { flatten } from "./flatten";

export function children<HO extends ContextSourceOptions<any>>(options: HO, initialSource?: AsyncIterableLike<VNodeRepresentation>): AsyncIterable<AsyncIterable<VNode>> {
  // Weak because a generator can create more generators that we may have no reference to
  const generators = new WeakMap<VNode, {
    source: IterableIterator<VNode> | AsyncIterableIterator<VNode>,
    iterator: AsyncIterator<VNode>
  }>();
  const generatorValues = new WeakMap<VNode, VNode>();
  const sources = asyncExtendedIterable(initialSource || options.children).flatMap(flatMapSource).retain();
  const baseSource = source(async (): Promise<AsyncIterable<VNode>> => {
    let anyGenerators = false, depth = 0;
    async function *generate(sources: AsyncIterable<VNode>): AsyncIterable<VNode | undefined> {
      const currentDepth = depth += 1;
      for await (const value of sources) {
        if (isScalarVNode(value) || !value || !generators.has(value)) {
          yield* flatten(value);
          continue;
        }
        const generator = generators.get(value);
        if (!generator || (isTransientAsyncIteratorSource(generator.source) && !generator.source.open)) {
          generators.set(value, undefined);
          // It has finished, but no values left, return its final value
          yield generatorValues.get(value);
          continue;
        }
        anyGenerators = true;
        // If there are no in flight and we don't have a source
        // then continue with the current value
        //
        // This allows users to provide a TransientAsyncIteratorSource instance
        // directly which allows _pushing_ values rather than pulling
        //
        // If the user doesn't provide this source, we just wait for the next value
        //
        // If the generator hasn't received any values yet, the returned
        // value for this child will be undefined, which is expected
        //
        // The user can provide initial values for a pushable
        // by giving a source that finishes (e.g. has a fixed number of values)
        //
        // The user can swap to a source if they wish using setSource
        if (isTransientAsyncIteratorSource(generator.source) && (!generator.source.inFlight && !generator.source.hasSource)) {
          yield generatorValues.get(value);
          continue;
        }
        const result = await getNext(generator.iterator);
        if (result.done) {
          generators.set(value, undefined);
          yield generatorValues.get(value);
          continue;
        }
        generatorValues.set(value, result.value);
        yield* generate(await flatMapSource(result.value));
      }
      // Nothing more to do, all values are static from now on
      if (currentDepth === 1 && !anyGenerators) {
        baseSource.close();
      }
    }
    return asyncExtendedIterable(generate(sources)).retain().toIterable();
  });
  // Because the base source is retained, it means that it can be replayed in the exact same order
  //
  // The values for each "cycle" are also retained, meaning that everything from an external point of view is static
  return asyncExtendedIterable(baseSource).retain().toIterable();

  async function flatMapSource(node: VNodeRepresentation): Promise<AsyncIterable<VNode>>  {
    if (isPromise(node)) {
      return flatMapSource(await node);
    }
    if (isIterableIterator(node)) {
      const referenceNode = {
        reference: Symbol("Iterable Iterator")
      };
      generators.set(referenceNode, {
        source: node,
        iterator: asyncIterator(node)
      });
      return asyncExtendedIterable([referenceNode]);
    }
    if (!(isIterable(node) || isAsyncIterable(node))) {
      return asyncExtendedIterable([node]);
    }
    return flatMapSource(node);
  }
}
