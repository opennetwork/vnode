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
  TransientAsyncIteratorSource
} from "iterable";
import { flatten } from "./flatten";

export function children<HO extends ContextSourceOptions<any>>(options: HO, initialSource?: AsyncIterableLike<VNodeRepresentation>): AsyncIterable<AsyncIterable<VNode>> {
  // Weak because a generator can create more generators that we may have no reference to
  const generators = new WeakMap<VNode, {
    source: TransientAsyncIteratorSource<VNode>,
    iterator: AsyncIterator<VNode>
  }>();
  const generatorValues = new WeakMap<VNode, VNode>();
  const sources = asyncExtendedIterable(initialSource || options.children).flatMap(flatMapSource).retain();
  return asyncExtendedIterable(
    source(async (): Promise<AsyncIterable<VNode>> => {
      async function *generate(sources: AsyncIterable<VNode>): AsyncIterable<VNode | undefined> {
        for await (const value of sources) {
          if (isScalarVNode(value) || !value || !generators.has(value)) {
            yield* flatten(value);
            continue;
          }
          const generator = generators.get(value);
          if (!generator) {
            // It has finished, but no values left
            yield undefined;
            continue;
          }
          // If there are no inflight and we don't have a source
          // then continue with the current value
          //
          // This allows users to provide a TransientAsyncIteratorSource instance
          // directly which allows _pushing_ values rather than pulling
          //
          // If the user doesn't provide this source, we just wait for the next value
          if (!generator.source.inFlight && !generator.source.hasSource) {
            yield generatorValues.get(value);
            continue;
          }
          const result = await getNext(generator.iterator);
          if (result.done) {
            generators.set(value, undefined);
            yield undefined;
            continue;
          }
          generatorValues.set(value, result.value);
          yield* generate(await flatMapSource(result.value));
        }
      }
      return asyncExtendedIterable(generate(sources)).retain();
    })
  ).retain();

  async function flatMapSource(node: VNodeRepresentation): Promise<AsyncIterable<VNode>>  {
    if (isPromise(node)) {
      return flatMapSource(await node);
    }
    if (isIterableIterator(node)) {
      const referenceNode = {
        reference: Symbol("Iterable Iterator Child")
      };
      const generatorSource = isTransientAsyncIteratorSource(node) ? node : source(node);
      generators.set(referenceNode, {
        source: generatorSource,
        iterator: generatorSource[Symbol.asyncIterator]()
      });
      return asyncExtendedIterable([referenceNode]);
    }
    if (!(isIterable(node) || isAsyncIterable(node))) {
      return asyncExtendedIterable([node]);
    }
    return flatMapSource(node);
  }
}
