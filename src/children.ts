import { VContext } from "./vcontext";
import { isVNode, VNode, VNodeRepresentationSource } from "./vnode";
import { isSourceReference, SourceReference } from "./source";
import { createVNodeWithContext } from "./create-node";
import {
  asyncExtendedIterable,
  asyncIterable,
  isIterableIterator,
  isPromise,
  isTransientAsyncIteratorSource
} from "iterable";
import { Fragment } from "./fragment";

async function* childrenUnion(childrenGroups: AsyncIterable<AsyncIterable<AsyncIterable<VNode>>>): AsyncIterable<AsyncIterable<VNode>> {
  yield asyncIterable(
    [
      {
        reference: Fragment,
        children: asyncIterable([
          asyncExtendedIterable(childrenGroups)
            .map(children => ({
              reference: Fragment,
              children
            }))
        ])
      }
    ]
  );
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
