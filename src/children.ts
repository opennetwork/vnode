import { ContextSourceOptions } from "./source-options";
import { isScalarVNode, isVNode, VNode, VNodeRepresentation } from "./vnode";
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

/**
 * We will use this to describe the state of a generator child
 */
interface GeneratorDetails {
  source: IterableIterator<VNode> | AsyncIterableIterator<VNode> | AsyncIterable<VNode>;
  iterator: AsyncIterator<VNode>;
}

/**
 * Generates a new `AsyncIterable<VNode>` as required when new updates for one or more children are available
 *
 * The first returned iterable will not wait for a result from a `TransientAsyncIteratorSource` child.
 *
 * The process can be broken down into:
 *
 * - Return any `VNode` instances, no matter what the value is, `FragmentVNode` values will be resolved externally by a hydrating context
 * - Any `TransientAsyncIteratorSource`, record, and check at the end of the process if there are any updates
 * - Any `IterableIterator` children will be requested once during each children iterable, if the child is not a
 * - Any `Iterable` or `AsyncIterable` will be flat mapped into the children, as if it was a Fragment
 *
 * @param options
 * @param initialSource
 */
export function children<HO extends ContextSourceOptions<any>>(options: HO, initialSource?: AsyncIterableLike<VNodeRepresentation>): AsyncIterable<AsyncIterable<VNode>> {
  /**
   * Allow {@link VContext} to override the _children_ process
   *
   * The result returned is either going to be an `AsyncIterable` or `undefined`
   *
   * If it is `undefined` the context is indicating that we can continue as normal
   */
  if (typeof options.context.children === "function") {
    // Allow children process to be skipped
    const result = options.context.children(asyncExtendedIterable(initialSource || options.children).toIterable(), options);
    if (result) {
      return result;
    }
  }

  /**
   * Weak because a generator can create more generators that we may have no reference to
   */
  const generators = new WeakMap<VNode, GeneratorDetails>();
  const generatorValues = new WeakMap<VNode, AsyncIterable<VNode>>();
  const sources = asyncExtendedIterable(initialSource || options.children).flatMap(flatMapSource(false));

  /**
   * Maintain order in fetching nodes, we want only one cycle to be fetching at any moment,
   * so wait for the previous cycle to complete before continuing
   *
   * This forces predictability within our children
   *
   * `baseSource` will produce in order an `AsyncIterable<VNode>` that represents the children's updates
   *
   * `baseSource` can be stopped using `baseSource.close()`, this must be done _after_
   */
  let cancelNextSource: boolean = false;
  let previousPromise: Promise<AsyncIterable<VNode>>;
  const baseSource = source(async function(): Promise<AsyncIterable<VNode>> {
    if (!previousPromise) {
      return previousPromise = nextValuesFromSource(true);
    } else {
      return previousPromise = previousPromise
        .then(() => {
          if (cancelNextSource) {
            /**
             * Calling cancel will ignore the next value returned by the source,
             * meaning we should return `undefined` as the value will never be used
             */
            baseSource.close();
            return undefined;
          }
          return nextValuesFromSource(false);
        });
    }
  });

  /**
   * Retaining the returned iterables allows the children's updates to be replayed in order
   * We also want to hide the implementation details of the iterable, which is why we use `toIterable` here
   */
  return asyncExtendedIterable(baseSource).retain().toIterable();

  function flatMapSource(throwIfGenerator: boolean = false) {
    /**
     * We want to be able to flat map all the available children that we have, this means we don't need to process them
     * further, but can also completely ignore iterables (excluding `TransientAsyncIteratorSource`)
     */
    return async function flatMapSourceInner(node: VNodeRepresentation): Promise<AsyncIterable<VNode>> {
      /**
       * If we have a promise value, we want to resolve it so we can continue to flat map it,
       * this may cause "blocking" for this children chain, so we may want to look to queuing these promises up
       * to be resolved nearing the end of the children cycle
       *
       * Promises should most likely be moved to the same pattern as `IterableIterator`
       */
      if (isPromise(node)) {
        return flatMapSourceInner(await node);
      }
      /**
       * For generators we want to treat them separately to allow fine control over when they're invoked
       *
       * For `TransientAsyncIteratorSource` we want to be able to check if there are in flight values to utilise them
       */
      if (isIterableIterator(node) || isTransientAsyncIteratorSource(node)) {
        if (!isTransientAsyncIteratorSource(node) && throwIfGenerator) {
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
      /**
       * Flat map our iterables directly, we want to continue that flat map process
       * to allow for iterables within our iterables, completely flattening out our tree
       */
      if (isIterable(node) || isAsyncIterable(node)) {
        return asyncExtendedIterable(node).flatMap(flatMapSource(throwIfGenerator));
      }
      /**
       * If we don't have a `VNode` it is either `undefined`, or something that we should have never seen,
       * in which case we're going to throw an error
       *
       * Throwing an error here IMO is better than having unexpected functionality, and nips the issue in the butt from
       * the beginning
       */
      if (!isVNode(node)) {
        if (node) {
          throw new Error("Received a reference to a non VNodeRepresentation within the children cycle, please report this at https://github.com/opennetwork/iterable-h with details on how you got here");
        }
        return asyncExtendedIterable([undefined]);
      }
      /**
       * We have our `VNode`!
       */
      return asyncExtendedIterable([node]);
    };
  }

  /**
   * This is where the work all happens
   *
   * If we're in the first round, we want to return as soon as possible, so if we run into transient sources with no
   * in flight values, we will ignore them until the next round, where we will wait for them
   *
   * @param isFirst
   */
  async function nextValuesFromSource(isFirst?: boolean): Promise<AsyncIterable<VNode>> {
    let anyGenerators = false,
      anyChanges = false;

    /**
     * We will keep track of all of our changing sources here
     * If we run into an update for any of these sources, then that's when we _know_ we have something new to do
     */
    const changingSources: TransientAsyncIteratorSource[] = [];


    async function *generatorVNodes(value: VNode, generator: GeneratorDetails): AsyncIterable<VNode> {
      /**
       * Flag this children process as having generators, meaning we could still have future updates
       */
      anyGenerators = true;
      /**
       * `getNext` provides an error boundary for iterators that support `throw` and `return`
       */
      const result = await getNext(generator.iterator);
      if (result.done) {
        generators.set(value, undefined);
        return yield* generatorValues.get(value);
      }
      /**
       * Any new generator result is considered a new change
       */
      anyChanges = true;
      /**
       * Flat map and retain the returned value, this allows the result to be replayed many times without an issue
       */
      const generatorValue = asyncExtendedIterable(generate(await flatMapSource(false)(result.value))).retain();
      generatorValues.set(value, generatorValue);
      yield* generatorValue;
    }

    async function *generate(sources: AsyncIterable<VNode>): AsyncIterable<VNode> {
      const staticSources = await asyncExtendedIterable(sources).toArray();

      const promises = staticSources.map(async function* (value): AsyncIterable<VNode> {
        /**
         * We have a `VNode`, `undefined`, or a reference to a deleted generator, in which case lets get on with it
         */
        if (isScalarVNode(value) || !value || !generators.has(value)) {
          return yield value;
        }

        /**
         * If we're at the end of our generator or transient source, always use the final value we found for it,
         * which also could be `undefined`
         *
         * This means that if a one of these sources were finished before we used it, we will have an `undefined` value
         * for it, which would have never been produced by the source!
         */
        const generator = generators.get(value);
        if (!generator || (isTransientAsyncIteratorSource(generator.source) && !generator.source.open)) {
          generators.set(value, undefined);
          // It has finished, but no values left, return its final value
          return yield* generatorValues.get(value);
        }

        /**
         * Flag this children process as having generators, meaning we could still have future updates
         */
        anyGenerators = true;

        /**
         * This allows users to provide a TransientAsyncIteratorSource instance
         * directly which allows _pushing_ values rather than pulling
         *
         * If there are no in flight and we don't have a source
         * then continue with the current value
         *
         * If the user doesn't provide this source, we just wait for the next value
         *
         * If the generator hasn't received any values yet, the returned
         * value for this child will be undefined, which is expected
         *
         * The user can provide initial values for a pushable
         * by giving a source that finishes (e.g. has a fixed number of values)
         *
         * The user can swap to a source if they wish using setSource
         */
        if (isTransientAsyncIteratorSource(generator.source) && (!generator.source.inFlight && !generator.source.hasSource)) {
          // Return our reference node, so we can look it up again before we finish this cycle
          changingSources.push(generator.source);
          return yield value;
        }

        /**
         * Flat map yield our generators values, this allows a generator to return an iterable
         */
        return yield* generatorVNodes(value, generator);
      });

      return yield* asyncExtendedIterable(await Promise.all(promises)).flatMap(flatMapSource(false));
    }

    /**
     * This lets any push sources grab the values before we return
     * meaning that we can fast track these updates to the current cycle rather than waiting till the next
     */
    const results = await asyncExtendedIterable(generate(sources))
      .flatMap(async function* (value): AsyncIterable<VNode> {
        if (!generators.has(value)) {
          return yield value;
        }
        const generator = generators.get(value);
        /**
         * We only want to give generators that are `TransientAsyncIteratorSource` a second chance in updating
         */
        if (!generator || !isTransientAsyncIteratorSource(generator.source) || !generator.source.inFlight) {
          return yield* generatorValues.get(value);
        }
        /**
         * Run the same process as `IterableIterator`
         */
        return yield* generatorVNodes(value, generator);
      })
      .toArray();

    /**
     *  Nothing more to do, all values are static from now on, meaning this will be the last cycle
     */
    if (!anyGenerators) {
      cancelNextSource = true;
    }

    /**
     * If we didn't get anything new, wait for it
     *
     * `cancelNextSource` means that `changingSources.length` should be `0`, but add the flag here as we're going to
     * close of because of the above `cancelNextSource` flag anyway
     */
    if (!cancelNextSource && !isFirst && !anyChanges && changingSources.length) {
      await waitForChanges(changingSources);
      return nextValuesFromSource(false);
    }

    /**
     * We don't need to retain our results here, as the results have already been finalised
     */
    return asyncExtendedIterable(results).toIterable();
  }

}

/**
 * Waits for a value from any of the available iterables
 *
 * @param sources
 */
async function waitForChanges(sources: TransientAsyncIteratorSource[]): Promise<void> {
  /**
   * Make a new iterator for each of our sources,
   * this will flag the source to hold the state from that point, and tell us when there is something new
   */
  const iterators = sources.map(source => source[Symbol.asyncIterator]());

  /**
   * If any of these iterators have a next value, we're good to go
   */
  await Promise.race(
    iterators.map(iterator => iterator.next())
  );

  /**
   * Cancel all iterators, we no longer are going to utilise them
   * his allows TransientAsyncIteratorSource to ignore us
   */
  await Promise.all(
    iterators.map(iterator => iterator.return())
  );
}
