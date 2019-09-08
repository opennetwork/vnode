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
  asyncIterator,
  TransientAsyncIteratorSource
} from "iterable";
import { flatten } from "./flatten";

type GeneratorDetails = {
  source: IterableIterator<VNode> | AsyncIterableIterator<VNode>,
  iterator: AsyncIterator<VNode>
};

export function children<HO extends ContextSourceOptions<any>>(options: HO, initialSource?: AsyncIterableLike<VNodeRepresentation>): AsyncIterable<AsyncIterable<VNode>> {
  if (options.context.children) {
    // Allow children process to be skipped
    const result = options.context.children(asyncExtendedIterable(initialSource || options.children).toIterable(), options);
    if (result) {
      return result;
    }
  }
  // Weak because a generator can create more generators that we may have no reference to
  const generators = new WeakMap<VNode, GeneratorDetails>();
  const generatorValues = new WeakMap<VNode, AsyncIterable<VNode>>();
  const sources = asyncExtendedIterable(initialSource || options.children).flatMap(flatMapSource(false));

  // Maintain order in fetching nodes, we want only one cycle
  // to be fetching at any moment, so wait for the previous cycle to complete
  let previousPromise: Promise<AsyncIterable<VNode>>;

  const baseSource = source(async function(): Promise<AsyncIterable<VNode>> {
    if (!previousPromise) {
      return previousPromise = nextValuesFromSource(true);
    } else {
      return previousPromise = previousPromise
        .then(() => nextValuesFromSource(false));
    }
  });

  return asyncExtendedIterable(baseSource).retain().toIterable();

  function flatMapSource(throwIfGenerator: boolean = false) {
    return async function flatMapSourceInner(node: VNodeRepresentation): Promise<AsyncIterable<VNode>> {
      if (isPromise(node)) {
        return flatMapSourceInner(node);
      }
      if (isIterableIterator(node)) {
        if (throwIfGenerator) {
          throw new Error("Didn't expect to find an iterable iterator here");
        }
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
      return flatMapSourceInner(node);
    };
  }

  async function nextValuesFromSource(isFirst?: boolean): Promise<AsyncIterable<VNode>> {
    let anyGenerators = false,
      anyChanges = false;

    const changingSources: TransientAsyncIteratorSource[] = [];

    async function *generatorVNodes(value: VNode, generator: GeneratorDetails): AsyncIterable<VNode> {
      anyGenerators = true;
      const result = await getNext(generator.iterator);
      if (result.done) {
        generators.set(value, undefined);
        return yield* generatorValues.get(value);
      }
      // Any new generator result is considered a new change
      anyChanges = true;
      const generatorValue = asyncExtendedIterable(generate(await flatMapSource(false)(result.value))).retain();
      generatorValues.set(value, generatorValue);
      yield* generatorValue;
    }

    async function *generate(sources: AsyncIterable<VNode>): AsyncIterable<VNode> {
      const staticSources = await asyncExtendedIterable(sources).toArray();

      const promises = staticSources.map(async function* (value): AsyncIterable<VNode> {
        if (isScalarVNode(value) || !value || !generators.has(value)) {
          return yield* flatten(value);
        }
        const generator = generators.get(value);
        if (!generator || (isTransientAsyncIteratorSource(generator.source) && !generator.source.open)) {
          generators.set(value, undefined);
          // It has finished, but no values left, return its final value
          return yield* generatorValues.get(value);
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
          // Return our reference node, so we can look it up again before we finish this cycle
          changingSources.push(generator.source);
          return yield value;
        }
        return yield* generatorVNodes(value, generator);
      });

      return yield* asyncExtendedIterable(await Promise.all(promises)).flatMap(flatMapSource(false));
    }

    // This lets any push sources grab the values before we return
    // meaning that we can
    const results = await asyncExtendedIterable(generate(sources))
      .flatMap(async function* (value): AsyncIterable<VNode> {
        if (!generators.has(value)) {
          return yield value;
        }
        const generator = generators.get(value);
        if (!generator || (isTransientAsyncIteratorSource(generator.source) && !generator.source.inFlight)) {
          return yield* generatorValues.get(value);
        }
        return yield* generatorVNodes(value, generator);
      })
      .toArray();

    // Nothing more to do, all values are static from now on
    if (!anyGenerators) {
      baseSource.close();
    }

    // If we didn't get anything new, wait for it
    if (!isFirst && !anyChanges && changingSources.length) {
      return waitForChanges(changingSources);
    }

    return asyncExtendedIterable(results).retain().toIterable();
  }

  async function waitForChanges(sources: TransientAsyncIteratorSource[]): Promise<AsyncIterable<VNode>> {
    const iterators = sources.map(source => source[Symbol.asyncIterator]());

    // If any of these iterators have a next value, we're good to go
    await Promise.race(
      iterators.map(iterator => iterator.next())
    );

    // Cancel all subscriptions
    await Promise.all(
      iterators.map(iterator => iterator.return())
    );

    // Let the values move forward
    return nextValuesFromSource(false);
  }

}
