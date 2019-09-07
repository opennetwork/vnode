import { ContextSourceOptions } from "./source-options";
import { isScalarVNode, VNode, VNodeRepresentation } from "./vnode";
import {
  isIterableIterator,
  isPromise
} from "./source";
import { asyncExtendedIterable, AsyncIterableLike, isAsyncIterable, isIterable, source } from "iterable";
import { getNext } from "./retry-iterator";
import { flatten } from "./flatten";

export function children<HO extends ContextSourceOptions<any>>(options: HO, initialSource?: AsyncIterableLike<VNodeRepresentation>): AsyncIterable<AsyncIterable<VNode>> {
  // Weak because a generator can create more generators that we may have no reference to
  const generators = new WeakMap<VNode, AsyncIterator<VNode>>();
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
          // This function is only ever going to be invoked once, and it has to
          // be in order
          const result = await getNext(generator);
          if (result.done) {
            generators.set(value, undefined);
            yield undefined;
            continue;
          }
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
      generators.set(referenceNode, source(node)[Symbol.asyncIterator]());
      return asyncExtendedIterable([referenceNode]);
    }
    if (!(isIterable(node) || isAsyncIterable(node))) {
      return asyncExtendedIterable([node]);
    }
    return flatMapSource(node);
  }
}
