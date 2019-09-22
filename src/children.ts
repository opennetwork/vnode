import { VContext } from "./vcontext";
import { isMarshalledVNode, isVNode, VNode, VNodeRepresentationSource } from "./vnode";
import { isSourceReference } from "./source";
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
  yield asyncExtendedIterable(childrenGroups)
    .map(children => ({
      reference: Fragment,
      children
    }));
}

export async function *children(context: VContext, ...source: VNodeRepresentationSource[]): AsyncIterable<AsyncIterable<VNode>> {
  if (context.children) {
    const result = context.children(source);
    if (result) {
      return yield* result;
    }
  }

  async function *eachSource(source: VNodeRepresentationSource): AsyncIterable<AsyncIterable<VNode>> {
    if (isPromise(source)) {
      return yield* eachSource(await source);
    }

    if (isVNode(source)) {
      return yield asyncIterable([
        source
      ]);
    }

    // These need further processing through createVNodeWithContext
    if (isSourceReference(source) || isMarshalledVNode(source)) {
      return yield* eachSource(createVNodeWithContext(context, source));
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
