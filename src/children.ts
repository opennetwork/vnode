import { VContext } from "./vcontext";
import { isMarshalledVNode, isVNode, VNode, VNodeRepresentationSource } from "./vnode";
import { isSourceReference } from "./source-reference";
import {
  asyncExtendedIterable,
  asyncIterable,
  isIterableIterator,
  isPromise
} from "iterable";
import { Fragment } from "./fragment";
import { Source } from "./source";

async function* childrenUnion(childrenGroups: AsyncIterable<AsyncIterable<AsyncIterable<VNode>>>): AsyncIterable<AsyncIterable<VNode>> {
  yield asyncExtendedIterable(childrenGroups)
    .map(children => ({
      reference: Fragment,
      children
    }));
}

export async function *children(createVNode: (context: VContext, source: Source<never>) => VNode, context: VContext, ...source: VNodeRepresentationSource[]): AsyncIterable<AsyncIterable<VNode>> {
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
    if (isSourceReference(source) || isMarshalledVNode(source) || isIterableIterator(source)) {
      return yield* eachSource(createVNode(context, source));
    }

    return yield* childrenUnion(
      asyncExtendedIterable(source).map(source => children(createVNode, context, source))
    );
  }

  if (source.length === 1) {
    return yield* eachSource(source[0]);
  } else {
    return yield* childrenUnion(asyncExtendedIterable(source).map(source => eachSource(source)));
  }
}
