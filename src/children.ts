import { VContext } from "./vcontext";
import { FragmentVNode, isVNode, VNode, VNodeRepresentationSource } from "./vnode";
import { isSourceReference, SourceReference } from "./source";
import { createVNodeWithContext } from "./create-node";
import {
  asyncExtendedIterable,
  asyncIterable,
  asyncIterator,
  isIterableIterator,
  isPromise,
  isTransientAsyncIteratorSource,
  getNext,
  extendedIterable
} from "iterable";
import { Fragment } from "./fragment";

async function* childrenUnion(childrenGroups: AsyncIterable<AsyncIterable<AsyncIterable<VNode>>>): AsyncIterable<AsyncIterable<VNode>> {
  yield asyncIterable(
    [
      {
        reference: Fragment,
        children: updateGenerator()
      }
    ]
  );

  async function *updateGenerator(): AsyncIterable<AsyncIterable<VNode>> {
    const pending = new Map<AsyncIterator<unknown>, FragmentVNode[]>();

    const emptyFragments = new Map<AsyncIterator<unknown>, FragmentVNode>();

    const iterators: AsyncIterator<FragmentVNode>[] = await asyncExtendedIterable(childrenGroups).map(group => map(asyncIterator(group))).toArray();
    const promises: Promise<IteratorResult<FragmentVNode>>[] = iterators.map(iterator => iterator.next());

    let currentLayer: FragmentVNode[] = [];

    let returnedIterators: boolean = false;

    try {
      do {
        // This is our oldest layer at this point in time
        // We may loop around a few times until we have no more updates to send out
        //
        // TODO, make this loop lazy so new values can sneak in if they haven't been read yet
        // We would need to make sure that if we iterate twice, we get the correct value in the correct order
        // It sounds like we need a lazy linked list so we can hold the most recent value used, and move forward if we can
        const previousLayer: FragmentVNode[] = currentLayer;

        if (anyPending()) {
          currentLayer = iterators.map((iterator, index): FragmentVNode => {
            const current = pending.get(iterator) || [];
            if (current.length > 0) {
              return current.shift() || getEmptyFragment(iterator);
            } else if (previousLayer[index]) {
              return previousLayer[index];
            } else {
              return getEmptyFragment(iterator);
            }
          });
        }

        if (previousLayer.some((value, index) => currentLayer[index] !== value)) {
          // Layer has changed, lets yield it
          yield asyncIterable(currentLayer);
        }

        if (anyPending()) {
          continue;
        }

        // If we have no pending changes to yield, wait for some more
        // This may not be what we want, as each yield will result in a single update
        //
        // For now this is fine, but in the future we want to get as many updates as possible for each loop
        const { value, index } = await Promise.race(
          promises
            .map(
              (promise, index) => ({
                promise,
                index
              })
            )
            .filter(({ promise }) => !!promise)
            .map(async ({ promise, index }) => ({
              index,
              value: await promise
            }))
        );

        if (value.done) {
          promises[index] = undefined;
        } else {
          const iterator = iterators[index];
          const current = pending.get(iterator) || [];
          current.push(value.value);
          pending.set(iterator, current);
          promises[index] = iterator.next();
        }

      } while (promises.filter(value => value).length || anyPending());
    } catch (error) {
      // Return before settling, as we want our iterators to know we're finishing
      await returnIterators();
      // All settled
      await Promise.all(
        promises
          .filter(promise => promise)
          .map(promise => promise.catch(() => {}))
      );
      // Re-throw our error
      throw error;
    } finally {
      // We are no longer going to use these iterators
      await returnIterators();
    }

    async function returnIterators() {
      if (returnedIterators) {
        return;
      }
      returnedIterators = true;
      await Promise.all(
        iterators.map(async iterator => iterator.return && iterator.return())
      );
    }

    function anyPending() {
      return extendedIterable(pending.values()).some(value => value.length > 0);
    }

    function map(iterator: AsyncIterator<AsyncIterable<VNode>>): AsyncIterator<FragmentVNode> {
      return {
        async next(): Promise<IteratorResult<FragmentVNode>> {
          const next: IteratorResult<AsyncIterable<VNode>> = await getNext(iterator);
          if (next.done) {
            return { done: true, value: undefined };
          }
          return {
            done: false,
            value: {
              reference: Fragment,
              children: asyncIterable([next.value])
            }
          };
        },
        async return(): Promise<IteratorResult<FragmentVNode>> {
          if (iterator.return) {
            await iterator.return();
          }
          return { done: true, value: undefined };
        }
      };
    }

    function getEmptyFragment(iterator: AsyncIterator<unknown>): FragmentVNode {
      if (emptyFragments.has(iterator)) {
        return emptyFragments.get(iterator);
      }
      const fragment: FragmentVNode = { reference: Fragment };
      emptyFragments.set(iterator, fragment);
      return fragment;
    }
  }
}

export async function *children(context: VContext, ...source: VNodeRepresentationSource[]): AsyncIterable<AsyncIterable<VNode>> {
  if (context.children) {
    const result = context.children(source);
    if (result) {
      return yield* result;
    }
  }

  const sourceReference = new Map<SourceReference, AsyncIterable<AsyncIterable<VNode>>>();

  async function *eachSource(source: VNodeRepresentationSource): AsyncIterable<AsyncIterable<VNode>> {
    if (isPromise(source)) {
      return yield* eachSource(await source);
    }

    // Replay the same for the same source
    if (isSourceReference(source)) {
      if (sourceReference.has(source)) {
        return yield* sourceReference.get(source);
      } else {
        sourceReference.set(source, eachSource(createVNodeWithContext(context, source)));
        return yield* sourceReference.get(source);
      }
    }

    if (isVNode(source)) {
      return yield asyncIterable([
        source
      ]);
    }

    if (isIterableIterator(source) || isTransientAsyncIteratorSource(source)) {
      for await (const result of asyncIterable(source)) {
        yield* eachSource(result);
      }
    } else {
      return yield* childrenUnion(
        asyncExtendedIterable(source).map(source => children(context, source))
      );
    }
  }

  if (source.length === 1) {
    return yield* eachSource(source[0]);
  } else {
    return yield* childrenUnion(asyncExtendedIterable(source).map(source => eachSource(source)));
  }
}
